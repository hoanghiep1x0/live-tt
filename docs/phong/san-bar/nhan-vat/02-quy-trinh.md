# 02 — Quy trình từng bước

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md). Tham số từng script: [03](03-script.md).

Thứ tự dưới đây là **thứ tự chạy thật** của bản hiện tại (số bước giữ như nhật ký để khớp [07](07-nhat-ky-model-1.md)).
Mọi lệnh `blender -b … --python scripts/phong/san-bar/nhan-vat/<bước>.py -- …` chạy được gọn bằng
`repo/scripts/phong/san-bar/dung-nhan-vat.sh <file.blend | _> <bước> …` (đọc `.env`, đặt TEMP vào `.tmp/blender`).
**Mọi lệnh chạy trên `hpc-station` từ gốc project `/mnt/D/dung-3d`** ([01 §2a](01-chuan-bi.md)); `D:\Assets\…` trong lệnh
= `assets/…`, `<tên>` = `model-N`. Bước ghi "(hpc-station)" là Python ngoài Blender: `AI` = `~/ai3d/venv/bin/python`,
`MP` = `~/ai3d/mpvenv/bin/python`, script ở `repo/scripts/phong/san-bar/nhan-vat`, luôn kèm `TMPDIR=.tmp`.

| Giai đoạn | Bước |
|---|---|
| A. Ảnh → tượng | 1 Hunyuan · 2 tách nền · 3 điểm mốc · 4 nặn · 5 xoá mi/mày · 7 tô màu tượng |
| B. Lưới gốc | 6 bọc · 6b mắt · 6b2 miệng · 6b3 tai · 6b4 sửa tai + nếp gập · 6b5 hàm–cằm |
| C. Texture | 6c nướng màu · 6d làm sạch + trang điểm · 6d2 da chiếu ảnh · 6d3–6d4 chấm điểm, chẩn đoán · 6e normal map |
| D. Tóc, thân, đồ | 10 tóc · 10b hồ sơ nhân vật (dáng thân, da, quần áo) |
| E. Xuất | 6f xương + điệu + GLB · 6g so chồng |

### Bước 1. Hình khối đầu — Hunyuan3D-2mv (hpc-station) — ĐÃ CHỐT

```bash
# front = face-01, left = face-03-left-profile, back = face-05, right = face-07-right-profile
# (Windows) scripts/phong/san-bar/hpc-dong-bo.sh day <tên>  — ảnh vào assets/<tên>/hpc/head/{front,left,back,right}.png
AI repo/scripts/phong/san-bar/nhan-vat/hunyuan_mv.py assets/<tên>/hpc/head assets/<tên>/out/hunyuan_head.glb --octree 448
```
~3 phút, VRAM ~6,5 GB, ~830 nghìn đỉnh.

### Bước 2. Tách nền 8 ảnh mặt (hpc-station) — ĐÃ CHỐT

```bash
CUDA_VISIBLE_DEVICES="" AI repo/scripts/phong/san-bar/nhan-vat/remove_bg.py assets/<tên>/individual-2048 assets/<tên>/hpc/faces_nobg
```

### Bước 3. Điểm mốc mặt — ĐÃ CHỐT

```bash
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_ortho.py -- output.glb <ortho> 0,45,315
# trên hpc-station (venv mpvenv):
python landmarks.py <thư mục ortho_*.png> lm_ortho.json        # điểm mốc trên tượng
python landmarks.py <thư mục 3 ảnh mặt 0/45/315> lm_photo.json  # điểm mốc trên ảnh
# chép hai file về <ortho> (cạnh ortho.json)
```
Có 97 điểm: mắt, mí (`lid_*`), tròng, mày (`brow_*`), mũi, môi + 16 điểm viền môi (`lipo_*`), cằm, hàm.

### Bước 4. Nặn tượng theo ảnh — ĐÃ CHỐT

Môi (cho có "tim môi"):
```bash
bash scripts/phong/san-bar/nhan-vat/sculpt_loop.sh output.glb <thư mục có lm_photo.json> nobg/face-01-front.png nobg/face-03-left-profile.png 6 \
    --gain 0.7 --sigma 0.024 --max-mm 1.5 --post-smooth 6 --only lipo_,lip_,mouth_
```
Mũi (thu cánh mũi): `slim_nose.py -- vào.glb ra.glb <ortho> --width 0.85 --tip 0.88`.
Không dùng `--sigma 0.012` (viền môi răng cưa). Sau bước này chụp ortho + tìm điểm mốc lại (bước 3).

### Bước 5. Xoá mi, kẻ mắt, lông mày khỏi ảnh (hpc-station) — ĐÃ CHỐT

```bash
python clean_lashes.py <ảnh tách nền> <ảnh ra> lm_photo.json --dark 0.82 --band 1.9 --hband 0.95 --brows
```
Cho ảnh 0°, 45°, 315°. Tô lấp kiểu push–pull (lấy màu da xung quanh, kể cả lòng mắt) → da sạch để thay bằng bộ phận rời.

