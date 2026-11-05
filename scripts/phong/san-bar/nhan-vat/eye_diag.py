"""(hpc) Chẩn đoán vùng mắt: ghép thử từng phần (nhãn cầu/tròng, viền mi–kẻ, da mí trên, da dưới mắt) + đo dáng mắt.
python eye_diag.py <ảnh mẫu> <ảnh dựng> [--out thư mục]"""
import sys, os, cv2, numpy as np
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "part_swap.py"), encoding="utf-8").read().split("REG = {")[0]
exec(src)
mix = lambda A, B, m: (A * (1 - m[..., None]) + B * m[..., None]).astype(np.uint8)
LGw = (np.hstack([LG, np.ones((len(LG), 1))]) @ Mx.T)          # điểm ảnh dựng trong khung ảnh mẫu
OPEN = {"r": [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
        "l": [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]}
def poly(pts, grow=1.0, dy=0.0):
    c = pts.mean(0); return (c + (pts - c) * grow + np.array([0, dy])).astype(np.int32)
def m_of(f):
    m = np.zeros(P.shape[:2], np.float32)
    for s in "lr": f(m, s)
    return m
ew = np.mean([np.linalg.norm(LP[33] - LP[133]), np.linalg.norm(LP[263] - LP[362])])
def opening(m, s): cv2.fillPoly(m, [poly(LP[OPEN[s]], 1.0)], 1.0)
def ring(m, s):
    a = np.zeros_like(m); cv2.fillPoly(a, [poly(LP[OPEN[s]], 1.35)], 1.0); b = np.zeros_like(m); cv2.fillPoly(b, [poly(LP[OPEN[s]], 1.0)], 1.0)
    m += np.clip(a - b, 0, 1)
def upper(m, s):
    up = OPEN[s][:9]; pts = np.vstack([LP[up], LP[up][::-1] + np.array([0, -ew * 0.55])])
    cv2.fillPoly(m, [pts.astype(np.int32)], 1.0)
def lower(m, s):
    lo = [OPEN[s][0]] + OPEN[s][9:][::-1] + [OPEN[s][8]]; pts = np.vstack([LP[lo], LP[lo][::-1] + np.array([0, ew * 0.45])])
    cv2.fillPoly(m, [pts.astype(np.int32)], 1.0)
fP = feat(P); base = cos(feat(Gw), fP); print(f"gốc cos {base:.3f}")
for n, f in (("khe mắt (tròng + lòng trắng)", opening), ("viền mi + kẻ (vòng 1,0–1,35)", ring), ("da mí trên", upper), ("da dưới mắt", lower)):
    m = cv2.GaussianBlur(m_of(f), (0, 0), 3); A = mix(Gw, P, m); fa = feat(A)
    print(f"  {n:32s} {cos(fa, fP):.3f} ({cos(fa, fP) - base:+.3f})")
m = cv2.GaussianBlur(np.clip(m_of(opening) + m_of(ring) + m_of(upper) + m_of(lower), 0, 1), (0, 0), 3); fa = feat(mix(Gw, P, m))
print(f"  {'cả 4':32s} {cos(fa, fP):.3f} ({cos(fa, fP) - base:+.3f})")
mm = 30.0 / ew
for s, (o, i, t, b) in (("phải ảnh", (33, 133, 159, 145)), ("trái ảnh", (263, 362, 386, 374))):
    for nm, Lx in (("mẫu", LP), ("dựng", LGw)):
        w = np.linalg.norm(Lx[o] - Lx[i]) * mm; h = np.linalg.norm(Lx[t] - Lx[b]) * mm
        ang = np.degrees(np.arctan2(-(Lx[o][1] - Lx[i][1]), abs(Lx[o][0] - Lx[i][0])))
        print(f"  mắt {s} {nm}: rộng {w:.1f} mm, mở {h:.1f} mm, xếch {ang:+.1f}°, khoé trong ({Lx[i][0]:.0f},{Lx[i][1]:.0f}) ngoài ({Lx[o][0]:.0f},{Lx[o][1]:.0f})")
ir = lambda Lx, c, e: np.linalg.norm(Lx[c] - Lx[e])
print(f"  tròng (468→469 bán kính): mẫu {ir(LP, 468, 469) * mm:.1f} mm, dựng {ir(LGw, 468, 469) * mm:.1f} mm")
if "--out" in sys.argv:
    od = sys.argv[sys.argv.index("--out") + 1]; os.makedirs(od, exist_ok=True)
    x0, y0 = int(LP[[33, 263], 0].min() - ew * 0.6), int(LP[[159, 386], 1].min() - ew * 0.9); x1, y1 = int(LP[[33, 263], 0].max() + ew * 0.6), int(LP[[145, 374], 1].max() + ew * 0.7)
    cv2.imwrite(os.path.join(od, "eyes_cmp.png"), cv2.resize(np.vstack([Gw[y0:y1, x0:x1], P[y0:y1, x0:x1]]), None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
