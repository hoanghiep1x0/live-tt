"""Dựng nhân vật nữ phong cách donghua bằng MPFB (MakeHuman cho Blender) + xương Mixamo,
gộp các điệu nhảy Mixamo rồi xuất GLB cho three.js.

blender -b --factory-startup --addons bl_ext.user_default.mpfb --python scripts/phong/san-bar/nhan-vat/build_character.py -- \
    <thư mục FBX điệu nhảy> <file .glb> [tên điệu ...]
"""
import os
import sys

import bpy

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

args = sys.argv[sys.argv.index("--") + 1 :]
src_dir, out_path, picks = args[0], args[1], args[2:]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")

# ---------- thân người: nữ trẻ, thon, chân dài, gương mặt Á ----------
macro = TargetService.get_default_macro_info_dict()
macro.update({
    "gender": 0.0, "age": 0.42, "muscle": 0.45, "weight": 0.38,
    "proportions": 0.95, "height": 0.62, "cupsize": 0.62, "firmness": 0.7,
    "race": {"asian": 0.8, "caucasian": 0.2, "african": 0.0},
})
body = HumanService.create_human(macro_detail_dict=macro, feet_on_ground=True, scale=0.1)
body.name = "Body"

# ---------- khuôn mặt kiểu donghua: mặt thon, cằm nhọn, mắt phượng dài, mũi thanh, môi nhỏ ----------
def both(name, w):  # target có bản trái/phải
    d, n = name.split("/")
    return {f"{d}/l-{n}": w, f"{d}/r-{n}": w}

FACE = {
    # theo ảnh tham chiếu D:\Assets\model-1 (chính diện, 3/4, hai góc nghiêng)
    # mặt trái xoan thon, cằm nhỏ nhọn mềm, hơi lùi khi nhìn nghiêng; gò má nhẹ
    "head/head-oval": 0.8, "head/head-fat-decr": 0.5, "head/head-scale-horiz-decr": 0.15,
    "chin/chin-width-decr": 0.7, "chin/chin-bones-decr": 0.25, "chin/chin-triangle": 0.25,
    "chin/chin-height-incr": 0.2, "chin/chin-prominent-incr": 0.1,
    **both("cheek/cheek-bones-incr", 0.15), **both("cheek/cheek-volume-decr", 0.4), **both("cheek/cheek-inner-decr", 0.45),
    # mắt hạnh nhân, đuôi xếch, mí đôi (target mắt rất nhẹ nên cho vượt 1.0)
    # corner1 = đuôi mắt (phía ngoài), corner2 = khoé trong
    **both("eyes/eye-scale-incr", 0.4), **both("eyes/eye-corner1-up", 1.8), **both("eyes/eye-corner2-down", 0.7),
    **both("eyes/eye-height2-decr", 0.35), **both("eyes/eye-height1-incr", 0.1),
    **both("eyes/eye-epicanthus-in", 0.8), **both("eyes/eye-eyefold-up", 0.8), **both("eyes/eye-trans-out", 0.2),
    **both("eyes/eye-push2-in", 0.4),
    # mũi thẳng nhỏ, sống thanh, đầu hơi hếch
    "nose/nose-scale-horiz-decr": 0.55, "nose/nose-width1-decr": 0.5, "nose/nose-width2-decr": 0.45,
    "nose/nose-width3-decr": 0.45, "nose/nose-volume-decr": 0.45, "nose/nose-hump-decr": 0.8,
    "nose/nose-point-up": 0.45, "nose/nose-nostrils-width-decr": 0.5, "nose/nose-scale-vert-decr": 0.12,
    # môi nhỏ, viền rõ (cung cupid), khoé cười nhẹ
    "mouth/mouth-scale-horiz-decr": 0.35, "mouth/mouth-upperlip-volume-incr": 0.05,
    "mouth/mouth-lowerlip-volume-incr": 0.1, "mouth/mouth-cupidsbow-incr": 0.4, "mouth/mouth-angles-up": 0.7,
    "forehead/forehead-scale-vert-decr": 0.1, "eyebrows/eyebrows-angle-down": 0.2,
    # cổ thon dài
    "neck/neck-scale-horiz-decr": 0.45, "neck/measure-neck-height-incr": 0.4,
    "torso/torso-scale-horiz-decr": 0.15,
    "hip/hip-scale-horiz-incr": 0.15,
    "stomach/stomach-pregnant-decr": 0.6,
}
tdir = os.path.join(os.path.dirname(sys.modules[HumanService.__module__].__file__), "..", "data", "targets")
loaded = 0
for name, w in FACE.items():
    path = os.path.normpath(os.path.join(tdir, name + ".target.gz"))
    if os.path.exists(path):
        sk = TargetService.load_target(body, path, weight=min(w, 1.0), name=os.path.basename(name))
        sk.slider_max = max(1.0, w); sk.value = w  # shape key mặc định chặn ở 1.0
        loaded += 1
    else:
        print("NO TARGET", name)
