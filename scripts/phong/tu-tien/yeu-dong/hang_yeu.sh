#!/bin/bash
# Hàng hoạt ảnh yêu tinh trên hpc-station: mỗi con × mỗi đoạn → WebP động có alpha.
#   bash hang_yeu.sh "<con…>" "<đoạn…>"   (mặc định: cả 7 con, đoạn tho chieu trung cuong — chạy hết đoạn
#   tho của mọi con trước, rồi mới tới đoạn kế)
# Vào: $Y/tranh/<con>.webp. Ra: $Y/ra/<con>-<đoạn>.webp. Có rồi thì bỏ qua. ~4–5 phút mỗi giây video trên 3070.
P=${DUNG3D:-/mnt/Backup/dung-3d}
Y=$P/.tmp/yeu-dong
FP=$P/.tmp/framepack
export HF_HOME=$FP/hf TMPDIR=$FP/tmp PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True U2NET_HOME=$P/.tmp/than/u2net
mkdir -p $Y/ra

declare -A CON=(
  [ngu]="A giant sea serpent fish monster with spiky fins rising from crashing ocean waves"
  [ho]="A white nine-tailed fox spirit with glowing pink tail tips standing on a misty purple lake with lotus flowers"
  [moc]="An ancient twisted sandalwood tree spirit with a hollow face, glowing green eyes, branch arms and root legs"
  [chan]="A giant coiled python serpent monster with bronze drum patterned scales, fangs bared, green poison smoke around it, on broken rocks"
  [bang]="A giant eagle monster with huge spread bronze and purple feathered wings, sharp talons, amid swirling storm clouds and small lightning"
  [cop]="A huge fierce tiger spirit with golden bronze drum stripe patterns and glowing green eyes, wreathed in orange flames, on mossy rocks"
  [giai]="A giant black stone-shelled crab monster with bronze patterns, huge raised pincers, red eyes on stalks, standing on coral with blue waves and purple poison bubbles"
)
declare -A DON=(
  [ngu]="sprays a powerful jet of water from its open jaws"
  [ho]="flares its nine tails wide and shoots bursts of pink fox fire"
  [moc]="whips its branch arms forward and slams its roots into the ground"
  [chan]="strikes forward with its fangs and spits green venom"
  [bang]="beats its huge wings creating a violent gust and screeches"
  [cop]="swipes its giant claws and roars"
  [giai]="snaps its giant pincers together and slams them down"
)
DUOI="static camera, the creature stays centered in the frame, full body visible, plain flat dark gray background"

loi() { # $1 con, $2 đoạn
  case $2 in
    tho) echo "${CON[$1]}, breathing slowly and swaying gently in an idle stance, small natural movements, its eyes glow, $DUOI" ;;
    chieu) echo "${CON[$1]} rears back gathering power, then lunges forward aggressively and ${DON[$1]}, then settles back to its starting pose, $DUOI" ;;
    trung) echo "${CON[$1]} is struck by a heavy blow, flinches and recoils backward in pain with a bright flash, then recovers to its starting pose, $DUOI" ;;
    cuong) echo "${CON[$1]} goes berserk with rage, thrashing violently and roaring, eyes blazing red, a dark red aura flaring around it, $DUOI" ;;
  esac
}
giay() { [ "$1" = trung ] && echo 1 || echo 2; }
kieu() { [ "$1" = tho ] || [ "$1" = cuong ] && echo lap || echo mot; }

for d in ${2:-tho chieu trung cuong}; do
  for c in ${1:-ngu ho moc chan bang cop giai}; do
    ra=$Y/ra/$c-$d.webp
    [ -f $ra ] && continue
    w=$Y/viec/$c-$d
    mkdir -p $w
    echo "BAT DAU $c $d $(date +%T)"
    if [ ! -f $w/khung/0000.png ]; then
      (cd $FP/FramePack && $FP/venv/bin/python $Y/yeu_fp.py $Y/tranh/$c.webp $w --giay $(giay $d) --loi "$(loi $c $d)") > $w/ve.log 2>&1 || { echo "LOI ve $c $d"; continue; }
    fi
    ~/ai3d/venv/bin/python $Y/ghep_yeu.py $w/khung $ra --kieu $(kieu $d) --co 512 --cl 50 > $w/ghep.log 2>&1 || echo "LOI ghep $c $d"
    echo "XONG $c $d $(date +%T)"
  done
done
echo HET
