# 10 — Nhân vật ảnh động (gift) nhiều góc

Phòng sàn bar · dựng nhân vật. Mục lục: [README](README.md).

Nhân vật **ảnh** đứng nhảy trên sàn cạnh nhân vật 3D: mỗi góc nhìn là một ảnh động WebP có alpha, sân khấu dựng tấm
ảnh quay theo camera và đổi ảnh theo hướng camera nhìn người đó (như sprite 8 hướng của game cũ). Camera 3D của sàn
bay quanh thì người xem thấy nhân vật xoay đủ phía mà vẫn giữ nét vẽ đẹp của ảnh — không cần dựng tượng, lưới, xương.

Công thức đã chốt (2026-11-06): **ảnh nhân vật (ChatGPT) + 8 góc (ChatGPT, theo người nộm) + điệu nhảy Mixamo
(MimicMotion vẽ chuyển động) + camera 3D của sàn**.

```
 ảnh nhân vật mặt trước ──┐
                          ├─ A. ChatGPT: tấm 2×2 theo người nộm → ảnh nhân vật ở 8 góc (dáng 0)
 điệu Mixamo + X Bot ─────┤
                          ├─ B. Blender: người nộm nhảy điệu, 64 dáng × 8 góc (dang_mau.py)
                          │
                          └─ C. MimicMotion (hpc): ảnh góc g + video người nộm góc g → video nhảy góc g (64 khung)
                                    ↓
                             D. tách nền + cỡ người / chỗ chân theo người nộm → 8 WebP có alpha
                                    ↓
                             E. kho nhân vật (bảng xem) → sân khấu anh-dong.ts
```

## 1. Thứ cần có

| Thứ | Ở đâu |
|---|---|
| Script | `scripts/phong/san-bar/nhan-vat/anh-dong/` — chạy trên hpc, trong `/mnt/D/dung-3d/.tmp/…` (file tạm chỉ ở `.tmp`) |
| Blender 5.2.3 | `/mnt/D/dung-3d/tools/blender-5.2.3-linux-x64/blender` |
| X Bot + 77 điệu Mixamo | `/mnt/D/dung-3d/assets/` (`X Bot.fbx`, `<điệu>.fbx`) |
| Tách nền | `~/ai3d/venv` (hy3dgen rembg) — `ghep_khung.py`, `video_sprite.py` chạy bằng venv này |
| MimicMotion | `/mnt/D/dung-3d/.tmp/mimic/` — mã, venv riêng, cache mô hình (§3) |
| ChatGPT | Claude in Chrome, một cuộc chat riêng cho nhân vật; ảnh tải về máy rồi `scp` lên hpc |

Mọi thứ miễn phí: MimicMotion (Apache-2.0), SVD-xt 1.0 (Stability AI Community License — miễn phí khi doanh thu
< 1 triệu USD/năm), DWPose, RIFE (MIT). Chỉ ChatGPT tính theo gói (gói Business hết lượt vẽ sau ~25 ảnh, ~10 giờ mới có lại).

**Luật tuổi**: nhân vật phải là người lớn ([09 §1](09-tu-do.md)). Bản chibi / trẻ con không đưa lên sàn bar.

## 2. Bước A — ảnh nhân vật ở 8 góc (ChatGPT)

1. **Ảnh mặt trước.** Nhờ ChatGPT vẽ nhân vật cả người, nền trắng, đứng như dáng 0 của điệu (xem tấm dáng ở bước B).
   Sửa đến khi đạt: đúng dáng, mặt/tóc/đồ như ý, tay chân không lỗi, nét.
2. **Tấm người nộm 2×2.** Dựng người nộm 16 dáng ở 8 góc (bước B với `--so 16`), rồi trong thư mục chứa
   `dang/`, `dang-g45/` … `dang-g315/`:
   ```
   python luoi_goc.py <số dáng>      # ra luoi/A_NN.png (45/90/135/180°) và luoi/B_NN.png (225/270/315/0°)
   ```
3. **Hỏi ChatGPT — mỗi tin một yêu cầu**, đính kèm ảnh mặt trước đã duyệt + một tấm 2×2, lời nhắc ngắn giữ nguyên:
   > Vẽ cô gái ở ảnh 1 thành tấm 2x2 giống hệt 4 người nộm ở ảnh 2: đúng dáng, đúng hướng quay từng ô. Cả người, nền trắng.

   Mỗi dáng hai lượt (A rồi B). **Chỉ dáng 0 là bắt buộc** cho MimicMotion; các dáng khác chỉ cần khi làm theo cách
   cũ (§7).