print("FACE TARGETS", loaded, "/", len(FACE))


def target_weights(*rels):
    """Trọng số 0..1 cho từng đỉnh lưới gốc theo mức một (vài) target làm dịch chuyển.
    File .target.gz: mỗi dòng 'chỉ_số dx dy dz'. Dùng để tìm vùng môi, lông mày… mà không cần vẽ tay."""
    import gzip
    w = {}
    for rel in rels:
        d = {}
        with gzip.open(os.path.normpath(os.path.join(tdir, rel + ".target.gz")), "rt") as f:
            for line in f:
                p = line.split()
                if len(p) == 4 and not line.startswith("#"):
                    d[int(p[0])] = sum(float(v) ** 2 for v in p[1:]) ** 0.5
        top = max(d.values())
        for i, m in d.items():
            w[i] = max(w.get(i, 0.0), m / top)
    return w


# "trang điểm" bằng màu đỉnh: son môi, lông mày đậm (nhân với ảnh da khi hiển thị)
MAKEUP = [
    (target_weights("mouth/mouth-upperlip-volume-incr", "mouth/mouth-lowerlip-volume-incr"), (0.62, 0.06, 0.09), 0.25, 0.75),
]


def near_weights(mesh, other, radius):
    """Trọng số theo khoảng cách từ đỉnh của mesh tới lưới other (gần = 1, xa hơn radius = 0)."""
    from mathutils.kdtree import KDTree
    dg = bpy.context.evaluated_depsgraph_get()
    ev = other.evaluated_get(dg)  # vị trí sau khi MPFB khớp lưới phụ vào mặt (shape key, modifier)
    pts = [ev.matrix_world @ v.co for v in ev.to_mesh().vertices]
    ev.to_mesh_clear()
    kd = KDTree(len(pts))
    for i, p in enumerate(pts):
        kd.insert(p, i)
    kd.balance()
    w = {}
    em = mesh.evaluated_get(dg).to_mesh()
    for v in em.vertices:
        _, _, d = kd.find(mesh.matrix_world @ v.co)
        if d < radius:
            w[v.index] = 1.0 - d / radius
    mesh.evaluated_get(dg).to_mesh_clear()
    print("NEAR", other.name, len(w))
    return w


SKIN_TINT = (1.0, 0.9, 0.86)


def paint_makeup(mesh):
    from mathutils import Color
    attr = mesh.data.color_attributes.new("Makeup", "BYTE_COLOR", "POINT")
    cols = [SKIN_TINT] * len(mesh.data.vertices)  # tông da trắng hồng ấm phủ toàn thân
    for weights, rgb, lo, hi in MAKEUP:
        for i, w in weights.items():
            k = min(1.0, max(0.0, (w - lo) / (hi - lo)))   # mềm dần từ viền vào giữa
            k = k * k * (3 - 2 * k)
            c = cols[i]
            cols[i] = tuple(c[j] * (1 - k) + rgb[j] * k for j in range(3))
    for i, c in enumerate(cols):
        attr.data[i].color = (*c, 1.0)
    mesh.data.color_attributes.active_color = attr
    # nhân ảnh da với màu đỉnh trong vật liệu (Blender xem trước + glTF xuất COLOR_0)
    for m in mesh.data.materials:
        if not (m and m.use_nodes):
            continue
        nt = m.node_tree
        b = nt.nodes.get("Principled BSDF")
        tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None)
        if b and tex:
            vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Makeup"
            mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            nt.links.new(tex.outputs["Color"], mix.inputs[6]); nt.links.new(vc.outputs["Color"], mix.inputs[7])
            nt.links.new(mix.outputs[2], b.inputs["Base Color"])

# ---------- xương Mixamo (tên xương trùng với file điệu nhảy) ----------
HumanService.add_builtin_rig(body, "mixamo", import_weights=True)
rig = body.parent
rig.name = "Dancer"
print("RIG", rig.name, len(rig.data.bones), [b.name for b in rig.data.bones][:5])

# ---------- da, mắt, mày, mi, tóc (gói CC0 của MakeHuman, đã giải nén vào thư mục dữ liệu MPFB) ----------
ASSETS = os.path.join(os.environ["APPDATA"], "Blender Foundation", "Blender", "5.2",
                      "extensions", ".user", "user_default", "mpfb", "data")
