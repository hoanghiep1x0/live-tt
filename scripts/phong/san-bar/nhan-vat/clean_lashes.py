"""Xoá mi + kẻ mắt khỏi ảnh mặt (tô lấp bằng màu da xung quanh) để thay bằng mi/kẻ mắt 3D rời.

python clean_lashes.py <ảnh vào .png (RGBA tách nền hoặc RGB)> <ảnh ra .png> <lm_photo.json> [--band 1.7] [--dark 0.5]
Vùng xử lý: dải quanh viền mí (lid_*), từ viền mí ra ngoài `band` lần; bên trong mắt giữ nguyên.
Chỉ tô lấp các điểm tối hơn da (`dark` × độ sáng da trung bình) → lông mày, da sáng không bị ảnh hưởng.
"""
import json
import os
import sys

import cv2
import numpy as np

src, dst, lmf = sys.argv[1:4]
opt = lambda k, d: float(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
BAND, DARK, HB = opt("--band", 1.7), opt("--dark", 0.5), opt("--hband", 0.75)
lm = json.load(open(lmf))[os.path.basename(src)]
img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
rgb = img[..., :3].copy()
H, W = rgb.shape[:2]
lum = cv2.cvtColor(rgb, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
mask = np.zeros((H, W), np.uint8)
for s in ("l", "r"):
    ks = [f"lid_{s}_up_{i}" for i in range(9)] + [f"lid_{s}_lo_{i}" for i in range(8, -1, -1)]
    poly = np.array([lm[k] for k in ks], np.float32)
    c = poly.mean(0)
    inner = np.zeros_like(mask); outer = np.zeros_like(mask)
    cv2.fillPoly(inner, [((poly - c) * 0.97 + c).astype(np.int32)], 255)
    big = (poly - c) * np.array([BAND * HB, BAND]) + c          # dải rộng hơn theo chiều dọc (mi vểnh lên)
    big[:9, 1] -= (big[:9, 1].max() - big[:9, 1].min()) * 0.15    # mi trên dài hơn mi dưới
    cv2.fillPoly(outer, [big.astype(np.int32)], 255)
    band = (outer > 0) & (inner == 0)
    skin = np.median(lum[band])
    mask |= (band & (lum < skin * DARK + 0.05 * (1 - DARK))).astype(np.uint8) * 255
    # cả lòng mắt cũng tô lấp (nhãn cầu 3D thay vào), để màu lấp chỉ lấy từ da — không kéo lòng trắng ra thành mảng bạc
    eye_in = np.zeros_like(mask); cv2.fillPoly(eye_in, [((poly - c) * np.array([1.12, 1.35]) + c).astype(np.int32)], 255)
    mask |= eye_in
if "--brows" in sys.argv:  # xoá cả lông mày (thay bằng lông mày rời)
    for s in ("l", "r"):
        ks = [f"brow_{s}_up_{i}" for i in range(5)] + [f"brow_{s}_lo_{i}" for i in range(4, -1, -1)]
        if all(k in lm for k in ks):
            poly = np.array([lm[k] for k in ks], np.float32); c = poly.mean(0)
            cv2.fillPoly(mask, [((poly - c) * np.array([1.15, 1.8]) + c).astype(np.int32)], 255)
mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)
# tô lấp kiểu "đẩy–kéo" (push–pull): thu nhỏ ảnh nhiều tầng chỉ với điểm da còn lại, rồi phóng ngược lên để lấp lỗ
# → mảng da liền mượt, không vệt kéo (inpaint) và không phân tầng (làm mờ nhiều mức)
def push_pull(img, w):
    if min(img.shape[:2]) <= 4:
        m = (img * w[..., None]).sum((0, 1)) / max(w.sum(), 1e-6)
        return np.broadcast_to(m, img.shape).copy()
    small_i = cv2.pyrDown(img * w[..., None]); small_w = cv2.pyrDown(w)
    est = small_i / np.maximum(small_w[..., None], 1e-6)
    filled = push_pull(est, np.clip(small_w * 4, 0, 1))
    up = cv2.pyrUp(filled, dstsize=(img.shape[1], img.shape[0]))
    return img * w[..., None] + up * (1 - w[..., None])


keep = (mask == 0).astype(np.float32)
src_f = rgb.astype(np.float32)
fill = push_pull(src_f * keep[..., None] / 1.0, keep)
soft = cv2.GaussianBlur((mask > 0).astype(np.float32), (0, 0), 3)[..., None]   # mép mềm
out = src_f * (1 - soft) + fill * soft
out = np.clip(out, 0, 255)
res = img.copy(); res[..., :3] = out.astype(np.uint8)
cv2.imwrite(dst, res)
cv2.imwrite(os.path.splitext(dst)[0] + "_mask.png", mask)
print("CLEANED", dst, "pixels", int((mask > 0).sum()))
