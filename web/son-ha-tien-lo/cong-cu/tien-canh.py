"""Tách lớp TIỀN CẢNH từ chính tranh nền một màn (vật ở gần: san hô, đèn, lá, đá góc…) → nen/<id>-truoc.webp.

python cong-cu/tien-canh.py <tranh nền 1024×1536> <id màn> "x,y x,y x,y …" ["x,y …" …] [--mem 9]

Mỗi chuỗi điểm là một đa giác (toạ độ trên tranh gốc) ôm vật ở gần; vẽ rộng tay một chút cũng được — phần sàn lẫn vào
trùng khít điểm ảnh với nền bên dưới nên không lộ. --mem: độ mờ viền (px). Ra ảnh RGBA cùng khổ tranh nền, game đặt
đè lên lớp nhân vật và cho trôi lệch tốc độ (thị sai). Kèm ảnh soát tranh-goc/nhieu-lop/<id>-truoc-soat.jpg (tiền cảnh trên nền đỏ).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

a = sys.argv[1:]
mem = float(a[a.index('--mem') + 1]) if '--mem' in a else 9.0
diem = [x for i, x in enumerate(a[2:], 2) if x != '--mem' and a[i - 1] != '--mem']
im = Image.open(a[0]).convert('RGBA')
m = Image.new('L', im.size, 0)
d = ImageDraw.Draw(m)
for chuoi in diem:
    d.polygon([tuple(float(v) for v in p.split(',')) for p in chuoi.split()], fill=255)
im.putalpha(m.filter(ImageFilter.GaussianBlur(mem)))
GAME = Path(__file__).resolve().parents[3] / 'client/designs/tu-tien-son-ha/assets/nen'
ra = GAME / f'{a[1]}-truoc.webp'
im.save(ra, quality=88, method=6)
soat = Image.new('RGBA', im.size, (200, 30, 30, 255))
soat.alpha_composite(im)
SOAT = Path(__file__).resolve().parent.parent / 'tranh-goc' / 'nhieu-lop'
SOAT.mkdir(parents=True, exist_ok=True)
soat.convert('RGB').resize((im.width // 2, im.height // 2)).save(SOAT / f'{a[1]}-truoc-soat.jpg', quality=85)
print('xong', ra, f'{ra.stat().st_size // 1024} KB')
