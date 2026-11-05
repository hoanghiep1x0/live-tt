"""Tô màu mesh Hunyuan3D bằng cách chiếu 4 ảnh góc nhìn (trước/sau/trái/phải), rồi nướng thành texture.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/project_texture.py -- <mesh.glb> <thư mục ảnh tách nền> <out.glb> [--faces 60000] [--tex 2048]

Ảnh: _nobg_front.png, _nobg_back.png, _nobg_left.png, _nobg_right.png (nền trong suốt).
Hướng (sau khi nhập glTF vào Blender, mặt nhân vật quay về -Y):
  front: camera ở -Y, u = +x | back: camera ở +Y, u = -x
  left:  camera ở +X, u = +y | right: camera ở -X, u = -y      (v = +z cho cả bốn)
Mỗi ảnh được căn theo khung bao của phần không trong suốt ↔ khung bao của mesh nhìn từ hướng đó.
"""
import os
import sys

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facefit import fit_silhouette, tps_fit  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
src, img_dir, out = argv[:3]
faces = int(argv[argv.index("--faces") + 1]) if "--faces" in argv else 60000
tex_size = int(argv[argv.index("--tex") + 1]) if "--tex" in argv else 2048

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
hi = next(o for o in bpy.data.objects if o.type == "MESH")
hi.name = "HighRes"
bpy.context.view_layer.objects.active = hi
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# hàn đỉnh trùng: lưới xuất lại từ Blender (vd. sau smooth_eyes/sculpt) có thể bị tách rời từng mặt → UV và nướng màu hỏng
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=1e-6)
bpy.ops.object.mode_set(mode="OBJECT")
me = hi.data
n = len(me.vertices)
P = np.empty(n * 3, np.float32); me.vertices.foreach_get("co", P); P = P.reshape(-1, 3)
me.calc_normals_split() if hasattr(me, "calc_normals_split") else None
N = np.empty(n * 3, np.float32); me.vertices.foreach_get("normal", N); N = N.reshape(-1, 3)
print("VERTS", n)

import math
import re

# Các ảnh trong thư mục: _nobg_<front|back|left|right>.png (bộ 4 góc) hoặc face-NN-<tên>-<góc>.png (bộ 8 góc).
# Góc máy a (độ) quay quanh đầu: 0 = chính diện (camera ở -Y), 90 = "left-profile" (camera ở +X), 180 = sau lưng.
NAMED = {"front": 0, "left": 90, "back": 180, "right": 270}
VIEWS = {}
for f in sorted(os.listdir(img_dir)):
    if not f.lower().endswith(".png"):
        continue
    stem = f[:-4]
    m = re.search(r"-(\d+)$", stem)
    if m:
        a = int(m.group(1))
    else:
        key = next((k for k in NAMED if k in stem), None)
        if key is None:
            continue
        a = {"left-profile": 90, "right-profile": 270}.get(stem.split("-", 2)[-1], NAMED[key])
    r = math.radians(a)
    d = np.array([math.sin(r), -math.cos(r), 0.0])   # từ nhân vật ra camera
    right = np.cross(-d, [0, 0, 1])                  # trục ngang của ảnh
    VIEWS[f] = (d, right, a)
print("VIEWS", {k: v[2] for k, v in VIEWS.items()})

# BVH để bỏ chỗ bị che (vd. má sau sống mũi khi nhìn nghiêng)
tris = np.empty(len(me.loop_triangles) * 3, np.int32) if me.loop_triangles else None
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get("vertices", tris)
bvh = BVHTree.FromPolygons([tuple(p) for p in P], tris.reshape(-1, 3).tolist(), all_triangles=True)

def head_box_img(alpha, frac):
    """Khung bao riêng vùng đầu: các hàng từ đỉnh xuống frac chiều cao phần nhìn thấy."""
    ys, xs = np.where(alpha)
    top, bot = ys.max(), ys.min()
    cut = top - (top - bot) * frac
    sel = ys >= cut
    return xs[sel].min(), xs[sel].max(), top, top - bot


def head_box_mesh(u, v, frac):
    top, bot = v.max(), v.min()
    sel = v >= top - (top - bot) * frac
    return u[sel].min(), u[sel].max(), top, top - bot