HumanService.set_character_skin(os.path.join(ASSETS, "skins", "young_asian_female", "young_asian_female.mhmat"),
                                body, skin_type="GAMEENGINE")
PARTS = [
    ("Eyes", "eyes/high-poly/high-poly.mhclo"),
    ("Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
    ("Eyelashes", "eyelashes/eyelashes02/eyelashes02.mhclo"),
    ("Hair", "hair/long01/long01.mhclo"),
]

for kind, rel in PARTS:
    path = os.path.join(ASSETS, *rel.split("/"))
    if not os.path.exists(path):
        print("NO ASSET", rel); continue
    obj = HumanService.add_mhclo_asset(path, body, asset_type=kind, subdiv_levels=0, material_type="GAMEENGINE")
    print("PART", kind, obj.name if obj else None)
    if kind == "Eyebrows" and obj:  # lông mày đậm: tô da ngay dưới lưới lông mày
        MAKEUP.append((near_weights(body, obj, 0.0035), (0.2, 0.16, 0.15), 0.15, 0.75))  # mày mảnh
    if kind == "Eyelashes" and obj:  # phấn mắt đỏ cam rộng + kẻ mắt đậm sát mi
        MAKEUP.append((near_weights(body, obj, 0.009), (0.93, 0.6, 0.55), 0.0, 0.8))
        MAKEUP.append((near_weights(body, obj, 0.0032), (0.07, 0.04, 0.04), 0.15, 0.7))  # kẻ mắt đậm
    if kind == "Eyes" and obj:  # tròng mắt nâu đen: làm tối phần tròng (giữ lòng trắng)
        import numpy as np
        src = bpy.data.images.load(os.path.join(ASSETS, "eyes", "materials", "brown_eye.png"))
        px = np.array(src.pixels[:], dtype=np.float32).reshape(-1, 4)
        lum = px[:, :3].mean(axis=1)
        sat = px[:, :3].max(axis=1) - px[:, :3].min(axis=1)
        iris = (sat > 0.08) & (lum < 0.7)                # tròng: có màu; lòng trắng: gần xám, sáng
        px[iris, :3] = px[iris, :3] * np.array([0.32, 0.26, 0.24]) + 0.01
        dark = bpy.data.images.new("eye_dark", src.size[0], src.size[1], alpha=True)
        dark.pixels[:] = px.ravel(); dark.pack()
        for m in obj.data.materials:
            for n in (m.node_tree.nodes if m and m.use_nodes else []):
                if n.type == "TEX_IMAGE":
                    n.image = dark
# má hồng: vùng gò má (theo target làm đầy má)
MAKEUP.insert(0, (target_weights("cheek/l-cheek-volume-incr", "cheek/r-cheek-volume-incr"), (1.0, 0.78, 0.78), 0.2, 1.0))
paint_makeup(body)  # sau set_character_skin (hàm đó thay vật liệu da)

# Áp hình dạng (shape keys) vào lưới để GLB nhẹ, không mang theo hàng trăm target.
bpy.context.view_layer.objects.active = body
if body.data.shape_keys:
    body.shape_key_add(name="__mix__", from_mix=True)
    keys = body.data.shape_keys.key_blocks
    for kb in list(keys)[:-1]:
        body.shape_key_remove(kb)
    body.shape_key_remove(body.data.shape_keys.key_blocks[0])
# bỏ nhóm đỉnh phụ (helper) của MakeHuman: xoá luôn phần lưới phụ để không lộ khi xuất
helpers = [vg for vg in body.vertex_groups if vg.name.lower().startswith(("helper", "joint"))]
if helpers:
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT")
    for vg in helpers:
        body.vertex_groups.active_index = vg.index
        bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.object.mode_set(mode="OBJECT")

# da mịn: nhám vừa, không loang bóng; làm mịn lưới (subdivision) cho viền mặt, thân, tóc tròn trịa
for m in body.data.materials:
    b = m.node_tree.nodes.get("Principled BSDF") if m and m.use_nodes else None
    if b:
        b.inputs["Roughness"].default_value = 0.55
        for n in m.node_tree.nodes:  # bỏ ảnh độ nhám/bóng loang của da gốc
            if n.type == "TEX_IMAGE" and any(l.to_socket.name in ("Roughness", "Specular IOR Level", "Metallic") for l in n.outputs[0].links):
                for l in list(n.outputs[0].links): m.node_tree.links.remove(l)


def add_smooth(o):
    if not any(md.type == "SUBSURF" for md in o.modifiers):
        s = o.modifiers.new("Smooth", "SUBSURF"); s.levels = 1; s.render_levels = 1

# ---------- chế độ xem mặt nhanh: file đích .png → chụp chân dung, không gộp điệu ----------
if out_path.lower().endswith(".png"):
    from mathutils import Vector
    for o in bpy.data.objects:
        if o.type == "MESH" and ("Body" == o.name or "long01" in o.name):
            add_smooth(o)
        if o.type == "MESH" and "long01" in o.name and os.environ.get("NO_HAIR"):
            o.hide_render = True  # so mặt với ảnh mẫu đầu trọc
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 900, 600
    world = bpy.data.worlds.new("w"); scene.world = world
    world.use_nodes = True; world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.3, 0.33, 1)
    head = rig.data.bones["mixamorig:Head"]
    hp = rig.matrix_world @ head.head_local + Vector((0, 0, 0.06))
    # tóc, mày đen (bản web tô cùng màu trong core.js)
    for o in bpy.data.objects:
        if o.type == "MESH" and any(k in o.name for k in ("long01", "eyebrow", "eyelash")):
            for m in o.data.materials:
                if m and m.use_nodes:
                    b = m.node_tree.nodes.get("Principled BSDF")
                    tex = next((n for n in m.node_tree.nodes if n.type == "TEX_IMAGE"), None)
                    if b and tex:  # nhân màu ảnh với đen nâu
                        mix = m.node_tree.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
                        mix.inputs[0].default_value = 1.0; mix.inputs[7].default_value = (0.12, 0.09, 0.08, 1)
                        m.node_tree.links.new(tex.outputs["Color"], mix.inputs[6])
                        m.node_tree.links.new(mix.outputs[2], b.inputs["Base Color"])
    for loc, energy in (((1.2, -2.0, 1.0), 300), ((-1.5, -1.0, 0.5), 120), ((0, 1.5, 1.5), 200)):
        L = bpy.data.lights.new("l", "AREA"); L.energy = energy; L.size = 1.5
        lo = bpy.data.objects.new("l", L); scene.collection.objects.link(lo)
        lo.location = hp + Vector(loc)
        lo.rotation_euler = (hp - lo.location).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
    cam.data.lens = 85; scene.camera = cam
    shots = []
    for i, (dx, dy) in enumerate(((0, -0.75), (0.5, -0.55), (0.78, -0.02))):  # chính diện, 3/4, nghiêng
        cam.location = hp + Vector((dx, dy, 0.02))
        cam.rotation_euler = (hp - cam.location).to_track_quat("-Z", "Y").to_euler()
        p = out_path[:-4] + f"_{i}.png"; scene.render.filepath = p
        bpy.ops.render.render(write_still=True); shots.append(p)
    print("RENDERED", shots)
    sys.exit(0)

