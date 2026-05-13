param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$failed = $false

function Assert-File {
    param([string]$RelativePath)

    $path = Join-Path $Root $RelativePath
    if (-not (Test-Path -Path $path -PathType Leaf)) {
        Write-Error "Missing required public-readiness file: $RelativePath"
        $script:failed = $true
        return
    }

    Write-Host "OK file: $RelativePath"
}

function Assert-Contains {
    param(
        [string]$RelativePath,
        [string]$Pattern,
        [string]$Description
    )

    $path = Join-Path $Root $RelativePath
    if (-not (Test-Path -Path $path -PathType Leaf)) {
        Write-Error "Cannot check missing file: $RelativePath"
        $script:failed = $true
        return
    }

    $content = Get-Content -Path $path -Raw
    if ($content -notmatch $Pattern) {
        Write-Error "$RelativePath does not contain required content: $Description"
        $script:failed = $true
        return
    }

    Write-Host "OK content: $RelativePath - $Description"
}

$requiredFiles = @(
    "docs/isv-publish-checklist.md",
    "docs/operations-runbook.md",
    "docs/security-compliance.md",
    "docs/customer-onboarding.md",
    "docs/entitlement-process.md",
    "docs/test-scenarios.md",
    "frontend/public/support.html",
    "frontend/public/legal/privacy.html",
    "frontend/public/legal/terms.html",
    "frontend/public/legal/security.html",
    "frontend/public/legal/license.html",
    "frontend/public/docs/getting-started.html",
    "frontend/public/.well-known/security.txt",
    "frontend/manifest/Product.json",
    "frontend/manifest/WorkloadManifest.xml",
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-prod.yml",
    ".github/workflows/live-fabric-tests.yml"
)

foreach ($file in $requiredFiles) {
    Assert-File -RelativePath $file
}

Assert-Contains -RelativePath "README.md" -Pattern "Production pilot ready" -Description "current launch status"
Assert-Contains -RelativePath "docs/isv-publish-checklist.md" -Pattern "Partner Center offer metadata" -Description "marketplace package gate"
Assert-Contains -RelativePath "docs/operations-runbook.md" -Pattern "/health/ready" -Description "health check operations"
Assert-Contains -RelativePath "docs/security-compliance.md" -Pattern "On-Behalf-Of" -Description "OBO data-plane security"
Assert-Contains -RelativePath "docs/customer-onboarding.md" -Pattern "Offboarding" -Description "customer offboarding process"
Assert-Contains -RelativePath "docs/entitlement-process.md" -Pattern "Community to Enterprise" -Description "manual entitlement process"
Assert-Contains -RelativePath "docs/test-scenarios.md" -Pattern "Live authenticated Fabric gates" -Description "live Fabric validation gate"

$productPath = Join-Path $Root "frontend/manifest/Product.json"
if (Test-Path -Path $productPath -PathType Leaf) {
    $product = Get-Content -Path $productPath -Raw | ConvertFrom-Json
    $supportLink = $product.productDetail.supportLink
    $expectedLinks = @{
        documentation = "https://fabric.orqentis.com/docs/getting-started.html"
        certification = "https://fabric.orqentis.com/legal/security.html"
        help = "https://fabric.orqentis.com/support.html"
        privacy = "https://fabric.orqentis.com/legal/privacy.html"
        terms = "https://fabric.orqentis.com/legal/terms.html"
        license = "https://fabric.orqentis.com/legal/license.html"
    }

    foreach ($key in $expectedLinks.Keys) {
        $actual = $supportLink.$key.url
        if ($actual -ne $expectedLinks[$key]) {
            Write-Error "Product.json supportLink.$key expected '$($expectedLinks[$key])' but found '$actual'."
            $failed = $true
        } else {
            Write-Host "OK Product.json supportLink.${key}: $actual"
        }
    }
}

$staticConfigPath = Join-Path $Root "frontend/public/staticwebapp.config.json"
if (Test-Path -Path $staticConfigPath -PathType Leaf) {
    $staticConfig = Get-Content -Path $staticConfigPath -Raw | ConvertFrom-Json
    $csp = $staticConfig.globalHeaders.'Content-Security-Policy'
    if (-not $csp -or $csp -notmatch "frame-ancestors https://app\.fabric\.microsoft\.com") {
        Write-Error "Static Web Apps CSP must restrict frame ancestors to Fabric hosts."
        $failed = $true
    } else {
        Write-Host "OK CSP frame-ancestors."
    }

    $excludes = @($staticConfig.navigationFallback.exclude)
    foreach ($exclude in @("/docs/*", "/legal/*", "/.well-known/*", "/support.html")) {
        if ($excludes -notcontains $exclude) {
            Write-Error "staticwebapp.config.json missing navigation fallback exclude '$exclude'."
            $failed = $true
        } else {
            Write-Host "OK static route exclude: $exclude"
        }
    }
}

if ($failed) {
    exit 1
}

Write-Host "Public readiness artifact gate passed."
