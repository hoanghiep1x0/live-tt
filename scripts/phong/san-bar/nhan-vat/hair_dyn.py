"""Tóc bay theo điệu nhảy: chuỗi xương tóc dựng từ khối tóc + mô phỏng lò xo nướng thành khung hình (dùng trong rig_base.py).

- build(rig, hair): sau retarget.tpose_like (tư thế gốc chữ T). Quanh đầu, mỗi hướng (bước 25°) có tóc rủ dưới ngang tai →
  một chuỗi 4 đốt chạy theo trung vị khối tóc từng lát cao, gốc con của xương đầu. Gắn trọng số: trên ngang tai theo đầu, dưới
  chia cho 2 chuỗi gần nhất theo góc, nội suy dọc theo đốt; dải chuyển 3 cm.
- simulate(rig, act, chains): mỗi khung của điệu: gốc bám đầu; các khớp: quán tính (giảm chấn), trọng lực, kéo về dáng gốc
  (theo hệ đầu), giữ độ dài đốt, đẩy ra khỏi cầu va chạm (đầu, cổ, ngực, vai, cánh tay). Quay từng đốt cho trục y trùng
  hướng khớp → khoá hình rotation_quaternion vào chính action của điệu (NLA giữ nguyên).
- Không cần sửa app: GLB mang sẵn chuyển động tóc trong từng điệu.
"""
import math

import bpy
import numpy as np
from mathutils import Matrix, Vector

HEAD = "mixamorig:Head"
COLL = (("mixamorig:Head", 0.105, 0.55), ("mixamorig:Neck", 0.055, 0.5), ("mixamorig:Spine2", 0.13, 0.4),
        ("mixamorig:Spine1", 0.125, 0.5), ("mixamorig:LeftShoulder", 0.06, 0.8), ("mixamorig:RightShoulder", 0.06, 0.8),
        ("mixamorig:LeftArm", 0.055, 0.3), ("mixamorig:RightArm", 0.055, 0.3))    # (xương, bán kính, vị trí dọc xương 0..1)


def build(rig, hair, nseg=4, step_deg=25, min_pts=150):
    rw = rig.matrix_world; rwi = rw.inverted()
    H = np.array([tuple(rwi @ (hair.matrix_world @ v.co)) for v in hair.data.vertices])   # hệ armature
    hb = rig.data.bones[HEAD]
    hc = np.array(hb.head_local); z_band = hc[2] + 0.03
    ang = np.degrees(np.arctan2(H[:, 0] - hc[0], H[:, 1] - hc[1]))          # 0° = sau gáy (+Y), ±180° = mặt
    low = H[:, 2] < z_band
    chains = []
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    for a0 in np.arange(-180 + step_deg / 2, 180, step_deg):
        sel = low & (np.abs(((ang - a0) + 180) % 360 - 180) < step_deg / 2)
        if sel.sum() < min_pts:
            continue
        P = H[sel]; z_lo = np.percentile(P[:, 2], 3)
        zs = np.linspace(z_band, z_lo, nseg + 1)
        J = []
        for z in zs:
            sl = P[np.abs(P[:, 2] - z) < 0.015]
            if len(sl) < 5:
                sl = P[np.argsort(np.abs(P[:, 2] - z))[:20]]
            J.append(np.median(sl, 0))
        J = np.array(J)
        names = []
        for j in range(nseg):
            b = eb.new(f"hair_{int(a0):+04d}_{j}")
            b.head = Vector(J[j]); b.tail = Vector(J[j + 1]); b.roll = 0
            b.parent = eb[HEAD] if j == 0 else eb[names[-1]]
            b.use_connect = j > 0; b.use_deform = True
            names.append(b.name)
        chains.append({"ang": float(a0), "bones": names, "joints": J})
    bpy.ops.object.mode_set(mode="OBJECT")
    print("HAIR CHAINS", len(chains), [round(c["ang"]) for c in chains])

    # trọng số
    for vg in list(hair.vertex_groups):
        hair.vertex_groups.remove(vg)
    vh = hair.vertex_groups.new(name=HEAD)
    vgs = {n: hair.vertex_groups.new(name=n) for c in chains for n in c["bones"]}
    cang = np.array([c["ang"] for c in chains])
    for i, p in enumerate(H):
        blend = float(np.clip((z_band + 0.03 - p[2]) / 0.03, 0, 1))         # 0 trên dải chuyển → chỉ theo đầu
        blend = blend * blend * (3 - 2 * blend)
        if blend <= 0 or not len(chains):
            vh.add([i], 1.0, "REPLACE"); continue
        da = np.abs(((ang[i] - cang) + 180) % 360 - 180); o = np.argsort(da)[:2]
        wa = 1 / (da[o] + 5.0); wa /= wa.sum()
        if da[o[0]] > 60:                                                   # xa mọi chuỗi (vd. trước mặt): theo đầu
            vh.add([i], 1.0, "REPLACE"); continue
        tot = 1 - blend
        if tot > 0:
            vh.add([i], tot, "REPLACE")
        for k, wk in zip(o, wa):
            J = chains[k]["joints"]; zt = np.clip((J[0, 2] - p[2]) / max(J[0, 2] - J[-1, 2], 1e-4), 0, 0.999) * nseg
            b0 = int(zt); f = zt - b0
            names = chains[k]["bones"]
            vgs[names[b0]].add([i], blend * wk * (1 - f), "ADD")
            if b0 + 1 < nseg:
                vgs[names[b0 + 1]].add([i], blend * wk * f, "ADD")
            else:
                vgs[names[b0]].add([i], blend * wk * f, "ADD")
    print("HAIR WEIGHTS", len(H), "đỉnh")
    return chains


