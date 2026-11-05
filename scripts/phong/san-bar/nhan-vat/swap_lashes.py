"""Gắn lại thẻ mi (bộ mi thư mục parts\lashes\<tên>) vào Body hiện tại — sau khi đổi dáng mí (apply_targets vùng mắt).

blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/swap_lashes.py -- <thư mục bộ mi> <ra.blend>

- mhclo bám theo đỉnh Body lúc gắn → đổi mí sau khi gắn thì mi lệch mép mí. Chất liệu mi: nhám 0,9, bóng 0,1.
"""
import bpy, sys, os
a=sys.argv[sys.argv.index("--")+1:]; src_dir, out = a[:2]; scale=float(a[2]) if len(a)>2 else 1.0
body=bpy.data.objects["Body"]
for o in list(bpy.data.objects):
    if o.name.startswith("Body.eyelashes"): bpy.data.objects.remove(o, do_unlink=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
n=[f for f in os.listdir(src_dir) if f.endswith(".mhclo")][0]
HumanService.add_mhclo_asset(os.path.join(src_dir,n), body, asset_type="Eyelashes", subdiv_levels=0, material_type="GAMEENGINE")
for o in bpy.data.objects:
    if o.name.startswith("Body.eyelashes"):
        for m in o.data.materials:
            b=next(x for x in m.node_tree.nodes if x.type=="BSDF_PRINCIPLED")
            b.inputs["Roughness"].default_value=0.9; b.inputs["Specular IOR Level"].default_value=0.1
        print("LASHOBJ", o.name, o.parent and o.parent.name)
bpy.ops.wm.save_as_mainfile(filepath=out); print("SAVED", out)
