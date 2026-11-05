"""Khớp đường viền đầu nhiều góc (má, gò má, cằm, gáy, cổ sau) bằng thanh trượt MakeHuman — sau bọc / nắn miệng / dáng tai.

blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/shape_fit.py -- <ortho nhiều góc có lm_ortho.json> <lm_photo.json> \
    <thư mục ảnh tách nền> <ra.blend> [--views 0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png] \
    [--save <parts\\shape\\<tên>.json>] [--keep 3] [--cand chin/chin-width-incr,cheek/cheek-volume-incr:p,...] [--band-top mouth]

- Bóng (silhouette) mỗi góc: theo từng dải cao 2 mm, mép trái/phải của hình chiếu ortho đúng góc — lưới (điểm mẫu 3×3 mỗi mặt,
  bỏ lưới phụ; lấy theo đỉnh thì hụt vì đỉnh gáy/cổ thưa) vs alpha ảnh tách nền (đặt chồng theo điểm mốc). Chỉ xét từ cằm tới
  trên mày 2 cm (dưới là vòng cổ, áo của ảnh; trên là sọ — tóc sẽ che).
- Mặt trước đã khớp ảnh (bọc + nắn miệng + dáng mắt) → phạt mọi xê dịch của vùng mắt–mũi–miệng (trọng số --keep, mặc định 3).
- Dò từng thanh theo lưới 0..1 bước 0,05, 3 vòng (cả hai bên cùng trọng số), giữ giá trị làm lệch bóng nhỏ nhất.
"""
import json
import os
import sys

import bpy
import numpy as np

from bl_ext.user_default.mpfb.services.targetservice import TargetService
import bl_ext.user_default.mpfb as _mpfb

a = sys.argv[sys.argv.index("--") + 1:]
odir, lmp_path, photo_dir, out = a[:4]
VIEWS = [(int(v.split(":")[0]), v.split(":")[1]) for v in
         (a[a.index("--views") + 1] if "--views" in a else
          "0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png").split(",")]
KEEP = float(a[a.index("--keep") + 1]) if "--keep" in a else 3.0
SAVE = a[a.index("--save") + 1] if "--save" in a else None
TD = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets")
CAND = {  # tên: (thư mục, có cặp l-/r-)
    "cheek-bones-incr": ("cheek", True), "cheek-bones-decr": ("cheek", True), "cheek-volume-incr": ("cheek", True),
    "cheek-volume-decr": ("cheek", True), "cheek-inner-incr": ("cheek", True), "chin-prominent-decr": ("chin", False),
    "chin-prominent-incr": ("chin", False), "chin-prognathism-decr": ("chin", False), "chin-width-incr": ("chin", False),
    "head-back-scale-depth-decr": ("head", False), "head-back-scale-depth-incr": ("head", False),
    "neck-back-scale-depth-decr": ("neck", False), "neck-scale-depth-decr": ("neck", False), "neck-scale-horiz-decr": ("neck", False),
}
if "--cand" in a:      # thanh riêng: "thư mục/tên[:p]" (:p = có cặp l-/r-), cách nhau dấu phẩy
    CAND = {}
    for c in a[a.index("--cand") + 1].split(","):
        fd, nm = c.split("/"); pr = nm.endswith(":p"); CAND[nm.replace(":p", "")] = (fd, pr)
BAND_TOP = a[a.index("--band-top") + 1] if "--band-top" in a else "brow"   # brow | mouth (chỉ nửa dưới mặt: hàm, cằm)

body = bpy.data.objects["Body"]
for md in body.modifiers:
    md.show_viewport = False
me = body.data
co = np.array([v.co for v in me.vertices])
skip = np.zeros(len(co), bool)
for vg in body.vertex_groups:
    if vg.name.lower().startswith(("helper", "joint")):
        gi = vg.index
        for v in me.vertices:
            if any(g.group == gi for g in v.groups):
                skip[v.index] = True


