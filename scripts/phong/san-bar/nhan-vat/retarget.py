"""Chuyển điệu nhảy Mixamo sang một bộ xương khác cùng tên xương (mixamorig:*) nhưng khác tư thế gốc / trục xương.

1. tpose_like(rig, src): xoay từng xương của rig cho cùng hướng với xương nguồn lúc đứng nghỉ (chữ T),
   rồi lấy tư thế đó làm tư thế gốc mới (kéo theo cả lưới).
2. bake(rig, src, name): mỗi khung, hướng xương đích trong thế giới = hướng xương nguồn × độ lệch trục lúc nghỉ;
   hông còn được dời theo tỉ lệ chiều cao. Ghi thành action riêng của rig.
"""
import bpy
from mathutils import Matrix


def ordered(arm):
    """Xương theo thứ tự cha trước con."""
    out = []
    def walk(b):
        out.append(b)
        for c in b.children:
            walk(c)
    for b in arm.data.bones:
        if b.parent is None:
            walk(b)
    return out


def tpose_like(rig, src, meshes):
    bpy.context.view_layer.update()
    rot_inv = rig.matrix_world.to_3x3().inverted()
    names = [b.name for b in ordered(rig) if b.name in src.data.bones]
    for name in names:
        bpy.context.view_layer.update()
        pb = rig.pose.bones[name]
        sb = src.data.bones[name]
        want = (src.matrix_world.to_3x3() @ (sb.tail_local - sb.head_local)).normalized()
        want = (rot_inv @ want).normalized()            # hướng mong muốn trong hệ armature của rig
        cur = (pb.tail - pb.head).normalized()
        q = cur.rotation_difference(want)
        head = pb.head.copy()
        pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
    bpy.context.view_layer.update()
    # Áp tư thế hiện tại thành tư thế gốc: lưới giữ dáng chữ T, xương nhận rest mới.
    for mesh in meshes:  # thân, mắt, tóc, quần áo… đều phải giữ dáng chữ T
        mod = next((m for m in mesh.modifiers if m.type == "ARMATURE"), None)
        if not mod:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
        if mesh.data.shape_keys:  # không áp modifier được khi còn shape key
            mesh.shape_key_add(name="__mix__", from_mix=True)
            for kb in list(mesh.data.shape_keys.key_blocks)[:-1]:
                mesh.shape_key_remove(kb)
            mesh.shape_key_remove(mesh.data.shape_keys.key_blocks[0])
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    for mesh in meshes:
        if not any(m.type == "ARMATURE" for m in mesh.modifiers):
            m = mesh.modifiers.new("Armature", "ARMATURE"); m.object = rig


def bake(rig, src, name, step=1):
    scene = bpy.context.scene
    act = src.animation_data.action
    f0, f1 = (int(v) for v in act.frame_range)
    names = [b.name for b in ordered(rig) if b.name in src.data.bones]
    rig_w, rig_wi = rig.matrix_world, rig.matrix_world.inverted()
    # độ lệch trục lúc nghỉ (cùng tư thế chữ T): đích = nguồn × off
    off = {}
    for n in names:
        s_rest = (src.matrix_world @ src.data.bones[n].matrix_local).to_quaternion()
        t_rest = (rig_w @ rig.data.bones[n].matrix_local).to_quaternion()
        off[n] = s_rest.inverted() @ t_rest
    hips = "mixamorig:Hips"
    s_h = (src.matrix_world @ src.data.bones[hips].head_local).z
    t_h = (rig_w @ rig.data.bones[hips].head_local).z
    k = t_h / s_h

    new = bpy.data.actions.new(name)
    rig.animation_data_create(); rig.animation_data.action = new
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for f in range(f0, f1 + 1, step):
        scene.frame_set(f)
        arm_m = {}  # ma trận trong hệ armature của rig, tính tay (không cần cập nhật cảnh từng xương)
        for n in names:
            bone = rig.data.bones[n]
            s_world = src.matrix_world @ src.pose.bones[n].matrix
            rot = (s_world.to_quaternion() @ off[n])
            if bone.parent and bone.parent.name in arm_m:
                p = bone.parent
                chain = arm_m[p.name] @ p.matrix_local.inverted() @ bone.matrix_local
                loc = chain.to_translation()
            else:
                loc = bone.matrix_local.to_translation()
            if n == hips:
                sp = s_world.to_translation()
                loc = rig_wi @ (sp * k)  # hông dời theo tỉ lệ chiều cao hai nhân vật
            desired = Matrix.Translation(loc) @ (rig_wi.to_quaternion() @ rot).to_matrix().to_4x4()
            arm_m[n] = desired
            parent_m = (arm_m[bone.parent.name] @ bone.parent.matrix_local.inverted() @ bone.matrix_local
                        if bone.parent and bone.parent.name in arm_m else bone.matrix_local)
            basis = parent_m.inverted() @ desired
            pb = rig.pose.bones[n]
            pb.matrix_basis = basis
            pb.keyframe_insert("rotation_quaternion", frame=f - f0)
            if n == hips:
                pb.keyframe_insert("location", frame=f - f0)
    rig.animation_data.action = None
    return new, f1 - f0
