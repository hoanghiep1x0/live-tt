"""Tách nền hàng loạt bằng bộ tách nền của Hunyuan3D (rembg). python remove_bg.py <vào> <ra>"""
import os
import sys

from PIL import Image

from hy3dgen.rembg import BackgroundRemover

src, dst = sys.argv[1:3]
os.makedirs(dst, exist_ok=True)
rm = BackgroundRemover()
for f in sorted(os.listdir(src)):
    if f.lower().endswith(".png"):
        rm(Image.open(os.path.join(src, f)).convert("RGB")).save(os.path.join(dst, f))
        print("OK", f)