# Tỉ lệ chung cho cả 4 ảnh (cắt từ cùng một tấm ghép, cùng khoảng cách máy ảnh): đo theo chiều cao
# đỉnh đầu → đáy ảnh ở ảnh chính diện; căn từng ảnh theo tâm vùng đầu (35% trên) và đỉnh đầu.
LM = None
if "--landmarks" in argv:  # thư mục có ortho.json, lm_ortho.json, lm_photo.json (render_ortho.py + landmarks.py)
    import json
    lmd = argv[argv.index("--landmarks") + 1]
    LM = (json.load(open(os.path.join(lmd, "ortho.json"))), json.load(open(os.path.join(lmd, "lm_ortho.json"))),
          json.load(open(os.path.join(lmd, "lm_photo.json"))))


def landmark_map(name, ang, u, v, base, H):
    """Nếu ảnh này có điểm mốc: hàm (u, v) mesh → pixel ảnh (gốc ở đáy) uốn theo điểm mốc; không thì None."""
    if not LM:
        return None
    meta, lo, lp = LM
    key = f"ortho_{ang % 360}.png"
    if key not in meta or key not in lo or name not in lp:
        return None
    m = meta[key]; R, sc, cu, cv = m["R"], m["scale"], m["cu"], m["cv"]
    to_ortho = lambda uu, vv: np.stack([(uu - cu) / sc * R + R / 2, R / 2 - (vv - cv) / sc * R], 1)
    # mí trên/dưới và tròng: không ép vào khe mắt của tượng (giữ chiều cao mắt như ảnh, mắt không bị dẹt)
    skip = () if "--warp-eyelids" in argv else ("eye_l_top", "eye_l_bot", "eye_r_top", "eye_r_bot", "iris_l", "iris_r")
    eye_scale = float(argv[argv.index("--eye-scale") + 1]) if "--eye-scale" in argv else 1.0
    if eye_scale != 1.0:  # khoé mắt do vòng neo mắt bên dưới lo, bỏ khỏi danh sách để khỏi kéo ngược
        skip = skip + ("eye_l_in", "eye_l_out", "eye_r_in", "eye_r_out")
    names = [k for k in lo[key] if k in lp[name] and k not in skip]
    src = np.array([lo[key][k] for k in names]); dst = np.array([lp[name][k] for k in names])
    dst[:, 1] = H - dst[:, 1]                         # ảnh gốc: đổi sang gốc ở đáy
    # vòng neo quanh mỗi mắt: vùng mắt của tượng lấy màu từ vùng mắt ảnh thu nhỏ 1/eye_scale
    # → mắt hiện to hơn theo đúng tỉ lệ ảnh (cả ngang lẫn dọc), không phụ thuộc khe mắt hẹp của tượng
    if eye_scale != 1.0:
        es, ed = [], []
        for sd in ("l", "r"):
            ks = [f"eye_{sd}_{k}" for k in ("in", "out", "top", "bot")]
            if not all(k in lo[key] and k in lp[name] for k in ks):
                continue
            mo = np.array([lo[key][k] for k in ks]); ph = np.array([lp[name][k] for k in ks]); ph[:, 1] = H - ph[:, 1]
            cm, cp = mo[:2].mean(0), ph[:2].mean(0)       # tâm = giữa hai khoé
            k_ = np.linalg.norm(ph[0] - ph[1]) / max(np.linalg.norm(mo[0] - mo[1]), 1e-6)  # px ảnh / px tượng
            wm = np.linalg.norm(mo[0] - mo[1]) / 2
            for rad in (0.6, 1.1, 1.6):
                for t in np.linspace(0, 2 * np.pi, 12, endpoint=False):
                    off = np.array([np.cos(t), np.sin(t) * (0.55 if rad < 1.5 else 0.8)]) * wm * rad
                    es.append(cm + off * np.array([1, -1]))   # ortho: y từ trên xuống
                    # gần mắt thu nhỏ mạnh nhất, ra ngoài vòng 1.6 thì về bình thường (nối mềm với má, mày)
                    sh = eye_scale if rad < 1.5 else 1.0
                    ed.append(cp + off * k_ / sh)
        if es:
            src = np.vstack([src, es]); dst = np.vstack([dst, ed])
    # điểm neo quanh khuôn mặt theo cách căn đường viền, để vùng ngoài mặt không bị kéo méo
    s, tx, ty = base
    c = src.mean(0); ring = []
    for t in np.linspace(0, 2 * np.pi, 20, endpoint=False):
        for rad in (0.42, 0.6):
            ring.append(c + rad * R * np.array([np.cos(t), np.sin(t)]))
    ring = np.array(ring)
    ru = (ring[:, 0] - R / 2) / R * sc + cu; rv = (R / 2 - ring[:, 1]) / R * sc + cv
    ring_dst = np.stack([ru * s + tx, rv * s + ty], 1)
    f = tps_fit(np.vstack([src, ring]), np.vstack([dst, ring_dst]))
    err = np.abs(f(src) - dst).max()
    print("  landmarks", len(names), "max err px", round(float(err), 2))
    return lambda uu, vv: f(to_ortho(uu, vv))


