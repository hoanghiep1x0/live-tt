"""Thư viện bộ phận (mũi, mắt, tai): chụp ĐẦU CHUẨN để ChatGPT vẽ lại đúng một bộ phận trên cùng khung hình, rồi khớp lại.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/bo_phan.py -- chup <thư mục ra> [--part <part.json> ...] \
    [--views 0,90] [--R 1024] [--samples 64]

- Đầu chuẩn = người MPFB mặc định (char_profile.DEFAULT) + da, mắt, mày, mi — trung tính để bộ phận nào ghép vào cũng hợp.
- Chụp chiếu song song (ortho) theo góc: 0 chính diện, 90 nghiêng mũi chỉ sang trái ảnh (quy ước 01 §3). Khung, đèn, nền
  cố định → ảnh ChatGPT vẽ lại trên ảnh này chồng khớp 1:1 với bản Blender chụp lại (cùng lệnh, thêm --part).
- --part: áp bộ phận đã lưu ({"targets": {"nose/nose-point-up": 0.4, ...}}) trước khi chụp — để so với ảnh mẫu.
- Ghi <ra>/view_<góc>.png + cam.json (pixel ↔ toạ độ: x_px = (u - cu)/scale*R + R/2, y_px = R/2 - (z - cv)/scale*R,
  u = P · right) — bước khớp dùng cam.json để chiếu đỉnh lưới lên ảnh.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/bo_phan.py -- khop <thư mục bộ phận> [--loai mui]     [--chuan assets/parts/_dau-chuan/v1] [--lam 30] [--vong 6]

- <thư mục bộ phận>/ref/view_0.png, view_90.png: ảnh ChatGPT vẽ lại bộ phận trên ảnh đầu chuẩn, đã thu về R×R; ref/lm.json và
  <chuẩn>/lm.json: điểm mốc (landmarks.py, mpvenv) của ảnh chính diện.
- Chính diện: điểm mốc vùng (mũi: sống, đầu, cánh, lỗ mũi) ↔ đỉnh lưới gần nhất; ảnh mẫu căn về khung chuẩn bằng điểm đứng
  yên (mắt, mày, hàm). Nghiêng 90: mép trái ảnh mẫu (đường nghiêng mũi) ↔ đỉnh đường giữa mặt, trừ lệch ngang đo ở trán/cằm.
- Thanh trượt tuyến tính theo đỉnh → bình phương tối thiểu có chặn 0..1 (incr, decr là hai biến) + phạt lam·|w|² để không
  vặn thanh thừa; lặp `vong` lần (đường nghiêng chọn lại theo hàng). Ghi part.json (targets + sai số px).
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import char_profile as profile  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
MODE = argv[0]


def opt(name, default):
    return argv[argv.index(name) + 1] if name in argv else default


def make_head(parts=()):
    """Người mặc định + da, mắt, mày, mi; cộng thanh trượt của các bộ phận (part.json)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    prof = profile.load(None); dinh = {}
    for p in parts:
        d = json.load(open(p, encoding="utf-8"))
        prof["targets"].update(d["targets"])
        for v, off in d.get("dinh", {}).items():                   # tinh chỉnh từng đỉnh (khop-khuon --tu-do)
            dinh[int(v)] = np.array(off) + dinh.get(int(v), 0)
    body = profile.make_body(prof)
    if dinh:
        ap_dinh(body, dinh)
    profile.add_skin(body, prof)
    for kind, rel in (("Eyes", "eyes/high-poly/high-poly.mhclo"), ("Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
                      ("Eyelashes", "eyelashes/eyelashes02/eyelashes02.mhclo")):
        HumanService.add_mhclo_asset(os.path.join(profile.ASSETS, *rel.split("/")), body, asset_type=kind,
                                     subdiv_levels=0, material_type="GAMEENGINE")
    return body


def ap_dinh(body, dinh):
    """Cộng độ dời từng đỉnh (toạ độ thế giới, mét) thành shape key `part_dinh` — topo MakeHuman cố định nên dùng được
    cho mọi nhân vật cùng lưới gốc."""
    inv = np.array(body.matrix_world.inverted().to_3x3())
    if body.data.shape_keys is None:
        body.shape_key_add(name="Basis", from_mix=False)
    basis = body.data.shape_keys.reference_key
    sk = body.shape_key_add(name="part_dinh", from_mix=False)
    for v, off in dinh.items():
        sk.data[v].co = basis.data[v].co + Vector(tuple(inv @ off))
    sk.value = 1.0
    print("DINH", len(dinh), "đỉnh")


def body_coords(body):
    """Toạ độ thế giới đã tính shape key (MPFB dựng người bằng shape key)."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg); m = ev.to_mesh()
    P = np.array([body.matrix_world @ v.co for v in m.vertices]); ev.to_mesh_clear()
    return P


def head_points(body):
    """Đỉnh thân (bỏ lưới phụ helper/joint) từ đỉnh đầu xuống 26 cm."""
    P = body_coords(body)
    skip = {g.index for g in body.vertex_groups if g.name.startswith(("helper", "joint"))}
    idx = np.array([v.index for v in body.data.vertices if not any(g.group in skip for g in v.groups)])
    Q = P[idx]
    top = float(Q[:, 2].max())
    return top, Q[Q[:, 2] > top - 0.26]


def gpu_cycles(scene, samples):
    scene.render.engine = "CYCLES"
    p = bpy.context.preferences.addons["cycles"].preferences
    for t in ("OPTIX", "CUDA"):
        try:
            p.compute_device_type = t; p.get_devices()
            if any(d.type == t for d in p.devices):
                for d in p.devices:
                    d.use = d.type == t
                scene.cycles.device = "GPU"
                break
        except TypeError:
            continue
    scene.cycles.samples = samples; scene.cycles.use_denoising = True


def render_anh():
    """Render ảnh tĩnh; GPU hết bộ nhớ (session khác đang chạy Hunyuan3D…) → chuyển Cycles sang CPU rồi render lại."""
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError as e:
        if "CUDA" not in str(e) and "memory" not in str(e):
            raise
        print("GPU_HET_BO_NHO: render bằng CPU")
        bpy.context.scene.cycles.device = "CPU"
        bpy.ops.render.render(write_still=True)


def chup(outdir, angles, R, samples):
    """Khung đầu cố định: rộng 1,45 × cao đầu, tâm ở 55% từ đỉnh xuống — giống base_head.render_views để dùng chung mốc."""
    body = bpy.data.objects["Body"]
    top, head = head_points(body)
    head_h = 0.26
    scene = bpy.context.scene
    gpu_cycles(scene, samples)
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = scene.render.resolution_y = R
    w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.78, 0.78, 0.8, 1); bg.inputs[1].default_value = 0.35
    # đèn studio mềm: chính từ trước-trái-trên, phụ bên phải, ven sau — bóng nhẹ để thấy khối mũi, tai.
    # Watt nhỏ vì đèn chỉ cách đầu ~1,7 m (900 W ở đây là cháy trắng cả mặt)
    lights = [("chinh", 60, (-0.9, -1.4, 0.7), 1.2), ("phu", 22, (1.2, -1.0, 0.2), 1.5), ("ven", 25, (0.3, 1.4, 0.9), 1.0)]
    cv = top - head_h * 0.55
    for name, energy, d, size in lights:
        L = bpy.data.lights.new(name, "AREA"); L.energy = energy; L.size = size
        lo = bpy.data.objects.new(name, L); scene.collection.objects.link(lo)
        lo.location = Vector((0, 0, cv)) + Vector(d)
        lo.rotation_euler = (-Vector(d)).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
    cam.data.type = "ORTHO"; scene.camera = cam
    os.makedirs(outdir, exist_ok=True)
    meta = {}
    for a in angles:
        r = math.radians(a)
        d = np.array([math.sin(r), -math.cos(r), 0.0]); right = np.cross(-d, [0, 0, 1])
        u = head @ right
        cu, sc = float((u.min() + u.max()) / 2), head_h * 1.45
        center = Vector((0, 0, cv)) + Vector(tuple(right * cu))
        cam.location = center + Vector(tuple(d * 3)); cam.data.ortho_scale = sc
        cam.rotation_euler = (-Vector(tuple(d))).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(outdir, f"view_{a}.png")
        render_anh()
        meta[f"view_{a}.png"] = {"angle": a, "right": right.tolist(), "cu": cu, "cv": cv, "scale": sc, "R": R}
    json.dump(meta, open(os.path.join(outdir, "cam.json"), "w"), indent=1)
    print("CHUP", outdir, list(meta))


# ---------------------------------------------------------------------------------------------------------------- khớp
# Mỗi loại bộ phận: thư mục thanh trượt MakeHuman + điểm mốc MediaPipe thuộc vùng đó (landmarks.py) + điểm mốc đứng yên
# dùng để căn ảnh mẫu về khung đầu chuẩn (ChatGPT giữ khung gần đúng nhưng có thể lệch vài px / co giãn chút ít).
LOAI = {
    "mui": {"dir": "nose", "lm": lambda k: k.startswith("nose") or k in ("nostril_l", "nostril_r"),
            "co_dinh": ("eye_l_out", "eye_l_in", "eye_r_out", "eye_r_in", "brow_l", "brow_r", "jaw_l", "jaw_r")},
}


def load_cam(chuan):
    return json.load(open(os.path.join(chuan, "cam.json")))


def proj(P, c):
    """Đỉnh → pixel ảnh (gốc trên-trái) theo cam.json của một góc."""
    R, sc = c["R"], c["scale"]
    x = (P @ np.array(c["right"]) - c["cu"]) / sc * R + R / 2
    y = R / 2 - (P[..., 2] - c["cv"]) / sc * R
    return np.stack([x, y], -1)


def target_deltas(body, folder):
    """Mỗi thanh của thư mục (incr và decr là hai biến riêng, 0..1): độ dời đỉnh khi thanh = 1."""
    from bl_ext.user_default.mpfb.services.targetservice import TargetService
    import bl_ext.user_default.mpfb as _mpfb
    td = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets", folder)
    P0 = body_coords(body)
    names, D = [], []
    for f in sorted(os.listdir(td)):
        if not f.endswith(".target.gz"):
            continue
        nm = f[:-10]
        TargetService.load_target(body, os.path.join(td, f), weight=1.0, name="_k_" + nm)
        D.append(body_coords(body) - P0)
        key = body.data.shape_keys.key_blocks["_k_" + nm]
        body.shape_key_remove(key)
        names.append(nm)
    return P0, names, np.array(D)


def similarity(A, B):
    """s, R, t sao cho s·R·A + t ≈ B (Umeyama, 2D)."""
    ma, mb = A.mean(0), B.mean(0); a, b = A - ma, B - mb
    U, S, Vt = np.linalg.svd(b.T @ a)
    d = np.sign(np.linalg.det(U @ Vt)); M = np.diag([1, d])
    Rm = U @ M @ Vt; s = (S * np.diag(M)).sum() / (a ** 2).sum()
    return s, Rm, mb - s * Rm @ ma


def mask(path, R):
    """Ảnh → mặt nạ người (khác màu nền đo ở bốn góc), cỡ R×R. Đọc PNG bằng Blender (không cần PIL)."""
    img = bpy.data.images.load(path); W, H = img.size
    A = np.array(img.pixels[:]).reshape(H, W, 4)[::-1, :, :3]          # Blender: hàng dưới trước → lật về trên-trái
    bpy.data.images.remove(img)
    yi = (np.arange(R) * H / R).astype(int); xi = (np.arange(R) * W / R).astype(int)
    A = A[yi][:, xi]
    bg = np.median(np.concatenate([A[:20, :20].reshape(-1, 3), A[:20, -20:].reshape(-1, 3)]), 0)
    return np.linalg.norm(A - bg, axis=2) > 0.06


def edge_left(m):
    """Mép trái của người theo từng hàng (mũi chỉ sang trái ở góc 90); hàng trống = nan."""
    has = m.any(1)
    return np.where(has, m.argmax(1).astype(float), np.nan)


def bounded_lsq(A, b, lam, it=3000):
    """min |A w - b|² + lam |w|², 0 ≤ w ≤ 1 (chiếu gradient)."""
    w = np.zeros(A.shape[1]); L = np.linalg.norm(A, 2) ** 2 + lam
    for _ in range(it):
        w = np.clip(w - (A.T @ (A @ w - b) + lam * w) / L, 0, 1)
    return w


def _scatter(v, allow):
    w = np.zeros(len(allow)); w[allow] = v
    return w


def khop(pdir, chuan, loai, lam, vong):
    """Khớp thanh trượt vùng `loai` cho ảnh mẫu <pdir>/ref/view_{0,90}.png → <pdir>/part.json."""
    L = LOAI[loai]; cam = load_cam(chuan)
    body = make_head()
    P0, names, D = target_deltas(body, L["dir"])
    moved = np.abs(D).max((0, 2)) > 1e-4                              # đỉnh vùng này (thanh nào cũng có thể dời)
    lm_c = json.load(open(os.path.join(chuan, "lm.json")))["view_0.png"]
    lm_r = json.load(open(os.path.join(pdir, "ref", "lm.json")))["view_0.png"]
    c0, c90 = cam["view_0.png"], cam["view_90.png"]; R = c0["R"]
    # 1. căn ảnh mẫu chính diện về khung chuẩn bằng các điểm đứng yên (mắt, mày, hàm)
    keys = [k for k in L["co_dinh"] if k in lm_c and k in lm_r]
    s, Rm, t = similarity(np.array([lm_r[k] for k in keys]), np.array([lm_c[k] for k in keys]))
    ref_pt = lambda k: s * Rm @ np.array(lm_r[k]) + t
    # 2. điểm mốc vùng ↔ đỉnh lưới: đỉnh gần nhất trên ảnh chuẩn, lấy đỉnh nằm trước nhất (y nhỏ = gần máy, mặt hướng -Y)
    X0 = proj(P0, c0); cand = np.where(moved)[0]
    pairs = []
    for k in lm_c:
        if not L["lm"](k) or k not in lm_r:
            continue
        dist = np.linalg.norm(X0[cand] - lm_c[k], axis=1)
        near = cand[dist < max(2.5, dist.min() + 0.5)]
        pairs.append((k, near[np.argmin(P0[near, 1])]))
    # 3. góc nghiêng 90: mép trái (đường nghiêng mũi) ảnh mẫu vs đường giữa lưới (|x| ≈ 0) trong dải mũi
    m_r = mask(os.path.join(pdir, "ref", "view_90.png"), R); m_c = mask(os.path.join(chuan, "view_90.png"), R)
    e_r, e_c = edge_left(m_r), edge_left(m_c)
    mid = np.where(moved & (np.abs(P0[:, 0]) < 1e-3))[0]
    Xc = proj(P0[mid], c90)                                           # chỉ đỉnh nằm ĐÚNG trên đường nghiêng của đầu chuẩn
    on = [j for j, (x, y) in enumerate(Xc) if 0 <= round(y) < R and not np.isnan(e_c[int(round(y))])
          and abs(x - e_c[int(round(y))]) < 3]                       # (bỏ trụ mũi, lòng lỗ mũi, nhân trung khuất phía sau)
    mid = mid[on]
    yr = proj(P0[mid], c90)[:, 1]; band = (int(yr.min()) - 6, int(yr.max()) + 6)
    out_rows = [y for y in range(R) if (y < band[0] - 15 or y > band[1] + 15) and not np.isnan(e_r[y]) and not np.isnan(e_c[y])
                and abs(y - (band[0] + band[1]) / 2) < 160]
    dx90 = float(np.median([e_r[y] - e_c[y] for y in out_rows])) if out_rows else 0.0   # lệch ngang của ảnh mẫu
    w = np.zeros(len(names))
    allow = np.ones(len(names), bool)
    for vg in range(vong):
        if vg == vong // 2:                                           # mỗi cặp incr/decr chỉ giữ một chiều (chiều lớn hơn)
            for i, n in enumerate(names):
                for a_, b_ in (("incr", "decr"), ("up", "down"), ("in", "out"), ("forward", "backward"),
                               ("concave", "convex"), ("compress", "uncompress")):
                    if n.endswith("-" + a_):
                        j = names.index(n[: -len(a_)] + b_) if n[: -len(a_)] + b_ in names else None
                        if j is not None:
                            allow[j if w[i] >= w[j] else i] = False
            w = w * allow
        P = P0 + np.tensordot(w, D, 1)
        rows, cols = [], []
        X = proj(P, c0)
        for k, v in pairs:                                            # chính diện: 2 phương trình mỗi điểm
            J = np.stack([proj(P[v][None] + D[:, v], c0)[:, i] - X[v, i] for i in (0, 1)])
            r = ref_pt(k) - X[v]
            for i in (0, 1):
                rows.append(J[i]); cols.append(r[i])
        Xm = proj(P[mid], c90)
        Jm = proj(P[mid][None] + D[:, mid], c90)[..., 0] - Xm[:, 0]    # [thanh, đỉnh]: đỉnh dời ngang bao nhiêu px
        for j, (x, y) in enumerate(Xm):
            yy = int(round(y))
            if 0 <= yy < R and not np.isnan(e_r[yy]):
                rows.append(Jm[:, j] * 2); cols.append((e_r[yy] - dx90 - x) * 2)   # góc nghiêng nặng gấp đôi
        A, b = np.array(rows), np.array(cols)
        bb = b + A @ w                                                # tuyến tính quanh w hiện tại: A·w_mới ≈ bb
        w = bounded_lsq(A[:, allow], bb, lam) if allow.all() else _scatter(bounded_lsq(A[:, allow], bb, lam), allow)
        print("VONG", round(float(np.sqrt(np.mean((A @ w - bb) ** 2))), 2), "px")
    P = P0 + np.tensordot(w, D, 1)
    err0 = float(np.mean([np.linalg.norm(ref_pt(k) - proj(P[v][None], c0)[0]) for k, v in pairs]))
    Xm = proj(P[mid], c90)
    e90 = [abs(e_r[int(round(y))] - dx90 - x) for x, y in Xm if 0 <= round(y) < R and not np.isnan(e_r[int(round(y))])]
    res = {"loai": loai, "targets": {f"{L['dir']}/{n}": round(float(x), 3) for n, x in zip(names, w) if x > 0.02},
           "sai_so_px": {"chinh_dien": round(err0, 2), "nghieng": round(float(np.mean(e90)), 2)},
           "can_anh": {"scale": round(float(s), 4), "lech_nghieng_px": round(dx90, 1)}}
    json.dump(res, open(os.path.join(pdir, "part.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("KHOP", json.dumps(res, ensure_ascii=False))


# ------------------------------------------------------------------------- khớp theo tấm bộ phận rời (05 §6a, 08)
# Tấm ChatGPT: CHỈ bộ phận, nền trong suốt, 4 góc một hàng cùng tỉ lệ: chính diện · 45° · 90° · từ dưới lên.
# Không có mặt để căn khung → chuẩn hoá theo chính bộ phận: đơn vị H = chiều cao mũi ở góc chính diện (gốc sống → đáy).
# Vậy chỉ khớp DÁNG; thanh cỡ/dời (scale-*, trans-*) để dành chọn theo từng nhân vật (08 §5).
GOC_TACH = ("0", "45", "90", "duoi")
TRONG_SO = {"0": 1.0, "45": 1.0, "90": 2.0, "duoi": 1.5}          # góc nghiêng giữ đường sống mũi → nặng nhất
CAP = (("incr", "decr"), ("up", "down"), ("in", "out"), ("forward", "backward"), ("concave", "convex"),
       ("compress", "uncompress"))


def load_rgba(path):
    img = bpy.data.images.load(path); W, H = img.size
    A = np.array(img.pixels[:]).reshape(H, W, 4)[::-1]               # Blender: hàng dưới trước → lật về trên-trái
    bpy.data.images.remove(img)
    return A


def save_rgba(A, path):
    H, W = A.shape[:2]
    img = bpy.data.images.new("o", W, H, alpha=True)
    img.pixels[:] = np.ascontiguousarray(A[::-1], dtype=np.float32).ravel()
    img.filepath_raw = path; img.file_format = "PNG"; img.save()
    bpy.data.images.remove(img)


def tach_tam(path, n=4, nguong=0.5):
    """Tấm nhiều góc → n cặp (mặt nạ, RGBA) cắt sát, trái → phải, tách theo cột trống của alpha (alpha > ngưỡng bỏ viền mờ)."""
    A = load_rgba(path); al = A[..., 3] > nguong
    cols = np.where(al.any(0))[0]
    segs, s0, p = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - p > 8:
            segs.append((s0, p)); s0 = c
        p = c
    segs.append((s0, p))
    segs = sorted(sorted(segs, key=lambda t: t[1] - t[0], reverse=True)[:n])   # bỏ vụn nhiễu
    if len(segs) != n:
        sys.exit(f"Tấm {path}: tách được {len(segs)} góc, cần {n}")
    out = []
    for a, b in segs:
        rows = np.where(al[:, a:b + 1].any(1))[0]
        out.append((al[rows.min():rows.max() + 1, a:b + 1], A[rows.min():rows.max() + 1, a:b + 1]))
    return out


def chieu_tach(P, goc):
    """Toạ độ 3D → 2D (x sang phải, y xuống) đúng hướng các góc trong tấm. Mặt hướng -Y, lên +Z."""
    if goc == "duoi":                                                 # nhìn từ dưới lên, đầu mũi (-Y) ở mép trên
        return np.stack([P[..., 0], P[..., 1]], -1)
    r = math.radians(int(goc)); d = np.array([math.sin(r), -math.cos(r), 0.0])
    right = np.cross(-d, [0, 0, 1])
    return np.stack([P @ right, -P[..., 2]], -1)


def mau_bien(Q, H, goc):
    """Điểm 2D → mẫu biên chuẩn hoá theo H (nan nếu hàng trống) + mốc (xa, y0) để vẽ.
    0: hai mép trái/phải nửa dưới (bề rộng cánh mũi), neo đáy + giữa. 45, 90: mép trái (đường sống → đầu → trụ mũi), neo
    đáy + đầu mũi. duoi: hai mép từ đầu mũi vào 60% sâu (viền cánh mũi), neo đầu mũi + giữa."""
    x, y = Q[:, 0], Q[:, 1]
    if goc == "duoi":
        y0, xa = y.min(), (x.min() + x.max()) / 2
        rows, sides = y0 + np.linspace(0.03, 0.6, 20) * H, "lr"
    elif goc == "0":
        y0, xa = y.max(), (x.min() + x.max()) / 2
        rows, sides = y0 - np.linspace(0.02, 0.45, 20) * H, "lr"
    else:
        y0, xa = y.max(), x.min()
        rows, sides = y0 - np.linspace(0.02, 0.95, 40) * H, "l"
    bw, out = 0.012 * H, []
    for r in rows:
        sel = np.abs(y - r) < bw
        if sel.sum() < 2:
            out += [np.nan] * len(sides); continue
        xs = x[sel]
        out += [((xs.min() if s == "l" else xs.max()) - xa) / H for s in sides]
    return np.array(out), (xa, y0)


def ve_bien(panels, path, C=300):
    """Ảnh so biên: mỗi góc một ô; ảnh mẫu xám, bản dựng đỏ — cùng chuẩn hoá nên trùng nhau là khớp."""
    img = np.zeros((C, C * len(panels), 4), np.float32); img[..., 3] = 1
    for i, items in enumerate(panels):
        for Q, (xa, y0), H, col, goc in items:
            u = (Q[:, 0] - xa) / H; v = (Q[:, 1] - y0) / H
            px = (u * C * 0.6 + (C * 0.5 if goc in ("0", "duoi") else C * 0.2)).astype(int)
            py = (v * C * 0.6 + (C * 0.15 if goc == "duoi" else C * 0.85)).astype(int)
            ok = (px >= 0) & (px < C) & (py >= 0) & (py < C)
            img[py[ok], i * C + px[ok], :3] = col
    save_rgba(img, path)


def khop_tach(pdir, tam, chuan, lam, vong, vung):
    """Khớp DÁNG mũi theo tấm 4 góc nền trong suốt → <pdir>/part.json, ref/view_<góc>.png, so-sanh-bien.png."""
    os.makedirs(os.path.join(pdir, "ref"), exist_ok=True)
    tach = tach_tam(tam)
    ref = {}
    for goc, (m, rgba) in zip(GOC_TACH, tach):
        save_rgba(rgba, os.path.join(pdir, "ref", f"view_{goc}.png"))
        yy, xx = np.nonzero(m[::2, ::2]); ref[goc] = np.stack([xx * 2.0, yy * 2.0], 1)
    H_ref = float(tach[0][0].shape[0])
    ref_mau = {g: mau_bien(ref[g], H_ref, g) for g in GOC_TACH}

    body = make_head()
    P0, names, D = target_deltas(body, "nose")
    # vùng mũi trên lưới = đỉnh mà thanh mũi dời ≥ `vung` × mức dời lớn nhất (thanh mũi kéo theo cả má quanh mũi một
    # chút — lấy hết thì bóng chính diện phình ra má), từ gốc sống mũi (điểm mốc 168 trên ảnh đầu chuẩn) trở xuống
    c0 = load_cam(chuan)["view_0.png"]
    lm168 = json.load(open(os.path.join(chuan, "lm.json")))["view_0.png"]["nose_168"]
    mv = np.linalg.norm(D, axis=2).max(0)
    X0 = proj(P0, c0)
    # + dải sống mũi (|x| < 6 mm) dời yếu hơn nhưng là đường nghiêng phía trên — thiếu thì góc 90 chỉ còn đầu mũi
    strong = np.where((mv >= vung * mv.max()) | ((mv >= 0.05 * mv.max()) & (np.abs(P0[:, 0]) < 0.006)))[0]
    near = strong[np.linalg.norm(X0[strong] - lm168, axis=1) < 6]
    z_goc = float(P0[near[np.argmin(P0[near, 1])], 2]) if len(near) else float(P0[strong, 2].max())
    vung_dinh = set(int(v) for v in strong if P0[v, 2] <= z_goc + 1e-4)
    # điểm mẫu = đỉnh vùng + tâm mặt (mặt có đủ đỉnh trong vùng) → bóng đặc hơn, vẫn tuyến tính theo thanh
    groups = [[v] for v in sorted(vung_dinh)] + [list(p.vertices) for p in body.data.polygons
                                                   if all(v in vung_dinh for v in p.vertices)]
    Wm = np.zeros((len(groups), len(P0)), np.float32)
    for i, g in enumerate(groups):
        Wm[i, g] = 1.0 / len(g)
    idx = np.where(Wm.any(0))[0]; Wm = Wm[:, idx]
    Pp0, Dp = Wm @ P0[idx], np.einsum("pv,kvc->kpc", Wm, D[:, idx])

    # biến: mỗi cặp thanh một số s ∈ [-1, 1] (s>0 → thanh đầu, s<0 → thanh kia). Bỏ dời (trans-*): vị trí theo nhân vật.
    # Giữ scale-horiz/depth/vert: chúng đổi TỈ LỆ (rộng/cao, sâu/cao) là dáng; cỡ đều đã bị chuẩn hoá theo H triệt tiêu.
    axes = []
    for i, n in enumerate(names):
        if "trans-" in n:
            continue
        for a_, b_ in CAP:
            if n.endswith("-" + a_) and n[: -len(a_)] + b_ in names:
                axes.append((n[: -len(a_)].rstrip("-"), i, names.index(n[: -len(a_)] + b_)))
    lone = [i for i, n in enumerate(names) if "trans-" not in n
            and not any(i in (a[1], a[2]) for a in axes)]
    axes += [(names[i], i, None) for i in lone]

    def weights(s):
        w = np.zeros(len(names))
        for (_, i, j), v in zip(axes, s):
            if v >= 0:
                w[i] = v
            elif j is not None:
                w[j] = -v
        return w

    def mau_model(s):
        P = Pp0 + np.tensordot(weights(s), Dp, 1)
        Q = {g: chieu_tach(P, g) for g in GOC_TACH}
        H = float(Q["0"][:, 1].max() - Q["0"][:, 1].min())
        return Q, H, {g: mau_bien(Q[g], H, g) for g in GOC_TACH}

    def loss(s):
        _, _, mm = mau_model(s)
        e = 0.0
        for g in GOC_TACH:
            d = mm[g][0] - ref_mau[g][0]
            e += TRONG_SO[g] * float(np.nanmean(d ** 2)) if np.isfinite(d).any() else 1.0
        return e + lam * float(np.sum(np.asarray(s) ** 2))

    s = np.zeros(len(axes)); best = loss(s); grid = np.round(np.arange(-1, 1.0001, 0.05), 2)
    print("BAT_DAU", round(best, 6), "dinh", len(vung_dinh), "truc", [a[0] for a in axes])
    for vg in range(vong):
        for k in range(len(axes)):
            for v in grid:
                t = s.copy(); t[k] = v; e = loss(t)
                if e < best - 1e-9:
                    best, s = e, t
        print("VONG", vg, round(best, 6))
    Q, H, mm = mau_model(s)
    w = weights(s)
    sai = {g: round(100 * float(np.nanmean(np.abs(mm[g][0] - ref_mau[g][0]))), 2) for g in GOC_TACH}
    res = {"loai": "mui", "kieu_khop": "tach", "targets": {f"nose/{n}": round(float(x), 3) for n, x in zip(names, w) if x > 0.02},
           "sai_so_phan_tram_H": sai, "nguon": os.path.relpath(tam, pdir)}
    json.dump(res, open(os.path.join(pdir, "part.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    ve_bien([[(ref[g], ref_mau[g][1], H_ref, (0.6, 0.6, 0.6), g), (Q[g], mm[g][1], H, (1, 0.15, 0.1), g)] for g in GOC_TACH],
            os.path.join(pdir, "so-sanh-bien.png"))
    print("KHOP", json.dumps(res, ensure_ascii=False))


# ------------------------------------------------------------------- tấm khuôn: Blender chụp riêng bộ phận (08 §2)
# ChatGPT sửa dáng NGAY TRÊN tấm khuôn này (chỉ bộ phận, nền trong suốt, giữ khung) → ảnh mẫu cùng khung với Blender,
# khớp không cần chuẩn hoá. Tấm vuông 2×2 (ChatGPT ra ảnh vuông sẵn): [chính diện | 45°] / [nghiêng 90° | từ dưới lên].
KHUON_GOC = ("0", "45", "90", "duoi")
KHUON_O = {"0": (0, 0), "45": (0, 1), "90": (1, 0), "duoi": (1, 1)}   # (hàng, cột) trong tấm


def khuon_truc(goc):
    """(hướng nhìn, lên, phải) của camera mỗi ô. Mặt hướng -Y, lên +Z. Từ dưới lên: đầu mũi (-Y) ở mép trên ảnh."""
    if goc == "duoi":
        fwd, up = np.array([0.0, 0, 1]), np.array([0.0, -1, 0])
    elif goc == "duoi45":                                             # từ dưới-trước chếch 45°: thấy lỗ mũi, vẫn dễ đọc
        c45 = math.sqrt(0.5); fwd, up = np.array([0.0, c45, c45]), np.array([0.0, -c45, c45])
    else:
        r = math.radians(int(goc)); fwd = -np.array([math.sin(r), -math.cos(r), 0.0]); up = np.array([0.0, 0, 1])
    return fwd, up, np.cross(up, -fwd)


def nose_vung(body, chuan, vung=0.2):
    """Đỉnh vùng mũi của đầu chuẩn: thanh mũi dời ≥ vung × lớn nhất, + dải sống mũi; từ gốc sống mũi trở xuống."""
    P0, names, D, alpha = nose_alpha(body, chuan, vung)
    return P0, names, D, sorted(int(v) for v in np.where(alpha >= 0.5)[0])


def nose_alpha(body, chuan, vung=0.2):
    """Độ đặc (0..1) từng đỉnh của vùng mũi — mép mờ dần như ChatGPT cắt bộ phận rời:
    theo mức dời của thanh mũi (≥ vung×max: đặc, mờ dần về 0,5×vung), dải sống mũi |x| < 6 mm; mờ dần trên gốc sống mũi
    (điểm mốc 168 của đầu chuẩn) và dưới đáy mũi (bỏ nhân trung, môi trên)."""
    P0, names, D = target_deltas(body, "nose")
    c0 = load_cam(chuan)["view_0.png"]
    lm168 = json.load(open(os.path.join(chuan, "lm.json")))["view_0.png"]["nose_168"]
    mv = np.linalg.norm(D, axis=2).max(0) / np.linalg.norm(D, axis=2).max(); X0 = proj(P0, c0)
    ramp = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1)
    a_mv = np.maximum(ramp(mv, 0.5 * vung, vung), ramp(mv, 0.02, 0.05) * (1 - ramp(np.abs(P0[:, 0]), 0.004, 0.007)))
    core = np.where(mv >= 2 * vung)[0]
    cand = np.where(a_mv > 0.5)[0]
    near = cand[np.linalg.norm(X0[cand] - lm168, axis=1) < 6]
    z_goc = float(P0[near[np.argmin(P0[near, 1])], 2]) if len(near) else float(P0[cand, 2].max())
    z_day = float(P0[core, 2].min())                                  # đáy cánh mũi / trụ mũi của lõi mũi
    alpha = a_mv * (1 - ramp(P0[:, 2], z_goc - 0.002, z_goc + 0.003)) * ramp(P0[:, 2], z_day - 0.003, z_day)
    # thanh mũi kéo theo một ít má, nếp mũi–má: cắt ngang ngoài cánh mũi + 1 mm, cắt sâu sau chân cánh mũi
    xw = float(np.abs(P0[core, 0]).max()) + 0.001; yb = float(P0[core, 1].max())
    alpha *= (1 - ramp(np.abs(P0[:, 0]), xw, xw + 0.004)) * (1 - ramp(P0[:, 1], yb, yb + 0.004))
    return P0, names, D, _tron(body, alpha)


def _tron(body, alpha, n=4):
    """Làm mượt alpha trên lưới (mức dời của thanh lổn nhổn theo đỉnh → mép răng cưa), rồi mờ về 0 TRƯỚC mép mặt lưới."""
    E = np.array([e.vertices[:] for e in body.data.edges])
    E = E[(E < len(alpha)).all(1)]                    # lưới phụ (helper) nằm sau 13380 đỉnh thân, modifier đã ẩn
    for _ in range(n):
        acc = np.zeros_like(alpha); cnt = np.zeros_like(alpha)
        np.add.at(acc, E[:, 0], alpha[E[:, 1]]); np.add.at(acc, E[:, 1], alpha[E[:, 0]])
        np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
        alpha = 0.5 * alpha + 0.5 * acc / np.maximum(cnt, 1)
    ramp = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1)
    return ramp(alpha, 0.15, 0.6)


# ------------------------------------------------------------------------------------------------------------------ mắt
# Mắt: một bên (mắt +X = bên phải ảnh chính diện, bên gần camera góc 45/90), đối xứng sang bên kia. Dáng mắt nằm ở KHE
# MỞ MÍ (lòng trắng + tròng lộ ra giữa hai mí), không ở mép bóng vùng như mũi: Blender tính khe = chỗ nhãn cầu không bị
# mí che (tô có chiều sâu); ảnh ChatGPT tách khe theo màu (lòng trắng/tròng khác da), học màu trên chính khuôn Blender.
def eye_alpha(body, chuan, vung=0.2):
    """Độ đặc từng đỉnh vùng mắt +X: theo mức dời của thanh mắt l-eye-* (bỏ trans-, scale- — dời cả vùng)."""
    P0, names, D = target_deltas(body, "eyes")
    sel = [i for i, n in enumerate(names) if n.startswith("l-") and "trans-" not in n and "scale-" not in n]
    mv = np.linalg.norm(D[sel], axis=2).max(0); mv = mv / mv.max()
    ramp = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1)
    alpha = ramp(mv, 0.5 * vung, vung) * (P0[:, 0] > 0); alpha[13380:] = 0      # lưới phụ helper quanh mắt: không phải da
    # thanh túi mắt kéo theo cả má, thanh khoé trong kéo sườn mũi → cắt elip quanh tâm nhãn cầu (ngang 25 mm, trên 17, dưới
    # 15 — đủ rộng để da che kín nhãn cầu, chỉ lộ khe mí)
    V = nhan_cau(body)[0]; c = V.mean(0)
    dz = P0[:, 2] - c[2]; e = np.hypot((P0[:, 0] - c[0]) / 0.025, dz / np.where(dz > 0, 0.017, 0.015))
    alpha *= 1 - ramp(e, 0.85, 1.0)
    # mặt trong hốc mắt (sau nhãn cầu): thanh mắt kéo theo nhưng không phải da nhìn thấy — góc 45/90 lộ ra thành mảng đỏ (da
    # mỏng bị đèn xuyên). Bỏ đỉnh KHÔNG nhìn thấy từ hướng nào phía trước (tia tới camera vướng da hoặc nhãn cầu)
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get(); Vs, Ps = [], []
    for o in (body, next(o for o in bpy.data.objects if o.name.startswith("Body.") and "high-poly" in o.name)):
        ev = o.evaluated_get(dg); m = ev.to_mesh(); base = len(Vs)
        Vs += [o.matrix_world @ v.co for v in m.vertices]
        Ps += [[base + i for i in p.vertices] for p in m.polygons if o is not body or max(p.vertices) < 13380]
        ev.to_mesh_clear()
    bvh = BVHTree.FromPolygons(Vs, Ps)
    huong = []
    for a_, tilt in ((0, 0), (45, 0), (90, 0), (0, 25), (0, -25), (45, 25), (45, -25), (20, 0), (70, 0)):
        r, t = math.radians(a_), math.radians(tilt)
        huong.append(Vector((math.sin(r) * math.cos(t), -math.cos(r) * math.cos(t), math.sin(t))))
    trong = np.zeros(len(P0), bool)
    for v in np.where(alpha > 0)[0]:
        p = Vector(tuple(P0[v]))
        trong[v] = all(bvh.ray_cast(p + h * 2e-4, h, 0.5)[0] is not None for h in huong)
    alpha[trong] = 0
    print("HOC_MAT bỏ", int(trong.sum()), "đỉnh mặt trong")
    return P0, names, D, _tron(body, alpha)


def nhan_cau(body, k=None, goc=("0", "45", "90")):
    """Nhãn cầu +X (proxy high-poly đã khớp theo thân): đỉnh thế giới, tam giác, chỉ số mặt giữ lại, + đỉnh helper quanh nó
    (để dời theo thanh). Có khuôn k: bỏ mặt nhãn cầu lọt ra NGOÀI bóng da vùng mắt ở bất kỳ góc nào (vùng da chỉ là một mảng
    mỏng, không che hông/sau nhãn cầu) — phần còn lại chỉ lộ qua khe mí."""
    ob = next(o for o in bpy.data.objects if o.name.startswith("Body.") and "high-poly" in o.name)
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); m = ev.to_mesh()
    V = np.array([ob.matrix_world @ v.co for v in m.vertices])
    cy = V[V[:, 0] > 0, 1].mean()                                     # nửa trước
    polys = [(p.index, list(p.vertices)) for p in m.polygons]
    ev.to_mesh_clear()
    polys = [(i, vs) for i, vs in polys if all(V[v, 0] > 0 and V[v, 1] < cy for v in vs)]
    if k is not None:
        P = body_coords(body); al = dict(zip(k["vung"], k["alpha"])); Rt = 256
        T = np.array([t for t in vung_tris_any(body, k["vung"]) if max(al.get(v, 0) for v in t) >= 0.5])
        A3 = np.array([[al.get(int(v), 0.0) for v in t] for t in T])
        for g in goc:
            sil = _lon_nhat(raster(khuon_px(P, k, g, Rt)[T], Rt, A3))
            ok = []
            for i, vs in polys:                                       # MỌI đỉnh của mặt trong bóng da (tâm mặt thì sót mẩu lòi ra)
                X = khuon_px(V[vs], k, g, Rt).astype(int)
                if ((X >= 0) & (X < Rt)).all() and sil[X[:, 1], X[:, 0]].all():
                    ok.append((i, vs))
            polys = ok
    F = []
    for _, vs in polys:
        F += [(vs[0], vs[i], vs[i + 1]) for i in range(1, len(vs) - 1)]
    Vx = V[V[:, 0] > 0]; c = (Vx.min(0) + Vx.max(0)) / 2; r = float(np.ptp(Vx, 0).max()) / 2   # tâm, bán kính cả nhãn cầu
    F = np.array(F); keep = np.unique(F); V = V[keep]; F = np.searchsorted(keep, F)
    P = body_coords(body)
    H = np.where((np.arange(len(P)) >= 13380) & (np.linalg.norm(P - c, axis=1) < 1.5 * r))[0]
    print("NHAN_CAU", len(V), "đỉnh", len(F), "tam giác, helper", len(H))
    return V, F, H, {i for i, _ in polys}


def afin(A, B):
    """M (3×4) bình phương tối thiểu sao cho [A 1] @ M.T ≈ B."""
    X = np.hstack([A, np.ones((len(A), 1))])
    return np.linalg.lstsq(X, B, rcond=None)[0].T


def raster_z(T2, Z3, R, A3=None):
    """Như raster nhưng giữ độ sâu gần nhất (Z: (P - tâm)·hướng nhìn, nhỏ = gần) → bản đồ sâu R×R (inf: trống)."""
    zb = np.full((R, R), np.inf)
    for n_, t in enumerate(T2):
        x0, y0 = np.floor(t.min(0)).astype(int); x1, y1 = np.ceil(t.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, R - 1), min(y1, R - 1)
        if x1 < x0 or y1 < y0:
            continue
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1] + 0.5
        (ax, ay), (bx, by), (cx, cy) = t
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9:
            continue
        l1 = ((by - cy) * (xx - cx) + (cx - bx) * (yy - cy)) / d
        l2 = ((cy - ay) * (xx - cx) + (ax - cx) * (yy - cy)) / d
        l3 = 1 - l1 - l2; ins = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
        if A3 is not None:
            a = A3[n_]; ins &= (l1 * a[0] + l2 * a[1] + l3 * a[2]) >= 0.5
        z = l1 * Z3[n_, 0] + l2 * Z3[n_, 1] + l3 * Z3[n_, 2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]; w = ins & (z < sub); sub[w] = z[w]
    return zb


def khe_mo(Pb, Tl, A3, Ve, Fe, k, g, R):
    """Khe mở mí ở góc g: điểm ảnh nhãn cầu gần camera hơn da vùng mắt."""
    fwd = khuon_truc(g)[0]; c = np.array(k["tam"])
    zb = raster_z(khuon_px(Pb, k, g, R)[Tl], ((Pb - c) @ fwd)[Tl], R, A3)
    ze = raster_z(khuon_px(Ve, k, g, R)[Fe], ((Ve - c) @ fwd)[Fe], R)
    return ze < zb


def _lon_nhat(m):
    """Giữ mảng liền lớn nhất (4 hướng) rồi lấp lỗ (đốm sáng trên tròng, đồng tử)."""
    H, W = m.shape; lab = np.zeros((H, W), int); best, bn = 0, 0; cur = 0
    for y0, x0 in zip(*np.where(m)):
        if lab[y0, x0]:
            continue
        cur += 1; st = [(y0, x0)]; lab[y0, x0] = cur; n = 0
        while st:
            y, x = st.pop(); n += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur; st.append((yy, xx))
        if n > bn:
            best, bn = cur, n
    m = lab == best if best else m
    out = np.zeros((H + 2, W + 2), bool); st = [(0, 0)]; out[0, 0] = True; mp = np.pad(m, 1)
    while st:                                                         # loang nền từ viền; chỗ không loang tới = trong khe
        y, x = st.pop()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < H + 2 and 0 <= xx < W + 2 and not out[yy, xx] and not mp[yy, xx]:
                out[yy, xx] = True; st.append((yy, xx))
    return ~out[1:-1, 1:-1]


def _dac_trung(A):
    r, g, b = A[..., 0], A[..., 1], A[..., 2]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    return np.stack([np.ones_like(r), r, g, b, r * r, g * g, b * b, r * g, r * b, g * b, mx - mn, (mx - mn) / (mx + 1e-3),
                     r - g, g - b], -1)


def hoc_mau(imgs, labs):
    """Hồi quy logistic (đặc trưng màu bậc 2) phân biệt khe mắt / da, học trên ảnh khuôn Blender + khe tính từ lưới."""
    X = np.concatenate([_dac_trung(A[A[..., 3] > 0.5]) for A in imgs])
    y = np.concatenate([l[A[..., 3] > 0.5] for A, l in zip(imgs, labs)]).astype(float)
    mu, sd = X.mean(0), X.std(0) + 1e-6; mu[0], sd[0] = 0, 1; Xn = (X - mu) / sd
    w = np.zeros(X.shape[1]); wt = np.where(y > 0, 0.5 / max(y.mean(), 1e-3), 0.5 / max(1 - y.mean(), 1e-3))
    for _ in range(1500):
        p = 1 / (1 + np.exp(-Xn @ w)); w -= 0.5 * (Xn.T @ ((p - y) * wt)) / len(y)
    acc = float(((1 / (1 + np.exp(-Xn @ w)) > 0.5) == (y > 0)).mean())
    print("HOC_MAU dung", round(acc, 4), "ti_le_khe", round(float(y.mean()), 3))
    return mu, sd, w


def tach_khe(A, mau):
    mu, sd, w = mau
    p = 1 / (1 + np.exp(-((_dac_trung(A) - mu) / sd) @ w))
    return _lon_nhat((p > 0.5) & (A[..., 3] > 0.5))


def bien_khe(m):
    """Mép khe mở mí: mí trên + mí dưới theo từng cột (khoé mắt hiện ra ở cột đầu/cuối có khe). Thêm mép trái/phải theo
    hàng đã thử: số đo nhiễu hơn ở hai khoé, không giúp khớp góc nghiêng."""
    t, b = _mep(m.T)
    return np.concatenate([t, b])


def khop_mat(pdir, refs, kjson, lam, vong, R, tu_part=None, gioi_han=1.5, tu_do=0, mu=1.0):
    """Khớp thanh mắt (một bên, đối xứng) theo ảnh ChatGPT sửa trên khuôn mắt → <pdir>/part.json + so-sanh-khuon.png."""
    k = json.load(open(kjson)); kdir = os.path.dirname(kjson)
    body = make_head()
    for md in body.modifiers:                                         # hiện lưới phụ helper (nhãn cầu bám theo helper mắt)
        if md.type == "MASK":
            md.show_viewport = False
    P0, names, D = target_deltas(body, "eyes")
    Ve0, Fe, H, _ = nhan_cau(body, k)
    al = dict(zip(k["vung"], k["alpha"]))
    T = np.array([t for t in vung_tris_any(body, k["vung"]) if max(al.get(v, 0) for v in t) >= 0.5])
    used = np.unique(T); Tl = np.searchsorted(used, T)
    A3 = np.array([[al.get(int(v), 0.0) for v in t] for t in T])
    li = [i for i, n in enumerate(names) if n.startswith("l-") and "trans-" not in n]
    ln = [names[i][2:] for i in li]
    axes = []
    for n in ln:
        for a_, b_ in CAP:
            if n.endswith("-" + a_) and n[: -len(a_)] + b_ in ln:
                axes.append((n[: -len(a_)].rstrip("-"), li[ln.index(n)], li[ln.index(n[: -len(a_)] + b_)]))
    axes += [(names[i][2:], i, None) for i in li if not any(i in (a[1], a[2]) for a in axes)]
    Pu0, Du, Ph0, Dh = P0[used], D[:, used], P0[H], D[:, H]

    def weights(s):
        w = np.zeros(len(names))
        for (_, i, j), v in zip(axes, s):
            if v >= 0:
                w[i] = v
            elif j is not None:
                w[j] = -v
        return w

    dd = np.zeros((len(used), 3))                                     # tinh chỉnh từng đỉnh (đã có từ --tu-part + vừa nắn)

    def hinh(s):
        w = weights(s)
        M = afin(Ph0, Ph0 + np.tensordot(w, Dh, 1))
        return Pu0 + np.tensordot(w, Du, 1) + dd, np.hstack([Ve0, np.ones((len(Ve0), 1))]) @ M.T

    def khe(s, goc):
        Pb, Ve = hinh(s)
        return {g: khe_mo(Pb, Tl, A3, Ve, Fe, k, g, R) for g in goc}

    def thu(A, n):
        Hh, W = A.shape[:2]
        return A[(np.arange(n) * Hh / n).astype(int)][:, (np.arange(n) * W / n).astype(int)].copy()
    # học màu khe/da trên khuôn Blender của đầu chuẩn
    GK = [g for g in KHUON_GOC_MAT if os.path.exists(os.path.join(kdir, f"{g}.png"))]
    lab0 = khe(np.zeros(len(axes)), GK)
    img0 = {g: thu(load_rgba(os.path.join(kdir, f"{g}.png")), R) for g in GK}
    mau = hoc_mau([img0[g] for g in GK], [lab0[g] for g in GK])
    # chênh hệ thống ảnh render ↔ tô lưới (mép alpha, khử nhiễu, tách màu): đo trên chính khuôn, trừ khỏi mép ảnh mẫu
    lech0 = {}
    for g in GK:
        d0_ = bien_khe(tach_khe(img0[g], mau)) - bien_khe(lab0[g])
        lech0[g] = np.where(np.isfinite(d0_), d0_, 0.0)
        print("LECH_KHUON", g, round(float(np.abs(lech0[g]).mean()), 2), "px")
    ref, ref_a = {}, {}
    for g, p in (x.split("=", 1) for x in refs.split(",")):
        A = thu(load_rgba(p), R)
        if A[..., 3].min() > 0.99:                                    # mất alpha: tách nền theo màu 4 góc
            bg = np.median(np.concatenate([A[:4, :4, :3].reshape(-1, 3), A[-4:, -4:, :3].reshape(-1, 3),
                                           A[:4, -4:, :3].reshape(-1, 3), A[-4:, :4, :3].reshape(-1, 3)]), 0)
            A[..., 3] = (np.linalg.norm(A[..., :3] - bg, axis=2) > 0.08).astype(np.float32)
            print("KHONG_ALPHA: tách nền theo màu góc", np.round(bg, 2))
        ref[g] = tach_khe(A, mau); ref_a[g] = A[..., 3] > 0.5
    GOC = tuple(ref); ref_b = {g: bien_khe(ref[g]) - lech0.get(g, 0.0) for g in GOC}

    def _nt(Q):
        n = np.cross(Q[Tl[:, 1]] - Q[Tl[:, 0]], Q[Tl[:, 2]] - Q[Tl[:, 0]])
        return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    n0 = _nt(Pu0)

    def loss(s):
        e = 0.0
        for g, m in khe(s, GOC).items():
            b, r = bien_khe(m), ref_b[g]
            both = np.isfinite(b) & np.isfinite(r); one = np.isfinite(b) ^ np.isfinite(r)
            e += float(np.sum((b[both] - r[both]) ** 2) + one.sum() * 64) / max(1, both.sum() + one.sum())
        gap = int(((n0 * _nt(hinh(s)[0])).sum(1) < 0.5).sum())        # mí sụp gập khi kéo thanh quá xa → phạt nặng
        return e / len(GOC) + lam * float(np.sum(np.asarray(s) ** 2)) + 30.0 * gap

    s = np.zeros(len(axes))
    if tu_part:
        tp = json.load(open(tu_part, encoding="utf-8")); tg = tp["targets"]
        ui = {int(v): n for n, v in enumerate(used)}
        for v, off in tp.get("dinh", {}).items():                     # chỉ bên +X (bên kia là bản soi gương)
            if int(v) in ui:
                dd[ui[int(v)]] = off
        for kx, (_, i, j) in enumerate(axes):
            if f"eyes/{names[i]}" in tg:
                s[kx] = tg[f"eyes/{names[i]}"]
            elif j is not None and f"eyes/{names[j]}" in tg:
                s[kx] = -tg[f"eyes/{names[j]}"]
    # cổng lệch khung: bóng vùng ảnh mẫu so với bóng vùng bản dựng đang có (= ảnh đã gửi)
    cong = {}
    Pb, _ = hinh(s)
    for g in GOC:
        m = raster(khuon_px(Pb, k, g, R)[Tl], R, A3); rr = ref_a[g]
        ys_m, ys_r = np.where(m.any(1))[0], np.where(rr.any(1))[0]; h = max(1, ys_m.max() - ys_m.min())
        cong[g] = {"iou": round(float((m & rr).sum() / max((m | rr).sum(), 1)), 3),
                   "lech_tren_%": round(100 * float(ys_r.min() - ys_m.min()) / h, 1),
                   "lech_duoi_%": round(100 * float(ys_r.max() - ys_m.max()) / h, 1)}
        cong[g]["dat"] = bool(cong[g]["iou"] >= 0.75 and abs(cong[g]["lech_tren_%"]) <= 4 and abs(cong[g]["lech_duoi_%"]) <= 8)
    print("CONG", json.dumps(cong))
    best = loss(s)
    print("BAT_DAU", round(best, 3), "px²", "truc", len(axes), [a[0] for a in axes], "goc", GOC)
    for vg, step in zip(range(vong), (0.1, 0.05, 0.025, 0.025)):
        grid = np.round(np.arange(-gioi_han, gioi_han + 1e-4, step), 3)   # > 1: ngoại suy thanh (mắt xếch/to hơn thanh gốc)
        for kx in range(len(axes)):
            for v in grid:
                t = s.copy(); t[kx] = v; e = loss(t)
                if e < best - 1e-9:
                    best, s = e, t
        print("VONG", vg, round(best, 3))
    if tu_do:                                                         # nắn từng đỉnh mép mí theo khe (thanh không tạo được dáng)
        Pc0, Ve_s = hinh(s)

        def bien_fn(Pc, g):                                           # cùng thứ tự với bien_khe: mí trên, mí dưới theo cột
            t, b = _mep(khe_mo(Pc, Tl, A3, Ve_s, Fe, k, g, R).T); n = np.arange(R)
            return np.concatenate([t, b]), np.concatenate([np.stack([n, t], 1), np.stack([n, b], 1)]), np.ones(2 * R, int)
        dd += tinh_chinh(Pc0, used, Tl, A3, al, body, k, ref_b, None, GOC, R, tu_do, mu, bien_fn=bien_fn, doi_xung=False)
    if np.abs(dd).max() > 0:                                          # gỡ gập (như mũi): làm trơn độ dời quanh tam giác gập,
        nbu = [set() for _ in used]                                   # kéo dần về hình thanh trượt
        for t in Tl:
            for i in t:
                nbu[i].update(int(j) for j in t if j != i)
        for vg in range(150):                                         # nhẹ tay: chỉ quanh chỗ gập; 15 vòng đầu chỉ làm trơn,
            bad = np.where((n0 * _nt(hinh(s)[0])).sum(1) < 0.5)[0]   # sau đó mới co dần độ dời (co mạnh = mất phần nắn)
            if not len(bad):
                break
            vs = set(int(i) for i in Tl[bad].ravel())
            co = 1.0 if vg < 15 else 0.92 if vg < 60 else 0.8
            for i in vs:
                if nbu[i]:
                    dd[i] = co * (0.5 * dd[i] + 0.5 * dd[list(nbu[i])].mean(0))
        print("GO_GAP", vg, "vòng, còn", int(((n0 * _nt(hinh(s)[0])).sum(1) < 0.5).sum()))
    Pe, _ = hinh(s)

    def _n(Q):
        n = np.cross(Q[Tl[:, 1]] - Q[Tl[:, 0]], Q[Tl[:, 2]] - Q[Tl[:, 0]])
        return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    cos = (_n(Pu0) * _n(Pe)).sum(1)
    lat = {"lat": int((cos < 0).sum()), "gap": int((cos < 0.5).sum()), "dat": bool((cos < 0).sum() == 0 and (cos < 0.5).sum() <= 2)}
    print("MAT_LAT", json.dumps(lat))
    mm = khe(s, GOC); sai = {}; sc_mm = k["S"] / R * 1000
    for g in GOC:
        b, r = bien_khe(mm[g]), ref_b[g]; both = np.isfinite(b) & np.isfinite(r)
        e_px = float(np.mean(np.abs(b[both] - r[both]))) if both.any() else 99.0
        sai[g] = {"lech_mep_px": round(e_px, 2), "lech_mep_mm": round(e_px * sc_mm, 2),
                  "iou": round(float((mm[g] & ref[g]).sum() / max((mm[g] | ref[g]).sum(), 1)), 3)}
    w = weights(s); tg = {}
    for n, x in zip(names, w):
        if x > 0.02:
            tg[f"eyes/{n}"] = round(float(x), 3); tg[f"eyes/r-{n[2:]}"] = round(float(x), 3)   # đối xứng sang mắt -X
    res = {"loai": "mat", "kieu_khop": "khe", "khung_px": R, "targets": tg, "sai_so": sai, "cong_khung": cong,
           "mat_lat": lat, "nguon": refs}
    if np.abs(dd).max() > 2e-6:                                       # + bản soi gương sang mắt -X (đỉnh gần (-x, y, z) nhất)
        Pt = P0[:13380]; dinh = {}
        for v, dv in zip(used, dd):
            if np.abs(dv).max() > 2e-6:
                q = P0[v] * np.array([-1, 1, 1]); vm = int(np.argmin(np.linalg.norm(Pt - q, axis=1)))
                dinh[str(int(v))] = [round(float(c), 6) for c in dv]
                dinh[str(vm)] = [round(float(-dv[0]), 6), round(float(dv[1]), 6), round(float(dv[2]), 6)]
        res["dinh"] = dinh
    json.dump(res, open(os.path.join(pdir, "part.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    img = np.zeros((R, R * len(GOC), 4), np.float32); img[..., 3] = 1
    for n, g in enumerate(GOC):
        o = img[:, n * R:(n + 1) * R]
        o[ref_a[g], :3] = 0.25; o[ref[g], :3] = 0.6                  # vùng mẫu: xám tối; khe mẫu: xám sáng; khe dựng: viền đỏ
        m = mm[g]; edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        o[edge, :3] = (1, 0.15, 0.1)
    save_rgba(img, os.path.join(pdir, "so-sanh-khuon.png"))
    print("KHOP", json.dumps(res, ensure_ascii=False))


KHUON_GOC_MAT = ("0", "45", "90")


def vung_tris(body, vung):
    """Tam giác của các mặt nằm trọn trong vùng (tứ giác → 2 tam giác)."""
    s = set(vung); T = []
    for p in body.data.polygons:
        vs = list(p.vertices)
        if all(v in s for v in vs):
            T += [(vs[0], vs[i], vs[i + 1]) for i in range(1, len(vs) - 1)]
    return np.array(T)


def vung_tris_any(body, vung):
    """Tam giác của mọi mặt có ít nhất một đỉnh trong vùng (đỉnh ngoài vùng: alpha 0) — như mặt được giữ khi chụp khuôn."""
    s = set(vung); T = []
    for p in body.data.polygons:
        vs = list(p.vertices)
        if any(v in s for v in vs) and max(vs) < 13380:
            T += [(vs[0], vs[i], vs[i + 1]) for i in range(1, len(vs) - 1)]
    return np.array(T)


def khuon_px(P, k, goc, R):
    """Toạ độ 3D → pixel trong ô R×R của góc `goc` (gốc trên-trái)."""
    fwd, up, right = khuon_truc(goc); c = np.array(k["tam"])
    return np.stack([((P - c) @ right) / k["S"] * R + R / 2, R / 2 - ((P - c) @ up) / k["S"] * R], -1)


def raster(T2, R, A3=None):
    """Tô các tam giác 2D (n, 3, 2) lên mặt nạ R×R. A3 (n, 3): alpha ở 3 đỉnh → chỉ tô chỗ alpha nội suy ≥ 0,5
    (đúng như ảnh Blender chụp: mép mờ, bóng lấy ở alpha 0,5)."""
    m = np.zeros((R, R), bool)
    for n_, t in enumerate(T2):
        x0, y0 = np.floor(t.min(0)).astype(int); x1, y1 = np.ceil(t.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, R - 1), min(y1, R - 1)
        if x1 < x0 or y1 < y0:
            continue
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1] + 0.5
        (ax, ay), (bx, by), (cx, cy) = t
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9:
            continue
        l1 = ((by - cy) * (xx - cx) + (cx - bx) * (yy - cy)) / d
        l2 = ((cy - ay) * (xx - cx) + (ax - cx) * (yy - cy)) / d
        ins = (l1 >= 0) & (l2 >= 0) & (1 - l1 - l2 >= 0)
        if A3 is not None:
            a = A3[n_]; ins &= (l1 * a[0] + l2 * a[1] + (1 - l1 - l2) * a[2]) >= 0.5
        m[y0:y1 + 1, x0:x1 + 1] |= ins
    return m


def khuon(outdir, chuan, kjson, R, goc=KHUON_GOC, tung=False, sac=False, loai="nose"):
    """Chụp tấm khuôn 2×2 của riêng vùng mũi (nền trong suốt) → <ra>/khuon.png (+ khuon.json nếu là đầu chuẩn).
    tung: mỗi góc một ảnh <ra>/<góc>.png R×R (quy trình sửa từng góc, 08 §2). sac: mép sắc ở alpha 0,5 (không mờ) —
    ChatGPT nhận ảnh mép mờ hay phóng to cả vùng; mép sắc trùng đúng định nghĩa bóng lúc khớp."""
    body = bpy.data.objects["Body"]
    if kjson:                                                         # chụp lại theo đúng khuôn đã có (vùng, tâm, cỡ)
        k = json.load(open(kjson))
    else:                                                             # đầu chuẩn: tính vùng, tâm, cỡ khung rồi ghi lại
        P0, _, _, alpha = (eye_alpha if loai == "eyes" else nose_alpha)(body, chuan)
        vung = [int(v) for v in np.where(alpha > 0)[0]]               # cả phần mờ (để vẽ); bóng khớp = alpha ≥ 0,5
        Pv = P0[alpha > 0.1]; c = (Pv.min(0) + Pv.max(0)) / 2
        ext = max(float(np.ptp((Pv - c) @ ax)) for g in goc for ax in khuon_truc(g)[1:])
        k = {"loai": loai, "vung": vung, "alpha": [round(float(alpha[v]), 3) for v in vung], "tam": c.tolist(),
             "S": round(ext * 1.15, 5), "R": R, "o": KHUON_O}
    loai = k.get("loai", "nose")
    # vật mới = lưới đã tính shape key, chỉ giữ mặt trong vùng; mọi vật khác ẩn
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(body.evaluated_get(dg))
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    keep = set(k["vung"])
    al = dict(zip(k["vung"], k["alpha"]))                             # gán TRƯỚC khi xoá mặt (xoá xong chỉ số đỉnh đổi)
    lay = bm.verts.layers.float.new("mui_a")
    for v in bm.verts:
        v[lay] = al.get(v.index, 0.0)
    # giữ cả vòng mặt ngoài cùng (chỉ cần MỘT đỉnh có alpha > 0) → alpha nội suy về đúng 0 ở mép, không lộ cạnh mặt lưới
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not any(v.index in keep for v in f.verts)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("Mui", me); ob.matrix_world = body.matrix_world
    for mat in me.materials:                                          # mép mờ: trộn vật liệu da với trong suốt theo mui_a
        if mat is None or not mat.use_nodes:
            continue
        nt = mat.node_tree; out = nt.get_output_node("CYCLES")        # vật liệu MPFB có thể có nhiều nút ra
        if out is None or not out.inputs["Surface"].links:
            continue
        src = out.inputs["Surface"].links[0].from_socket
        mix = nt.nodes.new("ShaderNodeMixShader"); tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "mui_a"
        fac = at.outputs["Fac"]
        if sac:
            gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.5
            nt.links.new(fac, gt.inputs[0]); fac = gt.outputs[0]
        nt.links.new(fac, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(src, mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs["Surface"])
        print("ALPHA_MAT", mat.name)
    bpy.context.scene.collection.objects.link(ob); giu = {ob}
    if loai == "eyes":                                                # + nhãn cầu bên +X (mi, mày: thư viện riêng — ẩn)
        eo = next(o for o in bpy.data.objects if o.name.startswith("Body.") and "high-poly" in o.name)
        me2 = bpy.data.meshes.new_from_object(eo.evaluated_get(dg)); bm = bmesh.new(); bm.from_mesh(me2)
        Mw = eo.matrix_world; giu_mat = nhan_cau(body, k)[3]; bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in giu_mat], context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(me2); bm.free()
        ob2 = bpy.data.objects.new("NhanCau", me2); ob2.matrix_world = Mw
        bpy.context.scene.collection.objects.link(ob2); giu.add(ob2)
        # nhãn cầu màu khuôn: lòng trắng, tròng XANH LAM, con ngươi đen — khác hẳn da và bóng nâu khoé mắt, để tách khe trên
        # ảnh ChatGPT theo màu (màu tròng thật là thư viện riêng parts/eyes). Tròng = góc quanh trục nhìn (-Y) < 30°
        Ve = np.array([Mw @ v.co for v in eo.evaluated_get(dg).data.vertices]); Vx = Ve[Ve[:, 0] > 0]
        ce = (Vx.min(0) + Vx.max(0)) / 2
        mt = bpy.data.materials.new("khuon_nhan_cau"); mt.use_nodes = True; nt = mt.node_tree
        bsdf = nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 0.35
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        sub = nt.nodes.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = tuple(ce)
        nor = nt.nodes.new("ShaderNodeVectorMath"); nor.operation = "NORMALIZE"
        dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"; dot.inputs[1].default_value = (0, -1, 0)
        ramp = nt.nodes.new("ShaderNodeValToRGB"); cr = ramp.color_ramp; cr.interpolation = "CONSTANT"
        cr.elements[0].position = 0.0; cr.elements[0].color = (0.85, 0.85, 0.85, 1)
        cr.elements[1].position = math.cos(math.radians(30)); cr.elements[1].color = (0.05, 0.25, 0.9, 1)
        e3 = cr.elements.new(math.cos(math.radians(13))); e3.color = (0.01, 0.01, 0.01, 1)
        nt.links.new(geo.outputs["Position"], sub.inputs[0]); nt.links.new(sub.outputs[0], nor.inputs[0])
        nt.links.new(nor.outputs[0], dot.inputs[0]); nt.links.new(dot.outputs["Value"], ramp.inputs[0])
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        me2.materials.clear(); me2.materials.append(mt)
        for p in me2.polygons:
            p.material_index = 0
    for o in bpy.context.scene.objects:
        if o not in giu and o.type == "MESH":
            o.hide_render = True
    scene = bpy.context.scene
    gpu_cycles(scene, 64)
    scene.render.film_transparent = True; scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = scene.render.resolution_y = R
    w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.78, 0.8, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = k["S"]; scene.camera = cam
    # đèn đi theo camera (cùng một bố cục ở mọi ô, kể cả nhìn từ dưới lên): chính trên-trái, phụ phải, ven sau
    rig = []
    for name, energy, (a, b, cdist) in (("chinh", 2.8, (-0.6, 0.5, 0.8)), ("phu", 1.0, (0.8, -0.1, 0.8)), ("ven", 1.2, (0.2, 0.6, -0.8))):
        L = bpy.data.lights.new(name, "AREA"); L.energy = energy; L.size = 0.25
        lo = bpy.data.objects.new(name, L); scene.collection.objects.link(lo); rig.append((lo, (a, b, cdist)))
    c = np.array(k["tam"]); tam = np.zeros((2 * R, 2 * R, 4), np.float32)
    tmp = bpy.app.tempdir
    from mathutils import Matrix
    for g in goc:
        fwd, up, right = khuon_truc(g)
        M = Matrix((tuple(right), tuple(up), tuple(-fwd))).transposed().to_4x4()
        M.translation = Vector(tuple(c - fwd * 0.5)); cam.matrix_world = M
        for lo, (a, b, cd) in rig:                                    # vị trí đèn trong hệ camera → thế giới
            pos = c + right * a * 0.3 + up * b * 0.3 - fwd * cd * 0.3
            lo.location = Vector(tuple(pos))
            lo.rotation_euler = Vector(tuple(c - pos)).to_track_quat("-Z", "Y").to_euler()
        os.makedirs(outdir, exist_ok=True)
        p = os.path.join(outdir if tung else tmp, f"{g}.png" if tung else f"khuon_{g}.png"); scene.render.filepath = p
        render_anh()
        if not tung:
            r0, c0_ = KHUON_O[g]
            tam[r0 * R:(r0 + 1) * R, c0_ * R:(c0_ + 1) * R] = load_rgba(p)
    if not tung:
        save_rgba(tam, os.path.join(outdir, "khuon.png"))
    if not kjson:
        json.dump(k, open(os.path.join(outdir, "khuon.json"), "w"))
    print("KHUON", outdir, "S", k["S"], "dinh", len(k["vung"]))


def o_tam(A, g, R):
    """Cắt ô của góc g từ tấm 2×2 đã thu về 2R×2R."""
    r0, c0_ = KHUON_O[g]
    return A[r0 * R:(r0 + 1) * R, c0_ * R:(c0_ + 1) * R]


def _mep(M):
    has = M.any(1); n = M.shape[1]
    return np.where(has, M.argmax(1), np.nan), np.where(has, n - 1 - M[:, ::-1].argmax(1), np.nan)


def bien_diem(m, goc, rows):
    """Như bien_mask nhưng kèm vị trí pixel (x, y) của từng mẫu mép và trục đo (0: ngang, 1: dọc)."""
    l, r = _mep(m); H, W = m.shape; out = []

    def add(vals, idx, ax):
        pos = np.stack([vals, idx], 1) if ax == 0 else np.stack([idx, vals], 1)
        out.append((vals, pos, np.full(len(vals), ax)))
    if goc == "0":
        add(l[rows], rows, 0); add(r[rows], rows, 0)
    elif goc == "duoi45":                                             # rows = CỘT giữa: viền trên (chóp + cánh mũi nhìn từ dưới)
        t, _ = _mep(m.T); add(t[rows], rows, 1)
    elif goc in ("45", "90"):
        add(l, np.arange(H), 0)
    else:
        t, _ = _mep(m.T); add(t, np.arange(W), 1); add(l[rows], rows, 0); add(r[rows], rows, 0)
    return (np.concatenate([o[0] for o in out]), np.concatenate([o[1] for o in out]),
            np.concatenate([o[2] for o in out]))


def bien_mask(m, goc, rows):
    """Chỉ những mép mang DÁNG (mép cắt chỗ mũi giáp má/sống mũi do người vẽ tự chọn → bỏ):
    0: trái/phải ở `rows` (nửa dưới — bề rộng cánh mũi); 45, 90: mép trái mọi hàng (sống → đầu → trụ mũi);
    duoi45: mép TRÊN ở các cột giữa (`rows` = cột) — hai bên và đáy ảnh là mép cắt giáp má/môi, không mang dáng;
    duoi: mép trên theo cột (viền đầu + cánh mũi) + trái/phải ở `rows` (nửa trên)."""
    l, r = _mep(m)
    if goc == "0":
        return np.concatenate([l[rows], r[rows]])
    if goc == "duoi45":
        return _mep(m.T)[0][rows]
    if goc in ("45", "90"):
        return l
    t, _ = _mep(m.T)
    return np.concatenate([t, l[rows], r[rows]])


def tinh_chinh(P, used, Tl, A3, al, body, k, ref_b, rows, chi, R, vong, mu, nu=0.05, bien_fn=None, doi_xung=True):
    """Nắn từng đỉnh vùng mũi (alpha ≥ 0,3) cho mép bóng mọi góc trùng ảnh mẫu — Gauss–Newton:
    mỗi mẫu mép gán cho đỉnh lưới gần nhất (≤ 4 px) → phương trình (độ dời đỉnh · trục ảnh) = lệch px; cộng ràng buộc trơn
    Laplace (mu) và kìm độ dời (nu), giải bình phương tối thiểu, lặp `vong` lần. Mép vùng (alpha < 0,3) đứng yên."""
    sc = R / k["S"]
    a_u = np.array([al.get(int(v), 0.0) for v in used]); mov = np.where(a_u >= 0.3)[0]; nm = len(mov)
    loc = {int(i): n for n, i in enumerate(mov)}
    gi = {int(v): n for n, v in enumerate(used)}
    nb = [[] for _ in used]
    for e in body.data.edges:
        a, b = e.vertices
        if a in gi and b in gi:
            nb[gi[a]].append(gi[b]); nb[gi[b]].append(gi[a])
    # đối xứng: đỉnh ↔ đỉnh soi gương qua mặt phẳng giữa mặt (x → -x) — góc 45° chỉ thấy một bên, không ép thì mũi lệch
    # (bien_fn: mép do hàm ngoài tính — mắt: khe mở mí; doi_xung=False: vùng một bên, soi gương lúc ghi ra)
    if doi_xung:
        Pm = P.copy(); Pm[:, 0] *= -1
        gu = np.array([int(np.argmin(np.linalg.norm(P - q, axis=1))) for q in Pm])
    Mx = np.array([-1.0, 1.0, 1.0])
    d = np.zeros((len(used), 3)); best_e, best_d = np.inf, d.copy()
    for it in range(vong):
        Pc = P + d; rows_A, rhs = [], []
        tot = 0.0; cnt = 0
        for g in chi:
            fwd, up, right = khuon_truc(g)
            X = khuon_px(Pc, k, g, R)
            if bien_fn:
                vals, pos, ax = bien_fn(Pc, g)
            else:
                vals, pos, ax = bien_diem(raster(X[Tl], R, A3), g, rows[g])
            r = ref_b[g]
            ok = np.isfinite(vals) & np.isfinite(r)
            Xm = X[mov]
            for i in np.where(ok)[0]:
                dist = np.linalg.norm(Xm - pos[i], axis=1); js = np.where(dist < 5)[0]
                if not len(js):
                    continue
                wj = np.exp(-(dist[js] / 2.5) ** 2); wj /= wj.sum()      # chia cho vài đỉnh gần (mép trơn hơn một đỉnh)
                c = right * sc if ax[i] == 0 else -up * sc
                row = np.zeros(3 * nm)
                for j, wv in zip(js, wj):
                    row[3 * j:3 * j + 3] = c * wv
                rows_A.append(row); rhs.append(r[i] - vals[i]); tot += abs(r[i] - vals[i]); cnt += 1
        for n, i in enumerate(mov):                                   # trơn: đỉnh ≈ trung bình hàng xóm (đỉnh cố định: d = 0)
            if not nb[i]:
                continue
            lap = d[i] - d[nb[i]].mean(0)
            for c in range(3):
                row = np.zeros(3 * nm); row[3 * n + c] = mu * sc
                for q in nb[i]:
                    if q in loc:
                        row[3 * loc[q] + c] -= mu * sc / len(nb[i])
                rows_A.append(row); rhs.append(-mu * sc * lap[c])
        for n, i in enumerate(mov):                                   # kìm: không dời xa thanh trượt
            for c in range(3):
                row = np.zeros(3 * nm); row[3 * n + c] = nu * sc
                rows_A.append(row); rhs.append(-nu * sc * d[i, c])
        e_now = tot / max(cnt, 1)
        if e_now < best_e:
            best_e, best_d = e_now, d.copy()
        x = np.linalg.lstsq(np.array(rows_A), np.array(rhs), rcond=None)[0].reshape(nm, 3)
        d[mov] += 0.5 * x                                             # nửa bước: mép chọn lại đỉnh mỗi vòng → bước đủ dễ vọt
        if doi_xung:
            d = 0.5 * (d + d[gu] * Mx)                                # ép đối xứng trái–phải
        print("TU_DO", it, "lech_mep_tb", round(e_now, 2), "px", "doi_max_mm", round(float(np.abs(d).max()) * 1000, 2))
    print("TU_DO tot_nhat", round(best_e, 2), "px")
    return best_d


def khop_khuon(pdir, tam_path, kjson, lam, vong, R, chi=KHUON_GOC, tu_part=None, tu_do=0, mu=2.0):
    """Khớp thanh mũi theo tấm ChatGPT đã sửa trên khuôn (cùng khung) → <pdir>/part.json + so-sanh-khuon.png."""
    k = json.load(open(kjson))

    def thu(A, n):
        H, W = A.shape[:2]
        A = A[(np.arange(n) * H / n).astype(int)][:, (np.arange(n) * W / n).astype(int)].copy()
        if A[..., 3].min() > 0.99:                                    # ChatGPT đôi khi trả RGB nền đặc (mất alpha): tách theo màu 4 góc
            bg = np.median(np.concatenate([A[:8, :8, :3].reshape(-1, 3), A[:8, -8:, :3].reshape(-1, 3),
                                           A[-8:, :8, :3].reshape(-1, 3), A[-8:, -8:, :3].reshape(-1, 3)]), 0)
            A[..., 3] = (np.linalg.norm(A[..., :3] - bg, axis=2) > 0.08).astype(np.float32)
            print("KHONG_ALPHA: tách nền theo màu góc", np.round(bg, 2))
        return A
    if "=" in tam_path:                                               # từng góc: "90=a.png,0=b.png" (quy trình sửa từng góc)
        ref = {g: thu(load_rgba(p), R)[..., 3] > 0.5 for g, p in (x.split("=", 1) for x in tam_path.split(","))}
    else:                                                             # tấm 2×2
        A = thu(load_rgba(tam_path), 2 * R)
        ref = {g: o_tam(A, g, R)[..., 3] > 0.5 for g in KHUON_GOC}
    GOC = tuple(ref); chi = tuple(g for g in chi if g in ref) or GOC        # không --chi: khớp mọi góc có ảnh mẫu
    rows = {}
    for g in GOC:                                                     # hàng dùng cho mép trái/phải, theo ảnh mẫu
        ys = np.where(ref[g].any(1))[0]; y0, y1 = int(ys.min()), int(ys.max())
        h = y1 - y0
        rows[g] = (np.arange(y0 + int(0.55 * h), y1 + 1) if g == "0"
                   # dưới-trước: chỉ viền trên ở 60% cột giữa (rows ở đây là CỘT; hai bên + đáy là mép cắt tự do)
                   else (lambda xs: np.arange(int(xs.min() + 0.2 * np.ptp(xs)), int(xs.max() - 0.2 * np.ptp(xs)) + 1))(
                       np.where(ref[g].any(0))[0]) if g == "duoi45"
                   else np.arange(y0, y0 + int(0.6 * h) + 1))
    ref_b = {g: bien_mask(ref[g], g, rows[g]) for g in GOC}
    body = make_head()
    P0, names, D = target_deltas(body, "nose")
    al = dict(zip(k["vung"], k["alpha"]))                            # mọi mặt có đỉnh trong vùng, alpha nội suy như ảnh
    T = np.array([t for t in vung_tris_any(body, k["vung"]) if max(al.get(v, 0) for v in t) >= 0.5])
    used = np.unique(T); Tl = np.searchsorted(used, T)
    A3 = np.array([[al.get(int(v), 0.0) for v in t] for t in T])
    Pu0, Du = P0[used], D[:, used]
    axes = []
    for i, n in enumerate(names):
        if "trans-" in n:                                             # vị trí: theo nhân vật, không phải dáng
            continue
        for a_, b_ in CAP:
            if n.endswith("-" + a_) and n[: -len(a_)] + b_ in names:
                axes.append((n[: -len(a_)].rstrip("-"), i, names.index(n[: -len(a_)] + b_)))
    axes += [(names[i], i, None) for i, n in enumerate(names) if "trans-" not in n
             and not any(i in (a[1], a[2]) for a in axes)]

    def weights(s):
        w = np.zeros(len(names))
        for (_, i, j), v in zip(axes, s):
            if v >= 0:
                w[i] = v
            elif j is not None:
                w[j] = -v
        return w

    def masks(s):
        P = Pu0 + np.tensordot(weights(s), Du, 1)
        return {g: raster(khuon_px(P, k, g, R)[Tl], R, A3) for g in GOC}

    def loss(s):
        e = 0.0
        for g, m in masks(s).items():
            if g not in chi:                                          # --chi: chỉ khớp theo vài góc (chẩn đoán)
                continue
            b = bien_mask(m, g, rows[g]); r = ref_b[g]
            both = np.isfinite(b) & np.isfinite(r); one = np.isfinite(b) ^ np.isfinite(r)
            e += float(np.sum((b[both] - r[both]) ** 2) + one.sum() * 64) / max(1, both.sum() + one.sum())
        return e / len(chi) + lam * float(np.sum(np.asarray(s) ** 2))

    s = np.zeros(len(axes))
    d0 = np.zeros((len(used), 3))
    if tu_part:                                                       # bắt đầu từ thanh đã khớp (bỏ dò lại ~5 phút)
        tp = json.load(open(tu_part, encoding="utf-8")); tg = tp["targets"]
        ui = {int(v): n for n, v in enumerate(used)}
        for v, off in tp.get("dinh", {}).items():                     # + tinh chỉnh đỉnh đã có
            if int(v) in ui:
                d0[ui[int(v)]] = off
        Pu0 = Pu0 + d0
        for kx, (_, i, j) in enumerate(axes):
            if f"nose/{names[i]}" in tg:
                s[kx] = tg[f"nose/{names[i]}"]
            elif j is not None and f"nose/{names[j]}" in tg:
                s[kx] = -tg[f"nose/{names[j]}"]
        vong = 0
    best = loss(s)
    print("BAT_DAU", round(best, 3), "px²", "truc", len(axes), "tam_giac", len(T), "goc", GOC)
    # cổng lệch khung: ảnh mẫu so với chính bản dựng đang có (= ảnh đã gửi ChatGPT) — vùng bộ phận không được phình/dịch
    cong = {}
    for g, m in masks(s).items():
        ys_m, ys_r = np.where(m.any(1))[0], np.where(ref[g].any(1))[0]; h = max(1, ys_m.max() - ys_m.min())
        cong[g] = {"iou": round(float((m & ref[g]).sum() / max((m | ref[g]).sum(), 1)), 3),
                   "lech_tren_%": round(100 * float(ys_r.min() - ys_m.min()) / h, 1),
                   "lech_duoi_%": round(100 * float(ys_r.max() - ys_m.max()) / h, 1)}
        cong[g]["dat"] = bool(cong[g]["iou"] >= 0.75 and abs(cong[g]["lech_tren_%"]) <= 4 and abs(cong[g]["lech_duoi_%"]) <= 8)
    print("CONG", json.dumps(cong))
    for vg, step in zip(range(vong), (0.1, 0.05, 0.05, 0.025)):
        grid = np.round(np.arange(-1, 1.0001, step), 3)
        for kx in range(len(axes)):
            for v in grid:
                t = s.copy(); t[kx] = v; e = loss(t)
                if e < best - 1e-9:
                    best, s = e, t
        print("VONG", vg, round(best, 3))
    d = np.zeros((len(used), 3))
    if tu_do:
        d = tinh_chinh(Pu0 + np.tensordot(weights(s), Du, 1), used, Tl, A3, al, body, k, ref_b, rows, chi, R, tu_do, mu)
    P_end = Pu0 + np.tensordot(weights(s), Du, 1) + d

    def _cos(Q):
        def n_(X):
            n = np.cross(X[Tl[:, 1]] - X[Tl[:, 0]], X[Tl[:, 2]] - X[Tl[:, 0]])
            return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        return (n_(P0[used]) * n_(Q)).sum(1)
    if np.abs(d).max() > 0 or np.abs(d0).max() > 0:                   # gỡ gập: làm trơn TỔNG độ dời quanh tam giác gập
        P_sl = Pu0 - d0 + np.tensordot(weights(s), Du, 1)             # chỉ thanh trượt (hình sạch)
        d = d + d0                                                    # gỡ trên cả phần dời cũ (--tu-part); lưu lại trừ d0
        nbu = [set() for _ in used]
        for t in Tl:
            for i in t:
                nbu[i].update(int(j) for j in t if j != i)
        for vg in range(30):
            bad = np.where(_cos(P_sl + d) < 0.5)[0]
            if not len(bad):
                break
            vs = set(int(i) for i in Tl[bad].ravel())
            vs |= set(j for i in list(vs) for j in nbu[i])
            for _ in range(3):
                for i in vs:
                    if nbu[i]:
                        d[i] = 0.8 * (0.5 * d[i] + 0.5 * d[list(nbu[i])].mean(0))   # trơn + kéo dần về hình thanh trượt (sạch)
        print("GO_GAP", vg, "vòng, còn", int((_cos(P_sl + d) < 0.5).sum()))
        P_end = P_sl + d
        d = d - d0                                                    # phần ghi ra = d + d0 (xem "dinh" bên dưới)
    # cổng "mặt lật": tam giác đổi hướng pháp tuyến so với đầu chuẩn = lưới gập (vệt đen lạ dưới lỗ mũi) — số lệch mép
    # không bắt được lỗi này. lat: lật hẳn (> 90°); gap: xoay > 60°
    def _n(Q):
        n = np.cross(Q[Tl[:, 1]] - Q[Tl[:, 0]], Q[Tl[:, 2]] - Q[Tl[:, 0]])
        return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    cos = (_n(P0[used]) * _n(P_end)).sum(1)
    lat = {"lat": int((cos < 0).sum()), "gap": int((cos < 0.5).sum()), "dat": bool((cos < 0).sum() == 0 and (cos < 0.5).sum() <= 2)}
    print("MAT_LAT", json.dumps(lat))
    mm = {g: raster(khuon_px(P_end, k, g, R)[Tl], R, A3) for g in GOC}; sai = {}
    sc_mm = k["S"] / R * 1000                                         # px khung khớp → mm thật
    for g in GOC:
        b, r = bien_mask(mm[g], g, rows[g]), ref_b[g]; both = np.isfinite(b) & np.isfinite(r)
        inter, uni = (mm[g] & ref[g]).sum(), (mm[g] | ref[g]).sum()
        e_px = float(np.mean(np.abs(b[both] - r[both])))
        sai[g] = {"lech_mep_px": round(e_px, 2), "lech_mep_mm": round(e_px * sc_mm, 2), "iou": round(float(inter / max(uni, 1)), 3)}
    w = weights(s)
    res = {"loai": "mui", "kieu_khop": "khuon", "khung_px": R, "targets": {f"nose/{n}": round(float(x), 3)
           for n, x in zip(names, w) if x > 0.02}, "sai_so": sai, "cong_khung": cong, "mat_lat": lat, "nguon": tam_path}
    if tu_do or np.abs(d0).max() > 0:
        res["dinh"] = {str(int(v)): [round(float(c), 6) for c in dv] for v, dv in zip(used, d + d0) if np.abs(dv).max() > 2e-6}
    json.dump(res, open(os.path.join(pdir, "part.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    img = np.zeros((R, R * len(GOC), 4), np.float32); img[..., 3] = 1
    for n, g in enumerate(GOC):
        o = img[:, n * R:(n + 1) * R]
        o[ref[g], :3] = 0.55                                          # mẫu: xám; dựng: viền đỏ; trùng thì viền nằm trên mép xám
        m = mm[g]; edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        o[edge, :3] = (1, 0.15, 0.1)
    save_rgba(img, os.path.join(pdir, "so-sanh-khuon.png"))
    print("KHOP", json.dumps(res, ensure_ascii=False))


if MODE == "chup":
    parts = [argv[i + 1] for i, x in enumerate(argv) if x == "--part"]
    make_head(parts)
    chup(argv[1], [int(x) for x in opt("--views", "0,90").split(",")], int(opt("--R", 1024)), int(opt("--samples", 64)))
elif MODE == "khop":
    khop(argv[1], opt("--chuan", "assets/parts/_dau-chuan/v1"), opt("--loai", "mui"), float(opt("--lam", 30)),
         int(opt("--vong", 6)))
elif MODE == "khop-tach":
    khop_tach(argv[1], argv[2], opt("--chuan", "assets/parts/_dau-chuan/v1"), float(opt("--lam", 2e-5)),
              int(opt("--vong", 3)), float(opt("--vung", 0.2)))
elif MODE == "khuon":
    make_head([argv[i + 1] for i, x in enumerate(argv) if x == "--part"])
    khuon(argv[1], opt("--chuan", "assets/parts/_dau-chuan/v1"), opt("--khuon", None), int(opt("--R", 512)),
          tuple(opt("--goc", ",".join(KHUON_GOC)).split(",")), "--tung" in argv, "--sac" in argv, opt("--loai", "nose"))
elif MODE == "khop-mat":
    khop_mat(argv[1], argv[2], opt("--khuon", "assets/parts/eyeshape/_khuon/khuon.json"), float(opt("--lam", 0.5)),
             int(opt("--vong", 3)), int(opt("--R", 192)), opt("--tu-part", None), float(opt("--gioi-han", 1.5)),
             int(opt("--tu-do", 0)), float(opt("--mu", 1.0)))
elif MODE == "khop-khuon":
    khop_khuon(argv[1], argv[2], opt("--khuon", "assets/parts/nose/_khuon/khuon.json"), float(opt("--lam", 0.5)),
               int(opt("--vong", 3)), int(opt("--R", 192)), tuple(x for x in opt("--chi", "").split(",") if x),
               opt("--tu-part", None), int(opt("--tu-do", 0)), float(opt("--mu", 2.0)))
else:
    sys.exit(f"Không có chế độ '{MODE}' (chup | khop | khop-tach | khuon | khop-khuon | khop-mat)")
