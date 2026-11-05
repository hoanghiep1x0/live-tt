"""Nặn lại mặt của mesh Hunyuan cho khớp ảnh: dời mắt, mũi, môi, cằm tới đúng vị trí trong ảnh chụp.

blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/sculpt.py -- <mesh vào .glb> <mesh ra .glb> <thư mục ortho> \
    <ảnh chính diện tách nền> <ảnh nghiêng trái tách nền> [--gain 0.7] [--sigma 0.07]

Thư mục ortho: ortho.json + lm_ortho.json (điểm mốc trên ảnh chụp tượng, render_ortho.py + landmarks.py)
               + lm_photo.json (điểm mốc trên ảnh gốc).
- Ngang/dọc (x, z): từ điểm mốc chính diện, sau khi bỏ phần lệch chung (tỉ lệ + dời) giữa ảnh và tượng.
- Độ nhô (y) của đường giữa mặt (đầu mũi, chân mũi, môi, cằm): từ đường viền ảnh nghiêng.
Mỗi lần chỉ đắp `gain` phần độ lệch (nặn từng chút), vùng ảnh hưởng là chuông Gauss bán kính `sigma`.
"""
import json
import os
import sys

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facefit import fit_silhouette  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, odir, front_img, side_img = argv[:5]
gain = float(argv[argv.index("--gain") + 1]) if "--gain" in argv else 0.7
sigma = float(argv[argv.index("--sigma") + 1]) if "--sigma" in argv else 0.07

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = ob
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
n = len(me.vertices)
P = np.empty(n * 3, np.float32); me.vertices.foreach_get("co", P); P = P.reshape(-1, 3).astype(np.float64)
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get("vertices", tris)
bvh = BVHTree.FromPolygons(P.tolist(), tris.reshape(-1, 3).tolist(), all_triangles=True)

meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
lo = json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"]
lp_all = json.load(open(os.path.join(odir, "lm_photo.json")))
fname = os.path.basename(front_img)
lp = lp_all[fname]
R, sc, cu, cv = meta["R"], meta["scale"], meta["cu"], meta["cv"]


def load_alpha(path):
    im = bpy.data.images.load(path)
    W, H = im.size
    return np.array(im.pixels[:], np.float32).reshape(H, W, 4)[..., 3] > 0.5, H


# ---------- vị trí hiện tại của các điểm mốc trên tượng (từ ảnh chụp chính diện, chiếu song song) ----------
# bỏ tròng mắt: dời nó là kéo cả nhãn cầu (tròng do màu ảnh quyết định, không cần nặn)
names = [k for k in lo if k in lp and not k.startswith(("iris", "lid_"))]
cur = {}
for k in names:
    ox, oy = lo[k]
    x = (ox - R / 2) / R * sc + cu
    z = cv + (R / 2 - oy) / R * sc
    hit = bvh.ray_cast((x, -5.0, z), (0, 1, 0), 10.0)  # bắn từ phía trước vào mặt
    if hit[0] is None:
        continue
    cur[k] = np.array(hit[0])
names = list(cur)

# ---------- đích ngang/dọc từ ảnh chính diện (bỏ lệch chung: tỉ lệ + dời) ----------
_, Hf = load_alpha(front_img)
M = np.array([[cur[k][0], cur[k][2]] for k in names])
Q = np.array([[lp[k][0], Hf - lp[k][1]] for k in names])
# Q ≈ s·M + t  (bình phương tối thiểu)
Mc, Qc = M - M.mean(0), Q - Q.mean(0)
s = (Mc * Qc).sum() / (Mc ** 2).sum()
t = Q.mean(0) - s * M.mean(0)
target = {k: np.array([(Q[i, 0] - t[0]) / s, cur[k][1], (Q[i, 1] - t[1]) / s]) for i, k in enumerate(names)}

