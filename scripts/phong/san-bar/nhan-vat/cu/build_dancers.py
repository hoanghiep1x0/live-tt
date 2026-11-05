"""Gộp các điệu nhảy Mixamo (FBX không skin) vào nhân vật X Bot rồi xuất một file GLB cho three.js.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/build_dancers.py -- <thư mục FBX> <file .glb> [tên điệu ...]

- Nhân vật: <thư mục>/X Bot.fbx (có skin, T-pose).
- Mỗi điệu thành một animation tên đúng tên file (ví dụ "Gangnam Style").
- Không truyền tên điệu thì lấy hết các FBX trong thư mục (trừ X Bot và các tư thế "Pose").
"""
import os
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1 :]
src_dir, out_path, picks = args[0], args[1], args[2:]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(src_dir, "X Bot.fbx"))
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
rig.name = "Dancer"
for a in list(bpy.data.actions):  # X Bot đi kèm một action rỗng
    bpy.data.actions.remove(a)

if not picks:
    picks = sorted(
        f[:-4]
        for f in os.listdir(src_dir)
        if f.lower().endswith(".fbx") and f != "X Bot.fbx" and "Pose" not in f
    )

rig.animation_data_create()
kept = []
for name in picks:
    path = os.path.join(src_dir, name + ".fbx")
    if not os.path.exists(path):
        print("MISSING", name)
        continue
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    act = arm.animation_data.action
    act.name = name
    act.use_fake_user = True
    # Chỉ giữ xoay của mọi xương và vị trí của Hips; bỏ track scale cho file nhẹ.
    # Blender 5: action nhiều lớp, fcurve nằm trong channelbag của từng slot.
    for layer in act.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in list(bag.fcurves):
                    if fc.data_path.endswith(".scale") or (
                        fc.data_path.endswith(".location") and "Hips" not in fc.data_path
                    ):
                        bag.fcurves.remove(fc)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    nla = track.strips.new(name, int(act.frame_range[0]), act)
    if act.slots:
        nla.action_slot = act.slots[0]
    track.mute = True
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    kept.append(name)
    print("ADD", name, int(act.frame_range[1]))

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_skins=True,
    export_morph=False,
    export_yup=True,
)
print("DONE", len(kept), "clips ->", out_path, os.path.getsize(out_path))
