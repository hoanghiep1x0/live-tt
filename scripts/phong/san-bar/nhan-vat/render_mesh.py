"""Chụp một mesh (glb/obj) ở 4 góc bằng chất liệu đất sét để so hình khối với ảnh mẫu.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_mesh.py -- <mesh> <tiền tố ảnh .png>
"""
import math
import sys

import bpy
from mathutils import Vector

src, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.lower().endswith((".glb", ".gltf")):
    bpy.ops.import_scene.gltf(filepath=src)
else:
    bpy.ops.wm.obj_import(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]

# đưa về tâm, cao 2 đơn vị, đáy ở z = 0
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
size = hi - lo
k = 2.0 / size.z
center = (lo + hi) / 2
clay = bpy.data.materials.new("clay"); clay.use_nodes = True
clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.75, 0.72, 0.7, 1)
clay.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
for o in meshes:
    o.location = (o.location - center) * k + Vector((0, 0, 1.0))
    o.scale = o.scale * k
    if "--color" not in sys.argv:
        o.data.materials.clear(); o.data.materials.append(clay)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth()
print("SIZE", tuple(round(v, 3) for v in size))

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.view_settings.view_transform = "Standard"  # AgX mặc định làm nhạt màu đỏ son
scene.render.resolution_x = scene.render.resolution_y = 700
world = bpy.data.worlds.new("w"); scene.world = world
world.use_nodes = True; world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.52, 0.55, 1)
target = Vector((0, 0, 1.3))
for loc, e in (((2, -3, 3), 380), ((-3, -2, 1), 160), ((0, 3, 3), 250)):
    L = bpy.data.lights.new("l", "AREA"); L.energy = e; L.size = 3
    lo_ = bpy.data.objects.new("l", L); scene.collection.objects.link(lo_)
    lo_.location = loc; lo_.rotation_euler = (target - lo_.location).to_track_quat("-Z", "Y").to_euler()
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
cam.data.lens = 70; scene.camera = cam
# Hunyuan xuất glTF: mặt nhân vật hướng -Y sau khi nhập vào Blender (Y-up → Z-up)
for i, ang in enumerate((0, 35, 90, 180)):
    a = math.radians(ang)
    cam.location = target + Vector((math.sin(a) * 4.2, -math.cos(a) * 4.2, 0.1))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = f"{out}_{i}.png"
    bpy.ops.render.render(write_still=True)
print("RENDERED", out)
