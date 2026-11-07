"""Chèn khung giữa cho ảnh động có alpha bằng RIFE (ncnn-vulkan): tách màu và alpha thành hai chuỗi ảnh, nội suy riêng,
ghép lại. Vòng lặp kín: khung cuối nối về khung đầu.

python noi_khung.py <vào.webp> <ra.webp> [--x 4] [--tre 220]   (--tre: trễ mỗi khung GỐC, ms)
"""
import os, shutil, subprocess, sys
import numpy as np
from PIL import Image

vao, ra = sys.argv[1:3]
x = int(sys.argv[sys.argv.index("--x") + 1]) if "--x" in sys.argv else 4
tre = int(sys.argv[sys.argv.index("--tre") + 1]) if "--tre" in sys.argv else 220
RIFE = "/mnt/D/dung-3d/.tmp/rife/rife-ncnn-vulkan-20221029-ubuntu"
NEN = 128  # nền xám trung tính: viền tách lại ít ám màu
tam = os.path.splitext(ra)[0] + "-tam"
shutil.rmtree(tam, ignore_errors=True)
for d in ("mau", "alpha", "mau-ra", "alpha-ra"):
    os.makedirs(f"{tam}/{d}")

im = Image.open(vao)
khung = []
try:
    while True:
        khung.append(np.asarray(im.convert("RGBA"), dtype=np.float32)); im.seek(im.tell() + 1)
except EOFError:
    pass
khung.append(khung[0])  # nối vòng
for i, k in enumerate(khung):
    a = k[..., 3:4] / 255
    Image.fromarray((k[..., :3] * a + NEN * (1 - a)).round().astype(np.uint8)).save(f"{tam}/mau/{i:04d}.png")
    Image.fromarray(np.repeat(k[..., 3:4], 3, 2).astype(np.uint8)).save(f"{tam}/alpha/{i:04d}.png")
n = (len(khung) - 1) * x + 1
for d in ("mau", "alpha"):
    subprocess.run([f"{RIFE}/rife-ncnn-vulkan", "-i", f"{tam}/{d}", "-o", f"{tam}/{d}-ra", "-n", str(n), "-m", f"{RIFE}/rife-v4.6"],
                   check=True, capture_output=True)
ten = sorted(os.listdir(f"{tam}/mau-ra"))[:-1]  # bỏ khung cuối (trùng khung đầu)
ra_k = []
for t in ten:
    m = np.asarray(Image.open(f"{tam}/mau-ra/{t}").convert("RGB"), dtype=np.float32)
    a = np.asarray(Image.open(f"{tam}/alpha-ra/{t}").convert("L"), dtype=np.float32)[..., None] / 255
    # tay chân vung xa: RIFE trộn thành vệt nửa trong — làm sắc alpha để vệt đó biến mất, chỉ giữ viền mềm mỏng
    a = ((a - 0.45) / 0.25).clip(0, 1)
    c = np.where(a > 0.02, (m - NEN * (1 - a)) / np.maximum(a, 0.02), 0).clip(0, 255)
    ra_k.append(Image.fromarray(np.concatenate([c, a * 255], 2).round().astype(np.uint8), "RGBA"))
ra_k[0].save(ra, save_all=True, append_images=ra_k[1:], duration=round(tre / x), loop=0, quality=90, method=6)
shutil.rmtree(tam)
print("XONG", len(ra_k), "khung")