# ---------- đích độ nhô (y) đường giữa mặt từ ảnh nghiêng (camera ở +X, u = y) ----------
alpha, Hs = load_alpha(side_img)
u, v = P[:, 1], P[:, 2]
ys, xs = np.where(alpha)
s0 = (ys.max() - ys.min()) / (v.max() - v.min())
tx0 = xs.min() - u.min() * s0; ty0 = ys.max() - v.max() * s0
ss, stx, sty = fit_silhouette(alpha, u, v, s0, tx0, ty0)
MID = ["nose_tip", "nose_base", "lip_top", "lip_mid_top", "lip_mid_bot", "lip_bot", "chin"]
for k in (MID if "--depth" in argv else []):  # độ nhô từ ảnh nghiêng: chỉ bật khi đã kiểm tra phép căn ảnh nghiêng
    if k not in target:
        continue
    row = int(round(target[k][2] * ss + sty))
    cols = np.where(alpha[max(row - 1, 0):row + 2].any(0))[0]
    if len(cols):
        target[k][1] = (cols.min() - stx) / ss   # điểm nhô nhất ở hàng đó = đường viền mặt

# ---------- nặn: trường dịch chuyển Gauss đi qua đúng các điểm mốc ----------
MM = 1 / 220.0  # 1 đơn vị mesh ≈ 220 mm (đỉnh đầu → cằm)
max_step = float(argv[argv.index("--max-mm") + 1]) * MM if "--max-mm" in argv else 4 * MM
C = np.array([cur[k] for k in names]); D = np.array([target[k] - cur[k] for k in names]) * gain
# --only lip,mouth: chỉ nặn các điểm có tên bắt đầu bằng các tiền tố này; điểm khác là neo đứng yên (D = 0)
if "--only" in argv:
    pref = tuple(argv[argv.index("--only") + 1].split(","))
    keep = np.array([k.startswith(pref) for k in names])
    D[~keep] = 0
    print("ONLY", [k for k, m in zip(names, keep) if m])
Ln = np.linalg.norm(D, axis=1, keepdims=True)
D = D * np.minimum(1.0, max_step / np.maximum(Ln, 1e-9))     # mỗi vòng mỗi điểm dời tối đa max_step
print("SCULPT", "điểm", len(names), "lệch (mm)",
      {k: round(float(np.linalg.norm(target[k] - cur[k]) / MM), 1) for k in names})
# kéo mềm: trung bình có trọng số Gauss (không ép đi qua đúng từng điểm → không giật, không xé lưới)
disp = np.zeros_like(P)
for i in range(0, n, 100000):
    p = P[i:i + 100000]
    k_ = np.exp(-((p[:, None] - C[None]) ** 2).sum(-1) / (2 * sigma ** 2))
    fall = np.clip(k_.max(1, keepdims=True) * 1.0, 0, 1)        # xa mọi điểm → không dời
    disp[i:i + 100000] = (k_ @ D) / np.maximum(k_.sum(1, keepdims=True), 1e-9) * fall
P2 = (P + disp).astype(np.float32)
me.vertices.foreach_set("co", P2.ravel())
me.update()
# làm mịn đúng vùng vừa nặn (trọng số theo độ dời) để không còn gợn sóng giữa các điểm mốc
if "--post-smooth" in argv:
    mag = np.linalg.norm(disp, axis=1)
    if mag.max() > 0:
        vg = ob.vertex_groups.new(name="moved")
        wv = np.clip(mag / (mag.max() * 0.25), 0, 1)
        for i in np.where(wv > 0.02)[0]:
            vg.add([int(i)], float(wv[i]), "REPLACE")
        sm = ob.modifiers.new("ps", "SMOOTH"); sm.vertex_group = "moved"; sm.factor = 0.6
        sm.iterations = int(argv[argv.index("--post-smooth") + 1])
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier="ps")
bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("DONE", out, "dời lớn nhất (mm)", round(float(np.linalg.norm(disp, axis=1).max() * 220), 1))
