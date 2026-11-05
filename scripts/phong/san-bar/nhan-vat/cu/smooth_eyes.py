"""Làm phẳng nhẹ khe mắt của tượng (để mắt vẽ từ ảnh hiện trọn, không bị mí đất cắt ngang).

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/smooth_eyes.py -- <vào.glb> <ra.glb> <thư mục ortho> [--radius 0.055] [--repeat 25]
Vùng mắt lấy từ điểm mốc trên ảnh chụp tượng chính diện (ortho_0.png trong lm_ortho.json).
"""
import json
import os
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, odir = argv[:3]
radius = float(argv[argv.index("--radius") + 1]) if "--radius" in argv else 0.055
repeat = int(argv[argv.index("--repeat") + 1]) if "--repeat" in argv else 25

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = ob
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
P = np.array([v.co for v in ob.data.vertices])
vg = ob.vertex_groups.new(name="eyes")
for side in ("l", "r"):
    pts = [lm[f"eye_{side}_{k}"] for k in ("in", "out", "top", "bot")]
    cx = np.mean([(p[0] - R / 2) / R * sc + cu for p in pts])
    cz = np.mean([cv + (R / 2 - p[1]) / R * sc for p in pts])
    front = P[:, 1] < np.percentile(P[:, 1], 30)          # chỉ mặt trước, không lan ra sau đầu
    d = np.hypot(P[:, 0] - cx, (P[:, 2] - cz) * 1.6)       # vùng mắt dẹt theo chiều dọc
    w = np.clip(1 - d / radius, 0, 1) ** 1.5 * front
    for i in np.where(w > 0)[0]:
        vg.add([int(i)], float(w[i]), "ADD")
    print("EYE", side, "verts", int((w > 0).sum()))
m = ob.modifiers.new("smooth", "SMOOTH"); m.vertex_group = "eyes"; m.factor = 0.8; m.iterations = repeat
bpy.ops.object.modifier_apply(modifier="smooth")
bpy.ops.object.shade_smooth()  # xuất glTF với mặt phẳng (flat) sẽ tách rời đỉnh từng mặt
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("DONE", out)
