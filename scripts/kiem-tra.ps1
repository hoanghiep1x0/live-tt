# Kiểm tra trước khi commit: typecheck rồi chạy test.
# Chạy được từ bất kỳ thư mục nào.
$ErrorActionPreference = 'Stop'

$goc = Split-Path -Parent $PSScriptRoot
Set-Location $goc

Write-Host '== Kiểm tra kiểu =='
npx tsc --build --force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '== Chạy test =='
npx vitest run
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (Test-Path "$goc\backend\src") {
  Write-Host '== Test backend =='
  Push-Location "$goc\backend"
  cargo test
  $ma = $LASTEXITCODE
  Pop-Location
  if ($ma -ne 0) { exit $ma }
}

Write-Host 'Xong — mọi thứ xanh.'
