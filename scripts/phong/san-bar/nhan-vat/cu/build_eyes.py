"""Mắt kiểu game: khoét lỗ mắt theo viền mí, đặt nhãn cầu rời có tròng mắt cắt từ ảnh chính diện.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/build_eyes.py -- <head.glb> <ra.glb> <thư mục ortho> <ảnh chính diện (gốc, có nền)> \
    [--ball 0.42] [--iris 0.21] [--hole 0.92] [--sink 0.002]

ortho: ortho.json + lm_ortho.json (điểm mốc tượng, có lid_*) + lm_photo.json (điểm mốc ảnh, có iris_*, eye_*).
--ball: bán kính nhãn cầu = ball × bề ngang mắt; --iris: bán kính tròng = iris × bề ngang mắt (ảnh lẫn tượng);
--hole: thu nhỏ viền lỗ so với viền mí (giữ mép mí); --sink: nhãn cầu lùi sau mặt da bao nhiêu (đơn vị mesh).
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
src, out, odir, photo = argv[:4]
opt = lambda k, d: float(argv[argv.index(k) + 1]) if k in argv else d
BALL, IRIS, HOLE, SINK = opt("--ball", 0.40), opt("--iris", 0.21), opt("--hole", 0.9), opt("--sink", 0.001)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
head = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Head")) \
    if any(o.name.startswith("Head") for o in bpy.data.objects) else next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = head
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bvh = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lm = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
lp = json.load(open(os.path.join(odir, "lm_photo.json")))[os.path.basename(photo)]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
to_xz = lambda p: np.array([(p[0] - R / 2) / R * sc + cu, cv + (R / 2 - p[1]) / R * sc])


def inside(poly, pts):
    x, y = pts[:, 0], pts[:, 1]; res = np.zeros(len(pts), bool); x0, y0 = poly[-1]
    for x1, y1 in poly:
        res ^= ((y1 > y) != (y0 > y)) & (x < (x0 - x1) * (y - y1) / ((y0 - y1) + 1e-12) + x1); x0, y0 = x1, y1
    return res


# ---------- ảnh chính diện (đọc qua Blender: hàng 0 = đáy ảnh) ----------
pim = bpy.data.images.load(photo)
PW, PH = pim.size
PX = np.array(pim.pixels[:], np.float32).reshape(PH, PW, 4)


LIB_DIR = argv[argv.index("--save-iris") + 1] if "--save-iris" in argv else None   # lưu tròng vừa cắt vào thư viện
USE_IRIS = argv[argv.index("--iris-tex") + 1] if "--iris-tex" in argv else None    # dùng tròng có sẵn trong thư viện


def iris_texture(side, size=512):
    if USE_IRIS:  # ảnh tròng thư viện: đã gồm lòng trắng, đồng tử, bóng mí (cùng quy ước UV)
        img = bpy.data.images.load(USE_IRIS); img.pack(); return img
    return cut_iris(side, size)


def cut_iris(side, size=512):
    """Texture nhãn cầu: lòng trắng + đĩa tròng cắt từ ảnh (tâm = điểm mốc tròng), viền tròng sẫm, mép mềm."""
    ex = np.array(lp[f"eye_{side}_in"]); eo = np.array(lp[f"eye_{side}_out"])
    ew = np.linalg.norm(eo - ex)
    c = np.array(lp[f"iris_{side}"]); c[1] = PH - c[1]
    r_px = IRIS * ew                                     # bán kính tròng trong ảnh (px)
    # texture: tâm (0.5, 0.5); bán kính tròng = IRIS/BALL × 0.5 (vì UV phủ ±bán kính nhãn cầu)
    r_uv = IRIS / BALL * 0.5
    yy, xx = np.mgrid[0:size, 0:size]
    u = (xx + 0.5) / size - 0.5; v = (yy + 0.5) / size - 0.5
    d = np.hypot(u, v) / r_uv                            # 1 = mép tròng
    sx = (c[0] + u / r_uv * r_px).clip(0, PW - 1).astype(int)
    sy = (c[1] + v / r_uv * r_px).clip(0, PH - 1).astype(int)
    iris = PX[sy, sx, :3]
    # tròng rực hơn: tăng tương phản quanh màu trung bình, đồng tử sẫm, viền tròng đậm
    mean = iris[d < 0.9].mean(0)
    iris = np.clip((iris - mean) * 1.25 + mean * np.array([1.05, 0.97, 0.9]), 0, 1)
    pupil = np.clip((0.36 - d) / 0.08, 0, 1)[..., None]
    iris = iris * (1 - pupil * 0.85)
    sclera = np.array([0.78, 0.72, 0.70], np.float32)
    shade = np.clip(1 - np.maximum(0, np.hypot(u, v) - 0.38) * 1.6, 0.55, 1)[..., None]  # lòng trắng tối dần ra rìa
    t = np.clip((d - 0.92) / 0.12, 0, 1)[..., None]      # mép tròng mềm
    limbal = (1 - 0.45 * np.exp(-((d - 0.97) / 0.06) ** 2))[..., None]
    rgb = iris * (1 - t) * limbal + sclera * shade * t
    # bóng mí trên đổ xuống nhãn cầu (v > 0 là phía trên)
    lid = np.clip(1 - (v - 0.02) * 3.2, 0.42, 1)[..., None]
    rgb = rgb * lid
    img = bpy.data.images.new(f"eye_{side}", size, size)
    img.pixels[:] = np.dstack([rgb, np.ones((size, size, 1), np.float32)]).ravel(); img.pack()
    if LIB_DIR:
        os.makedirs(LIB_DIR, exist_ok=True)
        img.filepath_raw = os.path.join(LIB_DIR, f"iris_{side}.png"); img.file_format = "PNG"; img.save()
        print("SAVED IRIS", img.filepath_raw)
    return img


# ---------- vị trí mắt trên da = nơi project_texture.py đã vẽ mắt của ảnh ----------
# (vòng neo mắt: điểm tượng cm + off ↔ điểm ảnh cp + off·k/ES, với ES = --eye-scale đã dùng khi tô màu)
ES = opt("--eye-scale", 1.18)
VSQ = opt("--vsq", 0.9)  # tỉ lệ chiều cao lỗ mắt


def photo_to_model_xz(side, p_photo):
    mi, mo = np.array(lm[f"eye_{side}_in"]), np.array(lm[f"eye_{side}_out"])
    pi, po = np.array(lp[f"eye_{side}_in"]), np.array(lp[f"eye_{side}_out"])
    cm, cp = (mi + mo) / 2, (pi + po) / 2
    k = np.linalg.norm(po - pi) / np.linalg.norm(mo - mi)      # px ảnh / px ortho
    return to_xz(cm + (np.array(p_photo) - cp) * ES / k)


# chia mịn lưới quanh mắt để mép lỗ khoét tròn trịa
bm = bmesh.new(); bm.from_mesh(head.data)
# glTF tách đỉnh dọc đường nối UV → hàn lại (UV vẫn giữ ở từng góc mặt) để chỉ mép lỗ mắt là "mép"
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
for _ in range(2):
    bm.faces.ensure_lookup_table()
    sel = set()
    for side in ("l", "r"):
        c = photo_to_model_xz(side, (np.array(lp[f"eye_{side}_in"]) + np.array(lp[f"eye_{side}_out"])) / 2)
        for f in bm.faces:
            q = f.calc_center_median()
            if abs(q.x - c[0]) < 0.12 and abs(q.z - c[1]) < 0.07 and q.y < -0.2:
                sel.add(f)
    edges = list({e for f in sel for e in f.edges})
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True)
bm.faces.ensure_lookup_table()
fc = np.array([f.calc_center_median() for f in bm.faces])
kill = np.zeros(len(fc), bool)
eyes = []
LID_SAVE = argv[argv.index("--save-lid") + 1] if "--save-lid" in argv else None   # lưu kiểu mí vào thư viện
LID_USE = argv[argv.index("--lid-shape") + 1] if "--lid-shape" in argv else None   # dùng kiểu mí có sẵn
lid_lib = json.load(open(LID_USE)) if LID_USE else {}
lid_out = {}


def to_local(side, pts, a, b):
    """Đổi điểm sang hệ chuẩn của mắt: khoé trong a = (0,0), khoé ngoài b = (1,0), trục dọc vuông góc, lên trên là +."""
    ex = b - a; L = np.linalg.norm(ex); ex = ex / L; ey = np.array([-ex[1], ex[0]])
    if ey[1] < 0: ey = -ey
    q = pts - a
    return np.stack([q @ ex / L, q @ ey / L], 1)


def from_local(side, loc, a, b):
    ex = b - a; L = np.linalg.norm(ex); ex = ex / L; ey = np.array([-ex[1], ex[0]])
    if ey[1] < 0: ey = -ey
    return a + (loc[:, :1] * ex + loc[:, 1:] * ey) * L


for side in ("l", "r"):
    ks = [f"lid_{side}_up_{i}" for i in range(9)] + [f"lid_{side}_lo_{i}" for i in range(8, -1, -1)]
    a = photo_to_model_xz(side, lp[f"eye_{side}_in"]); b = photo_to_model_xz(side, lp[f"eye_{side}_out"])
    if LID_USE:  # kiểu mí thư viện → đặt theo hai khoé mắt của đầu này (mắt trái/phải đối xứng: dùng chung một dáng)
        poly = from_local(side, np.array(lid_lib["contour"]), a, b)
    else:
        poly = np.array([photo_to_model_xz(side, lp[k]) for k in ks])
        lid_out[side] = to_local(side, poly, a, b)
    cen = poly.mean(0); poly = cen + (poly - cen) * np.array([HOLE, HOLE * VSQ])  # thấp hơn → mí trên che nhẹ tròng
    poly[:, 1] -= (poly[:, 1].max() - poly[:, 1].min()) * 0.03
    iris_c = photo_to_model_xz(side, lp[f"iris_{side}"])
    ew = np.linalg.norm(photo_to_model_xz(side, lp[f"eye_{side}_out"]) - photo_to_model_xz(side, lp[f"eye_{side}_in"]))
    hit = bvh.ray_cast(Vector((cen[0], -5, cen[1])), Vector((0, 1, 0)), 10)[0]
    front_y = hit.y
    m = inside(poly, fc[:, [0, 2]]) & (fc[:, 1] < front_y + ew * 0.6)
    kill |= m
    r = BALL * ew
    eyes.append((side, Vector((iris_c[0], front_y + r + SINK, iris_c[1])), r))
    print("EYE", side, "faces cut", int(m.sum()), "ball r (mm)", round(r * 220, 1), "eye w (mm)", round(ew * 220, 1), "hole cen", (cen * 220).round(1), "iris", (iris_c * 220).round(1))
if LID_SAVE and lid_out:  # trung bình hai mắt thành một kiểu mí
    os.makedirs(os.path.dirname(LID_SAVE), exist_ok=True)
    json.dump({"contour": ((lid_out["l"] + lid_out["r"]) / 2).round(4).tolist(),
               "note": "khoé trong (0,0) → khoé ngoài (1,0); y dương = phía trên; 9 điểm mí trên rồi 9 điểm mí dưới ngược lại"},
              open(LID_SAVE, "w", encoding="utf-8"), indent=1)
    print("SAVED LID", LID_SAVE)
bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.where(kill)[0]], context="FACES")
# mép lỗ mềm: làm trơn các đỉnh viền lỗ vài lần (chỉ trong mặt phẳng x–z)
for _ in range(3):
    edge_v = [v for v in bm.verts if v.is_boundary and v.co.y < -0.2
              and any((v.co.x - c.x) ** 2 + (v.co.z - c.z) ** 2 < (r * 1.6) ** 2 for _, c, r in eyes)]
    new_co = {}
    for v in edge_v:
        nb = [e.other_vert(v) for e in v.link_edges if e.other_vert(v).is_boundary]
        if len(nb) == 2:
            m_ = (nb[0].co + nb[1].co) / 2
            new_co[v] = Vector((v.co.x * 0.5 + m_.x * 0.5, v.co.y, v.co.z * 0.5 + m_.z * 0.5))
    for v, c in new_co.items():
        # không làm tròn gần hai khoé mắt (giữ khoé nhọn)
        if any(abs(v.co.x - c_.x) > r * 0.95 for _, c_, r in eyes if (v.co.x - c_.x) ** 2 + (v.co.z - c_.z) ** 2 < (r * 1.6) ** 2):
            continue
        v.co = c

# ---------- kẻ mắt + viền mí dưới: dải rời bám mép lỗ mắt (bộ phận tái dùng: màu, độ dày, đuôi) ----------
LINER_W = opt("--liner", 0.006)       # bề dày kẻ mắt (đơn vị mesh; 0.006 ≈ 1,3 mm)
WING = opt("--wing", 0.035)           # độ dài đuôi kẻ mắt
liner_parts = []
for side, c, r in eyes:
    ring = [v for v in bm.verts if v.is_boundary and v.co.y < -0.2 and (v.co.x - c.x) ** 2 + (v.co.z - c.z) ** 2 < (r * 1.6) ** 2]
    if len(ring) < 6:
        continue
    pts = np.array([v.co[:] for v in ring])
    xi, xo = pts[:, 0].min(), pts[:, 0].max()
    out_dir = 1.0 if c.x > 0 else -1.0                      # khoé ngoài về phía xa giữa mặt
    mid_z = np.interp(pts[:, 0], [xi, xo], [pts[pts[:, 0].argmin(), 2], pts[pts[:, 0].argmax(), 2]])
    for part, sel, width, col in (("up", pts[:, 2] >= mid_z, LINER_W, (0.02, 0.012, 0.012)),
                                  ("lo", pts[:, 2] < mid_z, LINER_W * 0.45, (0.55, 0.32, 0.3))):
        q = pts[sel]; q = q[np.argsort(q[:, 0] * out_dir)]   # từ khoé trong ra khoé ngoài
        if len(q) < 3:
            continue
        path = [Vector(p_) for p_ in q]
        if part == "up":  # đuôi vút: kéo dài ra ngoài và lên
            end = path[-1]
            for t in (0.33, 0.66, 1.0):
                path.append(end + Vector((out_dir * WING * t, -0.002 * t, WING * 0.45 * t * t)))
        liner_parts.append((f"{part.upper()}_{side}", path, width, col, part))

grad = np.zeros((64, 8, 4), np.float32)
vv = np.linspace(0, 1, 64)[:, None]
grad[..., 3] = (1 - vv) ** 1.6                      # đậm ở mép mí, mờ dần lên
gimg = bpy.data.images.new("liner_grad", 8, 64, alpha=True); gimg.pixels[:] = grad.ravel(); gimg.pack()
for name, path, width, col, part in liner_parts:
    lb = bmesh.new(); n = len(path); prev = None; uvl_ = lb.loops.layers.uv.new("UVMap")
    for j, p_ in enumerate(path):
        t = j / (n - 1)
        w = width * (np.sin(np.pi * min(t * 1.4, 1)) ** 0.6 if part == "lo" else (0.4 + 0.9 * t) * (1 - max(0, t - 0.8) / 0.25))
        up = Vector((0, -0.0015, 1 if part == "up" else -1)).normalized()
        a_ = lb.verts.new(p_ + Vector((0, -0.0008, 0))); b_ = lb.verts.new(p_ + up * max(w, 1e-4) + Vector((0, -0.0012, 0)))
        if prev:
            f_ = lb.faces.new((prev[0], prev[1], b_, a_))
            for l_, uv in zip(f_.loops, ((0.5, 0.0), (0.5, 1.0), (0.5, 1.0), (0.5, 0.0))):
                l_[uvl_].uv = uv
        prev = (a_, b_)
    lm_ = bpy.data.meshes.new(name); lb.to_mesh(lm_); lb.free()
    lo_ = bpy.data.objects.new(name, lm_); bpy.context.scene.collection.objects.link(lo_)
    mt = bpy.data.materials.new(name); mt.use_nodes = True
    bb = mt.node_tree.nodes["Principled BSDF"]; bb.inputs["Base Color"].default_value = (*col, 1); bb.inputs["Roughness"].default_value = 0.6
    gi = mt.node_tree.nodes.new("ShaderNodeTexImage"); gi.image = gimg
    mt.node_tree.links.new(gi.outputs["Alpha"], bb.inputs["Alpha"])
    mt.use_backface_culling = False
    if hasattr(mt, "surface_render_method"):
        mt.surface_render_method = "DITHERED"
    lm_.materials.append(mt)
    print("LINER", name, len(path))
bm.to_mesh(head.data); bm.free()

for side, c, r in eyes:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=r, location=c)
    ball = bpy.context.object; ball.name = f"Eye_{side.upper()}"
    # UV chiếu thẳng từ phía trước: tâm tròng ở (0.5, 0.5), nhìn thẳng ra trước (-Y)
    me = ball.data
    while me.uv_layers:  # quả cầu có sẵn UV kiểu bản đồ; bỏ đi để dùng UV chiếu thẳng phía trước
        me.uv_layers.remove(me.uv_layers[0])
    uvl = me.uv_layers.new(name="UVMap")
    for loop in me.loops:
        p = me.vertices[loop.vertex_index].co
        uvl.data[loop.index].uv = (0.5 + p.x / (2 * r), 0.5 + p.z / (2 * r)) if p.y < 0 else (0.02, 0.02)
    mat = bpy.data.materials.new(f"EyeBall_{side}"); mat.use_nodes = True
    nt = mat.node_tree; b = nt.nodes["Principled BSDF"]
    tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = iris_texture(side)
    nt.links.new(tn.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.35
    b.inputs["Coat Weight"].default_value = 1.0            # giác mạc bóng → chấm sáng
    b.inputs["Coat Roughness"].default_value = 0.03
    me.materials.append(mat)
    bpy.ops.object.shade_smooth()

# ---------- mi mắt 3D (bộ phận rời): dải sợi mi dọc mí trên/dưới, dài dần ra đuôi, cong vểnh ----------
LASH_LEN = opt("--lash", 0.045)       # độ dài mi trên ở đuôi mắt (0.045 ≈ 10 mm)
LASH_CURL = opt("--curl", 0.7)
if LASH_LEN > 0:
    rng_ = np.random.default_rng(5)
    TS = 256
    lt = np.zeros((TS, TS, 4), np.float32); lt[..., :3] = 0.006
    # sợi mi to rõ (1 vòng texture phủ ~1/3 đường mí → mỗi sợi ~1,5–2 px khi lên hình); chân đậm, ngọn thon
    for k_ in range(int(opt("--lash-density", 75))):
        x0 = rng_.uniform(0.02, 0.98) * TS; lean = rng_.normal(0.12, 0.06) * TS; ln = rng_.uniform(0.6, 1.0) * TS
        for j in range(int(ln)):
            t_ = j / ln
            x = int(x0 + lean * (j / TS) ** 2); w = max(1, int(4 * (1 - t_) + 1.5))
            lo_x, hi_x = max(0, x - w // 2), min(TS, x + w // 2 + 1)
            if lo_x < hi_x:
                lt[j, lo_x:hi_x, 3] = np.maximum(lt[j, lo_x:hi_x, 3], 1 - 0.35 * t_)
    limg = bpy.data.images.new("lash_strands", TS, TS, alpha=True); limg.pixels[:] = lt.ravel(); limg.pack()
    lmat = bpy.data.materials.new("Lashes"); lmat.use_nodes = True
    ln_ = lmat.node_tree; lb_ = ln_.nodes["Principled BSDF"]
    lti = ln_.nodes.new("ShaderNodeTexImage"); lti.image = limg
    ln_.links.new(lti.outputs["Color"], lb_.inputs["Base Color"]); ln_.links.new(lti.outputs["Alpha"], lb_.inputs["Alpha"])
    lmat.use_backface_culling = False
    if hasattr(lmat, "surface_render_method"):
        lmat.surface_render_method = "DITHERED"   # ghi độ sâu → không bị lớp trang điểm trong suốt đè lên
    for name, path, width, col, part in liner_parts:
        bm_ = bmesh.new(); uvl = bm_.loops.layers.uv.new("UVMap"); n = len(path); rows = 4; grid = []
        for j, p_ in enumerate(path):
            t = j / (n - 1)
            if part == "up":
                L = LASH_LEN * (0.35 + 0.65 * t ** 1.2) * (1 - 0.6 * max(0, t - 0.85) / 0.15)
                up, fwd = Vector((0, 0, 1)), Vector((0, -1, 0))
                curl = LASH_CURL
            else:
                L = LASH_LEN * 0.3 * np.sin(np.pi * t) ** 0.5
                up, fwd = Vector((0, 0, -1)), Vector((0, -1, 0))
                curl = LASH_CURL * 0.3
            col_ = []
            for rr in range(rows):
                q = rr / (rows - 1)
                col_.append(bm_.verts.new(p_ + fwd * (L * q * 0.8) + up * (L * (0.35 * q + curl * q * q))))
            grid.append(col_)
        for j in range(n - 1):
            for rr in range(rows - 1):
                f = bm_.faces.new((grid[j][rr], grid[j + 1][rr], grid[j + 1][rr + 1], grid[j][rr + 1]))
                u0, u1 = j / (n - 1) * 1.6, (j + 1) / (n - 1) * 1.6
                for l_, uv in zip(f.loops, ((u0, rr / (rows - 1)), (u1, rr / (rows - 1)), (u1, (rr + 1) / (rows - 1)), (u0, (rr + 1) / (rows - 1)))):
                    l_[uvl].uv = uv
        lm2 = bpy.data.meshes.new("Lash_" + name); bm_.to_mesh(lm2); bm_.free()
        lo2 = bpy.data.objects.new("Lash_" + name, lm2); bpy.context.scene.collection.objects.link(lo2)
        lm2.materials.append(lmat)
        print("LASH", name)

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("DONE", out)
