"""Cộng thẳng thanh trượt MakeHuman vào lưới Body hiện tại (sau bọc / đã tô màu; chỉ dời đỉnh, giữ UV).

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/apply_targets.py -- <ra.blend> '{"eyes/eye-height2-incr": 0.3, "ears/ear-shape-round": 1}'

- Khoá "thư mục/tên" trong data/targets của MPFB; có bản l-/r- thì cộng cả hai bên cùng trọng số (giữ đối xứng).
- Đổi vùng mắt thì thẻ mi (mhclo) không đi theo → chạy lại bake_to_base --lashes hoặc gắn lại mi sau bước này.
"""
import json
import os
import sys

import bpy
import numpy as np

from bl_ext.user_default.mpfb.services.targetservice import TargetService
import bl_ext.user_default.mpfb as _mpfb

a = sys.argv[sys.argv.index("--") + 1:]
out, W = a[0], json.loads(a[1])
TD = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets")
body = bpy.data.objects["Body"]; me = body.data
for md in body.modifiers:
    md.show_viewport = False
co = np.array([v.co for v in me.vertices]); D = np.zeros_like(co)
for key, w in W.items():
    fd, nm = key.split("/")
    files = [f"{sd}-{nm}" for sd in "lr"] if os.path.exists(os.path.join(TD, fd, f"l-{nm}.target.gz")) else [nm]
    for f in files:
        TargetService.load_target(body, os.path.join(TD, fd, f + ".target.gz"), weight=1.0, name="tmp")
        kb = me.shape_keys.key_blocks
        D += w * (np.array([v.co for v in kb["tmp"].data]) - np.array([v.co for v in kb[0].data]))
        body.shape_key_remove(kb["tmp"])
if me.shape_keys:
    for kb in list(me.shape_keys.key_blocks)[::-1]:
        body.shape_key_remove(kb)
me.vertices.foreach_set("co", (co + D).ravel()); me.update()
print("TARGETS", W, "dời tối đa %.2f mm" % (np.linalg.norm(D, axis=1).max() * 1000))
for md in body.modifiers:
    md.show_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
