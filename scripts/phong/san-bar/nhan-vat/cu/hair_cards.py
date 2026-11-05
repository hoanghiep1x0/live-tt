"""Thẻ tóc (hair cards) bám theo khối tóc Hunyuan đã ráp (hair_fit.py): tóc có sợi, đuôi tóc mảnh, xuất GLB như game.

blender -b <base có "Hair".blend> --python scripts/phong/san-bar/nhan-vat/hair_cards.py -- <ra.blend> [--cards 2600] [--seed 3] \
    [--len 0.06,0.16] [--width 0.007] [--color 0.03,0.025,0.022] [--shell-gain 0.35] \n    [--images <thư mục 4 ảnh tóc>] [--zcut -0.01]

- Khối Hunyuan đúng dáng kiểu tóc (ngôi giữa, lọn xoắn, lọn trước tai) nhưng là khối đặc, lọn như dải băng, không có sợi →
  giữ khối làm lớp nền tối (thu vào 1,5 mm, màu × --shell-gain), phủ thẻ tóc lên mặt ngoài.
- Vùng thẻ: dưới đáy da đầu + --zcut (tóc rủ) và mặt hướng lên ở đỉnh; vòng lọn xoắn để khối Hunyuan.
- --images (thử, không dùng cho model-1: nhiễu, đảo chiều → rối): hướng sợi đọc từ 4 ảnh tóc (structure tensor, ảnh nhìn thẳng nhất vào điểm đó), pha với hướng trọng lực theo độ
  rõ vân; hướng giữ quán tính 0,8 (sợi cong mềm).
- Gốc thẻ: rải đều theo diện tích trên mặt ngoài khối (pháp tuyến hướng ra xa tâm đầu). Hướng chảy: −Z chiếu lên mặt tiếp
  tuyến + đẩy ra xa đường ngôi (±X) ở đỉnh đầu (pháp tuyến hướng lên) → ngôi giữa. Bước 6 mm, mỗi bước bám lại mặt khối
  (điểm gần nhất + pháp tuyến × lớp 1–4 mm ngẫu nhiên), dừng khi rời khối.
- Thẻ = dải rộng --width (thon còn 55 % ở đuôi), nằm trên mặt khối (ngang = hướng chảy × pháp tuyến). UV: 8 cột atlas, dọc theo
  chiều dài; texture sợi tự sinh (30–40 sợi mỗi cột, đuôi sợi dừng lệch nhau → đuôi tóc lơ thơ, alpha cắt).
- Vật liệu: alpha cắt (Math > 0,35 → glTF alphaMode MASK: không lỗi thứ tự vẽ trong three.js), hai mặt.
"""
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
NC = int(opt("--cards", 2600)); SEED = int(opt("--seed", 3))
L0, L1 = (float(x) for x in opt("--len", "0.06,0.16").split(","))
WID = float(opt("--width", 0.007))
COL = np.array([float(x) for x in opt("--color", "0.03,0.025,0.022").split(",")], np.float32)
SG = float(opt("--shell-gain", 0.35))
rng = np.random.default_rng(SEED)

hair = bpy.data.objects["Hair"]; body = bpy.data.objects["Body"]
H = np.array([v.co for v in hair.data.vertices]) @ np.array(hair.matrix_world.to_3x3()).T + np.array(hair.matrix_world.translation)
F = np.array([list(p.vertices)[:3] for p in hair.data.polygons if len(p.vertices) >= 3])
bvh = BVHTree.FromPolygons(H.tolist(), F.tolist())
gi = body.vertex_groups["scalp"].index
S = np.array([tuple(body.matrix_world @ v.co) for v in body.data.vertices if any(g.group == gi and g.weight > 0.5 for g in v.groups)])
hc = S.mean(0); hc[2] = S[:, 2].min()                                          # tâm đầu (dưới vòm da đầu)

# ---------- gốc thẻ: rải theo diện tích, mặt ngoài ----------
A_, B_, C_ = H[F[:, 0]], H[F[:, 1]], H[F[:, 2]]
fn = np.cross(B_ - A_, C_ - A_); area = np.linalg.norm(fn, axis=1) / 2; fn /= np.maximum(2 * area, 1e-12)[:, None]
cen = (A_ + B_ + C_) / 3
outer = ((cen - hc) * fn).sum(1) > 0
# vùng phủ thẻ: tóc rủ (dưới vòng lọn xoắn) + lớp mỏng trên đỉnh (mặt hướng lên); vòng lọn xoắn giữ khối Hunyuan (đúng dáng
# xoắn; phủ thẻ theo trọng lực thì mất xoắn, đọc hướng từ ảnh thì nhiễu, rối — model-1)
Z_CUT = S[:, 2].min() + float(opt("--zcut", -0.01))
zone = (cen[:, 2] < Z_CUT) | (fn[:, 2] > 0.75)
outer &= zone
pr = np.where(outer, area, 0); pr /= pr.sum()
fi = rng.choice(len(F), NC, p=pr)
r1, r2 = rng.random(NC), rng.random(NC); s1 = np.sqrt(r1)
roots = A_[fi] * (1 - s1)[:, None] + B_[fi] * (s1 * (1 - r2))[:, None] + C_[fi] * (s1 * r2)[:, None]


