"""Khoét hõm giữa đỉnh tai và thái dương theo bóng ảnh chính diện (sau fix_ears + ear_fit).

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/ear_carve.py -- <ortho_b> <lm_photo.json> <ảnh chính diện tách nền.png> <ra.blend> \
    [--photo-key face-01-front.png] [--wing 1.0] [--gain 1.0] [--dry]

- Thanh trượt tai MakeHuman xoè cả tai nhưng chỗ nối đỉnh vành tai với da đầu là một dải mặt lưới → nhìn thẳng thấy sườn da phẳng
  nối đỉnh tai lên thái dương; ảnh thì có hõm (người dùng chỉ ra ở model-1).
- --wing: cộng thêm ear-wing-incr (độ xoè; ear_fit đo bóng bằng đỉnh thưa nên chọn thấp — model-1 nhìn thẳng tai mảnh hơn ảnh).
- Bóng: điểm mẫu dày trên mặt lưới (3×3 mỗi mặt) vs alpha ảnh, theo dải cao 1 mm, từng bên. Ở nửa trên vùng tai, dải nào lưới
  rộng hơn ảnh > 0,5 mm: đỉnh (nhóm tai + 3 vòng quanh) nằm ngoài bóng ảnh bị kéo vào theo x về mép ảnh (× --gain), độ dời làm
  mượt theo cạnh lưới 4 vòng.
- --dry: chỉ in bóng lưới / ảnh từng dải.
"""
import json
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
odir, lmp_path, photo_path, out = a[:4]
PK = a[a.index("--photo-key") + 1] if "--photo-key" in a else "face-01-front.png"
WING = float(a[a.index("--wing") + 1]) if "--wing" in a else 0.0
GAIN = float(a[a.index("--gain") + 1]) if "--gain" in a else 1.0

body = bpy.data.objects["Body"]
for md in body.modifiers:
    md.show_viewport = False
me = body.data
co = np.array([v.co for v in me.vertices])
helper = np.zeros(len(co), bool)
for vg in body.vertex_groups:
    if vg.name.lower().startswith(("helper", "joint")):
        for v in me.vertices:
            if any(g.group == vg.index for g in v.groups):
                helper[v.index] = True

if WING > 0:
    from bl_ext.user_default.mpfb.services.targetservice import TargetService
    import bl_ext.user_default.mpfb as _mpfb
    TD = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets", "ears")
    for sd in "lr":
        TargetService.load_target(body, os.path.join(TD, f"{sd}-ear-wing-incr.target.gz"), weight=1.0, name="tmp")
        kb = me.shape_keys.key_blocks
        co += WING * (np.array([v.co for v in kb["tmp"].data]) - np.array([v.co for v in kb[0].data]))
        body.shape_key_remove(kb["tmp"])
    for kb in list(me.shape_keys.key_blocks)[::-1]:
        body.shape_key_remove(kb)

# ---- bóng ảnh (đặt chồng theo điểm mốc như ear_fit.py) ----
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
q = (s * (Rm @ (np.stack([xs, ys], 1) - Am).T)).T + Bm
wx = (q[:, 0] - R / 2) / R * sc + cu; wz = cv + (R / 2 - q[:, 1]) / R * sc

gi = body.vertex_groups["ears"].index
ew = np.array([next((g.weight for g in v.groups if g.group == gi), 0.0) for v in me.vertices])
ear = (ew > 0.5) & ~helper
z0, z1 = co[ear, 2].min() - 0.004, co[ear, 2].max() + 0.006
zm = (co[ear, 2].min() + co[ear, 2].max()) / 2
bands = np.arange(z0, z1, 0.001)

F = np.array([list(p.vertices) if len(p.vertices) == 4 else (list(p.vertices) + [p.vertices[-1]])[:4]
              for p in me.polygons if len(p.vertices) in (3, 4) and not helper[list(p.vertices)].any()])
g = np.linspace(0, 1, 3)
BW = np.array([[(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v] for u in g for v in g])
samp = lambda X: np.einsum("sk,fkd->fsd", BW, X[F]).reshape(-1, 3)


def extent(x, z, side):
    sel = x * side > 0
    o = np.full(len(bands) - 1, np.nan)
    b = np.digitize(z[sel], bands) - 1; xv = np.abs(x[sel]); ok = (b >= 0) & (b < len(o))
    np.fmax.at(o, b[ok], xv[ok])
    return o


nb = [[] for _ in range(len(co))]
for e in me.edges:
    i, j = e.vertices
    if not (helper[i] or helper[j]):
        nb[i].append(j); nb[j].append(i)
near = ear.copy()
for _ in range(3):
    near |= np.array([any(near[j] for j in nb[i]) for i in range(len(co))])
near &= ~helper

X = co.copy()
D = np.zeros_like(co)
for sd in (1, -1):
    tgt = extent(wx, wz, sd); m = extent(*samp(X)[:, [0, 2]].T, sd)
    if "--dry" in a:
        print("SIDE", sd)
        for k in range(0, len(bands) - 1, 2):
            print(f"  z {bands[k] - zm:+.3f}  lưới {m[k] * 1000:6.1f}  ảnh {tgt[k] * 1000:6.1f}  dư {(m[k] - tgt[k]) * 1000:+5.1f} mm")
        continue
    b = np.digitize(X[:, 2], bands) - 1
    for i in np.where(near & (np.sign(X[:, 0]) == sd) & (X[:, 2] > zm))[0]:
        k = b[i]
        if not (0 <= k < len(tgt)) or np.isnan(tgt[k]) or np.isnan(m[k]) or m[k] - tgt[k] < 0.0005:
            continue
        ex = abs(X[i, 0]) - tgt[k]
        if ex > 0:
            D[i, 0] = -sd * ex * GAIN
if "--dry" in a:
    sys.exit(0)
for _ in range(4):                                     # làm mượt độ dời theo cạnh (đỉnh không bị khoét kéo theo một phần)
    D = np.where(near[:, None], 0.5 * D + 0.5 * np.array([D[n].mean(0) if n else D[i] for i, n in enumerate(nb)]), 0)
X = X + D
print("CARVE đỉnh dời", int((np.abs(D[:, 0]) > 1e-4).sum()), "lớn nhất %.1f mm" % (np.abs(D[:, 0]).max() * 1000))
for sd in (1, -1):
    tgt = extent(wx, wz, sd); m0 = extent(*samp(co)[:, [0, 2]].T, sd); m1 = extent(*samp(X)[:, [0, 2]].T, sd)
    up = bands[:-1] > zm; ok = up & ~np.isnan(tgt) & ~np.isnan(m0)
    print(f"bên {sd}: lệch bóng nửa trên tai {np.sqrt(np.mean((m0[ok] - tgt[ok]) ** 2)) * 1000:.2f} → "
          f"{np.sqrt(np.mean((m1[ok] - tgt[ok]) ** 2)) * 1000:.2f} mm")
me.vertices.foreach_set("co", X.ravel()); me.update()
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
