"""Ghép khung FramePack của yêu tinh thành WebP động có alpha cho sân khấu.

  python ghep_yeu.py <thư mục khung/> <ra.webp> [--buoc 2] [--co 640] [--kieu lap|mot] [--mo birefnet-general] [--cl 50]

- Tách nền từng khung bằng rembg (BiRefNet: giữ cả sóng, lửa, đá; isnet hay cắt mất).
- `--buoc 2`: lấy mỗi khung thứ hai (30 → 15 khung/giây).
- `--kieu lap` (đứng thở, Cuồng Bạo): đi rồi về (khung 0…N…1) để lặp không giật.
  `--kieu mot` (ra chiêu, trúng đòn): đi rồi về nhanh gấp đôi, khung cuối khớp khung đầu để nối lại dáng đứng.
- Cắt theo khung chung của mọi khung (con vật không nhảy chỗ), đặt vào khung vuông `--co` (chạm mép dưới).
Chạy trong venv có rembg (hpc: ~/ai3d/venv), U2NET_HOME trỏ vào thư mục mô hình trong .tmp.
"""
import glob
import sys

from PIL import Image
from rembg import new_session, remove

a = sys.argv[1:]
vao, ra = a[0], a[1]
BUOC = int(a[a.index('--buoc') + 1]) if '--buoc' in a else 2
CO = int(a[a.index('--co') + 1]) if '--co' in a else 640
KIEU = a[a.index('--kieu') + 1] if '--kieu' in a else 'lap'
MO = a[a.index('--mo') + 1] if '--mo' in a else 'birefnet-general'
CL = int(a[a.index('--cl') + 1]) if '--cl' in a else 50
TRE = 1000 // (30 // BUOC)

ss = new_session(MO)
ds = []
for f in sorted(glob.glob(f'{vao}/*.png'))[::BUOC]:
    ds.append(remove(Image.open(f).convert('RGB'), session=ss).convert('RGBA'))
    print('tach', f, flush=True)

hop = None
for im in ds:
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if bb is not None:
        hop = bb if hop is None else (min(hop[0], bb[0]), min(hop[1], bb[1]), max(hop[2], bb[2]), max(hop[3], bb[3]))
ti = min(CO / (hop[2] - hop[0]), CO / (hop[3] - hop[1]))
khung = []
for im in ds:
    k = im.crop(hop)
    k = k.resize((round(k.width * ti), round(k.height * ti)), Image.LANCZOS)
    o = Image.new('RGBA', (CO, CO), (0, 0, 0, 0))
    o.alpha_composite(k, ((CO - k.width) // 2, CO - k.height))
    khung.append(o)

if KIEU == 'lap':
    chuoi = khung + khung[-2:0:-1]
    tre = [TRE] * len(chuoi)
else:
    ve = khung[-2::-2]
    chuoi = khung + ve
    tre = [TRE] * len(khung) + [TRE] * len(ve)
chuoi[0].save(ra, save_all=True, append_images=chuoi[1:], duration=tre, loop=0, quality=CL, alpha_quality=60, method=4, minimize_size=True)
print('xong', ra, len(chuoi), 'khung')