4. **Duyệt từng tấm** cạnh tấm người nộm: hướng quay từng ô, tay chân, cùng nhân vật. Ô nào sai góc (vd vẽ sau lưng
   ở ô lẽ ra quay mặt) thì gửi lại đúng tấm đó.

Đã thử và bỏ: hỏi **một góc mỗi lần** (ra ngược trái/phải), tấm **4×4** (mỗi khung ~270 px, mờ), **gộp nhiều yêu
cầu vào một tin** (ChatGPT trả gộp, kém). Xem thêm [08](08-chatgpt-blender.md) — cùng nguyên tắc chat nhiều lượt ngắn.

## 3. Cài MimicMotion trên hpc (một lần)

```bash
mkdir -p /mnt/D/dung-3d/.tmp/mimic && cd /mnt/D/dung-3d/.tmp/mimic
git clone https://github.com/Tencent/MimicMotion.git
export HF_HOME=$PWD/hf PIP_CACHE_DIR=$PWD/pipcache TMPDIR=$PWD/tmp; mkdir -p tmp
python3 -m venv venv && . venv/bin/activate
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124
pip install diffusers==0.27.0 transformers==4.40.2 huggingface_hub==0.23.5 accelerate decord einops omegaconf \
            onnxruntime-gpu opencv-python-headless av matplotlib
```

Mô hình (~8 GB): `stabilityai/stable-video-diffusion-img2vid-xt` (bản **1.0** — bản 1.1 phải đăng nhập Hugging Face;
chỉ cần các file `fp16` của unet, vae, image_encoder + config), `tencent/MimicMotion` → `MimicMotion/models/MimicMotion_1-1.pth`,
`yzd-v/DWPose` → `MimicMotion/models/DWPose/{yolox_l,dw-ll_ucoco_384}.onnx`.

Hai chỗ sửa trong mã MimicMotion (torch 2.6, card 8 GB):
- `mimicmotion/utils/loader.py`: bỏ khối `with torch.serialization.safe_globals(...)`, gọi thẳng
  `torch.load(..., weights_only=True)` — bản gốc gọi sai chữ ký, lỗi `_safe_globals.__init__() takes 2 positional arguments`.
- `inference.py`: `decode_chunk_size=8` → `2` (giải mã VAE ít khung một lần cho đỡ VRAM).

## 4. Bước B + C — người nộm 64 dáng và MimicMotion 8 góc

```bash
cd /mnt/D/dung-3d
for g in 0 45 90 135 180 225 270 315; do
  tools/blender-5.2.3-linux-x64/blender -b --factory-startup --python <script>/dang_mau.py -- \
    "assets/X Bot.fbx" "assets/Hip Hop Dancing.fbx" .tmp/<việc>/dang64$([ $g = 0 ] || echo -g$g) --so 64 --goc $g
done
# đầu vào MimicMotion: ảnh mẫu + video người nộm từng góc (venv MimicMotion)
/mnt/D/dung-3d/.tmp/mimic/venv/bin/python <script>/chuan_bi_8goc.py .tmp/<việc>/g8 \
    <ảnh mặt trước> <tấm A dáng 0> <tấm B dáng 0> .tmp/<việc>/dang64
nohup bash <script>/mimic_8goc.sh .tmp/<việc>/g8 576 > .tmp/<việc>/g8/hang.log 2>&1 &
```

- `dang_mau.py --so N` chụp N dáng **rải đều cả vòng điệu** (Hip Hop Dancing: khung 1–191 ở 30 fps = 6,3 giây; 64 dáng
  ≈ 10 dáng/giây). Dáng i của tấm 16 = dáng 4i của tấm 64 — ảnh ChatGPT dáng 0 khớp khung 0 của video.
- **Quy ước góc** (đã kiểm trên sàn): `--goc 90` cho người **quay sang PHẢI màn hình**. Vậy người nộm g45 / g90 / g135
  ứng với góc sân khấu `cheoP` / `nghiengP` / `cheoSauP`, còn g225 / g270 / g315 ứng với `cheoSau` / `nghieng` / `cheo`.