### Bước 7. Tô màu (chiếu ảnh lên tượng Hunyuan) — ĐÃ CHỐT; sang lưới gốc ở bước 6c

```bash
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/project_texture.py -- <tượng.glb> <thư mục 8 ảnh đã xoá mi/mày> head.glb \
    --faces 80000 --tex 4096 --landmarks <ortho> --eye-scale 1.18
```
Mỗi ảnh căn theo đường viền, ảnh 0/45/315 uốn thêm theo điểm mốc; môi và mắt chỉ lấy ảnh chính diện; ảnh đọc là sRGB → đổi tuyến
tính. Đầu tô màu này là nguồn cho bước 6c (nướng sang UV lưới gốc).

### Bước 6. Bọc lưới gốc sạch (wrap) — ĐÃ CHỐT

Như studio làm với mặt quét: không dùng thẳng lưới AI ("đống tam giác"), mà bọc **lưới MakeHuman** (sẵn vòng cạnh quanh mắt,
miệng, UV, hốc mắt, xương Mixamo, biểu cảm) lên hình khối đó. Dùng đường dẫn tuyệt đối cho mọi file ra.
```bash
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- render D:\Assets\base\female\ortho     # chụp lưới gốc (một lần cho mỗi nhóm)
# hpc-station: python landmarks.py <ortho> lm_ortho.json → chép về
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- wrap D:\Assets\base\female\ortho <tượng.glb> <ortho tượng> <wrap.blend> \
    --rounds 5 [--eye-targets <eye_targets.json>]
blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/render_blend_head.py -- <tiền tố ảnh> --clay   # kiểm tra đất sét
```
Cách bọc (~1,5 phút):
1. Điểm mốc 3D: bắn tia từ ảnh chụp vào lưới gốc **kể cả nhãn cầu helper** (lưới MakeHuman kín; không có nhãn cầu thì tia sát mép
   mí lọt qua khe mắt chạm đáy hốc mắt sâu ~3 cm → uốn sai cả vùng mắt).
2. Căn đồng dạng theo điểm mốc, rồi uốn mềm RBF (bán kính 3 cm, **làm trơn λ = 0,01**, không nội suy khít: các điểm mốc môi sát
   nhau → nội suy khít vọt lố, lật mặt cằm/má thành gờ quanh môi dưới). Bỏ giữa mí trên/dưới khỏi điểm mốc (khe mắt Hunyuan hẹp,
   kéo theo là mắt nhắm) — chỉ giữ khoé mắt.
3. Áp sát mặt tượng theo pháp tuyến 5 vòng (làm mịn trường dời) + 2 vòng "dán" ít làm mịn; đỉnh không chạm theo pháp tuyến thì lấy
   điểm gần nhất cùng phía.
4. Không áp sát: vùng mắt (0,95 × bề ngang mắt; Hunyuan không có hốc mắt), tai (nhóm `ears`), mặt trong (tia theo pháp tuyến chạm
   lại chính lưới trong 7 mm: lòng miệng, trong lỗ mũi). Tai và mặt trong **dời theo da xung quanh** (nội suy từ đỉnh đã áp sát).
5. Lấy đối xứng; gỡ mặt lật còn sót. Model-1: mặt lật 16 (không thấy), lệch điểm mốc so với ảnh ~1,7 mm.

### Bước 6b. Dáng mắt theo ảnh (thanh trượt mắt MakeHuman) — ĐÃ CHỐT

Khe mắt Hunyuan không dùng được → dáng mắt lấy từ lưới gốc + thanh trượt mắt MakeHuman (hoạ sĩ dựng sẵn: mí luôn ôm nhãn cầu).
```bash
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <wrap.blend> <ortho_w>           # chụp lưới đã bọc
# hpc-station: landmarks.py <ortho_w> → <ortho_w>/lm_ortho.json
python scripts/phong/san-bar/nhan-vat/eye_fix.py <ortho_w> <lm_photo.json> face-01-front.png fix.json --sym # đo: ngang, mở, xếch; độ dời cần
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- eye-fit D:\Assets\base\female\ortho fix.json eye_targets.json [--prev <cũ>]
# bọc lại với --eye-targets eye_targets.json; lặp 2 vòng (vòng 2 đo trên bản mới, --prev = trọng số vòng 1)
```
`eye-fit` tính tác dụng của 20 thanh (`eye-corner1-up` = xếch đuôi mắt, `eye-height2-incr` = mở mí…) lên 8 điểm mí mỗi mắt
rồi giải bình phương tối thiểu (trọng số 0..1, cả hai mắt cùng trọng số). Model-1 (`out\eye_targets_4.json`): ngang 73/75 vs ảnh
72/73 px, mở 23/24 vs 23/25, xếch 8,2° vs 9,3–10,5°.

### Bước 6b2. Nắn miệng theo ảnh — ĐÃ CHỐT

