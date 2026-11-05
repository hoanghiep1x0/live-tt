"""Nắn hàm–cằm theo ảnh: điểm viền hàm, cằm (MediaPipe 478 điểm) của ảnh chụp lưới vs ảnh mẫu → trường dời mềm (RBF gauss).

# hpc: so điểm, xuất điểm điều khiển (ảnh chính diện; đối xứng; neo mắt, mày, mũi, môi, gò má)
python oval_cmp.py <thư mục ảnh mẫu> <ảnh chụp lưới (ortho_0.png…)> --pairs 0:face-01-front.png --out jaw.json
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/jaw_nudge.py -- <ortho chụp lưới (ortho.json)> jaw.json <ra.blend> \
    [--sigma 0.015] [--gain 1.0] [--depth-gain 0.7] [--x-gain 1.0]

- Model-1: cằm nhọn, hai bên cằm "thiếu" (người dùng chỉ ra) — đo ra hàm ảnh rộng hơn 3–3,5 mm mỗi bên, thấp hơn ~3 mm, cằm
  nhô ra trước ~3 mm (chiều sâu z của MediaPipe, tương đối đỉnh mũi).
- Điểm điều khiển: bắn tia chính diện vào lưới tại toạ độ px của điểm trên ảnh chụp lưới; độ dời x–z từ ảnh, y (trước–sau)
  từ chênh chiều sâu × --depth-gain (z MediaPipe kém chắc hơn x–y).
- Chỉ dời đỉnh Body (giữ UV, texture, normal map) → chạy được trên base đã tô màu.
"""
import json
import os
import sys

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
odir, jpath, out = a[:3]
opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
SIG, GAIN, DG = opt("--sigma", 0.015), opt("--gain", 1.0), opt("--depth-gain", 0.7)
XG = opt("--x-gain", 1.0)        # nở ngang: model-1 nở đủ số đo thì hai bên hàm phồng (đất sét)

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
J = json.load(open(jpath)); mpp = sc / R

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
bvh = BVHTree.FromPolygons([tuple(c) for c in co], [list(p.vertices) for p in me.polygons if not helper[list(p.vertices)].any()])

cen, val = [], []
for k, (u, v, du, dv, dz) in J["points"].items():
    x = (u - R / 2) / R * sc + cu; z = cv + (R / 2 - v) / R * sc
    h = bvh.ray_cast((x, -1.0, z), (0, 1, 0))
    if h[0] is None:
        print("NO HIT", k); continue
    cen.append(np.array(h[0])); val.append([du * mpp * GAIN * XG, dz / 1000 * DG * GAIN, -dv * mpp * GAIN])
cen, val = np.array(cen), np.array(val)
Phi = np.exp(-((cen[:, None] - cen[None]) ** 2).sum(-1) / SIG ** 2)
W = np.linalg.solve(Phi + 0.05 * np.eye(len(cen)), val)
print("ĐIỂM", len(cen), "khớp tại điểm: lệch tối đa %.2f mm" % (np.abs(Phi @ W - val).max() * 1000))
D = np.zeros_like(co)
for i in range(0, len(co), 5000):
    D[i:i + 5000] = np.exp(-((co[i:i + 5000, None] - cen[None]) ** 2).sum(-1) / SIG ** 2) @ W
me.vertices.foreach_set("co", (co + D).ravel()); me.update()
print("JAW dời tối đa %.2f mm" % (np.linalg.norm(D, axis=1).max() * 1000))
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
