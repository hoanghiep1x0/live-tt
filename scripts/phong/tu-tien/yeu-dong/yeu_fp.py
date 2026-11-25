"""Hoạt ảnh yêu tinh bằng FramePack (ảnh -> video, HunyuanVideo) trên hpc-station.

  python yeu_fp.py <tranh.png|webp> <thư mục ra> --loi "<lời tả chuyển động>" [--giay 2] [--hat 1] [--buoc 25]

Tranh có alpha được đặt lên nền xám đậm phẳng (rembg tách lại sau, `ghep_yeu.py`). Ra: <thư mục ra>/khung/0000.png…
(30 khung/giây, khung đầu chính là tranh gốc). Chạy trong venv FramePack:
  cd $FP/FramePack && HF_HOME=$FP/hf $FP/venv/bin/python yeu_fp.py …
Dựa theo `demo_gradio.py` của FramePack (bỏ giao diện, giữ nguyên các bước).
"""
import argparse
import os
import sys

import numpy as np
import torch
from PIL import Image

sys.path.insert(0, os.getcwd())
from diffusers import AutoencoderKLHunyuanVideo  # noqa: E402
from transformers import LlamaModel, CLIPTextModel, LlamaTokenizerFast, CLIPTokenizer  # noqa: E402
from transformers import SiglipImageProcessor, SiglipVisionModel  # noqa: E402
from diffusers_helper.hunyuan import encode_prompt_conds, vae_decode, vae_encode  # noqa: E402
from diffusers_helper.utils import crop_or_pad_yield_mask, soft_append_bcthw, resize_and_center_crop  # noqa: E402
from diffusers_helper.models.hunyuan_video_packed import HunyuanVideoTransformer3DModelPacked  # noqa: E402
from diffusers_helper.pipelines.k_diffusion_hunyuan import sample_hunyuan  # noqa: E402
from diffusers_helper.memory import (  # noqa: E402
    gpu, fake_diffusers_current_device, DynamicSwapInstaller, unload_complete_models, load_model_as_complete,
    move_model_to_device_with_memory_preservation, offload_model_from_device_for_memory_preservation,
)
from diffusers_helper.clip_vision import hf_clip_vision_encode  # noqa: E402
from diffusers_helper.bucket_tools import find_nearest_bucket  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('tranh')
ap.add_argument('ra')
ap.add_argument('--loi', required=True)
ap.add_argument('--giay', type=float, default=2.0)
ap.add_argument('--hat', type=int, default=1)
ap.add_argument('--buoc', type=int, default=25)
ap.add_argument('--nen', default='40,40,44')
ap.add_argument('--cao', type=int, default=640, help='độ phân giải bucket của FramePack')
a = ap.parse_args()

KHONG = ('text, watermark, blurry, distorted, extra heads, camera movement, zoom, pan, background change, '
         'scene change, morphing into another creature, gore, blood')

os.makedirs(f'{a.ra}/khung', exist_ok=True)

anh = Image.open(a.tranh).convert('RGBA')
nen = Image.new('RGBA', anh.size, tuple(int(x) for x in a.nen.split(',')) + (255,))
nen.alpha_composite(anh)
vao = np.array(nen.convert('RGB'))

te = LlamaModel.from_pretrained('hunyuanvideo-community/HunyuanVideo', subfolder='text_encoder', torch_dtype=torch.float16).cpu()
te2 = CLIPTextModel.from_pretrained('hunyuanvideo-community/HunyuanVideo', subfolder='text_encoder_2', torch_dtype=torch.float16).cpu()
tok = LlamaTokenizerFast.from_pretrained('hunyuanvideo-community/HunyuanVideo', subfolder='tokenizer')
tok2 = CLIPTokenizer.from_pretrained('hunyuanvideo-community/HunyuanVideo', subfolder='tokenizer_2')
vae = AutoencoderKLHunyuanVideo.from_pretrained('hunyuanvideo-community/HunyuanVideo', subfolder='vae', torch_dtype=torch.float16).cpu()
fe = SiglipImageProcessor.from_pretrained('lllyasviel/flux_redux_bfl', subfolder='feature_extractor')
ie = SiglipVisionModel.from_pretrained('lllyasviel/flux_redux_bfl', subfolder='image_encoder', torch_dtype=torch.float16).cpu()
tf = HunyuanVideoTransformer3DModelPacked.from_pretrained('lllyasviel/FramePackI2V_HY', torch_dtype=torch.bfloat16).cpu()
for m in (vae, te, te2, ie, tf):
    m.eval()
    m.requires_grad_(False)
vae.enable_slicing()
vae.enable_tiling()
tf.high_quality_fp32_output_for_inference = True
DynamicSwapInstaller.install_model(tf, device=gpu)
DynamicSwapInstaller.install_model(te, device=gpu)

