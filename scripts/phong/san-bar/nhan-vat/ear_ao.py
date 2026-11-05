"""Bóng khối tai: nướng che khuất (AO) của chính lưới vào texture màu vùng tai (sau makeup.py).

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/ear_ao.py -- <ra.blend> [--k 0.7] [--gamma 1.3] [--res 2048] [--samples 64] [--warm 0.75,1,1.15]

- Model-1: texture tai làm phẳng (--ear-shade 0.6, normal map tai phẳng) để hết vết nhăn → nhìn thẳng tai phẳng màu, đọc như lộ
  cạnh; ảnh mẫu thì hõm tai tối, vành tai sáng. AO của hình tai MakeHuman cho đúng mảng khối lớn (hõm, gờ đối luân) mà không
  mang vân nhỏ.
- AO chuẩn hoá theo phân vị 90 trong vùng tai (≤ 1), mũ --gamma, nhân vào màu tuyến tính: lerp(1, AO, --k × trọng số nhóm "ears").
- --warm: mũ theo kênh R,G,B của hệ số tối (bóng trong tai ảnh ngả hồng ấm — da tán xạ; nhân đều thì bóng xám).
- Ghi <ra>_body_color.png, thay ảnh màu trong vật liệu.
"""
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
K, GAM, RES, SAMP = opt("--k", 0.7), opt("--gamma", 1.3), int(opt("--res", 2048)), int(opt("--samples", 64))

body = bpy.data.objects["Body"]
col = next(n.image for m in body.data.materials for n in m.node_tree.nodes
           if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("body_color"))
T = col.size[0]
scn = bpy.context.scene
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = SAMP; scn.render.bake.margin = 8
saved = list(body.data.materials)


def bake(kind, setup=None):
    img = bpy.data.images.new("bk_" + kind, RES, RES, alpha=False, float_buffer=True)
    mt = bpy.data.materials.new("bk_" + kind); mt.use_nodes = True; nt = mt.node_tree
    if setup:
        setup(nt)
    tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; nt.nodes.active = tn
    for i in range(len(saved)):
        body.data.materials[i] = mt
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.bake(type="AO" if kind == "ao" else "EMIT")
    for i, m in enumerate(saved):
        body.data.materials[i] = m
    px = np.empty(RES * RES * 4, np.float32); img.pixels.foreach_get(px)
    return px.reshape(RES, RES, 4)[..., 0]


AO = bake("ao")
gi = body.vertex_groups["ears"].index
at = body.data.attributes.new("ear_w", "FLOAT", "POINT")
at.data.foreach_set("value", [next((g.weight for g in v.groups if g.group == gi), 0.0) for v in body.data.vertices])


def ear_emit(nt):
    nt.nodes.clear()
    g = nt.nodes.new("ShaderNodeAttribute"); g.attribute_name = "ear_w"
    em = nt.nodes.new("ShaderNodeEmission"); oo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(g.outputs["Fac"], em.inputs["Color"]); nt.links.new(em.outputs[0], oo.inputs["Surface"])


EW = bake("ear", ear_emit)
body.data.attributes.remove(body.data.attributes["ear_w"])
sel = EW > 0.5
ref = np.percentile(AO[sel], 90) if sel.any() else 1.0
A_ = np.clip(AO / max(ref, 1e-4), 0, 1) ** GAM
F = 1 - np.clip(EW * 1.2, 0, 1) * K * (1 - A_)                     # hệ số nhân (RES × RES)
print("EAR AO texel tai", int(sel.sum()), "AO p90 %.3f" % ref, "tối nhất ×%.2f" % F.min())
if RES != T:                                                       # phóng lên cỡ texture (song tuyến)
    yi = np.linspace(0, RES - 1, T); i0 = np.floor(yi).astype(int); i1 = np.minimum(i0 + 1, RES - 1); f = (yi - i0)[:, None]
    F = F[i0] * (1 - f) + F[i1] * f
    F = F[:, i0] * (1 - f.T) + F[:, i1] * f.T
px = np.empty(T * T * 4, np.float32); col.pixels.foreach_get(px); px = px.reshape(T, T, 4)
WARM = np.array([float(v) for v in (a[a.index("--warm") + 1] if "--warm" in a else "0.75,1,1.15").split(",")], np.float32)
lin = np.where(px[..., :3] <= 0.04045, px[..., :3] / 12.92, ((px[..., :3] + 0.055) / 1.055) ** 2.4) * F[..., None] ** WARM
px[..., :3] = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.maximum(lin, 0), 1 / 2.4) - 0.055)
img = bpy.data.images.new("body_color_ao", T, T); img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.splitext(out)[0] + "_body_color.png"; img.file_format = "PNG"; img.save()
for m in body.data.materials:
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image == col:
            n.image = img
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out, img.filepath_raw)
