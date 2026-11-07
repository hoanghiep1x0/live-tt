"""Tấm dáng mẫu của một điệu Mixamo: X Bot nhảy điệu đó, chụp N dáng rải đều cả vòng điệu, cùng một khung camera.

blender -b --factory-startup --python dang_mau.py -- <X Bot.fbx> <điệu.fbx> <thư mục ra> [--so 16] [--goc 0] [--khung a-b]
--goc: góc camera quanh người (0 = chính diện, 90 = người quay sang PHẢI màn hình = góc …P của sân khấu, 270 = quay sang trái, 180 = sau lưng).
Ra: <ra>/dang_NN.png (nền trắng, người xám đất sét) để ghép tấm mẫu.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

a = sys.argv[sys.argv.index("--") + 1:]
xbot, dieu, ra = a[:3]
so = int(a[a.index("--so") + 1]) if "--so" in a else 16
goc = float(a[a.index("--goc") + 1]) if "--goc" in a else 0.0
os.makedirs(ra, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)  # bỏ Cube, Camera, Light mặc định

bpy.ops.import_scene.fbx(filepath=xbot)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
luoi = [o for o in bpy.data.objects if o.type == "MESH"]
truoc = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=dieu)
moi = [o for o in bpy.data.objects if o not in truoc]
arm_dieu = next(o for o in moi if o.type == "ARMATURE")
act = arm_dieu.animation_data.action
for o in moi:
    bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data_create()
arm.animation_data.action = act
if hasattr(arm.animation_data, "action_slot") and act.slots:
    arm.animation_data.action_slot = act.slots[0]
# khoá hông theo x / y (mặt sàn Blender): nhảy tại chỗ như sân khấu (prepClip)
for fc in getattr(act, "fcurves", []):
    if fc.data_path.endswith('"].location') and "Hips" in fc.data_path and fc.array_index in (0, 1):
        v0 = fc.keyframe_points[0].co[1]
        for k in fc.keyframe_points:
            k.co[1] = v0; k.handle_left[1] = v0; k.handle_right[1] = v0
f0, f1 = act.frame_range
if "--khung" in a:  # chỉ lấy một đoạn của điệu dài (vd 6 giây đầu của Samba 20 giây): --khung 1-180
    f0, f1 = map(float, a[a.index("--khung") + 1].split("-"))
sc = bpy.context.scene
sc.frame_start, sc.frame_end = int(f0), int(f1)

# đất sét xám, nền trắng, đèn mềm
mat = bpy.data.materials.new("set"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.18, 0.19, 0.22, 1)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
for o in luoi:
    o.data.materials.clear(); o.data.materials.append(mat)
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = 384, 512
sc.render.film_transparent = False
sc.view_settings.view_transform = "Standard"
sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True
sc.world.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
for nm, en, rot in (("k", 3.0, (0.8, 0, 0.5)), ("f", 1.6, (1.1, 0, -1.6))):
    L = bpy.data.objects.new(nm, bpy.data.lights.new(nm, "SUN")); sc.collection.objects.link(L)
    L.data.energy = en; L.rotation_euler = rot

# khung camera chung: hộp bao người qua mọi dáng sẽ chụp
khung = [f0 + (f1 - f0) * i / so for i in range(so)]
lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
dg = bpy.context.evaluated_depsgraph_get()
for f in khung:
    sc.frame_set(int(round(f)))
    for o in luoi:
        oe = o.evaluated_get(dg); m = oe.to_mesh()
        for v in m.vertices:
            p = o.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
        oe.to_mesh_clear()
tam = (lo + hi) / 2
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
cam.data.ortho_scale = max((hi.z - lo.z) * 1.08, (max(hi.x - lo.x, hi.y - lo.y)) * 1.08 * 512 / 384)
g = math.radians(goc)
huong = Vector((math.sin(g), -math.cos(g), 0))  # người Mixamo quay mặt về -Y
cam.location = tam + huong * 10
cam.rotation_euler = (-huong).to_track_quat("-Z", "Y").to_euler()
for i, f in enumerate(khung):
    sc.frame_set(int(round(f)))
    sc.render.filepath = os.path.join(ra, f"dang_{i:02d}.png")
    bpy.ops.render.render(write_still=True)
print("XONG", so, "dáng, khung", int(f0), "-", int(f1))
