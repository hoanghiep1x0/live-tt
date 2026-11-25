"""Chiêu thức công pháp (C1–C9 mỗi tông): dọn ảnh đã cắt, xuất bản cho game và bản cho AI làm ảnh động.

python web/son-ha-tien-lo/cong-cu/chieu-cp.py <son|thuy> [C1,C4,...]

Đầu vào: `tranh-goc/chieu-cp-<tông>/C<n>-<tông>.png` (cắt từ tờ ChatGPT bằng `cat-luoi.py`, nền trong suốt).
Làm:
1. Dọn mảnh vụn của dải / ô bên cạnh lọt vào (khối liền nhỏ hơn 6% khối lớn nhất, hay chạm mép trên / dưới mà nhỏ
   hơn 20%), cắt sát, chừa lề 4%. Ghi đè bản gốc PNG (giữ đủ độ phân giải).
2. Bản cho game: `client/designs/tu-tien-son-ha/assets/chieu/<tông>-c<n>.webp`
   — chiêu bay (C1 C4 C5 C8 C9) rộng 640, giữ tỉ lệ, đầu chiêu ở bên PHẢI;
   — chiêu quanh người (C2 C3 C6 C7) vuông 448, vật ở giữa.
3. Bản cho AI làm ảnh động: `tranh-goc/chieu-cp-<tông>/nen-xam/C<n>-<tông>.png` — đặt lên nền xám phẳng #808080,
   khung 2:1 (chiêu bay) hay 1:1 (quanh người), cạnh chia hết cho 64; AI video không hiểu kênh alpha nên cần nền phẳng
   để tách lại sau (BiRefNet / rembg như `scripts/phong/tu-tien/yeu-dong/ghep_yeu.py`).
4. In điểm neo đầu chiêu (chỗ sáng nhất ở 15% bên phải) theo tỉ lệ 0..1 — ghi vào `chieu-cp/chieu.json`.
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

GOC = Path(__file__).resolve().parent.parent / 'tranh-goc'
GAME = Path(__file__).resolve().parents[3] / 'client/designs/tu-tien-son-ha/assets/chieu'
BAY = {1, 4, 5, 8, 9}

# Tên chiêu (khớp CONG_PHAP trong client/.../loi/tang-bao.ts) và lời tả chuyển động cho AI video (tiếng Anh — các AI
# ảnh → video theo sát hơn). Mọi lời tả ngầm hiểu: camera đứng yên, vật giữ nguyên chỗ và cỡ, nền xám phẳng giữ nguyên.
TEN = {
    'son': ['Sơn Ưng Tiễn', 'Thạch Bích Công', 'Linh Chi Quyết', 'Xuyên Vân Tiễn', 'Phá Sơn Liên Tiễn',
            'Tản Viên Hộ Thể', 'Mộc Linh Hồi Xuân', 'Đồng Cổ Lôi Tiễn', 'Sơn Thần Vạn Tiễn'],
    'thuy': ['Thủy Xà Thương', 'Thủy Mạc Công', 'Ngọc Châu Quyết', 'Xuyên Lãng Thương', 'Phá Lãng Thương Pháp',
             'Long Lân Hộ Thể', 'Hồi Xuân Thủy Pháp', 'Hải Long Lôi Thương', 'Thủy Thần Cuồng Lan'],
}
HE = ['Công', 'Thủ', 'Máu', 'Phá', 'Công', 'Thủ', 'Máu', 'Phá', 'Công']
DONG = {
    'son-c1': 'The golden spirit eagle beats its swept-back wings powerfully, feathers ripple, the energy trail streams and flickers backward to the left, small leaves and feathers drift off the trail. The arrow stays in place (in-place flight loop).',
    'son-c4': 'The drill arrow tip spins fast around its own axis, violet-white vortex rings rotate and slide backward along the shaft, the cloud tunnel churns and swirls, sparks at the tip. In-place flight loop.',
    'son-c5': 'Three arrows vibrate in flight, molten fire around them flows backward, broken rocks tumble and spin while drifting left and fading, glowing embers. In-place flight loop.',
    'son-c8': 'The bronze drum face pulses with light, concentric shockwave rings expand outward from it, lightning bolts crackle and re-form along the arrow, bright flash at the tip. Loop.',
    'son-c9': 'Hundreds of golden arrows shimmer and jitter as a swarm, the giant Lac bird shape flaps its wings once per loop, jade leaves swirl in the trail, divine light pulses. In-place flight loop.',
    'son-c2': 'The rock shield-wall rises up a little from the ground with dust, the engraved sun star and Lac birds glow brighter in a slow pulse, floating pebbles orbit slowly. Loop.',
    'son-c3': 'The lingzhi mushroom glows softly with a breathing pulse, green healing motes and sparkles rise continuously upward, leaves sway gently. Loop.',
    'son-c6': 'The translucent golden-jade dome shimmers with a sweeping light reflection, engraved drum rings rotate slowly, the two golden Lac birds circle around the dome. Loop.',
    'son-c7': 'Vines spiral upward around the sacred tree, flowers open, pink petals and fireflies float upward, emerald light rays pulse from the ring at its base. Loop.',
    'thuy-c1': 'The translucent water snake slithers and coils around the spear shaft, its head snaps forward beside the tip, water ribbons stream backward, bubbles drift off. In-place flight loop.',
    'thuy-c4': 'The spear spins on its axis, curling wave rings rotate and slide backward along the shaft like a vortex tunnel, foam sprays, violet glints. In-place flight loop.',
    'thuy-c5': 'Three silver spears glide on a crashing white-foam wave, the wave rolls and breaks continuously, spray and droplets fly backward. In-place flight loop.',
    'thuy-c8': 'The water serpent writhes around the lightning spear and roars, blue-violet bolts crackle and re-form along the trail, flashes at the spear tip. In-place flight loop.',
    'thuy-c9': 'The huge tidal wave rolls forward and curls, foam churns at its crest, the silver spears inside shimmer, the giant water serpent head roars and sways, pearls glint. In-place loop.',
    'thuy-c2': 'Crystal water falls continuously down the shield-shaped curtain, the sun star in the center pulses with light, droplets and bubbles rise, waves at the base ripple. Loop.',
    'thuy-c3': 'The clam shell opens slightly wider, the luminous pearl glows brighter in a breathing pulse, sparkling bubbles rise, water ribbons sway. Loop.',
    'thuy-c6': 'Light sweeps across the serpent-scale dome, scales shimmer one row after another, the water serpent on top slowly turns its head, base waves ripple. Loop.',
    'thuy-c7': 'The little waterfall pours continuously, the pool ripples in rings, the pink lotus opens and glows, petals and bubbles float upward with aqua light. Loop.',
}

tong = sys.argv[1]
ds = sys.argv[2].split(',') if len(sys.argv) > 2 else [f'C{i}' for i in range(1, 10)]
thu = GOC / f'chieu-cp-{tong}'
(thu / 'nen-xam').mkdir(exist_ok=True)
GAME.mkdir(parents=True, exist_ok=True)
so_tay = GOC / 'chieu-cp' / 'chieu.json'
so_tay.parent.mkdir(exist_ok=True)
so = json.loads(so_tay.read_text(encoding='utf-8')) if so_tay.exists() else {}


def don(im: Image.Image) -> Image.Image:
    a = np.array(im)
    A = a[:, :, 3]
    H, W = A.shape
    K = 4
    h, w = -(-H // K), -(-W // K)
    pad = np.zeros((h * K, w * K), np.uint8)
    pad[:H, :W] = A
    m = pad.reshape(h, K, w, K).max(axis=(1, 3)) > 24
    lab = np.zeros((h, w), np.int32)
    co = []  # (số điểm, chạm mép trên/dưới)
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
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1), (y - 1, x - 1), (y + 1, x + 1), (y - 1, x + 1), (y + 1, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    q.append((yy, xx))
        co.append((d, mep))
    lon = max(d for d, _ in co)
    giu = [n for n, (d, mep) in enumerate(co, 1) if d >= lon * (0.2 if mep else 0.06)]
    # Quầng mờ (alpha ≤ 24) quanh khối giữ lại: nở mặt nạ 2 ô.
    mg = np.isin(lab, giu)
    for _ in range(2):
        n2 = mg.copy()
        n2[1:] |= mg[:-1]
        n2[:-1] |= mg[1:]
        n2[:, 1:] |= mg[:, :-1]
        n2[:, :-1] |= mg[:, 1:]
        mg = n2
    mg = np.kron(mg, np.ones((K, K), bool))[:H, :W]
    a[:, :, 3] = np.where(mg, A, 0)
    o = Image.fromarray(a)
    hop = Image.fromarray(np.where(a[:, :, 3] > 24, 255, 0).astype(np.uint8)).getbbox()
    o = o.crop(hop)
    le = int(max(o.size) * 0.04)
    khung = Image.new('RGBA', (o.width + 2 * le, o.height + 2 * le), (0, 0, 0, 0))
    khung.paste(o, (le, le))
    return khung


def neo(im: Image.Image) -> tuple[float, float]:
    """Đầu chiêu: điểm sáng nhất (độ sáng × alpha) trong 15% bên phải."""
    a = np.asarray(im).astype(np.float32)
    sang = (a[:, :, :3].mean(axis=2) * a[:, :, 3] / 255)
    x0 = int(im.width * 0.85)
    vung = sang[:, x0:]
    y, x = np.unravel_index(int(np.argmax(vung)), vung.shape)
    return round((x + x0) / im.width, 3), round(y / im.height, 3)


def tron64(x: int) -> int:
    return -(-x // 64) * 64


for ma in ds:
    n = int(ma[1:])
    p = thu / f'{ma}-{tong}.png'
    if not p.exists():
        print('thiếu', p.name)
        continue
    im = don(Image.open(p).convert('RGBA'))
    bay = n in BAY
    if not bay:  # chiêu quanh người: ép vuông, vật ở giữa
        c = max(im.size)
        v = Image.new('RGBA', (c, c), (0, 0, 0, 0))
        v.paste(im, ((c - im.width) // 2, (c - im.height) // 2))
        im = v
    im.save(p)
    # Bản game.
    if bay:
        g = im.resize((640, max(1, round(640 * im.height / im.width))), Image.LANCZOS)
    else:
        g = im.resize((448, 448), Image.LANCZOS)
    g.save(GAME / f'{tong}-c{n}.webp', quality=88, method=4)
    # Bản nền xám cho AI video.
    if bay:
        W = tron64(int(im.width * 1.06))
        H = tron64(max(W // 2, int(im.height * 1.2)))
    else:
        W = H = tron64(int(im.width * 1.1))
    nen = Image.new('RGBA', (W, H), (128, 128, 128, 255))
    nen.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
    nen.convert('RGB').save(thu / 'nen-xam' / f'{ma}-{tong}.png')
    k = f'{tong}-c{n}'
    so[k] = {
        'ma': ma,
        'ten': TEN[tong][n - 1],
        'he': HE[n - 1],
        'loai': 'bay' if bay else 'quanh',
        'chuyen_dong': DONG[k],
        'goc': f'tranh-goc/chieu-cp-{tong}/{ma}-{tong}.png',
        'co_goc': list(im.size),
        'game': f'assets/chieu/{tong}-c{n}.webp',
        'co_game': list(g.size),
        'nen_xam': f'tranh-goc/chieu-cp-{tong}/nen-xam/{ma}-{tong}.png',
        'co_nen_xam': [W, H],
        'neo_dau': [float(v) for v in neo(im)] if bay else [0.5, 0.5],
    }
    print('xong', k, im.size, '→ game', g.size, '· nền xám', (W, H), '· neo', so[k]['neo_dau'])

so_tay.write_text(json.dumps(dict(sorted(so.items())), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
