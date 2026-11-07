#!/usr/bin/env bash
# Dựng lại CSS phần vẽ lớp học (client/modules/do-chu/src/view/lop.gen.css).
# Chạy sau khi sửa class Tailwind trong *.tsx hoặc sửa lop.css.
set -euo pipefail
goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$goc"
node scripts/phong/lop-hoc/tao-css.mjs "$@"
