# Phòng sàn bar — chạy một bước dựng nhân vật 3D (scripts\phong\san-bar\nhan-vat\<bước>.py) trong Blender chạy nền.
# Thứ tự các bước, tham số từng bước: docs/phong/san-bar/nhan-vat/README.md.
#
#   scripts\phong\san-bar\dung-nhan-vat.ps1 <file.blend | _> <bước> [tham số của bước...]
#   scripts\phong\san-bar\dung-nhan-vat.ps1 out\base_v48.blend rig_base 'D:\Assets' out\model.glb 'Hip Hop Dancing'
#
# "_" thay cho file .blend: mở Blender trống (--factory-startup) — các bước tự nạp file.
# Blender: biến BLENDER (xem .env.example), không có thì thử đường cài mặc định.
# Chạy được từ bất kỳ thư mục nào.
$ErrorActionPreference = 'Stop'

$goc = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$blender = $env:BLENDER
if (-not $blender -and (Test-Path "$goc\.env")) {
  $dong = Get-Content "$goc\.env" | Where-Object { $_ -match '^BLENDER=' } | Select-Object -First 1
  if ($dong) { $blender = $dong.Substring(8) }
}
if (-not $blender) { $blender = 'D:\Tools\blender-5.2.3-windows-x64\blender.exe' }

if ($args.Count -lt 2) {
  [Console]::Error.WriteLine('Thiếu tham số. Dùng: scripts\phong\san-bar\dung-nhan-vat.ps1 <file.blend | _> <bước> [tham số...]')
  exit 2
}
if (-not (Test-Path $blender)) {
  [Console]::Error.WriteLine("Không thấy Blender ở '$blender'. Đặt BLENDER trong .env.")
  exit 1
}
$blend = $args[0]
$buoc = $args[1] -replace '\.py$', ''
$con = @()
if ($args.Count -gt 2) { $con = $args[2..($args.Count - 1)] }
$py = Join-Path $goc "scripts\phong\san-bar\nhan-vat\$buoc.py"
if (-not (Test-Path $py)) {
  [Console]::Error.WriteLine("Không có bước '$buoc' trong scripts\phong\san-bar\nhan-vat\.")
  exit 2
}

# Blender ghi ảnh nướng tạm vào TEMP; ổ C hết chỗ thì texture ra đen ("Failed OpenEXR write") → luôn ghi vào .tmp\
$tam = Join-Path $goc '.tmp\blender'
New-Item -ItemType Directory -Force $tam | Out-Null
$env:TEMP = $tam; $env:TMP = $tam; $env:PYTHONIOENCODING = 'utf-8'

if ($blend -eq '_') {
  & $blender -b --factory-startup --python $py -- @con
} else {
  & $blender -b $blend --python $py -- @con
}
exit $LASTEXITCODE
