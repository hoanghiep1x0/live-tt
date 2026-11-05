"""Gắn xương Mixamo + điệu nhảy cho nhân vật lưới gốc (sau makeup.py), xuất GLB cho three.js.

blender -b <base_mk.blend> --python scripts/phong/san-bar/nhan-vat/rig_base.py -- <thư mục FBX điệu nhảy> <ra.glb> [điệu ...] \
    [--render <tiền tố ảnh>]

- Xương: rig "mixamo" có sẵn của MPFB, dựng theo các đỉnh khớp (joint-*) — đã dời theo đầu bọc → xương khớp đầu mới.
- Mắt, mi (thẻ MPFB): gắn vào xương bằng chính hàm của MPFB (nội suy trọng số từ thân) → chớp, quay đầu đi theo.
- Bỏ lưới phụ (helper) trước khi xuất; điệu nhảy chuyển bằng retarget.py (chữ T như X Bot rồi theo góc thế giới), mỗi điệu
  một dải NLA.
- Tóc ("Hair", hair_fit.py): chuỗi xương tóc + mô phỏng lò xo nướng vào từng điệu (hair_dyn.py); --no-hair-dyn để bỏ.
- --render: chụp thử 3 khung của điệu đầu tiên (kiểm tra mắt, mi bám theo đầu).
- --outfits <json> (vd D:/Assets/parts/trang-phuc/model-1.json): một GLB nhiều bộ đồ, chọn bộ lúc chạy. Thân giữ nguyên
  (không xoá da dưới đồ); thuộc tính đỉnh `_COVER` (bit i = bộ đồ thứ i che đỉnh này, lấy từ nhóm "Delete.<món>" của MPFB)
  để three.js ẩn da dưới bộ đang mặc. Mỗi món ghi `extras.outfits` (các id bộ có món đó), xương `Dancer` ghi
  `extras.outfits` (danh sách bộ, JSON). Thiếu --outfits: như cũ, xoá hẳn da dưới mọi đồ đang mặc.
- Đồ dựng từ lưới thân (`tu_da`, vd bikini.py): chép trọng số xương từ thân, không qua .mhclo.
- --outfits có **kiểm che bắt buộc**: mỗi bộ phải che vùng ngực + vùng kín (`vung_nhay_cam.py`) và ẩn hẳn da ở đó; bộ nào
  hở thì dừng, không xuất GLB.
"""
import json
import math
import os
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
import hair_dyn  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
RENDER = args[args.index("--render") + 1] if "--render" in args else None
if RENDER:
    args = [a for a in args if a not in ("--render", RENDER)]
OUTFITS = None
if "--outfits" in args:
    _p = args[args.index("--outfits") + 1]
    with open(_p, encoding="utf-8") as f:
        OUTFITS = json.load(f)["outfits"]
    args = [a for a in args if a not in ("--outfits", _p)]
src_dir, out_path, picks = args[0], args[1], [p for p in args[2:] if not p.startswith("--")]
ASSETS = bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data")

body = bpy.data.objects["Body"]
for o in list(bpy.data.objects):
    if o.name == "HunyuanAligned":
        bpy.data.objects.remove(o, do_unlink=True)

# ---------- xương ----------
HumanService.add_builtin_rig(body, "mixamo", import_weights=True)
rig = body.parent
rig.name = "Dancer"
def chep_trong_so(o, chi_giu=None):
    """Trọng số xương từ mặt thân gần nhất (nội suy trên mặt). chi_giu: chỉ giữ nhóm có tên chứa một trong các chuỗi."""
    bones = {b.name for b in rig.data.bones if b.use_deform}
    for vg in body.vertex_groups:
        if vg.name in bones and vg.name not in o.vertex_groups:
            o.vertex_groups.new(name=vg.name)
    dt = o.modifiers.new("dt", "DATA_TRANSFER"); dt.object = body; dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=dt.name)
    for vg in [vg for vg in o.vertex_groups if vg.name not in bones or (chi_giu and not any(k in vg.name for k in chi_giu))]:
        o.vertex_groups.remove(vg)


