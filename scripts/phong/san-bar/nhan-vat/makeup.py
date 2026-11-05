"""Trang điểm thành lớp phủ rời (bộ phận tái dùng): phấn mắt, hốc mắt, mí dưới, má hồng, tạo khối, bắt sáng, viền môi.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/makeup.py -- <head.glb> <ra.glb> <thư mục ortho> [--style <file .json>] [--save <thư mục>]

- Vị trí từng lớp tính từ điểm mốc của chính đầu đó (lm_ortho.json, ảnh chụp tượng chính diện) → dùng được cho mọi đầu.
- Ảnh trang điểm vẽ trong không gian ảnh chụp chính diện (ortho R×R); lớp phủ là bản sao vùng mặt của đầu, nổi lên 0,1 mm,
  UV = chiếu thẳng từ phía trước → ảnh khớp đúng chỗ.
- --style: màu + độ đậm từng lớp (mặc định = tông đỏ cam của model-1). --save: lưu từng lớp PNG + style.json vào thư viện.

Lưới gốc (quy trình chuẩn): <head> là file .blend của bake_to_base.py → nướng thẳng vào texture da (UV MakeHuman), ra .blend:
  blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/makeup.py -- <base.blend> <ra.blend> <ortho của lưới gốc> [--style ...]
  (<ortho> = base_head.py views + landmarks.py, kèm lm_photo.json của ảnh). Trước khi vẽ: vùng mắt + mày được làm sạch —
  lấy chi tiết da MakeHuman (mí, khoé mắt vẽ đúng cho UV này) nhân theo tông da xung quanh của ảnh. Có thêm lớp kẻ mắt.
"""
import gc
import json
import os
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, odir = argv[:3]
STYLE = {  # tên lớp: (màu RGB 0..1, độ đậm 0..1)
    "eyeshadow": ((0.70, 0.38, 0.30), 0.26),
    "crease": ((0.45, 0.25, 0.20), 0.14),
    "lower_lid": ((0.80, 0.35, 0.32), 0.22),
    "blush": ((0.95, 0.45, 0.45), 0.16),
    "contour": ((0.48, 0.30, 0.26), 0.14),
    "highlight": ((1.0, 0.96, 0.94), 0.16),
    "lip_liner": ((0.45, 0.06, 0.07), 0.30),
    "lip_gloss": ((1.0, 0.85, 0.85), 0.22),
    "brows": ((0.17, 0.115, 0.095), 1.0),
}
BASE = src.lower().endswith(".blend")             # lưới gốc: kẻ mắt vẽ vào texture (đầu Hunyuan có dải kẻ mắt rời của build_eyes)
if BASE:
    STYLE["liner"] = ((0.07, 0.045, 0.045), 0.85)
    STYLE["lower_liner"] = ((0.22, 0.12, 0.10), 0.55)
if "--style" in argv:
    STYLE.update({k: (tuple(v[0]), v[1]) for k, v in json.load(open(argv[argv.index("--style") + 1])).items()})
SAVE = argv[argv.index("--save") + 1] if "--save" in argv else None

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = {k: np.array(v) for k, v in json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"].items()}
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
RT = 2048                                          # độ phân giải ảnh trang điểm (toạ độ vẫn theo px ảnh ortho R)
K = RT / R
yy, xx = (np.mgrid[0:RT, 0:RT].astype(np.float32) + 0.5) / K   # ảnh: hàng 0 ở TRÊN (giống ảnh chụp)


def blob(c, rx, ry, ang=0.0, power=2.0):
    """Vệt mềm hình elip (gauss) tâm c, bán trục rx, ry (px), xoay ang (rad)."""
    ca, sa = np.cos(ang), np.sin(ang)
    dx, dy = xx - c[0], yy - c[1]
    u = (dx * ca + dy * sa) / rx; v = (-dx * sa + dy * ca) / ry
    return np.exp(-(u * u + v * v) ** (power / 2) * 1.5)


def along(pts, width, taper=(1, 1)):
    """Vệt mềm chạy theo đường gấp khúc pts (px), bề dày width (px), thon dần hai đầu theo taper."""
    m = np.zeros((RT, RT), np.float32)
    n = len(pts)
    for i in range(n - 1):
        for t in np.linspace(0, 1, 6, endpoint=False):
            p = pts[i] * (1 - t) + pts[i + 1] * t
            s = (i + t) / (n - 1)
            w = width * (taper[0] + (taper[1] - taper[0]) * s)
            m = np.maximum(m, blob(p, w, w))
    return m


def poly_fill(poly, X=None, Y=None):
    """1 trong đa giác poly (px), 0 ngoài — trên lưới (X, Y), mặc định lưới ảnh trang điểm."""
    X = xx if X is None else X; Y = yy if Y is None else Y
    inside = np.zeros(X.shape, bool); x0_, y0_ = poly[-1]
    for x1_, y1_ in poly:
        inside ^= ((y1_ > Y) != (y0_ > Y)) & (X < (x0_ - x1_) * (Y - y1_) / ((y0_ - y1_) + 1e-12) + x1_); x0_, y0_ = x1_, y1_
    return inside.astype(np.float32)


def box_blur(m, k, n=3):
    """Làm mờ ~gauss σ≈k (n lần box blur bán kính k px) cho ảnh 2D hoặc (h, w, c)."""
    k = max(int(k), 1)
    for _ in range(n):
        cs = np.cumsum(np.pad(m, ((0, 0), (k, k)) + ((0, 0),) * (m.ndim - 2), mode="edge"), 1); m = (cs[:, 2 * k:] - cs[:, :-2 * k]) / (2 * k)
        cs = np.cumsum(np.pad(m, ((k, k), (0, 0)) + ((0, 0),) * (m.ndim - 2), mode="edge"), 0); m = (cs[2 * k:] - cs[:-2 * k]) / (2 * k)
    return m


def to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.maximum(c, 0), 1 / 2.4) - 0.055)