Tượng Hunyuan làm miệng hẹp, môi trên mỏng hơn ảnh; bọc sát tượng thì lưới gốc mang theo lỗi đó.
```bash
blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/face_nudge.py -- <ortho_b> <lm_photo.json> <wrap_n.blend> --sym
```
`<ortho_b>` = ảnh chụp **bản đã tô màu** (base của bước 6c chạy trên wrap chưa nắn + landmarks.py): MediaPipe dò viền môi theo
màu son — trên lưới bọc chưa tô màu nó dò môi trên thấp hơn ~1 mm. Đo độ dời x–z của 22 điểm môi (ảnh đặt chồng như
`compare_overlay.py`), neo đứng yên mắt, mũi, cằm, nội suy RBF gauss σ = 12 mm, áp cho Body **và** HunyuanAligned; ghi
`<wrap_n>_nudge.json` để bước 6c dời luôn đầu tô màu (màu môi theo môi mới). Model-1: khoé môi ra 1,3 mm mỗi bên, môi trên lên
1,7 mm → lệch điểm mốc vùng miệng 2,97 → 1,15 px.

### Bước 6b3. Dáng tai theo ảnh — ĐÃ CHỐT

Tai không bọc theo tượng (Hunyuan làm tai sai) → dáng tai MakeHuman (xoè, thấp, to hơn ảnh). Khớp bóng tai nhìn chính diện:
```bash
blender -b <wrap_n.blend> --python scripts/phong/san-bar/nhan-vat/ear_fit.py -- <ortho_b> <lm_photo.json> <ảnh chính diện tách nền.png> \
    <wrap_e.blend> --save D:\Assets\parts\ears\<tên>.json
```
Đo bề rộng bóng đầu theo từng độ cao (dải 1 mm) trong vùng tai — lưới (đỉnh chiếu thẳng) vs alpha ảnh (đặt chồng theo điểm
mốc); dò 11 thanh tai MakeHuman (nạp bằng `TargetService`, cả hai tai cùng trọng số) theo lưới 0..1 bước 0,05, 3 vòng.
Model-1: lệch bóng 6,8 → 3,6 mm (`tai-thon`: wing-decr 0,4, rot-forward 0,25, trans-up 0,15, scale-vert-incr 0,15…).
Bước 6c dùng `<wrap_e.blend>`.

### Bước 6b4. Sửa hình tai + nếp gập dưới hàm (chạy được trên base đã tô màu: chỉ dời đỉnh, giữ UV/texture)

```bash
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/fix_ears.py -- <b1.blend> --ears D:\Assets\parts\ears\<tên>.json
blender -b <b1.blend> --python scripts/phong/san-bar/nhan-vat/fix_folds.py -- <ortho_b> <b2.blend> --deg 14 --edge --any-y --z-hi 0.035 --x-min 0.025 --iters 20
blender -b <b2.blend> --python scripts/phong/san-bar/nhan-vat/fix_folds.py -- <ortho_b> <b3.blend> --deg 12 --edge --any-y --z-lo 0.08 --z-hi -0.01 --x-max 0.03 --iters 20
blender -b <b3.blend> --python scripts/phong/san-bar/nhan-vat/ear_fit.py -- <ortho_b> <lm_photo.json> <ảnh chính diện tách nền.png> <b4.blend>
```
Soi bằng ảnh đất sét (thay vật liệu Body bằng màu trơn rồi `base_head.py views`): lỗi hình lộ rõ hơn ảnh có màu.
- `fix_ears.py`: lúc bọc, tai + da sát tai dời theo trường làm mịn, da sau tai áp vào tai rối của tượng → đỉnh vành tai cụt,
  sau tai thành miếng da phẳng. Dựng lại từ người MPFB mới (cùng thông số cơ thể + dáng tai `--ears`), đặt bằng phép đồng dạng
  khớp theo vòng da cách tai 6–9 vòng đỉnh, pha dần ra ngoài. Đặt xong tai áp sát đầu hơn → chạy lại `ear_fit.py` cho đúng độ xoè.
- `fix_folds.py --edge`: lệch so với **từng** mặt kề (nếp dài, thoải 15–19° dưới hàm: lấy trung bình các mặt kề thì không lộ);
  `--any-y`: xét cả mặt dưới hàm (nằm sau "nửa trước đầu"); `--z-lo/--z-hi/--x-min/--x-max`: khoanh dải. Lượt dưới cằm phải
  chừa hai bên cổ (`--x-max 0.03`): làm mượt cả bề ngang thì cổ nhập vào hàm, mất đường hàm; ít vòng (8) thì để lại vệt dọc.