- Thông số đã chốt: `resolution 576` (576×1024), `num_frames 16`, `frames_overlap 4`, `25 bước`, `guidance 2.0`,
  `sample_stride 1`, `seed 42`. RTX 3070 8 GB: ~5,6 GB VRAM, **~11 phút một góc**, 8 góc ~1,5 giờ. 448 dùng 4,6 GB, 6 phút.
- Người nộm mặt trơn, nền trắng vẫn đủ cho DWPose bắt khung xương thân, tay, chân.

## 5. Bước D — ảnh động có alpha

```bash
source ~/ai3d/venv/bin/activate
python <script>/video_sprite.py .tmp/<việc>/g8/ra<g>/*.mp4 .tmp/<việc>/dang64[-g<g>] ra/<góc>.webp --tre 100
```

`video_sprite.py` tách từng khung, **làm nét** rồi gọi `ghep_khung.py`: tách nền (rembg), co giãn người cho cao bằng
người nộm cùng dáng × 3 (`--to`, người ~900 px), đặt chân và hông đúng chỗ người nộm — mọi góc cùng cỡ người, cùng
nhịp nhún. Nền ngả màu (MimicMotion hay trôi sang hồng ở đoạn cuối) bị tách đi ở bước này. `--tre 100` = 10
khung/giây, đúng tốc độ thật của điệu.

**Làm nét**: video MimicMotion 576×1024 vẽ mềm — mặt, mắt, viền tóc bệt; tay vung nhanh nhoè; khung đầu nhoè nhất.
Mỗi khung qua Real-ESRGAN `realesr-animevideov3` ×2 (`realesrgan-ncnn-vulkan` bản chính thức của xinntao, đặt ở
`/mnt/D/dung-3d/.tmp/esrgan/`, kèm thư mục `models/`). Đã so: ×2 animevideov3 sắc mà sạch; `realesrgan-x4plus-anime`
×4 bệt như tranh màu nước. `--khong-net` để bỏ bước này. Hai lỗi đã gặp: phải truyền `-m <thư mục models>` khi chạy từ
thư mục khác, và thư mục ra phải tạo trước (không thì báo *invalid outputpath extension type*). Chạy song song với
MimicMotion được (`-t 128`).

## 5b. Ghép nét ChatGPT với chuyển động MimicMotion (đang thử)

Ý tưởng (người vận hành đề xuất 2026-11-06): ChatGPT vẽ từng dáng rất nét nhưng chỉ 16 dáng một vòng — chuyển động
giật; MimicMotion cho 64 khung liền mạch nhưng vẽ mềm, mặt nhoè. Ghép hai thứ: **nét từ ChatGPT, chuyển động từ
MimicMotion**.

Cách làm cho một góc:

1. **Khung khoá ChatGPT** — đủ 16 dáng của điệu ở góc đó (tấm 2×2 như §2 cho cả 16 dáng, không chỉ dáng 0), ghép bằng
   `ghep_khung.py` với người nộm 16 dáng (`dang_mau.py --so 16`) và **cùng `--to`** với bản MimicMotion:
   ```bash
   python <script>/ghep_khung.py khoa.webp dang ds-khoa.txt --to 3 --tre 400
   ```
2. **Chuyển động MimicMotion** — 64 khung, ghép như §5 (`video_sprite.py`, mặc định `--to 3`). Khung khoá k ứng với
   khung chuyển động 4k (cùng một khoảnh khắc của điệu vì `dang_mau.py` rải dáng đều cả vòng điệu).
3. **Trộn**:
   ```bash
   python <script>/tron_khung.py khoa.webp chuyen-dong.webp ra.webp --tre 100
   ```
   Với mỗi khung t: lấy hai khung khoá kẹp nó (k = t/4 và k+1), đo optical flow (OpenCV DIS) từ khung MimicMotion t
   sang từng khoá, **uốn** khoá cho khớp dáng khung t, rồi trộn theo khoảng cách thời gian (t gần khoá nào thì lấy
   khoá đó nhiều hơn). Hình bóng (alpha) lấy đúng của MimicMotion nên tay chân theo đúng dáng, không viền ma; điểm ảnh
   (mặt, tóc, chữ trên áo) lấy của ChatGPT nên nét.

