"""Xuất từng món đồ MakeHuman (.mhclo) thành GLB rời gắn đúng xương model-1 — tủ đồ chia món (docs/phong/san-bar/nhan-vat/09-tu-do.md).

blender -b <base_v58_bikini.blend> --python scripts/phong/san-bar/nhan-vat/xuat_mon.py -- \
    <thư mục FBX điệu (có X Bot.fbx)> <thư mục tủ đồ> <thân> <nguồn> <ô> <file.mhclo>...     [--ten <ten.json>] [--gioi nu|nam|chung] [--tuoi nguoi-lon]

- Cùng đường với rig_base: xương "mixamo" của MPFB, chữ T như X Bot (retarget.tpose_like) → món khớp xương model-1.glb,
  three.js gắn món vào xương vũ công theo tên xương.
- <thân>: id nhân vật có base .blend này (vd model-1). Món ôm theo ĐÚNG thân này — nhân vật khác dáng phải xuất lại từ
  cùng .mhclo trên base của nó, ra thư mục thân của nó.
- Mỗi món ra một thư mục `<tủ đồ>/<thân>/<nguồn>/<ô>/<id>/`: `mon.glb` (lưới + xương, không điệu), `mat-na.png` (ảnh ẩn da theo
  UV của thân: trắng = da dưới món, three.js bỏ), `anh.webp` (ảnh nhỏ), `mon.json` (tên, ô, giấy phép, tác giả, vùng che).
  Xoá một món / một ô / một nguồn = xoá đúng thư mục đó; danh mục quét thư mục, không có danh sách nào phải sửa.
- Kiểm che (chính sách TikTok): món chạm vùng ngực / vùng kín (vung_nhay_cam.py) thì ẩn HẲN cả vùng đó trong mặt nạ và
  ghi vào `che` — sân khấu chỉ cho mặc bộ có đủ "nguc" và "hang".
- <ô>: ao · duoi (quần, váy) · lien (đầm, suit liền — chiếm cả ao và duoi) · lot (đồ lót an toàn — sân khấu tự mặc kèm
  khi bộ chưa che đủ) · giay · toc · mu · kinh · gang-tay · phu-kien.
- --ten <ten.json>: {"<tên file mhclo>": "Tên tiếng Việt"}; thiếu thì lấy tên trong .mhclo.
- --gioi (mặc định nu), --tuoi: nhãn để lọc trong tủ. Phòng sàn bar chỉ nạp `tuoi` = nguoi-lon (luật ở client,
  `locTuDo`) — script từ chối tuổi khác để món trẻ em không bao giờ lọt vào tủ của phòng này.
"""
import json
import math
import os
import re
import sys

import bpy
import numpy as np
from mathutils import Vector

from bl_ext.user_default.mpfb.entities.clothes.mhclo import Mhclo
from bl_ext.user_default.mpfb.services.clothesservice import ClothesService
from bl_ext.user_default.mpfb.services.humanservice import HumanService

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import retarget  # noqa: E402
import vung_nhay_cam as vnc  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
TEN = {}
if "--ten" in args:
    _p = args[args.index("--ten") + 1]
    TEN = json.load(open(_p, encoding="utf-8"))
    args = [a for a in args if a not in ("--ten", _p)]
def _lay(ten, mac):
    global args
    if ten not in args:
        return mac
    v = args[args.index(ten) + 1]
    args = [a for a in args if a not in (ten, v)]
    return v


GIOI, TUOI = _lay("--gioi", "nu"), _lay("--tuoi", "nguoi-lon")
if GIOI not in ("nu", "nam", "chung"):
    raise SystemExit(f"--gioi '{GIOI}' lạ — nu, nam hoặc chung")
if TUOI != "nguoi-lon":
    raise SystemExit("tủ đồ phòng sàn bar chỉ nhận đồ người lớn (--tuoi nguoi-lon) — chính sách TikTok về trẻ vị thành niên")
src_dir, KHO, THAN, NGUON, O, FILES = args[0], args[1], args[2], args[3], args[4], args[5:]
O_HOP_LE = ("ao", "duoi", "lien", "lot", "giay", "toc", "mu", "kinh", "gang-tay", "phu-kien")
if O not in O_HOP_LE:
    raise SystemExit(f"ô '{O}' lạ — dùng một trong {O_HOP_LE}")