- Đỉnh tai: thanh MakeHuman để đỉnh vành tai nhọn, có mặt vát chéo xuống thái dương (nhìn thẳng thấy "góc" nối đầu; người
  dùng chỉ ra) → `ear-shape-round` 1 + `ear-flap-incr` 0,6 (bo tròn, cong vành như ảnh). Hai thanh này làm tai chĩa ra thêm
  ~8 mm → bù `ear-wing-decr`. Chọn độ xoè bằng `ear_carve.py --dry` (in bóng lưới vs ảnh theo dải 1 mm, điểm mẫu dày —
  `ear_fit` lấy theo đỉnh thưa nên đo hụt). Model-1: `parts\ears\tai-tron.json` (tổng trọng số, dùng cho `fix_ears --ears`).
  `ear_carve.py` không `--dry` = kéo đỉnh ngoài bóng ảnh vào theo x (chưa dùng: lưới rộng hơn ảnh đều cả tai, khoét thì bẹp tai).
- Model-1: hết mảng xám dưới góc hàm (40°), vệt dưới cằm, miếng da sau vành tai; điểm giống 75,4 → 70,7 % (chính diện
  85,6 → 80,2: tai nhìn thẳng mảnh hơn, hàm mềm hơn chút) — đổi lấy hết lỗi hình.

### Bước 6b5. Nắn hàm–cằm theo điểm viền mặt MediaPipe (chạy được trên base đã tô màu)

```bash
# hpc (MP): so 18 điểm viền hàm–cằm ảnh chụp lưới vs ảnh mẫu 3 góc; xuất điểm điều khiển từ ảnh chính diện
mpvenv/bin/python oval_cmp.py score/ref score/<vN> --pairs 0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png
mpvenv/bin/python oval_cmp.py score/ref score/<vN> --pairs 0:face-01-front.png --out score/jaw.json
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/jaw_nudge.py -- <ortho chụp lưới> jaw.json <ra.blend> [--depth-gain 0.7]
```
Căn đồng dạng theo khoé mắt, mũi, khoé miệng; độ dời x–z theo ảnh, trước–sau theo chiều sâu z của MediaPipe (tương đối đỉnh
mũi); lấy đối xứng; neo mắt, mày, mũi, môi, gò má; RBF gauss σ 15 mm. Lặp 2 vòng (đo lại trên ảnh chụp mới). Khớp bóng
(`shape_fit.py --band-top mouth --cand …`) không bắt được: lệch bóng chỉ 1–3 mm, còn lỗi là chiều sâu cằm + độ thấp đường hàm.
Model-1 ("cằm nhọn, hai bên cằm thiếu"): hàm ảnh rộng hơn 3–3,5 mm mỗi bên, thấp hơn ~3 mm, cằm nhô trước ~3 mm → sau 2 vòng
còn ~2 mm; điểm 70,6 → 71,6–72,1 % (chính diện 78,5 → 81,7). Soi đất sét thấy nắn đủ số đo thì đệm cằm nổi khối, hai bên
hàm phồng (z MediaPipe và điểm viền hàm đo hụt) → chốt **một vòng**, `--sigma 0.02 --x-gain 0.5 --depth-gain 0.8`, rồi làm
mượt riêng chỗ gợn dưới môi: `fix_folds.py --deg 10 --edge --any-y --z-lo -0.012 --z-hi 0.026 --x-max 0.015 --iters 10`
(khoanh rộng hơn — `|x|` < 2 cm, từ dưới cằm — thì mặt trước cằm phẳng, đáy cằm thành góc vuông).

### Bước 6c. Nướng màu sang UV lưới gốc — ĐÃ CHỐT

Vùng đầu dừng ngay dưới cằm; tông da thân chỉnh theo da mặt; tròng thư viện ghép vào bố cục texture mắt MakeHuman, **giữ alpha**
để giác mạc trong suốt; mày MPFB bỏ (vẽ ở bước 6d), mi giữ thẻ mi MPFB (bám đúng mép mí, theo xương).
```bash
blender -b <wrap_n.blend> --python scripts/phong/san-bar/nhan-vat/bake_to_base.py -- <đầu đã tô màu.glb> <base.blend> --hy-geo <tượng gốc.glb> \
    --iris D:\Assets\parts\eyes\<tên>\iris_l.png --iris-scale 1.15 --sclera 0.3 --lashes eyelashes03 --nudge <wrap_n>_nudge.json
```
Kiểu mi MPFB: `eyelashes01` ngắn, `02` vừa, `03` dài vút đuôi (hợp mắt donghua), `04` rất dày.
Bộ mi riêng (đậm, mi trên dày, mi dưới nhạt) dựng từ bộ mi MPFB rồi đưa đường dẫn thư mục cho `--lashes`:
```bash
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/lash_style.py -- eyelashes04 D:\Assets\parts\lashes\<tên> [--low 0.3] [--thick 0.5] [--dense 2]
```
Sợi màu nâu đen, nở 1 px, alpha `1-(1-a)^dense`; mi dưới (mặt thẻ nằm dưới tâm mắt) × `--low`. `bake_to_base` đặt chất liệu mi
nhám 0,9, bóng 0,1 (mặc định MPFB bóng 0,5 → mi xám dưới đèn). Model-1: `parts\lashes\day-04` (04, `--low 0.3`) → điểm giống
70,9 → 75,4 % (cùng phấn mắt `anh-mau-2`).

