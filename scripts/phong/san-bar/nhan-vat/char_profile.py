"""Hồ sơ nhân vật (parts\\body\\<tên>.json): dáng thân, loại da nền, quần áo — dùng chung cho base_head, fix_ears,
apply_profile, build_character (import char_profile).

{
  "macro":   {"gender": 0, "age": 0.42, "muscle": 0.45, "weight": 0.38, "proportions": 0.95, "height": 0.62,
              "cupsize": 0.62, "firmness": 0.7, "race": {"asian": 0.8, "caucasian": 0.2, "african": 0}},
  "targets": {"buttocks/buttocks-volume-incr": 0.4, "hip/hip-scale-horiz-incr": 0.2, "neck/neck-scale-vert-incr": 0.2,
              "torso/measure-shoulder-dist-decr": 0.3, "breast/breast-trans-up": 0.2, ...},
  "skin":    "young_asian_female",
  "clothes": ["female_casualsuit01", "shoes03"]
}
- macro: thanh tổng MakeHuman (0..1). cupsize = cỡ ngực, firmness = độ săn ngực; weight/muscle đổi cả tay, chân, mông.
- targets: "thư mục/tên": trọng số (0..1) trong data/targets của MPFB; tên có bản l-/r- thì cộng cả hai bên. Vùng hay dùng:
  breast (breast-volume-vert-up/down, breast-dist-*, breast-trans-up/down), buttocks (buttocks-volume-incr/decr), hip
  (hip-scale-horiz/depth/vert-*, hip-waist-up/down), torso (measure-waist-circ-*, measure-hips-circ-*, measure-bust-circ-*,
  measure-shoulder-dist-*, torso-vshape-*), neck (neck-scale-vert/horiz-*, measure-neck-height-*), arms, legs.
- skin: tên thư mục trong data/skins (22 loại theo tuổi / chủng / giới). clothes: thư mục trong data/clothes (CC0).
- Thiếu khoá nào thì lấy theo DEFAULT (= model-1).
"""
import copy
import json
import os

import bpy

ASSETS = bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data")
DEFAULT = {
    "macro": {"gender": 0.0, "age": 0.42, "muscle": 0.45, "weight": 0.38, "proportions": 0.95, "height": 0.62,
              "cupsize": 0.62, "firmness": 0.7, "race": {"asian": 0.8, "caucasian": 0.2, "african": 0.0}},
    "targets": {},
    "skin": "young_asian_female",
    "clothes": [],
}


def load(path=None):
    p = copy.deepcopy(DEFAULT)
    if path:
        d = json.load(open(path, encoding="utf-8"))
        p["macro"].update(d.get("macro", {}))
        for k in ("targets", "skin", "clothes"):
            if k in d:
                p[k] = d[k]
    return p


def target_files(key):
    """'thư mục/tên' → danh sách file .target.gz (hai bên nếu có l-/r-)."""
    import bl_ext.user_default.mpfb as _mpfb
    td = os.path.join(os.path.dirname(_mpfb.__file__), "data", "targets")
    fd, nm = key.split("/")
    lr = [os.path.join(td, fd, f"{s}-{nm}.target.gz") for s in "lr"]
    if all(os.path.exists(f) for f in lr):
        return lr
    f = os.path.join(td, fd, nm + ".target.gz")
    if not os.path.exists(f):
        raise FileNotFoundError(f)
    return [f]


def make_body(prof, name="Body"):
    """Người MPFB theo hồ sơ (chưa có da, mắt, mi): thanh tổng + thanh vùng (shape key, trọng số theo hồ sơ)."""
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    from bl_ext.user_default.mpfb.services.targetservice import TargetService
    macro = TargetService.get_default_macro_info_dict()
    macro.update(copy.deepcopy(prof["macro"]))
    body = HumanService.create_human(macro_detail_dict=macro, feet_on_ground=True, scale=0.1)
    body.name = name
    for key, w in prof.get("targets", {}).items():
        for f in target_files(key):
            TargetService.load_target(body, f, weight=float(w), name=os.path.basename(f)[:-10])
    return body


def add_skin(body, prof):
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    sk = prof.get("skin", DEFAULT["skin"])
    HumanService.set_character_skin(os.path.join(ASSETS, "skins", sk, sk + ".mhmat"), body, skin_type="GAMEENGINE")


def add_clothes(body, prof):
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    out = []
    for c in prof.get("clothes", []):
        p = os.path.join(ASSETS, "clothes", c, c + ".mhclo")
        if not os.path.exists(p):
            print("NO CLOTHES", c); continue
        out.append(HumanService.add_mhclo_asset(p, body, asset_type="Clothes", subdiv_levels=0, material_type="GAMEENGINE"))
        print("CLOTHES", c)
    return out
