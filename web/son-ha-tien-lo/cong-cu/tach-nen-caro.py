"""Tách nền ô caro giả (ChatGPT đôi khi vẽ ô caro trắng xám thay vì nền trong suốt thật).

python web/son-ha-tien-lo/cong-cu/tach-nen-caro.py <vào.png> <ra.png>

Điểm "giống nền" = ít màu (xám/trắng) và sáng. Loang từ mép ảnh qua các điểm giống nền → trong suốt.
Phần sáng trắng NẰM TRONG món đồ (không nối ra mép) được giữ. Viền làm mềm 1 điểm ảnh.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

im = Image.open(sys.argv[1]).convert('RGB')
a = np.asarray(im).astype(np.int16)
mx, mn = a.max(2), a.min(2)
nen = ((mx - mn) < 22) & (mn > 175)
vung = np.zeros_like(nen)
vung[0, :] = nen[0, :]; vung[-1, :] = nen[-1, :]; vung[:, 0] = nen[:, 0]; vung[:, -1] = nen[:, -1]
while True:
    moi = vung.copy()
    moi[1:, :] |= vung[:-1, :]; moi[:-1, :] |= vung[1:, :]; moi[:, 1:] |= vung[:, :-1]; moi[:, :-1] |= vung[:, 1:]
    moi &= nen
    if (moi == vung).all():
        break
    vung = moi
alpha = Image.fromarray(np.where(vung, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
ra = im.convert('RGBA')
ra.putalpha(alpha)
ra.save(sys.argv[2])
print('xong', sys.argv[2], 'nen', round(vung.mean() * 100), '%')
