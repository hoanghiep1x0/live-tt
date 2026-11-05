"""Thu gọn mũi: bóp hẹp sống mũi + đầu mũi theo chiều ngang, thu nhỏ nhẹ đầu mũi (giữ đỉnh mũi đúng chỗ).

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/slim_nose.py -- <vào.glb> <ra.glb> <thư mục ortho> [--width 0.9] [--tip 0.94]
Vùng mũi lấy từ điểm mốc trên ảnh chụp tượng chính diện (nose_tip, nose_base, eye_*_in).
"""
import json
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, odir = argv[:3]
WIDTH = float(argv[argv.index("--width") + 1]) if "--width" in argv else 0.9
TIP = float(argv[argv.index("--tip") + 1]) if "--tip" in argv else 0.94

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = ob
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
P = np.array([v.co for v in me.vertices])
meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())


def pt(k):
    x = (lm[k][0] - R / 2) / R * sc + cu
    z = cv + (R / 2 - lm[k][1]) / R * sc
    hit = bvh.ray_cast(Vector((x, -5, z)), Vector((0, 1, 0)), 10)[0]
    return np.array(hit)


tip, base = pt("nose_tip"), pt("nose_base")
eye_z = (pt("eye_l_in")[2] + pt("eye_r_in")[2]) / 2
mid_x = (tip[0] + base[0]) / 2
half_w = abs(pt("nostril_l")[0] - pt("nostril_r")[0]) / 2
# vùng mũi: từ ngang khoé mắt trong xuống dưới chân mũi một chút, rộng ~1,6 lần nửa bề ngang cánh mũi, chỉ mặt trước
z_top, z_bot = eye_z, base[2] - 0.02
depth_cut = tip[1] + 0.20                         # cánh mũi nằm lùi sau đầu mũi ~0,1–0,15 đơn vị
wz = np.clip((P[:, 2] - z_bot) / 0.03, 0, 1) * np.clip((z_top - P[:, 2]) / 0.06, 0, 1)
wx = np.clip(1 - np.abs(P[:, 0] - mid_x) / (half_w * 2.5), 0, 1) ** 1.5
wy = np.clip((depth_cut - P[:, 1]) / 0.06, 0, 1)
w = wz * wx * wy
def width_at(Q, z):  # bề ngang phần nhô ra phía trước (mũi + má) ở độ cao z
    m = (np.abs(Q[:, 2] - z) < 0.006) & (Q[:, 1] < tip[1] + 0.12) & (np.abs(Q[:, 0] - mid_x) < 0.2)
    return Q[m, 0].max() - Q[m, 0].min() if m.any() else 0
P2 = P.copy()
P2[:, 0] = mid_x + (P[:, 0] - mid_x) * (1 - (1 - WIDTH) * w)
# đầu mũi nhỏ lại quanh tâm đầu mũi (giữ đỉnh)
c = tip + np.array([0, 0.025, -0.005])
wt = np.clip(1 - np.linalg.norm(P - tip, axis=1) / 0.07, 0, 1) ** 2 * wy
P2 = P2 + (c - P2) * ((1 - TIP) * wt)[:, None]
for zz, nm in ((base[2] + 0.02, "canh mui"), (tip[2], "dau mui"), ((tip[2] + eye_z) / 2, "song mui")):
    print("WIDTH", nm, round(width_at(P, zz) * 220, 1), "->", round(width_at(P2, zz) * 220, 1), "mm")
me.vertices.foreach_set("co", P2.astype(np.float32).ravel()); me.update()
bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("NOSE verts", int((w > 0.01).sum()), "tip verts", int((wt > 0.01).sum()), "DONE", out)
