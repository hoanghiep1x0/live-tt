"""Video nền Muse → nền động cho game: chậm lại cho khớp nhịp game, lặp liền mà nước vẫn chảy xuôi.

python web/son-ha-tien-lo/cong-cu/nen-muse.py <vào.mp4> <id màn> [--toc 0.6] [--hoa 2]

1. Làm chậm còn `--toc` (mặc định 0,6) tốc độ, chèn khung bù chuyển động (minterpolate, giữ 24 khung/giây) cho khỏi giật.
2. Lặp liền KHÔNG chạy ngược (chạy ngược làm thác chảy lên — người vận hành chê): cắt bỏ `--hoa` giây đầu, rồi hoà
   `--hoa` giây cuối vào chính đoạn đầu vừa cắt → khung cuối nối đúng khung đầu. Dài = (gốc / tốc) − hoà.
3. H.264 yuv420p, faststart, không tiếng → `client/designs/tu-tien-son-ha/assets/nen/<id>-dong.mp4`; bản chậm giữ ở
   `tranh-goc/nen-dong/muse/<id>-cham.mp4`.
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

a = sys.argv[1:]
vao, idn = Path(a[0]), a[1]
TOC = float(a[a.index('--toc') + 1]) if '--toc' in a else 0.6
HOA = float(a[a.index('--hoa') + 1]) if '--hoa' in a else 2.0
FF = imageio_ffmpeg.get_ffmpeg_exe()
GOC = Path(__file__).resolve().parent.parent / 'tranh-goc' / 'nen-dong' / 'muse'
GAME = Path(__file__).resolve().parents[3] / 'client/designs/tu-tien-son-ha/assets/nen'
GOC.mkdir(parents=True, exist_ok=True)
cham = GOC / f'{idn}-cham.mp4'


def chay(*args):
    subprocess.run([FF, '-y', '-loglevel', 'error', *args], check=True)


def dai(p: Path) -> float:
    r = imageio_ffmpeg.read_frames(str(p))
    m = next(r)
    r.close()
    return float(m['duration'])


chay('-i', str(vao), '-an', '-vf', f'setpts=PTS/{TOC},minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1,format=yuv420p',
     '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', str(cham))
N = round(dai(cham) * 24)  # số khung bản chậm
K = round(HOA * 24)  # số khung hoà
# Đếm theo khung cho khớp tuyệt đối: a = khung [K, N), b = khung [0, K]; hoà b vào K khung cuối của a theo trọng số
# tăng dần tới ĐÚNG 1 ở khung cuối → khung cuối ra = khung K−1… đúng liền trước khung đầu ra (khung K).
loc = (f'[0:v]split[s1][s2];'
       f'[s1]trim=start_frame={K},setpts=PTS-STARTPTS[a];'
       f'[s2]trim=end_frame={K},setpts=PTS-STARTPTS,tpad=start={N - 2 * K}:start_mode=clone[b];'
       f"[a][b]blend=all_expr='if(lt(N\\,{N - 2 * K})\\,A\\,A+(B-A)*(N-{N - 2 * K}+1)/{K})',format=yuv420p[v]")
ra = GAME / f'{idn}-dong.mp4'
chay('-i', str(cham), '-filter_complex', loc, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium',
     '-movflags', '+faststart', str(ra))
print('xong', idn, f'chậm {TOC}×', f'{dai(ra):.1f} s', f'{ra.stat().st_size / 1048576:.1f} MB', '→', ra)
