[CmdletBinding()]
param(
    [string]$FrontendPath = "frontend",
    [string]$ManifestPath = "frontend\manifest\WorkloadManifest.json",
    [string]$OutputDirectory = "frontend\dist\manifest",
    [string]$FrontendUrl = $env:ORQENTIS_WORKLOAD_FRONTEND_URL,
    [string]$FrontendAppId = $env:ORQENTIS_WORKLOAD_FRONTEND_APP_ID,
    [switch]$SkipBuild,
    [switch]$OpenPortal,
    [ValidateSet("Tenant", "Capacity", "Workspace")]
    [string]$AssignType,
    [string]$AssignTargetId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FabricAccessToken {
    $token = az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken --output tsv
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "Azure CLI did not return a Fabric access token. Run 'az login' with a Fabric admin account first."
    }

    return $token.Trim()
}

function Get-FabricHeaders {
    param([string]$AccessToken)

    return @{
        Authorization = "Bearer $AccessToken"
        "Content-Type" = "application/json"
    }
}

function Get-PublishedWorkload {
    param(
        [hashtable]$Headers,
        [string]$WorkloadId
    )

    $response = Invoke-RestMethod -Method Get -Uri "https://api.fabric.microsoft.com/v1/admin/workloads" -Headers $Headers
    return $response.value | Where-Object { $_.id -eq $WorkloadId } | Select-Object -First 1
}

function Get-ExistingAssignment {
    param(
        [hashtable]$Headers,
        [string]$WorkloadId,
        [string]$AssignmentType,
        [string]$TargetId
    )

    $response = Invoke-RestMethod -Method Get -Uri "https://api.fabric.microsoft.com/v1/admin/workloads/assignments" -Headers $Headers

    return $response.value |
        Where-Object {
            $_.workloadId -eq $WorkloadId -and
            $_.type -eq $AssignmentType -and
            (
                ($AssignmentType -eq "Tenant") -or
                ($AssignmentType -eq "Capacity" -and $_.capacityId -eq $TargetId) -or
                ($AssignmentType -eq "Workspace" -and $_.workspaceId -eq $TargetId)
            )
        } |
        Select-Object -First 1
}

function New-AssignmentBody {
    param(
        [string]$WorkloadId,
        [string]$AssignmentType,
        [string]$TargetId
    )

    $body = @{
        workloadId = $WorkloadId
        type = $AssignmentType
    }

    switch ($AssignmentType) {
        "Capacity" { $body.capacityId = $TargetId }
        "Workspace" { $body.workspaceId = $TargetId }
    }

    return $body | ConvertTo-Json
}

function Get-NuGetExe {
    $toolRoot = Join-Path $repoRoot ".artifacts\tools\orqentis-nuget"
    New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
    $nugetExe = Join-Path $toolRoot "nuget.exe"
    if (-not (Test-Path $nugetExe)) {
        Invoke-WebRequest -UseBasicParsing -Uri "https://dist.nuget.org/win-x86-commandline/latest/nuget.exe" -OutFile $nugetExe
    }

    return $nugetExe
}

function Invoke-PlaceholderReplacement {
    param(
        [string]$FilePath,
        [hashtable]$Replacements
    )

    $content = Get-Content -Raw -Path $FilePath
    foreach ($key in $Replacements.Keys) {
        $content = $content.Replace("{{$key}}", $Replacements[$key])
    }

    Set-Content -Path $FilePath -Value $content -Encoding utf8
}