Giá: thêm ChatGPT 32 lượt mỗi điệu một bộ đồ (16 dáng × 2 tấm 2×2) — gần hết lượt vẽ gói Business trong ngày. Chỉ đáng
làm cho nhân vật / bộ đồ chính.

Rủi ro: chỗ tay chân vung xa giữa hai khoá, flow không bám kịp → điểm ảnh bị kéo méo. Cần soi kỹ từng góc trước khi
lên sàn.

Kết quả thử trên góc trước bộ hip hop (2026-11-06, `tron/truoc2.webp`): ở khung khoá và gần khoá, mặt, mắt, chữ trên
áo nét như ChatGPT mà dáng đúng MimicMotion — hơn hẳn MimicMotion đã làm nét (§5), vì Real-ESRGAN không vẽ lại được mặt
MimicMotion đã làm mất. Giữa hai khoá, chỗ tay chân vung xa (ống quần khi đá chân, bàn tay giơ cao) còn nhoè nhẹ.
Lần chạy đầu có vệt đen ở mép tay chân (chỗ flow không lấy được điểm ảnh ChatGPT để màu 0) — đã sửa: chỗ đó bù bằng điểm
ảnh MimicMotion, phủ dần theo độ đặc của phần đã uốn. Đã đưa lên sàn làm góc trước của "Cô nàng hip hop".

## 6. Bước E — lên sàn

1. Bảng xem → Vũ công 3D → Nhân vật → thêm nhân vật, bật **Có trong đám đông**, tải 8 ảnh vào đúng ô:
   `anh` (trước), `anhCheo`, `anhNghieng`, `anhCheoSau`, `anhSau`, `anhCheoSauP`, `anhNghiengP`, `anhCheoP` theo quy ước góc ở §4.
2. Nhóm đám đông bật **Lấy người từ kho nhân vật** thì người ảnh động được xếp chỗ trước, rồi tới người 3D.

Sân khấu (`client/designs/san-bar-*/src/anh-dong.ts`, hai thiết kế giữ một bản giống hệt):
- **Chọn góc**: so hướng camera với hướng người quay mặt, chia 8 cung 45°; góc thiếu ảnh lấy góc gần nhất, bên phải
  thiếu thì lật gương bên trái (chỉ đúng với dáng đối xứng).
- **Đổi góc mờ dần** 0,22 giây (`MO`) — hai lớp ảnh, lớp cũ giữ khung đang hiện và mờ đi. Giữ nhịp: góc mới chạy tiếp
  ở cùng tỉ lệ thời gian trong vòng điệu, không về khung đầu — mọi góc phải **cùng số khung, cùng độ dài**.
- **Ăn đèn sân khấu**: `MeshLambertMaterial`, tự sáng `TU_SANG` = 0,62, phần còn lại do đèn chiếu → đèn đổi màu, đèn
  soi rọi vào thì người ảnh cũng ám theo như người 3D.
- **Bóng dưới chân**: vệt tròn mờ trên sàn, không xoay theo camera.
- Kiểm nhanh: `?inspect=1` mở `window.__bar` (scene, camera, controls) — tìm mesh `alphaTest === 0.08` có
  `CanvasTexture` là người ảnh, đặt camera vòng quanh để soi từng góc.

## 6b. Trang phục, phụ kiện — bộ đồ của nhân vật ảnh động

Nhân vật ảnh động không mặc món rời như người 3D: quần áo, mũ, kính vẽ liền vào ảnh. Mỗi **bộ phối** (trang phục +
phụ kiện) là **một bộ ảnh 8 góc riêng**, làm lại từ bước A:

