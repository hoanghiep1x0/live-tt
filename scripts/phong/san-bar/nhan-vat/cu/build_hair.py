"""Dựng tóc dài rẽ ngôi giữa (theo ảnh D:\\Assets\\model-1 tóc) cho đầu Hunyuan đã tô màu.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/build_hair.py -- <head.glb> <out.glb>

Toạ độ của đầu (đo bằng measure_head.py): mặt hướng -Y, đỉnh đầu z ≈ 1.0, 1 đơn vị ≈ 22 cm.
Tóc gồm: vỏ ôm sọ (tách từ chính lưới đầu rồi nở ra), búi vặn sau gáy, mảng tóc dài sau lưng,
hai lọn trước tai. Tất cả dùng chung một texture sợi tóc tự sinh.
"""
import math
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

src, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
head = next(o for o in bpy.data.objects if o.type == "MESH")
head.name = "Head"
bpy.context.view_layer.objects.active = head
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
rng = np.random.default_rng(7)

# ---------- texture sợi tóc ----------
TS = 1024
def strand_texture():
    x = np.arange(TS)
    base = np.zeros((TS, TS, 4), np.float32)
    # nhiều lớp sợi: mỗi cột có độ sáng riêng, lệch nhẹ theo chiều dọc
    for k, (amp, freq) in enumerate(((0.5, 3), (0.3, 11), (0.2, 37))):
        ph = rng.uniform(0, 1, TS)
        col = 0.6 + amp * np.sin(2 * np.pi * (x / TS * freq * 40 + ph * 6))
        base[..., 0] += col[None, :] / 3
    lum = base[..., 0]
    lum += 0.15 * rng.standard_normal((1, TS)).astype(np.float32)
    lum = np.clip(lum, 0.2, 1.2)
    y = np.linspace(0, 1, TS)[:, None]
    shine = 0.35 * np.exp(-((y - 0.75) / 0.06) ** 2)            # dải bóng ngang (ánh tóc mượt)
    dark = np.array([0.030, 0.020, 0.020]); hl = np.array([0.20, 0.15, 0.14])
    rgb = dark[None, None, :] * lum[..., None] + hl[None, None, :] * shine[..., None] * lum[..., None]
    base[..., :3] = rgb
    # alpha: đặc ở trên, ngọn tóc tưa so le ở dưới (v = 0 là ngọn)
    tip = rng.uniform(0.0, 0.18, TS)[None, :]
    base[..., 3] = np.clip((y - tip) / 0.08, 0, 1)
    img = bpy.data.images.new("hair_strands", TS, TS, alpha=True)
    img.pixels[:] = base.ravel()
    img.colorspace_settings.name = "sRGB"
    return img

tex = strand_texture()
tex.pack()  # nhúng ảnh vào file xuất (ảnh tạo trong bộ nhớ, không có file trên đĩa)
hair_mat = bpy.data.materials.new("Hair"); hair_mat.use_nodes = True
nt = hair_mat.node_tree; b = nt.nodes["Principled BSDF"]
ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = tex
nt.links.new(ti.outputs["Color"], b.inputs["Base Color"]); nt.links.new(ti.outputs["Alpha"], b.inputs["Alpha"])
b.inputs["Roughness"].default_value = 0.38
hair_mat.blend_method = "HASHED" if hasattr(hair_mat, "blend_method") else None
hair_mat.surface_render_method = "DITHERED" if hasattr(hair_mat, "surface_render_method") else None


def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    me.materials.append(hair_mat)
    for p in me.polygons: p.use_smooth = True
    return ob


# ---------- 1. vỏ tóc ôm sọ: các mặt của đầu nằm trên đường chân tóc, nở ra theo pháp tuyến ----------
def hairline(x, y):
    """Độ cao chân tóc theo vị trí quanh đầu (y: -0.55 trán → +0.7 gáy)."""
    return np.interp(y, [-0.6, -0.3, -0.05, 0.15, 0.35, 0.55, 0.75], [0.66, 0.63, 0.52, 0.40, 0.24, 0.12, 0.08])