# ---------- hướng sợi đọc từ 4 ảnh tóc (structure tensor): lọn xoắn có sợi chéo đúng như ảnh ----------
IMG_DIR = opt("--images", None)
VIEWS = {"hair-01-front.png": np.array([0, 1.0, 0]), "hair-02-left-profile.png": np.array([-1.0, 0, 0]),
         "hair-03-right-profile.png": np.array([1.0, 0, 0]), "hair-04-back.png": np.array([0, -1.0, 0])}
ORI = []
if IMG_DIR:
    def blur(x, s):
        k = np.exp(-np.arange(-3 * s, 3 * s + 1) ** 2 / (2 * s * s)); k /= k.sum()
        x = np.apply_along_axis(lambda r: np.convolve(r, k, "same"), 1, x)
        return np.apply_along_axis(lambda c: np.convolve(c, k, "same"), 0, x)
    for fn_, vd in VIEWS.items():
        im = bpy.data.images.load(os.path.join(IMG_DIR, fn_)); W, Hh = im.size
        x = np.empty(W * Hh * 4, np.float32); im.pixels.foreach_get(x); x = x.reshape(Hh, W, 4)[::-1]
        x = x[::2, ::2]; Hh, W = x.shape[:2]                                   # 1024 px: đủ cho hướng, đỡ chậm
        L = x[..., :3] @ np.array([0.3, 0.59, 0.11], np.float32); al = x[..., 3] > 0.5
        gx = np.zeros_like(L); gy = np.zeros_like(L); gx[:, 1:-1] = L[:, 2:] - L[:, :-2]; gy[1:-1] = L[2:] - L[:-2]
        jxx, jxy, jyy = blur(gx * gx, 3), blur(gx * gy, 3), blur(gy * gy, 3)
        th = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2                  # hướng sợi ⟂ hướng gradient mạnh nhất
        lam = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2); coh = lam / np.maximum(jxx + jyy, 1e-9)
        ys, xs = np.where(al); right = np.cross(vd, [0, 0, 1.0])
        u = H @ right; v = H[:, 2]; k = (ys.max() - ys.min()) / (v.max() - v.min())
        cu_, cx_ = (u.min() + u.max()) / 2, (xs.min() + xs.max()) / 2
        ORI.append((vd, right, k, cu_, cx_, v.max(), ys.min(), th, coh, al))
    print("HƯỚNG SỢI từ", len(ORI), "ảnh")


def img_dir(p, n):
    best = None
    for vd, right, k, cu_, cx_, vmax, y0, th, coh, al in ORI:
        f = n @ (-vd)
        if best is None or f > best[0]:
            best = (f, vd, right, k, cu_, cx_, vmax, y0, th, coh, al)
    f, vd, right, k, cu_, cx_, vmax, y0, th, coh, al = best
    X = int((p @ right - cu_) * k + cx_); Y = int((vmax - p[2]) * k + y0)
    if f < 0.3 or not (0 <= Y < th.shape[0] and 0 <= X < th.shape[1]) or not al[Y, X]:
        return None, 0.0
    t2 = th[Y, X]; d = right * np.cos(t2) - np.array([0, 0, 1.0]) * np.sin(t2)  # ảnh: y xuống
    return d, float(np.clip((coh[Y, X] - 0.15) / 0.5, 0, 1))


def flow(p, n, prev=None):
    top = np.clip((n[2] - 0.35) / 0.4, 0, 1)                                    # đỉnh đầu: chảy ra xa đường ngôi
    g = np.array([0.0, 0.0, -1.0]) + np.array([np.sign(p[0] + 1e-6) * 1.2 * top, 0.15 * top, 0.0])
    if ORI:
        d, c = img_dir(p, n)
        if d is not None:
            ref = prev if prev is not None else g
            if d @ ref < 0:
                d = -d
            g = g / np.linalg.norm(g) * (1 - c) + d * c * 1.5
    if prev is not None:
        g = g + prev * 0.8                                                      # sợi cong mềm, không gãy góc
    t = g - n * (g @ n)
    ln = np.linalg.norm(t)
    return t / ln if ln > 1e-6 else None


cards = []
for i in range(NC):
    p = roots[i]; lay = rng.uniform(0.001, 0.004); Lc = rng.uniform(L0, L1); d = None
    pts, nrm = [], []
    for _ in range(int(Lc / 0.006) + 1):
        loc, n, _, dist = bvh.find_nearest(Vector(p))
        if loc is None or dist > 0.012:
            break
        n = np.array(n); loc = np.array(loc)
        if (loc - hc) @ n < 0:
            n = -n
        q = loc + n * lay
        pts.append(q); nrm.append(n)
        d = flow(q, n, d if pts[:-1] else None)
        if d is None:
            break
        p = q + d * 0.006
    if len(pts) >= 4:
        cards.append((np.array(pts), np.array(nrm), rng.integers(0, 8)))