def chep_dung_dinh(o):
    """Đồ dựng từ thân: trọng số xương chép NGUYÊN từ đỉnh thân gốc (thuộc tính `goc` do bikini.py ghi) — co giãn y hệt da.
    Không nội suy theo mặt gần nhất: mặt gần nhất có khi là lưới phụ váy / quần tất ẩn của MPFB (trọng số sai)."""
    at = o.data.attributes.get("goc")
    if at is None:
        raise SystemExit(f"{o.name}: thiếu thuộc tính 'goc' — dựng lại bằng bikini.py mới")
    src = [0] * len(o.data.vertices); at.data.foreach_get("value", src)
    bones = {b.name for b in rig.data.bones if b.use_deform}
    ten = {vg.index: vg.name for vg in body.vertex_groups if vg.name in bones}
    dich = {}
    for v in o.data.vertices:
        for g in body.data.vertices[src[v.index]].groups:
            if g.group in ten and g.weight > 0:
                n_ = ten[g.group]
                if n_ not in dich:
                    dich[n_] = o.vertex_groups.get(n_) or o.vertex_groups.new(name=n_)
                dich[n_].add([v.index], g.weight, "REPLACE")
    for vg in [vg for vg in o.vertex_groups if vg.name not in bones]:
        o.vertex_groups.remove(vg)
    o.data.attributes.remove(o.data.attributes["goc"])