MASK = 512
ANH_TOI_DA = 1024

body = bpy.data.objects["Body"]
for o in list(bpy.data.objects):
    if o.name == "HunyuanAligned":
        bpy.data.objects.remove(o, do_unlink=True)
# đồ đang mặc sẵn trên base (bộ cũ của model-1) không thuộc lần xuất này
for o in [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Body.")
          and not o.name.startswith(("Body.high-poly", "Body.eyelash", "Body.eyebrow"))]:
    bpy.data.objects.remove(o, do_unlink=True)


def dau_mhclo(path):
    """author / license / name trong phần đầu .mhclo."""
    d = {}
    for line in open(path, encoding="utf-8", errors="replace"):
        m = re.match(r"#?\s*(author|license|name):?\s+(.+)", line.strip())  # MakeClothes 2 ghi "# author: X"
        if m and m.group(1) not in d:
            d[m.group(1)] = m.group(2).strip()
        if line.startswith("obj_file"):
            break
    return d


# Giấy phép theo GÓI tải về (tên gói ở trang tài sản MakeHuman: *_cc0, *_ccby). Dòng "license" trong .mhclo không tin
# được: nhiều món CC0 vẫn mang chữ AGPL3 mẫu của MakeClothes cũ.
GIAY_PHEP_NGUON = {"makehuman-cc0": "CC0", "makehuman-ccby": "CC-BY 4.0"}


def id_cua(path):
    return re.sub(r"[^a-z0-9]+", "-", os.path.splitext(os.path.basename(path))[0].lower()).strip("-")


# ---------- mặc mọi món (MPFB ôm theo thân), rồi gắn xương ----------
HumanService.add_builtin_rig(body, "mixamo", import_weights=True)
rig = body.parent
rig.name = "Dancer"
mon = []
for f in FILES:
    truoc = set(bpy.data.objects)
    HumanService.add_mhclo_asset(f, body, asset_type="Clothes", subdiv_levels=0, material_type="GAMEENGINE")
    o = next(x for x in bpy.data.objects if x not in truoc and x.type == "MESH")
    mh = Mhclo(); mh.load(f)
    ClothesService.set_up_rigging(body, o, rig, mh)
    mon.append((f, o))
    print("MAC", o.name)

# ---------- mặt nạ da + kiểm che: tính trên thân trước khi đổi tư thế ----------
VN = vnc.do(body)
ten_nhom = {vg.index: vg.name.lower() for vg in body.vertex_groups}
def mat_na(an):
    """Ảnh MASK×MASK: tô các tam giác của thân có cả 3 đỉnh bị ẩn, theo toạ độ UV."""
    # lấy lại mỗi lần: đổi tư thế (tpose_like) cấp phát lại dữ liệu lưới, tham chiếu UV cũ thành rỗng
    uv = body.data.uv_layers.active.data
    body.data.calc_loop_triangles()
    img = np.zeros((MASK, MASK), np.uint8)
    for t in body.data.loop_triangles:
        if not all(an[v] for v in t.vertices):
            continue
        p = np.array([uv[li].uv[:] for li in t.loops]) * (MASK - 1)
        x0, y0 = np.floor(p.min(0)).astype(int)
        x1, y1 = np.ceil(p.max(0)).astype(int)
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1, MASK - 1) + 1), np.arange(max(y0, 0), min(y1, MASK - 1) + 1))
        if xs.size == 0:
            continue
        a, b, c = p
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-12:
            continue
        l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den
        l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den
        trong = (l1 >= -0.02) & (l2 >= -0.02) & (1 - l1 - l2 >= -0.02)
        img[ys[trong], xs[trong]] = 255
    return img[::-1]  # ảnh PNG: hàng 0 ở trên, UV v=0 ở dưới


