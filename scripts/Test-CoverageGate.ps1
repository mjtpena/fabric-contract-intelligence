param(
    [string]$CoverageRoot = "backend",
    [double]$MinimumLineCoverage = 85,
    [string[]]$Packages = @("Orqentis.Engine", "Orqentis.AI")
)

$coverageFiles = Get-ChildItem -Path $CoverageRoot -Recurse -Filter "coverage.cobertura.xml" -ErrorAction SilentlyContinue
if (-not $coverageFiles) {
    Write-Error "No coverage.cobertura.xml files found under '$CoverageRoot'. Run dotnet test with --collect:'XPlat Code Coverage' first."
    exit 1
}

$failed = $false
foreach ($packageName in $Packages) {
    $rates = foreach ($file in $coverageFiles) {
        [xml]$coverage = Get-Content -Path $file.FullName
        foreach ($package in $coverage.coverage.packages.package) {
            if ($package.name -eq $packageName) {
                [pscustomobject]@{
                    File = $file.FullName
                    Rate = [double]$package.'line-rate' * 100
                }
            }
        }
    }

    if (-not $rates) {
        Write-Error "Coverage package '$packageName' was not found in generated coverage reports."
        $failed = $true
        continue
    }

    $best = $rates | Sort-Object -Property Rate -Descending | Select-Object -First 1
    $formattedRate = "{0:N2}" -f $best.Rate
    Write-Host "$packageName line coverage: $formattedRate% (threshold: $MinimumLineCoverage%)"

    if ($best.Rate -lt $MinimumLineCoverage) {
        Write-Error "$packageName line coverage $formattedRate% is below required threshold $MinimumLineCoverage%."
        $failed = $true
    }
}

if ($failed) {
    exit 1
}