for o in [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Body.")]:
    n = o.name.split(".", 1)[1]
    if o.get("tu_da"):                                                       # đồ dựng từ lưới thân (bikini.py)
        chep_dung_dinh(o)
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.vertex_group_normalize_all(lock_active=False)
        o.parent = rig
        am = o.modifiers.new("Armature", "ARMATURE"); am.object = rig
        print("RIGGED", o.name, "(từ thân)")
        continue
    kind = "eyelashes" if n.startswith("eyelashes") else "eyebrows" if n.startswith("eyebrow") else "eyes"
    path = os.path.join(ASSETS, kind, n, n + ".mhclo")
    if not os.path.exists(path) and os.path.exists(os.path.join(ASSETS, "clothes", n, n + ".mhclo")):
        path = os.path.join(ASSETS, "clothes", n, n + ".mhclo")                 # quần áo MPFB (hồ sơ nhân vật)
    if not os.path.exists(path):
        print("NO MHCLO", o.name); continue
    mh = Mhclo(); mh.load(path)
    ClothesService.set_up_rigging(body, o, rig, mh)
    print("RIGGED", o.name)

# tóc (hair_fit.py, không có .mhclo): chép trọng số xương từ mặt thân gần nhất (nội suy trên mặt) — sát đầu theo đầu, đuôi tóc
# sau lưng / trước vai theo lưng, vai
for hair in [o for o in (bpy.data.objects.get("Hair"), bpy.data.objects.get("HairCards")) if o]:
    # chỉ giữ xương đầu, cổ, cột sống: lấy cả vai/tay thì lọn tóc trước vai bị kéo giãn khi giơ tay (model-1)
    chep_trong_so(hair, chi_giu=("Head", "Neck", "Spine"))
    for vg in [vg for vg in hair.vertex_groups if "End" in vg.name]:
        hair.vertex_groups.remove(vg)
    keep_b = list(hair.vertex_groups)
    spine = max(keep_b, key=lambda g: ("Spine2" in g.name, "Spine1" in g.name)) if keep_b else None
    for v in hair.data.vertices:
        tot = sum(g.weight for g in v.groups)
        if tot < 1e-4 and spine is not None:
            spine.add([v.index], 1.0, "REPLACE")
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    print("HAIR bones", [vg.name for vg in hair.vertex_groups])
    hair.parent = rig
    am = hair.modifiers.new("Armature", "ARMATURE"); am.object = rig
    print("RIGGED", hair.name, len(hair.vertex_groups), "nhóm")

# ---------- bỏ lưới phụ (helper, joint) ----------
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
# + phần thân dưới quần áo (nhóm "Delete.<bộ đồ>" của MPFB): glTF không áp bộ ẩn → để lại thì da lòi qua áo
if OUTFITS:
    # nhiều bộ: giữ da, ghi bit che theo từng bộ (three.js ẩn da dưới bộ đang mặc); mỗi món ghi các bộ có nó
    ten_nhom = {vg.index: vg.name.lower() for vg in body.vertex_groups}
    che = [0.0] * len(body.data.vertices)
    for i, of in enumerate(OUTFITS):
        mon = {"delete." + it.lower() for it in of["items"]}
        for v in body.data.vertices:
            if any(ten_nhom[g.group] in mon and g.weight > 0.5 for g in v.groups):
                che[v.index] += 2 ** i
    # KIỂM CHE (bắt buộc, chính sách TikTok): bộ nào cũng phải che hai vùng nhạy cảm (vung_nhay_cam.py) và ẩn HẲN da ở đó.
    # - đồ MPFB: nhóm Delete của bộ chạm vào vùng → ẩn cả vùng (áo croptop thể thao chỉ ẩn 60/96 đỉnh ngực — model-1:
    #   phần còn lại nằm sát vải, nhảy là lòi ra);
    # - đồ dựng từ thân (`che` do bikini.py ghi sau khi tự kiểm): ẩn lõi vùng (thu vào 1 cm, nằm dưới vải ≥ 1,2 cm);
    # - không món nào che vùng → DỪNG, không xuất GLB.
    VN = vnc.do(body)
    loi = VN["trong"](VN["X"], -0.01)
    for i, of in enumerate(OUTFITS):
        tu_da = set()
        for it in of["items"]:
            o = bpy.data.objects.get("Body." + it)
            if o is not None and o.get("che"):
                tu_da |= set(str(o["che"]).split(","))
        for k in ("nguc", "hang"):
            ds = VN[k]
            da = sum(1 for j in ds if int(che[j]) >> i & 1)
            if da == 0 and k not in tu_da:
                raise SystemExit(f"Bộ {of['id']} HỞ vùng {k}: không món nào che — thêm đồ hoặc bỏ bộ này khỏi --outfits")
            an = np.nonzero(loi[k])[0] if (da == 0 and k in tu_da) else ds
            for j in an:
                if not int(che[j]) >> i & 1:
                    che[j] += 2 ** i
            print("KIEM CHE", of["id"], k, f"đồ MPFB ẩn {da}/{len(ds)} đỉnh", "+ đồ từ thân" if k in tu_da else "",
                  f"→ ẩn hẳn {len(an)} đỉnh")
    at = body.data.attributes.new("_COVER", "FLOAT", "POINT"); at.data.foreach_set("value", che)
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Body.")]:
        ids = [of["id"] for of in OUTFITS if o.name.split(".", 1)[1] in of["items"]]
        if ids:
            o["outfits"] = ",".join(ids)
        elif not o.name.startswith(("Body.high-poly", "Body.eyelash", "Body.eyebrow")):
            print("KHONG THUOC BO NAO", o.name, "→ bỏ"); bpy.data.objects.remove(o, do_unlink=True)
    rig["outfits"] = json.dumps([{"id": of["id"], "name": of["name"]} for of in OUTFITS], ensure_ascii=False)
    print("OUTFITS", [(of["id"], sum(1 for c in che if int(c) >> i & 1)) for i, of in enumerate(OUTFITS)])
helpers = [vg for vg in body.vertex_groups
           if vg.name.lower().startswith(("helper", "joint") if OUTFITS else ("helper", "joint", "delete."))]
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT")
for vg in helpers:
    body.vertex_groups.active_index = vg.index
    bpy.ops.object.vertex_group_select()
bpy.ops.mesh.delete(type="VERT")
bpy.ops.object.mode_set(mode="OBJECT")
for md in [md for md in body.modifiers if md.type == "MASK"]:
    body.modifiers.remove(md)

# da: nhám vừa, bỏ ảnh độ nhám/bóng loang của da gốc
for m in body.data.materials:
    b = m.node_tree.nodes.get("Principled BSDF") if m and m.node_tree else None
    if b:
        b.inputs["Roughness"].default_value = 0.55
        for n_ in m.node_tree.nodes:
            if n_.type == "TEX_IMAGE" and any(l.to_socket.name in ("Roughness", "Specular IOR Level", "Metallic") for l in n_.outputs[0].links):
                for l in list(n_.outputs[0].links):
                    m.node_tree.links.remove(l)
        # da đặc: vật liệu MPFB để alpha → glTF xuất BLEND → three.js vẽ da trong suốt, loang từng mảng, sai thứ tự (model-1)
        for l in list(b.inputs["Alpha"].links):
            m.node_tree.links.remove(l)
        b.inputs["Alpha"].default_value = 1.0
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "DITHERED"
# mi, quần áo MPFB: alpha cắt (Math > 0,3 → glTF MASK) thay vì BLEND (BLEND: vân lổn nhổn, sai thứ tự vẽ)
for o in [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Body.") and not o.name.startswith("Body.high-poly")]:   # mi + quần áo
    for m in o.data.materials:
        b = m.node_tree.nodes.get("Principled BSDF") if m and m.node_tree else None
        if b and b.inputs["Alpha"].links:
            src = b.inputs["Alpha"].links[0].from_socket
            gt = m.node_tree.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.3
            m.node_tree.links.new(src, gt.inputs[0]); m.node_tree.links.new(gt.outputs[0], b.inputs["Alpha"])

# ---------- điệu nhảy ----------
if not picks:
    picks = sorted(f[:-4] for f in os.listdir(src_dir) if f.lower().endswith(".fbx") and f != "X Bot.fbx" and "Pose" not in f)


def import_src(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return next(o for o in new if o.type == "ARMATURE"), new


ref, ref_objs = import_src(os.path.join(src_dir, "X Bot.fbx"))
rigged = [o for o in bpy.data.objects if o.type == "MESH" and any(m.type == "ARMATURE" and m.object == rig for m in o.modifiers)]
print("RIGGED MESHES", [o.name for o in rigged])
retarget.tpose_like(rig, ref, rigged)
for o in ref_objs:
    bpy.data.objects.remove(o, do_unlink=True)
# tóc bay: chuỗi xương tóc dựng trên tư thế gốc mới (chữ T), trọng số tóc chuyển sang đầu + chuỗi
chains = hair_dyn.build(rig, bpy.data.objects["Hair"]) if "Hair" in bpy.data.objects and "--no-hair-dyn" not in args else []

rig.animation_data_create()
first = None
for name in picks:
    path = os.path.join(src_dir, name + ".fbx")
    if not os.path.exists(path):
        print("MISSING", name); continue
    arm, objs = import_src(path)
    act, nfr = retarget.bake(rig, arm, name)
    hair_dyn.simulate(rig, act, nfr, chains)
    track = rig.animation_data.nla_tracks.new(); track.name = name
    st = track.strips.new(name, 0, act)
    if act.slots:
        st.action_slot = act.slots[0]
    track.mute = True
    first = first or (track, nfr)
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    print("ADD", name, nfr)

if RENDER and first:
    track, nfr = first
    track.mute = False
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"; scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 600, 800
    w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.29, 0.31, 1)
    c = Vector((0, 0, 0.9))
    for loc, e in (((1.2, -2.4, 1.2), 60), ((-2.0, -1.6, 0.6), 25), ((0, 2.0, 1.4), 35)):
        L = bpy.data.lights.new("l", "AREA"); L.energy = e; L.size = 2.0
        lo = bpy.data.objects.new("l", L); scene.collection.objects.link(lo)
        lo.location = c + Vector(loc); lo.rotation_euler = (c - lo.location).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
    cam.data.lens = 50; scene.camera = cam
    for i, f in enumerate((1, nfr // 3, 2 * nfr // 3)):
        scene.frame_set(max(1, f))
        a = math.radians(20 * i)
        cam.location = c + Vector((math.sin(a) * 4.2, -math.cos(a) * 4.2, 0.1))
        cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{RENDER}_{i}.png"
        bpy.ops.render.render(write_still=True)
    track.mute = True
    print("RENDERED", RENDER)

bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS",
                          export_skins=True, export_morph=False, export_yup=True,
                          export_extras=bool(OUTFITS), export_attributes=bool(OUTFITS))
print("DONE", out_path, os.path.getsize(out_path))
