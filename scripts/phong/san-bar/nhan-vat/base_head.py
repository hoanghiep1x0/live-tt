"""Quy trình chuẩn studio: bọc lưới gốc sạch (MakeHuman/MPFB) lên hình khối đầu Hunyuan.

Bước A — chụp lưới gốc để tìm điểm mốc:
  blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- render <thư mục ra>
    → <ra>/ortho_0.png, ortho_45.png, ortho_315.png + ortho.json (cùng quy ước với render_ortho.py)
Bước B — (trên hpc-station) landmarks.py <ra> lm_ortho.json
Bước C — bọc:
  blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- wrap <thư mục bước A> <đầu Hunyuan.glb> <ortho của Hunyuan> <ra.blend>       [--rounds 5] [--eye-targets <json>]
    → ra.blend: người MPFB có đầu mang hình khối Hunyuan (lưới, UV, hốc mắt, xương của MPFB giữ nguyên)
       + đối tượng "HunyuanAligned" (đầu Hunyuan đã đưa về hệ toạ độ MPFB, để nướng màu)
Bước D — dáng mắt theo ảnh (khe mắt Hunyuan không dùng được):
  blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <ra.blend> <ortho ra>      # chụp lưới đã bọc
  (hpc-station) landmarks.py → <ortho ra>/lm_ortho.json; python eye_fix.py <ortho ra> <lm_photo.json> <ảnh> fix.json --sym
  blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- eye-fit <thư mục bước A> fix.json eye_targets.json [--prev <cũ>]
  → bọc lại với --eye-targets eye_targets.json (2 vòng là đủ)
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1:]
MODE = argv[0]
opt = lambda k, d: float(argv[argv.index(k) + 1]) if k in argv else d
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import char_profile as profile  # noqa: E402
PROF = profile.load(argv[argv.index("--profile") + 1] if "--profile" in argv else None)
ASSETS = bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data")


def make_human(with_parts=True):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
    body = profile.make_body(PROF)   # hồ sơ nhân vật (--profile parts\body\<tên>.json; mặc định = model-1)
    if "--eye-targets" in argv:   # dáng mắt (thanh trượt MakeHuman, hoạ sĩ dựng sẵn: mí luôn ôm nhãn cầu) — tính bằng eye-fit
        apply_eye_targets(body, json.load(open(argv[argv.index("--eye-targets") + 1])))
    if with_parts:
        add_parts(body)
    return body


# thanh trượt mắt MakeHuman (mỗi tên có bản l- và r-; áp cả hai bên cùng trọng số → giữ đối xứng)
EYE_T = ["eye-corner1-down", "eye-corner1-up", "eye-corner2-down", "eye-corner2-up", "eye-height1-decr", "eye-height1-incr",
         "eye-height2-decr", "eye-height2-incr", "eye-height3-decr", "eye-height3-incr", "eye-scale-decr", "eye-scale-incr",
         "eye-trans-in", "eye-trans-out", "eye-trans-down", "eye-trans-up", "eye-epicanthus-in", "eye-epicanthus-out",
         "eye-push1-in", "eye-push1-out"]
import bl_ext.user_default.mpfb as _mpfb  # noqa: E402
EYE_DIR = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets", "eyes")


def apply_eye_targets(body, weights):
    for t, w in weights.items():
        if w > 1e-4:
            for side in "lr":
                TargetService.load_target(body, os.path.join(EYE_DIR, f"{side}-{t}.target.gz"), weight=w, name=f"{side}-{t}")
    print("EYE TARGETS", {k: round(v, 3) for k, v in weights.items() if v > 1e-4})


def add_parts(body):
    profile.add_skin(body, PROF)
    for kind, rel in (("Eyes", "eyes/high-poly/high-poly.mhclo"), ("Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
                      ("Eyelashes", "eyelashes/eyelashes02/eyelashes02.mhclo")):
        HumanService.add_mhclo_asset(os.path.join(ASSETS, *rel.split("/")), body, asset_type=kind, subdiv_levels=0,
                                     material_type="GAMEENGINE")


def body_coords(body):
    """Toạ độ thế giới đã tính shape key (MPFB dựng người bằng shape key)."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg); m = ev.to_mesh()
    P = np.array([body.matrix_world @ v.co for v in m.vertices]); ev.to_mesh_clear()
    return P