print("THẺ", len(cards), "/", NC)

# ---------- lưới thẻ ----------
V, Fc, UV = [], [], []
for pts, nrm, colk in cards:
    k = len(pts); t = np.gradient(pts, axis=0); t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
    side = np.cross(t, nrm); side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
    w = WID * rng.uniform(0.7, 1.3) * np.linspace(1.0, 0.55, k)
    base = len(V)
    for j in range(k):
        V.append(pts[j] - side[j] * w[j] / 2); V.append(pts[j] + side[j] * w[j] / 2)
        v_ = j / (k - 1)
        UV.append(((colk + 0.02) / 8, v_)); UV.append(((colk + 0.98) / 8, v_))
    for j in range(k - 1):
        Fc.append((base + 2 * j, base + 2 * j + 1, base + 2 * j + 3, base + 2 * j + 2))
me = bpy.data.meshes.new("HairCards"); me.from_pydata([tuple(v) for v in V], [], Fc); me.update()
uvl = me.uv_layers.new(name="UVMap")
for poly in me.polygons:
    for li in poly.loop_indices:
        uvl.data[li].uv = UV[me.loops[li].vertex_index]
for poly in me.polygons:
    poly.use_smooth = True
cobj = bpy.data.objects.new("HairCards", me); bpy.context.scene.collection.objects.link(cobj)
print("LƯỚI THẺ đỉnh", len(V), "mặt", len(Fc))

# ---------- texture sợi (atlas 8 cột) ----------
TW, TH = 1024, 2048
img = np.zeros((TH, TW, 4), np.float32)
yy = np.arange(TH)[:, None] / (TH - 1)                                          # v: 0 = gốc (hàng 0 ở đáy ảnh Blender)
cw = TW // 8
for c in range(8):
    for s in range(rng.integers(70, 90)):
        x0 = c * cw + rng.uniform(3, cw - 3); amp = rng.uniform(0, 1.0); ph = rng.uniform(0, 6.28)
        xs = x0 + amp * np.sin(yy[:, 0] * rng.uniform(3, 7) + ph)
        end = rng.uniform(0.6, 1.0) if rng.random() < 0.7 else rng.uniform(0.85, 1.0)   # đuôi sợi dừng lệch nhau
        wpx = rng.uniform(0.6, 1.2)
        tone = rng.uniform(0.5, 1.8) * (0.8 + 0.4 * yy[:, 0])                  # gốc tối hơn đuôi
        sl = slice(c * cw, (c + 1) * cw); xi = np.arange(c * cw, (c + 1) * cw)[None, :]          # chỉ trong cột (đỡ tốn)
        prof = np.clip(1 - np.abs(xi - xs[:, None]) / wpx, 0, 1)
        fade = np.clip((end - yy) / 0.08, 0, 1)
        al = prof * fade
        img[:, sl, 3] = np.maximum(img[:, sl, 3], al)
        img[:, sl, :3] += (al * tone[:, None])[..., None] * COL[None, None] * 0.25
img[..., :3] = np.where(img[..., 3:] > 1e-3, img[..., :3] / np.maximum(img[..., 3:], 1e-3) * 4, COL[None, None])
img[..., :3] = np.clip(img[..., :3], 0, 1)
bi = bpy.data.images.new("hair_strands", TW, TH, alpha=True); bi.pixels.foreach_set(img.ravel())
bi.filepath_raw = os.path.splitext(out)[0] + "_hair_strands.png"; bi.file_format = "PNG"; bi.save()

m = bpy.data.materials.new("HairCards"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = bi
gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.35
nt.links.new(tn.outputs["Color"], b.inputs["Base Color"]); nt.links.new(tn.outputs["Alpha"], gt.inputs[0]); nt.links.new(gt.outputs[0], b.inputs["Alpha"])
b.inputs["Roughness"].default_value = 0.35; b.inputs["Specular IOR Level"].default_value = 0.5
m.use_backface_culling = False
if hasattr(m, "surface_render_method"):
    m.surface_render_method = "DITHERED"
me.materials.append(m)

# ---------- khối nền: thu vào, tối đi ----------
hn = np.array([v.normal for v in hair.data.vertices])
co = np.array([v.co for v in hair.data.vertices]) - hn * 0.0015
hair.data.vertices.foreach_set("co", co.ravel()); hair.data.update()
for n_ in hair.active_material.node_tree.nodes:
    if n_.type == "BSDF_PRINCIPLED":
        lk = n_.inputs["Base Color"].links
        if lk:
            mul = hair.active_material.node_tree.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1
            mul.inputs[2].default_value = (SG, SG, SG, 1)
            src = lk[0].from_socket; hair.active_material.node_tree.links.new(src, mul.inputs[1])
            hair.active_material.node_tree.links.new(mul.outputs[0], n_.inputs["Base Color"])
        n_.inputs["Roughness"].default_value = 0.6
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
