"""Lớp an toàn trên thân: làm phẳng hình khối và xoá chi tiết vùng nhạy cảm (ngực, vùng kín) trên texture da + normal map.

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/an_toan.py -- <ra.blend> [--anh <tiền tố ảnh ra>]

- Vì sao: đồ che là lớp thứ nhất; lớp này để khi có sự cố (đồ xuyên, mặt nạ alpha lệch, bộ đồ mới quên ẩn da) thì chỗ hở
  cũng chỉ là da trơn như búp bê, không có gì để TikTok gỡ live. Chạy TRƯỚC khi mặc đồ / dựng bikini (đồ ôm theo thân mới).
- Hình: đỉnh trong vùng `nguc` bị kéo về mặt cầu ngực trơn (bỏ chỗ nhô đầu ngực), vùng `hang` làm mịn Laplace.
- Màu: texel trong vùng (đo 3D bằng nướng toạ độ trên UV thân) thay bằng màu da trung bình vành ngoài vùng, mờ dần 1,2 cm;
  normal map vùng đó về phẳng. Ảnh mới ghi cạnh .blend (`<tiền tố>_body_color.png`, `<tiền tố>_<ảnh normal>_an_toan.png`)
  và gắn vào vật liệu.
- Vùng: `vung_nhay_cam.py` (dùng chung với bikini.py, rig_base.py).
"""
import os
import sys

import bpy
import bmesh
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vung_nhay_cam as vnc  # noqa: E402

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
TIEN_TO = a[a.index("--anh") + 1] if "--anh" in a else os.path.splitext(os.path.abspath(out))[0]
body = bpy.data.objects["Body"]
V = vnc.do(body)

