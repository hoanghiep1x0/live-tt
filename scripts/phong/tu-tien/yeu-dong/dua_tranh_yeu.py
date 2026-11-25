"""Đưa tranh yêu tinh (PNG nền trong suốt từ ChatGPT) vào game theo luật docs/phong/tu-tien/nhan-vat/README.md.

  python dua_tranh_yeu.py <vào.png> <id>      → client/designs/tu-tien-son-ha/assets/yeu/<id>.webp

Alpha < 32 đưa về 0 (ChatGPT để lại lớp gần trong suốt), mờ dần bốn mép ~12%, cắt sát rồi đặt vào khung vuông
1024×1024 (thân chạm mép dưới, giữa ngang), WebP chất lượng 90.
"""
import os
import sys

import numpy as np
from PIL import Image

vao, ma = sys.argv[1], sys.argv[2]
GOC = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'client', 'designs', 'tu-tien-son-ha', 'assets', 'yeu')
CO = 1024

im = Image.open(vao).convert('RGBA')
a = np.array(im)
al = a[:, :, 3].astype(np.float32)
al[al < 32] = 0
im = Image.fromarray(np.dstack([a[:, :, :3], al.astype(np.uint8)]), 'RGBA')
bb = im.getchannel('A').getbbox()
im = im.crop(bb)
ti = min(CO / im.width, CO / im.height)
im = im.resize((round(im.width * ti), round(im.height * ti)), Image.LANCZOS)
khung = Image.new('RGBA', (CO, CO), (0, 0, 0, 0))
khung.alpha_composite(im, ((CO - im.width) // 2, CO - im.height))
# Mờ dần bốn mép (sương, khói thường chạm mép khung).
a = np.array(khung).astype(np.float32)
y, x = np.mgrid[0:CO, 0:CO].astype(np.float32)
le = CO * 0.12
mep = np.minimum.reduce([x / le, (CO - 1 - x) / le, y / le, np.full_like(x, 1e9)])  # mép dưới giữ nguyên
a[:, :, 3] *= np.clip(mep, 0, 1)
ra = os.path.normpath(os.path.join(GOC, f'{ma}.webp'))
Image.fromarray(a.astype(np.uint8), 'RGBA').save(ra, quality=90, method=6)
print('xong', ra)
