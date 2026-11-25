"""Lưu một ảnh con vật (ChatGPT, nền trong suốt) thành bản gốc cho game + bản web.

python web/son-ha-tien-lo/cong-cu/luu-thu.py <vào.png> <tên>

- Bản gốc: tranh-goc/thu/<tên>.png — giữ nguyên độ phân giải, cắt sát rồi chừa lề 4% (để rig / làm ảnh động sau).
- Bản web: anh/vp/thu-<tên>.webp — cao 420px.
"""
import sys
from pathlib import Path
from PIL import Image

GOC = Path(__file__).resolve().parent.parent
vao, ten = sys.argv[1], sys.argv[2]
im = Image.open(vao).convert('RGBA')
hop = im.split()[3].point(lambda v: 255 if v > 20 else 0).getbbox()
im = im.crop(hop)
le = int(max(im.size) * 0.04)
khung = Image.new('RGBA', (im.width + 2 * le, im.height + 2 * le), (0, 0, 0, 0))
khung.paste(im, (le, le))
(GOC / 'tranh-goc/thu').mkdir(parents=True, exist_ok=True)
(GOC / 'anh/vp').mkdir(parents=True, exist_ok=True)
khung.save(GOC / f'tranh-goc/thu/{ten}.png')
cao = 420
khung.resize((round(khung.width * cao / khung.height), cao), Image.LANCZOS).save(GOC / f'anh/vp/thu-{ten}.webp', quality=86)
print('xong', ten, khung.size)
