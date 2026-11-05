"""Tóc từ 4 ảnh tóc: khối Hunyuan3D-2mv → giảm lưới → ráp lên da đầu MakeHuman → chiếu màu từ 4 ảnh → đối tượng "Hair".

# hpc: front = hair-01-front, left = hair-02-left-profile, right = hair-03-right-profile, back = hair-04-back (ảnh đã tách nền)
python hunyuan_mv.py input/<tên> output_<tên>.glb --octree 448
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/hair_fit.py -- <tóc.glb> <thư mục 4 ảnh tóc> <ra.blend> \
    [--faces 120000] [--gap 0.004] [--tex 2048] [--pen 12] [--gain 0.7] [--dry]

- Ráp: tìm tỉ lệ + dời (giữ hướng: Hunyuan mặt hướng −Y, đầu +Z như MakeHuman) sao cho tia từ đỉnh da đầu (nhóm "scalp" của
  Body) bắn ra theo pháp tuyến chạm mặt tóc cách da --gap; xuyên vào trong (tóc lọt vào sọ) phạt nặng. Dò tỉ lệ thô rồi
  dò từng tham số (coordinate search).
- Ảnh ↔ lưới: mỗi ảnh tóc (4 góc) đặt lên hình chiếu song song của lưới tóc bằng khung bao alpha (cao khớp cao, tâm khớp tâm);
  chiều ngang của mỗi góc (phải/trái ảnh) dò bằng độ trùng bóng (IoU) cả hai chiều, lấy chiều trùng hơn.
- Màu từng texel UV = trung bình các ảnh, trọng số (pháp tuyến · hướng nhìn)², bỏ ảnh nào bị chính tóc che (bắn tia về phía
  máy ảnh). Texel không ảnh nào thấy: lấp push–pull.
"""
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
glb, img_dir, out = a[:3]
opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
NF, GAP, TEX = int(opt("--faces", 120000)), opt("--gap", 0.004), int(opt("--tex", 2048))
PEN = opt("--pen", 12.0)        # hệ số phạt đỉnh da đầu nằm ngoài tóc (model-1: 4 → lộ da đỉnh sau)
GAIN = opt("--gain", 0.7)       # nhân màu (tuyến tính): ảnh tóc đã có ánh sáng + đèn chụp mềm → tóc dựng xám hơn ảnh
VIEWS = {"front": ("hair-01-front.png", np.array([0, 1.0, 0])),              # hướng nhìn của máy ảnh (từ máy vào nhân vật)
         "left": ("hair-02-left-profile.png", np.array([-1.0, 0, 0])),        # bên trái nhân vật = +X → máy ở +X nhìn về −X
         "right": ("hair-03-right-profile.png", np.array([1.0, 0, 0])),
         "back": ("hair-04-back.png", np.array([0, -1.0, 0]))}

body = bpy.data.objects["Body"]
for md in body.modifiers:
    md.show_viewport = False
# ---------- nạp + giảm lưới tóc ----------
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=glb)
new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in new:
    o.select_set(True)
bpy.context.view_layer.objects.active = new[0]
if len(new) > 1:
    bpy.ops.object.join()
hair = bpy.context.view_layer.objects.active; hair.name = "Hair"; hair.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in bpy.data.objects if o not in before and o is not hair]:
    bpy.data.objects.remove(o, do_unlink=True)
nf0 = len(hair.data.polygons)
if nf0 > NF:
    md = hair.modifiers.new("dec", "DECIMATE"); md.ratio = NF / nf0
    bpy.ops.object.modifier_apply(modifier=md.name)
print("HAIR faces", nf0, "→", len(hair.data.polygons))
H = np.array([v.co for v in hair.data.vertices])
Hf = [list(p.vertices) for p in hair.data.polygons]
bvh = BVHTree.FromPolygons(H.tolist(), Hf)

# ---------- da đầu ----------
gi = body.vertex_groups["scalp"].index
S, N = [], []
for v in body.data.vertices:
    if any(g.group == gi and g.weight > 0.5 for g in v.groups):
        S.append(tuple(body.matrix_world @ v.co)); N.append(tuple((body.matrix_world.to_3x3() @ v.normal).normalized()))
S, N = np.array(S), np.array(N)
print("SCALP đỉnh", len(S))


