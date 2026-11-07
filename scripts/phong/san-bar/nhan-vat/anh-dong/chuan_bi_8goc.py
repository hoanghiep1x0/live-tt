"""Chuẩn bị đầu vào MimicMotion cho 8 góc: ảnh mẫu từng góc + video dáng người nộm từng góc.

python chuan_bi_8goc.py <thư mục ra> <ảnh mặt trước> <tấm A dáng 0> <tấm B dáng 0> <gốc dáng 64> [--fps 10]
  tấm A / B: tấm 2×2 ChatGPT vẽ theo luoi_goc.py (A = 45/90/135/180°, B = 225/270/315/0°) ở dáng 0.
  gốc dáng 64: tiền tố thư mục dang_mau.py --so 64 — <gốc> là mặt trước, <gốc>-g45 … <gốc>-g315 là các góc khác.
Ra: <ra>/ref<góc>.png và <ra>/dang<góc>.mp4 cho mimic_8goc.sh. Chạy bằng venv của MimicMotion (cần cv2).
"""
import glob
import os
import sys

import cv2
from PIL import Image

ra, truoc, tam_a, tam_b, goc_dang = sys.argv[1:6]
fps = int(sys.argv[sys.argv.index("--fps") + 1]) if "--fps" in sys.argv else 10
os.makedirs(ra, exist_ok=True)
o = {0: (truoc, None)}
for g, (t, c) in {45: (tam_a, 0), 90: (tam_a, 1), 135: (tam_a, 2), 180: (tam_a, 3),
                  225: (tam_b, 0), 270: (tam_b, 1), 315: (tam_b, 2)}.items():
    o[g] = (t, c)
for g, (f, c) in o.items():
    a = Image.open(f).convert("RGB")
    if c is not None:  # cắt ô c của tấm 2×2
        w, h = a.width / 2, a.height / 2
        r, k = divmod(c, 2)
        a = a.crop((round(k * w), round(r * h), round((k + 1) * w), round((r + 1) * h)))
    a.save(f"{ra}/ref{g}.png")
    fs = sorted(glob.glob(f"{goc_dang}{f'-g{g}' if g else ''}/dang_*.png"))
    hh, ww = cv2.imread(fs[0]).shape[:2]
    v = cv2.VideoWriter(f"{ra}/dang{g}.mp4", cv2.VideoWriter_fourcc(*"mp4v"), fps, (ww, hh))
    for x in fs:
        v.write(cv2.imread(x))
    v.release()
    print(g, a.size, len(fs), "khung")