### Bước 6d. Làm sạch vùng mắt–mày–tai + trang điểm vào texture — ĐÃ CHỐT

```bash
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <base.blend> <ortho_b>     # + landmarks.py, chép lm_photo.json vào <ortho_b>
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/makeup.py -- <base.blend> <base_mk.blend> <ortho_b> \
    --style D:\Assets\parts\makeup\<tên>\style.json --photo <ảnh face-01-front.png> [--save-brow D:\Assets\parts\brows\<tên>]
# nhân vật khác, dùng lại mày đã tách: --brow-shape D:\Assets\parts\brows\<tên>   (thay cho --photo)
```
~8 phút. Thứ tự xử lý texture (trong UV, chỉ khung mặt + cổ):
1. **Khử đốm**: lọc đóng rồi lọc mở (bán kính ~1,6 mm, chừa môi) — xoá đốm tối/sáng nhỏ (sợi mi/mày sót, chấm bóng lấm tấm
   sống mũi và cạnh mũi, đường nối texture Hunyuan).
2. **Da đều màu**: nhân tỉ số (mờ σ 15 mm / mờ σ 3 mm), chừa môi + lỗ mũi → bỏ mảng loang 3–15 mm của tượng (vòng nâu quanh
   mắt, quầng sáng quanh mày, vệt sáng sống mũi), giữ vân da mịn và tông lớn.
3. **Làm sạch**: mắt (tới nếp mí, ra quá đuôi mắt 0,5 × bề ngang mắt, xuống ~0,5 dưới mí dưới) và cổ (dưới mặt phẳng qua cằm
   chếch lên sau, tới ~10 cm dưới cằm: xoá bóng vòng cổ in lên da) = tông da xung quanh (push–pull; cổ làm mờ thêm σ 1 cm) ×
   **chi tiết mịn < 2,5 mm** của da MakeHuman (nếp mí, khoé mắt). Tai: tông da mặt × `--ear-tint` (mặc định `1,0.95,0.93`, ửng
   hồng) × khối vành tai MakeHuman chỉ mảng mềm 1,2–8 mm, nén `--ear-shade` 0,6 (lấy cả vân nhỏ thì tai nhăn như giấy vò). Mày
   cũ: màu da xung quanh.
3b. **Tông + vân da**: `--skin-gain` (tuyến tính, mặc định `1.02,1,0.96`: model-1 đo ở chỗ không cháy sáng thì sắc da lưới
   ≈ ảnh, ảnh ấm hơn ~4 %) áp cho cả texture; vân lỗ chân lông giả (nhiễu dải 0,3–1 mm, `--pores` 0,035) vì da sau làm sạch mịn
   như sáp. Da nhìn "hồng chói" trên ảnh chụp thử phần lớn do đèn chụp (trán, cằm cháy sáng), không phải do màu.
4. **Trang điểm** chồng tuyến tính: phấn mắt, **kẻ mắt** (`liner_width`, `liner_wing`), **kẻ mí dưới** nửa ngoài
   (`lower_liner`), má hồng, tạo khối, bắt sáng, môi — vị trí theo điểm mốc của chính lưới.
   `lower_liner_width` (theo bề ngang mắt, mặc định 0,035); `lower_lid_band` = [cách mi, rộng, từ điểm mí thứ] (mặc định
   0,08 / 0,1 / 4 = nửa ngoài sát mi). Đặt độ đậm theo đo màu ảnh vs ảnh chụp lưới ở cùng điểm (mí trên, nếp mí, dưới mí, má).
   Model-1 `anh-mau-2`: phấn mắt 0,45, nếp mí 0,25, mí dưới 0,5 dải 0,12 / 0,2 / 2, kẻ mí dưới rộng 0,06.
5. **Mày tách từ ảnh** (`--photo`): trong khung chuẩn mỗi bên (gốc = khoé mắt trong, trục ngang mặt, đơn vị = bề ngang mắt),
   độ đậm = (da quanh mày − ảnh) / (da − màu mày), màu mày = trung vị 25 % điểm tối nhất; viền điểm mốc nới 0,06. Đúng dáng,
   độ mờ đầu mày, đuôi vút của ảnh. `--save-brow` lưu `brow_l/r.png` + `brow.json` thành bộ phận.

Không lấy cả màu da MakeHuman (chỉ sáng–tối): lấy cả màu thì vùng sạch ánh vàng xanh. Không lấy sáng–tối mảng lớn của nó cho
vùng mắt: mí MakeHuman sáng hơn má → quầng sáng hình chữ nhật quanh mắt.

### Bước 6d2. Da chiếu thẳng từ ảnh — ĐÃ CHỐT

