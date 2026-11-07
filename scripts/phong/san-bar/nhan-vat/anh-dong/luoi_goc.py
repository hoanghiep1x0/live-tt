"""Ghép 4 góc người nộm của một dáng thành tấm 2x2 (cắt sát người, cùng cỡ) làm mẫu cho ChatGPT."""
import sys
import numpy as np
from PIL import Image, ImageDraw
so = int(sys.argv[1])
for ten, gocs in (("A", (45, 90, 135, 180)), ("B", (225, 270, 315, 0))):
    anh = [Image.open(f"dang-g{g}/dang_{so:02d}.png" if g else f"dang/dang_{so:02d}.png").convert("RGB") for g in gocs]
    # khung cắt chung cho cả 4: giữ tỉ lệ cỡ người giữa các góc
    m = np.zeros(np.asarray(anh[0]).shape[:2], bool)
    for a in anh:
        m |= np.asarray(a.convert("L")) < 235
    ys, xs = np.nonzero(m)
    cy0, cy1 = ys.min() - 30, ys.max() + 30
    cx = (xs.min() + xs.max()) // 2
    h = cy1 - cy0; w = int(h * 0.75)
    o = [a.crop((cx - w // 2, cy0, cx + w // 2, cy1)).resize((540, 720)) for a in anh]
    t = Image.new("RGB", (1080, 1440), "white")
    for i, x in enumerate(o):
        t.paste(x, ((i % 2) * 540, (i // 2) * 720))
    ImageDraw.Draw(t).line([(540, 0), (540, 1440)], fill=(170, 170, 170), width=3)
    ImageDraw.Draw(t).line([(0, 720), (1080, 720)], fill=(170, 170, 170), width=3)
    t.save(f"luoi/{ten}_{so:02d}.png")
