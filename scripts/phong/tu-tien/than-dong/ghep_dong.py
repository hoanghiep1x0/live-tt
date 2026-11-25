"""Ghép khung MimicMotion (nền trắng) thành ảnh động WebP có alpha cho sân khấu.

  python ghep_dong.py <thư mục khung/> <ra.webp> [--tre 83] [--cao 1100]
Tách nền từng khung (rembg, venv ~/ai3d), cắt theo khung chung của mọi khung (người không nhảy chỗ), co về cao
--cao px, lưu WebP động lặp vô hạn, mỗi khung --tre ms (83 ≈ 12 khung/giây).
"""
import glob
import sys

from PIL import Image
from rembg import new_session, remove

a = sys.argv[1:]
vao, ra = a[0], a[1]
TRE = int(a[a.index('--tre') + 1]) if '--tre' in a else 83
CAO = int(a[a.index('--cao') + 1]) if '--cao' in a else 1100

ss = new_session('isnet-general-use')
ds = []
for f in sorted(glob.glob(f'{vao}/*.png')):
    ds.append(remove(Image.open(f).convert('RGB'), session=ss).convert('RGBA'))
    print('tach', f, flush=True)

hop = None
for im in ds:
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if bb is None:
        continue
    hop = bb if hop is None else (min(hop[0], bb[0]), min(hop[1], bb[1]), max(hop[2], bb[2]), max(hop[3], bb[3]))
ra_ds = []
for im in ds:
    k = im.crop(hop)
    ti = CAO / k.height
    ra_ds.append(k.resize((round(k.width * ti), CAO), Image.LANCZOS))
ra_ds[0].save(ra, save_all=True, append_images=ra_ds[1:], duration=TRE, loop=0, quality=70, method=3)
print('xong', ra, ra_ds[0].size, len(ra_ds))
