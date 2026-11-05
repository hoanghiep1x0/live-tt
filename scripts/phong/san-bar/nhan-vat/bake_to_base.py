"""Nướng màu (+ normal map) từ đầu Hunyuan đã tô màu sang UV của lưới gốc MPFB đã bọc.

blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/bake_to_base.py -- <đầu Hunyuan đã tô màu .glb> <ra.blend> [--tex 4096] [--iris <png>]

- Đầu tô màu (vd. head_m1_v13.glb) được đưa vào hệ toạ độ MPFB bằng đúng phép đồng dạng đã dùng khi bọc
  (tính lại từ "HunyuanAligned" trong file .blend: cùng thứ tự đỉnh với tượng gốc).
- Màu thân giữ da MPFB (chỉnh tông theo da mặt); vùng đầu lấy màu Hunyuan, hoà mềm ở cổ.
- --iris: thay texture mắt MPFB bằng tròng mắt thư viện (parts\\eyes\\<tên>\\iris_l.png).
- --nudge <ra>_nudge.json (face_nudge.py): dời đầu tô màu theo cùng trường nắn miệng → màu môi theo môi mới.
"""
import json
import os
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[:2]
TEX = int(argv[argv.index("--tex") + 1]) if "--tex" in argv else 4096
IRIS = argv[argv.index("--iris") + 1] if "--iris" in argv else None
HY_GEO = argv[argv.index("--hy-geo") + 1] if "--hy-geo" in argv else None   # tượng gốc chưa căn (cùng thứ tự đỉnh)
NUDGE = argv[argv.index("--nudge") + 1] if "--nudge" in argv else None

body = bpy.data.objects["Body"]
aligned = bpy.data.objects["HunyuanAligned"]

# ---------- phép đồng dạng tượng gốc → hệ MPFB ----------
bpy.ops.import_scene.gltf(filepath=HY_GEO)
raw = next(o for o in bpy.context.selected_objects if o.type == "MESH")
bpy.context.view_layer.objects.active = raw
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
A = np.array([v.co for v in raw.data.vertices]); B = np.array([v.co for v in aligned.data.vertices])
assert len(A) == len(B), "tượng gốc và HunyuanAligned phải cùng lưới"
pick = np.random.default_rng(0).choice(len(A), 4000, replace=False)
a_, b_ = A[pick], B[pick]; ma, mb = a_.mean(0), b_.mean(0)
U, S, Vt = np.linalg.svd((b_ - mb).T @ (a_ - ma))
Rm = U @ Vt; s = S.sum() / ((a_ - ma) ** 2).sum(); t = mb - s * Rm @ ma
print("XFORM s", round(s, 5), "err mm", round(float(np.abs((s * (Rm @ A.T)).T + t - B).max() * 1000), 3))
bpy.data.objects.remove(raw, do_unlink=True)

# ---------- đầu đã tô màu → hệ MPFB ----------
bpy.ops.import_scene.gltf(filepath=src)
col = next(o for o in bpy.context.selected_objects if o.type == "MESH")
bpy.context.view_layer.objects.active = col
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
C = np.array([v.co for v in col.data.vertices]); C2 = (s * (Rm @ C.T)).T + t
if NUDGE:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from face_nudge import field_eval
    C2 = C2 + field_eval(C2, json.load(open(NUDGE)))
for i, v in enumerate(col.data.vertices):
    v.co = C2[i]
col.data.update()
src_img = next(n.image for m in col.data.materials for n in m.node_tree.nodes if n.type == "TEX_IMAGE")


def emit_material(name, color_node_fn):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission"); o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(color_node_fn(nt), em.inputs["Color"]); nt.links.new(em.outputs[0], o.inputs["Surface"])
    return m


def tex_out(img):
    def f(nt):
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = img; return n.outputs["Color"]
    return f


def rgb_out(c):
    def f(nt):
        n = nt.nodes.new("ShaderNodeRGB"); n.outputs[0].default_value = (*c, 1); return n.outputs[0]
    return f


scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 1
scene.render.bake.margin = 16


