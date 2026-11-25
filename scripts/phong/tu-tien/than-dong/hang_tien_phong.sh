#!/bin/bash
# Hàng chạy MimicMotion cho tướng tiên phong (hpc): mỗi tranh × mỗi động tác → khung thật → WebP động có alpha.
#   bash hang_tien_phong.sh "<tranh1> <tranh2> …" "<động tác…>"     (mặc định: son-nam thuy-nam thuy-nu × chuong chem bung)
# Vào: $P/.tmp/than/chien-<tranh>.png. Ra: $P/.tmp/than/ra/chien-<tranh>-dong-<động tác>.webp. Chạy lại thì bỏ qua cái đã có.
P=${DUNG3D:-/mnt/Backup/dung-3d}
T=$P/.tmp/than
M=$P/.tmp/mimic
cd $M/MimicMotion
export SVD=$(ls -d $M/hf/hub/models--stabilityai--stable-video-diffusion-img2vid-xt/snapshots/*)
export PYTHONPATH=$PWD HF_HOME=$M/hf TMPDIR=$M/tmp PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True U2NET_HOME=$T/u2net
mkdir -p $T/ra
for k in ${1:-son-nam thuy-nam thuy-nu}; do
  for d in ${2:-chuong chem bung}; do
    ra=$T/ra/chien-$k-dong-$d.webp
    [ -f $ra ] && continue
    echo "BAT DAU $k $d $(date +%T)"
    $M/venv/bin/python $T/than_dong.py $T/chien-$k.png $T/$k-$d --dong $d --so 32 > $T/$k-$d/chay.log 2>&1 || { echo "LOI ve $k $d"; continue; }
    ~/ai3d/venv/bin/python $T/ghep_dong.py $T/$k-$d/khung $ra --cao 560 > $T/$k-$d/ghep.log 2>&1 || echo "LOI ghep $k $d"
    echo "XONG $k $d $(date +%T)"
  done
done
echo HET