def ty_le_phu(o, ds, xa):
    """Tỉ lệ đỉnh vùng có vải phủ: bắn tia từ da ra ngoài theo pháp tuyến, trúng lưới món trong `xa` mét là có vải.
    Không dựa vào nhóm Delete — món cộng đồng có món không khai (áo thun che ngực mà nhóm Delete rỗng)."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    oe = o.evaluated_get(dg)
    m = oe.to_mesh()
    cay = BVHTree.FromPolygons([o.matrix_world @ v.co for v in m.vertices], [p.vertices[:] for p in m.polygons])
    oe.to_mesh_clear()
    trung = 0
    for j in ds:
        v = body.data.vertices[int(j)]
        p, n = body.matrix_world @ v.co, (body.matrix_world.to_3x3() @ v.normal).normalized()
        # bắt đầu lùi vào trong da 6 mm: đồ ôm sát (quần lót, short) nằm dính hoặc lún vào da. Thêm: điểm vải gần nhất
        # cách da < GAN — đỉnh có pháp tuyến chĩa lệch (rãnh giữa hai chân) thì tia không trúng dù vải ôm ngay đó.
        if cay.ray_cast(p - n * 0.006, n, xa + 0.006)[0] is not None or cay.find_nearest(p, GAN)[0] is not None:
            trung += 1
    return trung / max(len(ds), 1)


# m: vải cách da xa hơn là không coi như phủ. Vùng kín rộng hơn: đáy quần vắt ngang rãnh giữa hai chân, cách da tới
# vài cm — mà váy, đầm vẫn trượt vì hở đáy (tia chĩa xuống không trúng gì): đúng thực tế, nhảy là lộ dưới váy.
TIA_XA = {"nguc": 0.04, "hang": 0.08}
GAN = 0.03          # m: vải ôm trong tầm này quanh da là phủ (váy là ống hở bọc ngoài hông — xa hơn)
NGUONG_PHU = 0.85   # ≥ 85 % đỉnh vùng có vải phủ mới tính là che
O_CHE_DUOC = ("ao", "duoi", "lien", "lot")

LOI_VUNG = VN["trong"](VN["X"], -0.01)   # lõi vùng (thu vào 1 cm, như rig_base): mép vùng lấn mặt trong đùi, tia không ra vải

thong_tin = {}
for f, o in mon:
    nhom = "delete." + o.name.split(".", 1)[1].lower()
    an = np.zeros(len(body.data.vertices), bool)
    for v in body.data.vertices:
        if any(ten_nhom[g.group] == nhom and g.weight > 0.5 for g in v.groups):
            an[v.index] = True
    che = []
    for k in ("nguc", "hang"):
        ds = np.asarray(VN[k])
        # Tóc, giày, phụ kiện không bao giờ tính là che: tóc dài xoã ngực là sợi alpha, nhìn xuyên — tính che thì sân
        # khấu bỏ áo lót, da ngực đã ẩn mà chỉ còn tóc lưa thưa.
        tl = ty_le_phu(o, np.nonzero(LOI_VUNG[k])[0], TIA_XA[k]) if O in O_CHE_DUOC else 0.0
        print("PHU", o.name, k, f"{tl:.0%}", "nhóm Delete chạm" if an[ds].any() else "")
        if tl >= NGUONG_PHU:
            an[ds] = True          # che là ẩn HẲN cả vùng (như rig_base): nhảy mạnh da sát vải không lòi ra
            che.append(k)
        else:
            an[ds] = False         # không che vùng: đừng ẩn da ở đó (ẩn mà không che là thủng một lỗ)
    thong_tin[o.name] = (an, che)
    print("CHE", o.name, che, int(an.sum()), "đỉnh")

# ---------- chữ T như X Bot (cùng rest pose với model-1.glb) ----------
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=os.path.join(src_dir, "X Bot.fbx"))
ref_objs = [o for o in bpy.data.objects if o not in before]
ref = next(o for o in ref_objs if o.type == "ARMATURE")
rigged = [o for o in bpy.data.objects if o.type == "MESH" and any(m.type == "ARMATURE" and m.object == rig for m in o.modifiers)]
retarget.tpose_like(rig, ref, rigged)
for o in ref_objs:
    bpy.data.objects.remove(o, do_unlink=True)

# vật liệu đồ: alpha cắt (glTF MASK) như rig_base
for _, o in mon:
    for m in o.data.materials:
        b = m.node_tree.nodes.get("Principled BSDF") if m and m.node_tree else None
        if b and b.inputs["Alpha"].links:
            src = b.inputs["Alpha"].links[0].from_socket
            gt = m.node_tree.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.3
            m.node_tree.links.new(src, gt.inputs[0]); m.node_tree.links.new(gt.outputs[0], b.inputs["Alpha"])

# ---------- ảnh nhỏ: thân + món, nghiêng 20° ----------
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = 480, 720
sc.render.film_transparent = True
sc.render.image_settings.file_format = "WEBP"
sc.render.image_settings.color_mode = "RGBA"
sc.render.image_settings.quality = 82
sc.view_settings.view_transform = "Standard"
sc.view_settings.exposure = 0.35
# ảnh nhỏ phải sáng, dễ nhìn trên bảng: nền trời xám sáng làm ánh sáng toả đều (nền ảnh vẫn trong suốt), đèn mạnh hơn
_w = sc.world or bpy.data.worlds.new("_w"); sc.world = _w; _w.use_nodes = True
_bg = _w.node_tree.nodes.get("Background")
if _bg:
    _bg.inputs[0].default_value = (0.75, 0.75, 0.78, 1); _bg.inputs[1].default_value = 1.0
cam = bpy.data.objects.new("_cam", bpy.data.cameras.new("_cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 85; cam.data.sensor_fit = "VERTICAL"
for nm, en, rot in (("_key", 4.5, (0.95, 0.0, 0.5)), ("_fill", 2.5, (1.2, 0.0, -1.4)), ("_rim", 2.0, (1.9, 0.0, 3.0))):
    L = bpy.data.objects.new(nm, bpy.data.lights.new(nm, "SUN")); sc.collection.objects.link(L)
    L.data.energy = en; L.rotation_euler = rot
# MPFB gắn vào thân một bộ ẩn (MASK) cho mỗi món đã mặc → gỡ hết, ảnh từng món tự ẩn da bằng nhóm "_an" bên dưới
for md in [md for md in body.modifiers if md.type == "MASK"]:
    body.modifiers.remove(md)
# Hoa văn da/tóc của base có thể trỏ về ổ máy khác (hpc không có) → thiếu ảnh thì tô màu phẳng cho ảnh nhỏ khỏi hồng.
thieu = any(i.source == "FILE" and not os.path.exists(bpy.path.abspath(i.filepath)) for i in bpy.data.images)
if thieu:
    def _mau(ten, rgb):
        m = bpy.data.materials.new(ten); m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1)
        return m
    DA, TOC = _mau("_da", (0.8, 0.6, 0.5)), _mau("_toc", (0.12, 0.08, 0.06))
    for o in [body] + [o for o in bpy.data.objects if o.type == "MESH" and o.name in ("Hair", "HairCards")]:
        o.data.materials.clear(); o.data.materials.append(TOC if o is not body else DA)
bpy.context.view_layer.update()
X = [body.matrix_world @ v.co for v in body.data.vertices]
zmin, zmax = min(p.z for p in X), max(p.z for p in X)
c = Vector((0, 0, (zmin + zmax) / 2))
d = (zmax - zmin) * 1.08 / 2 / math.tan(cam.data.angle_y / 2)
r = math.radians(20)
cam.location = c + Vector((math.sin(r) * d, -math.cos(r) * d, 0.0))
cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_ca_nguoi = (cam.location.copy(), cam.rotation_euler.copy())
cam.data.clip_start = 0.01

O_ANH_RIENG = ("toc", "mu", "kinh", "gang-tay", "giay", "lot", "phu-kien")   # ảnh chỉ có món, không thân, khung sát món


def khung(o):
    """Đặt camera (cùng góc nghiêng) ôm sát lưới món. Găng: một bên tay — hai tay dang chữ T thì món bé tí."""
    dg = bpy.context.evaluated_depsgraph_get()
    oe = o.evaluated_get(dg)
    m = oe.to_mesh()
    P = [o.matrix_world @ v.co for v in m.vertices]
    oe.to_mesh_clear()
    if O == "gang-tay":
        P = [p for p in P if p.x > 0] or P
    lo = Vector([min(p[i] for p in P) for i in range(3)])
    hi = Vector([max(p[i] for p in P) for i in range(3)])
    tam = (lo + hi) / 2
    huong = Vector((math.sin(r), -math.cos(r), 0.0))
    phai, len_ = Vector((math.cos(r), math.sin(r), 0.0)), Vector((0.0, 0.0, 1.0))
    nua_ngang = max(abs((p - tam).dot(phai)) for p in P)
    nua_doc = max(abs((p - tam).dot(len_)) for p in P)
    sau = max((p - tam).dot(huong) for p in P)
    ay = cam.data.angle_y
    ax = 2 * math.atan(math.tan(ay / 2) * sc.render.resolution_x / sc.render.resolution_y)
    d = max(nua_doc / math.tan(ay / 2), nua_ngang / math.tan(ax / 2)) * 1.2 + sau
    cam.location = tam + huong * d
    cam.rotation_euler = (tam - cam.location).to_track_quat("-Z", "Y").to_euler()


mask_mod = body.modifiers.new("_an", "MASK")
mask_mod.invert_vertex_group = True
# lưới phụ của thân (helper: váy/quần tất ẩn, joint) — rig_base xoá trước khi xuất; ảnh nhỏ cũng phải ẩn
phu = np.zeros(len(body.data.vertices), bool)
_nhom_phu = {vg.index for vg in body.vertex_groups if vg.name.lower().startswith(("helper", "joint"))}
for v in body.data.vertices:
    if any(g.group in _nhom_phu and g.weight > 0 for g in v.groups):
        phu[v.index] = True

for f, o in mon:
    id_ = id_cua(f)
    ra = os.path.join(KHO, THAN, NGUON, O, id_)
    os.makedirs(ra, exist_ok=True)
    an, che = thong_tin[o.name]
    # mặt nạ PNG
    img = mat_na(an)
    im = bpy.data.images.new("_mn", MASK, MASK, alpha=False)
    px = np.zeros((MASK, MASK, 4), np.float32)
    px[..., :3] = (img[::-1, :, None] / 255.0)   # Blender: hàng 0 ở dưới
    px[..., 3] = 1
    im.pixels.foreach_set(px.ravel())
    im.filepath_raw = os.path.join(ra, "mat-na.png"); im.file_format = "PNG"; im.save()
    bpy.data.images.remove(im)
    # ảnh nhỏ: chỉ thân + món này, ẩn da dưới món
    vg = body.vertex_groups.get("_an") or body.vertex_groups.new(name="_an")
    vg.remove(list(range(len(body.data.vertices))))
    vg.add([int(i) for i in np.nonzero(an | phu)[0]], 1.0, "REPLACE")
    mask_mod.vertex_group = "_an"
    for _, x in mon:
        x.hide_render = x is not o
    # món nhỏ (kính, giày…) chụp cả người thì không nhìn ra món: chụp riêng món
    rieng = O in O_ANH_RIENG
    an_them = [x for x in bpy.data.objects if x.type == "MESH" and x is not o and not x.hide_render] if rieng else []
    for x in an_them:
        x.hide_render = True
    khung(o)   # mọi món: khung sát món (đồ mặc vẫn có thân, món nhỏ thì chỉ có món)
    sc.render.filepath = os.path.join(ra, "anh.webp")
    bpy.ops.render.render(write_still=True)
    for x in an_them:
        x.hide_render = False
    cam.location, cam.rotation_euler = cam_ca_nguoi
    # GLB: lưới món + xương, không điệu
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True); rig.select_set(True)
    # hoa văn ≤ ANH_TOI_DA px, WebP: đồ cộng đồng hay kèm ảnh 4K (một đầm 40 MB) — sân khấu tải từng món qua mạng
    for m in o.data.materials:
        for n in (m.node_tree.nodes if m and m.node_tree else ()):
            im = getattr(n, "image", None)
            if im is not None and im.has_data and max(im.size) > ANH_TOI_DA:
                k = ANH_TOI_DA / max(im.size)
                im.scale(max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k)))
    bpy.ops.export_scene.gltf(filepath=os.path.join(ra, "mon.glb"), export_format="GLB", use_selection=True,
                              export_animations=False, export_skins=True, export_morph=False, export_yup=True,
                              export_image_format="WEBP", export_image_quality=85)
    dau = dau_mhclo(f)
    tt = {
        "id": id_, "ten": TEN.get(os.path.basename(f)) or dau.get("name") or id_, "o": O, "nguon": NGUON,
        "than": THAN, "gioi": GIOI, "tuoi": TUOI,
        "giayPhep": GIAY_PHEP_NGUON.get(NGUON) or dau.get("license", "?"), "tacGia": dau.get("author", "?"), "che": che,
        "tamGiac": len(o.data.polygons), "mhclo": os.path.basename(f),
    }
    json.dump(tt, open(os.path.join(ra, "mon.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("XUAT", ra, che, os.path.getsize(os.path.join(ra, "mon.glb")) // 1024, "KB", flush=True)