def bake_to(img, from_obj, ray=0.02, cage=0.008):
    """Nướng EMIT từ from_obj (None = chính Body) vào ảnh img trên UV của Body."""
    bm = body.data.materials
    saved = [m for m in bm]
    tgt = bpy.data.materials.new("bake_tgt"); tgt.use_nodes = True
    tn = tgt.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img; tgt.node_tree.nodes.active = tn
    if from_obj is None:
        return
    for i in range(len(bm)):
        bm[i] = tgt
    bpy.ops.object.select_all(action="DESELECT")
    from_obj.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.bake(type="EMIT", use_selected_to_active=True, cage_extrusion=cage, max_ray_distance=ray)
    for i, m in enumerate(saved):
        bm[i] = m


def new_img(name):
    im = bpy.data.images.new(name, TEX, TEX, alpha=False, float_buffer=True)
    im.pixels[:] = np.zeros(TEX * TEX * 4, np.float32); return im


# 1) màu đầu
col.data.materials.clear(); col.data.materials.append(emit_material("hy_col", tex_out(src_img)))
img_col = new_img("head_col"); bake_to(img_col, col)
# 2) mặt nạ "có chạm" (chỗ tia không chạm đầu Hunyuan → 0)
col.data.materials.clear(); col.data.materials.append(emit_material("hy_mask", rgb_out((1, 1, 1))))
img_mask = new_img("head_mask"); bake_to(img_mask, col)

# 3) vùng đầu theo độ cao (trên cằm 1 cm → 1, dưới cằm 6 cm → 0) — nướng từ chính Body bằng màu đỉnh
P = np.array([body.matrix_world @ v.co for v in body.data.vertices])
zs = P[:, 2]; top = zs.max(); chin = top - 0.235
wv = np.clip((zs - (chin - 0.012)) / 0.03, 0, 1)
ca = body.data.color_attributes.new("headw", "FLOAT_COLOR", "POINT")
ca.data.foreach_set("color", np.repeat(wv, 4).astype(np.float32))
saved = list(body.data.materials)
wm = emit_material("w", lambda nt: (lambda n: (setattr(n, "layer_name", "headw"), n.outputs["Color"])[1])(nt.nodes.new("ShaderNodeVertexColor")))
img_w = new_img("head_w")
tn = wm.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img_w; wm.node_tree.nodes.active = tn
for i in range(len(body.data.materials)):
    body.data.materials[i] = wm
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="EMIT", use_selected_to_active=False)
for i, m in enumerate(saved):
    body.data.materials[i] = m

