#!/usr/bin/env bash
# Phòng sàn bar — chạy phần Blender của một bước trong quy trình dựng một kiểu mũi (skill chatgpt-bo-phan-3d, 05 §6a).
# Chạy từ Git Bash trên Windows; ảnh ChatGPT vừa tải nằm ở ~/Downloads (tên <tên>-a-90.png, <tên>-b-0.png, ...).
#
#   scripts/phong/san-bar/mui-buoc.sh <tên> a    # khớp theo góc nghiêng  → part-a.json, chụp gui/ để gửi bước B
#   scripts/phong/san-bar/mui-buoc.sh <tên> b    # khớp nghiêng + chính diện → part-b.json, chụp gui/ để duyệt
#   scripts/phong/san-bar/mui-buoc.sh <tên> c    # đo hai góc duyệt (45, duoi45), chốt part.json, chụp dung/ + mat/, kéo về
#   scripts/phong/san-bar/mui-buoc.sh <tên> b2   # duyệt > 0,5 mm: khớp lại thêm góc duyệt (GOC_THEM), rồi <tên> chot
#
# Ảnh Blender cần đính kèm cho ChatGPT được chép về D:\TikTok\.tmp\mui\<tên>\gui\ (thư mục session đọc được).
set -euo pipefail

ten="${1:?Thiếu tên kiểu mũi}"; buoc="${2:?Thiếu bước a|b|c}"
HOST="${HPC_HOST:-hpc-station}"; PROJ="${HPC_PROJ:-/mnt/D/dung-3d}"
goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
tmp="$goc/.tmp/mui/$ten"; luu="${ASSETS:-/d/Assets}/parts/nose/$ten"
P="assets/parts/nose/$ten"; K="assets/parts/nose/_khuon/khuon.json"
B="repo/scripts/phong/san-bar/dung-nhan-vat.sh"
mkdir -p "$tmp/gui" "$luu/chatgpt"
ssh "$HOST" "mkdir -p '$PROJ/$P/chatgpt' '$PROJ/$P/gui'"

day() {   # ảnh ChatGPT trong ~/Downloads → bản lưu D:\Assets + hpc
  local f="$HOME/Downloads/$1"
  [ -f "$f" ] || { echo "Không thấy $f" >&2; exit 2; }
  mv "$f" "$luu/chatgpt/$1"; scp -q "$luu/chatgpt/$1" "$HOST:$PROJ/$P/chatgpt/$1"
}
chup_gui() {   # chụp 4 góc từ part → gui/ trên hpc, chép về .tmp để đính kèm
  ssh "$HOST" "cd '$PROJ' && $B _ bo_phan khuon $P/gui --khuon $K --part $P/$1 --goc 0,90,45,duoi45 --tung --sac --R 1024 2>&1 | grep -E 'KHUON|Traceback'"
  scp -q "$HOST:$PROJ/$P/gui/*.png" "$tmp/gui/"
}
khop() {   # $1 = danh sách ảnh mẫu, các tham số còn lại cho khop-khuon
  local refs="$1"; shift
  ssh "$HOST" "cd '$PROJ' && $B _ bo_phan khop-khuon ${OUT:-$P} $refs $* 2>&1 | grep -E 'KHONG_ALPHA|CONG|TU_DO tot|KHOP|Traceback|Error' | sed -E 's/\"targets\".*\"sai_so\"/\"sai_so\"/; s/\"cong_khung\".*//' | cut -c1-400"
}

case "$buoc" in
  a)
    day "$ten-a-90.png"
    khop "90=$P/chatgpt/$ten-a-90.png" --tu-do 12 --mu 1
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-a.json'"
    chup_gui part-a.json
    echo "Gửi ChatGPT (P2): $tmp/gui/0.png" ;;
  b)
    day "$ten-b-0.png"
    khop "90=$P/chatgpt/$ten-a-90.png,0=$P/chatgpt/$ten-b-0.png" --tu-part "$P/part-a.json" --tu-do 14 --mu 1
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-b.json'"
    chup_gui part-b.json
    echo "Gửi ChatGPT (P3): $tmp/gui/45.png rồi $tmp/gui/duoi45.png" ;;
  c)
    day "$ten-c-45.png"; day "$ten-c-duoi45.png"
    ssh "$HOST" "mkdir -p '$PROJ/.tmp/duyet-$ten'"
    OUT=".tmp/duyet-$ten" khop "45=$P/chatgpt/$ten-c-45.png,duoi45=$P/chatgpt/$ten-c-duoi45.png" --tu-part "$P/part-b.json"
    ssh "$HOST" "cd '$PROJ' && cp $P/part-b.json $P/part.json && cp .tmp/duyet-$ten/part.json $P/duyet.json && \
      $B _ bo_phan khuon $P/dung --khuon $K --part $P/part.json --goc 0,90,45,duoi45 --tung --sac --R 1024 2>&1 | grep KHUON && \
      $B _ bo_phan chup $P/mat --part $P/part.json --views 0,45,90 2>&1 | grep CHUP"
    "$goc/scripts/phong/san-bar/hpc-dong-bo.sh" keo "parts/nose/$ten" ;;
  b2)   # duyệt chưa đạt: khớp lại có thêm góc duyệt lệch (mặc định duoi45; GOC_THEM=45 hoặc "45 duoi45")
    refs="90=$P/chatgpt/$ten-a-90.png,0=$P/chatgpt/$ten-b-0.png"
    for g in ${GOC_THEM:-duoi45}; do refs="$refs,$g=$P/chatgpt/$ten-c-$g.png"; done
    khop "$refs" --tu-part "$P/part-b.json" --tu-do 14 --mu 1
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-b2.json'"
    OUT=".tmp/duyet-$ten" khop "45=$P/chatgpt/$ten-c-45.png,duoi45=$P/chatgpt/$ten-c-duoi45.png" --tu-part "$P/part-b2.json"
    ssh "$HOST" "cp '$PROJ/.tmp/duyet-$ten/part.json' '$PROJ/$P/duyet.json'"
    echo "Đạt thì: $0 $ten chot" ;;
  chot)  # chụp dung/ + mat/ từ part.json hiện tại, kéo về
    ssh "$HOST" "cd '$PROJ' && $B _ bo_phan khuon $P/dung --khuon $K --part $P/part.json --goc 0,90,45,duoi45 --tung --sac --R 1024 2>&1 | grep KHUON && \
      $B _ bo_phan chup $P/mat --part $P/part.json --views 0,45,90 2>&1 | grep CHUP"
    "$goc/scripts/phong/san-bar/hpc-dong-bo.sh" keo "parts/nose/$ten" ;;
  *) sed -n '2,10p' "$0" >&2; exit 2 ;;
esac