bm = bmesh.new(); bm.from_mesh(head.data)
bm.verts.ensure_lookup_table()
keep = set()
for v in bm.verts:
    x, y, z = v.co
    ear = abs(x) > 0.40 and 0.12 < z < 0.46 and -0.12 < y < 0.28
    if z > hairline(x, y) and not ear and z > 0.0:
        keep.add(v.index)
dele = [f for f in bm.faces if not all(v.index in keep for v in f.verts)]
bmesh.ops.delete(bm, geom=dele, context="FACES")
bm.normal_update()
for v in bm.verts:  # dày hơn ở đỉnh (phồng chân tóc), mỏng ở mép
    t = np.clip((v.co.z - 0.3) / 0.7, 0, 1)
    v.co += v.normal * (0.012 + 0.03 * t)
uv = bm.loops.layers.uv.new("UVMap")
for f in bm.faces:
    for l in f.loops:
        x, y, z = l.vert.co
        az = math.atan2(x, y)          # quanh trục đứng: sợi chạy dọc từ ngôi giữa xuống
        l[uv].uv = (az / math.pi * 2.0, 0.25 + z * 0.75)
cap = new_obj("HairCap", bm)
# lớp nền: đặc, mờ (không bóng, không viền dày) — chỉ để da đầu không lộ qua kẽ dải tóc
cap_mat = bpy.data.materials.new("HairBase"); cap_mat.use_nodes = True
cb = cap_mat.node_tree.nodes["Principled BSDF"]
cb.inputs["Base Color"].default_value = (0.022, 0.015, 0.014, 1); cb.inputs["Roughness"].default_value = 0.9
cap.data.materials.clear(); cap.data.materials.append(cap_mat)

