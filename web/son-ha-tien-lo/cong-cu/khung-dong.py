"""Ghép khung động tác ChatGPT (tờ 2×2) với tranh dáng chiến thành WebP động cho Võ Trường / PK.

python web/son-ha-tien-lo/cong-cu/khung-dong.py <tờ 2x2.png | GIF 4 khung của ChatGPT> <dáng chiến gốc.png> <ra .webp> [--khong-goc] [--1234]

- Cắt 4 ô (khối liền theo alpha, gán vào ô chứa tâm), cắt sát.
- Căn: mọi khung cùng MỘT tỉ lệ (lấy theo khung 4 — dáng gần thế thủ nhất — cho bằng chiều cao người trong tranh gốc), chân
  đặt đúng vạch đất và đúng hoành độ chân của tranh gốc (tâm alpha của 8% hàng dưới cùng) → người không trôi.
- Nhịp (ms): gốc 420 → lấy đà 170 → vung 90 → trúng 300 → thu 170 → gốc; giữa hai khung chèn 1 khung hoà 50% cho đỡ giật.
- Dựng trên khung rộng rồi cắt chung cho khỏi cụt binh khí; WebP động vuông 640, chạy một lần (loop=1), method 4.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

to, goc, ra = sys.argv[1], sys.argv[2], sys.argv[3]
# --khong-goc: động tác cầm binh khí khác tranh gốc (vd tranh gốc cầm rìu, động tác bắn cung) → bỏ khung gốc, khung 4
# (thu thế) làm dáng đứng đầu / cuối; tranh gốc chỉ dùng để lấy cỡ và vạch chân.
KHONG_GOC = '--khong-goc' in sys.argv
CO = 640


def khoi_o(im: Image.Image, cot: int, hang: int) -> list[Image.Image]:
    A = np.array(im)[:, :, 3]
    H, W = A.shape
    K = 4
    h, w = -(-H // K), -(-W // K)
    pad = np.zeros((h * K, w * K), np.uint8)
    pad[:H, :W] = A
    m = pad.reshape(h, K, w, K).max(axis=(1, 3)) > 24
    lab = np.zeros((h, w), np.int32)
    co = []
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]:
            continue
        n = len(co) + 1
        lab[y0, x0] = n
        q = deque([(y0, x0)])
        d = sy = sx = 0
        while q:
            y, x = q.popleft()
            d += 1
            sy += y
            sx += x
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    q.append((yy, xx))
        co.append((d, sy / d, sx / d))
    o = [[] for _ in range(cot * hang)]
    lon = max(d for d, _, _ in co)
    for n, (d, cy, cx) in enumerate(co, 1):
        if d < lon * 0.01:
            continue
        i = min(int(cy * K * hang / H), hang - 1) * cot + min(int(cx * K * cot / W), cot - 1)
        o[i].append(n)
    lab_to = np.kron(lab, np.ones((K, K), np.int32))[:H, :W]
    ds = []
    arr = np.array(im)
    for ns in o:
        mm = np.isin(lab_to, ns)
        a = arr.copy()
        a[:, :, 3] = np.where(mm, a[:, :, 3], 0)
        x = Image.fromarray(a)
        ds.append(x.crop(Image.fromarray(np.where(a[:, :, 3] > 24, 255, 0).astype(np.uint8)).getbbox()))
    return ds


def chan(im: Image.Image) -> tuple[float, int]:
    """Hoành độ tâm chân (tâm alpha 8% hàng dưới) và vạch đất (hàng alpha cuối)."""
    A = np.array(im)[:, :, 3] > 60
    ys = np.nonzero(A.any(axis=1))[0]
    y2 = int(ys[-1])
    y1 = int(ys[0])
    k = max(2, int((y2 - y1) * 0.08))
    xs = np.nonzero(A[y2 - k:y2 + 1].any(axis=0))[0]
    return float(xs.mean()), y2


# Dựng trên khung rộng (gấp đôi) để lưỡi binh khí, vệt chém vươn ra không bị cắt; xong cắt chung một hình vuông chứa
# hết mọi khung (chân vẫn trùng nhau vì cùng một phép cắt) rồi thu về CO.
L = CO * 2
g0 = Image.open(goc).convert('RGBA').resize((CO, CO), Image.LANCZOS)
g = Image.new('RGBA', (L, L), (0, 0, 0, 0))
g.paste(g0, (CO // 2, CO), g0)
gA = np.array(g)[:, :, 3] > 60
gys = np.nonzero(gA.any(axis=1))[0]
cao_goc = gys[-1] - gys[0]
gx, gy = chan(g)

def tu_gif(path: str) -> list[Image.Image]:
    """ChatGPT trả GIF (trong suốt 1 bit): lấy từng khung, làm mềm viền (alpha nhoè 1 px rồi co lại), cắt sát."""
    from PIL import ImageFilter
    g = Image.open(path)
    ds = []
    for i in range(g.n_frames):
        g.seek(i)
        f = g.convert('RGBA')
        al = f.getchannel('A').filter(ImageFilter.GaussianBlur(0.8))
        f.putalpha(al.point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 255 / 175))))
        ds.append(f.crop(f.getbbox()))
    return ds


o = tu_gif(to) if to.lower().endswith('.gif') else khoi_o(Image.open(to).convert('RGBA'), 2, 2)
# Tỉ lệ: người trong khung 4 (gần thế thủ) cao bằng người trong tranh gốc — co nhẹ 3% cho khỏi "phình" khi đổi khung.
ti = cao_goc / o[3].height * 0.97
khung = [g]
for x in o:
    x = x.resize((max(1, round(x.width * ti)), max(1, round(x.height * ti))), Image.LANCZOS)
    cx, cy = chan(x)
    nen = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    nen.paste(x, (int(round(gx - cx)), int(round(gy - cy))), x)
    khung.append(nen)

hop = None
for k in (khung[1:] if KHONG_GOC else khung):
    b = Image.fromarray(np.where(np.array(k)[:, :, 3] > 12, 255, 0).astype(np.uint8)).getbbox()
    hop = b if hop is None else (min(hop[0], b[0]), min(hop[1], b[1]), max(hop[2], b[2]), max(hop[3], b[3]))
x1, y1, x2, y2 = hop
canh = int(max(x2 - x1, y2 - y1) * 1.04)
cxh = (x1 + x2) // 2
cat = (cxh - canh // 2, y2 - canh, cxh - canh // 2 + canh, y2)
khung = [k.crop(cat).resize((CO, CO), Image.LANCZOS) for k in khung]

# Thứ tự khung và nhịp — cả hai kiểu đều ra tay (khung 3) đúng 800 ms (`RA_TAY` trong ve3d/san-thu.ts).
if '--1234' in sys.argv:
    # Động tác có hiệu ứng còn đọng ở khung 4 (vd vách đá đang mờ): đi thẳng 1 → 2 → 3 → 4, không mở đầu bằng khung 4.
    thu_tu = [khung[1], khung[2], khung[3], khung[4]]
    NHIP = [450, 270, 340, 300]
elif KHONG_GOC:
    thu_tu = [khung[4], khung[1], khung[2], khung[3], khung[4]]
    NHIP = [260, 170, 250, 300, 220]
else:
    thu_tu = khung + [khung[0]]
    NHIP = [420, 170, 90, 300, 170, 200]
ds, tre = [], []
for i, a in enumerate(thu_tu):
    ds.append(a)
    tre.append(NHIP[i])
    if i < len(thu_tu) - 2:
        ds.append(Image.blend(a, thu_tu[i + 1], 0.5))
        tre.append(40)
# Chạy MỘT lần (loop=1), dừng ở thế thủ — nơi dùng tự cho chạy lại mỗi lượt ra đòn.
ds[0].save(ra, save_all=True, append_images=ds[1:], duration=tre, loop=1, quality=82, method=4)
# Mốc ra tay = lúc hiện khung 3 của tờ (giương cung buông tên / chém trúng / dựng khiên).
vt = next(i for i, x in enumerate(ds) if x is khung[3])
print('xong', ra, len(ds), 'khung', sum(tre), 'ms; ra tay (khung 3) ở', sum(tre[:vt]), 'ms')
