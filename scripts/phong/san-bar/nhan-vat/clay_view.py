"""Bản "đất sét" để soi lỗi hình: thay mọi vật liệu của Body bằng màu trơn (không texture, không normal map).

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/clay_view.py -- <ra_clay.blend>
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <ra_clay.blend> <ortho_clay> --soft --angles 0,40,330

- Texture chiếu từ ảnh che lỗi hình (bóng trong ảnh vẽ đè lên): khấc, nếp gập dưới hàm, miếng da sau tai, gợn dưới môi chỉ lộ rõ
  trên đất sét. Soi sau MỖI bước sửa hình (fix_*, *_nudge, *_fit), cùng 3 góc với bước chấm điểm.
"""
import sys

import bpy

out = sys.argv[sys.argv.index("--") + 1]
m = bpy.data.materials.new("clay"); m.use_nodes = True
b = m.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.7, 0.6, 0.55, 1); b.inputs["Roughness"].default_value = 0.6
o = bpy.data.objects["Body"]
for i in range(len(o.data.materials)):
    o.data.materials[i] = m
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
