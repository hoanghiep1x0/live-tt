"""Mẹo của hoạ sĩ: chồng ảnh mẫu lên bản dựng (50%) và xem bản lật gương để thấy ngay chỗ lệch.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/compare_overlay.py -- <ortho_0.png (màu)> <lm_ortho.json> <ảnh mẫu> <lm_photo.json> <ra.png>
Ảnh mẫu được căn theo điểm mốc (đồng dạng: tỉ lệ + xoay + dời) cho trùng bản dựng. Ra 3 ô: chồng 50% | bản dựng | ảnh mẫu,
và hàng dưới là bản lật gương (lật giúp mắt người thấy lỗi lệch, méo mà nhìn quen không còn thấy).
"""
import json
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
render_p, lmo_p, photo_p, lmp_p, out = a[:5]


def load(p):
    im = bpy.data.images.load(p); W, H = im.size
    return np.array(im.pixels[:], np.float32).reshape(H, W, 4)[::-1, :, :3].copy()  # hàng 0 ở TRÊN


Rimg = load(render_p); Pimg = load(photo_p)
lo = json.load(open(lmo_p))[os.path.basename(render_p)]
lp = json.load(open(lmp_p))[os.path.basename(photo_p)]
keys = [k for k in lo if k in lp and not k.startswith(("lid_", "iris", "brow_", "lipo_"))]
A = np.array([lp[k] for k in keys]); B = np.array([lo[k] for k in keys])   # ảnh mẫu → bản dựng
Ac, Bc = A - A.mean(0), B - B.mean(0)
U, S, Vt = np.linalg.svd(Ac.T @ Bc)
Rm = (U @ Vt).T
s = S.sum() / (Ac ** 2).sum()
H, W = Rimg.shape[:2]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
q = np.stack([xx.ravel(), yy.ravel()], 1)
src = ((q - B.mean(0)) @ Rm) / s + A.mean(0)       # với mỗi điểm ảnh bản dựng → điểm tương ứng trong ảnh mẫu
sx = src[:, 0].clip(0, Pimg.shape[1] - 1).astype(int); sy = src[:, 1].clip(0, Pimg.shape[0] - 1).astype(int)
Pw = Pimg[sy, sx].reshape(H, W, 3)
err = np.abs((B - (Ac @ Rm.T) * s - A.mean(0) * 0 - B.mean(0) + B.mean(0) - B.mean(0)))
mix = Rimg * 0.5 + Pw * 0.5
row = np.concatenate([mix, Rimg, Pw], 1)
sheet = np.concatenate([row, row[:, ::-1]], 0)
img = bpy.data.images.new("cmp", sheet.shape[1], sheet.shape[0])
img.pixels[:] = np.dstack([sheet[::-1], np.ones(sheet.shape[:2] + (1,), np.float32)]).ravel()
img.filepath_raw = out; img.file_format = "PNG"; img.save()
d = np.linalg.norm(((A - A.mean(0)) @ Rm.T) * s + B.mean(0) - B, axis=1)
print("ALIGN", "điểm", len(keys), "lệch trung bình px", round(float(d.mean()), 1), "lớn nhất",
      {keys[i]: round(float(d[i]), 1) for i in np.argsort(-d)[:5]})
print("SAVED", out)
