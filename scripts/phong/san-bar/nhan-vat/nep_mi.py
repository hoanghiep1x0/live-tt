"""Thư viện mí (nếp mí trên): so ảnh ChatGPT với lưới thanh nếp mí đã render, chọn trọng số khớp nhất.

python scripts/phong/san-bar/nhan-vat/nep_mi.py <lưới> <ảnh ChatGPT> <ra.json> [--S 0.05566] [--loai-bo f-1.0_c+0.5,...]

- <lưới>/f<fold>_c<cc>/0.png: khuôn mắt chính diện (bo_phan khuon --khuon eyeshape/_khuon/khuon.json --part ...) với
  fold = eyefold-up (+) / eyefold-down (−), cc = eyefold-concave (+) / eyefold-convex (−), mỗi trục −1..1.
- Đường nếp mí: ở mỗi cột trong 60 % giữa khe mắt, hàng TỐI NHẤT (đã trừ nền sáng tối chậm theo cột) trong dải phía trên
  mí trên (từ 2 % tới 45 % chiều cao ảnh phía trên mép khe) → độ cao nếp (px trên mép khe) + độ sâu (độ tối tương đối).
  Khe = điểm ảnh nhãn cầu (lòng trắng / tròng xanh lam của khuôn) — mép khe là mí trên.
- Sai số = trung bình |độ cao nếp ChatGPT − lưới| (mm, khung khuôn S mét / ảnh) + phạt độ sâu (mí lót vs hai mí rõ).
  Nội suy song tuyến giữa các ô lưới, dò mịn bước 0,05 → trọng số tốt nhất.
"""
import json, os, sys
import numpy as np
from PIL import Image

R = 512


def doc(p):
    A = np.asarray(Image.open(p).convert("RGBA").resize((R, R)), np.float32) / 255
    if A[..., 3].min() > 0.99:                                        # mất alpha: nền theo màu góc
        bg = np.median(np.concatenate([A[:6, :6, :3].reshape(-1, 3), A[-6:, -6:, :3].reshape(-1, 3)]), 0)
        A[..., 3] = (np.linalg.norm(A[..., :3] - bg, axis=2) > 0.08)
    return A


def nep(A):
    r, g, b, a = A[..., 0], A[..., 1], A[..., 2], A[..., 3]
    mx, mn = A[..., :3].max(2), A[..., :3].min(2)
    khe = (a > 0.5) & (((b - r) > 0.15) | ((mn > 0.78) & (mx - mn < 0.12)))   # tròng xanh lam hoặc lòng trắng
    cols = np.where(khe.any(0))[0]
    if len(cols) < 10:
        return None
    c0, c1 = cols.min(), cols.max(); w = c1 - c0
    L = 0.3 * r + 0.59 * g + 0.11 * b
    hs, ds = [], []
    for x in range(int(c0 + 0.2 * w), int(c1 - 0.2 * w) + 1):
        ys = np.where(khe[:, x])[0]
        if not len(ys):
            hs.append(np.nan); ds.append(0); continue
        top = ys.min(); da = np.where(a[:, x] > 0.5)[0]                    # mép trên mảng da (mép cắt khuôn) — tránh xa 12 px
        y0, y1 = max(int(da.min()) + 12, top - int(0.45 * R * 0.5)), top - int(0.02 * R)
        seg = L[y0:y1, x]; am = a[y0:y1, x] > 0.5
        if len(seg) < 8 or am.mean() < 0.95:
            hs.append(np.nan); ds.append(0); continue
        ker = np.ones(15) / 15
        nen = np.convolve(np.pad(seg, 7, mode="edge"), ker, "valid")
        v = seg - nen
        k = int(np.argmin(v[2:-2])) + 2
        hs.append(top - (y0 + k)); ds.append(float(-v[k]))
    return np.array(hs, float), np.array(ds, float), (c0, c1)


def chuan_hoa(h, n=40):
    """Đưa đường nếp về n mẫu theo bề ngang khe (khe ChatGPT và lưới cùng khung nên gần như cùng cột)."""
    x = np.linspace(0, 1, len(h)); ok = np.isfinite(h)
    return np.interp(np.linspace(0, 1, n), x[ok], h[ok]) if ok.sum() > 3 else np.full(n, np.nan)


def main():
    luoi, anh, ra = sys.argv[1:4]
    S = float(sys.argv[sys.argv.index("--S") + 1]) if "--S" in sys.argv else 0.05566
    bo = set(sys.argv[sys.argv.index("--loai-bo") + 1].split(",")) if "--loai-bo" in sys.argv else set()
    mm = S / R * 1000
    v = [-1.0, -0.5, 0.0, 0.5, 1.0]
    H = np.full((5, 5, 40), np.nan); Dp = np.zeros((5, 5))
    for i, f in enumerate(v):
        for j, c in enumerate(v):
            ten = f"f{f:+.1f}_c{c:+.1f}"
            kq = nep(doc(os.path.join(luoi, ten, "0.png")))
            if kq is None or ten in bo:
                continue
            H[i, j] = chuan_hoa(kq[0]); Dp[i, j] = np.nanmedian(kq[1])
    ref = nep(doc(anh)); Hr, Dr = chuan_hoa(ref[0]), float(np.nanmedian(ref[1]))
    best = (np.inf, None)
    for f in np.arange(-1, 1.0001, 0.05):
        for c in np.arange(-1, 1.0001, 0.05):
            fi, ci = (f + 1) * 2, (c + 1) * 2; i0, j0 = min(int(fi), 3), min(int(ci), 3); tf, tc = fi - i0, ci - j0
            q = [(i0, j0, (1 - tf) * (1 - tc)), (i0 + 1, j0, tf * (1 - tc)), (i0, j0 + 1, (1 - tf) * tc), (i0 + 1, j0 + 1, tf * tc)]
            if any(np.isnan(H[a, b]).all() for a, b, w in q if w > 0):
                continue
            h = sum(w * H[a, b] for a, b, w in q); d = sum(w * Dp[a, b] for a, b, w in q)
            # nếp mờ (một mí, mí sụp, nếp hẹp): độ cao nếp đo được chỉ là nhiễu → trọng số theo độ rõ của nếp ChatGPT
            e = float(np.nanmean(np.abs(h - Hr))) * mm * min(1.0, Dr / 0.04) + 3.0 * abs(d - Dr)
            if e < best[0]:
                best = (e, (round(f, 2), round(c, 2)), float(np.nanmean(np.abs(h - Hr))) * mm, d)
    e, (f, c), e_mm, d = best
    tg = {}
    for s in "lr":
        if f > 0.02: tg[f"eyes/{s}-eye-eyefold-up"] = f
        if f < -0.02: tg[f"eyes/{s}-eye-eyefold-down"] = -f
        if c > 0.02: tg[f"eyes/{s}-eye-eyefold-concave"] = c
        if c < -0.02: tg[f"eyes/{s}-eye-eyefold-convex"] = -c
    res = {"loai": "mi", "targets": tg, "fold": f, "cc": c, "lech_nep_mm": round(e_mm, 3), "do_sau_chatgpt": round(Dr, 4),
           "do_sau_dung": round(d, 4), "do_cao_nep_mm_chatgpt": round(float(np.nanmean(Hr)) * mm, 2), "nguon": anh}
    json.dump(res, open(ra, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("NEP_MI", json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
