"""Chiêu binh khí nhỏ cho quần chiến Đại Chiến: cắt đầu vệt chiêu binh khí theo phẩm (`tranh-goc/chieu-<tông>/B<p>-<tông>-chieu.png`)
thành tranh nhỏ gọn → `client/designs/tu-tien-son-ha/assets/chieu/vk/<tông>-b<p>.webp`.

python web/son-ha-tien-lo/cong-cu/vk-chieu.py

- Mũi tên, lao, đinh ba, chim thần (bay thẳng): giữ 60% bên phải (binh khí + một đoạn đuôi), mép trái mờ dần, rộng 300.
- Rìu (Sơn phẩm 3), dao găm (phẩm 4) — game cho XOAY TRÒN khi bay: chỉ giữ 40% bên phải (gần như chỉ binh khí), rộng 200.
- Dọn mảnh vụn của dải bên cạnh: bỏ khối liền nhỏ (< 6% khối lớn nhất) và khối chạm mép trên / dưới (< 35%).
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

GOC = Path(__file__).resolve().parent.parent / 'tranh-goc'
RA = Path(__file__).resolve().parents[3] / 'client/designs/tu-tien-son-ha/assets/chieu/vk'
RA.mkdir(parents=True, exist_ok=True)
XOAY = {('son', 3), ('son', 4), ('thuy', 4)}


def don(c: Image.Image) -> Image.Image:
    a = np.array(c)
    A = a[:, :, 3]
    H, W = A.shape
    K = 3
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
        d = 0
        mep = False
        while q:
            y, x = q.popleft()
            d += 1
            mep |= y <= 1 or y >= h - 2
            for yy in (y - 1, y, y + 1):
                for xx in (x - 1, x, x + 1):
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        q.append((yy, xx))
        co.append((d, mep))
    lon = max(d for d, _ in co)
    giu = np.isin(lab, [n for n, (d, mep) in enumerate(co, 1) if d >= lon * (0.35 if mep else 0.06)])
    for _ in range(2):
        g2 = giu.copy()
        g2[1:] |= giu[:-1]
        g2[:-1] |= giu[1:]
        g2[:, 1:] |= giu[:, :-1]
        g2[:, :-1] |= giu[:, 1:]
        giu = g2
    giu = np.kron(giu, np.ones((K, K), bool))[:H, :W]
    a[:, :, 3] = np.where(giu, A, 0)
    o = Image.fromarray(a)
    return o.crop(Image.fromarray(np.where(a[:, :, 3] > 24, 255, 0).astype(np.uint8)).getbbox())


for tong in ('son', 'thuy'):
    for p in range(1, 6):
        im = Image.open(GOC / f'chieu-{tong}' / f'B{p}-{tong}-chieu.png').convert('RGBA')
        W, H = im.size
        # Chỉ giữ dải hàng liền chứa món: hàng có ít điểm (< 8% hàng đông nhất) là ranh với dải bên cạnh.
        aa = np.array(im)
        dem = (aa[:, :, 3] > 24).sum(axis=1)
        g = int(np.argmax(dem))
        y1 = g
        while y1 > 0 and dem[y1 - 1] >= dem[g] * 0.08:
            y1 -= 1
        y2 = g
        while y2 < H - 1 and dem[y2 + 1] >= dem[g] * 0.08:
            y2 += 1
        aa[:y1, :, 3] = 0
        aa[y2 + 1:, :, 3] = 0
        if (tong, p) == ('son', 3):
            # Rìu (quầng lam) dính quầng tím của dao găm dải dưới: bỏ điểm tím (đỏ và lam đều trội hơn lục).
            r, gr, b = (aa[:, :, i].astype(int) for i in range(3))
            aa[:, :, 3] = np.where((r > gr + 35) & (b > gr + 35), 0, aa[:, :, 3])
        im = Image.fromarray(aa)
        xoay = (tong, p) in XOAY
        c = im.crop((int(W * (0.6 if xoay else 0.4)), 0, W, H))
        a = np.array(c)
        n = int(c.width * 0.25)
        a[:, :n, 3] = (a[:, :n, 3] * np.linspace(0, 1, n)[None, :]).astype(np.uint8)
        # Mảnh dải bên cạnh dính quầng sáng vào món nằm sát mép trên / dưới: mờ dần 16% mép trên, dưới.
        k = int(c.height * 0.16)
        r = np.linspace(0, 1, k)
        a[:k, :, 3] = (a[:k, :, 3] * r[:, None]).astype(np.uint8)
        a[-k:, :, 3] = (a[-k:, :, 3] * r[::-1][:, None]).astype(np.uint8)
        c = don(Image.fromarray(a))
        w = 200 if xoay else 300
        g = c.resize((w, max(1, round(w * c.height / c.width))), Image.LANCZOS)
        g.save(RA / f'{tong}-b{p}.webp', quality=86, method=4)
        print(tong, p, g.size, 'xoay' if xoay else '')
