$ErrorActionPreference = "Stop"

$outDir = "K:\bani jewellery\DEPLOYMENT_PACKAGES"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

Write-Host "==========================================================="
Write-Host "  GENERATING WEBUZO PRODUCTION DEPLOYMENT PACKAGES"
Write-Host "==========================================================="

# Remove unwanted old zip files
$unwantedZips = @(
    "3_BACKEND_CODE_ONLY.zip",
    "4_BACKEND_COMPLETE_WITH_UPLOADS.zip"
)
foreach ($unwanted in $unwantedZips) {
    $unwantedPath = Join-Path $outDir $unwanted
    if (Test-Path $unwantedPath) {
        Remove-Item $unwantedPath -Force
        Write-Host "Removed unwanted package: $unwanted"
    }
}

# 1. Frontend Storefront Build
Write-Host "`n--- 1. Packaging Frontend Storefront (1_FRONTEND_STOREFRONT.zip) ---"
$frontendZip = Join-Path $outDir "1_FRONTEND_STOREFRONT.zip"
if (Test-Path $frontendZip) { Remove-Item $frontendZip -Force }
Compress-Archive -Path "K:\bani jewellery\frontend\dist\*" -DestinationPath $frontendZip -CompressionLevel Optimal
$size1 = [Math]::Round((Get-Item $frontendZip).Length / 1MB, 2)
Write-Host " [OK] 1_FRONTEND_STOREFRONT.zip ($size1 MB)"

# 2. Admin Dashboard Build (Updated with UI fixes, no inner box border)
Write-Host "`n--- 2. Packaging Admin Dashboard (2_ADMIN_DASHBOARD.zip) ---"
$adminZip = Join-Path $outDir "2_ADMIN_DASHBOARD.zip"
if (Test-Path $adminZip) { Remove-Item $adminZip -Force }
Compress-Archive -Path "K:\bani jewellery\backend\panel\admin_dashboard\dist\*" -DestinationPath $adminZip -CompressionLevel Optimal
$size2 = [Math]::Round((Get-Item $adminZip).Length / 1MB, 2)
Write-Host " [OK] 2_ADMIN_DASHBOARD.zip ($size2 MB)"

# 3. Backend Complete Package with All Data (Excluding node_modules)
Write-Host "`n--- 3. Packaging Backend with All Data (3_BACKEND_WITH_ALL_DATA.zip) ---"
$backendZip = Join-Path $outDir "3_BACKEND_WITH_ALL_DATA.zip"
if (Test-Path $backendZip) { Remove-Item $backendZip -Force }

$tempBackendDir = Join-Path $env:TEMP "backend_with_all_data_clean"
if (Test-Path $tempBackendDir) { Remove-Item $tempBackendDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tempBackendDir | Out-Null

$backendItems = Get-ChildItem -Path "K:\bani jewellery\backend\node" | Where-Object {
    $_.Name -notmatch '^(node_modules|tests|docs|temp_.*|\.git.*)$'
}

foreach ($item in $backendItems) {
    Copy-Item -Path $item.FullName -Destination $tempBackendDir -Recurse -Force
}

Compress-Archive -Path "$tempBackendDir\*" -DestinationPath $backendZip -CompressionLevel Optimal
Remove-Item $tempBackendDir -Recurse -Force
$size3 = [Math]::Round((Get-Item $backendZip).Length / 1MB, 2)
Write-Host " [OK] 3_BACKEND_WITH_ALL_DATA.zip ($size3 MB)"

Write-Host "`n==========================================================="
Write-Host "  WEBUZO PACKAGES READY IN: $outDir"
Write-Host "==========================================================="
