"""Nướng normal map (chi tiết nhỏ của tượng Hunyuan: viền môi, cánh mũi, nếp mí…) sang UV lưới gốc.

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/bake_normal.py -- <ra.blend> [--tex 2048] [--max-deg 20] [--ortho <ortho_b>]

- Nguồn: đối tượng "HunyuanAligned" trong file (tượng đủ chi tiết, đã căn vào hệ MPFB lúc bọc).
- Tia ngắn (±4 mm): chỉ lấy chi tiết nơi lưới gốc đã áp sát tượng. Chỗ lệch hướng > --max-deg (mắt, tai, lòng miệng — nơi lưới
  gốc cố ý khác tượng) hoặc tia trượt → phẳng.
- --ortho (ortho.json + lm_ortho.json của lưới): quanh mắt và cổ cũng để phẳng — tượng nặn bọng/mí riêng (→ vệt chéo dưới đuôi
  mắt) và nặn cả vòng cổ của ảnh thành khối, mà góc lệch nhỏ nên lọt qua --max-deg.
  Tai (nhóm đỉnh "ears") + vòng da quanh tai (--ear-ring, mặc định 3,5 cm) cũng phẳng: tượng nặn tai sai, lùi sau → vết
  nhăn, vệt sọc sau tai.
- Ảnh lưu <ra>_normal.png (Non-Color), nối vào vật liệu da qua nút Normal Map (tangent, UVMap).
"""
import json
import os
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
out = argv[0]
TEX = int(argv[argv.index("--tex") + 1]) if "--tex" in argv else 2048
MAXDEG = float(argv[argv.index("--max-deg") + 1]) if "--max-deg" in argv else 20.0
ORTHO = argv[argv.index("--ortho") + 1] if "--ortho" in argv else None

body = bpy.data.objects["Body"]; hy = bpy.data.objects["HunyuanAligned"]
hy.hide_render = False; hy.hide_set(False); hy.hide_viewport = False
scn = bpy.context.scene
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 1
scn.render.bake.margin = 8; scn.render.bake.normal_space = "TANGENT"

img = bpy.data.images.new("body_normal", TEX, TEX, alpha=False, float_buffer=True)
img.colorspace_settings.name = "Non-Color"
saved = list(body.data.materials)
tgt = bpy.data.materials.new("bake_n"); tgt.use_nodes = True
tn = tgt.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img; tgt.node_tree.nodes.active = tn
for i in range(len(saved)):
    body.data.materials[i] = tgt
bpy.ops.object.select_all(action="DESELECT")
hy.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="NORMAL", use_selected_to_active=True, cage_extrusion=0.004, max_ray_distance=0.008)
for i, m in enumerate(saved):
    body.data.materials[i] = m

a = np.empty(TEX * TEX * 4, np.float32); img.pixels.foreach_get(a); a = a.reshape(TEX, TEX, 4)
N = a[..., :3] * 2 - 1
ln = np.linalg.norm(N, axis=-1)
N = N / np.maximum(ln, 1e-6)[..., None]
dev = np.degrees(np.arccos(np.clip(N[..., 2], -1, 1)))
keep = np.clip((MAXDEG - dev) / (MAXDEG * 0.35), 0, 1) * (ln > 0.5)           # lệch quá nhiều / trượt → phẳng