def head_frame(body):
    """Khung chụp đầu: đỉnh đầu → cằm (MakeHuman mặt hướng -Y, lên +Z)."""
    P = body_coords(body)
    vg = {g.name: g.index for g in body.vertex_groups}
    body_idx = np.array([v.index for v in body.data.vertices if not any(g.group in
                         [vg[n] for n in vg if n.startswith(("helper", "joint"))] for g in v.groups)])
    Q = P[body_idx]
    top = Q[:, 2].max()
    return top, Q


def render_views(outdir, angles=(0, 45, 315), R=1024, soft=False):
    body = bpy.data.objects["Body"]
    top, Q = head_frame(body)
    head_h = 0.26                                            # ~ đỉnh đầu → cằm (m) cho người cao ~1,65 m
    head = Q[Q[:, 2] > top - head_h]
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"; scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = scene.render.resolution_y = R
    w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.82, 0.8, 0.82, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    L = bpy.data.lights.new("k", "SUN"); L.energy = 2.0
    if soft:   # đèn giống ảnh mẫu để so màu da / chấm độ giống: nền dịu, đèn chính từ trái nhân vật, mềm, không cháy sáng
        w.node_tree.nodes["Background"].inputs[1].default_value = 0.75; L.energy = 1.8; L.angle = math.radians(25)
    lo = bpy.data.objects.new("k", L); scene.collection.objects.link(lo)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
    cam.data.type = "ORTHO"; scene.camera = cam
    os.makedirs(outdir, exist_ok=True)
    meta = {}
    for a in angles:
        r = math.radians(a)
        d = np.array([math.sin(r), -math.cos(r), 0.0]); right = np.cross(-d, [0, 0, 1])
        u = head @ right
        cu, cv, sc = float((u.min() + u.max()) / 2), float(top - head_h * 0.55), head_h * 1.45
        center = Vector((0, 0, cv)) + Vector(tuple(right * cu))
        cam.location = center + Vector(tuple(d * 3)); cam.data.ortho_scale = sc
        cam.rotation_euler = (-Vector(tuple(d))).to_track_quat("-Z", "Y").to_euler()
        tilt = Vector((-0.45, 0.25, -0.45)) if soft else Vector((0.3, 0.2, -0.6))
        lo.rotation_euler = (-Vector(tuple(d)) + tilt).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(outdir, f"ortho_{a}.png")
        bpy.ops.render.render(write_still=True)
        meta[f"ortho_{a}.png"] = {"angle": a, "cu": cu, "cv": cv, "scale": sc, "R": R}
    json.dump(meta, open(os.path.join(outdir, "ortho.json"), "w"), indent=1)
    print("RENDER", meta)


def lm3d(meta, lm, bvh, key="ortho_0.png", skip=("iris", "lid_", "brow_", "lipo_")):
    """Điểm mốc 2D (ảnh chụp chính diện) → 3D: bắn tia từ phía trước vào mặt."""
    m = meta[key]; R, sc, cu, cv = m["R"], m["scale"], m["cu"], m["cv"]
    out = {}
    for k, (px, py) in lm[key].items():
        if k.startswith(skip):
            continue
        x = (px - R / 2) / R * sc + cu; z = cv + (R / 2 - py) / R * sc
        hit = bvh.ray_cast(Vector((x, -20, z)), Vector((0, 1, 0)), 100)[0]
        if hit is not None:
            out[k] = np.array(hit)
    return out