def load_target(folder, name):
    TargetService.load_target(body, os.path.join(TD, folder, name + ".target.gz"), weight=1.0, name="tmp")
    kb = me.shape_keys.key_blocks
    D = np.array([v.co for v in kb["tmp"].data]) - np.array([v.co for v in kb[0].data])
    body.shape_key_remove(kb["tmp"])
    return D


DL = {}
for c, (folder, pair) in CAND.items():
    DL[c] = load_target(folder, "l-" + c) + load_target(folder, "r-" + c) if pair else load_target(folder, c)
if me.shape_keys:
    for kb in list(me.shape_keys.key_blocks)[::-1]:
        body.shape_key_remove(kb)

# điểm mẫu dày trên mặt lưới (lưới 3×3 mỗi mặt tứ giác): đỉnh MakeHuman ở gáy, cổ thưa (≥ 5 mm) → bóng theo đỉnh bị hụt
F = np.array([list(p.vertices) * (4 // len(p.vertices)) if len(p.vertices) == 4 else (list(p.vertices) + [p.vertices[-1]])[:4]
              for p in me.polygons if len(p.vertices) in (3, 4) and not skip[list(p.vertices)].any()])
g = np.linspace(0, 1, 3)
BW = np.array([[(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v] for u in g for v in g])      # (9, 4) trọng số song tuyến
samp = lambda X: np.einsum("sk,fkd->fsd", BW, X[F]).reshape(-1, 3)
print("ĐIỂM MẪU", len(F) * len(BW))

meta = json.load(open(os.path.join(odir, "ortho.json")))
LMO = json.load(open(os.path.join(odir, "lm_ortho.json"))); LMP = json.load(open(lmp_path))
X0 = co[~skip]
lm0 = LMO["ortho_0.png"]; m0 = meta["ortho_0.png"]
zc = m0["cv"] + (m0["R"] / 2 - lm0["chin"][1]) / m0["R"] * m0["scale"]
zb = m0["cv"] + (m0["R"] / 2 - min(lm0["brow_l_up_2"][1], lm0["brow_r_up_2"][1])) / m0["R"] * m0["scale"]
zm_ = m0["cv"] + (m0["R"] / 2 - (lm0["mouth_l"][1] + lm0["mouth_r"][1]) / 2) / m0["R"] * m0["scale"]
bands = np.arange(zc - 0.003, (zb + 0.02) if BAND_TOP == "brow" else zm_ + 0.01, 0.002)       # cằm → trên mày 2 cm: dưới là vòng cổ của ảnh, trên là sọ (tóc sẽ che)

# vùng giữ yên: mắt–mũi–miệng (hộp quanh điểm mốc chính diện, phần mặt trước)
to_w = lambda p: ((p[0] - m0["R"] / 2) / m0["R"] * m0["scale"] + m0["cu"], m0["cv"] + (m0["R"] / 2 - p[1]) / m0["R"] * m0["scale"])
pts = np.array([to_w(lm0[k]) for k in ("eye_l_out", "eye_r_out", "chin", "brow_l_up_2", "brow_r_up_2") if k in lm0])
x_lo, x_hi = pts[:, 0].min(), pts[:, 0].max(); z_lo, z_hi = pts[:, 1].min() + 0.01, pts[:, 1].max()
box = (X0[:, 0] > x_lo) & (X0[:, 0] < x_hi) & (X0[:, 2] > z_lo) & (X0[:, 2] < z_hi)
keepm = box & (X0[:, 1] < X0[box, 1].min() + 0.035)                     # mặt trước (không lấy ngực: nhô hơn mặt)
print("GIỮ YÊN đỉnh", int(keepm.sum()))


def sil(U, Z):
    b = np.digitize(Z, bands) - 1; ok = (b >= 0) & (b < len(bands) - 1)
    lo = np.full(len(bands) - 1, np.nan); hi = np.full(len(bands) - 1, np.nan)
    np.fmin.at(lo, b[ok], U[ok]); np.fmax.at(hi, b[ok], U[ok])
    return lo, hi


views = []
for ang, fname in VIEWS:
    key = f"ortho_{ang}.png"; m = meta[key]; R, sc, cu, cv = m["R"], m["scale"], m["cu"], m["cv"]
    r = np.radians(ang); d = np.array([np.sin(r), -np.cos(r), 0.0]); right = np.cross(-d, [0, 0, 1])
    L1 = LMO[key]; L2 = LMP[fname]
    ks = [k for k in L1 if k in L2 and not k.startswith(("lid_", "iris", "brow_", "lipo_"))]
    A = np.array([L2[k] for k in ks]); B = np.array([L1[k] for k in ks]); Am, Bm = A.mean(0), B.mean(0)
    U_, S_, Vt = np.linalg.svd((A - Am).T @ (B - Bm)); Rm = (U_ @ Vt).T; s = S_.sum() / ((A - Am) ** 2).sum()
    im = bpy.data.images.load(os.path.join(photo_dir, fname)); W, H = im.size
    al = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(al); al = al.reshape(H, W, 4)[::-1, :, 3]
    ys, xs = np.where(al > 0.5)
    q = (s * (Rm @ (np.stack([xs, ys], 1) - Am).T)).T + Bm
    pu = (q[:, 0] - R / 2) / R * sc + cu; pz = cv + (R / 2 - q[:, 1]) / R * sc
    views.append((ang, right, sil(pu, pz)))


def cost(w, detail=False):
    D = sum(w[c] * DL[c] for c in CAND if w[c] > 0) if any(w.values()) else np.zeros_like(co)
    X = samp(co + D)
    e = []; rep = {}
    for ang, right, (plo, phi) in views:
        lo, hi = sil(X @ right, X[:, 2])
        for nm, mm, pp in (("trái", lo, plo), ("phải", hi, phi)):
            ok = ~np.isnan(mm) & ~np.isnan(pp)
            e.append((mm[ok] - pp[ok]) ** 2); rep[f"{ang}° {nm}"] = round(float(np.sqrt(np.mean((mm[ok] - pp[ok]) ** 2)) * 1000), 2)
    sil_e = float(np.mean(np.concatenate(e))) ** 0.5
    keep_e = float(np.sqrt(np.mean((D[~skip][keepm] ** 2).sum(1)))) if keepm.any() else 0.0
    return (sil_e + KEEP * keep_e, rep, keep_e) if detail else sil_e + KEEP * keep_e


w = {c: 0.0 for c in CAND}
c0, rep0, _ = cost(w, True)
if "--dump" in a:
    X = samp(co)
    dump = {}
    for ang, right, (plo, phi) in views:
        lo, hi = sil(X @ right, X[:, 2])
        dump[ang] = {"z": bands[:-1].round(4).tolist(), "lo": lo.tolist(), "hi": hi.tolist(), "plo": plo.tolist(), "phi": phi.tolist()}
    json.dump(dump, open(a[a.index("--dump") + 1], "w")); print("DUMP"); sys.exit(0)
for _ in range(3):
    for c in CAND:
        best = (cost(w), w[c])
        for t in np.arange(0, 1.0001, 0.05):
            w2 = dict(w); w2[c] = t; e = cost(w2)
            if e < best[0] - 1e-7:
                best = (e, t)
        w[c] = best[1]
c1, rep1, k1 = cost(w, True)
print("TRƯỚC (mm)", rep0); print("SAU (mm)", rep1, "mặt trước xê dịch %.2f mm" % (k1 * 1000))
print("SHAPE FIT", {c: round(float(v), 2) for c, v in w.items() if v > 0})
D = sum(w[c] * DL[c] for c in CAND if w[c] > 0) if any(w.values()) else np.zeros_like(co)
me.vertices.foreach_set("co", (co + D).ravel()); me.update()
for md in body.modifiers:
    md.show_viewport = True
if SAVE:
    os.makedirs(os.path.dirname(SAVE), exist_ok=True)
    json.dump({c: round(float(v), 3) for c, v in w.items() if v > 0}, open(SAVE, "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
