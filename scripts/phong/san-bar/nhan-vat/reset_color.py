"""Gắn lại texture màu CHƯA trang điểm (đầu ra bake_to_base) vào base, để chạy lại makeup.py trên hình khối mới nhất.

blender -b <base đã sửa hình.blend> --python scripts/phong/san-bar/nhan-vat/reset_color.py -- <base_xx_body_color.png của bake_to_base> <ra.blend>

- Sửa hình (fix_ears, fix_folds, jaw_nudge, ear targets) chỉ dời đỉnh, giữ UV → chạy được trên base đã trang điểm. Nhưng muốn
  đổi trang điểm thì makeup.py phải chạy trên texture gốc: chạy trên texture đã trang điểm thì lớp chồng lớp (đậm gấp đôi), còn
  chạy lại trên base trước khi sửa hình thì mất các bước sửa hình.
- makeup.py tìm ảnh tên bắt đầu "body_color" → ảnh nạp vào được đặt tên đó. Normal map giữ nguyên (cùng UV).
"""
import sys

import bpy

src_png, out = sys.argv[sys.argv.index("--") + 1:][:2]
body = bpy.data.objects["Body"]
new = bpy.data.images.load(src_png); new.name = "body_color"
n_ = 0
for m in body.data.materials:
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("body_color"):
            n.image = new; n_ += 1
print("SWAPPED", n_)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
