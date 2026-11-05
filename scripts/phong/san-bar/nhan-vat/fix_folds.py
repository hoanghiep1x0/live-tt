"""Gỡ khấc / nếp gập sót sau bọc ở nửa dưới mặt (góc hàm, cằm): làm mượt cục bộ quanh các mặt lưới gập gắt.

blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/fix_folds.py -- <ortho_b> <ra.blend> [--deg 40] [--iters 15] [--lam 0.5] [--jaw]
    [--z-lo <m dưới cằm>] [--z-hi <m trên cằm, âm = dưới cằm>] [--x-min <m>] [--x-max <m>] [--edge] [--any-y]

- Mặt gập: pháp tuyến lệch > --deg so với trung bình các mặt kề (cạnh chung). Chỉ xét vùng từ dưới cằm 2 cm tới ngang mũi, nửa
  trước đầu (--z-hi, --x-min thu hẹp: dải hàm hai bên), chừa hộp miệng (nửa miệng + 8 mm, ±1 cm quanh khoé; làm mượt môi thì môi hé), bỏ lưới phụ. Model-1: khấc nhỏ ở góc hàm phải + vệt tối cạnh đó (người dùng chỉ ra).
- Làm mượt Laplace các đỉnh của mặt gập + 2 vòng đỉnh quanh, các đỉnh khác đứng yên; áp cả cho HunyuanAligned? Không — tượng giữ
  nguyên (chỉ là nguồn màu / normal map).
"""
import json
import os
import sys

import bmesh
import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
odir, out = a[:2]
DEG = float(a[a.index("--deg") + 1]) if "--deg" in a else 40.0
IT = int(a[a.index("--iters") + 1]) if "--iters" in a else 15
LAM = float(a[a.index("--lam") + 1]) if "--lam" in a else 0.5

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
R, sc, cv = meta["R"], meta["scale"], meta["cv"]
zw = lambda k: cv + (R / 2 - lm[k][1]) / R * sc
z_lo, z_hi = zw("chin") - 0.02, zw("nose_tip")
if "--z-lo" in a:                                              # sàn vùng xét: dưới cằm bao nhiêu (m); mặc định 2 cm
    z_lo = zw("chin") - float(a[a.index("--z-lo") + 1])
if "--z-hi" in a:                                              # trần vùng xét: cao hơn cằm bao nhiêu (m); mặc định tới ngang mũi
    z_hi = zw("chin") + float(a[a.index("--z-hi") + 1])
EDGE = "--edge" in a        # lệch so với từng mặt kề (nếp gập dài, thoải: trung bình các mặt kề che mất)
X_MAX = float(a[a.index("--x-max") + 1]) if "--x-max" in a else 1.0     # chỉ giữa (dưới cằm): không đụng hai bên cổ dưới hàm
X_MIN = float(a[a.index("--x-min") + 1]) if "--x-min" in a else 0.0   # chừa giữa mặt (|x| nhỏ hơn) — chỉ xét dải hàm hai bên
x_mouth = abs((lm["mouth_l"][0] - lm["mouth_r"][0]) / 2) / R * sc + 0.008      # nửa bề ngang miệng + 8 mm
z_mouth = (zw("mouth_l") + zw("mouth_r")) / 2
in_mouth = lambda co: abs(co.x) < x_mouth and abs(co.z - z_mouth) < 0.01   # hộp miệng ±1 cm

body = bpy.data.objects["Body"]
for md in body.modifiers:
    md.show_viewport = False
helper = set()
for vg in body.vertex_groups:
    if vg.name.lower().startswith(("helper", "joint")):
        for v in body.data.vertices:
            if any(g.group == vg.index for g in v.groups):
                helper.add(v.index)
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
bm.normal_update()
yc = np.median([v.co.y for v in bm.verts]) if "--any-y" not in a else 1e9   # --any-y: cả mặt dưới hàm (sau "nửa trước")
fold = set()
for f in bm.faces:
    if any(v.index in helper for v in f.verts):
        continue
    c = f.calc_center_median()
    if not (z_lo < c.z < z_hi and c.y < yc and X_MIN <= abs(c.x) <= X_MAX) or in_mouth(c):
        continue                                                   # chừa miệng: làm mượt ở môi thì môi hé, lộ vạch trắng
    nb = [g for e in f.edges for g in e.link_faces if g is not f]
    if not nb:
        continue
    m = sum((g.normal for g in nb), f.normal * 0); m.normalize()
    dev = max(f.normal.angle(g.normal, 0) for g in nb) if EDGE else f.normal.angle(m, 0)
    if dev > np.radians(DEG):
        fold.add(f.index)
verts = {v for fi in fold for v in bm.faces[fi].verts if v.index not in helper}
for _ in range(2):
    verts |= {w for v in list(verts) for e in v.link_edges for w in (e.other_vert(v),) if w.index not in helper}
verts = {v for v in verts if not in_mouth(v.co)}
if "--jaw" in a:
    # dải hàm hai bên (từ dưới khoé miệng tới dưới cằm 1,5 cm, cách giữa mặt 2–7 cm): khấc trên đường viền hàm là chỗ lồi mềm,
    # không phải nếp gập → làm mượt nhẹ cả dải
    jaw = {v for v in bm.verts if v.index not in helper and 0.02 < abs(v.co.x) < 0.07 and z_lo + 0.005 < v.co.z < z_mouth - 0.006
           and v.co.y < yc}
    print("JAW dải hàm", len(jaw)); verts |= jaw
print("FOLDS mặt gập", len(fold), "đỉnh làm mượt", len(verts))
for _ in range(IT):
    new = {}
    for v in verts:
        nb = [e.other_vert(v).co for e in v.link_edges]
        avg = sum(nb, v.co * 0) / len(nb)
        new[v] = v.co * (1 - LAM) + avg * LAM
    for v, c in new.items():
        v.co = c
bm.to_mesh(body.data); bm.free(); body.data.update()
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
