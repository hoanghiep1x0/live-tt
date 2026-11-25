"""Video nhân vật nền trong suốt cho Sơn Hà (người vận hành 2026-11-23: chuyển động nhân vật làm bằng VIDEO, không ảnh động).

Hai bước, chạy trong web/son-ha-tien-lo, đặt PYTHONIOENCODING=utf-8:

  python cong-cu/nv-video.py xanh <tranh nền trong suốt> <ra.png>
      Đặt tranh nhân vật (WebP/PNG có alpha) lên nền XANH LÁ THUẦN #00FF00 khổ 1024×1536 (2:3, đúng khổ Muse trả về),
      nhân vật rộng ~92%, hơi lệch xuống. Ảnh này đưa cho Muse làm video.

  python cong-cu/nv-video.py tach <video Muse nền xanh.mp4> <ra.webm> [--toc 0.6] [--vong 2] [--mot-lan] [--canh 600] [--crf 38]
      1. Làm chậm còn --toc (mặc định 0,6, cùng nhịp với nền động) + chèn khung bù chuyển động 24 khung/giây.
      2. Tách nền xanh từng khung: alpha theo độ "trội xanh" G − max(R, B), khử ám xanh ở viền (despill).
      3. Cắt sát khung bao nhân vật (gộp mọi khung, chừa lề), thu về cạnh dài --canh (mặc định 600; nhân vật trên màn rộng ~580 px).
      4. Lặp liền: hoà --vong giây cuối vào đầu (khung cuối nối khung đầu, KHÔNG chạy ngược). --mot-lan: động tác chạy một
         lần (công / thủ / hồi) thì không nối vòng.
      5. Xuất WebM VP9 yuva420p (có kênh trong suốt) + ảnh khung đầu <ra>.png để soát.
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image

FF = imageio_ffmpeg.get_ffmpeg_exe()
a = sys.argv[1:]


def lay(ten, mac):
    return type(mac)(a[a.index(ten) + 1]) if ten in a else mac


def xanh(vao: str, ra: str):
    im = Image.open(vao).convert('RGBA')
    c = Image.new('RGBA', (1024, 1536), (0, 255, 0, 255))
    w = 940
    h = round(im.height * w / im.width)
    if h > 1400:
        h, w = 1400, round(im.width * 1400 / im.height)
    c.alpha_composite(im.resize((w, h), Image.LANCZOS), ((1024 - w) // 2, (1536 - h) // 2 + 60))
    c.convert('RGB').save(ra)
    print('xong nền xanh →', ra)


def khoa(f: np.ndarray) -> np.ndarray:
    """RGB uint8 → RGBA uint8: tách nền xanh + khử ám xanh."""
    x = f.astype(np.int16)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    troi = g - np.maximum(r, b)
    # troi ≤ 35: chắc chắn là nhân vật (kể cả dải lụa xanh ngọc G≈B); ≥ 110: chắc chắn là nền.
    al = np.clip((110 - troi) / 75.0, 0, 1)
    # Khử ám xanh: phần xanh trội hơn max(R, B) bị cắt ở vùng viền / nửa trong suốt.
    vien = (al < 0.999) | (troi > 30)
    g2 = np.where(vien, np.minimum(g, np.maximum(r, b) + 12), g)
    ra = np.stack([r, g2, b, (al * 255).round()], -1)
    return np.clip(ra, 0, 255).astype(np.uint8)


def tach(vao: str, ra: str):
    toc, vong, canh, crf = lay('--toc', 0.6), lay('--vong', 2.0), lay('--canh', 600), lay('--crf', 38)
    mot_lan = '--mot-lan' in a
    ra_p = Path(ra)
    cham = ra_p.with_name(ra_p.stem + '-cham.mp4')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', vao, '-an', '-vf',
                    f'setpts=PTS/{toc},minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1,format=yuv420p',
                    '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', str(cham)], check=True)

    # Lượt 1: khung bao nhân vật gộp mọi khung (đọc thưa cho nhanh).
    r = imageio_ffmpeg.read_frames(str(cham))
    m = next(r)
    W, H = m['size']
    bao = None
    so = 0
    for i, f in enumerate(r):
        so += 1
        if i % 6:
            continue
        al = khoa(np.frombuffer(f, np.uint8).reshape(H, W, 3))[..., 3] > 24
        ys, xs = np.nonzero(al)
        if len(xs) == 0:
            continue
        o = (xs.min(), ys.min(), xs.max(), ys.max())
        bao = o if bao is None else (min(bao[0], o[0]), min(bao[1], o[1]), max(bao[2], o[2]), max(bao[3], o[3]))
    le = 16
    x0, y0 = max(0, bao[0] - le), max(0, bao[1] - le)
    x1, y1 = min(W, bao[2] + le), min(H, bao[3] + le)
    cw, ch = x1 - x0, y1 - y0
    k = min(1.0, canh / max(cw, ch))
    ow, oh = (round(cw * k) // 2) * 2, (round(ch * k) // 2) * 2
    K = 0 if mot_lan else min(round(vong * 24), so // 3)
    N = so

    enc = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{ow}x{oh}', '-r', '24', '-i', '-',
                            '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', str(crf), '-row-mt', '1', '-deadline', 'good',
                            '-cpu-used', '3', '-auto-alt-ref', '0', '-an', str(ra_p)], stdin=subprocess.PIPE)

    def lam(f):
        x = khoa(np.frombuffer(f, np.uint8).reshape(H, W, 3)[y0:y1, x0:x1])
        return np.asarray(Image.fromarray(x, 'RGBA').resize((ow, oh), Image.LANCZOS)) if k < 1 or (ow, oh) != (cw, ch) else x

    dau = []
    r = imageio_ffmpeg.read_frames(str(cham))
    next(r)
    dau_png = None
    for i, f in enumerate(r):
        x = lam(f)
        if i < K:  # K khung đầu: giữ lại để hoà vào đuôi, chưa ghi.
            dau.append(x)
            continue
        if K and i >= N - K:  # K khung cuối: hoà dần sang đúng K khung đầu (trọng số tới 1 ở khung cuối).
            j = i - (N - K)
            w = (j + 1) / K
            x = (x.astype(np.float32) * (1 - w) + dau[j].astype(np.float32) * w).round().astype(np.uint8)
        if dau_png is None:
            dau_png = x
        enc.stdin.write(x.tobytes())
    enc.stdin.close()
    enc.wait()
    Image.fromarray(dau_png, 'RGBA').save(ra_p.with_suffix('.png'))
    giay = (N - K) / 24
    print('xong', ra_p.name, f'{ow}×{oh}', f'{giay:.1f} s', f'{ra_p.stat().st_size / 1048576:.2f} MB', '(nối vòng)' if K else '(một lần)')


if a and a[0] == 'xanh':
    xanh(a[1], a[2])
elif a and a[0] == 'tach':
    tach(a[1], a[2])
else:
    sys.exit(__doc__)
