"""Dựng lại tai + da quanh tai từ tai MakeHuman gốc (đã khớp dáng), đặt cứng lên đầu đã bọc.

blender -b <base hoặc wrap.blend> --python scripts/phong/san-bar/nhan-vat/fix_ears.py -- <ra.blend> [--ears D:\\Assets\\parts\\ears\\<tên>.json] [--hops 6]

- Lúc bọc, tai và da sát tai dời theo trường làm mịn của da xung quanh, còn da sau tai áp vào tượng Hunyuan (tai tượng rối) →
  tai gồ ghề, đỉnh vành tai cụt, sau tai thành miếng da phẳng nối lên sọ (model-1: người dùng chỉ ra mảng xám sau vành tai).
- Lưới tham chiếu: người MPFB mới theo cùng hồ sơ nhân vật (--profile, như base_head.py) + thanh trượt tai (--ears, mặc định không có).
- Vùng sửa: nhóm "ears" + các vòng đỉnh quanh (tới --hops vòng). Phép đồng dạng (xoay, dời, tỉ lệ) khớp tham chiếu → lưới hiện
  tại theo các đỉnh vòng hops..hops+3 (da đầu còn đúng, xa chỗ hỏng). Đỉnh tai và 1 vòng sát lấy hẳn tham chiếu đã đặt; ra xa
  pha dần về lưới hiện tại (smoothstep theo số vòng).
- Chỉ đổi toạ độ đỉnh: UV, texture, normal map giữ nguyên → chạy được trên base đã tô màu.
"""
import json
import os
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
EARS = a[a.index("--ears") + 1] if "--ears" in a else None
HOPS = int(a[a.index("--hops") + 1]) if "--hops" in a else 6

from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.targetservice import TargetService  # noqa: E402
import bl_ext.user_default.mpfb as _mpfb  # noqa: E402

body = bpy.data.objects["Body"]
for md in body.modifiers:
    md.show_viewport = False
me = body.data
X1 = np.array([v.co for v in me.vertices])

# ---- lưới tham chiếu (cùng thông số cơ thể với base_head.make_human) ----
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import char_profile as profile  # noqa: E402
ref = profile.make_body(profile.load(a[a.index("--profile") + 1] if "--profile" in a else None), name="ref")   # cùng hồ sơ với base
if EARS:
    TD = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets", "ears")
    for t, w in json.load(open(EARS)).items():
        for sd in "lr":
            TargetService.load_target(ref, os.path.join(TD, f"{sd}-{t}.target.gz"), weight=w, name=f"{sd}-{t}")
for md in ref.modifiers:                                      # bộ ẩn lưới phụ bỏ đỉnh → tắt, lấy đủ đỉnh
    md.show_viewport = False
dg = bpy.context.evaluated_depsgraph_get()
ev = ref.evaluated_get(dg); m_ = ev.to_mesh()
X0 = np.array([ref.matrix_world @ v.co for v in m_.vertices]); ev.to_mesh_clear()
Mi = np.array(body.matrix_world.inverted())
X0 = (X0 @ Mi[:3, :3].T) + Mi[:3, 3]                          # → toạ độ cục bộ của Body
bpy.data.objects.remove(ref, do_unlink=True)
assert len(X0) == len(X1), (len(X0), len(X1))

helper = np.zeros(len(X1), bool)
for vg in body.vertex_groups:
    if vg.name.lower().startswith(("helper", "joint")):
        for v in me.vertices:
            if any(g.group == vg.index for g in v.groups):
                helper[v.index] = True
gi = body.vertex_groups["ears"].index
ew = np.array([next((g.weight for g in v.groups if g.group == gi), 0.0) for v in me.vertices])
ear = (ew > 0) & ~helper

nb = [[] for _ in range(len(X1))]
for e in me.edges:
    i, j = e.vertices
    if not (helper[i] or helper[j]):
        nb[i].append(j); nb[j].append(i)

X = X1.copy()
for side in (1, -1):
    hop = np.full(len(X1), 10 ** 6)
    front = [i for i in np.where(ear & (np.sign(X1[:, 0]) == side))[0]]
    for i in front:
        hop[i] = 0
    for k in range(1, HOPS + 4):
        nxt = []
        for i in front:
            for j in nb[i]:
                if hop[j] > k:
                    hop[j] = k; nxt.append(j)
        front = nxt
    fit = np.where((hop >= HOPS) & (hop <= HOPS + 3))[0]
    A, B = X0[fit], X1[fit]; Am, Bm = A.mean(0), B.mean(0)
    U, S, Vt = np.linalg.svd((B - Bm).T @ (A - Am)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    Rm = U @ D @ Vt; s = (S * np.diag(D)).sum() / ((A - Am) ** 2).sum()
    T = lambda P: s * (P - Am) @ Rm.T + Bm
    res = np.linalg.norm(T(A) - B, axis=1)
    reg = np.where(hop < HOPS)[0]
    t = np.clip((HOPS - hop[reg]) / (HOPS - 1), 0, 1); w = t * t * (3 - 2 * t)        # vòng ≤ 1 → 1, vòng HOPS → 0
    w[hop[reg] <= 1] = 1.0
    X[reg] = X1[reg] * (1 - w[:, None]) + T(X0[reg]) * w[:, None]
    d = np.linalg.norm(X[reg] - X1[reg], axis=1)
    print(f"TAI {'trái' if side > 0 else 'phải'}: đỉnh sửa {len(reg)}, khớp theo {len(fit)} đỉnh (lệch tb {res.mean() * 1000:.2f} mm,"
          f" tỉ lệ {s:.3f}), dời tb {d.mean() * 1000:.2f} / max {d.max() * 1000:.2f} mm")
SM = int(a[a.index("--smooth") + 1]) if "--smooth" in a else 0
if SM:
    # thanh dáng tai (shape-round, flap) bóp nhàu lòng tai (mảnh vụn trong hõm, khấc đỉnh vành — thấy trên đất sét) → Laplace
    # nhẹ riêng đỉnh tai (trọng số nhóm "ears" > 0,3), λ 0,4
    idx = np.where((ew > 0.3) & ~helper)[0]
    for _ in range(SM):
        avg = np.array([X[nb[i]].mean(0) if nb[i] else X[i] for i in idx])
        X[idx] = X[idx] * 0.6 + avg * 0.4
    print("SMOOTH tai", len(idx), "đỉnh,", SM, "vòng")
me.vertices.foreach_set("co", X.ravel()); me.update()
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
