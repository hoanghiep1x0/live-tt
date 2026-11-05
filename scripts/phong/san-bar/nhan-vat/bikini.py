"""Bikini dựng từ chính lưới thân (không có trong thư viện đồ MPFB): chép mặt thân vùng ngực–hông, đẩy ra 2,5 mm, vẽ dáng
áo/quần bằng mặt nạ alpha trên UV thân.

blender -b <base_do.blend> --python scripts/phong/san-bar/nhan-vat/bikini.py -- <ra.blend> [--ten bikini] [--mau d8344a] \
    [--res 2048] [--day 0.0025]

- Vì sao từ lưới thân: đỉnh trùng đỉnh da → rig_base chép trọng số xương từ thân (đối tượng có `tu_da`), đồ co giãn y hệt da,
  không xuyên ở bất kỳ điệu nào (đồ MPFB rộng hơn da mới cần xoá da dưới đồ; bikini thì da vẫn giữ, chỉ bị phủ).
- Dáng đồ đo theo mốc của chính nhân vật (đỉnh ngực `nippleTip`, khớp cổ, khớp chậu, nhóm `genitals`) → hồ sơ ngực to/nhỏ,
  hông rộng/hẹp đều ra bikini vừa người, không phải chỉnh số.
- Áo: hai cúp tam giác, dải chân ngực vòng quanh, dây cổ yếm vòng cổ. Quần: mảnh trước hình tam giác ngược, mảnh sau đầy
  hơn, dải eo hai bên, đáy nối trước–sau.
- Tay, chân không bị tô: điểm nào gần trục tay / trục chân hơn trục thân (theo bán kính) thì bỏ.
- Kiểu kín (live TikTok): cúp phủ cả bầu ngực, quần cạp cao vừa, mảnh sau phủ kín mông. **Tự kiểm che**: mọi đỉnh lõi vùng
  nhạy cảm (`vung_nhay_cam.py`, thu vào 1 cm) phải nằm trong vải đã thu vào 1,2 cm — thiếu là dừng, không ghi file. Đạt thì
  ghi `che = "nguc,hang"` lên đồ để rig_base ẩn hẳn da dưới đó.
- Đặt tên `Body.<ten>`: rig_base nhận như đồ, alpha cắt → glTF `MASK`.
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
opt = lambda k, d: a[a.index(k) + 1] if k in a else d  # noqa: E731
TEN = opt("--ten", "bikini")
MAU = opt("--mau", "d8344a")
RES = int(opt("--res", "2048"))
DAY = float(opt("--day", "0.0025"))

body = bpy.data.objects["Body"]
X0 = np.array([v.co for v in body.data.vertices])


def nhom(n):
    g = body.vertex_groups.get(n)
    if g is None:
        return np.zeros(0, int)
    return np.array([v.index for v in body.data.vertices if any(e.group == g.index for e in v.groups)], int)


def tam(n):
    i = nhom(n)
    assert len(i), "thiếu nhóm " + n
    return X0[i].mean(0)


def tam_co(*ns):
    return [tam(n) for n in ns if len(nhom(n))]


# ---------- mốc ----------
tip = X0[nhom("nippleTip")]
A = {1: tip[tip[:, 0] > 0].mean(0), -1: tip[tip[:, 0] < 0].mean(0)}
z_nguc = (A[1][2] + A[-1][2]) / 2
NECK, PELVIS = tam("joint-neck"), tam("joint-pelvis")
gen = X0[nhom("genitals")]
z_day = gen[:, 2].min() if len(gen) else tam("joint-l-upper-leg")[2] - 0.07
TRUC_THAN = [PELVIS + [0, 0, -0.06], PELVIS, tam("joint-spine-3"), tam("joint-spine-2"), tam("joint-spine-1"), NECK,
             tam("joint-head")]
TRUC_PHU = []                                           # (trục, bán kính) tay, chân
for s in ("l", "r"):
    TRUC_PHU.append((tam_co(f"joint-{s}-shoulder", f"joint-{s}-elbow", f"joint-{s}-wrist", f"joint-{s}-hand"), 0.05))
    TRUC_PHU.append((tam_co(f"joint-{s}-upper-leg", f"joint-{s}-knee", f"joint-{s}-ankle"), 0.085))
print("TRUC", [len(t) for t, _ in TRUC_PHU])
VN = vnc.do(body)
z_thap = VN["tam_hang"][2] - 0.03                      # điểm thấp nhất giữa hai chân (vung_nhay_cam)
print("MOC nguc", A[1].round(3), "co", NECK.round(3), "chau", PELVIS.round(3), "day", round(float(z_day), 3),
      "thap", round(float(z_thap), 3))


def kc_truc(P, pts):
    d = np.full(len(P), 1e9)
    for p, q in zip(pts[:-1], pts[1:]):
        v = q - p; t = np.clip(((P - p) @ v) / (v @ v), 0, 1)
        d = np.minimum(d, np.linalg.norm(P - (p + t[:, None] * v), axis=1))
    return d


def mat_na(P, N, m=0.0):
    """1 = có vải. P, N: toạ độ, pháp tuyến (n×3). m: nới rộng mọi hình m mét."""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    dt = kc_truc(P, TRUC_THAN) / 0.14
    than = np.ones(len(P), bool)
    for pts, r in TRUC_PHU:
        than &= dt <= kc_truc(P, pts) / r
    y_giua = np.interp(z, [PELVIS[2], NECK[2]], [PELVIS[1], NECK[1]])
    truoc = (y < y_giua) & (N[:, 1] < 0.35)
    sau = y >= y_giua
    M = np.zeros(len(P), bool)
    # áo: cúp tam giác phủ cả bầu ngực
    z_ub, z_top = z_nguc - 0.068, z_nguc + 0.085
    for s, Ap in A.items():
        t = np.clip((z - z_ub) / (z_top - z_ub), 0, 1)
        cx = Ap[0] - s * 0.014 * t
        w = 0.088 * (1 - t) ** 0.6 + 0.012
        M |= truoc & (z > z_ub - m) & (z < z_top + m) & (np.abs(x - cx) < w + m)
        # dây yếm: đỉnh cúp → bên cổ
        p = np.array([Ap[0] - s * 0.014, z_top]); q = np.array([s * 0.042, NECK[2] + 0.012])
        v = q - p; Q = np.stack([x, z], 1); tt = np.clip(((Q - p) @ v) / (v @ v), 0, 1)
        dd = np.linalg.norm(Q - (p + tt[:, None] * v), axis=1)
        M |= truoc & (dd < 0.0055 + m) & (z > z_top - 0.01)
    M |= than & (z > z_ub - 0.016 - m) & (z < z_ub + 0.002 + m)                     # dải chân ngực
    M |= (np.abs(z - (NECK[2] + 0.012)) < 0.0055 + m) & (dt < 0.8)                  # vòng cổ
    # quần: cạp cao vừa, mảnh sau phủ kín mông (ranh thân–chân phía sau nới 1,5 lần, không thì mép quần ăn lên mông)
    than_sau = np.ones(len(P), bool)
    for pts, r in TRUC_PHU:
        than_sau &= dt <= 1.5 * kc_truc(P, pts) / r
    z_w = PELVIS[2] + 0.025
    t = np.clip((z - z_day) / (z_w - z_day), 0, 1)
    duoi_dui = (np.abs(x) < 0.055) & (z < z_thap - 0.008)         # dưới đáy, sát giữa: mặt trong đùi
    M |= than & truoc & ~duoi_dui & (z < z_w + m) & (z > z_day - 0.045 - m) & (np.abs(x) < 0.04 + 0.085 * t ** 0.9 + m)
    M |= than_sau & sau & ~duoi_dui & (z < z_w + m) & (z > z_day - 0.075 - m) & (np.abs(x) < 0.06 + 0.085 * t ** 0.45 + m)
    # đáy nối trước–sau: rộng 4,8 cm, chỉ quanh điểm thấp nhất giữa hai chân — thấp hơn nữa là mặt trong đùi
    M |= ((np.abs(x) < 0.03 + m) | (than_sau & (z > z_thap - 0.008))) & (np.abs(x) < 0.048 + m) & (z < z_day + 0.04) \
        & (z > z_thap - 0.012) & (np.abs(y - PELVIS[1]) < 0.1)
    M |= than & (z > z_w - 0.011 - m) & (z < z_w + m)                                # dải eo
    # dưới đáy chậu ở dải giữa chỉ có mặt trong đùi: không mảnh nào được bò xuống đó (vệt nhỏ thõng xuống đùi — model-1)
    return M & ~((np.abs(x) < 0.06) & (z < z_thap - 0.012))


# ---------- tự kiểm che: lõi vùng nhạy cảm phải nằm trong vải, kể cả khi vải thu vào 1,2 cm ----------
loi = VN["trong"](X0, -0.01)
for k in ("nguc", "hang"):
    idx = np.nonzero(loi[k])[0]
    ph = mat_na(X0[idx], np.zeros((len(idx), 3)), m=-0.012)
    print("KIEM CHE", k, f"{int(ph.sum())}/{len(idx)} đỉnh")
    if len(idx) == 0 or not ph.all():
        ho = X0[idx[~ph]]
        print("HO", k, "(x, y, z)", ho[:5].round(3).tolist(), "tâm hang", VN["tam_hang"].round(3).tolist())
        raise SystemExit(f"bikini HỞ vùng {k}: {len(idx) - int(ph.sum())} đỉnh lõi không có vải — nới dáng trong mat_na()")

# ---------- lưới: chép thân, giữ mặt quanh vùng vải ----------
me = body.data.copy(); me.name = "Body." + TEN
# chỉ số đỉnh thân gốc của từng đỉnh đồ: rig_base chép ĐÚNG trọng số của đỉnh đó. Nội suy theo mặt gần nhất bắt nhầm lưới
# phụ váy / quần tất ẩn của MPFB → đồ văng thành dải quanh hông khi nhảy (model-1).
goc = me.attributes.new("goc", "INT", "POINT"); goc.data.foreach_set("value", list(range(len(me.vertices))))
ob = bpy.data.objects.new("Body." + TEN, me)
bpy.context.scene.collection.objects.link(ob)
ob.matrix_world = body.matrix_world.copy()
ob.vertex_groups.clear()
for k in list(ob.keys()):
    del ob[k]
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
bm.normal_update()
N0 = np.array([v.normal for v in bm.verts])
# giữ cả dải thân cổ → dưới đáy (trừ tay): ranh mặt lưới không được cắt vào vải, không thì mép vải răng cưa theo mặt
dt0 = kc_truc(X0, TRUC_THAN) / 0.14
keep_v = (X0[:, 2] > z_day - 0.12) & (X0[:, 2] < NECK[2] + 0.04)
for pts, r in TRUC_PHU[0::2]:                           # trục tay
    keep_v &= dt0 <= 1.45 * kc_truc(X0, pts) / r
grp_body = set(nhom("body").tolist())
bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(keep_v[v.index] and v.index in grp_body for v in f.verts)],
                 context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.normal_update()
for v in bm.verts:                                      # đẩy ra ngoài (chiều pháp tuyến lưới MPFB không chắc → so với trục thân)
    c = np.array([0.0, np.interp(v.co.z, [PELVIS[2], NECK[2]], [PELVIS[1], NECK[1]]), v.co.z])
    sgn = 1.0 if np.dot(np.array(v.normal), np.array(v.co) - c) >= 0 else -1.0
    v.co += v.normal * (DAY * sgn)
# cúp: căng thành vòm qua đầu ngực (vải ôm sát thì in hình đầu ngực — TikTok gỡ live vì lỗi này)
tip_i = nhom("nippleTip")
for s_, Ap in A.items():
    ti = [i for i in tip_i if X0[i, 0] * s_ > 0]
    n = np.mean([np.array(body.data.vertices[i].normal) for i in ti], 0)
    n = n if n[1] < 0 else -n; n /= np.linalg.norm(n)

    def vom(v):
        r = np.array(v.co) - Ap; h = r @ n; d = np.linalg.norm(r - h * n)
        return d, h

    vung = [v for v in bm.verts if vom(v)[0] < 0.032 and np.linalg.norm(np.array(v.co) - Ap) < 0.06]
    for lan in range(4):
        for v in vung:
            d, h = vom(v); tent = DAY + 0.0025 - 22.0 * d * d
            if h < tent:
                v.co += type(v.co)(n * (tent - h))
        if lan < 3:
            bmesh.ops.smooth_vert(bm, verts=[v for v in vung if vom(v)[0] < 0.026], factor=0.5,
                                  use_axis_x=True, use_axis_y=True, use_axis_z=True)
    print("VOM", s_, len(vung), "đỉnh")
bm.to_mesh(me); bm.free()
me.materials.clear()
ob["tu_da"] = 1
ob["che"] = "nguc,hang"                                 # đã qua kiểm che ở trên — rig_base ẩn hẳn da dưới hai vùng này
print("LUOI", len(me.vertices), "đỉnh", len(me.polygons), "mặt")

# ---------- mặt nạ trên UV: nướng toạ độ, pháp tuyến từng texel ----------
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = 1; sc.cycles.device = "CPU"


OFF = 10.0                                                      # nướng màu âm bị kẹp về 0 → cộng 10 (như makeup.py)


def nuong(socket):
    img = bpy.data.images.new("_bake", RES, RES, float_buffer=True)
    m = bpy.data.materials.new("_bake"); m.use_nodes = True; nt = m.node_tree
    for n_ in list(nt.nodes):
        nt.nodes.remove(n_)
    geo = nt.nodes.new("ShaderNodeNewGeometry"); em = nt.nodes.new("ShaderNodeEmission")
    outn = nt.nodes.new("ShaderNodeOutputMaterial"); tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img
    add = nt.nodes.new("ShaderNodeVectorMath"); add.operation = "ADD"; add.inputs[1].default_value = (OFF, OFF, OFF)
    nt.links.new(geo.outputs[socket], add.inputs[0]); nt.links.new(add.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], outn.inputs["Surface"])
    nt.nodes.active = tx
    me.materials.clear(); me.materials.append(m)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="EMIT", margin=6, use_clear=True)
    px = np.array(img.pixels[:], np.float32).reshape(RES, RES, 4)
    bpy.data.images.remove(img); bpy.data.materials.remove(m)
    return px


pos = nuong("Position")
nor = nuong("Normal")
valid = pos[..., 0] > OFF / 2                                  # texel có mặt lưới (nền nướng = 0)
P = pos[..., :3][valid] - OFF
Nn = nor[..., :3][valid] - OFF
mk = np.zeros((RES, RES), np.float32)
mk[valid] = mat_na(P, Nn).astype(np.float32)
print("TEXEL", int(valid.sum()), "vải", int(mk.sum()))

c = np.array([int(MAU[i:i + 2], 16) / 255 for i in (0, 2, 4)])
rgba = np.zeros((RES, RES, 4), np.float32)
rgba[..., 3] = mk
img = bpy.data.images.new(TEN + "_diffuse", RES, RES, alpha=True)
rgba[..., :3] = c                                               # ảnh 8 bit: pixels là giá trị sRGB thô
img.pixels[:] = rgba.ravel()
img.filepath_raw = os.path.join(os.path.dirname(os.path.abspath(out)), TEN + "_diffuse.png")
img.file_format = "PNG"; img.save()
img.pack()

m = bpy.data.materials.new(TEN); m.use_nodes = True; nt = m.node_tree
bsdf = nt.nodes["Principled BSDF"]; tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img
nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"]); nt.links.new(tx.outputs["Alpha"], bsdf.inputs["Alpha"])
bsdf.inputs["Roughness"].default_value = 0.45
if hasattr(m, "surface_render_method"):
    m.surface_render_method = "DITHERED"
me.materials.clear(); me.materials.append(m)
sc.render.engine = "BLENDER_EEVEE"
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
