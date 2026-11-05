"""Dựng hình khối 3D từ ảnh nhiều góc bằng Hunyuan3D-2mv (chạy trên máy có GPU, trong venv ~/ai3d/venv).

python hunyuan_mv.py <thư mục có front/left/back/right.png> <file .glb> [--swap-lr] [--steps 50] [--octree 384]

--swap-lr: đổi ảnh trái/phải nếu kết quả bị lật (quy ước "left" của mô hình là phía bên nào của nhân vật).
"""
import argparse
import os
import time

import torch
from PIL import Image

from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--swap-lr", action="store_true")
ap.add_argument("--steps", type=int, default=50)
ap.add_argument("--octree", type=int, default=384)
ap.add_argument("--seed", type=int, default=1234)
a = ap.parse_args()

names = {"front": "front", "back": "back", "left": "left", "right": "right"}
if a.swap_lr:
    names["left"], names["right"] = "right", "left"

rembg = BackgroundRemover()
images = {}
for view, fname in names.items():
    p = os.path.join(a.src, fname + ".png")
    if not os.path.exists(p):
        continue
    img = Image.open(p).convert("RGB")
    img = rembg(img)  # nền trơn → tách nền để mô hình chỉ thấy nhân vật
    img.save(os.path.join(a.src, f"_nobg_{view}.png"))
    images[view] = img
print("VIEWS", list(images))

t = time.time()
pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
    "tencent/Hunyuan3D-2mv", subfolder="hunyuan3d-dit-v2-mv", variant="fp16")
print("LOADED", round(time.time() - t, 1), "s")

t = time.time()
mesh = pipe(image=images, num_inference_steps=a.steps, octree_resolution=a.octree,
            num_chunks=20000, generator=torch.manual_seed(a.seed), output_type="trimesh")[0]
print("GENERATED", round(time.time() - t, 1), "s", "verts", len(mesh.vertices), "faces", len(mesh.faces))
print("VRAM_PEAK_GB", round(torch.cuda.max_memory_allocated() / 1e9, 2))
mesh.export(a.out)
print("SAVED", a.out)