Texture tượng Hunyuan chỉ "na ná" ảnh. Chiếu thẳng ảnh mẫu đã xoá **cả mi lẫn mày** (`clean_b\nobg`) lên UV lưới gốc (`photo_project.py`, gọi từ `makeup.py`):
```bash
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <base.blend> <ortho_yaw> --soft --angles 0,20,25,30,35,40,320,325,330,335,340
# hpc-station: landmarks.py <ortho_yaw> → <ortho_yaw>\lm_ortho.json ; chọn góc mỗi ảnh = góc lệch điểm mốc nhỏ nhất
#   (model-1: ảnh 02 "45°" ≈ 40°, ảnh 08 "315°" ≈ 330°)
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/makeup.py -- <base.blend> <base_mk.blend> <ortho_b> \
    --style D:\Assets\parts\makeup\anh-mau\style.json --brow-shape D:\Assets\parts\brows\<tên> \
    --photos <thư mục ảnh sạch> --views 0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png \
    --view-ortho <ortho_yaw>
```
Texel → ảnh: chiếu ortho đúng góc + uốn TPS theo điểm mốc; bị che (z-buffer) / nghiêng quá → không lấy; khử ánh sáng bằng cầu
điều hoà bậc 1 theo pháp tuyến; trộn theo (N·hướng nhìn)², ảnh chính diện ưu tiên; khớp tông lớn σ 25 mm với texture cũ.
Vùng mắt + mày nới ~6 mm **không lấy ảnh** (ảnh sạch có mảng mờ xám ở đó), lấp bằng màu da ảnh xung quanh × vân mịn.
Style `anh-mau` = `do-cam` tắt má hồng, tạo khối, bắt sáng, son (ảnh đã có). Tai, cổ: tông da mặt × vân mịn MakeHuman.

### Bước 6d3. Thước đo độ giống (hpc-station)

```bash
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <base.blend> <ortho_s> --soft --angles 0,40,330   # đèn giống ảnh
# ortho_s/*.png ở assets/<tên>/hpc/score/<bản>, 3 ảnh mẫu ở assets/<tên>/hpc/score/ref
MP repo/scripts/phong/san-bar/nhan-vat/face_score.py assets/<tên>/hpc/score/ref assets/<tên>/hpc/score/<bản> --pairs 0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png
```
Nhận diện khuôn mặt SFace + dò mặt YuNet (OpenCV Zoo, giấy phép Apache/MIT; mô hình InsightFace chỉ cho nghiên cứu phi thương
mại nên không dùng), mô hình ở `~/ai3d/models/`. % = cos(dựng, ảnh cùng góc) / cos trung bình giữa chính các ảnh mẫu khác góc.
Mỗi lần sửa chấm lại; giữ thay đổi nào làm điểm tăng. Model-1: 61 % (trước chiếu ảnh) → 73,6 % (chính diện 84, 3/4 68–70).

### Bước 6d4. Chẩn đoán điểm: vùng nào kéo xuống, ảnh dải tần (hpc-station)

```bash
mpvenv/bin/python part_swap.py score/ref/face-01-front.png score/<vN>/ortho_0.png [--out score/swap<vN>] [--band score/band<vN>.png]
```
- **Ghép thử từng vùng**: ảnh dựng đặt chồng vào khung ảnh mẫu (đồng dạng theo khoé mắt, mũi, khoé miệng); thay vùng mày /
  mắt / mũi / miệng / cằm / má / trán / ngoài mặt / da cả mặt bằng vùng đó của ảnh mẫu (bao lồi điểm MediaPipe, mép mờ) rồi
  chấm lại SFace. Tăng nhiều = vùng đáng sửa. Phần da tách tiếp: tông màu (TB + lệch Lab), sáng–tối thô (mờ σ 6/15/30 px),
  vân (< σ 4 px).
- **Ảnh dải tần độ sáng** (`--band`, DoG): kênh L của Lab, mờ σ 2 px − mờ σ 15 px, hiện 128 + 4 × giá trị (xám = không có chi
  tiết; sáng = chỗ nổi/sáng; tối = hõm/tối); trái ảnh mẫu, phải ảnh dựng đã đặt chồng, cắt quanh mặt; ảnh mẫu thu về 1024 px
  cao. Giữ chi tiết sáng–tối cỡ 2–15 px (~1–5 mm: nếp mũi–má, bọng mắt, kẻ mắt, viền môi, khối viền mặt), bỏ tông màu và đèn
  tổng thể → so hai bên thấy ngay thiếu nét ở đâu. Lưu kèm số phiên bản (`band<vN>.png`) để so qua các bản.
