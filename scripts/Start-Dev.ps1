<#
.SYNOPSIS
    Starts the Orqentis workload in Fabric DevGateway development mode.

.DESCRIPTION
    Launches three processes required for local Fabric workload development:
      1. Backend API  (.NET 8 — https://localhost:7273)
      2. Frontend     (Vite dev server — http://localhost:60006)
      3. DevGateway   (Fabric dev bridge)

    Prerequisites (one-time setup):
      a) Download DevGateway from:
         https://go.microsoft.com/fwlink/?linkid=2272516
         Extract to C:\DevGateway\

      b) Enable Fabric developer mode:
         Fabric → Settings → Developer settings → enable "Fabric Developer Mode"

      c) Enable the tenant setting (admin only):
         Fabric Admin Portal → Tenant settings → Additional workloads →
         "Workspace admins can develop partner workloads" → Enable

      d) Copy workload-dev-mode.json to C:\:
         Copy-Item workload-dev-mode.json.template C:\workload-dev-mode.json
         Update WorkspaceGuid if needed (current: 8e15a176-ac93-4ed2-9540-818214ab1199)

      e) Build the manifest package (first run only, then when manifest changes):
         cd frontend && npm run build:dev-manifest

      f) Configure backend local secrets (one-time):
         cd backend
         dotnet user-secrets set "AzureAd:ClientSecret" "<your-client-secret>" --project Orqentis.Api
         dotnet user-secrets set "ConnectionStrings:Postgres" "<your-postgres-connection>" --project Orqentis.Api

.PARAMETER DevGatewayPath
    Path to the DevGateway executable. Defaults to C:\DevGateway\Microsoft.Fabric.Workload.DevGateway.exe

.PARAMETER SkipBackend
    Skip starting the backend (useful if already running in VS Code / Rider).

.PARAMETER SkipDevGateway
    Skip starting DevGateway (useful for frontend-only work without Fabric portal testing).

.EXAMPLE
    # Full start (all three services):
    .\scripts\Start-Dev.ps1

.EXAMPLE
    # Frontend + DevGateway only (backend running in IDE):
    .\scripts\Start-Dev.ps1 -SkipBackend

.EXAMPLE
    # Custom DevGateway path:
    .\scripts\Start-Dev.ps1 -DevGatewayPath "D:\tools\DevGateway\Microsoft.Fabric.Workload.DevGateway.exe"
#>
param(
    [string] $DevGatewayPath = "C:\DevGateway\Microsoft.Fabric.Workload.DevGateway.exe",
    [switch] $SkipBackend,
    [switch] $SkipDevGateway
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Orqentis — Fabric DevGateway Development Mode" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 0. Prerequisites check ────────────────────────────────────────────────────

$manifestPkg = Join-Path $RepoRoot "frontend\tools\dist\ManifestPackage.nupkg"
if (-not (Test-Path $manifestPkg)) {
    Write-Host "⚠  Manifest package not found. Building now..." -ForegroundColor Yellow
    Push-Location (Join-Path $RepoRoot "frontend")
    npm run build:dev-manifest
    Pop-Location
    if (-not (Test-Path $manifestPkg)) {
        Write-Error "❌ Manifest package build failed. Cannot continue."
    }
}
Write-Host "✅ Manifest package: $manifestPkg" -ForegroundColor Green

$devModeConfig = "C:\workload-dev-mode.json"
if (-not (Test-Path $devModeConfig)) {
    $template = Join-Path $RepoRoot "workload-dev-mode.json.template"
    Write-Host "⚠  $devModeConfig not found. Copying template..." -ForegroundColor Yellow
    Copy-Item $template $devModeConfig
    Write-Host "   ✔ Copied to $devModeConfig" -ForegroundColor Green
    Write-Host "   ℹ  Update WorkspaceGuid in $devModeConfig if needed." -ForegroundColor Cyan
}
Write-Host "✅ workload-dev-mode.json: $devModeConfig" -ForegroundColor Green

if (-not $SkipDevGateway -and -not (Test-Path $DevGatewayPath)) {
    Write-Host ""
    Write-Host "❌ DevGateway not found at: $DevGatewayPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Download DevGateway from:" -ForegroundColor Yellow
    Write-Host "   https://go.microsoft.com/fwlink/?linkid=2272516" -ForegroundColor Yellow
    Write-Host "   Extract to C:\DevGateway\" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Then re-run this script, or use -SkipDevGateway to skip it." -ForegroundColor Yellow
    exit 1
}

# ── 1. Start Backend ──────────────────────────────────────────────────────────

if (-not $SkipBackend) {
    Write-Host ""
    Write-Host "▶ Starting Backend API (https://localhost:7273)..." -ForegroundColor Cyan
    $backendDir = Join-Path $RepoRoot "backend\Orqentis.Api"
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$backendDir'; Write-Host 'Backend starting...' -ForegroundColor Green; dotnet run"
    ) -WindowStyle Normal
    Write-Host "  ✔ Backend process launched in new window." -ForegroundColor Green
    Start-Sleep -Seconds 3
}

