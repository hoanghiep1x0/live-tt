"""Dựng bộ mi riêng (parts\\lashes\\<tên>) từ bộ mi MPFB (CC0): sợi đậm, dày hơn, mi dưới nhạt theo ý.

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/lash_style.py -- <eyelashes0N> <parts\\lashes\\<tên>> [--low 0.35] [--thick 0.5] [--dense 2] [--upper 1] [--color r,g,b]

- <base.blend>: base có Body (để gắn thử thẻ mi, phân biệt mi trên / mi dưới theo vị trí 3D, không theo bố cục ảnh mi).
- Màu sợi gần đen (nâu đen), alpha: nở 1 px pha --thick, rồi 1-(1-a)^--dense.
- Mi dưới (mặt thẻ nằm dưới tâm mắt cùng bên): alpha × --low (ảnh model-1: mi dưới mảnh, nhạt; mi trên dày).
- Ghi .mhclo/.mhmat/.obj (chép nguyên) + .png mới vào thư mục đích → bake_to_base.py --lashes <thư mục đó>.
"""
import os
import shutil
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
src, dst = a[:2]
opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
LOW, THICK, DENSE = opt("--low", 0.35), opt("--thick", 0.5), opt("--dense", 2.0)
COL = tuple(float(v) for v in a[a.index("--color") + 1].split(",")) if "--color" in a else (0.035, 0.025, 0.022)
UPA = opt("--upper", 1.0)      # nhân alpha mi trên (ảnh model-1: mi mảnh, nâu đen hơn day-04)
assets = bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data")
sd = os.path.join(assets, "eyelashes", src)
os.makedirs(dst, exist_ok=True)
for ext in ("mhclo", "mhmat", "obj"):
    shutil.copy(os.path.join(sd, f"{src}.{ext}"), dst)

body = bpy.data.objects["Body"]
for o in list(bpy.data.objects):
    if o.name.startswith("Body.eyelashes"):
        bpy.data.objects.remove(o, do_unlink=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
HumanService.add_mhclo_asset(os.path.join(dst, src + ".mhclo"), body, asset_type="Eyelashes", subdiv_levels=0, material_type="GAMEENGINE")
lash = next(o for o in bpy.data.objects if o.name.startswith("Body.eyelashes"))
dg = bpy.context.evaluated_depsgraph_get()
me = lash.evaluated_get(dg).to_mesh()
V = np.array([lash.matrix_world @ v.co for v in me.vertices])
uv = me.uv_layers.active.data

im = bpy.data.images.load(os.path.join(sd, src + ".png"))
W, H = im.size
px = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(px); px = px.reshape(H, W, 4)   # hàng 0 = đáy ảnh (v = 0)
low = np.zeros((H, W), bool)
side = np.sign(V[:, 0])
zc = {s: np.median(V[side == s, 2]) for s in (-1, 1)}
yy, xx = np.mgrid[0:H, 0:W]
n_low = 0
for p in me.polygons:
    c = V[list(p.vertices)].mean(0)
    if c[2] >= zc[np.sign(c[0])]:
        continue
    n_low += 1
    q = np.array([uv[i].uv for i in p.loop_indices]) * (W, H)
    x0, y0 = np.floor(q.min(0)).astype(int); x1, y1 = np.ceil(q.max(0)).astype(int)
    sub = (slice(max(y0, 0), min(y1 + 1, H)), slice(max(x0, 0), min(x1 + 1, W)))
    X, Y = xx[sub] + 0.5, yy[sub] + 0.5
    ins = np.ones(X.shape, bool); sgn = None
    for k in range(len(q)):                       # đa giác lồi (thẻ tứ giác): cùng phía mọi cạnh
        e = q[(k + 1) % len(q)] - q[k]; cr = e[0] * (Y - q[k][1]) - e[1] * (X - q[k][0])
        s = np.sign(cr.sum()) if sgn is None else sgn; sgn = s
        ins &= cr * s >= -1e-6
    low[sub] |= ins
lash.evaluated_get(dg).to_mesh_clear()
print("MI DƯỚI mặt", n_low, "px", int(low.sum()))

al = px[..., 3]
grow = np.maximum.reduce([np.roll(np.roll(al, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
al = al * (1 - THICK) + grow * THICK
al = 1 - (1 - al) ** DENSE
al[low] *= LOW
al[~low] *= UPA
px[..., :3] = COL
px[..., 3] = np.clip(al, 0, 1)
out = bpy.data.images.new("lash_out", W, H, alpha=True)
out.pixels.foreach_set(px.ravel())
out.filepath_raw = os.path.join(dst, src + ".png"); out.file_format = "PNG"; out.save()
print("SAVED", out.filepath_raw)
