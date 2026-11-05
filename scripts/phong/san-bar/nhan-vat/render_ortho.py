"""Chụp mesh (đất sét, chiếu song song) ở các góc cho trước để tìm điểm mốc trên chính hình khối 3D.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_ortho.py -- <mesh.glb> <thư mục ra> <góc,...>
Ghi <thư mục>/ortho_<góc>.png và ortho.json: với mỗi góc, cách đổi pixel ↔ toạ độ (u, v) của mesh:
  u = P · right, v = z (giống project_texture.py);  x_px = (u - cu) / scale * R + R/2;  y_px(từ trên) = R/2 - (v - cv) / scale * R
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

src, outdir, angles = sys.argv[sys.argv.index("--") + 1:][:3]
# --color: giữ màu thật (để so chồng với ảnh mẫu); mặc định đất sét (để tìm điểm mốc)
angles = [int(a) for a in angles.split(",")]
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = o
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
P = np.array([v.co for v in o.data.vertices])
top = P[:, 2].max()
head = P[P[:, 2] > top - 1.1]                     # đầu và cổ (1 đơn vị ≈ đỉnh đầu → cằm)
clay = bpy.data.materials.new("clay"); clay.use_nodes = True
b = clay.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.8, 0.66, 0.6, 1); b.inputs["Roughness"].default_value = 0.55
if "--color" not in sys.argv:
    o.data.materials.clear(); o.data.materials.append(clay)
bpy.ops.object.shade_smooth()

scene = bpy.context.scene
R = 1024
scene.render.engine = "BLENDER_EEVEE"; scene.render.resolution_x = scene.render.resolution_y = R
scene.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("w"); scene.world = world
world.use_nodes = True; world.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.78, 0.8, 1)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
cam.data.type = "ORTHO"; scene.camera = cam
L = bpy.data.lights.new("key", "SUN"); L.energy = 1.6
lo = bpy.data.objects.new("key", L); scene.collection.objects.link(lo)
L2 = bpy.data.lights.new("fill", "SUN"); L2.energy = 0.5
lo2 = bpy.data.objects.new("fill", L2); scene.collection.objects.link(lo2)

meta = {}
for a in angles:
    r = math.radians(a)
    d = np.array([math.sin(r), -math.cos(r), 0.0]); right = np.cross(-d, [0, 0, 1])
    u = head @ right; v = head[:, 2]
    cu, cv = (u.min() + u.max()) / 2, top - 0.62
    scale = 1.45
    center = Vector((0, 0, cv)) + Vector(tuple(right * cu))
    cam.location = center + Vector(tuple(d * 5))
    cam.rotation_euler = (-Vector(tuple(d))).to_track_quat("-Z", "Y").to_euler()
    cam.data.ortho_scale = scale
    lo.rotation_euler = (-Vector(tuple(d)) + Vector((0.3, 0.2, -0.6))).to_track_quat("-Z", "Y").to_euler()
    lo2.rotation_euler = (-Vector(tuple(d)) + Vector((-0.4, 0, 0.2))).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(outdir, f"ortho_{a}.png")
    bpy.ops.render.render(write_still=True)
    meta[f"ortho_{a}.png"] = {"angle": a, "cu": float(cu), "cv": float(cv), "scale": scale, "R": R}
json.dump(meta, open(os.path.join(outdir, "ortho.json"), "w"), indent=1)
print("ORTHO", meta)
