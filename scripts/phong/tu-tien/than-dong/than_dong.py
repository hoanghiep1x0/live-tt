"""Hoạt ảnh khung thật cho tranh thần (Sơn Tinh / Thủy Tinh) bằng MimicMotion — không cần điệu Mixamo.

Lấy khung xương (DWPose) của chính tranh, rồi tự dựng chuỗi dáng "xuất chưởng" từ khung xương đó: tay chưởng kéo về
ngực lấy đà → tung thẳng ra xa hơn dáng gốc → giữ, rung lực → thu về dáng gốc; thân ngả theo, đầu nhún, tay cầm
gậy đung đưa nhẹ. MimicMotion vẽ tranh theo chuỗi dáng đó → video khung thật (áo, tóc, hào quang chuyển động thật).

Chạy trong thư mục MimicMotion, bằng venv của MimicMotion (hpc):
  python than_dong.py <tranh.png> <thư mục ra> [--so 48] [--res 576] [--chi-xuong]
--chi-xuong: chỉ vẽ khung xương ra <ra>/xuong/*.png để soát, không chạy mô hình (nhanh, không cần GPU nhiều).
Ra: <ra>/xuong/NN.png (khung xương), <ra>/ra.mp4 + <ra>/khung/NN.png (tranh động, nền trắng).
"""
import copy
import math
import os
import sys

import numpy as np
import torch
from PIL import Image

a = sys.argv[1:]
src, ra = a[0], a[1]
SO = int(a[a.index('--so') + 1]) if '--so' in a else 48
RES = int(a[a.index('--res') + 1]) if '--res' in a else 576
CHI_XUONG = '--chi-xuong' in a
# Động tác: chuong (tung chưởng), chem (vung tay qua đầu chém xuống), bung (thu khí về ngực, hạ người, bung hai tay).
DONG = a[a.index('--dong') + 1] if '--dong' in a else 'chuong'
os.makedirs(f'{ra}/xuong', exist_ok=True)

from mimicmotion.dwpose.dwpose_detector import dwpose_detector as dw  # noqa: E402
from mimicmotion.dwpose.util import draw_pose  # noqa: E402

# Tranh có nền trong → nền trắng, đệm trên dưới cho đúng khung 9:16 của MimicMotion (không cắt mất gậy, tay).
im = Image.open(src).convert('RGBA')
W = RES
H = int(RES * 16 / 9) // 64 * 64
ti = min(W / im.width, H / im.height)
nho = im.resize((round(im.width * ti), round(im.height * ti)), Image.LANCZOS)
nen = Image.new('RGBA', (W, H), (255, 255, 255, 255))
nen.alpha_composite(nho, ((W - nho.width) // 2, H - nho.height))
anh = np.array(nen.convert('RGB'))
Image.fromarray(anh).save(f'{ra}/ref.png')

goc = dw(anh)
c = goc['bodies']['candidate']  # 18×2, toạ độ chuẩn hoá 0..1
sub = goc['bodies']['subset']
print('so nguoi', len(sub), 'diem than', int((sub[0] >= 0).sum()) if len(sub) else 0)
for i, (x, y) in enumerate(c[:18]):
    print(i, round(float(x), 3), round(float(y), 3), sub[0][i] if len(sub) else '-')

# Tay chưởng = tay có cổ tay xa vai nhất (OpenPose: 2/3/4 vai-khuỷu-cổ tay phải, 5/6/7 trái).
def xa(v, t):
    return float(np.hypot(*(c[t] - c[v])))
phai = xa(2, 4) >= xa(5, 7)
VAI, KHUYU, CO = (2, 3, 4) if phai else (5, 6, 7)
VAI2, KHUYU2, CO2 = (5, 6, 7) if phai else (2, 3, 4)
TAY = 1 if phai else 0  # hands[0] ~ tay trái người, hands[1] ~ tay phải (theo DWPose)
huong = np.sign(c[CO][0] - c[VAI][0]) or 1.0  # chưởng hướng về phía nào trên màn
print('tay chuong', 'phai' if phai else 'trai', 'huong', huong)

def em(x):  # nhịp mượt 0..1
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, x)))

