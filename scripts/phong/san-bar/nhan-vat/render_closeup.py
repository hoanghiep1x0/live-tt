"""Chụp cận một vùng mặt (mặc định miệng) của mesh, chiếu song song, để soi lỗi hình khối/màu.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_closeup.py -- <mesh.glb> <ra.png> [--z 0.0] [--size 0.35] [--color]
z: độ cao tâm khung (đơn vị mesh, đỉnh đầu ≈ 1.0, miệng ≈ 0.0); size: bề rộng khung.
"""
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[:2]
z = float(argv[argv.index("--z") + 1]) if "--z" in argv else 0.0
size = float(argv[argv.index("--size") + 1]) if "--size" in argv else 0.35
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
clay = bpy.data.materials.new("clay"); clay.use_nodes = True
clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.78, 0.68, 0.64, 1)
for o in bpy.data.objects:
    if o.type == "MESH":
        if "--color" not in argv:
            o.data.materials.clear(); o.data.materials.append(clay)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"; scene.view_settings.view_transform = "Standard"
scene.render.resolution_x = scene.render.resolution_y = 800
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
L = bpy.data.lights.new("k", "SUN"); L.energy = 2.2
lo = bpy.data.objects.new("k", L); scene.collection.objects.link(lo); lo.rotation_euler = (1.1, 0.25, 0.3)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); scene.collection.objects.link(cam)
cam.data.type = "ORTHO"; cam.data.ortho_scale = size; scene.camera = cam
cam.location = (0, -4, z); cam.rotation_euler = (Vector((0, 1, 0))).to_track_quat("-Z", "Z").to_euler()
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print("RENDERED", out)