def cost(p, detail=False):
    s, tx, ty, tz = p
    o = (S - np.array([tx, ty, tz])) / s
    d = []
    for i in range(len(S)):
        h = bvh.ray_cast(Vector(o[i]), Vector(N[i]), 0.3)
        hb = bvh.ray_cast(Vector(o[i]), Vector(-N[i]), 0.3)            # tóc lọt vào trong sọ: mặt tóc nằm phía dưới da
        if h[0] is not None:
            d.append(h[3] * s - GAP)
        elif hb[0] is not None:
            d.append(-hb[3] * s - GAP)
    d = np.array(d)
    if not len(d):
        return 1e9
    c = float(np.mean(np.where(d < 0, (d * PEN) ** 2, d ** 2))) ** 0.5 + 0.05 * (1 - len(d) / len(S))   # sọ chọc ra ngoài tóc: lộ da
    return (c, d) if detail else c


# thô: đỉnh tóc = đỉnh da đầu + gap·2, tâm x = 0, tâm y theo vùng đỉnh
top_h = H[:, 2].max(); top_s = S[:, 2].max()
yc_h = H[H[:, 2] > top_h - 0.05 * (top_h - H[:, 2].min()), 1].mean(); yc_s = S[S[:, 2] > top_s - 0.02, 1].mean()
best = None
for s in np.linspace(0.10, 0.40, 31):
    p = (s, -s * H[:, 0].mean(), yc_s - s * yc_h, top_s + 2 * GAP - s * top_h)
    c = cost(p)
    if best is None or c < best[0]:
        best = (c, p)
p = list(best[1]); print("THÔ", round(best[0] * 1000, 2), "mm", [round(x, 4) for x in p])
for step in (0.01, 0.004, 0.0015):
    for _ in range(3):
        for k in range(4):
            sc = step * (p[0] if k == 0 else 1) * (3 if k == 0 else 1)
            for dlt in (-sc, sc):
                q = list(p); q[k] += dlt
                c = cost(q)
                if c < best[0]:
                    best = (c, q); p = q
c, d = cost(p, True)
print("RÁP lệch %.2f mm, xuyên sọ %d / %d đỉnh, tỉ lệ %.4f" % (c * 1000, int((d < -0.001).sum()), len(d), p[0]))
if "--dry" in a:
    sys.exit(0)
s, tx, ty, tz = p
hair.data.vertices.foreach_set("co", (H * s + np.array([tx, ty, tz])).ravel()); hair.data.update()
H = np.array([v.co for v in hair.data.vertices]); bvh = BVHTree.FromPolygons(H.tolist(), Hf)

# ---------- UV + vị trí / pháp tuyến từng texel ----------
bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); bpy.context.view_layer.objects.active = hair
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")
scn = bpy.context.scene; scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 1; scn.render.bake.margin = 4


