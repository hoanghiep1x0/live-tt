"""Ghép ảnh động từ các khung ChatGPT vẽ theo dáng mẫu: tách nền, co giãn người cho cao đúng bằng người nộm ở dáng đó,
đặt đáy (chân) và hông đúng chỗ như người nộm — mọi dáng cùng một khung camera nên cỡ người và nhịp nhún giữ nguyên.

python ghep_khung.py <ra.webp> <thư mục dáng mẫu> <danh sách.txt> [--to 1.9] [--tre 200]
danh sách.txt: mỗi dòng "<số dáng> <file ảnh> [ô]" — ô "r,c,hang,cot" khi ảnh là tấm lưới (vd "0,1,2,2"), bỏ trống khi
ảnh đơn. Số dáng là chỉ số dang_NN.png trong thư mục dáng mẫu.
"""
import os
import sys

import numpy as np
from PIL import Image
from hy3dgen.rembg import BackgroundRemover

ra, thu_muc, ds = sys.argv[1:4]
to = float(sys.argv[sys.argv.index("--to") + 1]) if "--to" in sys.argv else 1.9
tre = int(sys.argv[sys.argv.index("--tre") + 1]) if "--tre" in sys.argv else 200
tach = BackgroundRemover()


def hop_va_hong(mask):
    ys, xs = np.nonzero(mask)
    y0, y1 = ys.min(), ys.max()
    hong = (ys > y0 + 0.45 * (y1 - y0)) & (ys < y0 + 0.62 * (y1 - y0))
    cx = xs[hong].mean() if hong.any() else (xs.min() + xs.max()) / 2
    return y0, y1, cx


khung = []
W0 = H0 = None
for dong in open(ds, encoding="utf-8"):
    p = dong.split()
    if not p:
        continue
    so, ten = int(p[0]), p[1]
    # người nộm: nền trắng → mặt nạ theo độ tối
    mau = Image.open(os.path.join(thu_muc, f"dang_{so:02d}.png")).convert("L")
    W0, H0 = mau.size
    m_y0, m_y1, m_cx = hop_va_hong(np.asarray(mau) < 235)
    anh = Image.open(ten).convert("RGB")
    if len(p) > 2:
        r, c, hang, cot = map(int, p[2].split(","))
        cw, ch = anh.width / cot, anh.height / hang
        anh = anh.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
    k = tach(anh).convert("RGBA")
    a_y0, a_y1, a_cx = hop_va_hong(np.asarray(k)[..., 3] > 40)
    # co giãn: người vẽ cao đúng bằng người nộm (× to)
    s = (m_y1 - m_y0) * to / (a_y1 - a_y0)
    k = k.resize((max(1, round(k.width * s)), max(1, round(k.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (round(W0 * to), round(H0 * to)), (0, 0, 0, 0))
    c.alpha_composite(k, (round(m_cx * to - a_cx * s), round(m_y1 * to - a_y1 * s)))
    khung.append(c)
    print("KHUNG", len(khung), "dáng", so, "co", round(s, 2), flush=True)
khung[0].save(ra, save_all=True, append_images=khung[1:], duration=tre, loop=0, quality=90, method=6)
print("XONG", len(khung), "khung", khung[0].size)
