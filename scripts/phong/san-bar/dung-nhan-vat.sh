#!/usr/bin/env bash
# Phòng sàn bar — chạy một bước dựng nhân vật 3D (scripts/phong/san-bar/nhan-vat/<bước>.py) trong Blender chạy nền.
# Thứ tự các bước, tham số từng bước: docs/phong/san-bar/nhan-vat/README.md.
#
#   scripts/phong/san-bar/dung-nhan-vat.sh <file.blend | _> <bước> [tham số của bước...]
#   scripts/phong/san-bar/dung-nhan-vat.sh out/base_v48.blend rig_base 'D:\Assets' out/model.glb "Hip Hop Dancing"
#   scripts/phong/san-bar/dung-nhan-vat.sh _ makeup out/base.blend out/base_mk.blend out/ortho_b --style ...
#
# "_" thay cho file .blend: mở Blender trống (--factory-startup) — các bước tự nạp file.
# Blender: biến BLENDER (xem .env.example), không có thì thử đường cài mặc định.
# Chạy được từ bất kỳ thư mục nào.
set -euo pipefail

goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
doc_env() { [ -f "$goc/.env" ] && grep -E "^$1=" "$goc/.env" | cut -d= -f2- || true; }
BLENDER="${BLENDER:-$(doc_env BLENDER)}"
BLENDER="${BLENDER:-/d/Tools/blender-5.2.3-windows-x64/blender.exe}"
# Trên hpc-station: add-on MPFB + cấu hình Blender nằm trong project, .tmp ở gốc project (01 §2 trong tài liệu nhân vật).
TMP_ROOT="${TMP_ROOT:-$(doc_env TMP_ROOT)}"
TMP_ROOT="${TMP_ROOT:-$goc/.tmp}"
BLENDER_USER_RESOURCES="${BLENDER_USER_RESOURCES:-$(doc_env BLENDER_USER_RESOURCES)}"
[ -n "$BLENDER_USER_RESOURCES" ] && export BLENDER_USER_RESOURCES

if [ $# -lt 2 ]; then
  echo "Thiếu tham số. Dùng: scripts/phong/san-bar/dung-nhan-vat.sh <file.blend | _> <bước> [tham số...]" >&2
  exit 2
fi
if [ ! -x "$BLENDER" ] && ! command -v "$BLENDER" >/dev/null 2>&1; then
  echo "Không thấy Blender ở '$BLENDER'. Đặt BLENDER trong .env." >&2
  exit 1
fi
blend="$1"; buoc="${2%.py}"; shift 2
py="$goc/scripts/phong/san-bar/nhan-vat/$buoc.py"
if [ ! -f "$py" ]; then
  echo "Không có bước '$buoc' trong scripts/phong/san-bar/nhan-vat/." >&2
  exit 2
fi

# Blender ghi ảnh nướng tạm vào TEMP; ổ C hết chỗ thì texture ra đen ("Failed OpenEXR write") → luôn ghi vào .tmp/
mkdir -p "$TMP_ROOT/blender"
export TEMP="$TMP_ROOT/blender" TMP="$TMP_ROOT/blender" TMPDIR="$TMP_ROOT/blender" PYTHONIOENCODING=utf-8

if [ "$blend" = "_" ]; then
  "$BLENDER" -b --factory-startup --python "$py" -- "$@"
else
  "$BLENDER" -b "$blend" --python "$py" -- "$@"
fi
