"""Làm ảnh vuông 256 cho bảng (anh/vp/<mã>.webp) từ bản gốc con vật: python vuong-icon.py <gốc.png> <mã>"""
import sys
from pathlib import Path
from PIL import Image
GOC = Path(__file__).resolve().parent.parent
im = Image.open(sys.argv[1]).convert('RGBA')
c = int(max(im.size) * 1.04)
v = Image.new('RGBA', (c, c), (0, 0, 0, 0))
v.paste(im, ((c - im.width) // 2, (c - im.height) // 2))
v.resize((256, 256), Image.LANCZOS).save(GOC / f'anh/vp/{sys.argv[2]}.webp', quality=86)
print('xong', sys.argv[2])
