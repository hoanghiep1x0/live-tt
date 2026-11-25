"""Cắt tờ ảnh lưới (ChatGPT vẽ, nền trong suốt) thành từng ảnh riêng, cắt sát món đồ rồi đặt giữa khung vuông.

python web/son-ha-tien-lo/cong-cu/cat-luoi.py <tờ.png> <thư mục bản gốc> <thư mục web> <tên1,tên2,...,tên9> [CỘTxHÀNG] [--dai]

- Lưới mặc định 3x3; tờ khác thì ghi thêm, vd `3x2` (6 tên, đọc từ trái sang phải, trên xuống dưới).
  Tên bắt đầu bằng `_` là ô bỏ qua.
- `--dai`: dải hiệu ứng chiêu (vd lưới `1x5`) — giữ tỉ lệ dài, không ép vuông: bản gốc PNG đúng cỡ vẽ (lề 4%),
  bản web WebP rộng 384.
- Bản gốc: PNG trong suốt 512×512 (để đưa vào game, làm ảnh động sau) — `tranh-goc/<bộ>/`.
- Bản web: WebP 256×256 — `anh/vp/`.
Không cắt cứng theo ô: tìm các khối liền nhau (alpha > 24) trên cả tờ, gán mỗi khối vào ô chứa tâm của nó, nên món
vẽ tràn qua đường chia ô vẫn nguyên vẹn và không dính mảnh của món bên cạnh; khối to hơn một ô (quầng sáng
hai món dính nhau) thì chia theo ô lưới. Chừa lề 8%.
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

DAI = '--dai' in sys.argv
ts = [a for a in sys.argv[1:] if a != '--dai']
to, goc, web, ten = ts[0], Path(ts[1]), Path(ts[2]), ts[3].split(',')
COT, HANG = (int(x) for x in (ts[4] if len(ts) > 4 else '3x3').lower().split('x'))
assert len(ten) == COT * HANG, f'cần đúng {COT * HANG} tên'
goc.mkdir(parents=True, exist_ok=True)
web.mkdir(parents=True, exist_ok=True)
im = Image.open(to).convert('RGBA')
W, H = im.size
A = np.array(im)[:, :, 3]

# Gán nhãn khối liền trên ảnh thu nhỏ 4 lần (nở 1 ô để quầng sáng dính vào món).
K = 4
h, w = -(-H // K), -(-W // K)
nho = np.zeros((h, w), bool)
pad = np.zeros((h * K, w * K), np.uint8)
pad[:H, :W] = A
nho = pad.reshape(h, K, w, K).max(axis=(1, 3)) > 24
no = nho.copy()
no[1:] |= nho[:-1]; no[:-1] |= nho[1:]; no[:, 1:] |= nho[:, :-1]; no[:, :-1] |= nho[:, 1:]
nhan = np.zeros((h, w), np.int32)
khoi = []  # (số điểm, tổng y, tổng x, y nhỏ, y lớn, x nhỏ, x lớn)
for y0 in range(h):
    for x0 in range(w):
        if not no[y0, x0] or nhan[y0, x0]:
            continue
        n = len(khoi) + 1
        nhan[y0, x0] = n
        q = deque([(y0, x0)]); dem = sy = sx = 0; y1, y2, x1, x2 = y0, y0, x0, x0
        while q:
            y, x = q.popleft(); dem += 1; sy += y; sx += x
            y1, y2, x1, x2 = min(y1, y), max(y2, y), min(x1, x), max(x2, x)
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and no[yy, xx] and not nhan[yy, xx]:
                    nhan[yy, xx] = n; q.append((yy, xx))
        khoi.append((dem, sy / dem, sx / dem, y1, y2, x1, x2))

# Khối nhỏ hơn một ô: gán vào ô chứa tâm. Khối to vượt cỡ ô (quầng sáng hai món dính nhau): chia theo ô lưới.
o_cua, chia = {}, set()
for i, (dem, cy, cx, y1, y2, x1, x2) in enumerate(khoi, 1):
    if (x2 - x1 + 1) * K > 1.15 * W / COT or (y2 - y1 + 1) * K > 1.15 * H / HANG:
        chia.add(i)
        for r in range(min(y1 * K * HANG // H, HANG - 1), min(y2 * K * HANG // H, HANG - 1) + 1):
            for c in range(min(x1 * K * COT // W, COT - 1), min(x2 * K * COT // W, COT - 1) + 1):
                o_cua.setdefault(r * COT + c, []).append((dem, i))
        continue
    o = min(int(cy * K * HANG / H), HANG - 1) * COT + min(int(cx * K * COT / W), COT - 1)
    o_cua.setdefault(o, []).append((dem, i))

# Ranh giới các hàng (dùng cho --dai): quanh mỗi vạch chia đều, chọn hàng có tổng alpha nhỏ nhất (±30% chiều cao dải).
tong_hang = A.astype(np.int64).sum(axis=1)
RANH = [0]
for k in range(1, HANG):
    g, d = k * H // HANG, int(0.3 * H / HANG)
    RANH.append(g - d + int(np.argmin(tong_hang[g - d:g + d])))
RANH.append(H)

nhan_to = np.kron(nhan, np.ones((K, K), np.int32))[:H, :W]
for i, t in enumerate(ten):
    if t.startswith('_'):
        continue
    if DAI:  # dải chiêu: quầng sáng các hàng hay dính nhau, nên cắt theo đường ngang ít điểm ảnh nhất gần mỗi ranh giới
        r, c = divmod(i, COT)
        m = np.zeros((H, W), bool)
        m[RANH[r]:RANH[r + 1], c * W // COT:(c + 1) * W // COT] = True
        m &= A > 0
    else:
        ds = o_cua.get(i, [])
        if not ds:
            print('o trong', t)
            continue
        lon = max(d for d, _ in ds)
        giu = [n for d, n in ds if d >= lon * 0.02]
        m = np.isin(nhan_to, [n for n in giu if n not in chia])
        if any(n in chia for n in giu):
            r, c = divmod(i, COT)
            o_luoi = np.zeros((H, W), bool)
            o_luoi[r * H // HANG:(r + 1) * H // HANG, c * W // COT:(c + 1) * W // COT] = True
            m |= np.isin(nhan_to, [n for n in giu if n in chia]) & o_luoi
            # bỏ mảnh vụn của món bên cạnh lọt vào ô (< 15% mảng lớn nhất)
            mn = np.zeros((h * K, w * K), bool); mn[:H, :W] = m & (A > 24)
            mn = mn.reshape(h, K, w, K).max(axis=(1, 3))
            lab = np.zeros((h, w), np.int32); co = []
            for y0, x0 in zip(*np.nonzero(mn)):
                if lab[y0, x0]:
                    continue
                n = len(co) + 1; lab[y0, x0] = n; q = deque([(y0, x0)]); d = 0
                while q:
                    y, x = q.popleft(); d += 1
                    for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                        if 0 <= yy < h and 0 <= xx < w and mn[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; q.append((yy, xx))
                co.append(d)
            bo = [n for n, d in enumerate(co, 1) if d < max(co) * 0.15]
            if bo:
                lab = np.kron(lab, np.ones((K, K), np.int32))[:H, :W]
                m &= ~np.isin(lab, bo)
        m &= A > 0
    arr = np.array(im)
    arr[:, :, 3] = np.where(m, arr[:, :, 3], 0)
    o = Image.fromarray(arr)
    hop = Image.fromarray(np.where(m & (A > 24), 255, 0).astype(np.uint8)).getbbox()
    o = o.crop(hop)
    if DAI:
        le = int(max(o.size) * 0.04)
        khung = Image.new('RGBA', (o.width + 2 * le, o.height + 2 * le), (0, 0, 0, 0))
        khung.paste(o, (le, le))
        khung.save(goc / f'{t}.png')
        khung.resize((384, max(1, round(384 * khung.height / khung.width))), Image.LANCZOS).save(web / f'{t}.webp', quality=86)
        print('xong', t, khung.size)
        continue
    canh = int(max(o.size) * 1.16)
    vuong = Image.new('RGBA', (canh, canh), (0, 0, 0, 0))
    vuong.paste(o, ((canh - o.width) // 2, (canh - o.height) // 2))
    vuong.resize((512, 512), Image.LANCZOS).save(goc / f'{t}.png')
    vuong.resize((256, 256), Image.LANCZOS).save(web / f'{t}.webp', quality=86)
    print('xong', t, o.size, f'{len(giu)} khoi')
