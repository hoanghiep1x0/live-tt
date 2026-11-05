"""Nắn miệng theo ảnh sau khi bọc: trường dời mềm (RBF gauss) quanh điểm mốc môi, áp cho lưới gốc và tượng nguồn.

blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/face_nudge.py -- <ortho lưới bọc> <lm_photo.json> <ra.blend> \
    [--photo face-01-front.png] [--sigma 0.012] [--gain 1.0] [--sym]

- Tượng Hunyuan hay làm miệng hẹp, môi trên mỏng hơn ảnh; bọc sát tượng thì lưới gốc mang theo lỗi đó. Bước này đo điểm mốc
  môi (ortho lưới bọc, landmarks.py) so với ảnh (đặt chồng như compare_overlay.py), đổi ra độ dời x–z (mm) và nội suy mềm.
- Neo đứng yên: khoé mắt, đỉnh/đáy mắt, mũi, cánh mũi, cằm → mắt (đã chỉnh bằng eye-fit), mũi, cằm không xê dịch.
- Trường dời được áp cho Body (cả lưới phụ: răng, lưỡi đi theo) và HunyuanAligned (normal map nướng sau vẫn khớp), và lưu
  <ra>_nudge.json để bake_to_base.py --nudge áp cho đầu tô màu (màu môi đi theo môi mới).
- --sym: lấy đối xứng độ dời hai bên (trung bình, x lấy gương).
"""
import json
import os
import sys

import numpy as np

FIX = ["mouth_l", "mouth_r", "lip_top", "lip_bot", "lip_mid_top", "lip_mid_bot"] + \
      [f"lipo_top_{i}" for i in range(8)] + [f"lipo_bot_{i}" for i in range(8)]
ANCHOR = ["eye_l_in", "eye_l_out", "eye_r_in", "eye_r_out", "eye_l_top", "eye_l_bot", "eye_r_top", "eye_r_bot",
          "nose_tip", "nose_base", "nostril_l", "nostril_r", "chin"]
MIRROR = {"mouth_l": "mouth_r", **{f"lipo_top_{i}": f"lipo_top_{7 - i}" for i in range(8)},
          **{f"lipo_bot_{i}": f"lipo_bot_{7 - i}" for i in range(8)}}


def field_eval(P, field, chunk=100000):
    """Độ dời (m) tại các điểm P (n, 3) theo trường RBF đã lưu."""
    C = np.array(field["centers"]); W = np.array(field["weights"]); s2 = field["sigma"] ** 2
    out = np.zeros((len(P), 3))
    for i in range(0, len(P), chunk):
        d2 = ((P[i:i + chunk, None, :] - C[None]) ** 2).sum(-1)
        out[i:i + chunk] = np.exp(-d2 / s2) @ W
    return out


if __name__ == "__main__":
    import bpy
    from mathutils.bvhtree import BVHTree

    a = sys.argv[sys.argv.index("--") + 1:]
    odir, lmp_path, out = a[:3]
    opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    PH = opt("--photo", "face-01-front.png"); SIG = opt("--sigma", 0.012); GAIN = opt("--gain", 1.0)

    meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
    R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]
    M = {k: np.array(v) for k, v in json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"].items()}
    P = {k: np.array(v) for k, v in json.load(open(lmp_path))[PH].items()}
    keys = [k for k in M if k in P and not k.startswith(("lid_", "iris", "brow_", "lipo_"))]
    A = np.array([P[k] for k in keys]); B = np.array([M[k] for k in keys])       # ảnh → ortho (như compare_overlay)
    Am, Bm = A.mean(0), B.mean(0)
    U, S, Vt = np.linalg.svd((A - Am).T @ (B - Bm)); Rm = (U @ Vt).T; s = S.sum() / ((A - Am) ** 2).sum()
    f = lambda p: s * Rm @ (np.asarray(p) - Am) + Bm

    mm = sc / R                                                                  # m / px ortho
    disp = {k: np.array([(f(P[k]) - M[k])[0] * mm, -(f(P[k]) - M[k])[1] * mm]) * GAIN for k in FIX if k in M and k in P}
    if "--sym" in a:
        for k, k2 in MIRROR.items():
            if k in disp and k2 in disp:
                x = (disp[k][0] - disp[k2][0]) / 2; z = (disp[k][1] + disp[k2][1]) / 2
                disp[k] = np.array([x, z]); disp[k2] = np.array([-x, z])
        for k in ("lip_top", "lip_bot", "lip_mid_top", "lip_mid_bot"):          # điểm giữa: không dời ngang
            if k in disp:
                disp[k][0] = 0.0
    for k, d in disp.items():
        print(f"  {k:12s} dx {d[0] * 1000:+.2f} dz {d[1] * 1000:+.2f} mm")

    body = bpy.data.objects["Body"]
    for md in body.modifiers:
        md.show_viewport = False
    me = body.data
    co = np.array([v.co for v in me.vertices])
    helper = np.zeros(len(co), bool)
    for vg in body.vertex_groups:
        if vg.name.lower().startswith(("helper", "joint")):
            for v in me.vertices:
                if any(g.group == vg.index for g in v.groups):
                    helper[v.index] = True
    faces = [list(p.vertices) for p in me.polygons if not helper[list(p.vertices)].any()]
    bvh = BVHTree.FromPolygons([tuple(c) for c in co], faces)

    def hit(px):
        x = (px[0] - R / 2) / R * sc + cu; z = cv + (R / 2 - px[1]) / R * sc
        h = bvh.ray_cast((x, -1.0, z), (0, 1, 0))
        return np.array(h[0]) if h[0] is not None else None

    cen, val = [], []
    for k in list(disp) + ANCHOR:
        if k not in M:
            continue
        h = hit(M[k])
        if h is None:
            print("NO HIT", k); continue
        d = disp.get(k, np.zeros(2))
        cen.append(h); val.append([d[0], 0.0, d[1]])
    cen, val = np.array(cen), np.array(val)
    Phi = np.exp(-((cen[:, None] - cen[None]) ** 2).sum(-1) / SIG ** 2)
    W = np.linalg.solve(Phi + 0.05 * np.eye(len(cen)), val)
    field = {"centers": cen.tolist(), "weights": W.tolist(), "sigma": SIG}
    fit = Phi @ W
    print("FIELD centers", len(cen), "khớp tại điểm mốc: lệch tối đa %.2f mm" % (np.abs(fit - val).max() * 1000))

    def move(obj):
        X = np.array([v.co for v in obj.data.vertices]); D = field_eval(X, field)
        obj.data.vertices.foreach_set("co", (X + D).ravel()); obj.data.update()
        print("NUDGED", obj.name, len(X), "dời tối đa %.2f mm" % (np.linalg.norm(D, axis=1).max() * 1000))

    if me.shape_keys:
        print("CẢNH BÁO: Body còn shape key — chỉ dời lưới gốc")
    move(body)
    if "HunyuanAligned" in bpy.data.objects:
        move(bpy.data.objects["HunyuanAligned"])
    for md in body.modifiers:
        md.show_viewport = True
    json.dump(field, open(os.path.splitext(out)[0] + "_nudge.json", "w"))
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print("SAVED", out)