def push_pull(C, w):
    """Lấp chỗ trống: trung bình có trọng số theo kim tự tháp (xuống: cộng 2×2, lên: chỗ thiếu lấy tầng thô hơn)."""
    lv = [(C * w[..., None], w.copy())]
    while min(lv[-1][1].shape) > 2:
        c, ww = lv[-1]; h, wd = ww.shape; h2, w2 = h + h % 2, wd + wd % 2
        c = np.pad(c, ((0, h2 - h), (0, w2 - wd), (0, 0))); ww = np.pad(ww, ((0, h2 - h), (0, w2 - wd)))
        lv.append((c.reshape(h2 // 2, 2, w2 // 2, 2, -1).sum((1, 3)), ww.reshape(h2 // 2, 2, w2 // 2, 2).sum((1, 3))))
    c, ww = lv[-1]; est = c / np.maximum(ww, 1e-8)[..., None]
    for c, ww in reversed(lv[:-1]):
        up_ = np.repeat(np.repeat(est, 2, 0), 2, 1)[:ww.shape[0], :ww.shape[1]]
        a = np.minimum(ww, 1)[..., None]
        est = c / np.maximum(ww, 1e-8)[..., None] * a + up_ * (1 - a)
    return est


def bilinear(img, x, y):
    """Lấy mẫu song tuyến img (h, w[, c]) tại toạ độ px thực (x cột, y hàng)."""
    H_, W_ = img.shape[:2]
    x = np.clip(x, 0, W_ - 1.001); y = np.clip(y, 0, H_ - 1.001)
    x0 = x.astype(int); y0 = y.astype(int); fx = x - x0; fy = y - y0
    if img.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    return (img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) + (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy


layers = {}
BROW_POLY = {}                                     # viền mày (ảnh ortho) — dùng cho vùng làm sạch của lưới gốc
ew = {s: np.linalg.norm(lm[f"eye_{s}_out"] - lm[f"eye_{s}_in"]) for s in "lr"}
E = (ew["l"] + ew["r"]) / 2                        # bề ngang mắt (px) → thước đo chung
for s in "lr":
    up = np.array([lm[f"lid_{s}_up_{i}"] for i in range(9)])
    out_dir = np.sign(lm[f"eye_{s}_out"][0] - lm[f"eye_{s}_in"][0])
    lift = np.array([0, -E * 0.22])
    # phấn mắt: dải trên mí, đậm dần ra đuôi, kéo dài theo đuôi kẻ mắt
    path = list(up + lift * np.linspace(0.6, 1.0, 9)[:, None]) + [up[-1] + np.array([out_dir * E * 0.35, -E * 0.32])]
    layers.setdefault("eyeshadow", np.zeros((RT, RT), np.float32))
    layers["eyeshadow"] = np.maximum(layers["eyeshadow"], along(np.array(path), E * 0.2, taper=(0.55, 1.15)))
    # hốc mắt: nếp mí, cao hơn, mảnh
    crease = up + np.array([0, -E * 0.42]) + np.array([[out_dir * E * 0.05 * i / 8, 0] for i in range(9)])
    layers.setdefault("crease", np.zeros((RT, RT), np.float32))
    layers["crease"] = np.maximum(layers["crease"], along(crease, E * 0.12, taper=(0.3, 1.0)))
    if "liner" in STYLE:
        # kẻ mắt: sát mép mí trên (lệch nhẹ vào lòng mắt — phần thừa bị mí che), dày dần ra đuôi, đuôi vút lên
        ln = up[1:] + np.array([0, E * 0.012])
        lw_ = E * STYLE.get("liner_width", ((0, 0, 0), 0.06))[1]
        tip = ln[-1] + np.array([out_dir * E * STYLE.get("liner_wing", ((0, 0, 0), 0.28))[1], -E * 0.12])
        m_ = np.maximum(along(ln, lw_, taper=(0.3, 1.0)), along(np.array([ln[-1], (ln[-1] + tip) / 2, tip]), lw_, taper=(1.0, 0.2)))
        layers["liner"] = np.maximum(layers.get("liner", np.zeros((RT, RT), np.float32)), m_)
        if "lower_liner" in STYLE:
            # kẻ mí dưới: nửa ngoài, sát chân mi dưới, đậm dần ra đuôi rồi chạm đuôi kẻ trên
            lo_ = np.array([lm[f"lid_{s}_lo_{i}"] for i in range(9)])[4:] + np.array([0, E * 0.015])
            path_ = np.vstack([lo_, [ln[-1] * 0.6 + tip * 0.4]])
            llw = E * STYLE.get("lower_liner_width", ((0, 0, 0), 0.035))[1]
            layers["lower_liner"] = np.maximum(layers.get("lower_liner", np.zeros((RT, RT), np.float32)), along(path_, llw, taper=(0.2, 1.0)))
    # mí dưới: ửng đỏ nửa ngoài (lower_lid_band = [từ mi, độ rộng, bắt đầu từ điểm mí thứ mấy] theo E; mặc định nửa ngoài, sát mi)
    off_, wid_, i0_ = STYLE.get("lower_lid_band", ((0.08, 0.1, 4), 0))[0]
    lo = np.array([lm[f"lid_{s}_lo_{i}"] for i in range(9)])[int(i0_):] + np.array([0, E * off_])
    layers.setdefault("lower_lid", np.zeros((RT, RT), np.float32))
    layers["lower_lid"] = np.maximum(layers["lower_lid"], along(lo, E * wid_, taper=(0.4, 1.0)))
    # má hồng: dưới đuôi mắt, chếch lên thái dương
    cheek = lm[f"eye_{s}_out"] + np.array([-out_dir * E * 0.05, E * 0.95])
    layers.setdefault("blush", np.zeros((RT, RT), np.float32))
    layers["blush"] = np.maximum(layers["blush"], blob(cheek, E * 0.75, E * 0.5, ang=-out_dir * 0.45))
    # tạo khối: dưới gò má (vệt chéo từ gần tai xuống khoé miệng) + viền hàm
    a = lm[f"eye_{s}_out"] + np.array([out_dir * E * 0.55, E * 1.1]); b = lm["mouth_" + s] + np.array([out_dir * E * 0.45, -E * 0.25])
    layers.setdefault("contour", np.zeros((RT, RT), np.float32))
    layers["contour"] = np.maximum(layers["contour"], along(np.array([a, (a + b) / 2, b]), E * 0.22, taper=(1.0, 0.4)))
    if f"jaw_{s}" in lm:
        layers["contour"] = np.maximum(layers["contour"], blob(lm[f"jaw_{s}"], E * 0.5, E * 0.25, ang=out_dir * 0.7) * 0.7)
    # bắt sáng: đỉnh gò má
    layers.setdefault("highlight", np.zeros((RT, RT), np.float32))
    layers["highlight"] = np.maximum(layers["highlight"], blob(lm[f"eye_{s}_out"] + np.array([-out_dir * E * 0.15, E * 0.6]), E * 0.4, E * 0.15, ang=-out_dir * 0.35))
# tạo khối hai bên sống mũi
for s in "lr":
    side = lm[f"nostril_{s}"] + np.array([np.sign(lm[f"nostril_{s}"][0] - lm["nose_tip"][0]) * E * 0.12, 0])
    top = lm[f"eye_{s}_in"] + np.array([np.sign(lm[f"eye_{s}_in"][0] - lm["nose_tip"][0]) * -E * 0.05, E * 0.2])
    layers["contour"] = np.maximum(layers["contour"], along(np.array([top, side]), E * 0.08, taper=(1.0, 0.6)) * 0.8)
# bắt sáng: sống mũi + cung môi trên
bridge_top = (lm["eye_l_in"] + lm["eye_r_in"]) / 2
layers["highlight"] = np.maximum(layers["highlight"], along(np.array([bridge_top, lm["nose_tip"] - np.array([0, E * 0.1])]), E * 0.06, taper=(0.6, 1.0)))
if "lip_top" in lm:
    layers["highlight"] = np.maximum(layers["highlight"], blob(lm["lip_top"] - np.array([0, E * 0.06]), E * 0.12, E * 0.05) * 0.8)
# viền môi + bóng môi
lip_ring = [lm["mouth_r"]] + [lm[f"lipo_top_{i}"] for i in range(8)] + [lm["mouth_l"]] + [lm[f"lipo_bot_{i}"] for i in range(7, -1, -1)] + [lm["mouth_r"]]
layers["lip_liner"] = along(np.array(lip_ring), E * 0.035)
if "lip_seam" in STYLE and "lip_mid_top" in lm:
    # khe môi: đường tối từ khoé qua giữa môi (ảnh có đường này; trên lưới chỗ khe nhìn chéo nên ảnh không chiếu tới → vạch sáng)
    mid = (lm["lip_mid_top"] + lm["lip_mid_bot"]) / 2
    seam = [lm["mouth_r"] * (1 - t) ** 2 + (2 * mid - (lm["mouth_r"] + lm["mouth_l"]) / 2) * 2 * t * (1 - t) + lm["mouth_l"] * t * t
            for t in np.linspace(0, 1, 13)]
    layers["lip_seam"] = along(np.array(seam), E * 0.035, taper=(0.5, 0.5))
if "lip_mid_bot" in lm:
    layers["lip_gloss"] = blob((lm["lip_mid_bot"] + lm["lip_bot"]) / 2, E * 0.22, E * 0.06)

# ---------- lông mày ----------
# Cách 1 (chuẩn): tách mày từ ảnh mẫu (--photo) hoặc nạp bộ phận mày đã tách (--brow-shape <thư mục>). Mày lưu trong khung
#   chuẩn của từng bên: gốc = khoé mắt trong, trục u = trục ngang mặt (hướng ra ngoài), v = lên trên, đơn vị = bề ngang mắt
#   → đặt lên đầu nào cũng đúng chỗ so với mắt. Độ đậm từng px = độ tối so với da quanh mày (giữ đúng dáng, độ mờ đầu mày).
# Cách 2 (dự phòng): vẽ từng sợi theo viền mày của ảnh / file viền .json.
lp_all = json.load(open(os.path.join(odir, "lm_photo.json")))
FRONT = argv[argv.index("--front") + 1] if "--front" in argv else "face-01-front.png"
PHOTO = argv[argv.index("--photo") + 1] if "--photo" in argv else None
BROW_USE = argv[argv.index("--brow-shape") + 1] if "--brow-shape" in argv else None
BROW_SAVE = argv[argv.index("--save-brow") + 1] if "--save-brow" in argv else None
EAR_TINT = np.array([float(v) for v in (argv[argv.index("--ear-tint") + 1] if "--ear-tint" in argv else "1,0.95,0.93").split(",")], np.float32)
EAR_SHADE = float(argv[argv.index("--ear-shade") + 1]) if "--ear-shade" in argv else 0.6     # 1 = khối vành tai MakeHuman nguyên độ
BU0, BU1, BV0, BV1, BPX = -0.5, 1.6, 0.05, 1.5, 200      # khung chuẩn của mày (đơn vị bề ngang mắt), px mỗi đơn vị


def brow_frame(L, sd):
    """(gốc, trục u, trục v, bề ngang mắt) của khung mày bên sd theo điểm mốc L (px ảnh, hàng 0 ở trên)."""
    ax = (L["eye_l_in"] + L["eye_l_out"]) / 2 - (L["eye_r_in"] + L["eye_r_out"]) / 2; ax = ax / np.linalg.norm(ax)
    ex = ax if sd == "l" else -ax
    ey = np.array([ax[1], -ax[0]])                           # vuông góc trục ngang, hướng lên (y ảnh hướng xuống)
    return L[f"eye_{sd}_in"], ex, ey, np.linalg.norm(L[f"eye_{sd}_out"] - L[f"eye_{sd}_in"])


def brow_from_photo(path, L):
    """Tách mày từ ảnh: độ đậm = (da quanh mày − ảnh) / (da − màu mày), chỉ trong viền mày (điểm mốc) nới rộng."""
    im = bpy.data.images.load(path); W_, H_ = im.size
    P = to_lin(np.array(im.pixels[:], np.float32).reshape(H_, W_, 4)[::-1, :, :3])
    gu, gv = np.meshgrid(np.arange(BU0, BU1, 1 / BPX), np.arange(BV1, BV0, -1 / BPX))
    gj, gi = np.meshgrid(np.arange(gu.shape[1], dtype=np.float32), np.arange(gu.shape[0], dtype=np.float32))
    lum = lambda c: c @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    part = {"alpha": {}, "poly": {}}; cols = []
    for sd in "lr":
        o, ex, ey, Lw = brow_frame(L, sd)
        C = bilinear(P, o[0] + (gu * ex[0] + gv * ey[0]) * Lw, o[1] + (gu * ex[1] + gv * ey[1]) * Lw)
        q = lambda p: [(np.asarray(p) - o) @ ex / Lw, (np.asarray(p) - o) @ ey / Lw]
        poly = np.array([q(L[f"brow_{sd}_up_{i}"]) for i in range(5)] + [q(L[f"brow_{sd}_lo_{i}"]) for i in range(4, -1, -1)])
        ins = poly_fill(np.stack([(poly[:, 0] - BU0) * BPX, (BV1 - poly[:, 1]) * BPX], 1), gj, gi)
        grow = lambda m, d: (box_blur(m, d / 2.5 * BPX) > 0.01).astype(np.float32)   # nới ~d (đơn vị bề ngang mắt)
        # viền điểm mốc chỉ là gợi ý (MediaPipe hay hụt mép mày) → nới rộng, để độ tối của ảnh tự quyết đâu là mày;
        # vẫn cách xa nếp mí / chân mi (thấp hơn mày ≥ 0,3)
        region = box_blur(grow(ins, 0.06), 0.015 * BPX)
        srcw = 1 - grow(ins, 0.16)                                                # da quanh mày
        S = box_blur(push_pull(C, srcw), 0.04 * BPX)
        dk = 1 - lum(C) / np.maximum(lum(S), 1e-4)
        # màu mày = trung vị 25 % tối nhất (lấy 5 % tối nhất thì độ đậm phần còn lại tụt → mày vỡ thành mảng)
        sel = (ins > 0.5) & (dk >= np.percentile(dk[ins > 0.5], 75))
        Cb = np.median(C[sel], 0); cols.append(Cb)
        a = np.clip((lum(S) - lum(C)) / np.maximum(lum(S) - lum(Cb), 1e-4), 0, 1)
        part["alpha"][sd] = (box_blur(np.clip((a - 0.05) / 0.95, 0, 1), 0.006 * BPX, n=1) * region).astype(np.float32)
        part["poly"][sd] = poly
    part["color"] = to_srgb(np.mean(cols, 0))
    return part


def brow_load(d):
    meta_ = json.load(open(os.path.join(d, "brow.json")))
    part = {"color": np.array(meta_["color"]), "poly": {s: np.array(p) for s, p in meta_["poly"].items()}, "alpha": {}}
    for sd in "lr":
        im = bpy.data.images.load(os.path.join(d, f"brow_{sd}.png")); W_, H_ = im.size
        part["alpha"][sd] = np.array(im.pixels[:], np.float32).reshape(H_, W_, 4)[::-1, :, 0].copy()
    return part


def brow_save(part, d):
    os.makedirs(d, exist_ok=True)
    for sd in "lr":
        A = part["alpha"][sd]; im = bpy.data.images.new("brow_" + sd, A.shape[1], A.shape[0])
        im.pixels[:] = np.dstack([A, A, A, np.ones_like(A)])[::-1].astype(np.float32).ravel()
        im.filepath_raw = os.path.join(d, f"brow_{sd}.png"); im.file_format = "PNG"; im.save()
    json.dump({"color": [round(float(c), 4) for c in part["color"]], "poly": {s: p.round(4).tolist() for s, p in part["poly"].items()},
               "frame": {"u": [BU0, BU1], "v": [BV0, BV1], "px_per_unit": BPX},
               "note": "độ đậm mày (brow_l/r.png) trong khung chuẩn: gốc = khoé mắt trong, u = trục ngang mặt hướng ra ngoài, "
                       "v = lên trên, đơn vị = bề ngang mắt; poly = viền mày (5 điểm trên rồi 5 điểm dưới) cùng khung"},
              open(os.path.join(d, "brow.json"), "w", encoding="utf-8"), indent=1)
    print("SAVED BROW", d)


brow_part = None
if BROW_USE and os.path.isdir(BROW_USE):
    brow_part = brow_load(BROW_USE)
elif PHOTO and FRONT in lp_all:
    brow_part = brow_from_photo(PHOTO, {k: np.array(v) for k, v in lp_all[FRONT].items()})
if brow_part:
    if BROW_SAVE:
        brow_save(brow_part, BROW_SAVE)
    brow = np.zeros((RT, RT), np.float32)
    for sd in "lr":
        o, ex, ey, Lw = brow_frame(lm, sd)
        u = ((xx - o[0]) * ex[0] + (yy - o[1]) * ex[1]) / Lw; v = ((xx - o[0]) * ey[0] + (yy - o[1]) * ey[1]) / Lw
        A = brow_part["alpha"][sd]; gj_, gi_ = (u - BU0) * BPX, (BV1 - v) * BPX
        ok = (gj_ >= 0) & (gj_ < A.shape[1] - 1) & (gi_ >= 0) & (gi_ < A.shape[0] - 1)
        brow = np.maximum(brow, np.where(ok, bilinear(A, gj_, gi_), 0))
        p_ = brow_part["poly"][sd]; BROW_POLY[sd] = o + (p_[:, :1] * ex + p_[:, 1:] * ey) * Lw
    layers["brows"] = brow
    STYLE["brows"] = (tuple(brow_part["color"]), 1.0)
    print("BROWS từ", BROW_USE or PHOTO, "màu", np.round(brow_part["color"], 3))
elif FRONT in lp_all or BROW_USE:
    lpf = {k: np.array(v) for k, v in lp_all.get(FRONT, {}).items()}
    anchors = [k for k in ("eye_l_in", "eye_l_out", "eye_r_in", "eye_r_out", "nose_tip", "mouth_l", "mouth_r") if k in lm and k in lpf]
    if anchors:
        A = np.array([lpf[k] for k in anchors]); Bm = np.array([lm[k] for k in anchors])
        Ac, Bc = A - A.mean(0), Bm - Bm.mean(0)
        sim_s = np.sqrt((Bc ** 2).sum() / (Ac ** 2).sum()); photo_to_m = lambda p: (np.asarray(p) - A.mean(0)) * sim_s + Bm.mean(0)
    rng = np.random.default_rng(11)
    brow = np.zeros((RT, RT), np.float32)
    brow_lib = json.load(open(BROW_USE)) if BROW_USE else None
    brow_out = {}
    for sd in "lr":
        a_, b_ = lm[f"eye_{sd}_in"], lm[f"eye_{sd}_out"]
        ex = (b_ - a_) / np.linalg.norm(b_ - a_); ey = np.array([ex[1], -ex[0]])   # ey: lên trên (ảnh y hướng xuống)
        if ey[1] > 0: ey = -ey
        Lw = np.linalg.norm(b_ - a_)
        if brow_lib:
            loc = np.array(brow_lib["contour"]); up = a_ + (loc[:5, :1] * ex + loc[:5, 1:] * ey) * Lw; lo_ = a_ + (loc[5:, :1] * ex + loc[5:, 1:] * ey) * Lw
        else:
            up = np.array([photo_to_m(lpf[f"brow_{sd}_up_{i}"]) for i in range(5)])
            lo_ = np.array([photo_to_m(lpf[f"brow_{sd}_lo_{i}"]) for i in range(5)])
            q = np.vstack([up, lo_]) - a_
            brow_out[sd] = np.stack([q @ ex / Lw, q @ ey / Lw], 1)
        # nền phấn mày: đa giác viền trên + viền dưới, mờ mép, đuôi nhạt dần
        poly_b = np.vstack([up, lo_[::-1]])
        BROW_POLY[sd] = poly_b
        inside_b = np.zeros(xx.shape, bool); x0_, y0_ = poly_b[-1]
        for x1_, y1_ in poly_b:
            inside_b ^= ((y1_ > yy) != (y0_ > yy)) & (xx < (x0_ - x1_) * (yy - y1_) / ((y0_ - y1_) + 1e-12) + x1_); x0_, y0_ = x1_, y1_
        base = inside_b.astype(np.float32)
        for _ in range(3):  # làm mờ mép (3 lần box blur ~ gauss)
            k_ = int(K * 3)
            cs = np.cumsum(np.pad(base, ((0, 0), (k_, k_)), mode="edge"), 1); base = (cs[:, 2 * k_:] - cs[:, :-2 * k_]) / (2 * k_)
            cs = np.cumsum(np.pad(base, ((k_, k_), (0, 0)), mode="edge"), 0); base = (cs[2 * k_:] - cs[:-2 * k_]) / (2 * k_)
        tpos = np.clip(((xx - up[0, 0]) * np.sign(up[-1, 0] - up[0, 0])) / abs(up[-1, 0] - up[0, 0]), 0, 1)
        brow = np.maximum(brow, base * STYLE.get("brow_fill", ((0, 0, 0), 0.62))[1] * (1 - 0.35 * tpos) * (0.55 + 0.45 * np.clip(tpos / 0.18, 0, 1)))
        mid = (up + lo_) / 2; thick = np.linalg.norm(up - lo_, axis=1)
        n_str = int(STYLE.get("brow_density", ((0, 0, 0), 900))[1]) if isinstance(STYLE.get("brow_density"), tuple) else 900
        for _ in range(n_str):
            t = rng.uniform(0, 1) ** 0.9; w = rng.uniform(-0.5, 0.5)
            i0 = min(int(t * 4), 3); f = t * 4 - i0
            c = mid[i0] * (1 - f) + mid[i0 + 1] * f; th = thick[i0] * (1 - f) + thick[i0 + 1] * f
            nrm = up[i0] * (1 - f) + up[i0 + 1] * f - c; nrm = nrm / (np.linalg.norm(nrm) + 1e-9)
            tang = mid[min(i0 + 1, 4)] - mid[i0]; tang = tang / (np.linalg.norm(tang) + 1e-9)
            th_t = th * (1 - 0.55 * max(0, t - 0.6) / 0.4)                       # đuôi mày thon lại
            p0 = c + nrm * (w * th_t * 0.8)
            # chiều sợi: đầu mày dựng lên, thân mày xuôi theo dáng, nửa trên chúc xuống nhẹ
            ang_mix = np.clip(1 - t / 0.2, 0, 1) * 0.8
            d = tang * (1 - ang_mix) + nrm * ang_mix * 1.1 + nrm * (-0.35 * w) + nrm * 0.12
            d = d / (np.linalg.norm(d) + 1e-9)
            L = th * rng.uniform(0.45, 0.8) * (0.7 + 0.5 * ang_mix)
            for k_ in range(14):
                u_ = k_ / 13
                p_ = p0 + d * L * u_
                X, Y = int(p_[0] * K), int(p_[1] * K)
                if 1 <= X < RT - 1 and 1 <= Y < RT - 1:
                    a_px = 0.95 * (1 - 0.45 * u_) * (0.6 + 0.4 * (1 - abs(w) * 1.6))
                    brow[Y, X] = max(brow[Y, X], a_px); brow[Y, X + 1] = max(brow[Y, X + 1], a_px * 0.6)
    # làm mềm nhẹ (box blur 3x3) cho sợi mịn
    b2 = brow.copy()
    b2[1:-1, 1:-1] = (brow[1:-1, 1:-1] * 4 + brow[:-2, 1:-1] + brow[2:, 1:-1] + brow[1:-1, :-2] + brow[1:-1, 2:]) / 8
    layers["brows"] = np.maximum(brow, b2 * 0.9)
    if BROW_SAVE and brow_out:
        os.makedirs(os.path.dirname(BROW_SAVE), exist_ok=True)
        json.dump({"contour": ((brow_out["l"] + brow_out["r"]) / 2).round(4).tolist(),
                   "note": "chuẩn hoá theo khoé trong (0,0) → khoé ngoài (1,0) của mắt cùng bên; 5 điểm viền trên rồi 5 điểm viền dưới"},
                  open(BROW_SAVE, "w", encoding="utf-8"), indent=1)
        print("SAVED BROW", BROW_SAVE)

# ---------- ghép các lớp thành một ảnh RGBA ----------
rgb = np.zeros((RT, RT, 3), np.float32); alpha = np.zeros((RT, RT), np.float32)
for name, m in layers.items():
    col, op = STYLE[name]
    a_ = np.clip(m, 0, 1) * op
    rgb = rgb * (1 - a_[..., None]) + np.array(col)[None, None] * a_[..., None]   # chồng lớp kiểu "over"
    alpha = alpha + a_ * (1 - alpha)
rgb = np.where(alpha[..., None] > 1e-4, rgb / np.maximum(alpha[..., None], 1e-4) * 1.0, 0)
rgb = np.clip(rgb, 0, 1)


def to_image(name, rgb_, a_):
    img = bpy.data.images.new(name, RT, RT, alpha=True)
    px = np.dstack([rgb_, a_[..., None]])[::-1]          # Blender: hàng 0 ở dưới
    img.pixels[:] = px.astype(np.float32).ravel()
    return img


comp = to_image("makeup", rgb, alpha); comp.pack()
if SAVE:
    os.makedirs(SAVE, exist_ok=True)
    for name, m in layers.items():
        col, op = STYLE[name]
        im = to_image(name, np.broadcast_to(np.array(col), (RT, RT, 3)), np.clip(m, 0, 1) * op)
        im.filepath_raw = os.path.join(SAVE, f"{name}.png"); im.file_format = "PNG"; im.save()
    json.dump({k: [list(v[0]), v[1]] for k, v in STYLE.items()}, open(os.path.join(SAVE, "style.json"), "w"), indent=1)
    print("SAVED", SAVE)

def clean_mask():
    """Vùng làm sạch (ảnh ortho RT) → (mắt, mày). Mắt: quanh mí tới nếp mí, đuôi mắt. Mày: mày của ảnh lẫn của lưới
    (nới rộng) + giữa hai đầu mày."""
    me_ = np.zeros((RT, RT), np.float32); mb_ = np.zeros((RT, RT), np.float32)
    for s in "lr":
        up = np.array([lm[f"lid_{s}_up_{i}"] for i in range(9)]); lo = np.array([lm[f"lid_{s}_lo_{i}"] for i in range(9)])
        od = np.sign(lm[f"eye_{s}_out"][0] - lm[f"eye_{s}_in"][0])
        # tới nếp mí, ra quá đuôi mắt, xuống hết quầng thâm dưới mắt (tượng Hunyuan hay tô cả vòng nâu quanh mắt)
        a = lm[f"eye_{s}_in"] + np.array([-od * E * 0.25, 0]); b = lm[f"eye_{s}_out"] + np.array([od * E * 0.5, -E * 0.1])
        low = lo + np.array([[0, E * (0.52 - 0.1 * i / 8)] for i in range(9)])          # phía khoé trong xuống sâu hơn
        me_ = np.maximum(me_, poly_fill(np.vstack([[a], up + np.array([0, -E * 0.5]), [b], low[::-1]])))
        bp = [BROW_POLY[s]] if s in BROW_POLY else []
        if all(f"brow_{s}_up_{i}" in lm for i in range(5)):
            bp.append(np.vstack([[lm[f"brow_{s}_up_{i}"] for i in range(5)], [lm[f"brow_{s}_lo_{i}"] for i in range(4, -1, -1)]]))
        for p_ in bp:
            mb_ = np.maximum(mb_, (box_blur(poly_fill(p_), E * 0.12 * K) > 0.06).astype(np.float32))
    if all(s in BROW_POLY for s in "lr"):
        hl, hr = BROW_POLY["l"][0], BROW_POLY["r"][0]
        mb_ = np.maximum(mb_, blob((hl + hr) / 2, np.linalg.norm(hl - hr) * 0.55, E * 0.3) > 0.3)
    soft = lambda m: np.clip(box_blur(m, E * 0.12 * K) * 1.3, 0, 1)
    return soft(me_), soft(mb_)


def bake_base(blend, out_blend):
    """Lưới gốc: làm sạch vùng mắt + mày rồi nướng các lớp trang điểm vào texture da (UV MakeHuman)."""
    bpy.ops.wm.open_mainfile(filepath=blend)
    body = bpy.data.objects["Body"]
    col_img = next(n.image for m_ in body.data.materials for n in m_.node_tree.nodes
                   if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("body_color"))
    T = col_img.size[0]
    sk_path = argv[argv.index("--base-skin") + 1] if "--base-skin" in argv else os.path.join(
        bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data"),
        "skins", "young_asian_female", "young_lightskinned_female_diffuse3.png")
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 1; scn.render.bake.margin = 2

    def pixels(img):
        a = np.empty(img.size[0] * img.size[1] * 4, np.float32); img.pixels.foreach_get(a)
        return a.reshape(img.size[1], img.size[0], 4)                       # hàng 0 = đáy

    def bake_emit(name, color_socket):
        """Nướng EMIT chính Body vào ảnh float (UV MakeHuman); color_socket(nt) trả về ổ màu cần nướng."""
        img = bpy.data.images.new("bk_" + name, T, T, alpha=False, float_buffer=True)
        m_ = bpy.data.materials.new("bk"); m_.use_nodes = True; nt = m_.node_tree; nt.nodes.clear()
        em = nt.nodes.new("ShaderNodeEmission"); o = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(color_socket(nt), em.inputs["Color"]); nt.links.new(em.outputs[0], o.inputs["Surface"])
        tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; nt.nodes.active = tn
        saved = list(body.data.materials)
        for i in range(len(saved)):
            body.data.materials[i] = m_
        bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
        bpy.ops.object.bake(type="EMIT")
        for i, mm in enumerate(saved):
            body.data.materials[i] = mm
        return pixels(img)[..., :3]

    def geo(socket):          # toạ độ / pháp tuyến thế giới của từng texel (cộng 10 cho khỏi âm)
        def f(nt):
            g = nt.nodes.new("ShaderNodeNewGeometry"); add = nt.nodes.new("ShaderNodeVectorMath"); add.inputs[1].default_value = (10, 10, 10)
            nt.links.new(g.outputs[socket], add.inputs[0]); return add.outputs[0]
        return bake_emit(socket, f) - 10

    def vgroup(name):         # trọng số nhóm đỉnh MakeHuman (vd. "ears") → ảnh UV
        gi = body.vertex_groups[name].index
        w = np.array([max([g.weight for g in v.groups if g.group == gi], default=0.0) for v in body.data.vertices], np.float32)
        ca = body.data.color_attributes.new("vg_" + name, "FLOAT_COLOR", "POINT"); ca.data.foreach_set("color", np.repeat(w, 4))

        def f(nt):
            n = nt.nodes.new("ShaderNodeVertexColor"); n.layer_name = "vg_" + name; return n.outputs["Color"]
        return bake_emit("vg_" + name, f)[..., 0]

    POS = geo("Position"); NRM = geo("Normal")
    EAR = vgroup("ears") if "ears" in body.vertex_groups else None
    valid = POS[..., 2] > -5
    pxo = (POS[..., 0] - cu) / sc * R + R / 2; pyo = R / 2 - (POS[..., 2] - cv) / sc * R
    inr = valid & (pxo >= 0) & (pxo < R - 1) & (pyo >= 0) & (pyo < R - 1) & (NRM[..., 1] < 0.25)
    # cổ + mặt dưới hàm: dưới mặt phẳng qua cằm, chếch lên về phía sau (dốc 0,5 ~ đường hàm nhìn nghiêng). Tượng Hunyuan hay
    # in bóng trang sức cổ (vòng cổ của ảnh) + loang trắng ở đây → làm sạch hết, chỉ giữ chi tiết da MakeHuman.
    zc = cv + (R / 2 - lm["chin"][1]) * sc / R
    near_c = inr & (np.abs(pxo - lm["chin"][0]) < 6) & (np.abs(pyo - lm["chin"][1]) < 6)
    yc = POS[..., 1][near_c].min()
    NECK = valid * np.clip((zc + 0.004 + 0.5 * (POS[..., 1] - yc) - POS[..., 2]) / 0.012, 0, 1) \
        * np.clip((POS[..., 2] - (zc - 0.13)) / 0.03, 0, 1)                   # chỉ cổ: tới ~10 cm dưới cằm, hoà mềm xuống ngực
    ys, xs = np.where(inr | (NECK > 0))
    y0, y1, x0, x1 = max(ys.min() - 64, 0), min(ys.max() + 64, T), max(xs.min() - 64, 0), min(xs.max() + 64, T)
    cr = (slice(y0, y1), slice(x0, x1))                                       # chỉ xử lý khung UV của mặt + cổ
    pxo, pyo, ny, valid, inr, NECK = pxo[cr], pyo[cr], NRM[cr][..., 1], valid[cr], inr[cr], NECK[cr]
    Xi = np.clip((pxo * K).astype(int), 0, RT - 1); Yi = np.clip((pyo * K).astype(int), 0, RT - 1)
    samp = lambda im2: np.where(inr if im2.ndim == 2 else inr[..., None], im2[Yi, Xi], 0)

    CP = pixels(col_img); Cl = to_lin(CP[cr][..., :3])
    sk = bpy.data.images.load(sk_path)
    if sk.size[0] != T:
        sk.scale(T, T)
    SKl = to_lin(pixels(sk)[cr][..., :3])

    # 0) khử vệt mảnh, đốm tối nhỏ (sợi mi/mày sót trong ảnh, đường nối texture Hunyuan): lọc đóng (giãn → co) bán kính
    #    ~3 texel, chừa vùng môi (đường khép môi cũng mảnh và tối)
    rr = max(1, int(round(T / 4096 * 5)))                                  # ~1,6 mm: chấm sót cạnh mũi to ~1,5–2 mm

    def shift_stack(A, op):
        out_ = A.copy()
        for dy in range(-rr, rr + 1):
            for dx in range(-rr, rr + 1):
                out_ = op(out_, np.roll(np.roll(A, dy, 0), dx, 1))
        return out_
    lip_ring = np.array([lm["mouth_r"]] + [lm[f"lipo_top_{i}"] for i in range(8)] + [lm["mouth_l"]] + [lm[f"lipo_bot_{i}"] for i in range(7, -1, -1)])
    lc = lip_ring.mean(0)
    m_lip = np.clip(box_blur(poly_fill(lc + (lip_ring - lc) * 1.35), E * 0.05 * K) * 1.5, 0, 1)
    Mlip = samp(m_lip)
    closed = shift_stack(shift_stack(Cl, np.maximum), np.minimum)
    md = np.clip((-ny + 0.3) / 0.3, 0, 1) * inr * (1 - Mlip)
    print("DESPECKLE texels", int(((closed - Cl).max(-1) * md > 0.02).sum()))
    Cl = Cl + (closed - Cl) * md[..., None]
    opened = shift_stack(shift_stack(Cl, np.minimum), np.maximum)             # đốm sáng nhỏ (chấm bóng lấm tấm sống mũi)
    Cl = Cl + (opened - Cl) * md[..., None]
    del closed, opened; gc.collect()                                           # khung mặt + cổ gần cỡ cả texture → tiết kiệm RAM

    # 0b) da đều màu: bỏ mảng loang cỡ 3–15 mm của texture tượng (vòng nâu sót quanh mắt, quầng sáng quanh mày, vệt sáng
    #     sống mũi) = nhân tỉ số (mờ rộng / mờ hẹp); giữ chi tiết mịn (< 3 mm) và tông lớn. Chừa môi, lỗ mũi.
    P_ = POS[cr]
    dpx = np.linalg.norm(P_[:, 1:] - P_[:, :-1], axis=-1)
    mpt = float(np.median(dpx[valid[:, 1:] & valid[:, :-1] & (dpx < 0.01)]))        # m mỗi texel
    m_nos = np.maximum(blob(lm["nostril_l"], E * 0.13, E * 0.09), blob(lm["nostril_r"], E * 0.13, E * 0.09))
    wE = (valid * (1 - Mlip) * (1 - np.clip(samp(m_nos) * 1.5, 0, 1))).astype(np.float32)
    wblur = lambda C_, r: box_blur(C_ * wE[..., None], r) / np.maximum(box_blur(wE, r), 1e-4)[..., None]
    ratio = np.clip(wblur(Cl, 0.015 / mpt) / np.maximum(wblur(Cl, 0.003 / mpt), 1e-5), 0.7, 1.4)
    Cl = (Cl * (1 + (ratio - 1) * wE[..., None])).astype(np.float32)
    print("EVEN mm/texel %.3f" % (mpt * 1000), "texels đổi >5%", int((np.abs(ratio - 1).max(-1) * wE > 0.05).sum()))
    del ratio; gc.collect()

    m_eye, m_brow = clean_mask()
    Me = samp(m_eye) * np.clip((-ny + 0.25) / 0.3, 0, 1); Mb = samp(m_brow) * np.clip((-ny + 0.25) / 0.3, 0, 1)
    # vòng da quanh tai (khoảng cách 3D tới đỉnh tai ≤ --ear-ring, mặc định 3,5 cm, mờ thêm 1 cm): tai trong ảnh nằm lùi sau hơn tai lưới → chiếu
    # ảnh nghiêng in "bóng ma" vành tai thành vệt sọc trên da đầu sau tai (model-1, người dùng chỉ ra) → không lấy ảnh, lấp da
    # xung quanh. Tính trên khoảng cách 3D (đảo UV tai tách khỏi da đầu, làm mờ trong UV không với tới).
    Mring = np.zeros_like(Me)
    if EAR is not None and "--no-ear-ring" not in argv:
        gi_ = body.vertex_groups["ears"].index
        EV = np.array([tuple(body.matrix_world @ v.co) for v in body.data.vertices
                       if any(g.group == gi_ and g.weight > 0.5 for g in v.groups)], np.float32)
        P3 = POS[cr].astype(np.float32); cand = valid & (np.abs(P3[..., 0]) > 0.04) & (P3[..., 2] > EV[:, 2].min() - 0.03) \
            & (P3[..., 2] < EV[:, 2].max() + 0.03)
        ii = np.argwhere(cand); dmin = np.full(len(ii), 9.0, np.float32)
        for c0 in range(0, len(ii), 20000):
            q = P3[ii[c0:c0 + 20000, 0], ii[c0:c0 + 20000, 1]]
            dmin[c0:c0 + 20000] = np.sqrt(((q[:, None] - EV[None]) ** 2).sum(-1)).min(1)
        RING_ = float(argv[argv.index("--ear-ring") + 1]) if "--ear-ring" in argv else 0.035   # 2,2 cm chưa đủ (model-1)
        Mring[ii[:, 0], ii[:, 1]] = np.clip((RING_ + 0.01 - dmin) / 0.01, 0, 1)
        del P3, ii, dmin; gc.collect()
        print("EAR RING texel", int((Mring > 0.5).sum()))

    # 0c) chiếu thẳng ảnh mẫu đã xoá mi (photo_project.py): da, má hồng, môi, tạo khối của chính ảnh, khử ánh sáng,
    #     khớp tông lớn (σ 25 mm) với texture hiện có. Vùng mắt, mày, cổ, tai vẫn làm sạch ở bước 1.
    if "--photos" in argv:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import photo_project
        views = [(int(v.split(":")[0]), v.split(":")[1]) for v in argv[argv.index("--views") + 1].split(",")]
        lum_ = lambda c: c @ np.array([0.2126, 0.7152, 0.0722], np.float32)

        def load_image(p):
            im = bpy.data.images.load(p); W_, H_ = im.size
            a_ = np.empty(W_ * H_ * 4, np.float32); im.pixels.foreach_get(a_); a_ = a_.reshape(H_, W_, 4)[::-1].copy()
            a_[..., :3] = to_lin(a_[..., :3]); return a_
        head_ = valid & (POS[cr][..., 2] > zc - 0.05)                         # chỉ vùng đầu (đỡ RAM: khung còn gồm cả cổ, thân)
        A_, Wp = photo_project.project(POS[cr], NRM[cr], head_, argv[argv.index("--photos") + 1], views,
                                       argv[argv.index("--view-ortho") + 1], lp_all, load_image,
                                       exclude=np.maximum(np.maximum(np.maximum(Mlip, Me), Mb), Mring))
        Wp = np.clip(box_blur(Wp, 0.008 / mpt), 0, 1) * valid                  # mép hoà ~1 cm
        # ảnh sạch: vùng mắt + mày là mảng mờ xám nâu, rộng hơn vùng làm sạch → không lấy ảnh ở mắt, mày nới thêm ~6 mm
        # (lấy thì bước làm sạch lấp bằng chính màu xám ở viền → mảng xám từ mày xuống mí)
        keep_out = np.clip(box_blur((np.maximum(Me, Mb) > 0.05).astype(np.float32), 0.002 / mpt) * 3, 0, 1)
        keep_out = np.clip(box_blur((keep_out > 0.02).astype(np.float32), 0.004 / mpt) * 1.5, 0, 1)
        Wp = Wp * (1 - keep_out)
        bw = lambda C_, w_, r: box_blur(C_ * w_[..., None], r) / np.maximum(box_blur(w_, r), 1e-4)[..., None]
        A_ = A_ * np.clip(bw(Cl, Wp, 0.025 / mpt) / np.maximum(bw(A_, Wp, 0.025 / mpt), 1e-5), 0.6, 1.6)   # tông lớn theo texture cũ
        Cl = Cl * (1 - Wp[..., None]) + A_ * Wp[..., None]
        # dải chừa quanh mắt, mày: lấp bằng màu da ảnh ngay xung quanh (push–pull) × vân mịn MakeHuman → cùng tông da ảnh
        # (để texture cũ ở đây thì lộ mép dưới đuôi mắt — người dùng chỉ ra ở model-1)
        ko = keep_out * valid
        # vân MakeHuman nén --keepout-detail (mũ; 1 = nguyên): da mẫu young_asian_female có tàn nhang → chấm nâu dưới mắt
        KD = float(argv[argv.index("--keepout-detail") + 1]) if "--keepout-detail" in argv else 1.0
        hf_k = np.clip(lum_(SKl) / np.maximum(lum_(box_blur(SKl, 0.0025 / mpt)), 1e-4), 0.7, 1.2)[..., None] ** KD
        Fk = box_blur(push_pull(Cl, (valid & (keep_out < 0.02)).astype(np.float32)), 0.006 / mpt) * hf_k   # mờ ~6 mm: ít hơn → ô vuông
        Cl = Cl * (1 - ko[..., None]) + Fk * ko[..., None]
        print("PHOTOS texel lấy từ ảnh", int((Wp > 0.5).sum()), "dải chừa", int((ko > 0.5).sum()))
        Cl = Cl.astype(np.float32)
        del A_, Wp, Fk, ko, hf_k, keep_out; gc.collect()

    # 1) làm sạch. Mắt, tai: chi tiết sáng–tối của da MakeHuman (vẽ đúng cho UV này: nếp mí, khoé mắt, vành tai) nhân theo
    #    tông ảnh xung quanh. Mày: chỉ màu da xung quanh (mịn). Màu da xung quanh = lấp kiểu push–pull trong UV.
    Mear = np.clip(box_blur(EAR[cr], T / 4096 * 6) * 1.3, 0, 1) if EAR is not None else np.zeros_like(Me)
    Mall = np.maximum(np.maximum(np.maximum(np.maximum(Me, Mb), Mear), NECK), Mring)
    srcw = (valid & (Mall < 0.02)).astype(np.float32)
    blur_k = T / 4096 * 10
    PC = box_blur(push_pull(Cl, srcw), blur_k).astype(np.float32)
    lum = lambda c: c @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    # mắt, cổ: chỉ chi tiết mịn (< 2,5 mm: nếp mí, khoé mắt, vân da) của da MakeHuman — mảng sáng/tối lớn của nó (mí sáng hơn
    # má...) làm vùng sạch thành quầng sáng. Tai giữ cả mảng lớn (khối vành tai).
    hf = np.clip(lum(SKl) / np.maximum(lum(box_blur(SKl, 0.0025 / mpt)), 1e-4), 0.7, 1.2)[..., None]
    Fh = PC * hf
    # tai, cổ: màu = tông da mặt (trung vị), chỉ lấy vân mịn của da MakeHuman — lấy cả mảng màu của nó thì tai cam, dưới hàm
    # có mảng hồng (người dùng chỉ ra ở model-1)
    face_ = inr & (Mall < 0.02) & (Mlip < 0.1) & (-ny > 0.5)
    # tông cổ chuyển dần: da mặt ở hàm → da thân ở ngực (một tông da mặt cho cả cổ thì lộ "cổ áo" đậm ở vai khi nhảy)
    Pz = POS[cr][..., 2]
    body_ = valid & (Pz < zc - 0.14) & (Pz > zc - 0.18)
    t_ = np.clip((zc - Pz) / 0.12, 0, 1)[..., None]
    Fn = (np.median(Cl[face_], 0) * (1 - t_) + np.median(Cl[body_], 0) * t_) * hf
    # tai: tông da mặt (ửng hồng nhẹ --ear-tint) × khối vành tai MakeHuman, chỉ mảng mềm 1,2–8 mm, nén --ear-shade; lấy màu lấp
    # từ viền tai tượng thì tai ngả cam; lấy cả vân < 1 mm, độ lệch 0,7–1,25 thì tai nhăn như giấy vò (người dùng chỉ ra ở model-1)
    sh_ = lum(box_blur(SKl, 0.0012 / mpt)) / np.maximum(lum(box_blur(SKl, 0.008 / mpt)), 1e-4)
    Fear = (np.median(Cl[face_], 0) * EAR_TINT)[None, None] * np.clip(sh_ ** EAR_SHADE, 0.8, 1.12)[..., None]
    del sh_
    for M_, fill in ((Mb, PC), (Me, Fh), (Mring * (1 - Mear), PC), (Mear, Fear), (NECK, Fn)):
        Cl = (Cl * (1 - M_[..., None]) + fill * M_[..., None]).astype(np.float32)
    del PC, Fh, Fn, Fear, hf; gc.collect()
    print("CLEAN texels mắt", int((Me > 0.5).sum()), "mày", int((Mb > 0.5).sum()), "tai", int((Mear > 0.5).sum()), "cổ", int((NECK > 0.5).sum()))

    # 1a) --even-post <độ mạnh>: da đều màu lần hai, sau khi chiếu ảnh + làm sạch. Ảnh 3 góc chồng lệch + vân MakeHuman ở dải
    #     lấp quanh mắt để lại mảng loang 3–15 mm ở má (ảnh dải tần độ sáng, part_swap.py --band: ảnh mẫu da mịn). Chừa mắt, mày,
    #     mũi, môi, lỗ mũi (nét thật của mặt).
    if "--even-post" in argv:
        k_ = float(argv[argv.index("--even-post") + 1])
        nose_c = (lm["nose_tip"] + (lm["eye_l_in"] + lm["eye_r_in"]) / 2) / 2
        m_keep = np.maximum(np.maximum(samp(blob(nose_c, E * 0.5, E * 1.0)), Mlip), np.maximum(Me, Mb))
        wP = (inr * (Mall < 0.02) * (1 - np.clip(m_keep * 1.5, 0, 1)) * np.clip((-ny + 0.2) / 0.3, 0, 1)).astype(np.float32)
        wb = lambda C_, r: box_blur(C_ * wP[..., None], r) / np.maximum(box_blur(wP, r), 1e-4)[..., None]
        ratio = np.clip(wb(Cl, 0.015 / mpt) / np.maximum(wb(Cl, 0.003 / mpt), 1e-5), 0.8, 1.25)
        Cl = (Cl * (1 + (ratio - 1) * (wP * k_)[..., None])).astype(np.float32)
        print("EVEN-POST texels đổi >5%", int((np.abs(ratio - 1).max(-1) * wP * k_ > 0.05).sum()))
        del ratio, wP, m_keep; gc.collect()

    # 1b) tông + vân da. Đo trên ảnh chụp thử (chỗ không cháy sáng): sắc da lưới ≈ ảnh, ảnh ấm hơn ~4 % (ít lam) → --skin-gain
    #     (tuyến tính, mặc định 1.02,1,0.96). Da sau các bước làm sạch mịn như sáp → vân lỗ chân lông giả: nhiễu dải 0,3–1 mm,
    #     biên độ --pores (mặc định 0,035), chừa môi, lỗ mũi.
    gain = np.array([float(v) for v in (argv[argv.index("--skin-gain") + 1] if "--skin-gain" in argv else "1.02,1,0.96").split(",")])
    PORE = float(argv[argv.index("--pores") + 1]) if "--pores" in argv else 0.035
    nz = np.random.default_rng(7).standard_normal(Cl.shape[:2]).astype(np.float32)
    nz = box_blur(nz, 0.0003 / mpt, n=2) - box_blur(nz, 0.001 / mpt, n=2); nz /= max(float(nz.std()), 1e-6)
    Cl = Cl * (1 + PORE * np.clip(nz, -2.5, 2.5) * wE)[..., None]
    print("SKIN gain", gain, "pores", PORE)

    # 2) trang điểm (ảnh ortho RT, màu sRGB) chồng "over" trong không gian tuyến tính, chỉ mặt hướng ra trước
    fa = samp(alpha) * np.clip((-ny - 0.1) / 0.3, 0, 1)
    Cl = Cl * (1 - fa[..., None]) + to_lin(samp(rgb)) * fa[..., None]
    print("MAKEUP texels", int((fa > 0.05).sum()))

    CP[cr][..., :3] = np.clip(to_srgb(Cl), 0, 1)
    g32 = gain.astype(np.float32)
    for r0 in range(0, CP.shape[0], 512):                                          # tông: cả texture (không lộ mép khung mặt),
        blk = CP[r0:r0 + 512, :, :3]                                               # từng dải hàng cho đỡ tốn bộ nhớ
        CP[r0:r0 + 512, :, :3] = np.clip(to_srgb(to_lin(blk) * g32), 0, 1).astype(np.float32)
    img = bpy.data.images.new("body_color_mk", T, T)
    img.pixels.foreach_set(CP.ravel())
    img.filepath_raw = os.path.splitext(out_blend)[0] + "_body_color.png"; img.file_format = "PNG"; img.save()
    for m_ in body.data.materials:
        for n in m_.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image == col_img:
                n.image = img
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print("SAVED", out_blend, img.filepath_raw)


if BASE:
    bake_base(src, out)
    sys.exit(0)

# ---------- lớp phủ: bản sao vùng mặt của đầu, UV chiếu thẳng từ trước ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
comp = bpy.data.images.get("makeup") or to_image("makeup", rgb, alpha)
comp.pack()
head = next(o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith(("Eye", "UP_", "LO_", "Lash")))
bm = bmesh.new(); bm.from_mesh(head.data); bm.transform(head.matrix_world)
bm.normal_update()
to_px = lambda v: ((v.x - cu) / sc * R + R / 2, R / 2 - (v.z - cv) / sc * R)
keep = []
for f in bm.faces:
    c = f.calc_center_median(); px_, py_ = to_px(c)
    if f.normal.y < 0.3 and 0 <= px_ < R and 0 <= py_ < R and alpha[int(py_ * K), int(px_ * K)] > 0.003:
        keep.append(f)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in set(keep)], context="FACES")
for l_ in list(bm.loops.layers.uv):
    bm.loops.layers.uv.remove(l_)
uvl = bm.loops.layers.uv.new("UVMap")
for v in bm.verts:
    v.co += v.normal * 0.0005
for f in bm.faces:
    for l_ in f.loops:
        px_, py_ = to_px(l_.vert.co)
        l_[uvl].uv = (px_ / R, 1 - py_ / R)
me = bpy.data.meshes.new("Makeup"); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new("Makeup", me); bpy.context.scene.collection.objects.link(ob)
mat = bpy.data.materials.new("Makeup"); mat.use_nodes = True
nt = mat.node_tree; b = nt.nodes["Principled BSDF"]
ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = comp
nt.links.new(ti.outputs["Color"], b.inputs["Base Color"]); nt.links.new(ti.outputs["Alpha"], b.inputs["Alpha"])
b.inputs["Roughness"].default_value = 0.5
me.materials.append(mat)
for p_ in me.polygons:
    p_.use_smooth = True
print("MAKEUP faces", len(me.polygons), "layers", list(layers))
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("DONE", out)