def landmark_faces(body, helper):
    """Mặt để bắn tia tìm điểm mốc trên lưới gốc: da (không helper) + nhãn cầu helper. Lưới MakeHuman kín, không có
    nhãn cầu thì tia sát mép mí lọt qua khe mắt chạm đáy hốc mắt (sâu ~3 cm) → uốn sai cả vùng mắt."""
    gi = {g.index for g in body.vertex_groups if g.name in ("helper-l-eye", "helper-r-eye")}
    ball = np.array([any(g.group in gi for g in v.groups) for v in body.data.vertices])
    return [p.vertices[:] for p in body.data.polygons
            if not all(helper[i] for i in p.vertices) or all(ball[i] for i in p.vertices)]


def similarity(A, B):
    """Tìm s, R, t: B ≈ s·R·A + t (Umeyama)."""
    ma, mb = A.mean(0), B.mean(0); Ac, Bc = A - ma, B - mb
    U, S, Vt = np.linalg.svd(Bc.T @ Ac / len(A))
    D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    Rm = U @ D @ Vt; s = (S * np.diag(D)).sum() / (Ac ** 2).sum() * len(A)
    return s, Rm, mb - s * Rm @ ma


if MODE == "render":
    outdir = argv[1]
    make_human(True)
    render_views(outdir)

elif MODE == "eye-fit":
    # trọng số thanh trượt mắt để các điểm mốc mắt dời đúng như eye_fix.py đo (bình phương tối thiểu, giới hạn 0..1)
    base_dir, fix_path, out_json = argv[1:4]
    prev = json.load(open(argv[argv.index("--prev") + 1])) if "--prev" in argv else {}
    fix = json.load(open(fix_path))
    body = make_human(False)
    for m_ in body.modifiers:          # tắt mặt nạ "ẩn helper" → toạ độ đủ mọi đỉnh (gồm nhãn cầu helper)
        m_.show_viewport = False
    P0 = body_coords(body)
    me = body.data
    vgn = {g.index: g.name for g in body.vertex_groups}
    helper = np.array([any(vgn[g.group].startswith(("helper", "joint")) for g in v.groups) for v in me.vertices])
    bvh_b = BVHTree.FromPolygons(P0.tolist(), landmark_faces(body, helper))
    lmB = lm3d(json.load(open(os.path.join(base_dir, "ortho.json"))), json.load(open(os.path.join(base_dir, "lm_ortho.json"))), bvh_b, skip=())
    bidx = np.where(~helper)[0]

    kd = KDTree(len(bidx))
    for j, i in enumerate(bidx):
        kd.insert(Vector(P0[i]), j)
    kd.balance()
    margin_vertex = lambda p: bidx[kd.find(Vector(p))[1]]       # điểm mốc nằm trên nhãn cầu/mép mí → đỉnh da gần nhất = mép mí
    NAMES = {"in": "eye_{}_in", "out": "eye_{}_out", "top": "eye_{}_top", "bot": "eye_{}_bot",
             "u2": "lid_{}_up_2", "u6": "lid_{}_up_6", "l2": "lid_{}_lo_2", "l6": "lid_{}_lo_6"}
    ctl, d = [], []
    for sd in "lr":
        for n, key in NAMES.items():
            if n in fix.get(sd, {}) and key.format(sd) in lmB:
                ctl.append(margin_vertex(lmB[key.format(sd)])); d += [fix[sd][n][0] / 1000, fix[sd][n][1] / 1000]
    ctl, d = np.array(ctl), np.array(d)
    J = np.zeros((len(d), len(EYE_T)))
    for c, t in enumerate(EYE_T):
        keys = [TargetService.load_target(body, os.path.join(EYE_DIR, f"{sd}-{t}.target.gz"), weight=1.0, name=f"fit_{sd}") for sd in "lr"]
        dl = body_coords(body)[ctl] - P0[ctl]
        J[:, c] = dl[:, [0, 2]].ravel()
        for kb in keys:
            body.shape_key_remove(kb)
    # tác dụng từng thanh (mm, mắt l): độ mở (giữa mí trên − giữa mí dưới), đuôi mắt lên, khoé ngoài ra ngoài
    nm = [n for n in NAMES if n in fix.get("l", {})]
    jt = lambda c, n, ax: J[2 * nm.index(n) + ax, c] * 1000
    for c, t in enumerate(EYE_T):
        print(f"  {t:22s} mở {jt(c, 'top', 1) - jt(c, 'bot', 1):+.2f}  đuôi lên {jt(c, 'out', 1):+.2f}  đuôi ra {jt(c, 'out', 0):+.2f}")
    w0 = np.array([prev.get(t, 0.0) for t in EYE_T])
    A = J.T @ J; A += np.eye(len(EYE_T)) * 0.02 * np.trace(A) / len(EYE_T); b = J.T @ (d + J @ w0)
    L = np.linalg.eigvalsh(A).max(); w = w0.copy()
    for _ in range(20000):                                    # gradient chiếu: giữ 0 ≤ w ≤ 1
        w = np.clip(w - (A @ w - b) / L, 0, 1)
    res = J @ (w - w0) - d
    print("EYE FIT lệch còn (mm): tb", round(float(np.abs(res).mean() * 1000), 3), "trước", round(float(np.abs(d).mean() * 1000), 3))
    out_w = {t: round(float(v), 4) for t, v in zip(EYE_T, w) if v > 1e-4}
    json.dump(out_w, open(out_json, "w"), indent=1)
    print("SAVED", out_json, out_w)