# ---------- gộp điệu nhảy: chuyển (retarget) từ xương Mixamo sang xương nhân vật ----------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import retarget  # noqa: E402

if not picks:
    picks = sorted(f[:-4] for f in os.listdir(src_dir)
                   if f.lower().endswith(".fbx") and f != "X Bot.fbx" and "Pose" not in f)

def import_src(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return next(o for o in new if o.type == "ARMATURE"), new

# đưa nhân vật về tư thế chữ T giống xương Mixamo trước khi chuyển điệu
ref, ref_objs = import_src(os.path.join(src_dir, "X Bot.fbx"))
rigged = [o for o in bpy.data.objects if o.type == "MESH"
          and any(m.type == "ARMATURE" and m.object == rig for m in o.modifiers)]
print("RIGGED MESHES", [o.name for o in rigged])
retarget.tpose_like(rig, ref, rigged)
for o in ref_objs: bpy.data.objects.remove(o, do_unlink=True)

rig.animation_data_create()
for name in picks:
    path = os.path.join(src_dir, name + ".fbx")
    if not os.path.exists(path):
        print("MISSING", name); continue
    arm, objs = import_src(path)
    act, n = retarget.bake(rig, arm, name)
    track = rig.animation_data.nla_tracks.new(); track.name = name
    nla = track.strips.new(name, 0, act)
    if act.slots: nla.action_slot = act.slots[0]
    track.mute = True
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    print("ADD", name, n)

for o in bpy.data.objects:  # làm mịn sau khi chuyển điệu (modifier được áp khi xuất, xương vẫn giữ)
    if o.type == "MESH" and ("Body" == o.name or "long01" in o.name):
        add_smooth(o)
bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB", export_animations=True,
                          export_animation_mode="NLA_TRACKS", export_skins=True, export_morph=False, export_yup=True)
print("DONE", out_path, os.path.getsize(out_path))
