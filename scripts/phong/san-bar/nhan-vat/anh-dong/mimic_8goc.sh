#!/bin/bash
# Chạy MimicMotion lần lượt 8 góc (0 45 90 … 315) trên hpc. Góc nào đã có video ra thì bỏ qua (chạy lại được).
#   bash mimic_8goc.sh <thư mục từ chuan_bi_8goc.py> [độ phân giải 576]   (GOCS="0 45" để chỉ chạy vài góc)
# Ra: <thư mục>/ra<góc>/*.mp4, nhật ký <thư mục>/log<góc>.txt. RTX 3070 8 GB: 576 dùng ~5,6 GB, ~11 phút / góc
# (64 khung); hỏng thì tự lùi xuống 512.
M=/mnt/D/dung-3d/.tmp/mimic          # MimicMotion + venv + cache mô hình (xem tài liệu 10 §3)
G=$(realpath "$1"); RES=${2:-576}
cd $M/MimicMotion
. $M/venv/bin/activate
export HF_HOME=$M/hf TMPDIR=$M/tmp PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
SVD=$(ls -d $M/hf/hub/models--stabilityai--stable-video-diffusion-img2vid-xt/snapshots/*)
for g in ${GOCS:-0 45 90 135 180 225 270 315}; do
  [ -n "$(ls $G/ra$g/*.mp4 2>/dev/null)" ] && continue
  for res in $RES 512; do
    cat > $G/c$g.yaml <<Y
base_model_path: $SVD
ckpt_path: models/MimicMotion_1-1.pth
test_case:
  - ref_video_path: $G/dang$g.mp4
    ref_image_path: $G/ref$g.png
    num_frames: 16
    resolution: $res
    frames_overlap: 4
    num_inference_steps: 25
    noise_aug_strength: 0
    guidance_scale: 2.0
    sample_stride: 1
    fps: 10
    seed: 42
Y
    echo "GOC $g RES $res $(date +%T)"
    python inference.py --inference_config $G/c$g.yaml --output_dir $G/ra$g > $G/log$g.txt 2>&1 && { echo "XONG $g $(date +%T)"; break; }
    echo "LOI $g $res: $(grep -m1 -i error $G/log$g.txt)"
  done
done
echo HET