# ---------- dải tóc (hair card): một dải hẹp chạy theo đường cong, ngọn thon ----------
def cards(name, paths, widths):
    """paths: danh sách các đường (list Vector từ chân tóc tới ngọn); widths: bề rộng mỗi dải ở chân."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    for path, w0 in zip(paths, widths):
        n = len(path); prev = None
        u0 = rng.uniform(0, 3)                       # mỗi dải lấy một khoảng khác trên texture sợi
        for j, p in enumerate(path):
            t = j / (n - 1)
            tang = (path[min(j + 1, n - 1)] - path[max(j - 1, 0)]).normalized()
            out_ = Vector((p.x, p.y - 0.05, 0)).normalized()  # hướng ra ngoài đầu (mặt phẳng ngang)
            side = tang.cross(out_).normalized()
            w = w0 * (1 - 0.65 * t ** 1.5)
            a = bm.verts.new(p - side * w / 2); b_ = bm.verts.new(p + side * w / 2)
            if prev:
                f = bm.faces.new((prev[0], prev[1], b_, a))
                v1, v0 = 1 - (j - 1) / (n - 1), 1 - t
                for l, uvv in zip(f.loops, ((u0, v1), (u0 + 0.35, v1), (u0 + 0.35, v0), (u0, v0))):
                    l[uvl].uv = uvv
            prev = (a, b_)
    return new_obj(name, bm)


def curve(pts, n=24):
    """Nội suy mượt (Catmull-Rom đơn giản) qua các điểm điều khiển."""
    P = [Vector(p) for p in pts]; out_ = []
    for k in range(n):
        s = k / (n - 1) * (len(P) - 1); i = min(int(s), len(P) - 2); f = s - i
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        out_.append(0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f
                           + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f))
    return out_


def scalp_r(z):  # bán kính đầu theo độ cao (từ measure_head.py), cộng lớp tóc
    return np.interp(z, [0.1, 0.3, 0.5, 0.7, 0.85, 0.95], [0.52, 0.52, 0.58, 0.55, 0.43, 0.27]) + 0.035


# ---------- 2. tóc dài sau lưng: ~50 dải xoè quạt từ đỉnh, buông qua gáy xuống giữa lưng ----------
back_paths, back_w = [], []
for layer, cnt in ((0, 60), (1, 50)):        # hai lớp so le để không hở kẽ
    for k in range(cnt):
        ang = (k / (cnt - 1) - 0.5) * math.radians(190) + rng.normal(0, 0.02) + layer * 0.03
        L = 2.0 + rng.uniform(-0.3, 0.15)
        pts = []
        for z in (0.93, 0.75, 0.55, 0.3):
            r = scalp_r(z) - 0.02 + layer * 0.015
            pts.append((math.sin(ang) * r, 0.04 + math.cos(ang) * r, z))
        for t in (0.35, 0.7, 1.0):  # rời đầu, buông xuống lưng
            z = 0.3 - L * t
            r = 0.52 + 0.08 * t + layer * 0.02
            pts.append((math.sin(ang) * r * (1 - 0.2 * t) + rng.normal(0, 0.015),
                        0.1 + math.cos(ang) * r * 0.85 + 0.08 * t, z))
        back_paths.append(curve(pts, 30)); back_w.append(rng.uniform(0.08, 0.11))
cards("HairBack", back_paths, back_w)

# ---------- 3. hai lọn trước tai ôm mặt, buông trước vai ----------
lock_paths, lock_w = [], []
for side in (-1, 1):
    for k in range(9):
        jx, jy = rng.normal(0, 0.015, 2)
        L = 1.35 + rng.uniform(-0.15, 0.1)
        pts = [(side * (0.20 + 0.02 * k), -0.38 + 0.02 * k, 0.88),       # từ ngôi giữa
               (side * (0.40 + jx), -0.30 + jy, 0.62),                     # vén qua thái dương
               (side * (0.47 + jx), -0.20 + jy, 0.30),                     # trước tai
               (side * (0.50 + jx), -0.24 + jy, 0.30 - L * 0.5),
               (side * (0.52 + jx), -0.28 + jy, 0.30 - L)]
        lock_paths.append(curve(pts, 28)); lock_w.append(rng.uniform(0.05, 0.08))
cards("HairLocks", lock_paths, lock_w)

# ---------- 3b. lớp dải phủ đỉnh đầu từ ngôi giữa (che mép vỏ, cho ra nếp tóc) ----------
# hộp sọ xấp xỉ một mặt cầu tâm C, bán kính R (từ measure_head.py); ngôi giữa chạy dọc đỉnh (x = 0)
C = Vector((0, 0.06, 0.42)); R = 0.60
top_paths, top_w = [], []
for side in (-1, 1):
    for k in range(24):
        y = -0.46 + 0.8 * k / 23 + rng.normal(0, 0.01)
        pts = []
        for th in (0.03, 0.35, 0.75, 1.15, 1.45):    # góc từ đỉnh xuống hai bên (rad)
            rr = R + 0.03 + 0.01 * th
            dy = (y - C.y) * (1 - 0.15 * th) + 0.08 * th  # chải nhẹ về sau
            h = math.sqrt(max(rr * rr - dy * dy, 0.01))
            pts.append((side * h * math.sin(th), C.y + dy, C.z + h * math.cos(th)))
        top_paths.append(curve(pts, 18)); top_w.append(rng.uniform(0.09, 0.13))
cards("HairTop", top_paths, top_w)

# ---------- 4. ôm sát sọ: phần chân tóc bám bề mặt đầu (Shrinkwrap), càng xuống ngọn càng tự do ----------
def wrap(ob, z_full, z_free, offset):
    vg = ob.vertex_groups.new(name="wrap")
    for v in ob.data.vertices:
        w = float(np.clip((v.co.z - z_free) / (z_full - z_free), 0, 1))
        vg.add([v.index], w, "REPLACE")
    m = ob.modifiers.new("hug", "SHRINKWRAP"); m.target = head; m.wrap_method = "NEAREST_SURFACEPOINT"
    m.wrap_mode = "OUTSIDE_SURFACE"; m.offset = offset; m.vertex_group = "wrap"
    ob.modifiers.move(len(ob.modifiers) - 1, 0)

wrap(bpy.data.objects["HairTop"], 0.5, 0.25, 0.022)
wrap(bpy.data.objects["HairBack"], 0.45, 0.15, 0.03)
wrap(bpy.data.objects["HairLocks"], 0.55, 0.3, 0.02)
cap_mat.use_backface_culling = False
cap.modifiers.new("thin", "SOLIDIFY").thickness = 0.004  # vỏ mỏng hai mặt, không lộ viền bóng

print("HAIR PARTS", [o.name for o in bpy.data.objects if o.name.startswith("Hair")])
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True)
print("DONE", out)
