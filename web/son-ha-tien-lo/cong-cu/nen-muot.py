"""Video nền ChatGPT (5 giây, 15 khung/giây) → nền động mượt cho game: 30 khung/giây, lặp liền.

python web/son-ha-tien-lo/cong-cu/nen-muot.py [id màn …] [--hoa 0.8]

Không ghi id thì làm mọi bản gốc `tranh-goc/nen-dong/<id>.mp4`, TRỪ màn đã có bản Muse (`tranh-goc/nen-dong/muse/<id>.mp4`
— bản đó làm bằng `nen-muse.py`, đừng ghi đè).

Vì sao: 15 khung/giây nhìn rõ từng nấc (nước, mây giật giật), và bản ChatGPT không nối vòng — hết 5 giây nền nhảy một cái
(người vận hành: "màn hình nó cứ bị giật giật nền").

1. Chèn khung bù chuyển động lên 30 khung/giây (minterpolate), bản trung gian không mất dữ liệu.
2. Lặp liền, KHÔNG chạy ngược: bỏ `--hoa` giây đầu, hoà `--hoa` giây cuối vào chính đoạn đầu vừa bỏ, trọng số tăng tới
   ĐÚNG 1 ở khung cuối → khung cuối ra = khung liền trước khung đầu ra. Dài = gốc − hoà (5 giây → 4,1 giây).
3. H.264 yuv420p, faststart, không tiếng → `client/designs/tu-tien-son-ha/assets/nen/<id>-dong.mp4`. Luôn đọc từ bản gốc
   nên chạy lại bao lần cũng ra cùng kết quả, không làm chồng.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg

a = sys.argv[1:]
HOA = float(a[a.index('--hoa') + 1]) if '--hoa' in a else 0.8
ids = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or a[i - 1] != '--hoa')]
FF = imageio_ffmpeg.get_ffmpeg_exe()
GOC = Path(__file__).resolve().parent.parent / 'tranh-goc' / 'nen-dong'
GAME = Path(__file__).resolve().parents[3] / 'client/designs/tu-tien-son-ha/assets/nen'
FPS = 30


def chay(*args):
    subprocess.run([FF, '-y', '-loglevel', 'error', *args], check=True)


def so_khung(p: Path) -> int:
    r = subprocess.run([FF, '-i', str(p), '-map', '0:v', '-c', 'copy', '-f', 'null', '-'], capture_output=True, text=True)
    dong = [x for x in r.stderr.replace('\r', '\n').split('\n') if x.startswith('frame=')]
    return int(dong[-1].split('=')[1].split()[0])


if not ids:
    muse = {p.stem for p in (GOC / 'muse').glob('*.mp4') if not p.stem.endswith(('-cham', '-lap'))}
    ids = sorted(p.stem for p in GOC.glob('*.mp4') if p.stem not in muse)

for idn in ids:
    vao = GOC / f'{idn}.mp4'
    with tempfile.TemporaryDirectory() as tam:
        ns = Path(tam) / 'ns.mkv'
        chay('-i', str(vao), '-an', '-vf',
             f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p',
             '-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast', str(ns))
        N = so_khung(ns)
        K = min(round(HOA * FPS), N // 4)  # số khung hoà
        S = N - 2 * K  # khung (trong bản ra) bắt đầu hoà
        loc = (f'[0:v]split[s1][s2];'
               f'[s1]trim=start_frame={K},setpts=PTS-STARTPTS[a];'
               f'[s2]trim=end_frame={K},setpts=PTS-STARTPTS,tpad=start={S}:start_mode=clone[b];'
               f"[a][b]blend=all_expr='A+(B-A)*clip((N-{S})/({K}-1)\\,0\\,1)',format=yuv420p[v]")
        ra = GAME / f'{idn}-dong.mp4'
        chay('-i', str(ns), '-filter_complex', loc, '-map', '[v]', '-frames:v', str(N - K), '-r', str(FPS), '-an',
             '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', str(ra))
    print('xong', idn, f'{N - K} khung = {(N - K) / FPS:.1f} s', f'{ra.stat().st_size / 1048576:.1f} MB', '->', ra.name)
