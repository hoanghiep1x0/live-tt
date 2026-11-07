"""Ghép nét ChatGPT với chuyển động MimicMotion: mỗi khung ra có hình dáng (vị trí tay chân) của khung MimicMotion cùng
lúc, còn điểm ảnh lấy từ hai khung ChatGPT gần nhất (trước, sau), uốn theo optical flow cho khớp dáng rồi trộn.

python tron_khung.py <khoá ChatGPT.webp> <chuyển động MimicMotion.webp> <ra.webp> [--tre 100]
  khoá: N khung (vd 16 dáng ghép bằng ghep_khung.py từ ảnh ChatGPT), chuyển động: N × m khung (vd 64) — khung khoá k
  ứng với khung chuyển động k·m. Cả hai phải ghép bằng ghep_khung.py với CÙNG --to và người nộm cùng điệu, cùng góc
  (dang_mau.py --so N và --so N·m), để người đứng cùng chỗ, cùng cỡ trên cùng một khung.

Mọi khung ra (kể cả khung khoá) đều theo dáng MimicMotion — nhịp chuyển động liền mạch, không giật ở khung khoá; nét
vẽ, mặt, chữ trên áo từ ChatGPT. Tay chân vung xa giữa hai khoá có thể bị kéo méo: xem tài liệu 10 §5b.
"""
import sys

import cv2
import numpy as np
from PIL import Image

khoa_p, cd_p, ra = sys.argv[1:4]
tre = int(sys.argv[sys.argv.index("--tre") + 1]) if "--tre" in sys.argv else 100


def doc(p):
    im = Image.open(p)
    ds = []
    for i in range(im.n_frames):
        im.seek(i)
        ds.append(np.asarray(im.convert("RGBA"), dtype=np.float32))
    return ds


K, M = doc(khoa_p), doc(cd_p)
assert K[0].shape == M[0].shape, f"khung khác cỡ: {K[0].shape} / {M[0].shape} — ghép cả hai cùng --to"
m = len(M) // len(K)
assert m * len(K) == len(M), f"{len(M)} khung chuyển động không chia hết cho {len(K)} khoá"
H, W = K[0].shape[:2]
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)


def xam(f):
    # nền xám trung tính để flow không bám vào nền trong suốt
    a = f[..., 3:4] / 255
    return cv2.cvtColor((f[..., :3] * a + 128 * (1 - a)).astype(np.uint8), cv2.COLOR_RGB2GRAY)


def uon(nguon, dich):
    """Uốn khung `nguon` (khoá) cho khớp dáng khung `dich` (chuyển động): flow tính ở nửa cỡ cho nhanh."""
    s = 0.5
    a = cv2.resize(xam(dich), None, fx=s, fy=s)
    b = cv2.resize(xam(nguon), None, fx=s, fy=s)
    f = dis.calc(a, b, None)  # với mỗi điểm của `dich`: dời bao nhiêu thì tới điểm tương ứng trong `nguon`
    f = cv2.resize(f, (W, H)) / s
    gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    pm = nguon.copy()
    pm[..., :3] *= pm[..., 3:4] / 255  # nhân alpha trước khi nội suy: viền không ám màu nền
    return cv2.remap(pm, gx + f[..., 0], gy + f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


ra_k = []
for t in range(len(M)):
    k, j = divmod(t, m)
    w = j / m
    out = (1 - w) * uon(K[k], M[t]) + w * uon(K[(k + 1) % len(K)], M[t]) if w > 0 else uon(K[k], M[t])
    a = out[..., 3:4]
    rgb = np.where(a > 1, out[..., :3] * 255 / np.maximum(a, 1), 0)
    # chỗ flow không lấy được điểm ảnh ChatGPT (tay chân vung xa, mép người) thì bù bằng chính điểm ảnh MimicMotion —
    # mềm hơn nhưng không thành vệt đen; phủ dần theo độ đặc của phần đã uốn
    phu = np.clip(a / 255, 0, 1) ** 2
    rgb = rgb * phu + M[t][..., :3] * (1 - phu)
    # alpha theo khung chuyển động: hình bóng (tay chân) đúng dáng MimicMotion, không viền ma do trộn hai khoá
    alpha = M[t][..., 3:4]
    ra_k.append(Image.fromarray(np.concatenate([rgb, alpha], 2).clip(0, 255).astype(np.uint8), "RGBA"))
    print("KHUNG", t + 1, flush=True)
ra_k[0].save(ra, save_all=True, append_images=ra_k[1:], duration=tre, loop=0, quality=90, method=6)
print("XONG", len(ra_k), "khung", (W, H))