# 4) da MPFB gốc (đổi về cùng cỡ) + chỉnh tông theo da mặt Hunyuan
skin_img = next(n.image for n in body.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
sk = skin_img.copy(); sk.scale(TEX, TEX)
SK = np.array(sk.pixels[:], np.float32).reshape(TEX, TEX, 4)[..., :3]
SK = np.where(SK <= 0.04045, SK / 12.92, ((SK + 0.055) / 1.055) ** 2.4)        # sRGB → tuyến tính
HC = np.array(img_col.pixels[:], np.float32).reshape(TEX, TEX, 4)[..., :3]
MK = np.array(img_mask.pixels[:], np.float32).reshape(TEX, TEX, 4)[..., 0]
HW = np.array(img_w.pixels[:], np.float32).reshape(TEX, TEX, 4)[..., 0]
band = (MK > 0.5) & (HW > 0.95)                                               # mặt: nơi cả hai cùng có màu da
if band.sum() > 100:
    gain = np.median(HC[band], 0) / np.maximum(np.median(SK[band], 0), 1e-4)
    SK = SK * gain
    print("SKIN TONE gain", gain.round(3))
alpha = np.clip(MK, 0, 1) * HW
FIN = SK * (1 - alpha[..., None]) + HC * alpha[..., None]
FIN = np.where(FIN <= 0.0031308, FIN * 12.92, 1.055 * np.power(np.maximum(FIN, 0), 1 / 2.4) - 0.055)  # → sRGB để lưu PNG
final = bpy.data.images.new("body_color", TEX, TEX)
final.pixels[:] = np.dstack([np.clip(FIN, 0, 1), np.ones((TEX, TEX, 1), np.float32)]).ravel()
final.filepath_raw = os.path.splitext(out)[0] + "_body_color.png"; final.file_format = "PNG"; final.save()
print("BAKED", final.filepath_raw, "head pixels", int((alpha > 0.5).sum()))

# gắn texture mới vào vật liệu da
for m in body.data.materials:
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image == skin_img:
            n.image = final

# ---------- mắt: tròng thư viện đặt vào bố cục texture mắt MakeHuman ----------
# (texture mắt MH 1024: hai đĩa tròng tâm (0.29, 0.71) và (0.70, 0.30) tính từ góc trên-trái, bán kính ~0.112)
if IRIS:
    eyes = next((o for o in bpy.data.objects if o.name.startswith("Body.high-poly")), None)
    if eyes:
        mh_img = next(n.image for m in eyes.data.materials for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
        W_, H_ = mh_img.size
        MHp = np.array(mh_img.pixels[:], np.float32).reshape(H_, W_, 4)          # hàng 0 = đáy
        lib = bpy.data.images.load(IRIS); LW, LH = lib.size
        LP = np.array(lib.pixels[:], np.float32).reshape(LH, LW, 4)
        r_lib = 0.275 * LW                                                       # bán kính tròng trong ảnh thư viện (IRIS/BALL·0.5)
        yy, xx = np.mgrid[0:H_, 0:W_].astype(np.float32)
        IS = float(argv[argv.index("--iris-scale") + 1]) if "--iris-scale" in argv else 1.0   # tròng to hơn (mắt game/donghua)
        SCL = float(argv[argv.index("--sclera") + 1]) if "--sclera" in argv else 0.0          # làm sáng lòng trắng (0..1)
        dmin = np.full((H_, W_), 9.0, np.float32)
        for cx, cy_top in ((0.29, 0.71), (0.70, 0.30)):
            cx_, cy_ = cx * W_, (1 - cy_top) * H_
            r_mh = 0.112 * W_ * IS
            d = np.hypot(xx - cx_, yy - cy_) / r_mh
            dmin = np.minimum(dmin, d)
            sx = (LW / 2 + (xx - cx_) / r_mh * r_lib).clip(0, LW - 1).astype(int)
            sy = (LH / 2 + (yy - cy_) / r_mh * r_lib).clip(0, LH - 1).astype(int)
            a = np.clip((1.0 - d) / 0.08, 0, 1)[..., None]
            MHp[..., :3] = MHp[..., :3] * (1 - a) + LP[sy, sx, :3] * a
        if SCL > 0:
            k = (np.clip((dmin - 1.05) / 0.15, 0, 1) * SCL)[..., None]
            MHp[..., :3] = MHp[..., :3] + (1 - MHp[..., :3]) * k
        new_eye = bpy.data.images.new("eye_lib", W_, H_, alpha=True); new_eye.pixels[:] = MHp.ravel(); new_eye.pack()  # giữ alpha: lớp giác mạc trong suốt
        for m in eyes.data.materials:
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image == mh_img:
                    n.image = new_eye
        print("IRIS", IRIS)

bpy.data.objects.remove(col, do_unlink=True)
aligned.hide_render = True
# mày: vẽ vào texture (makeup.py) → bỏ mày MPFB. Mi: giữ thẻ mi MPFB (bám đúng mép mí, theo xương), đổi kiểu bằng --lashes
LASHES = argv[argv.index("--lashes") + 1] if "--lashes" in argv else None
for o in list(bpy.data.objects):
    if o.name.startswith("Body.eyebrow") or (LASHES and o.name.startswith("Body.eyelashes")):
        bpy.data.objects.remove(o, do_unlink=True)
if LASHES:
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    assets = bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data")
    if os.path.isdir(LASHES):                       # bộ mi riêng (lash_style.py → parts\lashes\<tên>)
        mh = os.path.join(LASHES, next(f for f in os.listdir(LASHES) if f.endswith(".mhclo")))
    else:
        mh = os.path.join(assets, "eyelashes", LASHES, LASHES + ".mhclo")
    HumanService.add_mhclo_asset(mh, body, asset_type="Eyelashes", subdiv_levels=0, material_type="GAMEENGINE")
    for o in bpy.data.objects:
        if o.name.startswith("Body.eyelashes"):
            for m in o.data.materials:                  # sợi mi mờ, không bóng (bóng 0,5 mặc định → mi xám dưới đèn)
                bs = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
                bs.inputs["Roughness"].default_value = 0.9; bs.inputs["Specular IOR Level"].default_value = 0.1
    print("LASHES", mh)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
