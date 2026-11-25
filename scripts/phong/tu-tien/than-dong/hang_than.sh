#!/bin/bash
# Hàng chạy MimicMotion cho hai chủ soái (thần): mỗi tranh × mỗi động tác → WebP động có alpha.
#   bash hang_than.sh "<tranh…>" "<động tác…>"   (mặc định: son-tinh thuy-tinh × vu dam)
# Vào: $P/.tmp/than/<tranh>.png. Ra: $P/.tmp/than/ra/<tranh>-dong-<động tác>.webp. Có rồi thì bỏ qua.
P=${DUNG3D:-/mnt/Backup/dung-3d}
T=$P/.tmp/than
M=$P/.tmp/mimic
cd $M/MimicMotion
export SVD=$(ls -d $M/hf/hub/models--stabilityai--stable-video-diffusion-img2vid-xt/snapshots/*)
export PYTHONPATH=$PWD HF_HOME=$M/hf TMPDIR=$M/tmp PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True U2NET_HOME=$T/u2net
mkdir -p $T/ra
for k in ${1:-son-tinh thuy-tinh}; do
  for d in ${2:-vu dam}; do
    ra=$T/ra/$k-dong-$d.webp
    [ -f $ra ] && continue
    echo "BAT DAU $k $d $(date +%T)"
    $M/venv/bin/python $T/than_dong.py $T/$k.png $T/$k-$d --dong $d --so 32 > $T/$k-$d/chay.log 2>&1 || { echo "LOI ve $k $d"; continue; }
    ~/ai3d/venv/bin/python $T/ghep_dong.py $T/$k-$d/khung $ra --cao 820 > $T/$k-$d/ghep.log 2>&1 || echo "LOI ghep $k $d"
    echo "XONG $k $d $(date +%T)"
  done
done
echo HET