- Model-1 v37 (chính diện cos 0,645): da cả mặt +0,189 (> 100 %), mắt +0,071, trán +0,060, mày +0,058, ngoài mặt +0,026, cằm
  +0,013, mũi/miệng ~0. Trong da: tông màu −0,004 (không phải lỗi), sáng–tối σ 6 px +0,098, σ 15 px +0,034, vân +0,020 → lỗi
  là chi tiết sáng–tối 2–5 mm. Ảnh dải tần: ảnh mẫu kẻ mắt đậm + mí/quanh mắt sáng, da mịn, viền má–hàm tối mềm; bản dựng da
  lấm tấm, má có mảng tối, viền mặt thiếu khối. Bỏ cổ khi chấm: không đổi (81,3 vs 81,0 %) — SFace chỉ cắt vùng mặt.

### Bước 6e. Normal map — ĐÃ CHỐT

```bash
blender -b <base_mk.blend> --python scripts/phong/san-bar/nhan-vat/bake_normal.py -- <base_n.blend> --tex 2048 --ortho <ortho_b> [--max-deg 20]
```
`--ortho`: để phẳng cả quanh mắt và cổ — tượng nặn bọng/mí riêng (vệt chéo dưới đuôi mắt) và nặn vòng cổ của ảnh thành khối, góc
lệch nhỏ nên lọt qua `--max-deg`.
Nguồn là "HunyuanAligned" (tượng đủ chi tiết đã căn sẵn). Tia ngắn ±4 mm; chỗ lưới gốc cố ý khác tượng (mắt, tai, lòng miệng) lệch
hướng lớn → để phẳng. ~2 phút.

### Bước 10. Tóc — ĐÃ CHỐT (khối trơn + bay theo điệu)

```bash
# hpc: front = hair-01-front, left = hair-02-left-profile, right = hair-03-right-profile, back = hair-04-back
AI repo/scripts/phong/san-bar/nhan-vat/hunyuan_mv.py assets/<tên>/hpc/hair assets/<tên>/out/hunyuan_hair.glb --octree 448   # ~3 phút
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/hair_fit.py -- <tóc.glb> <thư mục ảnh tóc> <base_hair.blend> [--pen 12] [--gain 0.7]
blender -b <base_hair.blend> --python scripts/phong/san-bar/nhan-vat/rig_base.py -- <thư mục FBX> <ra.glb> <điệu…>   # tự dựng xương tóc + mô phỏng
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_dance.py -- <ra.glb> "<điệu>" <ra.png> --views back,side
```
- `hair_fit.py`: khối Hunyuan (1,2 triệu đỉnh) → giảm còn 120 nghìn mặt → ráp tỉ lệ + dời lên da đầu (nhóm "scalp"): tia từ da
  đầu theo pháp tuyến chạm mặt tóc cách 4 mm; đỉnh da đầu chọc ra ngoài tóc phạt × `--pen` (4 → lộ da đỉnh sau; 12 kín) →
  mở UV → chiếu màu 4 ảnh (trọng số hướng nhìn², bỏ chỗ bị tóc che), lấp push–pull, `--gain` 0,7 (ảnh tóc + đèn mềm → xám).
  Ảnh tóc và ảnh mặt **không** cùng khung → ráp theo hình 3D, không theo toạ độ ảnh.
- `hair_dyn.py` (gọi từ `rig_base`): sau khi về chữ T, mỗi hướng 25° quanh đầu có tóc rủ dưới ngang tai → một chuỗi 4 đốt
  theo trung vị khối tóc (model-1: 14 chuỗi, gồm 2 lọn trước tai); trọng số: trên ngang tai theo đầu, dưới chia 2 chuỗi gần
  nhất, nội suy dọc đốt. Mỗi điệu: mô phỏng lò xo (3 bước con/khung, giảm chấn 0,9, kéo về dáng gốc 0,03, trọng lực, giữ độ
  dài đốt, cầu va chạm đầu–cổ–ngực–vai–tay) → khoá hình xương tóc ngay trong action của điệu → GLB mang sẵn tóc bay, không sửa
  app. Kéo về dáng 0,06 thì tóc gần như đứng yên. Trước đó: chép trọng số thân gần nhất cho tóc → lọn trước vai bị kéo giãn
  khi giơ tay (chỉ giữ đầu/cổ/cột sống thì hết).
- Model-1: `out\model1_hair.glb` (31,8 MB, 108 xương, 6 điệu). Còn: tóc là khối trơn (cách điệu, không có sợi); vài khung lọn
  trước tai lòi qua nách/ngực khi vặn mạnh.
- Đã thử thẻ tóc tự sinh (`hair_cards.py`, dải mỏng texture sợi alpha cắt phủ lên khối): theo trọng lực → mất dáng lọn xoắn,
  đỉnh lởm chởm; hướng sợi đọc từ ảnh (structure tensor) → nhiễu, đảo chiều, rối; chỉ phủ phần tóc rủ → vẫn lổn nhổn → bỏ,
  dùng khối trơn. Tóc đẹp như ảnh render cao cấp cần chải tay (hoạ sĩ tóc) hoặc hệ tóc đường cong của Blender rồi đổi ra thẻ.
- `build_hair.py` (cũ, đầu Hunyuan): vỏ ôm sọ + dải bám sọ — bỏ.