1. ChatGPT: đính kèm ảnh mặt trước đã duyệt, một lời nhắc ngắn đổi đồ (vd *"Giữ nguyên cô gái này, đổi sang đầm đỏ
   và kính râm. Cả người, nền trắng."*), sửa tới khi đạt — rồi hai tấm 2×2 như §2 cho dáng 0 của bộ mới.
2. Bước B–D như trên (người nộm dùng lại được; chỉ chạy lại MimicMotion + ghép): ~1,5 giờ trên hpc cho 8 góc một điệu.
3. Bảng xem → nhân vật → **Bộ đồ khác (ảnh động)** → thêm bộ, tải 8 ảnh (mỗi nhân vật tối đa 8 bộ). Bộ đầu là 8 ô
   của chính nhân vật.

Trên sàn: mỗi người ảnh động mặc ngẫu nhiên một bộ (hạt giống theo nhóm — cùng nhân vật ở hai chỗ có thể mặc khác
nhau). Đổi sang bộ kế tiếp khi:
- vũ công 3D đổi đồ (có quà với "đổi đồ khi có quà", hoặc tới giờ "đổi đồ mỗi … phút") — mọi người ảnh động đổi, lệch
  nhau 0–1,5 giây;
- khách gõ **"đổi đồ <số>"** (tab Camera & số, `lenhDoiDo`, có dấu hay không đều nhận; số đánh như lệnh soi) — đúng
  người đó đổi.

Đổi bộ = chớp sáng 0,7 giây rồi mờ chéo 0,5 giây sang bộ mới; bộ mới chỉ giải mã khi tới lượt (đỡ bộ nhớ). Không trộn
tự do từng món như 3D được — muốn tổ hợp nào thì vẽ sẵn tổ hợp đó; nên chọn 3–5 bộ đẹp mỗi nhân vật.

Bộ nhớ: sân khấu **không giải sẵn mọi khung**. Mỗi ảnh giữ dữ liệu nén cùng một `ImageDecoder`; khung nào sắp chiếu
thì giải khung đó (giải trước một khung), cắt sát người, cao tối đa 1024 px (`CAO_TOI_DA`), giữ 12 khung gần nhất
(`GIU`). Giải sẵn 64 khung × 8 góc ở cỡ này là gần 1 GB một người — máy phát live không chịu nổi; giải dần thì vài
chục MB. Lượt đầu chỉ giải ảnh thu nhỏ 4 lần để đo vùng có hình và thời gian từng khung.

## 7. Tăng độ mượt

| Cách | Làm gì | Giá |
|---|---|---|
| Nhiều dáng hơn cho MimicMotion | `dang_mau.py --so 96` (15/giây) hoặc `128` (20/giây), video `--fps` tương ứng, `--tre` = 1000 / fps | thời gian chạy tăng theo số khung (~16–22 phút một góc) |
| RIFE ×2 sau MimicMotion | `noi_khung.py <vào.webp> <ra.webp> --x 2 --tre 100` | vài phút; chỉ sạch khi các khung liền nhau đã gần nhau |

RIFE (`rife-ncnn-vulkan`, `/mnt/D/dung-3d/.tmp/rife/`) **không** dùng được cho bộ 16 dáng ChatGPT: hai dáng liền nhau
chỉ trùng 34–73% hình người, RIFE kéo tay chân thành vệt mờ. Với video MimicMotion các khung sát nhau nên chèn sạch.

## 8. Cách cũ (đã thay) và vì sao

- **Chuyển ảnh gift thành tượng 3D (Hunyuan3D)**: xấu, mất nét vẽ — bỏ.
- **ChatGPT vẽ từng dáng × 8 góc** (16 dáng × 2 tấm 2×2 = 32 lượt / điệu): đẹp từng khung nhưng chỉ 16 khung một vòng —
  chuyển động giật, và hết lượt vẽ giữa chừng. Nay ChatGPT chỉ vẽ **dáng 0 ở 8 góc** (2 lượt), MimicMotion vẽ phần chuyển động.
- **OpenCV / RIFE nội suy giữa các dáng ChatGPT**: bóng ma, vệt mờ (§7).

## 9. Hạn chế còn lại

- Động tác nhanh vẫn hơi nhoè (10 khung/giây) — tăng khung theo §7.
- Mặt và chi tiết áo trôi nhẹ giữa các đoạn 16 khung của MimicMotion; nhìn ở cỡ người trên sàn khó thấy.
- Ảnh chỉ có 8 góc: camera bay chậm qua ranh giới góc vẫn thấy chuyển (đã làm mờ dần, không lật phắt).
- Mỗi điệu mới = chạy lại B → D cho 8 góc (~1,5 giờ trên hpc); ảnh 8 góc của nhân vật (bước A) dùng lại được nếu dáng 0
  của điệu mới gần dáng đứng — không thì hỏi ChatGPT lại hai tấm cho dáng 0 của điệu đó.
