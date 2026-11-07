# Dựng lại CSS phần vẽ lớp học (client/modules/do-chu/src/view/lop.gen.css).
# Chạy sau khi sửa class Tailwind trong *.tsx hoặc sửa lop.css.
$ErrorActionPreference = 'Stop'
$goc = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Push-Location $goc
try { node scripts/phong/lop-hoc/tao-css.mjs @args } finally { Pop-Location }