# ── 2. Start Frontend (Vite dev:fabric mode on port 60006) ───────────────────

Write-Host ""
Write-Host "▶ Starting Frontend (http://localhost:60006)..." -ForegroundColor Cyan
$frontendDir = Join-Path $RepoRoot "frontend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$frontendDir'; Write-Host 'Frontend starting on port 60006...' -ForegroundColor Green; npm run dev:fabric"
) -WindowStyle Normal
Write-Host "  ✔ Frontend process launched in new window." -ForegroundColor Green
Write-Host "  ℹ  Wait for 'ready in Xms' before opening Fabric." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# ── 3. Start DevGateway ───────────────────────────────────────────────────────

if (-not $SkipDevGateway) {
    Write-Host ""
    Write-Host "▶ Getting Fabric access token from Azure CLI..." -ForegroundColor Cyan
    $fabricToken = az account get-access-token --scope "https://analysis.windows.net/powerbi/api/.default" --query accessToken -o tsv 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($fabricToken)) {
        Write-Host "❌ Failed to get Fabric token. Run 'az login' first." -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✔ Token acquired." -ForegroundColor Green

    Write-Host ""
    Write-Host "▶ Starting DevGateway..." -ForegroundColor Cyan
    $gatewayDir = Split-Path -Parent $DevGatewayPath
    $backendUrl = "https://localhost:7273/workload"
    $workspaceGuid = "8e15a176-ac93-4ed2-9540-818214ab1199"

    # Use token-based auth (same as Docker entrypoint.sh approach)
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        @"
Set-Location '$gatewayDir'
Write-Host 'DevGateway starting...' -ForegroundColor Green
& '$DevGatewayPath' ``
    -DevMode:UserAuthorizationToken '$fabricToken' ``
    -DevMode:ManifestPackageFilePath '$manifestPkg' ``
    -DevMode:WorkspaceGuid '$workspaceGuid' ``
    -DevMode:WorkloadEndpointUrl '$backendUrl'
"@
    ) -WindowStyle Normal
    Write-Host "  ✔ DevGateway process launched in new window." -ForegroundColor Green
}

# ── 4. Summary ────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  All services started." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:60006" -ForegroundColor White
Write-Host "  Manifest  : http://localhost:60006/manifests_new/metadata" -ForegroundColor White
if (-not $SkipBackend) {
    Write-Host "  Backend   : https://localhost:7273/swagger" -ForegroundColor White
}
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for DevGateway to show 'DevGateway started'" -ForegroundColor Yellow
Write-Host "  2. Open https://app.fabric.microsoft.com" -ForegroundColor Yellow
Write-Host "  3. Navigate to workspace: Orqentis-Showcase-Capacity-1778375300" -ForegroundColor Yellow
Write-Host "  4. Click '+ New item' → you should see Orqentis item types loading from localhost" -ForegroundColor Yellow
Write-Host ""
Write-Host "  To verify manifest is being served:" -ForegroundColor Cyan
Write-Host "  Invoke-RestMethod http://localhost:60006/manifests_new/metadata" -ForegroundColor Cyan
Write-Host ""
