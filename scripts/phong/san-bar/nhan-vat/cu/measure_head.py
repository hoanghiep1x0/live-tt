"""In các mốc của đầu Hunyuan (đã nhập glTF: mặt hướng -Y, lên +Z) để dựng tóc."""
import sys

import bpy
import numpy as np

src = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = o
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
P = np.array([v.co for v in o.data.vertices])
top = P[:, 2].max()
print("TOP", round(top, 3), "BBOX", P.min(0).round(3), P.max(0).round(3))
for dz in np.arange(0, 0.9, 0.05):
    z = top - dz
    s = P[np.abs(P[:, 2] - z) < 0.012]
    if len(s):
        print(f"z={z:+.3f}  x[{s[:,0].min():+.3f},{s[:,0].max():+.3f}]  y[{s[:,1].min():+.3f},{s[:,1].max():+.3f}]")