def dang(t):
    """t: 0..1 một vòng chiêu. Trả về (lấy đà, tung) 0..1."""
    if t < 0.30:
        return em(t / 0.30), 0.0               # kéo tay về lấy đà
    if t < 0.42:
        k = em((t - 0.30) / 0.12)
        return 1 - k, k                         # tung chưởng (nhanh)
    if t < 0.70:
        return 0.0, 1.0                         # giữ chưởng
    return 0.0, 1 - em((t - 0.70) / 0.30)       # thu về

def em2(x):
    return em(x)


def pha3(t, a, b):
    """0..1 trong đoạn [a, b] của vòng (mượt), ngoài đoạn thì kẹp."""
    return em((t - a) / (b - a))


khung = []
for f in range(SO):
    t = f / SO
    p = copy.deepcopy(goc)
    cc = p['bodies']['candidate']
    v = c[VAI].copy()
    v2 = c[VAI2].copy()
    co = c[1].copy()  # cổ
    lech = np.zeros(2)
    if DONG == 'chuong':
        da, tung = dang(t)
        nguc = (c[1] + c[VAI]) / 2 + np.array([0.0, 0.05])
        cc[CO] = c[CO] + (nguc - c[CO]) * da + (c[CO] - v) * 0.25 * tung
        cc[KHUYU] = c[KHUYU] + (v + np.array([0.02 * huong, 0.09]) - c[KHUYU]) * da + (c[KHUYU] - v) * 0.15 * tung
        lech = np.array([huong * (-0.03 * da + 0.035 * tung), 0.012 * da - 0.006 * tung])
        cc[VAI] = cc[VAI] + np.array([0.02 * huong * tung, 0.0])
    elif DONG == 'chem':
        # Giơ tay chém lên cao trên đầu (lấy đà) → chém chéo xuống phía trước thấp → thu về.
        len_ = pha3(t, 0.0, 0.32)
        chem = pha3(t, 0.32, 0.46)
        ve = pha3(t, 0.62, 1.0)
        tren = v + np.array([0.02 * huong, -0.30])
        duoi = v + np.array([0.24 * huong, 0.20])
        dich = c[CO] + (tren - c[CO]) * len_
        dich = dich + (duoi - dich) * chem
        dich = dich + (c[CO] - dich) * ve
        cc[CO] = dich
        cc[KHUYU] = (v + dich) / 2 + np.array([-0.03 * huong, -0.02 * len_ * (1 - chem)])
        lech = np.array([huong * (-0.025 * len_ * (1 - chem) + 0.04 * chem * (1 - ve)), -0.01 * len_ * (1 - chem) + 0.015 * chem * (1 - ve)])
    elif DONG in ('vu', 'dam'):
        # Đòn VŨ KHÍ bằng tay cầm vũ khí (tay còn lại): 'vu' — giơ vũ khí quá đầu rồi giáng mạnh chéo về phía địch;
        # 'dam' — thu vũ khí ra sau rồi đâm thẳng tới ngang ngực. Thân ngả lấy đà rồi dồn tới theo đòn.
        da = pha3(t, 0.0, 0.34)
        ra_ = pha3(t, 0.34, 0.48)
        ve = pha3(t, 0.66, 1.0)
        if DONG == 'vu':
            dau = v2 + np.array([-0.04 * huong, -0.32])
            cuoi = co + np.array([0.14 * huong, 0.24])
        else:
            dau = v2 + np.array([-0.16 * huong, 0.04])
            cuoi = co + np.array([0.18 * huong, 0.08])
        dich = c[CO2] + (dau - c[CO2]) * da
        dich = dich + (cuoi - dich) * ra_
        dich = dich + (c[CO2] - dich) * ve
        cc[CO2] = dich
        cc[KHUYU2] = (v2 + dich) / 2 + np.array([-0.03 * huong, 0.03 if DONG == 'dam' else -0.02 * da * (1 - ra_)])
        # Tay kia thu nhẹ về hông cho cân thế.
        # Tay kia giữ thế mở, chỉ hạ nhẹ cho cân (không chụm vào ngực kẻo vẽ rối).
        cc[CO] = c[CO] + np.array([0.0, 0.05]) * (da + ra_) * (1 - ve)
        cc[KHUYU] = c[KHUYU] + np.array([0.0, 0.03]) * (da + ra_) * (1 - ve)
        lech = np.array([huong * (-0.03 * da * (1 - ra_) + 0.045 * ra_ * (1 - ve)), -0.008 * da * (1 - ra_) + 0.012 * ra_ * (1 - ve)])
    else:  # bung
        # Thu hai tay về ngực, hạ người (lấy khí) → bung hai tay dang rộng, ngửa người → thu về.
        thu = pha3(t, 0.0, 0.38) * (1 - pha3(t, 0.42, 0.5))
        bung = pha3(t, 0.42, 0.52) * (1 - pha3(t, 0.7, 1.0))
        nguc = co + np.array([0.0, 0.07])
        for VA, KH, CT, h in ((VAI, KHUYU, CO, huong), (VAI2, KHUYU2, CO2, -huong)):
            vv = c[VA]
            rong = vv + np.array([0.30 * h, -0.10])
            cc[CT] = c[CT] + (nguc - c[CT]) * thu + (rong - c[CT]) * bung
            cc[KH] = c[KH] + ((vv + nguc) / 2 + np.array([0.04 * h, 0.04]) - c[KH]) * thu + ((vv + rong) / 2 - c[KH]) * bung
        lech = np.array([0.0, 0.03 * thu - 0.012 * bung])
        # Hạ người: hông, gối hạ theo lúc thu khí.
        for k in (8, 11):
            cc[k] = cc[k] + np.array([0.0, 0.02 * thu])
        for k in (9, 12):
            cc[k] = cc[k] + np.array([0.0, 0.012 * thu])
    for k in (0, 1, 2, 5, 14, 15, 16, 17):
        cc[k] = cc[k] + lech
    if DONG not in ('bung', 'vu', 'dam'):
        for k in (KHUYU2, CO2):
            cc[k] = cc[k] + np.array([0.004 * math.sin(2 * math.pi * t), 0.006 * math.sin(2 * math.pi * t + 1)])
    p['hands'][TAY] = p['hands'][TAY] + (cc[CO] - c[CO])
    p['hands'][1 - TAY] = p['hands'][1 - TAY] + (cc[CO2] - c[CO2])
    p['faces'] = p['faces'] + (cc[0] - c[0])
    xg = np.array(draw_pose(p, H, W))  # (3, H, W) như get_video_pose
    Image.fromarray(np.transpose(xg, (1, 2, 0))).save(f'{ra}/xuong/{f:02d}.png')
    khung.append(xg)

