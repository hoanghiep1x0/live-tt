"""Thêm mi mắt 3D (dải mi rời, vểnh, dài dần ra đuôi mắt) vào đầu đã tô màu.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/build_lashes.py -- <head.glb> <ra.glb> <thư mục ortho> [--len 0.06] [--curl 0.6]

Đường mí lấy từ điểm mốc lid_{l,r}_{up,lo}_* trên ảnh chụp tượng chính diện (ortho_0.png), bắn tia vào mặt
để có vị trí 3D. Đơn vị mesh ≈ 220 mm → --len 0.06 ≈ mi dài 13 mm ở đuôi mắt.
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, odir = argv[:3]
L_MAX = float(argv[argv.index("--len") + 1]) if "--len" in argv else 0.06
CURL = float(argv[argv.index("--curl") + 1]) if "--curl" in argv else 0.6
rng = np.random.default_rng(3)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
head = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = head
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(head, dg)

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]


def on_face(px):
    x = (px[0] - R / 2) / R * sc + cu
    z = cv + (R / 2 - px[1]) / R * sc
    hit, nrm, _, _ = bvh.ray_cast(Vector((x, -5, z)), Vector((0, 1, 0)), 10)
    return (hit, nrm) if hit else (None, None)


# ---------- vân mi: nhiều sợi mảnh, chân đậm, ngọn thon, nền trong suốt ----------
TS = 512
img = np.zeros((TS, TS, 4), np.float32)
for k in range(160):
    x0 = rng.uniform(0.02, 0.98) * TS
    lean = rng.normal(0, 0.06) * TS
    length = rng.uniform(0.6, 1.0) * TS
    for j in range(int(length)):
        t = j / TS                                      # v = 0 ở chân mi (đáy ảnh)
        x = int(x0 + lean * t * t)
        w = max(1, int(3 * (1 - j / length)))
        if 0 <= x < TS:
            img[j, max(0, x - w // 2):x + w // 2 + 1, 3] = np.maximum(img[j, max(0, x - w // 2):x + w // 2 + 1, 3], 1 - 0.6 * j / length)
img[..., :3] = 0.015
im = bpy.data.images.new("lash", TS, TS, alpha=True); im.pixels[:] = img.ravel(); im.pack()
mat = bpy.data.materials.new("Lashes"); mat.use_nodes = True
nt = mat.node_tree; b = nt.nodes["Principled BSDF"]
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = im
nt.links.new(tn.outputs["Color"], b.inputs["Base Color"]); nt.links.new(tn.outputs["Alpha"], b.inputs["Alpha"])
b.inputs["Roughness"].default_value = 0.5
mat.blend_method = "HASHED" if hasattr(mat, "blend_method") else None


def strip(bm, uvl, lid, lengths, up_dir, curl):
    """Một dải mi chạy dọc đường mí `lid` (list Vector), mỗi điểm vươn ra theo pháp tuyến + up_dir, cong vểnh."""
    rows = 5
    grid = []
    for i, (p, n, L) in enumerate(lid):
        col = []
        out_ = (n * 0.7 + up_dir * 0.6).normalized()
        for r in range(rows):
            t = r / (rows - 1)
            # đi ra ngoài rồi cong ngược lên (vểnh)
            q = p + out_ * (L * t) + up_dir * (L * curl * t * t)
            col.append(bm.verts.new(q))
        grid.append(col)
    for i in range(len(grid) - 1):
        for r in range(rows - 1):
            f = bm.faces.new((grid[i][r], grid[i + 1][r], grid[i + 1][r + 1], grid[i][r + 1]))
            u0, u1 = i / (len(grid) - 1), (i + 1) / (len(grid) - 1)
            for l, uv in zip(f.loops, ((u0, r / (rows - 1)), (u1, r / (rows - 1)), (u1, (r + 1) / (rows - 1)), (u0, (r + 1) / (rows - 1)))):
                l[uvl].uv = (uv[0] * 2.0, uv[1])


bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
for side in ("l", "r"):
    for part, up_sign, scale_len in (("up", 1, 1.0), ("lo", -1, 0.35)):
        keys = [f"lid_{side}_{part}_{i}" for i in range(9)]
        if not all(k in lm for k in keys):
            print("NO LID", side, part); continue
        pts = []
        for i, k in enumerate(keys):
            hit, nrm = on_face(lm[k])
            if hit is None:
                continue
            t = i / 8                                   # 0 khoé trong → 1 khoé ngoài
            L = L_MAX * scale_len * (0.35 + 0.65 * t ** 1.3) * (1 - 0.5 * max(0, t - 0.92) / 0.08)
            pts.append((hit + nrm * 0.002, Vector(nrm), L))
        if len(pts) > 2:
            # nội suy dày hơn dọc mí
            dense = []
            for a, c in zip(pts[:-1], pts[1:]):
                for s in np.linspace(0, 1, 4, endpoint=False):
                    dense.append((a[0].lerp(c[0], s), a[1].lerp(c[1], s).normalized(), a[2] + (c[2] - a[2]) * s))
            dense.append(pts[-1])
            strip(bm, uvl, dense, None, Vector((0, 0, up_sign)), CURL if part == "up" else CURL * 0.4)
            print("LASH", side, part, len(dense))
me = bpy.data.meshes.new("Lashes"); bm.to_mesh(me); bm.free()
lash = bpy.data.objects.new("Lashes", me); bpy.context.scene.collection.objects.link(lash)
me.materials.append(mat)
for p in me.polygons:
    p.use_smooth = True
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("DONE", out)