### Bước 10b. Hồ sơ nhân vật: dáng thân, da nền, quần áo — ĐÃ CHỐT

Một file `D:\Assets\parts\body\<tên>.json` cho mỗi nhân vật (mẫu: `model-1.json`; thử: `nguc-to-mong-to.json`,
`nguc-nho-mong-nho.json`); cách ghi xem đầu `char_profile.py`:
- `macro`: thanh tổng MakeHuman — giới tính, tuổi, cơ bắp, cân nặng, chiều cao, tỉ lệ, `cupsize` (cỡ ngực), `firmness` (độ săn
  ngực), chủng người.
- `targets`: thanh vùng `"thư mục/tên": trọng số` — ngực (`breast/breast-volume-vert-up`, `breast-trans-up`…), mông
  (`buttocks/buttocks-volume-incr/decr`), hông (`hip/hip-scale-horiz-incr`…), eo/vòng (`torso/measure-waist-circ-decr`,
  `measure-hips-circ-*`, `measure-bust-circ-*`), vai (`torso/measure-shoulder-dist-*`), cổ (`neck/neck-scale-vert-incr`,
  `measure-neck-height-*`), tay (thư mục `arms`), chân (`legs`). Có bản l-/r- thì cộng cả hai bên.
- `skin`: da nền MPFB (22 loại: `young_asian_female`, `young_caucasian_female`, `young_african_female`, `middleage_*`…).
- `clothes`: quần áo MPFB CC0 (`female_casualsuit01/02`, `female_elegantsuit01`, `female_sportsuit01`, `shoes01..06`, mũ
  `fedora01`…) — tự ôm theo dáng, gắn xương bằng `.mhclo`.
```bash
# nhân vật mới: dựng thân theo hồ sơ ngay từ đầu (wrap, eye-fit, fix_ears dùng cùng hồ sơ)
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- wrap … --profile D:\Assets\parts\body\<tên>.json
# đổi dáng thân / mặc đồ trên base đã làm xong mặt (đầu giữ nguyên hình, chỉ dời khối nếu cổ đổi)
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/apply_profile.py -- <ra.blend> --to <hồ sơ mới.json> [--from <hồ sơ cũ.json>]
# da thân đều màu + khớp da mặt (sau makeup)
blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/body_tone.py -- <ra.blend> [--sigma 0.04] [--gain 1,1,1]
```
- `apply_profile`: độ dời = người MPFB theo hồ sơ mới − theo hồ sơ cũ (đủ lưới phụ + đỉnh khớp → xương dựng theo dáng mới);
  từ khớp đầu trở lên dời nguyên khối (mặt giữ hình), chuyển mềm 4 cm; mắt, mi, tóc dời theo. Model-1: ngực to–mông to dời
  thân tối đa 53 mm; ngực nhỏ–mông nhỏ + cổ dài đầu lên 15 mm.
- `body_tone`: màu đích = trung vị da má–cằm; thân × (đích / mờ σ 4 cm) — bỏ vết rám nắng của da MakeHuman (vệt sẫm bụng
  dưới, mảng sáng lưng–mông) và thân nhạt/trắng hơn mặt (model-1: thân (0,87; 0,55; 0,50) → mặt (0,78; 0,40; 0,34) tuyến
  tính); chừa núm vú, vùng kín. Còn mờ mờ mép vệt rám nắng sắc ở bụng dưới.
- `rig_base`: xoá thân dưới quần áo (nhóm `Delete.<bộ đồ>` của MPFB — glTF không áp bộ ẩn, để lại thì da lòi qua áo); da
  thân `OPAQUE`, mi + quần áo alpha cắt `MASK`, mắt `BLEND`.
- Ảnh mẫu đồ: `out\clothes_catalog.png`. Đồ kiểu vũ công đỏ–vàng như `D:\Live\images\1.png` không có sẵn → phải dựng riêng.

### Bước 6f. Xương + điệu nhảy + xuất GLB — ĐÃ CHỐT

```bash
blender -b <base_n.blend> --python scripts/phong/san-bar/nhan-vat/rig_base.py -- D:\Assets <ra.glb> [điệu ...] [--render <tiền tố>]
```
Rig `mixamo` của MPFB dựng theo đỉnh khớp (đã dời theo đầu bọc); mắt, mi gắn xương bằng hàm MPFB (nội suy trọng số); bỏ lưới phụ;
mỗi điệu một dải NLA (retarget.py). ~30 giây/điệu. `--render`: chụp 3 khung điệu đầu để xem mắt, mi bám đầu.

### Bước 6g. So chồng với ảnh mẫu

```bash
blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- views <base_n.blend> <ortho_f>   # chép lm_ortho.json + lm_photo.json của bước 6d vào
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/compare_overlay.py -- <ortho_f>\ortho_0.png <ortho_f>\lm_ortho.json \
    <ảnh face-01-front.png> <ortho_f>\lm_photo.json <ra.png>
```