if CHI_XUONG:
    print('xong khung xuong', len(khung))
    sys.exit(0)

from mimicmotion.utils.geglu_patch import patch_geglu_inplace  # noqa: E402
patch_geglu_inplace()
from omegaconf import OmegaConf  # noqa: E402
from mimicmotion.utils.loader import create_pipeline  # noqa: E402
from mimicmotion.utils.utils import save_to_mp4  # noqa: E402
from torchvision.transforms.functional import to_pil_image  # noqa: E402

torch.set_default_dtype(torch.float16)
dev = torch.device('cuda')
svd = os.environ['SVD']
cfg = OmegaConf.create({'base_model_path': svd, 'ckpt_path': 'models/MimicMotion_1-1.pth'})
pipe = create_pipeline(cfg, dev)
pose = np.concatenate([np.expand_dims(np.array(draw_pose(goc, H, W)), 0), np.stack(khung)])
pose = torch.from_numpy(pose.copy()) / 127.5 - 1
img = torch.from_numpy(np.transpose(np.expand_dims(anh, 0), (0, 3, 1, 2))) / 127.5 - 1
pil = [to_pil_image(x.to(torch.uint8)) for x in (img + 1.0) * 127.5]
g = torch.Generator(device=dev)
g.manual_seed(42)
out = pipe(pil, image_pose=pose, num_frames=pose.size(0), tile_size=16, tile_overlap=4, height=H, width=W, fps=7,
           noise_aug_strength=0, num_inference_steps=25, generator=g, min_guidance_scale=2.0, max_guidance_scale=2.0,
           decode_chunk_size=2, output_type='pt', device=dev).frames.cpu()
vid = (out * 255.0).to(torch.uint8)[0, 1:]
save_to_mp4(vid, f'{ra}/ra.mp4', fps=12)
os.makedirs(f'{ra}/khung', exist_ok=True)
for i, fr in enumerate(vid):
    Image.fromarray(fr.permute(1, 2, 0).numpy()).save(f'{ra}/khung/{i:02d}.png')
print('xong', vid.shape)