if ORTHO:
    # toạ độ thế giới từng texel: nướng EMIT vị trí (cộng 10 cho khỏi âm)
    pimg = bpy.data.images.new("bk_pos", TEX, TEX, alpha=False, float_buffer=True)
    pm = bpy.data.materials.new("bk_pos"); pm.use_nodes = True; nt = pm.node_tree; nt.nodes.clear()
    g = nt.nodes.new("ShaderNodeNewGeometry"); add = nt.nodes.new("ShaderNodeVectorMath"); add.inputs[1].default_value = (10, 10, 10)
    em = nt.nodes.new("ShaderNodeEmission"); oo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(g.outputs["Position"], add.inputs[0]); nt.links.new(add.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], oo.inputs["Surface"])
    pt = nt.nodes.new("ShaderNodeTexImage"); pt.image = pimg; nt.nodes.active = pt
    for i in range(len(saved)):
        body.data.materials[i] = pm
    hy.select_set(False); bpy.ops.object.bake(type="EMIT", use_selected_to_active=False)
    for i, m in enumerate(saved):
        body.data.materials[i] = m
    P = np.empty(TEX * TEX * 4, np.float32); pimg.pixels.foreach_get(P); P = P.reshape(TEX, TEX, 4)[..., :3] - 10
    meta = json.load(open(os.path.join(ORTHO, "ortho.json")))["ortho_0.png"]
    lm = {k: np.array(v) for k, v in json.load(open(os.path.join(ORTHO, "lm_ortho.json")))["ortho_0.png"].items()}
    R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
    to_w = lambda p: np.array([(p[0] - R / 2) / R * sc + cu, cv + (R / 2 - p[1]) / R * sc])   # px ortho → (x, z) thế giới
    flat_m = np.zeros((TEX, TEX), np.float32)
    front = P[..., 1] < 0.05
    for s in "lr":
        a_, b_ = to_w(lm[f"eye_{s}_in"]), to_w(lm[f"eye_{s}_out"]); Ew = np.linalg.norm(b_ - a_)
        c_ = (a_ + b_) / 2 + np.array([np.sign(b_[0] - a_[0]) * Ew * 0.1, -Ew * 0.1])   # lệch ra đuôi, xuống bọng mắt
        r2 = ((P[..., 0] - c_[0]) / Ew) ** 2 + ((P[..., 2] - c_[1]) / (Ew * 0.75)) ** 2
        flat_m = np.maximum(flat_m, np.clip((1.3 - r2) / 0.5, 0, 1) * front)
    zc = to_w(lm["chin"])[1]
    flat_m = np.maximum(flat_m, np.clip((zc - 0.002 - P[..., 2]) / 0.015, 0, 1) * (P[..., 2] > zc - 0.2))
    if "ears" in body.vertex_groups:
        # tai: lưới gốc giữ tai MakeHuman, tượng Hunyuan nặn tai sai → chi tiết nướng sang thành vết nhăn. Nướng trọng số nhóm
        # "ears" (thuộc tính đỉnh) ra UV rồi để phẳng
        gi = body.vertex_groups["ears"].index
        at = body.data.attributes.new("ear_w", "FLOAT", "POINT")
        at.data.foreach_set("value", [next((g.weight for g in v.groups if g.group == gi), 0.0) for v in body.data.vertices])
        nt.nodes.remove(g); g = nt.nodes.new("ShaderNodeAttribute"); g.attribute_name = "ear_w"
        nt.links.new(g.outputs["Fac"], em.inputs["Color"])
        eimg = bpy.data.images.new("bk_ear", TEX, TEX, alpha=False, float_buffer=True); pt.image = eimg
        for i in range(len(saved)):
            body.data.materials[i] = pm
        bpy.ops.object.bake(type="EMIT", use_selected_to_active=False)
        for i, m in enumerate(saved):
            body.data.materials[i] = m
        EW = np.empty(TEX * TEX * 4, np.float32); eimg.pixels.foreach_get(EW); EW = EW.reshape(TEX, TEX, 4)[..., 0]
        flat_m = np.maximum(flat_m, np.clip(EW * 2, 0, 1))
        body.data.attributes.remove(body.data.attributes["ear_w"])
        # vòng da quanh tai (khoảng cách 3D tới đỉnh tai ≤ --ear-ring, mờ thêm 1 cm): tai tượng nằm lùi sau tai lưới → gờ vành tai
        # tượng in thành vệt sọc trên da đầu sau tai (model-1; đất sét không có vệt → là normal map)
        RING = float(argv[argv.index("--ear-ring") + 1]) if "--ear-ring" in argv else 0.035
        EV = np.array([tuple(body.matrix_world @ v.co) for v in body.data.vertices
                       if any(g_.group == gi and g_.weight > 0.5 for g_ in v.groups)], np.float32)
        cand = (ln > 0.5) & (np.abs(P[..., 0]) > 0.04) & (P[..., 2] > EV[:, 2].min() - RING) & (P[..., 2] < EV[:, 2].max() + RING)
        ii = np.argwhere(cand); dmin = np.full(len(ii), 9.0, np.float32)
        for c0 in range(0, len(ii), 20000):
            q = P[ii[c0:c0 + 20000, 0], ii[c0:c0 + 20000, 1]].astype(np.float32)
            dmin[c0:c0 + 20000] = np.sqrt(((q[:, None] - EV[None]) ** 2).sum(-1)).min(1)
        ring = np.zeros((TEX, TEX), np.float32); ring[ii[:, 0], ii[:, 1]] = np.clip((RING + 0.01 - dmin) / 0.01, 0, 1)
        flat_m = np.maximum(flat_m, ring)
        print("FLAT vòng quanh tai (texel)", int((ring > 0.5).sum()))
    keep = keep * (1 - flat_m)
    print("FLAT mắt + cổ + tai (texel)", int((flat_m > 0.5).sum()))
flat = np.array([0, 0, 1], np.float32)
N = N * keep[..., None] + flat * (1 - keep[..., None])
N /= np.maximum(np.linalg.norm(N, axis=-1, keepdims=True), 1e-6)
a[..., :3] = N * 0.5 + 0.5; a[..., 3] = 1
img.pixels.foreach_set(a.ravel())
img.filepath_raw = os.path.splitext(out)[0] + "_normal.png"; img.file_format = "PNG"; img.save()
print("NORMAL", img.filepath_raw, "chi tiết (texel)", int((keep > 0.5).sum() - (dev < 1).sum()), "phẳng do lệch", int(((keep < 0.5) & (ln > 0.5)).sum()))

img2 = bpy.data.images.load(img.filepath_raw); img2.colorspace_settings.name = "Non-Color"
for m in body.data.materials:
    nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
    if not b:
        continue
    for l in list(b.inputs["Normal"].links):
        nt.links.remove(l)
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = img2
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.space = "TANGENT"; nm.uv_map = "UVMap"
    nt.links.new(t.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
hy.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
