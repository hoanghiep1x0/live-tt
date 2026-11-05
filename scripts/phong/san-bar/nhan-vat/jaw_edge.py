"""Cạnh hàm–cằm: bo góc gãy hai bên cằm + nâng/lùi mặt dưới hàm cho đường hàm thành cạnh rõ (sau jaw_nudge).

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/jaw_edge.py -- <ortho_b> <ra.blend> [--lift 0.003] [--back 0.002] \
    [--corner-iters 6] [--corner-lam 0.5]

- Model-1 (người dùng chỉ ra "cạnh cằm chưa được"): nhìn nghiêng ảnh mẫu có đường hàm sắc từ cằm tới tai, dưới hàm là bóng
  tách hẳn khỏi cổ; lưới thì mặt dưới hàm thoải chéo vào cổ, chỗ cằm nối đường hàm gãy góc.
- Mặt dưới hàm: đỉnh có pháp tuyến chúc xuống (n_z < −0,3), từ dưới cằm 5 cm tới trên cằm 4 cm, |x| < 7 cm, nửa trước cổ, chừa miệng
  (nửa miệng + 1,2 cm, từ 1,6 cm dưới khoé miệng trở lên).
  Dời lên --lift và ra sau --back × độ chúc (smoothstep), làm mượt độ dời theo cạnh 6 vòng (không gợn).
- Góc cằm: đỉnh |x| 1–3,5 cm, từ dưới cằm 1,2 cm tới trên cằm 1,5 cm → Laplace --corner-iters vòng (khoanh hẹp: rộng thì
  phẳng mặt trước cằm).
"""
import json
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
odir, out = a[:2]
opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
LIFT, BACK, CIT, CLAM = opt("--lift", 0.003), opt("--back", 0.002), int(opt("--corner-iters", 6)), opt("--corner-lam", 0.5)

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
zc = meta["cv"] + (meta["R"] / 2 - lm["chin"][1]) / meta["R"] * meta["scale"]

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
me.calc_normals_split() if hasattr(me, "calc_normals_split") else None
N = np.array([v.normal for v in me.vertices])
nb = [[] for _ in range(len(co))]
for e in me.edges:
    i, j = e.vertices
    if not (helper[i] or helper[j]):
        nb[i].append(j); nb[j].append(i)
neck_y = np.median(co[(np.abs(co[:, 2] - (zc - 0.06)) < 0.004) & ~helper, 1])

sm = lambda t: t * t * (3 - 2 * t)
zm = meta["cv"] + (meta["R"] / 2 - (lm["mouth_l"][1] + lm["mouth_r"][1]) / 2) / meta["R"] * meta["scale"]
xm = abs(lm["mouth_l"][0] - lm["mouth_r"][0]) / 2 / meta["R"] * meta["scale"]
# chừa miệng: mặt dưới môi dưới cũng chúc xuống → nâng nó thì môi hé (đã gặp ở model-1)
mouth = (np.abs(co[:, 0]) < xm + 0.012) & (co[:, 2] > zm - 0.016)
band = (~helper) & ~mouth & (co[:, 2] > zc - 0.05) & (co[:, 2] < zc + 0.04) & (np.abs(co[:, 0]) < 0.07) & (co[:, 1] < neck_y + 0.01)
w = np.where(band, sm(np.clip((-N[:, 2] - 0.3) / 0.4, 0, 1)), 0.0)
w *= sm(np.clip((co[:, 2] - (zc - 0.05)) / 0.015, 0, 1))                 # mép dưới dải: hoà vào cổ
D = np.zeros_like(co); D[:, 2] = w * LIFT; D[:, 1] = w * BACK
for _ in range(6):
    D = 0.5 * D + 0.5 * np.array([D[n].mean(0) if n else D[i] for i, n in enumerate(nb)])
X = co + D
print("DƯỚI HÀM đỉnh", int((w > 0.1).sum()), "dời tối đa %.2f mm" % (np.linalg.norm(D, axis=1).max() * 1000))

corner = (~helper) & (np.abs(X[:, 0]) > 0.01) & (np.abs(X[:, 0]) < 0.035) & (X[:, 2] > zc - 0.012) & (X[:, 2] < zc + 0.015) \
    & (X[:, 1] < neck_y - 0.02)
idx = np.where(corner)[0]
for _ in range(CIT):
    avg = np.array([X[nb[i]].mean(0) if nb[i] else X[i] for i in idx])
    X[idx] = X[idx] * (1 - CLAM) + avg * CLAM
print("GÓC CẰM đỉnh", len(idx))
me.vertices.foreach_set("co", X.ravel()); me.update()
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
