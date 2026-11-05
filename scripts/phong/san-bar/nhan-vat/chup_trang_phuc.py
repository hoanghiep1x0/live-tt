"""Ảnh nhỏ từng bộ trang phục (ô `gallery` trong modal cấu hình module vũ công) — chụp trên base đã mặc đủ đồ.

blender -b <base_do.blend> --python scripts/phong/san-bar/nhan-vat/chup_trang_phuc.py -- <bộ đồ.json> <thư mục ra> \
    [--size 240x360] [--goc 20]

- <bộ đồ.json>: cùng file đưa cho `rig_base --outfits` (vd D:/Assets/parts/trang-phuc/model-1.json) → ra `<id>.webp`
  đúng id module dùng.
- Mỗi bộ: chỉ hiện các món của bộ, bật đúng bộ ẩn da dưới đồ (`Delete.<món>` của MPFB), nền trong suốt, nhìn chéo
  `--goc` độ từ chính diện, cả người (thấy cả giày).
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

a = sys.argv[sys.argv.index("--") + 1:]
OUTFITS = json.load(open(a[0], encoding="utf-8"))["outfits"]
OUT = a[1]
W, H = (int(x) for x in (a[a.index("--size") + 1] if "--size" in a else "240x360").split("x"))
GOC = float(a[a.index("--goc") + 1]) if "--goc" in a else 20.0
os.makedirs(OUT, exist_ok=True)

body = bpy.data.objects["Body"]
for o in list(bpy.data.objects):
    if o.name == "HunyuanAligned":
        o.hide_render = True
mon = {o.name.split(".", 1)[1]: o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Body.")}
CO_DINH = ("high-poly", "eyelash", "eyebrow")

sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = W * 2, H * 2       # chụp gấp đôi rồi để trình duyệt thu nhỏ: nét hơn
sc.render.film_transparent = True
sc.render.image_settings.file_format = "WEBP"
sc.render.image_settings.color_mode = "RGBA"
sc.render.image_settings.quality = 82
sc.view_settings.view_transform = "Standard"
cam = bpy.data.objects.new("_cam", bpy.data.cameras.new("_cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 85
cam.data.sensor_fit = "VERTICAL"
for nm, en, rot in (("_key", 3.2, (0.95, 0.0, 0.5)), ("_fill", 1.2, (1.2, 0.0, -1.4)), ("_rim", 2.0, (1.9, 0.0, 3.0))):
    L = bpy.data.objects.new(nm, bpy.data.lights.new(nm, "SUN")); sc.collection.objects.link(L)
    L.data.energy = en; L.rotation_euler = rot
w = sc.world or bpy.data.worlds.new("_w"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.5, 0.5, 0.52, 1); bg.inputs[1].default_value = 0.6

X = [body.matrix_world @ v.co for v in body.data.vertices]
zmin, zmax = min(p.z for p in X), max(p.z for p in X)
c = Vector((0, 0, (zmin + zmax) / 2))
cao = (zmax - zmin) * 1.08
d = cao / 2 / math.tan(cam.data.angle_y / 2)
r = math.radians(GOC)
cam.location = c + Vector((math.sin(r) * d, -math.cos(r) * d, 0.0))
cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()

for of in OUTFITS:
    items = set(of["items"])
    for n, o in mon.items():
        o.hide_render = not (n in items or n.startswith(CO_DINH))
    for md in body.modifiers:
        if md.type == "MASK" and md.name.lower().startswith("delete."):
            md.show_render = md.name.split(".", 1)[1] in items
    sc.render.filepath = os.path.join(OUT, of["id"] + ".webp")
    bpy.ops.render.render(write_still=True)
    print("ANH", of["id"], sc.render.filepath)
