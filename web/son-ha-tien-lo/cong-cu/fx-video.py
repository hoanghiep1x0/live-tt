"""Video HIỆU ỨNG nền đen (Muse) → WebM VP9 có kênh trong suốt, để đặt đè lên nhân vật / nền mà không cần mix-blend-mode.

python cong-cu/fx-video.py <vào.mp4> <ra.webm> [--toc 1] [--canh 600] [--crf 36] [--lap] [--den 18]

Muse làm hiệu ứng (biến trang, khí xoáy, cột sáng, lửa, khiên, hồn hỏa, hào quang, binh khí hiện hình…) trên nền ĐEN THUẦN.
Kênh alpha lấy theo độ sáng: điểm càng sáng càng đặc, đen là trong suốt; màu được "bỏ nhân trước" (chia cho alpha) nên
khi trình duyệt chồng lên lại đúng độ rực như trên nền đen. --den: ngưỡng đen (dưới mức này coi là nền). Cắt sát vùng có
hiệu ứng (gộp mọi khung), thu về cạnh dài --canh. --lap: hoà 1 giây đuôi vào đầu cho hiệu ứng lặp (hào quang, lửa);
mặc định chạy một lần (biến trang, cột sáng…). Kèm <ra>.png là khung sáng nhất để soát.
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


vao, ra = a[0], Path(a[1])
toc, canh, crf, den = lay('--toc', 1.0), lay('--canh', 600), lay('--crf', 36), lay('--den', 18)
lap = '--lap' in a
nguon = vao
if toc != 1.0:
    nguon = str(ra.with_name(ra.stem + '-cham.mp4'))
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', vao, '-an', '-vf',
                    f'setpts=PTS/{toc},minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1,format=yuv420p',
                    '-c:v', 'libx264', '-crf', '14', str(nguon)], check=True)


def khoa(f):
    x = f.astype(np.float32)
    s = x.max(axis=2)
    al = np.clip((s - den) / (255.0 - den), 0, 1) ** 0.85
    mau = np.where(al[..., None] > 0.004, np.clip(x / np.maximum(al[..., None], 0.004), 0, 255), 0)
    return np.dstack([mau, al * 255]).round().astype(np.uint8)


r = imageio_ffmpeg.read_frames(nguon)
m = next(r)
W, H = m['size']
bao, so, sang, khung_sang = None, 0, -1, None
for i, f in enumerate(r):
    so += 1
    x = np.frombuffer(f, np.uint8).reshape(H, W, 3)
    s = x.max(axis=2)
    if s.mean() > sang:
        sang, khung_sang = s.mean(), i
    if i % 3:
        continue
    ys, xs = np.nonzero(s > den + 20)
    if len(xs):
        o = (xs.min(), ys.min(), xs.max(), ys.max())
        bao = o if bao is None else (min(bao[0], o[0]), min(bao[1], o[1]), max(bao[2], o[2]), max(bao[3], o[3]))
le = 12
x0, y0, x1, y1 = max(0, bao[0] - le), max(0, bao[1] - le), min(W, bao[2] + le), min(H, bao[3] + le)
cw, ch = x1 - x0, y1 - y0
k = min(1.0, canh / max(cw, ch))
ow, oh = (round(cw * k) // 2) * 2, (round(ch * k) // 2) * 2
K = min(24, so // 4) if lap else 0
enc = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{ow}x{oh}', '-r', '24', '-i', '-',
                        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', str(crf), '-row-mt', '1', '-deadline', 'good',
                        '-cpu-used', '3', '-auto-alt-ref', '0', '-an', str(ra)], stdin=subprocess.PIPE)
dau = []
r = imageio_ffmpeg.read_frames(nguon)
next(r)
for i, f in enumerate(r):
    x = khoa(np.frombuffer(f, np.uint8).reshape(H, W, 3)[y0:y1, x0:x1])
    if (ow, oh) != (cw, ch):
        x = np.asarray(Image.fromarray(x, 'RGBA').resize((ow, oh), Image.LANCZOS))
    if i == khung_sang:
        Image.fromarray(x, 'RGBA').save(ra.with_suffix('.png'))
    if i < K:
        dau.append(x)
        continue
    if K and i >= so - K:
        j = i - (so - K)
        w = (j + 1) / K
        x = (x.astype(np.float32) * (1 - w) + dau[j].astype(np.float32) * w).round().astype(np.uint8)
    enc.stdin.write(x.tobytes())
enc.stdin.close()
enc.wait()
print('xong', ra.name, f'{ow}×{oh}', f'{(so - K) / 24:.1f} s', f'{ra.stat().st_size / 1048576:.2f} MB', f'khung cắt ({x0},{y0})–({x1},{y1}) trên {W}×{H}', '(lặp)' if lap else '(một lần)')
