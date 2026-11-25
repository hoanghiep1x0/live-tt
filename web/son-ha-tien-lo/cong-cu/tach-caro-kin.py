"""Dọn tiếp ô caro giả KẸP BÊN TRONG món (lòng cung, lòng vòng) mà tach-nen-caro.py (chỉ loang từ mép) còn sót.

python web/son-ha-tien-lo/cong-cu/tach-caro-kin.py <đã tách nền.png> <tờ gốc caro.png> <ra.png>
Xóa mọi vùng liền "giống nền" (xám/trắng, sáng) lớn hơn 1500 điểm ảnh. Chỉ dùng cho đồ không có quầng sáng trắng.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA'); goc = Image.open(sys.argv[2]).convert('RGB')
a = np.asarray(goc).astype(np.int16); mx, mn = a.max(2), a.min(2)
nen = ((mx - mn) < 22) & (mn > 175)
H, W = nen.shape; lab = np.zeros((H, W), np.int32); xoa = np.zeros((H, W), bool); n = 0
ys, xs = np.nonzero(nen[::4, ::4])
for y0, x0 in zip(ys * 4, xs * 4):
    if lab[y0, x0]: continue
    n += 1; lab[y0, x0] = n; q = deque([(y0, x0)]); pts = []
    while q:
        y, x = q.popleft(); pts.append((y, x))
        for yy, xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= yy < H and 0 <= xx < W and nen[yy, xx] and not lab[yy, xx]:
                lab[yy, xx] = n; q.append((yy, xx))
    if len(pts) > 1500:
        p = np.array(pts); xoa[p[:, 0], p[:, 1]] = True
arr = np.array(im); arr[xoa, 3] = 0
Image.fromarray(arr).save(sys.argv[3]); print('xoa', xoa.sum())
