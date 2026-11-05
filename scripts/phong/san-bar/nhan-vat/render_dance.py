"""Chụp dải khung một điệu nhảy từ file GLB (kiểm tra tóc bay, mi, mắt bám theo) — mở chính file xuất ra, không phải .blend.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_dance.py -- <model.glb> <điệu> <ra.png> [--frames 0,8,16,...] \
    [--views back,side] [--size 360] [--outfit <id bộ đồ>]

- Camera bám theo xương hông, nhìn ngang vai; mỗi hàng một hướng nhìn (back = sau lưng chếch 30°, side = bên trái, front,
  low = từ dưới thấp nhìn lên — soi váy, đáy quần khi nhảy).
- --outfit: GLB nhiều bộ (rig_base --outfits) — chỉ hiện món của bộ đó và ẩn da dưới bộ đó (bit `_COVER`) như three.js;
  thiếu thì mọi món hiện chồng lên nhau.
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

a = sys.argv[sys.argv.index("--") + 1:]
glb, dance, out = a[:3]
FR = [int(x) for x in a[a.index("--frames") + 1].split(",")] if "--frames" in a else list(range(0, 120, 12))
VW = (a[a.index("--views") + 1] if "--views" in a else "back,side").split(",")
SZ = int(a[a.index("--size") + 1]) if "--size" in a else 360
BO = a[a.index("--outfit") + 1] if "--outfit" in a else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
if BO:
    import bmesh
    ds = next((json.loads(v) for o in bpy.data.objects for v in [o.get("outfits")] if isinstance(v, str) and v.startswith("[")), None)
    assert ds, "GLB không có extras.outfits (xuất bằng rig_base --outfits)"
    bit = [x["id"] for x in ds].index(BO)
    for o in [o for o in bpy.data.objects if o.type == "MESH"]:
        v = o.get("outfits") or o.data.get("outfits")
        if isinstance(v, str) and not v.startswith("["):
            o.hide_render = BO not in v.split(",")
        at = o.data.attributes.get("_COVER")
        if at is not None:
            cv = np.zeros(len(o.data.vertices)); at.data.foreach_get("value", cv)
            bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
            bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.nonzero((cv.astype(int) >> bit) & 1)[0]], context="VERTS")
            bm.to_mesh(o.data); bm.free()
            print("CHE", o.name, int(((cv.astype(int) >> bit) & 1).sum()), "đỉnh ẩn")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
act = next(x for x in bpy.data.actions if x.name.startswith(dance))
rig.animation_data_create()
for t in rig.animation_data.nla_tracks:
    t.mute = True
rig.animation_data.action = act
if getattr(act, "slots", None):
    rig.animation_data.action_slot = act.slots[0]
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"; sc.view_settings.view_transform = "Standard"
sc.render.resolution_x = SZ; sc.render.resolution_y = int(SZ * 1.25)
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.31, 0.33, 1)
for loc, e in (((1.5, -2.5, 2.0), 150), ((-2.0, 2.0, 1.8), 120), ((0, 0, 4), 60)):
    L = bpy.data.lights.new("l", "AREA"); L.energy = e; L.size = 2.5
    lo = bpy.data.objects.new("l", L); sc.collection.objects.link(lo); lo.location = loc
    lo.rotation_euler = (Vector((0, 0, 1)) - lo.location).to_track_quat("-Z", "Y").to_euler()
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 60
DIR = {"back": (math.radians(150), 0.2), "side": (math.radians(90), 0.1), "front": (math.radians(-10), 0.1),
       "low": (math.radians(-20), -0.55)}
hips = rig.pose.bones.get("mixamorig:Hips") or rig.pose.bones[0]
tiles = []
for v in VW:
    az, el = DIR[v]
    for f in FR:
        sc.frame_set(f)
        c = rig.matrix_world @ hips.head + Vector((0, 0, 0.45))
        d = Vector((math.sin(az), -math.cos(az), el)).normalized()
        cam.location = c + d * 2.6; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
        p = os.path.join(os.path.dirname(out), f"_rd_{v}_{f}.png"); sc.render.filepath = p
        bpy.ops.render.render(write_still=True); tiles.append(p)
im = [bpy.data.images.load(p) for p in tiles]
Wt, Ht = im[0].size; cols = len(FR); rows = len(VW)
canvas = np.zeros((Ht * rows, Wt * cols, 4), np.float32)
for k, x in enumerate(im):
    px = np.empty(Wt * Ht * 4, np.float32); x.pixels.foreach_get(px); px = px.reshape(Ht, Wt, 4)
    r_, c_ = divmod(k, cols); canvas[(rows - 1 - r_) * Ht:(rows - r_) * Ht, c_ * Wt:(c_ + 1) * Wt] = px
o = bpy.data.images.new("strip", Wt * cols, Ht * rows); o.pixels.foreach_set(canvas.ravel())
o.filepath_raw = out; o.file_format = "PNG"; o.save()
for p in tiles:
    os.remove(p)
print("SAVED", out)
