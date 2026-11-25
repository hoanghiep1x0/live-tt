#!/bin/bash
# Hàng VIDEO DÁNG CHIẾN theo trang phục (hpc-station, FramePack): mỗi tranh `chien-<nhân vật>-<áo>` → WebP động có alpha
# nhân vật vung binh khí ra đòn rồi về thế thủ (người vận hành 2026-11-23: "luyện công pháp như ma-nơ-canh, phải tạo
# video mới giống hoạt hình"). Dùng cho cảnh thử chiêu ở Võ Trường (`ve3d/san-thu.ts`) và có thể cho PK sau này.
#   bash hang_chien.sh "<tên…>"   (mặc định: mọi tranh trong $Y/chien/)
# Vào: $Y/chien/<tên>.webp (chép từ client/designs/tu-tien-son-ha/assets/nhan-vat/chien-*-tp*.webp, -c*.webp).
# Ra:  $Y/ra/<tên>-dong.webp → chép về assets/nhan-vat/<tên>-dong.webp. Có rồi thì bỏ qua. ~8–10 phút mỗi tranh (2 giây).
P=${DUNG3D:-/mnt/Backup/dung-3d}
Y=$P/.tmp/yeu-dong
FP=$P/.tmp/framepack
export HF_HOME=$FP/hf TMPDIR=$FP/tmp PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True U2NET_HOME=$P/.tmp/than/u2net
mkdir -p $Y/ra $Y/chien

# Động tác theo binh khí trong tranh của từng nhân vật (tên file: chien-son-…, chien-son-nu-…, chien-thuy-…, chien-thuy-nam-…).
don() {
  case $1 in
    chien-son-nu-*) echo "draws her bow fully and releases a glowing arrow toward the right, the bow string snaps back, her robes and ribbons whip" ;;
    chien-son-*) echo "raises his big bronze Dong Son battle axe and swings it down in a powerful diagonal strike toward the right, his robes and ribbons whip with the motion" ;;
    chien-thuy-nam-*) echo "spins his silver spear and thrusts it forward toward the right in a fast powerful strike, his robes and ribbons whip with the motion" ;;
    chien-thuy-*) echo "spins her silver spear and thrusts it forward toward the right in a fast graceful strike, her robes and ribbons whip with the motion" ;;
  esac
}
DUOI="then returns smoothly to the exact same starting battle stance, full body always visible, the character keeps the same face, costume and size, static camera, no zoom, plain flat dark gray background"

ds=${1:-$(ls $Y/chien | sed 's/\.webp$//')}
for t in $ds; do
  ra=$Y/ra/$t-dong.webp
  [ -f $ra ] && continue
  w=$Y/viec/$t
  mkdir -p $w
  echo "BAT DAU $t $(date +%T)"
  loi="A young xianxia warrior in an ornate ancient Vietnamese Dong Son costume stands in a battle stance facing right, gathers power for a moment, $(don $t), $DUOI"
  if [ ! -f $w/khung/0000.png ]; then
    (cd $FP/FramePack && $FP/venv/bin/python $Y/yeu_fp.py $Y/chien/$t.webp $w --giay 2 --loi "$loi") > $w/ve.log 2>&1 || { echo "LOI ve $t"; continue; }
  fi
  ~/ai3d/venv/bin/python $Y/ghep_yeu.py $w/khung $ra --kieu mot --co 640 --cl 50 > $w/ghep.log 2>&1 || echo "LOI ghep $t"
  echo "XONG $t $(date +%T)"
done
echo HET
