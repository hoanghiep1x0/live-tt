"""Đo dáng mắt của lưới đã bọc so với ảnh → độ dời mong muốn (mm) cho base_head.py eye-fit.

python scripts/phong/san-bar/nhan-vat/eye_fix.py <ortho lưới đã bọc> <lm_photo.json> <ảnh> <ra.json> [--prev <eye_fix trước.json>] [--gain 1.0] [--sym]

- <ortho lưới đã bọc>: base_head.py views + landmarks.py (ortho.json, lm_ortho.json).
- Ảnh và lưới được đặt chồng bằng phép đồng dạng 2D theo mũi, miệng, cằm, khoé mắt (không theo riêng một mắt).
- In ra bề ngang / độ mở / độ xếch từng mắt (ảnh vs lưới) và lệch điểm mốc trung bình (px ảnh lưới).
- Ghi độ dời 8 điểm mỗi mắt (2 khoé, 3 điểm mí trên, 3 điểm mí dưới) theo mặt phẳng x–z, đơn vị mm;
  --prev: cộng dồn với lần sửa trước (vì lần bọc sau làm lại từ đầu).
"""
import json
import os
import sys

import numpy as np

args = sys.argv[1:]
odir, lmp_path, photo, out = args[:4]
gain = float(args[args.index("--gain") + 1]) if "--gain" in args else 1.0
meta = json.load(open(os.path.join(odir, "ortho.json")))["ortho_0.png"]
M = {k: np.array(v) for k, v in json.load(open(os.path.join(odir, "lm_ortho.json")))["ortho_0.png"].items()}
P = {k: np.array(v) for k, v in json.load(open(lmp_path))[photo].items()}
mm = meta["scale"] / meta["R"] * 1000                       # mm / px ảnh lưới

anchor = ["nose_tip", "mouth_l", "mouth_r", "chin", "eye_l_in", "eye_r_in", "eye_l_out", "eye_r_out"]
S = np.array([P[k] for k in anchor]); T = np.array([M[k] for k in anchor])
ms, mt = S.mean(0), T.mean(0); Sc, Tc = S - ms, T - mt
U, Sg, Vt = np.linalg.svd(Tc.T @ Sc); Rm = U @ Vt; s = Sg.sum() / (Sc ** 2).sum()
f = lambda p: s * Rm @ (np.asarray(p) - ms) + mt             # ảnh → px ảnh lưới

PTS = {"in": "eye_{}_in", "out": "eye_{}_out", "top": "eye_{}_top", "bot": "eye_{}_bot",
       "u2": "lid_{}_up_2", "u6": "lid_{}_up_6", "l2": "lid_{}_lo_2", "l6": "lid_{}_lo_6"}
prev = json.load(open(args[args.index("--prev") + 1])) if "--prev" in args else {}
fix = {}
for sd in "lr":
    g = lambda n: M[PTS[n].format(sd)]
    h = lambda n: f(P[PTS[n].format(sd)])
    wid = (np.linalg.norm(h("out") - h("in")), np.linalg.norm(g("out") - g("in")))
    opn = (np.linalg.norm(h("top") - h("bot")), np.linalg.norm(g("top") - g("bot")))
    tilt = lambda a, b: np.degrees(np.arctan2(-(b - a)[1], abs((b - a)[0])))
    print(f"mắt {sd}: ngang ảnh {wid[0]:.1f} lưới {wid[1]:.1f} | mở ảnh {opn[0]:.1f} lưới {opn[1]:.1f} | "
          f"xếch ảnh {tilt(h('in'), h('out')):.1f}° lưới {tilt(g('in'), g('out')):.1f}°")
    fix[sd] = {}
    for n in PTS:
        d = (h(n) - g(n)) * gain                              # px ảnh lưới, y hướng xuống
        dx, dz = d[0] * mm, -d[1] * mm
        p0 = prev.get(sd, {}).get(n, [0, 0])
        fix[sd][n] = [round(float(p0[0] + dx), 3), round(float(p0[1] + dz), 3)]
if "--sym" in args:   # đối xứng trước (kinh nghiệm hoạ sĩ): trung bình hai mắt, x lấy gương
    for n in PTS:
        x = (fix["l"][n][0] - fix["r"][n][0]) / 2; z = (fix["l"][n][1] + fix["r"][n][1]) / 2
        fix["l"][n] = [round(x, 3), round(z, 3)]; fix["r"][n] = [round(-x, 3), round(z, 3)]
err = np.mean([np.linalg.norm(M[k] - f(P[k])) for k in P if k in M])
print("lệch điểm mốc trung bình (px)", round(float(err), 2), "=", round(float(err * mm), 2), "mm")
json.dump(fix, open(out, "w"), indent=1)
print("EYE FIX (mm, x–z)", fix)
