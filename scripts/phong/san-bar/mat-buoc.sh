#!/usr/bin/env bash
# Phòng sàn bar — phần Blender của một bước trong quy trình dựng một kiểu MẮT (skill chatgpt-bo-phan-3d, 05 §6a).
# Như mui-buoc.sh nhưng khớp KHE MỞ MÍ (bo_phan khop-mat), khuôn assets/parts/eyeshape/_khuon, góc 0 → 45 → duyệt 90.
# Ảnh ChatGPT vừa tải nằm ở ~/Downloads, tên <tên>-a-0.png, <tên>-b-45.png, <tên>-c-90.png.
#
#   scripts/phong/san-bar/mat-buoc.sh <tên> a    # khớp chính diện → part-a.json, chụp gui/ để gửi bước B
#   scripts/phong/san-bar/mat-buoc.sh <tên> b    # khớp chính diện + 45° (thanh, rồi nắn từng đỉnh = bước tinh) → part-b.json,
#                                                 chụp gui/ để duyệt
#   scripts/phong/san-bar/mat-buoc.sh <tên> c    # đo góc duyệt 90, chốt part.json, chụp dung/ + mat/, kéo về
#   scripts/phong/san-bar/mat-buoc.sh <tên> b2   # duyệt > 0,5 mm: khớp lại có thêm góc 90, rồi <tên> chot
#   scripts/phong/san-bar/mat-buoc.sh <tên> lai  # khớp lại từ đầu hai góc chính (code mới), đo 90, chốt
#
# Ảnh Blender cần đính kèm cho ChatGPT được chép về D:\TikTok\.tmp\mat\<tên>\gui\ (thư mục session đọc được).
set -euo pipefail

ten="${1:?Thiếu tên kiểu mắt}"; buoc="${2:?Thiếu bước a|b|tinh|c|lai|b2|chot}"
HOST="${HPC_HOST:-hpc-station}"; PROJ="${HPC_PROJ:-/mnt/D/dung-3d}"
goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
tmp="$goc/.tmp/mat/$ten"; luu="${ASSETS:-/d/Assets}/parts/eyeshape/$ten"
P="assets/parts/eyeshape/$ten"; K="assets/parts/eyeshape/_khuon/khuon.json"
B="repo/scripts/phong/san-bar/dung-nhan-vat.sh"
mkdir -p "$tmp/gui" "$luu/chatgpt"
ssh "$HOST" "mkdir -p '$PROJ/$P/chatgpt' '$PROJ/$P/gui'"

day() {   # ảnh ChatGPT trong ~/Downloads → bản lưu D:\Assets + hpc
  local f="$HOME/Downloads/$1"
  if [ ! -f "$f" ] && [ -f "$luu/chatgpt/$1" ]; then return 0; fi   # đã lấy từ lần trước (chạy lại bước)
  [ -f "$f" ] || { echo "Không thấy $f" >&2; exit 2; }
  mv "$f" "$luu/chatgpt/$1"; scp -q "$luu/chatgpt/$1" "$HOST:$PROJ/$P/chatgpt/$1"
}
chup_gui() {   # chụp 3 góc từ part → gui/ trên hpc, chép về .tmp để đính kèm
  ssh "$HOST" "cd '$PROJ' && $B _ bo_phan khuon $P/gui --khuon $K --part $P/$1 --goc 0,45,90 --tung --sac --R 1024 2>&1 | grep -E 'KHUON|Traceback'"
  scp -q "$HOST:$PROJ/$P/gui/*.png" "$tmp/gui/"
}
khop() {   # $1 = danh sách ảnh mẫu, các tham số còn lại cho khop-mat
  local refs="$1"; shift
  ssh "$HOST" "cd '$PROJ' && $B _ bo_phan khop-mat ${OUT:-$P} $refs $* 2>&1 | grep -E 'KHONG_ALPHA|HOC_MAU|CONG|VONG|MAT_LAT|KHOP|Traceback|Error' | sed -E 's/\"cong_khung\".*//' | cut -c1-500"
}
A0="0=$P/chatgpt/$ten-a-0.png"; B45="45=$P/chatgpt/$ten-b-45.png"; C90="90=$P/chatgpt/$ten-c-90.png"

case "$buoc" in
  a)
    day "$ten-a-0.png"
    khop "$A0" --vong 3
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-a.json'"
    chup_gui part-a.json
    echo "Gửi ChatGPT (P2): $tmp/gui/45.png" ;;
  b)
    day "$ten-b-45.png"
    khop "$A0,$B45" --tu-part "$P/part-a.json" --vong 2
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-b.json'"
    "$0" "$ten" tinh ;;
  tinh)  # nắn từng đỉnh mép mí theo hai góc chính (thanh trượt thường dừng ở 0,3–0,8 mm) → part-b.json, chụp gui/
    khop "$A0,$B45" --tu-part "$P/part-b.json" --vong 0 --tu-do 10 --mu 2
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-b.json'"
    chup_gui part-b.json
    echo "Gửi ChatGPT (P3): $tmp/gui/90.png" ;;
  c)
    day "$ten-c-90.png"
    ssh "$HOST" "mkdir -p '$PROJ/.tmp/duyet-mat-$ten'"
    OUT=".tmp/duyet-mat-$ten" khop "$C90" --tu-part "$P/part-b.json" --vong 0
    ssh "$HOST" "cp '$PROJ/$P/part-b.json' '$PROJ/$P/part.json' && cp '$PROJ/.tmp/duyet-mat-$ten/part.json' '$PROJ/$P/duyet.json'"
    "$0" "$ten" chot ;;
  lai)  # khớp lại từ đầu (thanh có phạt mặt gập + nắn đỉnh + gỡ gập) theo hai góc chính, rồi đo 90 và chốt
    khop "$A0,$B45" --vong 3 --tu-do 10 --mu 2
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-b.json'"
    "$0" "$ten" c ;;
  b2)   # duyệt chưa đạt: khớp lại có thêm góc 90
    khop "$A0,$B45,$C90" --tu-part "$P/part-b.json" --vong 2
    ssh "$HOST" "cp '$PROJ/$P/part.json' '$PROJ/$P/part-b2.json'"
    echo "Đạt thì: $0 $ten chot" ;;
  chot)  # chụp dung/ (khuôn) + mat/ (cả đầu) từ part.json hiện tại, kéo về
    ssh "$HOST" "cd '$PROJ' && $B _ bo_phan khuon $P/dung --khuon $K --part $P/part.json --goc 0,45,90 --tung --sac --R 1024 2>&1 | grep KHUON && \
      $B _ bo_phan chup $P/mat --part $P/part.json --views 0,45,90 2>&1 | grep CHUP"
    "$goc/scripts/phong/san-bar/hpc-dong-bo.sh" keo "parts/eyeshape/$ten" ;;
  *) sed -n '2,10p' "$0" >&2; exit 2 ;;
esac
