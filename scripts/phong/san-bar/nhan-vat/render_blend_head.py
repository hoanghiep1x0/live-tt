"""Chụp đầu người MPFB trong file .blend (sau khi bọc) ở vài góc, đất sét hoặc màu.

blender -b <file.blend> --python scripts/phong/san-bar/nhan-vat/render_blend_head.py -- <tiền tố ảnh> [--clay] [--show-hunyuan]
"""
import math
import sys

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
out = argv[0]
scene = bpy.context.scene
body = bpy.data.objects["Body"]
for o in bpy.data.objects:
    if o.name == "HunyuanAligned":
        o.hide_render = "--show-hunyuan" not in argv
        if "--show-hunyuan" in argv:
            body.hide_render = True
if "--clay" in argv:
    clay = bpy.data.materials.new("clay"); clay.use_nodes = True
    clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.78, 0.68, 0.64, 1)
    for o in bpy.data.objects:
        if o.type == "MESH" and not o.name.startswith("Body."):
            o.data.materials.clear(); o.data.materials.append(clay)
dg = bpy.context.evaluated_depsgraph_get()
ev = body.evaluated_get(dg); m = ev.to_mesh()
P = np.array([body.matrix_world @ v.co for v in m.vertices]); ev.to_mesh_clear()
top = P[:, 2].max()
c = Vector((0, float(P[P[:, 2] > top - 0.25, 1].mean()), top - 0.13))
scene.render.engine = "BLENDER_EEVEE"; scene.view_settings.view_transform = "Standard"
scene.render.resolution_x = scene.render.resolution_y = 700
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.29, 0.31, 1)
for loc, e in (((0.6, -1.2, 0.5), 14), ((-1.0, -0.8, 0.2), 5), ((0, 1.0, 0.6), 8)):
    L = bpy.data.lights.new("l", "AREA"); L.energy = e; L.size = 1.2
    lo = bpy.data.objects.new("l", L); scene.collection.objects.link(lo)
    lo.location = c + Vector(loc); lo.rotation_euler = (c - lo.location).to_track_quat("-Z", "Y").to_euler()
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
cam.data.lens = 85; scene.camera = cam
dist = 0.42 if "--close" in argv else 1.15
if "--close" in argv:
    c = c + Vector((0, 0, 0.035))     # khung quanh mắt
for i, ang in enumerate((0, 35, 90)):
    a = math.radians(ang)
    cam.location = c + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.02))
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = f"{out}_{i}.png"
    bpy.ops.render.render(write_still=True)
print("RENDERED", out)
