#!/usr/bin/env bash
# Nặn lặp: chụp tượng → tìm điểm mốc (trên hpc-station) → nặn một chút → lặp lại.
# bash scripts/phong/san-bar/nhan-vat/sculpt_loop.sh <mesh vào.glb> <thư mục làm việc> <ảnh chính diện tách nền> <ảnh nghiêng tách nền> <số vòng> [tham số thêm cho sculpt.py]
set -euo pipefail
IN=$1; WORK=$2; FRONT=$3; SIDE=$4; ROUNDS=$5; shift 5
BLENDER="/d/Tools/blender-5.2.3-windows-x64/blender.exe"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$WORK"
cur="$IN"
for r in $(seq 1 "$ROUNDS"); do
  od="$WORK/ortho_r$r"
  "$BLENDER" -b --factory-startup --python "$HERE/render_ortho.py" -- "$cur" "$od" 0 >/dev/null 2>&1
  ssh -o BatchMode=yes hpc-station "rm -rf ~/ai3d/lm/loop && mkdir -p ~/ai3d/lm/loop"
  scp -q -o BatchMode=yes "$od/ortho_0.png" hpc-station:ai3d/lm/loop/
  ssh -o BatchMode=yes hpc-station "cd ~/ai3d && . mpvenv/bin/activate && python landmarks.py lm/loop lm/loop.json >/dev/null 2>&1" || true
  scp -q -o BatchMode=yes hpc-station:ai3d/lm/loop.json "$od/lm_ortho.json"
  cp "$WORK/lm_photo.json" "$od/lm_photo.json"
  nxt="$WORK/sculpt_r$r.glb"
  "$BLENDER" -b --factory-startup --python "$HERE/sculpt.py" -- "$cur" "$nxt" "$od" "$FRONT" "$SIDE" "$@" 2>&1 | grep -E "SCULPT|DONE|Error|Traceback" || true
  cur="$nxt"
done
echo "FINAL $cur"