def inside_poly(poly, X, Y):
    """Điểm (X, Y) có nằm trong đa giác poly không (quét tia chẵn lẻ, không cần thư viện ngoài)."""
    inside = np.zeros(len(X), bool)
    x0, y0 = poly[-1]
    for x1, y1 in poly:
        cross = ((y1 > Y) != (y0 > Y)) & (X < (x0 - x1) * (Y - y1) / ((y0 - y1) + 1e-12) + x1)
        inside ^= cross
        x0, y0 = x1, y1
    return inside


FRAC = 0.35
PER_VIEW_SCALE = "--common-scale" not in argv  # bộ cắt từ cùng một tấm ghép thì dùng --common-scale
imgs = {}
for name in VIEWS:
    img = bpy.data.images.load(os.path.join(img_dir, name))
    W, H = img.size
    px = np.array(img.pixels[:], np.float32).reshape(H, W, 4)  # hàng 0 = đáy ảnh; giá trị sRGB
    px[..., :3] = np.where(px[..., :3] <= 0.04045, px[..., :3] / 12.92, ((px[..., :3] + 0.055) / 1.055) ** 2.4)
    imgs[name] = (px, W, H)
front = min(VIEWS, key=lambda k: VIEWS[k][2] % 360)
fpx, _, _ = imgs[front]
fb = head_box_img(fpx[..., 3] > 0.5, FRAC)
mfb = head_box_mesh(P @ VIEWS[front][1], P[:, 2], FRAC)
S = (fb[1] - fb[0]) / (mfb[1] - mfb[0])  # px / đơn vị mesh, theo bề ngang đầu nhìn chính diện

acc = np.zeros((n, 3), np.float64); wsum = np.zeros(n, np.float64)
for name, (d, right, ang) in VIEWS.items():
    px, W, H = imgs[name]
    u = P @ right; v = P[:, 2]
    ib = head_box_img(px[..., 3] > 0.5, FRAC)
    mb = head_box_mesh(u, v, FRAC)
    # mỗi ảnh tạo riêng có thể phóng to khác nhau → tỉ lệ riêng theo bề ngang vùng đầu của chính ảnh đó
    s = (ib[1] - ib[0]) / (mb[1] - mb[0]) if PER_VIEW_SCALE else S
    tx = (ib[0] + ib[1]) / 2 - (mb[0] + mb[1]) / 2 * s
    ty = ib[2] - mb[2] * s
    s, tx, ty = fit_silhouette(px[..., 3] > 0.5, u, v, s, tx, ty)
    lmap = landmark_map(name, ang, u, v, (s, tx, ty), H)
    if lmap:  # mắt, mũi, môi, cằm trong ảnh rơi đúng vào mắt, mũi, môi, cằm của hình khối
        XY = lmap(u, v); X, Y = XY[:, 0], XY[:, 1]
    else:
        X = u * s + tx
        Y = v * s + ty
    inside = (X >= 0) & (X < W - 1) & (Y >= 0) & (Y < H - 1)
    # trọng số theo góc: mặt hướng thẳng về camera ăn màu ảnh đó nhiều nhất
    # mặt trước ưu tiên ảnh chính diện; góc chéo chỉ phủ phần má/thái dương (tránh môi, mắt chồng hình)
    facing = np.clip(N @ d, 0, 1) ** (8 if ang % 90 == 0 else 14) * (3.0 if ang % 360 == 0 else 1.0)
    w = np.where(inside, facing, 0.0)
    # che khuất: bắn tia từ đỉnh về phía camera, trúng mesh → bỏ
    idx = np.where(w > 0.02)[0]
    off = (d * 1e-3).tolist(); dv = d.astype(float).tolist()
    for i in idx[:: 1]:
        p = P[i]
        hit = bvh.ray_cast((p[0] + off[0], p[1] + off[1], p[2] + off[2]), dv, 10.0)
        if hit[0] is not None:
            w[i] = 0.0
    x0 = np.floor(X).astype(int).clip(0, W - 2); y0 = np.floor(Y).astype(int).clip(0, H - 2)
    fx = (X - x0)[:, None]; fy = (Y - y0)[:, None]
    c = (px[y0, x0, :3] * (1 - fx) * (1 - fy) + px[y0, x0 + 1, :3] * fx * (1 - fy)
         + px[y0 + 1, x0, :3] * (1 - fx) * fy + px[y0 + 1, x0 + 1, :3] * fx * fy)
    a = px[y0, x0, 3]
    w = w * (a > 0.5)
    # môi: chỉ lấy màu ảnh chính diện (trộn nhiều góc làm son nhạt và nhoè viền)
    if ang % 360 == 0 and LM and name in LM[2]:
        lpn = LM[2][name]
        ring = [lpn["mouth_r"]] + [lpn[f"lipo_top_{i}"] for i in range(8)] + [lpn["mouth_l"]] \
            + [lpn[f"lipo_bot_{i}"] for i in range(7, -1, -1)]
        ring = np.array(ring); ring[:, 1] = H - ring[:, 1]
        c0 = ring.mean(0); ring = c0 + (ring - c0) * 1.15          # nới viền 15% cho mềm mép
        LIP_MASK = inside_poly(ring, X, Y) & (w > 0)
        print("  lip verts", int(LIP_MASK.sum()))
        # mắt (gồm mi, kẻ mắt): cũng chỉ lấy ảnh chính diện; vùng = viền mí trên + dưới nới 35%
        for sd in ("l", "r"):
            ks = [f"lid_{sd}_up_{i}" for i in range(9)] + [f"lid_{sd}_lo_{i}" for i in range(8, -1, -1)]
            if all(k in lpn for k in ks):
                ring = np.array([lpn[k] for k in ks], float); ring[:, 1] = H - ring[:, 1]
                c0 = ring.mean(0); ring = c0 + (ring - c0) * np.array([1.3, 1.9])  # cao hơn để gồm mi, kẻ mắt
                m_ = inside_poly(ring, X, Y) & (w > 0)
                LIP_MASK = LIP_MASK | m_
                print("  eye", sd, "verts", int(m_.sum()))
        w = np.where(LIP_MASK, np.maximum(w, 1e-3), w)  # trong vùng: luôn có màu ảnh chính diện
    elif "LIP_MASK" in globals():
        w = np.where(LIP_MASK, w * 0.0, w)
    acc += c * w[:, None]; wsum += w
    print("VIEW", name, "scale", round(float(s), 1), "used", int((w > 0).sum()))

