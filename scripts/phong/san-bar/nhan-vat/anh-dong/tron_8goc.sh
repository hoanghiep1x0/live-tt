#!/bin/bash
# Ghép nét ChatGPT + chuyển động MimicMotion cho 8 góc (tài liệu 10 §5b). Chạy trong thư mục việc có:
#   goc/goc{A,B}_NN.png  — tấm 2×2 ChatGPT 16 dáng (A = 45/90/135/180°, B = 225/270/315/0°)
#   ds-truoc.txt         — 16 dòng "<dáng> <ảnh> [ô]" cho mặt trước (ảnh ChatGPT chính diện từng dáng)
#   dang[-gG]/           — người nộm 16 dáng mỗi góc (dang_mau.py --so 16)
#   <chuyển động>/gG.webp — MimicMotion đã ghép (video_sprite.py, --to 3) mỗi góc, G = 0 45 … 315
#   bash tron_8goc.sh <thư mục chuyển động> <thư mục ra>
# Góc nào chưa có ảnh chuyển động thì chờ (chạy song song với hàng ghép MimicMotion được).
S=$(dirname "$(realpath "$0")")
CD=$1; RA=$2; mkdir -p $RA
source ~/ai3d/venv/bin/activate
for g in 0 45 90 135 180 225 270 315; do
  nom=dang; [ $g != 0 ] && nom=dang-g$g
  ds=$RA/ds-$g.txt
  if [ $g = 0 ]; then cp ds-truoc.txt $ds; else
    case $g in 45) t=A; o=0,0;; 90) t=A; o=0,1;; 135) t=A; o=1,0;; 180) t=A; o=1,1;;
               225) t=B; o=0,0;; 270) t=B; o=0,1;; 315) t=B; o=1,0;; esac
    : > $ds; for i in $(seq 0 15); do printf "%d goc/goc%s_%02d.png %s,2,2\n" $i $t $i $o >> $ds; done
  fi
  python $S/ghep_khung.py $RA/khoa-g$g.webp $nom $ds --to 3 --tre 400 > $RA/khoa-$g.log 2>&1 || { echo "LOI khoa $g"; continue; }
  until [ -f $CD/g$g.webp ] && grep -q "WEBP $g " $CD.log 2>/dev/null; do sleep 30; done
  python $S/tron_khung.py $RA/khoa-g$g.webp $CD/g$g.webp $RA/g$g.webp --tre 100 > $RA/tron-$g.log 2>&1 && echo "TRON $g $(date +%T)" || echo "LOI tron $g"
done
echo HET
