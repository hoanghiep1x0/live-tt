"""Đổi dáng thân (ngực, mông, hông, eo, vai, cổ, tay…) + mặc quần áo theo hồ sơ nhân vật, trên base đã làm xong mặt.

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/apply_profile.py -- <ra.blend> --to D:\\Assets\\parts\\body\\<tên>.json \
    [--from D:\\Assets\\parts\\body\\model-1.json]

- Độ dời = người MPFB theo hồ sơ mới − người MPFB theo hồ sơ cũ (cùng lưới gốc, đủ lưới phụ + đỉnh khớp → rig_base dựng
  xương theo dáng mới). Đầu giữ nguyên hình (mặt đã khớp ảnh): từ khớp đầu trở lên chỉ dời cả khối bằng độ dời trung bình ở
  khớp đầu (cổ dài/ngắn thì đầu đi theo); chuyển mềm trong 4 cm dưới khớp đầu. Mắt, mi, tóc, tượng Hunyuan dời cùng khối đầu.
- Quần áo: "clothes" của hồ sơ mới (thư mục data/clothes của MPFB, CC0) gắn bằng MPFB (ôm theo thân mới).
- UV, texture, normal map giữ nguyên.
"""
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import char_profile as profile  # noqa: E402

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
P_to = profile.load(a[a.index("--to") + 1])
P_from = profile.load(a[a.index("--from") + 1] if "--from" in a else None)
body = bpy.data.objects["Body"]


def eval_co(o):
    for md in o.modifiers:
        md.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg); m = ev.to_mesh()
    X = np.array([v.co for v in m.vertices]); ev.to_mesh_clear()
    return X


A = profile.make_body(P_from, name="_from"); XA = eval_co(A)
Bm = profile.make_body(P_to, name="_to"); XB = eval_co(Bm)
D = XB - XA
gh = A.vertex_groups["joint-head"].index
zh = np.mean([XA[v.index, 2] for v in A.data.vertices if any(g.group == gh for g in v.groups)])
for o in (A, Bm):
    bpy.data.objects.remove(o, do_unlink=True)
ring = np.abs(XA[:, 2] - zh) < 0.01
Dh = D[ring].mean(0)
t = np.clip((zh - XA[:, 2]) / 0.04, 0, 1); w = t * t * (3 - 2 * t)                # 0 = đầu (giữ hình), 1 = thân
Dp = w[:, None] * D + (1 - w[:, None]) * Dh
for md in body.modifiers:
    md.show_viewport = False
co = np.array([v.co for v in body.data.vertices])
assert len(co) == len(Dp), (len(co), len(Dp))
body.data.vertices.foreach_set("co", (co + Dp).ravel()); body.data.update()
for md in body.modifiers:
    md.show_viewport = True
moved = []
for o in bpy.data.objects:
    if o.type == "MESH" and o is not body and (o.name.startswith(("Body.", "Hair")) or o.name == "HunyuanAligned"):
        dl = np.array(o.matrix_world.inverted().to_3x3()) @ Dh                    # dời trong hệ của chính lưới (đỉnh)
        X = np.array([v.co for v in o.data.vertices]) + dl
        o.data.vertices.foreach_set("co", X.ravel()); o.data.update()
        moved.append(o.name)
print("PROFILE", os.path.basename(a[a.index("--to") + 1]), "dời thân tối đa %.1f mm" % (np.linalg.norm(Dp, axis=1).max() * 1000),
      "khối đầu (%.1f, %.1f, %.1f) mm" % tuple(Dh * 1000), "dời theo:", moved)
profile.add_clothes(body, P_to)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