function Copy-ManifestPackageFiles {
    param(
        [string]$ManifestRoot,
        [string]$BuildRoot
    )

    $beRoot = Join-Path $BuildRoot "BE"
    $feRoot = Join-Path $BuildRoot "FE"
    $feAssetsRoot = Join-Path $feRoot "assets"

    New-Item -ItemType Directory -Force -Path $beRoot, $feRoot, $feAssetsRoot | Out-Null

    Copy-Item -Path (Join-Path $ManifestRoot "WorkloadManifest.xml") -Destination $beRoot -Force
    Copy-Item -Path (Join-Path $ManifestRoot "Product.json") -Destination $feRoot -Force
    Copy-Item -Path (Join-Path $ManifestRoot "ManifestPackage.nuspec") -Destination $BuildRoot -Force

    $itemsRoot = Join-Path $ManifestRoot "items"
    Get-ChildItem -Path $itemsRoot -Recurse -File -Filter *.xml | Copy-Item -Destination $beRoot -Force
    Get-ChildItem -Path $itemsRoot -Recurse -File -Filter *.json | Copy-Item -Destination $feRoot -Force

    $assetsRoot = Join-Path $ManifestRoot "assets"
    if (Test-Path $assetsRoot) {
        Copy-Item -Path (Join-Path $assetsRoot "*") -Destination $feAssetsRoot -Recurse -Force
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendRoot = Resolve-Path (Join-Path $repoRoot $FrontendPath)
$manifestFile = Resolve-Path (Join-Path $repoRoot $ManifestPath)
$manifestRoot = Split-Path -Parent $manifestFile
$manifest = Get-Content -Raw -Path $manifestFile | ConvertFrom-Json

if ($AssignType -and $AssignType -ne "Tenant" -and [string]::IsNullOrWhiteSpace($AssignTargetId)) {
    throw "-AssignTargetId is required when -AssignType is Capacity or Workspace."
}

if ([string]::IsNullOrWhiteSpace($FrontendUrl)) {
    throw "Frontend URL is required. Pass -FrontendUrl or set ORQENTIS_WORKLOAD_FRONTEND_URL."
}

if ([string]::IsNullOrWhiteSpace($FrontendAppId)) {
    throw "Frontend App ID is required. Pass -FrontendAppId or set ORQENTIS_WORKLOAD_FRONTEND_APP_ID."
}

if (-not $SkipBuild) {
    Push-Location $frontendRoot
    try {
        npm run build
    }
    finally {
        Pop-Location
    }
}

$resolvedOutputDirectory = Join-Path $repoRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $resolvedOutputDirectory | Out-Null

$buildRoot = Join-Path $repoRoot (".artifacts\manifest-build\" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null

try {
    Copy-ManifestPackageFiles -ManifestRoot $manifestRoot -BuildRoot $buildRoot

    $replacements = @{
        WORKLOAD_NAME = [string]$manifest.workloadId
        WORKLOAD_VERSION = [string]$manifest.version
        FRONTEND_URL = $FrontendUrl
        FRONTEND_APP_ID = $FrontendAppId
        MANIFEST_BUILD_ROOT = $buildRoot
    }

    Get-ChildItem -Path $buildRoot -Recurse -File -Include *.xml, *.json, *.nuspec |
        ForEach-Object { Invoke-PlaceholderReplacement -FilePath $_.FullName -Replacements $replacements }

    $nugetExe = Get-NuGetExe
    $nuspecPath = Join-Path $buildRoot "ManifestPackage.nuspec"

    if ($IsWindows) {
        & $nugetExe pack $nuspecPath -OutputDirectory $resolvedOutputDirectory -Verbosity quiet | Out-Null
    }
    else {
        if (-not (Get-Command mono -ErrorAction SilentlyContinue)) {
            throw "mono runtime is required to execute nuget.exe on non-Windows runners."
        }

        & mono $nugetExe pack $nuspecPath -OutputDirectory $resolvedOutputDirectory -Verbosity quiet | Out-Null
    }
}
finally {
    if (Test-Path $buildRoot) {
        Remove-Item -Recurse -Force $buildRoot
    }
}

$packagePath = Join-Path $resolvedOutputDirectory "$($manifest.workloadId).$($manifest.version).nupkg"
Write-Host "Created publish package: $packagePath"
Write-Host "Next: upload the .nupkg in Fabric Workload Hub -> Self-Service Workload Publishing."

if ($AssignType) {
    $headers = Get-FabricHeaders -AccessToken (Get-FabricAccessToken)
    $publishedWorkload = Get-PublishedWorkload -Headers $headers -WorkloadId $manifest.workloadId

    if (-not $publishedWorkload) {
        throw "Workload '$($manifest.workloadId)' is not published in this tenant yet. Upload '$packagePath' in the Fabric admin portal before using -AssignType."
    }

    $existingAssignment = Get-ExistingAssignment -Headers $headers -WorkloadId $manifest.workloadId -AssignmentType $AssignType -TargetId $AssignTargetId
    if ($existingAssignment) {
        Write-Host "Workload '$($manifest.workloadId)' is already assigned at scope '$AssignType'."
    }
    else {
        $assignment = Invoke-RestMethod -Method Post -Uri "https://api.fabric.microsoft.com/v1/admin/workloads/assignments" -Headers $headers -Body (New-AssignmentBody -WorkloadId $manifest.workloadId -AssignmentType $AssignType -TargetId $AssignTargetId)
        Write-Host "Created workload assignment: $($assignment.assignmentId)"
    }
}

if ($OpenPortal) {
    Start-Process "https://app.fabric.microsoft.com/admin-portal/workloads/publish?experience=power-bi"
}
