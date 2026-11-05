"""Dáng tai theo ảnh: khớp đường viền tai nhìn chính diện bằng thanh trượt tai MakeHuman (sau bọc, trước bake_to_base).

blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/ear_fit.py -- <ortho_b> <lm_photo.json> <ảnh chính diện đã tách nền .png> <ra.blend> \
    [--photo-key face-01-front.png] [--save <parts\\ears\\<tên>.json>]

- Tai không bọc theo tượng (Hunyuan làm tai sai) → dáng tai là của MakeHuman: xoè, thấp, to hơn ảnh.
- Đo: bề rộng bóng đầu |x| theo từng độ cao z (dải 1 mm) trong vùng tai — của lưới (đỉnh chiếu thẳng) và của ảnh (alpha ảnh tách
  nền, đặt chồng theo điểm mốc như compare_overlay.py). Tai = phần nhô ra khỏi bóng sọ.
- Dò từng thanh (cả hai tai cùng trọng số) theo lưới 0..1 bước 0,05, lặp 3 vòng, giữ giá trị làm lệch bóng nhỏ nhất.
- --save: lưu trọng số thành bộ phận (dáng tai) dùng lại.
"""
import json
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
odir, lmp_path, photo_path, out = a[:4]
PK = a[a.index("--photo-key") + 1] if "--photo-key" in a else "face-01-front.png"
SAVE = a[a.index("--save") + 1] if "--save" in a else None
import bl_ext.user_default.mpfb as _mpfb  # noqa: E402
TDIR = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets", "ears")
CAND = ["ear-wing-decr", "ear-wing-incr", "ear-trans-up", "ear-trans-down", "ear-scale-vert-incr", "ear-scale-vert-decr",
        "ear-scale-decr", "ear-scale-incr", "ear-flap-decr", "ear-rot-backward", "ear-rot-forward"]

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


from bl_ext.user_default.mpfb.services.targetservice import TargetService  # noqa: E402


def load_target(name):
    """Độ dời (n, 3) của target MakeHuman, đọc bằng chính MPFB (đúng hệ trục, đơn vị): nạp làm shape key rồi trừ Basis."""
    TargetService.load_target(body, os.path.join(TDIR, name + ".target.gz"), weight=1.0, name="tmp_" + name)
    kb = me.shape_keys.key_blocks
    X = np.array([v.co for v in kb["tmp_" + name].data]); X0 = np.array([v.co for v in kb[0].data])
    body.shape_key_remove(kb["tmp_" + name])
    return X - X0


DL = {c: load_target("l-" + c) + load_target("r-" + c) for c in CAND}
if me.shape_keys:
    for kb in list(me.shape_keys.key_blocks)[::-1]:
        body.shape_key_remove(kb)
scale = 1.0
print("TARGETS", {c: round(float(np.abs(d).max() * 1000), 1) for c, d in DL.items()}, "mm (dời lớn nhất)")

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
M = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
P = json.load(open(lmp_path))[PK]
keys = [k for k in M if k in P and not k.startswith(("lid_", "iris", "brow_", "lipo_"))]
A = np.array([P[k] for k in keys]); B = np.array([M[k] for k in keys]); Am, Bm = A.mean(0), B.mean(0)
U, S, Vt = np.linalg.svd((A - Am).T @ (B - Bm)); Rm = (U @ Vt).T; s = S.sum() / ((A - Am) ** 2).sum()
im = bpy.data.images.load(photo_path); W, H = im.size
al = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(al); al = al.reshape(H, W, 4)[::-1, :, 3]
ys, xs = np.where(al > 0.5)
q = (s * (Rm @ (np.stack([xs, ys], 1) - Am).T)).T + Bm                       # px ảnh → px ortho
wx = (q[:, 0] - R / 2) / R * sc + cu; wz = cv + (R / 2 - q[:, 1]) / R * sc      # → x, z thế giới
ear = np.zeros(len(co), bool)
gi = body.vertex_groups["ears"].index
for v in me.vertices:
    if any(g.group == gi and g.weight > 0.5 for g in v.groups):
        ear[v.index] = True
ez = co[ear, 2]
z0, z1 = ez.min() - 0.004, ez.max() + 0.004
bands = np.arange(z0, z1, 0.001)


def extent(x, z, side):
    sel = (x * side > 0)
    out = np.full(len(bands) - 1, np.nan)
    b = np.digitize(z[sel], bands) - 1; xv = np.abs(x[sel])
    ok = (b >= 0) & (b < len(out))
    np.fmax.at(out, b[ok], xv[ok])
    return out


tgt = {sd: extent(wx, wz, sd) for sd in (1, -1)}
print("ẢNH bề rộng max vùng tai (mm): trái %.1f phải %.1f" % (np.nanmax(tgt[1]) * 1000, np.nanmax(tgt[-1]) * 1000))


def cost(w):
    X = co + scale * sum(w[c] * DL[c] for c in CAND if w[c] > 0)
    X = X[~skip]
    e = []
    for sd in (1, -1):
        m = extent(X[:, 0], X[:, 2], sd); ok = ~np.isnan(m) & ~np.isnan(tgt[sd])
        e.append((m[ok] - tgt[sd][ok]) ** 2)
    return float(np.mean(np.concatenate(e))) ** 0.5


w = {c: 0.0 for c in CAND}
c0 = cost(w)
for _ in range(3):
    for c in CAND:
        best = (cost(w), w[c])
        for t in np.arange(0, 1.0001, 0.05):
            w2 = dict(w); w2[c] = t; e = cost(w2)
            if e < best[0] - 1e-7:
                best = (e, t)
        w[c] = best[1]
print("EAR FIT lệch bóng (mm): %.2f → %.2f" % (c0 * 1000, cost(w) * 1000), {c: round(v, 2) for c, v in w.items() if v > 0})
X = co + scale * sum(w[c] * DL[c] for c in CAND if w[c] > 0)
me.vertices.foreach_set("co", X.ravel()); me.update()
for md in body.modifiers:
    md.show_viewport = True
if SAVE:
    os.makedirs(os.path.dirname(SAVE), exist_ok=True)
    json.dump({c: round(v, 3) for c, v in w.items() if v > 0}, open(SAVE, "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