# ---------- hình ----------
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
X = np.array([v.co for v in bm.verts])
# ngực: làm mịn Laplace thật nhiều lượt trong vùng (vành ngoài đứng yên) → chỗ nhô đầu ngực tan vào mặt ngực.
# (Khớp mặt cầu rồi hạ chỗ nhô đã thử: lưới đầu ngực MPFB dày, cầu khớp lệch, chỉ dời được 2 đỉnh — model-1.)
nv = [bm.verts[i] for i in V["nguc"]]
for _ in range(40):
    bmesh.ops.smooth_vert(bm, verts=nv, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
dl = np.linalg.norm(np.array([v.co for v in nv]) - X[V["nguc"]], axis=1)
print("NGUC mịn", len(nv), "đỉnh, dời nhiều nhất", round(float(dl.max()) * 1000, 1), "mm")
hv = [bm.verts[i] for i in V["hang"]]
for _ in range(6):
    bmesh.ops.smooth_vert(bm, verts=hv, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
print("HANG mịn", len(hv), "đỉnh")
bm.to_mesh(body.data); bm.free(); body.data.update()

# ---------- màu, normal map ----------
mat = body.data.materials[0]
nt = mat.node_tree
bsdf = nt.nodes["Principled BSDF"]
tx_mau = bsdf.inputs["Base Color"].links[0].from_node
img_mau = tx_mau.image
# normal map: mọi ảnh "normal" trong vật liệu thân (base có thể giữ nhiều bản, chỉ một bản đang nối)
imgs_nor = list({nd.image.name: nd.image for nd in nt.nodes
                 if nd.type == "TEX_IMAGE" and nd.image and "normal" in nd.image.name.lower()}.values())
RES = img_mau.size[0]
print("ANH mau", img_mau.name, RES, "normal", [i.name for i in imgs_nor])

sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = 1; sc.cycles.device = "CPU"
OFF = 10.0                                                      # nướng màu âm bị kẹp về 0 → cộng 10 (như makeup.py)
bake = bpy.data.images.new("_pos", RES, RES, float_buffer=True)
m = bpy.data.materials.new("_bake"); m.use_nodes = True; bn = m.node_tree
for x in list(bn.nodes):
    bn.nodes.remove(x)
geo = bn.nodes.new("ShaderNodeNewGeometry"); add = bn.nodes.new("ShaderNodeVectorMath"); add.operation = "ADD"
add.inputs[1].default_value = (OFF, OFF, OFF); em = bn.nodes.new("ShaderNodeEmission")
o_ = bn.nodes.new("ShaderNodeOutputMaterial"); tb = bn.nodes.new("ShaderNodeTexImage"); tb.image = bake
bn.links.new(geo.outputs["Position"], add.inputs[0]); bn.links.new(add.outputs[0], em.inputs["Color"])
bn.links.new(em.outputs[0], o_.inputs["Surface"]); bn.nodes.active = tb
goc = list(body.data.materials); body.data.materials.clear(); body.data.materials.append(m)
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="EMIT", margin=8, use_clear=True)
pos = np.array(bake.pixels[:], np.float32).reshape(RES, RES, 4)
body.data.materials.clear()
for x in goc:
    body.data.materials.append(x)
bpy.data.images.remove(bake); bpy.data.materials.remove(m)
ok = pos[..., 0] > OFF / 2
P = pos[..., :3][ok] - OFF
print("TEXEL", int(ok.sum()))

FEATHER = 0.012


def trong_so(P_):
    """1 trong vùng (đã nới), mờ dần về 0 trong FEATHER mét."""
    w = np.zeros(len(P_), np.float32)
    for k in range(5):
        nho = FEATHER * (1 - k / 4)
        t = V["trong"](P_, nho)
        w = np.maximum(w, ((t["nguc"] | t["hang"]) * (1 - k / 4 * 0.8)).astype(np.float32))
    t0 = V["trong"](P_, 0.0)
    w[t0["nguc"] | t0["hang"]] = 1.0
    return w


W = np.zeros((RES, RES), np.float32); W[ok] = trong_so(P)
px = np.array(img_mau.pixels[:], np.float32).reshape(RES, RES, 4)
# màu thay: trung bình vành ngoài từng vùng (1,2–3 cm ngoài vùng)
ngoai = V["trong"](P, FEATHER + 0.018); trongv = V["trong"](P, FEATHER)
Pm = np.zeros((RES, RES), bool)
mau_vung = {}
for k in ("nguc", "hang"):
    vv = ngoai[k] & ~trongv[k]
    sel = np.zeros((RES, RES), bool); sel[ok] = vv
    mau_vung[k] = np.median(px[sel][:, :3], 0) if sel.any() else px[ok][:, :3].mean(0)
    print("MAU", k, mau_vung[k].round(3), int(sel.sum()))
tv = V["trong"](P, FEATHER)
for k in ("nguc", "hang"):
    sel = np.zeros((RES, RES), bool); sel[ok] = tv[k]
    w = W[sel][:, None]
    px[sel, :3] = px[sel, :3] * (1 - w) + mau_vung[k] * w
img = bpy.data.images.new("body_color_an_toan", RES, RES, alpha=True)
img.pixels[:] = px.ravel()
img.filepath_raw = TIEN_TO + "_body_color.png"; img.file_format = "PNG"; img.save()
for nd in nt.nodes:
    if nd.type == "TEX_IMAGE" and nd.image == img_mau:
        nd.image = img
print("GHI", img.filepath_raw, "phủ", int((W > 0.99).sum()), "texel")

for img_nor in imgs_nor:
    Rn = img_nor.size[0]; k_ = RES // Rn
    Wn = W.reshape(Rn, k_, Rn, k_).max(axis=(1, 3)) if k_ > 1 else W
    pn = np.array(img_nor.pixels[:], np.float32).reshape(Rn, Rn, 4)
    phang = np.array([0.5, 0.5, 1.0], np.float32)
    pn[..., :3] = pn[..., :3] * (1 - Wn[..., None]) + phang * Wn[..., None]
    imn = bpy.data.images.new(img_nor.name.rsplit(".", 1)[0] + "_an_toan", Rn, Rn, alpha=True)
    imn.colorspace_settings.name = "Non-Color"
    imn.pixels[:] = pn.ravel()
    imn.filepath_raw = TIEN_TO + "_" + img_nor.name.rsplit(".", 1)[0] + "_an_toan.png"; imn.file_format = "PNG"; imn.save()
    for nd in nt.nodes:
        if nd.type == "TEX_IMAGE" and nd.image == img_nor:
            nd.image = imn
    print("GHI", imn.filepath_raw)

sc.render.engine = "BLENDER_EEVEE"
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
