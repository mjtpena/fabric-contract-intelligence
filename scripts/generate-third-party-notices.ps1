param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "THIRD_PARTY_NOTICES.md")
)

$ErrorActionPreference = "Stop"
$sections = New-Object System.Collections.Generic.List[string]
$sections.Add("# Third-party notices`n")
$sections.Add("Generated from frontend package metadata and backend project package references. Re-run ``scripts/generate-third-party-notices.ps1`` after dependency changes.`n")

$frontend = Join-Path $RepositoryRoot "frontend"
$licenseCheckerOutput = $null
if (Test-Path (Join-Path $frontend "package-lock.json")) {
    Push-Location $frontend
    try {
        $licenseCheckerOutput = npx --yes license-checker --production --json 2>$null | ConvertFrom-Json
    }
    catch {
        $licenseCheckerOutput = $null
    }
    finally {
        Pop-Location
    }
}

$sections.Add("## npm production dependencies`n")
if ($licenseCheckerOutput) {
    $rows = foreach ($property in $licenseCheckerOutput.PSObject.Properties) {
        $value = $property.Value
        [pscustomobject]@{
            Package = $property.Name
            License = $value.licenses
            Repository = $value.repository
        }
    }
    $sections.Add("| Package | License | Repository |`n|---|---|---|`n" + (($rows | Sort-Object Package | ForEach-Object { "| $($_.Package) | $($_.License) | $($_.Repository) |" }) -join "`n") + "`n")
}
else {
    $packageLockPath = Join-Path $frontend "package-lock.json"
    $packageLock = Get-Content $packageLockPath -Raw | ConvertFrom-Json
    $rows = foreach ($property in $packageLock.packages.PSObject.Properties) {
        if ($property.Name -like "node_modules/*" -and $property.Value.license) {
            [pscustomobject]@{
                Package = $property.Name.Substring("node_modules/".Length)
                Version = $property.Value.version
                License = $property.Value.license
            }
        }
    }
    $sections.Add("| Package | Version | License |`n|---|---:|---|`n" + (($rows | Sort-Object Package -Unique | ForEach-Object { "| $($_.Package) | $($_.Version) | $($_.License) |" }) -join "`n") + "`n")
}

$sections.Add("## NuGet direct dependencies`n")
$csprojFiles = Get-ChildItem -Path (Join-Path $RepositoryRoot "backend") -Filter *.csproj -Recurse
$nugetRows = foreach ($project in $csprojFiles) {
    [xml]$xml = Get-Content $project.FullName
    foreach ($itemGroup in $xml.Project.ItemGroup) {
        foreach ($package in $itemGroup.PackageReference) {
            if ($package.Include) {
                [pscustomobject]@{
                    Project = Resolve-Path -Path $project.FullName -Relative
                    Package = $package.Include
                    Version = $package.Version
                    License = "See NuGet package metadata"
                }
            }
        }
    }
}
if ($nugetRows) {
    $sections.Add("| Project | Package | Version | License |`n|---|---|---:|---|`n" + (($nugetRows | Sort-Object Project, Package | ForEach-Object { "| $($_.Project) | $($_.Package) | $($_.Version) | $($_.License) |" }) -join "`n") + "`n")
}
else {
    $sections.Add("No direct NuGet PackageReference entries found.`n")
}

Set-Content -Path $OutputPath -Value ($sections -join "`n") -Encoding utf8
Write-Host "Wrote $OutputPath"