col = np.where(wsum[:, None] > 1e-6, acc / np.maximum(wsum, 1e-6)[:, None], 0.0)
# chỗ không ảnh nào thấy (vd. dưới cằm): lấy màu trung bình của vùng đã tô
missing = wsum <= 1e-6
if missing.any():
    col[missing] = col[~missing].mean(axis=0)
print("MISSING", int(missing.sum()))
attr = me.color_attributes.new("Proj", "FLOAT_COLOR", "POINT")
attr.data.foreach_set("color", np.hstack([col, np.ones((n, 1))]).astype(np.float32).ravel())

# vật liệu phát sáng bằng màu đỉnh (để nướng đúng màu, không dính ánh sáng)
emit = bpy.data.materials.new("proj"); emit.use_nodes = True
nt = emit.node_tree; nt.nodes.clear()
vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Proj"
em = nt.nodes.new("ShaderNodeEmission"); outn = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(vc.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs[0], outn.inputs["Surface"])
me.materials.clear(); me.materials.append(emit)

# ---------- bản nhẹ cho web: giảm mặt, trải UV, nướng màu sang texture ----------
lo = hi.copy(); lo.data = hi.data.copy(); lo.name = "Head"
bpy.context.scene.collection.objects.link(lo)
dec = lo.modifiers.new("dec", "DECIMATE"); dec.ratio = faces / max(1, len(me.polygons))
bpy.context.view_layer.objects.active = lo
bpy.ops.object.modifier_apply(modifier="dec")
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.shade_smooth()
print("LOWRES FACES", len(lo.data.polygons))

tex = bpy.data.images.new("head_color", tex_size, tex_size)
bake = bpy.data.materials.new("head"); bake.use_nodes = True
bnt = bake.node_tree
timg = bnt.nodes.new("ShaderNodeTexImage"); timg.image = tex
bsdf = bnt.nodes["Principled BSDF"]
bnt.links.new(timg.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.45
lo.data.materials.clear(); lo.data.materials.append(bake)
bnt.nodes.active = timg

scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 1
bpy.ops.object.select_all(action="DESELECT")
hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
bpy.ops.object.bake(type="EMIT", use_selected_to_active=True, cage_extrusion=0.02, max_ray_distance=0.12, margin=16)
tex.filepath_raw = os.path.splitext(out)[0] + "_color.png"; tex.file_format = "PNG"; tex.save()
print("BAKED", tex.filepath_raw)

bpy.data.objects.remove(hi, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False)
print("DONE", out, os.path.getsize(out))
