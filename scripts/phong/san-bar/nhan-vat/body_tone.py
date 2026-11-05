"""Da thân đều màu + khớp màu da mặt (sau makeup.py): bỏ vết rám nắng của da MakeHuman, thân không nhạt/trắng hơn mặt.

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/body_tone.py -- <ra.blend> [--sigma 0.04] [--gain 1,1,1] [--res 2048]

- Màu đích = trung vị da má–cằm (texel mặt hướng trước, cao 2–8 cm trên khớp đầu, |x| 2–5 cm) của chính texture × --gain.
- Thân (dưới khớp đầu 3 cm, đầy đủ từ 8 cm): màu × (đích / mờ σ --sigma) theo kênh, tuyến tính → mất mảng lớn (vết rám
  nắng: vệt sẫm bụng dưới, mảng sáng lưng–mông của young_asian_female), giữ chi tiết < σ (vân da, rốn, khớp ngón). Chừa núm
  vú, vùng kín (nhóm đỉnh MakeHuman), mờ mép 1 cm. Làm mờ trong UV có trọng số (texel hợp lệ), bán kính theo m/texel.
- Hệ số tính ở --res rồi phóng lên cỡ texture (trường trơn).
"""
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
SIG = float(opt("--sigma", 0.04)); GAIN = np.array([float(x) for x in opt("--gain", "1,1,1").split(",")], np.float32)
RES = int(opt("--res", 2048))

body = bpy.data.objects["Body"]
col = next(n.image for m in body.data.materials for n in m.node_tree.nodes
           if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("body_color"))
T = col.size[0]
scn = bpy.context.scene; scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 1; scn.render.bake.margin = 6
saved = list(body.data.materials)
# giữ bộ ẩn lưới phụ (Mask) khi nướng: lưới phụ (quần bó, váy, tóc phụ) có UV chồng lên UV thân


def bake(setup):
    img = bpy.data.images.new("bk", RES, RES, alpha=False, float_buffer=True)
    m = bpy.data.materials.new("bk"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission"); oo = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], oo.inputs["Surface"])
    nt.links.new(setup(nt), em.inputs["Color"])
    tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; nt.nodes.active = tn
    for i in range(len(saved)):
        body.data.materials[i] = m
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.bake(type="EMIT")
    for i, mm in enumerate(saved):
        body.data.materials[i] = mm
    px = np.empty(RES * RES * 4, np.float32); img.pixels.foreach_get(px)
    return px.reshape(RES, RES, 4)[..., :3]


def geo(sock):
    def f(nt):
        g = nt.nodes.new("ShaderNodeNewGeometry"); ad = nt.nodes.new("ShaderNodeVectorMath"); ad.inputs[1].default_value = (10, 10, 10)
        nt.links.new(g.outputs[sock], ad.inputs[0]); return ad.outputs[0]
    return bake(f) - 10


def vgroup(names):
    w = np.zeros(len(body.data.vertices), np.float32)
    for nm in names:
        if nm in body.vertex_groups:
            gi = body.vertex_groups[nm].index
            w = np.maximum(w, np.array([max([g.weight for g in v.groups if g.group == gi], default=0.0) for v in body.data.vertices], np.float32))
    ca = body.data.color_attributes.new("vg_tone", "FLOAT_COLOR", "POINT"); ca.data.foreach_set("color", np.repeat(w, 4))

    def f(nt):
        n = nt.nodes.new("ShaderNodeVertexColor"); n.layer_name = "vg_tone"; return n.outputs["Color"]
    r = bake(f)[..., 0]
    body.data.color_attributes.remove(body.data.color_attributes["vg_tone"])
    return r


P = geo("Position"); N = geo("Normal")
valid = np.abs(np.linalg.norm(N, axis=-1) - 1) < 0.1
EXC = vgroup(["nipple", "nippleTip", "genitals"])
gh = body.vertex_groups["joint-head"].index
zh = float(np.mean([(body.matrix_world @ v.co).z for v in body.data.vertices if any(g.group == gh for g in v.groups)]))
dpx = np.linalg.norm(P[:, 1:] - P[:, :-1], axis=-1)
mpt = float(np.median(dpx[valid[:, 1:] & valid[:, :-1] & (dpx < 0.02)]))


def box_blur(x, r):
    r = max(int(round(r)), 1)
    for _ in range(3):
        for ax in (0, 1):
            c = np.cumsum(np.pad(x, [(r + 1, r) if i == ax else (0, 0) for i in range(x.ndim)], mode="edge"), axis=ax)
            x = (np.take(c, np.arange(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, np.arange(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return x


px = np.empty(T * T * 4, np.float32); col.pixels.foreach_get(px); px = px.reshape(T, T, 4)
k = T // RES
small = px[::k, ::k, :3][:RES, :RES]
lin = np.where(small <= 0.04045, small / 12.92, ((small + 0.055) / 1.055) ** 2.4).astype(np.float32)
face = valid & (P[..., 2] > zh + 0.02) & (P[..., 2] < zh + 0.08) & (np.abs(P[..., 0]) > 0.02) & (np.abs(P[..., 0]) < 0.05) & (N[..., 1] < -0.5)
tgt = np.median(lin[face], 0) * GAIN
t_ = np.clip((zh - 0.03 - P[..., 2]) / 0.05, 0, 1); wB = (t_ * t_ * (3 - 2 * t_)) * valid
wB = wB * (1 - np.clip(box_blur(EXC, 0.01 / mpt) * 1.5, 0, 1))
src = (valid & (EXC < 0.05) & (P[..., 2] < zh - 0.03)).astype(np.float32)
r = SIG / mpt
low = box_blur(lin * src[..., None], r) / np.maximum(box_blur(src, r), 1e-4)[..., None]
ratio = np.clip(tgt[None, None] / np.maximum(low, 1e-5), 0.4, 2.5)
F = 1 + (ratio - 1) * wB[..., None]
print("TONE mặt (tuyến tính)", np.round(tgt, 3), "thân TB trước", np.round(np.median(lin[(wB > 0.9)], 0), 3),
      "m/texel %.4f" % mpt, "texel thân", int((wB > 0.5).sum()))
F = np.repeat(np.repeat(F, k, 0), k, 1)[:T, :T]
full = px[..., :3]
L2 = np.where(full <= 0.04045, full / 12.92, ((full + 0.055) / 1.055) ** 2.4) * F
px[..., :3] = np.where(L2 <= 0.0031308, L2 * 12.92, 1.055 * np.power(np.maximum(L2, 0), 1 / 2.4) - 0.055).clip(0, 1)
img = bpy.data.images.new("body_color_tone", T, T); img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.splitext(out)[0] + "_body_color.png"; img.file_format = "PNG"; img.save()
for m in body.data.materials:
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image == col:
            n.image = img
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out, img.filepath_raw)