def simulate(rig, act, nfr, chains, sub=3, damp=0.9, stiff=0.03, grav=9.8, fps=30):
    if not chains:
        return
    scene = bpy.context.scene
    rw = rig.matrix_world
    slot = act.slots[0] if getattr(act, "slots", None) else None
    rig.animation_data.action = act
    if slot is not None:
        rig.animation_data.action_slot = slot
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    mods = [(m, m.show_viewport) for o in meshes for m in o.modifiers if m.type == "ARMATURE"]
    for m, _ in mods:
        m.show_viewport = False                                              # đỡ tính da khi chạy từng khung
    hb = rig.data.bones[HEAD]
    rest_inv = hb.matrix_local.inverted()
    Q = [np.array([tuple(rest_inv @ Vector(j)) for j in c["joints"]]) for c in chains]   # khớp trong hệ đầu lúc nghỉ
    L = [np.linalg.norm(np.diff(c["joints"], axis=0), axis=1) for c in chains]
    X = Xp = None
    dt = 1.0 / fps / sub
    g = np.array([0, 0, -grav]) * dt * dt
    for pb in rig.pose.bones:
        if pb.name.startswith("hair_"):
            pb.rotation_mode = "QUATERNION"
    for f in range(0, nfr + 1):
        scene.frame_set(f)
        Hm = rw @ rig.pose.bones[HEAD].matrix
        T = [np.array([tuple(Hm @ Vector(q)) for q in Qc]) for Qc in Q]
        col = []
        for bn, r, t in COLL:
            pb = rig.pose.bones.get(bn)
            if pb:
                h_, t_ = rw @ pb.head, rw @ pb.tail
                col.append((np.array(h_.lerp(t_, t)), r))
        if X is None:
            X = [t.copy() for t in T]; Xp = [t.copy() for t in T]
            warm = 40
        else:
            warm = 0
        for it in range(sub + warm):
            for c in range(len(chains)):
                x, xp, t = X[c], Xp[c], T[c]
                v = (x - xp) * damp
                xp[:] = x
                x[1:] = x[1:] + v[1:] + g + (t[1:] - x[1:]) * stiff
                x[0] = t[0]
                for _ in range(3):
                    for j in range(len(x) - 1):
                        d = x[j + 1] - x[j]; ln = np.linalg.norm(d)
                        if ln > 1e-9:
                            x[j + 1] = x[j] + d / ln * L[c][j]
                    for cp, r in col:
                        d = x[1:] - cp; ln = np.linalg.norm(d, axis=1)
                        m = ln < r
                        if m.any():
                            x[1:][m] = cp + d[m] / ln[m][:, None] * r
        # quay từng đốt cho trục y trùng hướng khớp
        rwi = rw.inverted()
        for c, ch in enumerate(chains):
            parent_m = rig.pose.bones[HEAD].matrix
            for j, bn in enumerate(ch["bones"]):
                b = rig.data.bones[bn]
                nat = parent_m @ (b.parent.matrix_local.inverted() @ b.matrix_local)
                ynat = (nat.to_3x3() @ Vector((0, 1, 0))).normalized()
                d = (rwi.to_3x3() @ Vector(X[c][j + 1] - X[c][j])).normalized()
                q = ynat.rotation_difference(d)
                D = Matrix.Translation(nat.to_translation()) @ (q.to_matrix() @ nat.to_3x3()).to_4x4()
                basis = nat.inverted() @ D
                pb = rig.pose.bones[bn]
                pb.rotation_quaternion = basis.to_quaternion()
                pb.keyframe_insert("rotation_quaternion", frame=f)
                parent_m = D
    for m, s in mods:
        m.show_viewport = s
    rig.animation_data.action = None
    print("HAIR SIM", act.name, nfr + 1, "khung")