def bake_geo(sock):
    img = bpy.data.images.new("bk_" + sock, TEX, TEX, alpha=False, float_buffer=True)
    m = bpy.data.materials.new("bk"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    g = nt.nodes.new("ShaderNodeNewGeometry"); ad = nt.nodes.new("ShaderNodeVectorMath"); ad.inputs[1].default_value = (10, 10, 10)
    em = nt.nodes.new("ShaderNodeEmission"); oo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(g.outputs[sock], ad.inputs[0]); nt.links.new(ad.outputs[0], em.inputs["Color"]); nt.links.new(em.outputs[0], oo.inputs["Surface"])
    tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; nt.nodes.active = tn
    hair.data.materials.clear(); hair.data.materials.append(m)
    bpy.ops.object.bake(type="EMIT")
    px = np.empty(TEX * TEX * 4, np.float32); img.pixels.foreach_get(px)
    return px.reshape(TEX, TEX, 4)[..., :3] - 10


P = bake_geo("Position"); NN = bake_geo("Normal")
valid = np.abs(np.linalg.norm(NN, axis=-1) - 1) < 0.1          # nền chưa nướng = −10 → chuẩn ≠ 1
ii = np.argwhere(valid); Pv = P[valid]; Nv = NN[valid] / np.linalg.norm(NN[valid], axis=-1, keepdims=True)
print("TEXEL", len(Pv))

# ---------- ảnh ↔ hình chiếu lưới ----------
def load(p):
    im = bpy.data.images.load(p); W, Hh = im.size
    x = np.empty(W * Hh * 4, np.float32); im.pixels.foreach_get(x); return x.reshape(Hh, W, 4)[::-1].copy()   # hàng 0 = trên


acc = np.zeros((len(Pv), 3)); wsum = np.zeros(len(Pv))
for name, (fn, vd) in VIEWS.items():
    im = load(os.path.join(img_dir, fn)); Hh, W = im.shape[:2]
    al = im[..., 3] > 0.5; ys, xs = np.where(al)
    ib = (xs.min(), xs.max(), ys.min(), ys.max())
    best = None
    for sign in (1, -1):
        right = sign * np.cross(vd, [0, 0, 1.0]); u = H @ right; v = H[:, 2]
        k = (ib[3] - ib[2]) / (v.max() - v.min())                              # px / m
        px_ = lambda uu, vv: ((uu - (u.min() + u.max()) / 2) * k + (ib[0] + ib[1]) / 2, (v.max() - vv) * k + ib[2])
        X, Y = px_(u, v); m = np.zeros_like(al)
        ok = (X >= 0) & (X < W) & (Y >= 0) & (Y < Hh); m[Y[ok].astype(int), X[ok].astype(int)] = True
        iou = (m & al).sum() / max((m | al).sum(), 1)                        # lưới chỉ là điểm đỉnh → IoU tương đối
        if best is None or iou > best[0]:
            best = (iou, right, k, px_)
    iou, right, k, px_ = best
    print("VIEW", name, "IoU %.3f" % iou, "phải ảnh =", np.round(right, 2))
    X, Y = px_(Pv @ right, Pv[:, 2])
    face = np.clip(Nv @ (-vd), 0, 1) ** 2
    vis = np.ones(len(Pv), bool)
    dirc = Vector(-vd)
    for j in np.where(face > 0.02)[0]:
        if bvh.ray_cast(Vector(Pv[j] - vd * 0.0015), dirc, 1.0)[0] is not None:
            vis[j] = False
    w = face * vis * (X >= 0) * (X < W - 1) * (Y >= 0) * (Y < Hh - 1)
    xi = np.clip(X, 0, W - 1.001); yi = np.clip(Y, 0, Hh - 1.001); x0 = xi.astype(int); y0 = yi.astype(int); fx = (xi - x0)[:, None]; fy = (yi - y0)[:, None]
    c = (im[y0, x0, :3] * (1 - fx) + im[y0, x0 + 1, :3] * fx) * (1 - fy) + (im[y0 + 1, x0, :3] * (1 - fx) + im[y0 + 1, x0 + 1, :3] * fx) * fy
    aa = im[y0, x0, 3]; w = w * (aa > 0.5)
    acc += c * w[:, None]; wsum += w
    print("  texel thấy", int((w > 0.05).sum()))
col = np.zeros((TEX, TEX, 3), np.float32); wt = np.zeros((TEX, TEX), np.float32)
col[ii[:, 0], ii[:, 1]] = acc / np.maximum(wsum, 1e-6)[:, None]; wt[ii[:, 0], ii[:, 1]] = (wsum > 1e-3)
# lấp texel không ảnh nào thấy: push–pull
lv = [(col * wt[..., None], wt)]
while lv[-1][1].shape[0] > 4:
    c_, w_ = lv[-1]; h2 = c_.shape[0] // 2
    lv.append((c_.reshape(h2, 2, h2, 2, 3).sum((1, 3)), w_.reshape(h2, 2, h2, 2).sum((1, 3))))
fill = lv[-1][0] / np.maximum(lv[-1][1], 1e-6)[..., None]
for c_, w_ in lv[-2::-1]:
    fill = np.repeat(np.repeat(fill, 2, 0), 2, 1)
    fill = np.where(w_[..., None] > 0, c_ / np.maximum(w_, 1e-6)[..., None], fill)
print("LẤP texel", int((valid & (wt < 0.5)).sum()))
img = bpy.data.images.new("hair_color", TEX, TEX)
px = np.ones((TEX, TEX, 4), np.float32); px[..., :3] = np.clip(np.clip(fill, 0, 1) ** 2.2 * GAIN, 0, 1) ** (1 / 2.2); img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.splitext(out)[0] + "_hair_color.png"; img.file_format = "PNG"; img.save()

m = bpy.data.materials.new("Hair"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; nt.links.new(tn.outputs["Color"], b.inputs["Base Color"])
b.inputs["Roughness"].default_value = 0.45; b.inputs["Specular IOR Level"].default_value = 0.4
hair.data.materials.clear(); hair.data.materials.append(m)
for p_ in hair.data.polygons:
    p_.use_smooth = True
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out, img.filepath_raw)