elif MODE == "views":   # chụp lại một lưới đã bọc/đã tô (.blend) để tìm điểm mốc của chính nó
    bpy.ops.wm.open_mainfile(filepath=argv[1])
    for o in bpy.data.objects:
        if o.name == "HunyuanAligned":
            o.hide_render = True
    ang = tuple(int(x) for x in argv[argv.index("--angles") + 1].split(",")) if "--angles" in argv else (0, 45, 315)
    render_views(argv[2], angles=ang, soft="--soft" in argv)

elif MODE == "wrap":
    base_dir, hy_path, hy_ortho, out_blend = argv[1:5]
    ROUNDS = int(opt("--rounds", 3))
    body = make_human(False)
    # chốt shape key của MPFB vào toạ độ gốc để chỉnh trực tiếp
    bpy.context.view_layer.objects.active = body
    if body.data.shape_keys:
        body.shape_key_add(name="__mix__", from_mix=True)
        for kb in list(body.data.shape_keys.key_blocks)[:-1]:
            body.shape_key_remove(kb)
        body.shape_key_remove(body.data.shape_keys.key_blocks[0])
    me = body.data
    P = np.array([v.co for v in me.vertices])            # hệ cục bộ của Body (MPFB scale 0.1 nằm ở matrix_world)
    Mw = np.array(body.matrix_world); Mi = np.linalg.inv(Mw)
    Pw = (np.c_[P, np.ones(len(P))] @ Mw.T)[:, :3]
    vg = {g.index: g.name for g in body.vertex_groups}
    is_helper = np.array([any(vg[g.group].startswith(("helper", "joint")) for g in v.groups) for v in me.vertices])

    # điểm mốc 3D trên lưới gốc
    bvh_b = BVHTree.FromPolygons(Pw.tolist(), landmark_faces(body, is_helper))
    lmB = lm3d(json.load(open(os.path.join(base_dir, "ortho.json"))), json.load(open(os.path.join(base_dir, "lm_ortho.json"))), bvh_b)

    # đầu Hunyuan + điểm mốc 3D của nó
    bpy.ops.import_scene.gltf(filepath=hy_path)
    hy = next(o for o in bpy.context.selected_objects if o.type == "MESH"); hy.name = "HunyuanAligned"
    bpy.context.view_layer.objects.active = hy
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    H = np.array([v.co for v in hy.data.vertices])
    hy.data.calc_loop_triangles()
    tri = np.array([t.vertices[:] for t in hy.data.loop_triangles])
    lmH = lm3d(json.load(open(os.path.join(hy_ortho, "ortho.json"))), json.load(open(os.path.join(hy_ortho, "lm_ortho.json"))),
               BVHTree.FromPolygons(H.tolist(), tri.tolist(), all_triangles=True))
    # độ mở mắt không theo tượng (Hunyuan không có khe mắt thật, mí khép hẹp) → chỉ giữ khoé mắt; mở mắt bằng --eye-targets
    keys = [k for k in lmB if k in lmH and k not in ("eye_l_top", "eye_l_bot", "eye_r_top", "eye_r_bot")]
    s, Rm, t = similarity(np.array([lmH[k] for k in keys]), np.array([lmB[k] for k in keys]))
    H2 = (s * (Rm @ H.T)).T + t                                 # Hunyuan → hệ thế giới của MPFB
    for i, v in enumerate(hy.data.vertices):
        v.co = H2[i]
    hy.data.update()
    LH = {k: s * Rm @ lmH[k] + t for k in keys}
    err0 = np.mean([np.linalg.norm(LH[k] - lmB[k]) for k in keys]) * 1000
    print("ALIGN", len(keys), "điểm; lệch trung bình sau căn đồng dạng (mm)", round(err0, 1), "tỉ lệ", round(s, 4))
    bvh_h = BVHTree.FromPolygons(H2.tolist(), tri.tolist(), all_triangles=True)

    # ---------- vùng bọc: đầu (trên cổ), trừ hốc mắt và lòng miệng ----------
    top = Pw[~is_helper, 2].max()
    chin = lmB["chin"][2]
    neck_lo, neck_hi = chin - 0.07, chin + 0.01                 # mờ dần từ cằm xuống cổ (dải rộng → không gấp nếp)
    wz = np.clip((Pw[:, 2] - neck_lo) / (neck_hi - neck_lo), 0, 1)
    eye_c = {s_: (lmB[f"eye_{s_}_in"] + lmB[f"eye_{s_}_out"]) / 2 for s_ in "lr"}
    eye_w = {s_: np.linalg.norm(lmB[f"eye_{s_}_in"] - lmB[f"eye_{s_}_out"]) for s_ in "lr"}
    w_eye = np.ones(len(Pw))
    for s_ in "lr":   # trong hốc mắt: không áp sát bề mặt Hunyuan (Hunyuan không có hốc mắt thật)
        d = np.linalg.norm((Pw - eye_c[s_]) * np.array([1, 1, 1.6]), axis=1)
        w_eye = np.minimum(w_eye, np.clip((d - eye_w[s_] * 0.95) / (eye_w[s_] * 0.45), 0, 1))  # giữ nguyên hốc mắt MPFB (đã chuẩn), chỉ dời theo điểm mốc
    mouth_c = (lmB["mouth_l"] + lmB["mouth_r"]) / 2

    # ---------- 1) uốn mềm theo điểm mốc (RBF) cho mọi đỉnh vùng đầu (kể cả helper: mắt, mi, mày đi theo) ----------
    C = np.array([lmB[k] for k in keys]); Dl = np.array([LH[k] - lmB[k] for k in keys])
    sig = 0.03
    Phi = np.exp(-((C[:, None] - C[None]) ** 2).sum(-1) / (2 * sig ** 2)) + 1e-6 * np.eye(len(C))
    # làm trơn (không nội suy khít): các điểm mốc môi sát nhau (~1 cm) mà bán kính 3 cm → nội suy khít vọt lố, lật mặt cằm/má
    lam = opt("--rbf-smooth", 0.01)
    Wl = np.linalg.solve(Phi + lam * np.eye(len(C)), Dl)
    head_zone = np.clip((Pw[:, 2] - neck_lo) / (neck_hi - neck_lo), 0, 1)
    disp = np.exp(-((Pw[:, None] - C[None]) ** 2).sum(-1) / (2 * sig ** 2)) @ Wl * head_zone[:, None]
    _fn = lambda Q: np.array([np.cross(Q[f[1]] - Q[f[0]], Q[f[2]] - Q[f[0]]) for f in _faces_all])
    _faces_all = [p.vertices[:] for p in me.polygons if not any(is_helper[i] for i in p.vertices)]
    _n_before = _fn(Pw)
    Pw = Pw + disp
    print("RBF λ", lam, "lệch điểm mốc còn (mm)", round(float(np.abs(Phi @ Wl - Dl).max() * 1000), 2),
          "mặt bị lật", int(((_fn(Pw) * _n_before).sum(1) < 0).sum()))

    # (sau khi uốn theo điểm mốc: lưới đã gần tượng → phép thử mặt trong mới đúng)
    # mặt trong (lòng miệng, trong lỗ mũi): tia theo pháp tuyến chạm lại chính lưới trong 7 mm → không áp sát, dời theo da
    # xung quanh. (Không dùng "sâu hơn khoé môi" — cằm lùi sâu hơn khoé môi, bắt nhầm da cằm; cũng không so với pháp tuyến
    # tượng — chỗ môi tượng gấp nếp cho kết quả sai)
    _N0 = np.zeros_like(Pw)
    for f in me.polygons:
        v_ = list(f.vertices); _N0[v_] += np.cross(Pw[v_[1]] - Pw[v_[0]], Pw[v_[2]] - Pw[v_[0]])
    _N0 /= np.maximum(np.linalg.norm(_N0, axis=1, keepdims=True), 1e-12)
    bvh_self = BVHTree.FromPolygons(Pw.tolist(), [p.vertices[:] for p in me.polygons if not all(is_helper[i] for i in p.vertices)])
    nose_c = lmB.get("nose_tip", mouth_c)
    cand = np.where((wz > 0) & (~is_helper) & ((np.linalg.norm((Pw - mouth_c)[:, [0, 2]], axis=1) < 0.035)
                                                | (np.linalg.norm(Pw - nose_c, axis=1) < 0.03)))[0]
    mouth_zone = np.zeros(len(Pw), bool); mouth_zone[cand] = True
    behind_mouth = np.zeros(len(Pw), bool)
    for i in cand:
        if bvh_self.ray_cast(Vector(Pw[i] + _N0[i] * 0.0004), Vector(_N0[i]), 0.007)[0] is not None:   # xa hơn → vồ phải mũi
            behind_mouth[i] = True
    # tai: MPFB có sẵn nhóm "ears" → không áp sát (tai Hunyuan rối hình), chỉ đi theo uốn điểm mốc
    ear_g = next((g.index for g in body.vertex_groups if g.name == "ears"), None)
    is_ear = np.array([any(g.group == ear_g for g in v.groups) for v in me.vertices]) if ear_g is not None else np.zeros(len(Pw), bool)
    W = wz * w_eye * (~is_helper) * (~behind_mouth) * (~is_ear)
    print("MẶT TRONG (không áp sát, dời theo da)", int(behind_mouth.sum()))
    print("WRAP verts", int((W > 0.01).sum()))

    # cạnh của lưới (để làm mịn trường dịch chuyển)
    E = np.array([e.vertices[:] for e in me.edges])
    nb = [[] for _ in range(len(Pw))]
    for a_, b_ in E:
        nb[a_].append(b_); nb[b_].append(a_)

    def smooth_field(D, it=8):
        for _ in range(it):
            D = 0.5 * D + 0.5 * np.array([D[n].mean(0) if n else D[i] for i, n in enumerate(nb)])
        return D

    # ---------- 2) áp sát bề mặt Hunyuan vài vòng: đẩy tới điểm gần nhất, làm mịn, lặp ----------
    faces_b = [p.vertices[:] for p in me.polygons]

    def vnormals(Q):
        N = np.zeros_like(Q)
        for f in faces_b:
            a_, b_, c_ = Q[f[0]], Q[f[1]], Q[f[2]]
            n_ = np.cross(b_ - a_, c_ - a_)
            for i in f:
                N[i] += n_
        return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

    Pw_pre = Pw.copy()
    SNAP = int(opt("--snap", 2))       # vòng cuối "dán lên mặt": làm mịn ít (làm mịn mạnh xoá mất chỉnh cục bộ → gờ dưới môi)
    for r_ in range(ROUNDS + SNAP):
        snap = r_ >= ROUNDS
        D = np.zeros_like(Pw)
        idx = np.where(W > 0.01)[0]
        N = vnormals(Pw)
        for i in idx:
            # chiếu theo pháp tuyến (ra và vào), chỉ nhận chỗ chạm có pháp tuyến cùng hướng → không vồ nhầm sang tai, cổ
            best = None
            for sgn in (1, -1):
                hit, hn, _, dist = bvh_h.ray_cast(Vector(Pw[i] - N[i] * 0.0 * sgn), Vector(N[i] * sgn), 0.015)
                if hit is not None and np.dot(np.array(hn), N[i]) > 0.5 and (best is None or dist < best[1]):
                    best = (np.array(hit), dist)
            if best is None:   # mặt chúc xuống/nghiêng (dưới môi dưới, cằm): tia không chạm → điểm gần nhất cùng phía
                loc, hn, _, dist = bvh_h.find_nearest(Vector(Pw[i]), 0.01)
                if loc is not None and np.dot(np.array(hn), N[i]) > 0.0:
                    best = (np.array(loc), dist)
            if best is not None:
                D[i] = (best[0] - Pw[i]) * W[i]
        D = smooth_field(D, 1 if snap else (10 if r_ < ROUNDS - 1 else 3))
        Pw = Pw + D * (0.7 if r_ < ROUNDS - 1 and not snap else 1.0)
        dist = np.array([np.linalg.norm(np.array(bvh_h.find_nearest(Vector(Pw[i]), 0.05)[0] or Pw[i]) - Pw[i]) for i in idx[::7]])
        print("ROUND", r_ + 1, "khoảng cách tới mặt Hunyuan (mm): tb", round(dist.mean() * 1000, 2), "max", round(dist.max() * 1000, 1))

    # dán sát: lặp làm mượt vị trí → điểm gần nhất của tượng (như shrinkwrap + relax của phần mềm bọc lưới). Gỡ cả nếp gấp ở
    # môi (uốn theo điểm mốc kéo da trong môi gập ra trước cằm — tia theo pháp tuyến không cứu được vì mặt gập quay ngược).
    # Hoà theo W: rìa hốc mắt, cổ chuyển mềm.
    zone = np.where((W > 0.01) & ~behind_mouth)[0]
    for _ in range(int(opt("--relax", 0))):   # mặc định tắt: dán điểm gần nhất làm sập rãnh mũi–má (gờ)
        Q = Pw.copy()
        for i in zone:
            if nb[i]:
                Q[i] = 0.5 * Pw[i] + 0.5 * Pw[nb[i]].mean(0)
        for i in zone:
            loc = bvh_h.find_nearest(Vector(Q[i]), 0.006)[0]
            tgt_ = np.array(loc) if loc is not None else Q[i]
            Pw[i] = Pw[i] + (tgt_ - Pw[i]) * W[i]
    dist = np.array([np.linalg.norm(np.array(bvh_h.find_nearest(Vector(Pw[i]), 0.05)[0] or Pw[i]) - Pw[i]) for i in zone[W[zone] > 0.99][::5]])
    print("RELAX", len(zone), "đỉnh; khoảng cách tới tượng (mm) tb", round(dist.mean() * 1000, 2), "p95", round(np.percentile(dist, 95) * 1000, 2))

    # lòng miệng, tai (không áp sát) dời theo da xung quanh: không thì da ngoài lõm vào theo tượng còn lòng miệng đứng yên
    # → lòng miệng trồi xuyên ra thành gờ quanh môi dưới
    follow = np.where((behind_mouth | is_ear) & (~is_helper) & (wz > 0))[0]
    srcv = np.where((W > 0.5) & ~(behind_mouth | is_ear))[0]
    kd_f = KDTree(len(srcv))
    for j, i in enumerate(srcv):
        kd_f.insert(Vector(Pw_pre[i]), j)
    kd_f.balance()
    Tot = Pw - Pw_pre
    for i in follow:
        nn = kd_f.find_n(Vector(Pw_pre[i]), 8)
        ws = np.array([1 / (d_ + 1e-4) ** 2 for _, _, d_ in nn]); ids = [srcv[j] for _, j, _ in nn]
        Pw[i] = Pw_pre[i] + (Tot[ids] * ws[:, None]).sum(0) / ws.sum()
    print("FOLLOW lòng miệng + tai", len(follow))

    # đối xứng (kinh nghiệm hoạ sĩ: đối xứng trước): trung bình độ dời của mỗi đỉnh với đỉnh đối xứng của nó
    P0w_ = (np.c_[P, np.ones(len(P))] @ Mw.T)[:, :3]
    kd_m = KDTree(len(P0w_))
    for i, q in enumerate(P0w_):
        kd_m.insert(Vector(q), i)
    kd_m.balance()
    mirror = np.array([kd_m.find(Vector((-q[0], q[1], q[2])))[1] for q in P0w_])
    Dt = Pw - P0w_
    Dm = Dt[mirror] * np.array([-1, 1, 1])
    Pw = P0w_ + (Dt + Dm) / 2
    print("SYMMETRY", "đỉnh lệch đối xứng lớn nhất trước (mm)", round(float(np.abs(Dt - Dm).max() * 1000), 1))

    # helper (mắt, mi, mày, tóc…): dời theo đỉnh thân gần nhất
    body_idx = np.where(~is_helper)[0]
    kd = KDTree(len(body_idx))
    P0w = (np.c_[P, np.ones(len(P))] @ Mw.T)[:, :3]
    for j, i in enumerate(body_idx):
        kd.insert(Vector(P0w[i]), j)
    kd.balance()
    tot = Pw - P0w
    for i in np.where(is_helper)[0]:
        near = kd.find_n(Vector(P0w[i]), 4)
        ws = np.array([1 / (d_ + 1e-4) for _, _, d_ in near]); ids = [body_idx[j] for _, j, _ in near]
        Pw[i] = P0w[i] + (tot[ids] * ws[:, None]).sum(0) / ws.sum()

    # gỡ mặt lật còn sót: đỉnh của mặt lật về trung bình láng giềng rồi dán lại lên tượng, lặp tới khi hết
    nb_all = [[] for _ in range(len(Pw))]
    for e in me.edges:
        a_, b_ = e.vertices; nb_all[a_].append(b_); nb_all[b_].append(a_)
    for it in range(20):
        flip = np.where((_fn(Pw) * _n_before).sum(1) < 0)[0]
        if not len(flip):
            break
        vs = {i for f in flip for i in _faces_all[f] if not is_helper[i]}
        for i in vs:
            q = Pw[nb_all[i]].mean(0)
            loc = bvh_h.find_nearest(Vector(q), 0.004)[0] if W[i] > 0.5 else None
            Pw[i] = np.array(loc) if loc is not None else q
    print("MẶT BỊ LẬT sau bọc", int(((_fn(Pw) * _n_before).sum(1) < 0).sum()), "(gỡ", it, "vòng)")
    P_new = (np.c_[Pw, np.ones(len(Pw))] @ Mi.T)[:, :3]
    for i, v in enumerate(me.vertices):
        v.co = P_new[i]
    me.update()
    add_parts(body)                       # da, mắt, mày, mi khớp theo lưới mới (mhclo bám theo đỉnh)
    hy.hide_render = False
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print("SAVED", out_blend)
