"""Chiếu thẳng ảnh mẫu (đã xoá mi/kẻ mắt) lên UV lưới gốc: da, má hồng, môi, tạo khối của chính ảnh — dùng trong makeup.py.

makeup.py ... --photos <thư mục ảnh sạch> --views 0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png \
    --view-ortho <ortho lưới chụp ở đúng các góc đó, có lm_ortho.json>

- Góc từng ảnh: chụp lưới ở nhiều góc (base_head.py views --angles ...), dò điểm mốc, chọn góc lệch điểm mốc nhỏ nhất so với ảnh.
- Texel → ảnh: chiếu ortho đúng góc (như render_views) rồi uốn TPS theo điểm mốc (ortho lưới ↔ ảnh) → mắt, môi, mũi của ảnh
  rơi đúng chỗ trên lưới. Bị che (z-buffer) hay nghiêng quá → không lấy.
- Khử ánh sáng: độ sáng ảnh ≈ albedo × S(N), S = cầu điều hoà bậc 1 theo pháp tuyến (khớp bình phương tối thiểu trên da trơn) →
  albedo = ảnh / S. Góc tối do che khuất (lỗ mũi, khoé miệng) không khử hết — giữ lại như nét vẽ.
- Trộn các góc theo (N·hướng nhìn)², ảnh chính diện ưu tiên; makeup.py khớp tông lớn (σ 25 mm) với texture hiện có → không lộ
  mép (một hệ số chung thì điểm giống tụt 70 → 63 %). Nguồn: ảnh đã xoá cả mi lẫn mày (clean_b), còn mày thì bị kéo ra quanh mày.
"""
import json
import os

import numpy as np


def _tps_fit(src, dst, lam=1e-3):
    n = len(src)
    d = np.linalg.norm(src[:, None] - src[None], axis=-1)
    K = np.where(d > 0, d * d * np.log(d + 1e-12), 0)
    P = np.hstack([np.ones((n, 1)), src])
    A = np.zeros((n + 3, n + 3)); A[:n, :n] = K + lam * np.eye(n); A[:n, n:] = P; A[n:, :n] = P.T
    b = np.zeros((n + 3, 2)); b[:n] = dst
    return src, np.linalg.solve(A, b)


def _tps_apply(model, pts, chunk=20000):
    src, W = model; n = len(src); out = np.empty((len(pts), 2))
    for i in range(0, len(pts), chunk):
        p = pts[i:i + chunk]
        d = np.linalg.norm(p[:, None] - src[None], axis=-1)
        K = np.where(d > 0, d * d * np.log(d + 1e-12), 0)
        out[i:i + chunk] = K @ W[:n] + W[n] + p @ W[n + 1:]
    return out


def _sh(N):
    """Cầu điều hoà bậc 1 (4 hệ số): bậc 2 khớp không ổn định ở ảnh nghiêng (vùng thấy hẹp)."""
    return np.hstack([np.ones((len(N), 1)), N])


def project(P, N, valid, photos_dir, views, view_ortho, lm_photo, load_image, exclude=None, front_bias=1.5):
    """P, N (h, w, 3) toạ độ / pháp tuyến thế giới từng texel; valid (h, w). load_image(path) → (H, W, 4) tuyến tính, hàng 0 TRÊN.
    exclude (h, w) 0..1: vùng không dùng để khớp ánh sáng (môi, mắt, mày). Trả về (albedo (h, w, 3), trọng số (h, w))."""
    meta = json.load(open(os.path.join(view_ortho, "ortho.json")))
    lmo = json.load(open(os.path.join(view_ortho, "lm_ortho.json")))
    idx = np.where(valid.ravel())[0]
    Pv, Nv = P.reshape(-1, 3)[idx], N.reshape(-1, 3)[idx]
    Nv = Nv / np.maximum(np.linalg.norm(Nv, axis=1, keepdims=True), 1e-6)
    ex = exclude.reshape(-1)[idx] if exclude is not None else np.zeros(len(idx))
    acc = np.zeros((len(idx), 3)); wsum = np.zeros(len(idx))
    for ang, fname in views:
        key = f"ortho_{ang}.png"; m = meta[key]; R, sc, cu, cv = m["R"], m["scale"], m["cu"], m["cv"]
        r = np.radians(ang); d = np.array([np.sin(r), -np.cos(r), 0.0]); right = np.cross(-d, [0, 0, 1])
        px = (Pv @ right - cu) / sc * R + R / 2; py = R / 2 - (Pv[:, 2] - cv) / sc * R
        # z-buffer: texel gần máy chụp nhất của mỗi px ortho mới thấy được (độ sâu = P·d, lớn = gần)
        dep = Pv @ d; ix = np.clip(px.astype(int), 0, R - 1); iy = np.clip(py.astype(int), 0, R - 1)
        zb = np.full((R, R), -1e9); np.maximum.at(zb, (iy, ix), dep)
        vis = dep >= zb[iy, ix] - 0.002
        face = np.clip((Nv @ d - 0.25) / 0.5, 0, 1) ** 2 * vis * (front_bias if ang == 0 else 1.0)
        # ortho lưới → ảnh: TPS theo điểm mốc (bỏ tròng mắt)
        L1 = lmo[key]; L2 = lm_photo[fname]
        ks = [k for k in L1 if k in L2 and not k.startswith("iris")]
        src = np.array([L1[k] for k in ks]) / R; dst = np.array([L2[k] for k in ks])
        img = load_image(os.path.join(photos_dir, fname)); H, W = img.shape[:2]
        tps = _tps_fit(src, dst / W)
        q = _tps_apply(tps, np.stack([px, py], 1) / R) * W
        inside = (q[:, 0] >= 1) & (q[:, 0] < W - 2) & (q[:, 1] >= 1) & (q[:, 1] < H - 2)
        x0 = np.clip(q[:, 0].astype(int), 0, W - 2); y0 = np.clip(q[:, 1].astype(int), 0, H - 2)
        fx = (q[:, 0] - x0)[:, None]; fy = (q[:, 1] - y0)[:, None]
        C = (img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) + (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy
        w = face * inside * np.clip(C[:, 3], 0, 1) ** 4                  # alpha ảnh tách nền: mép đầu không lấy
        C = C[:, :3]
        # khử ánh sáng (cầu điều hoà bậc 1), khớp trên da trơn, bỏ 10 % lệch nhất rồi khớp lại
        lum = C @ np.array([0.2126, 0.7152, 0.0722])
        sel = (w > 0.3) & (ex < 0.1) & (lum > 0.02)
        Y = _sh(Nv)
        c = np.linalg.lstsq(Y[sel], lum[sel], rcond=None)[0]
        res = np.abs(Y[sel] @ c - lum[sel]); keep = res < np.percentile(res, 90)
        c = np.linalg.lstsq(Y[sel][keep], lum[sel][keep], rcond=None)[0]
        S = np.clip(Y @ c / np.median(Y[sel] @ c), 0.5, 1.6)
        acc += w[:, None] * C / S[:, None]; wsum += w
        print(f"PHOTO {ang}° {fname}: texel thấy {int((w > 0.3).sum())}, khớp đèn SH {np.round(c[:4] / c[0], 2)}")
    A = np.zeros(P.shape); Wt = np.zeros(P.shape[:2])
    A.reshape(-1, 3)[idx] = acc / np.maximum(wsum, 1e-6)[:, None]; Wt.reshape(-1)[idx] = np.clip(wsum, 0, 1)
    return A, Wt