GIU = 6  # GB giữ lại trên card 8 GB


@torch.no_grad()
def chay():
    cua_so = 9
    so_doan = int(max(round(a.giay * 30 / (cua_so * 4)), 1))
    unload_complete_models(te, te2, ie, vae, tf)
    fake_diffusers_current_device(te, gpu)
    load_model_as_complete(te2, target_device=gpu)
    lv, cp = encode_prompt_conds(a.loi, te, te2, tok, tok2)
    lvn, cpn = encode_prompt_conds(KHONG, te, te2, tok, tok2)
    lv, lm = crop_or_pad_yield_mask(lv, length=512)
    lvn, lmn = crop_or_pad_yield_mask(lvn, length=512)

    H, W, _ = vao.shape
    h, w = find_nearest_bucket(H, W, resolution=a.cao)
    img = resize_and_center_crop(vao, target_width=w, target_height=h)
    pt = (torch.from_numpy(img).float() / 127.5 - 1).permute(2, 0, 1)[None, :, None]
    load_model_as_complete(vae, target_device=gpu)
    dau = vae_encode(pt, vae)
    load_model_as_complete(ie, target_device=gpu)
    hs = hf_clip_vision_encode(img, fe, ie).last_hidden_state

    dt = tf.dtype
    lv, lvn, cp, cpn, hs = lv.to(dt), lvn.to(dt), cp.to(dt), cpn.to(dt), hs.to(dt)
    rnd = torch.Generator('cpu').manual_seed(a.hat)
    so_khung = cua_so * 4 - 3
    hist = torch.zeros(size=(1, 16, 1 + 2 + 16, h // 8, w // 8), dtype=torch.float32).cpu()
    px = None
    tong = 0
    dem = list(reversed(range(so_doan)))
    if so_doan > 4:
        dem = [3] + [2] * (so_doan - 3) + [1, 0]
    for pad in dem:
        cuoi = pad == 0
        ps = pad * cua_so
        idx = torch.arange(0, sum([1, ps, cua_so, 1, 2, 16])).unsqueeze(0)
        i_pre, _, i_lat, i_post, i_2x, i_4x = idx.split([1, ps, cua_so, 1, 2, 16], dim=1)
        i_clean = torch.cat([i_pre, i_post], dim=1)
        c_post, c_2x, c_4x = hist[:, :, :1 + 2 + 16].split([1, 2, 16], dim=2)
        c = torch.cat([dau.to(hist), c_post], dim=2)
        unload_complete_models()
        move_model_to_device_with_memory_preservation(tf, target_device=gpu, preserved_memory_gb=GIU)
        tf.initialize_teacache(enable_teacache=True, num_steps=a.buoc)
        lat = sample_hunyuan(
            transformer=tf, sampler='unipc', width=w, height=h, frames=so_khung,
            real_guidance_scale=1.0, distilled_guidance_scale=10.0, guidance_rescale=0.0,
            num_inference_steps=a.buoc, generator=rnd,
            prompt_embeds=lv, prompt_embeds_mask=lm, prompt_poolers=cp,
            negative_prompt_embeds=lvn, negative_prompt_embeds_mask=lmn, negative_prompt_poolers=cpn,
            device=gpu, dtype=torch.bfloat16, image_embeddings=hs,
            latent_indices=i_lat, clean_latents=c, clean_latent_indices=i_clean,
            clean_latents_2x=c_2x, clean_latent_2x_indices=i_2x,
            clean_latents_4x=c_4x, clean_latent_4x_indices=i_4x,
        )
        if cuoi:
            lat = torch.cat([dau.to(lat), lat], dim=2)
        tong += int(lat.shape[2])
        hist = torch.cat([lat.to(hist), hist], dim=2)
        offload_model_from_device_for_memory_preservation(tf, target_device=gpu, preserved_memory_gb=8)
        load_model_as_complete(vae, target_device=gpu)
        that = hist[:, :, :tong]
        if px is None:
            px = vae_decode(that, vae).cpu()
        else:
            n_lat = (cua_so * 2 + 1) if cuoi else (cua_so * 2)
            px = soft_append_bcthw(vae_decode(that[:, :, :n_lat], vae).cpu(), px, cua_so * 4 - 3)
        unload_complete_models()
        print('doan xong', pad, tuple(px.shape), flush=True)
    k = ((px[0].permute(1, 2, 3, 0).float().clamp(-1, 1) + 1) * 127.5).byte().numpy()
    for i, f in enumerate(k):
        Image.fromarray(f).save(f'{a.ra}/khung/{i:04d}.png')
    print('XONG', len(k), 'khung', flush=True)


chay()
