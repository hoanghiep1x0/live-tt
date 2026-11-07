#!/usr/bin/env bash
# Phòng sàn bar — dựng một kiểu MÀY từ ảnh ChatGPT (skill chatgpt-bo-phan-3d, mục Mày).
# ChatGPT vẽ mày lên khuôn mày (assets/parts/brows/_khuon/0.png: da trần vùng mày + mắt +X, chính diện) → ảnh tải về
# ~/Downloads/<tên>-0.png. Blender tách nét mày (chỗ ảnh tối hơn khuôn, trên mắt), chiếu thẳng lên lớp da mỏng vùng mày
# hai bên (soi gương) → nhìn chính diện trùng ảnh ChatGPT; góc khác mày bám da.
#
#   scripts/phong/san-bar/may-buoc.sh <tên> dung [--nam]   # tách + chụp khuôn 0/45 + cả đầu (không mi) + GLB, kéo về
#
# Kết quả: D:\Assets\parts\brows\<tên>\ (may.png, may.json, chatgpt/, dung/, mat/, <tên>.glb); ảnh xem ở D:\TikTok\.tmp\may\<tên>\.
set -euo pipefail

ten="${1:?Thiếu tên kiểu mày}"; buoc="${2:?Thiếu bước dung}"; shift 2
HOST="${HPC_HOST:-hpc-station}"; PROJ="${HPC_PROJ:-/mnt/D/dung-3d}"
goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
tmp="$goc/.tmp/may/$ten"; luu="${ASSETS:-/d/Assets}/parts/brows/$ten"
P="assets/parts/brows/$ten"; K="assets/parts/brows/_khuon/khuon.json"
B="repo/scripts/phong/san-bar/dung-nhan-vat.sh"
NAM=""; [ "${1:-}" = "--nam" ] && NAM="--nam"
mkdir -p "$tmp" "$luu/chatgpt"
ssh "$HOST" "mkdir -p '$PROJ/$P/chatgpt'"

case "$buoc" in
  dung)
    f="$HOME/Downloads/$ten-0.png"
    if [ -f "$f" ]; then mv "$f" "$luu/chatgpt/"; fi
    [ -f "$luu/chatgpt/$ten-0.png" ] || { echo "Không thấy $f" >&2; exit 2; }
    scp -q "$luu/chatgpt/$ten-0.png" "$HOST:$PROJ/$P/chatgpt/"
    ssh "$HOST" "cd '$PROJ' && $B _ bo_phan may-anh $P $P/chatgpt/$ten-0.png 2>&1 | grep -E 'MAY_TACH|Traceback' && \
      $B _ bo_phan khuon $P/dung --khuon $K --may-anh $P --hien-may --khong-mi --goc 0,45,90 --tung --sac --R 1024 2>&1 | grep -E 'KHUON|Traceback' && \
      $B _ bo_phan chup $P/mat --may-anh $P --khong-mi $NAM --views 0,45 --R 1536 2>&1 | grep -E 'CHUP|Traceback' && \
      $B _ bo_phan xuat $P/$ten.glb --may-anh $P --khong-mi $NAM 2>&1 | grep -E 'XUAT|Traceback'"
    "$goc/scripts/phong/san-bar/hpc-dong-bo.sh" keo "parts/brows/$ten"
    cp "$luu/chatgpt/$ten-0.png" "$luu/dung/0.png" "$luu/dung/45.png" "$tmp/" 2>/dev/null || true ;;
  *) sed -n '2,10p' "$0" >&2; exit 2 ;;
esac
