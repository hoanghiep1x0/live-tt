# 05 — Nhân vật mới, kiểm tra, thư viện bộ phận

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).

### Checklist nhân vật mới (rút từ model-1, 2026-11-04)

Thứ tự: hình khối → soi đất sét → chấm điểm + chẩn đoán → texture/trang điểm → soi lại → xương, GLB.
1. **Soi đất sét sau mỗi bước sửa hình** (`clay_view.py` + `base_head.py views --soft --angles 0,40,330`). Texture chiếu từ ảnh
   che lỗi hình: miếng da sau tai, nếp gập dưới góc hàm, vệt dưới cằm, gợn dưới môi đều chỉ thấy rõ trên đất sét.
2. **Tai**: sau bọc luôn chạy `fix_ears.py` (tai MakeHuman đặt cứng; không thì tai nhăn, đỉnh vành cụt, sau tai thành miếng da).
   Đỉnh tai: `ear-shape-round` + `ear-flap-incr` (không có thì nhìn thẳng thấy góc vát nối lên thái dương). Độ xoè chọn bằng
   `ear_carve.py --dry` (bóng điểm mẫu dày), **không** tin `ear_fit` (đỉnh thưa, chọn xoè thấp). Màu tai: `--ear-tint`,
   `--ear-shade 0.6` (vân MakeHuman nguyên độ → tai như giấy vò). Normal map: `bake_normal` để phẳng nhóm "ears".
3. **Làm mượt (`fix_folds`) luôn khoanh hẹp**: `--edge --any-y` + `--z-lo/--z-hi/--x-min/--x-max` đúng chỗ lỗi. Khoanh rộng →
   mất đường hàm (cổ nhập hàm), mặt trước cằm phẳng, đáy cằm vuông. Ít vòng (8) trên nếp dài → để lại vệt dọc. Lượt dưới cằm:
   `--x-max 0.03`.
4. **Hàm–cằm**: đo bằng `oval_cmp.py` (điểm viền MediaPipe), nắn `jaw_nudge.py` **một vòng**, `--sigma 0.02`, `--x-gain
   0.5–0.7`, `--depth-gain ≤ 0.8`. Nắn đủ số đo (2 vòng, σ 15 mm) → đệm cằm nổi khối, hai bên hàm phồng như má xệ. Khớp bóng
   (`shape_fit`) không thấy lỗi chiều sâu cằm.
5. **Đổi trang điểm sau khi sửa hình**: `reset_color.py` (gắn lại texture của bake_to_base) rồi mới `makeup.py` — chạy trên
   texture đã trang điểm thì lớp chồng lớp; chạy trên base cũ thì mất sửa hình.
6. **Chấm điểm đúng chỗ**: bỏ cổ không đổi điểm (SFace chỉ cắt mặt). Dùng `part_swap.py` (+ `--band`) tìm vùng kéo điểm trước
   khi sửa — model-1: da cả mặt (sáng–tối 2–5 mm) nặng nhất, rồi mắt, trán, mày; tông màu da không phải lỗi. Sai số mỗi lần chấm
   ±3–5 %, so ≥ 2 góc và xem ảnh, đừng chạy theo 1 con số.
7. **Trang điểm** (model-1 `anh-mau-5`): tạo khối (`contour`) = 0 trừ khi ảnh có — 0,15 đã làm má hóp (người dùng chỉ ra);
   `liner_width` ≤ 0,17, `liner_wing` ≤ 0,32 (0,2 / 0,4 → chấm đen tách rời ở đuôi mắt); phấn mắt nhạt (mí trên ảnh mẫu sáng),
   bắt sáng dưới mắt 0,2. Da: `--pores 0.015`, `--even-post 0.8`, `--keepout-detail 0.25` (da MakeHuman có tàn nhang → chấm nâu
   dưới mắt). Mi: `lash_style.py` (mi trên dày, mi dưới × 0,3).
8. **Vận hành**: mỗi lúc một tiến trình Blender (~10 GB RAM trống); dừng chuỗi lệnh thì kiểm tra `tasklist` và tắt Blender
   mồ côi; chuỗi `sed` thay số phiên bản phải đổi hết tên thư mục ra (`ortho_soft<vN>`, ảnh so sánh) — sót thì ghi đè bản cũ.

## 5. Kiểm tra (kinh nghiệm hoạ sĩ)


- **To trước, nhỏ sau**: khối đầu, tỉ lệ mắt–mũi–miệng đúng rồi mới làm mi, mày, trang điểm.
- **Chồng ảnh 50% + lật gương**: `compare_overlay.py -- <ortho_0.png màu> <lm_ortho.json> <ảnh mẫu> <lm_photo.json> <ra.png>`
  (chụp màu bằng `render_ortho.py ... 0 --color`). In ra độ lệch điểm mốc (px).
- **Xem ở cỡ hiển thị thật** (mặt cao ~100–150 px): chỉnh thứ thấy được ở cỡ đó trước.
- **Đối xứng trước, phá đối xứng nhẹ sau.**
- **Bóng tạo hồn**: vành bóng quanh mắt, bóng mí trên, bóng dưới môi dưới, dưới cằm.
- **Mỗi lần chỉ thay một thứ rồi so lại.**
- Soi cận: `render_closeup.py -- mesh.glb ra.png --z <độ cao> --size <khung> [--color]`; toàn cảnh: `render_mesh.py -- mesh.glb <tiền tố> --color`.

## 6. Thư viện bộ phận (tái dùng cho nhân vật khác)


| Bộ phận | Lưu ở | Tạo | Dùng lại |
|---|---|---|---|
| Đầu gốc theo nhóm | `D:\Assets\base\<nhóm>\` | `base_head.py render` + điểm mốc | `base_head.py wrap` |
| Dáng mắt (lưới gốc) | `parts\eyeshape\<tên>.json` (trọng số thanh trượt mắt MakeHuman) | `base_head.py eye-fit` | `wrap --eye-targets <file>` |
| Dáng mắt — bộ mẫu ChatGPT + Blender | `parts\eyeshape\<tên>\part.json` (`targets` `eyes/l-…` + `eyes/r-…` soi gương, `dinh`) + ảnh như mũi | §6a + skill `chatgpt-bo-phan-3d` (mục Mắt): `bo_phan.py khop-mat`, `mat-buoc.sh` | như mũi: `bo_phan chup --part <part.json>` |
| Kiểu mi (lưới gốc) | thẻ mi MPFB `eyelashes01..04` | — | `bake_to_base.py --lashes <tên>` |
| Bộ mi riêng | `parts\lashes\<tên>\` (.mhclo/.obj/.mhmat + .png) | `lash_style.py` | `bake_to_base.py --lashes <thư mục>` |
| Tròng mắt | `parts\eyes\<tên>\iris_{l,r}.png` | `build_eyes.py --save-iris <thư mục>` | `--iris-tex <png>`; lưới gốc: `bake_to_base.py --iris <png> --iris-scale` |
| Kiểu mí | `parts\eyelids\<tên>.json` | `build_eyes.py --save-lid <file>` | `--lid-shape <file>` |
| Kiểu mày | `parts\brows\<tên>.json` | `makeup.py --save-brow <file>` | `--brow-shape <file>` |
| Dáng tai (lưới gốc) | `parts\ears\<tên>.json` (trọng số thanh trượt tai) | `ear_fit.py --save` | áp lại bằng `ear_fit.py` hoặc TargetService |
| Mày tách từ ảnh (lưới gốc) | `parts\brows\<tên>\` (`brow_l/r.png` + `brow.json`, khung chuẩn theo mắt) | `makeup.py --photo <ảnh> --save-brow <thư mục>` | `--brow-shape <thư mục>` |
| Bộ trang điểm | `parts\makeup\<tên>\` (từng lớp PNG + `style.json`) | `makeup.py --save <thư mục>` | `--style <style.json>` |
| Kẻ mắt, mi | thông số | `--liner --wing`, `--lash --curl --lash-density` | đổi số |
| Dáng mũi | `parts\nose\<tên>\part.json` (`{"targets": {"nose/<thanh>": w}}`) + ảnh mẫu, ảnh dựng, `so-sanh.jpg` | §6a + skill `chatgpt-bo-phan-3d`: ChatGPT sửa từng góc trên ảnh Blender → `bo_phan.py khop-khuon` | `bo_phan.py chup --part <part.json>`; hồ sơ nhân vật: chép `targets` vào `parts\body\<tên>.json` |

Đã có (từ model-1): tròng `nau-ho-phach`, mí `hanh-nhan`, mày `la-lieu`, trang điểm `do-cam` (có kẻ mắt, mày đậm cho lưới gốc),
dáng mắt `mat-phuong` (đuôi xếch). Mũi: `hech` (mũi hếch) đạt 2026-11-05; tiếp theo các kiểu trong bảng mô tả của skill, rồi mắt, tai.

### 6a. Làm bộ mẫu bộ phận: ChatGPT vẽ, Blender dựng, so khớp 1:1 — QUY ƯỚC

Bộ phận luôn **dựng bằng Blender** (thanh trượt MakeHuman trên đầu chuẩn); ChatGPT Image chỉ cung cấp **ảnh mẫu và góc nhìn**
để so. Mỗi bộ phận là một bộ mẫu nhiều kiểu (mũi: thẳng, hếch, cao, tẹt, gồ, nhỏ thon, đầu tròn, dài rủ…), nhân vật mới chỉ
chọn tên mẫu.

**Quy trình chuẩn — ChatGPT sửa từng góc, Blender giữ khối 3D** (chốt 2026-11-05). Làm theo skill
`.claude/skills/chatgpt-bo-phan-3d/SKILL.md` (từng bước, lệnh, lời nhắc đã kiểm chứng, cổng kiểm tra). Tóm tắt:

1. **Khuôn** của loại bộ phận (một lần): Blender chụp riêng vùng bộ phận của đầu chuẩn, nền trong suốt, **mép sắc**, mỗi góc
   một ảnh 1024 px — `bo_phan khuon <ra> --goc 0,90,45,duoi45 --tung --sac --R 1024`. Mũi: `assets/parts/nose/_khuon/`
   (`khuon.json` = vùng, tâm, cỡ khung; `goc/*.png`).
2. **Hai góc chính để khớp: nghiêng 90° rồi chính diện.** Mỗi lượt ChatGPT sửa **một** góc trên ảnh Blender vừa chụp
   (lời nhắc P1, P2), Blender khớp (`bo_phan khop-khuon <thư mục> 90=…,0=… --tu-do N --mu 1`: thanh trượt + tinh chỉnh
   đỉnh ép đối xứng) rồi chụp lại **mọi** góc từ khối 3D — nên các góc luôn nhất quán.
3. **Hai góc duyệt: 45° và dưới-trước 45°** (lời nhắc P3) — đo ChatGPT còn muốn sửa bao nhiêu; ≤ 0,5 mm là đạt.
4. **Cổng kiểm tra** tự động trong log: `CONG` (ảnh ChatGPT không được dịch/phóng khung), `KHOP` (lệch mép mm từng góc).
5. Chốt, chụp `dung/` + cả đầu `mat/`, ghép `so-sanh.jpg`, **duyệt bằng mắt**.

**Luật khi nhờ ChatGPT:** chỉ vẽ đúng bộ phận đang làm — không kèm mặt, cổ, bộ phận khác — nền trong suốt (ghi rõ "PNG
alpha, not black"); luôn sửa trên ảnh Blender gửi kèm, không để ChatGPT tự bố cục; mô tả kiểu bằng hình khối; mỗi yêu cầu
một lượt, chờ ~60 s.

**Ngưỡng đạt** (mm thật trên khung khuôn): góc chính ≤ 0,3 mm, góc duyệt ≤ 0,5 mm, **0 mặt lật** (cổng `MAT_LAT` — số lệch
mép không bắt được lưới gập), + duyệt mắt. Phần Blender từng bước: `scripts/phong/san-bar/mui-buoc.sh <tên> a|b|c|b2|chot`.

**Bộ mẫu mũi — ĐẠT cả 8 kiểu (2026-11-05)**, `D:\Assets\parts\nose\<tên>\`, bảng `_tong\bang.json`, ảnh `_tong\bo-mau.jpg`:

| Kiểu | Nghiêng | Chính diện | 45° | Dưới-trước | Ghi chú |
|---|---|---|---|---|---|
| `hech` hếch | 0,13 | 0,09 | 0,39 | 0,21 | gỡ gập 2 mặt |
| `thang` thẳng | 0,03 | 0,18 | 0,30 | 0,19 | |
| `cao` cao | 0,02 | 0,12 | 0,41 | 0,16 | `b2` thêm dưới-trước |
| `tet` tẹt | 0,04 | 0,18 | 0,28 | 0,23 | |
| `gu` gồ | 0,11 | 0,28 | 0,34 | 0,38 | `b2` thêm 45°; gỡ gập (từng có vệt dưới lỗ mũi) |
| `nho-thon` nhỏ thon | 0,03 | 0,19 | 0,43 | 0,22 | 3 vòng duyệt 45°: 1,31 → 0,55 → 0,43 |
| `dau-tron` đầu tròn | 0,06 | 0,07 | 0,45 | 0,30 | 3 vòng duyệt 45°: 0,74 → 0,56 → 0,45 |
| `dai-ru` dài rủ | 0,02 | 0,16 | 0,45 | 0,46 | |

Hếch, tẹt, gồ, dài rủ khác nhau rõ; thẳng, cao, nhỏ thon, đầu tròn còn gần nhau khi nhìn nghiêng — muốn đa dạng hơn thì tả
đặc điểm mạnh hơn trong lời nhắc (skill, bảng mô tả kiểu).

**Bộ mẫu dáng mắt (2026-11-05)**, `D:\Assets\parts\eyeshape\<tên>\`, bảng `_tong\bang.json`, ảnh `_tong\bo-mau.jpg`. Đo **khe mở
mí** (skill, mục Mắt); thứ tự chính diện → 45° → nghiêng (nghiêng chỉ báo cáo: ChatGPT luôn vẽ khe nghiêng sâu hơn khối 3D).

| Kiểu | Chính diện | 45° | Nghiêng (duyệt) | Mặt lật | Đạt |
|---|---|---|---|---|---|
| `xech` xếch | 0,14 | 0,15 | 0,68 | 0 | ✅ |
| `hanh-nhan` hạnh nhân | 0,18 | 0,22 | 0,91 | 0 | ✅ |
| `cup` cụp | 0,18 | 0,24 | 0,85 | 0 (gập 2) | ✅ |
| `mot-mi` một mí | 0,19 | 0,26 | 0,29 | 0 | ✅ |
| `nho` nhỏ | 0,17 | 0,26 | 0,48 | 0 | ✅ |
| `hep-dai` hẹp dài | 0,29 | 0,32 | 0,22 | 0 | gần (45° > 0,3) |
| `phuong` phượng | 0,25 | 0,34 | 0,40 | 0 | gần (45° > 0,3) |
| `tron-to` tròn to | 0,26 | 0,29 | 0,94 | 0 | ✅ lần 2 — lần 1 (`cu-1/`) ChatGPT mở khe quá nhãn cầu (0,61 · 0,64, mí trên lởm chởm); lời nhắc vừa phải hơn + 2 vòng 45° |

**Phân loại nam / nữ** (2026-11-05) — `D:\Assets\parts\phan-loai.json` (danh sách `nu`, `nam` theo loại + lý do), trường
`"gioi"` trong từng `part.json`, ảnh `D:\Assets\parts\phan-loai.jpg`. Nhân vật nữ chọn trong `nu`, nam trong `nam`; kiểu
"cả hai" có ở cả hai danh sách.

| | Chỉ nữ | Cả hai | Chỉ nam |
|---|---|---|---|
| Mũi | hếch, nhỏ thon | thẳng, cao, tẹt, đầu tròn | gồ, dài rủ |
| Mắt | xếch, tròn to, phượng | hạnh nhân, cụp, một mí | hẹp dài, nhỏ |

Bộ mẫu dựng trên **đầu chuẩn nữ**; thanh trượt và `dinh` dùng chung topo MakeHuman nên áp được lên đầu nam, nhưng **chưa duyệt
trên đầu nam** — khi có nhóm đầu nam (`gender 1`), chụp lại `mat/` các kiểu trong danh sách `nam` để duyệt bằng mắt.

Mắt khó hơn mũi ở ba chỗ đã sửa: thanh trượt kéo quá 1 làm mí sụp gập (→ phạt mặt gập trong hàm sai số); thanh dừng ở
0,3–0,8 mm (→ nắn đỉnh mép mí theo hai góc chính); gỡ gập co mạnh xoá mất phần nắn (→ gỡ nhẹ tay).

**Đã thử và bỏ** (2026-11-05, chi tiết [08 §7, §9](08-chatgpt-blender.md)):
- ChatGPT sửa mũi trên ảnh **cả đầu** (`khop`): khớp pixel nhưng kèm cả mặt; nhìn thẳng không bắt được lỗ mũi.
- ChatGPT vẽ **tấm mũi rời tự bố cục**, chuẩn hoá theo chính mũi (`khop-tach`): cỡ trôi tự do → thanh dồn kịch, mũi méo.
- ChatGPT sửa **tấm 2×2 cả 4 góc một lúc** (khuôn mép mờ): 4 góc tự mâu thuẫn 1–2 mm, góc từ dưới lệch có hệ thống; đưa ảnh
  Blender mép mờ cho sửa tiếp thì ChatGPT phóng to cả vùng.

Thư viện lưu **dáng** ở cỡ của đầu chuẩn; **cỡ** cho từng nhân vật chỉnh bằng `nose-scale-*` theo tỉ lệ trên ảnh mặt (08 §5).

**Lưu một kiểu** (`assets/parts/<loại>/<tên>/` trên hpc, kéo về `D:\Assets\parts\…`):

| File | Là gì |
|---|---|
| `../_khuon/khuon.json`, `../_khuon/goc/*.png` | khuôn của loại bộ phận (dùng chung mọi kiểu) |
| `chatgpt/<tên>-a-90.png`, `-b-0.png`, `-c-45.png`, `-c-duoi45.png` | ảnh ChatGPT sửa từng bước, giữ nguyên |
| `gui/` | ảnh Blender đã gửi ChatGPT ở mỗi bước (để đối chiếu cổng lệch khung) |
| `part-a.json`, `part-b.json`, `part.json` | sau bước nghiêng, sau bước chính diện, bản chốt: `targets` (thanh) + `dinh` (tinh chỉnh đỉnh, mét) + sai số mm + cổng |
| `dung/{0,90,45,duoi45}.png` | Blender chụp bản chốt bằng đúng khuôn |
| `mat/view_*.png`, `tren-dau.jpg` | bản chốt trên cả đầu chuẩn |
| `so-sanh.jpg` | hàng ChatGPT · hàng Blender · hàng chồng 50% — để duyệt bằng mắt |
| `cu/` | (chỉ ở `hech`) kết quả các cách đã bỏ, giữ để tra |

Dùng một kiểu: `make_head` / `bo_phan chup --part <part.json>` cộng `targets` và áp `dinh` thành shape key `part_dinh`
(topo MakeHuman cố định nên dùng được cho mọi nhân vật); hồ sơ nhân vật: chép `targets` + `dinh` vào.

Nhóm đầu gốc dự kiến: nữ (từ model-1), nam, trẻ em — mỗi nhóm dựng một lần; thân MPFB chỉ đổi thông số (nam: `gender 1, muscle 0.6`;
trẻ em: `age 0.15–0.25`). Mỗi nhân vật = một file mô tả (nhóm đầu, thanh trượt hình dạng, mã tròng/mí/mày/tóc, trang điểm).

## 7. Trang phục: một GLB nhiều bộ đồ

> **Che vùng nhạy cảm là bắt buộc** (chính sách TikTok LIVE — hở là bị gỡ live, khoá kênh). Ba lớp, lớp sau đỡ lớp trước:
>
> | Lớp | Ở đâu | Làm gì | Hỏng thì |
> |---|---|---|---|
> | 1. Thân an toàn | `an_toan.py` (chạy **trước** khi mặc đồ) | vùng ngực, vùng kín: làm mịn hình khối (bỏ chỗ nhô đầu ngực), xoá chi tiết trên texture da + normal map | lộ ra cũng chỉ là da trơn như búp bê |
> | 2. Đồ che kín | `bikini.py` tự kiểm; đồ MPFB theo nhóm `Delete` | bikini: lõi vùng phải nằm trong vải đã thu vào 1,2 cm, thiếu → dừng | không ghi file |
> | 3. Ẩn hẳn da dưới đồ | `rig_base --outfits` | mỗi bộ: ẩn da cả vùng (bit `_COVER`); bộ không món nào che vùng → dừng | không xuất GLB |
>
> Vùng đo ở **một** chỗ: `vung_nhay_cam.py` (ngực: cầu 3 cm quanh đỉnh ngực; kín: elip quanh điểm thấp nhất giữa hai
> chân, không lấn xuống đùi). Thêm đồ mới không được bỏ qua lớp nào; soi bằng `render_dance --outfit <id> --views
> front,back,side,low` ở các điệu lắc mạnh (Samba, Belly Dance, Twerk).

Module vũ công chọn bộ lúc chạy (ô ảnh trong modal cấu hình). Một GLB chứa mọi bộ: xương và điệu dùng chung, mỗi bộ chỉ
thêm lưới + texture của nó (5 bộ: 58 MB; một bộ: 38 MB) — rẻ hơn hẳn một GLB mỗi bộ.

```bash
# 0. thân an toàn (lớp 1) — trước mọi thứ ôm theo thân
scripts/phong/san-bar/dung-nhan-vat.ps1 base_v52.blend an_toan base_v56_an_toan.blend
# 1. mặc mọi món của mọi bộ lên base đã làm xong mặt (hồ sơ chỉ có "clothes")
scripts/phong/san-bar/dung-nhan-vat.ps1 base_v56_an_toan.blend apply_profile base_v57_tu.blend --to D:\Assets\parts\body\model-1-tu-do.json
# 2. đồ không có trong thư viện MPFB thì dựng từ lưới thân (bikini, tự kiểm che — lớp 2)
scripts/phong/san-bar/dung-nhan-vat.ps1 base_v57_tu.blend bikini base_v58_bikini.blend [--mau d8344a] [--ten bikini]
# 3. gom món thành bộ: D:\Assets\parts\trang-phuc\<nhân vật>.json  {"outfits": [{"id", "name", "items": [món...]}]}
scripts/phong/san-bar/dung-nhan-vat.ps1 base_v58_bikini.blend rig_base 'D:\Assets' model1_tu_do.glb <điệu...> --outfits D:\Assets\parts\trang-phuc\model-1.json
# 4. ảnh nhỏ từng bộ, đúng id → assets của module
scripts/phong/san-bar/dung-nhan-vat.ps1 base_v58_bikini.blend chup_trang_phuc D:\Assets\parts\trang-phuc\model-1.json client\modules\vu-cong-3d\assets\thumbs
```

| Thứ | Ở đâu trong GLB | Ai đọc |
|---|---|---|
| Danh sách bộ (thứ tự = số bit) | `extras.outfits` của xương `Dancer` (JSON `[{id, name}]`) | lõi cảnh `canh.ts` |
| Món thuộc bộ nào | `extras.outfits` của từng nút đồ (`"ao-thun-short,cong-so"`) | `canh.ts` bật/tắt `visible` |
| Da dưới đồ | thuộc tính đỉnh `_COVER` của thân (bit i = bộ i che đỉnh này, từ nhóm `Delete.<món>` của MPFB) | shader thân: bỏ tam giác bị bộ đang mặc che |

Thêm bộ mới: thêm món vào hồ sơ đồ (bước 1, hoặc dựng từ thân như bước 2), thêm bộ vào file bộ đồ (bước 3), chạy lại 3–4,
rồi thêm **một dòng** vào `TRANG_PHUC` trong `client/modules/vu-cong-3d/src/core.ts` (id khớp từng chữ). Thứ tự bộ trong
file bộ đồ phải giữ nguyên khi thêm (thêm vào cuối): cấu hình đã lưu ghi id, không ghi số, nên đổi thứ tự không hỏng gì —
nhưng thêm vào cuối thì GLB cũ và mới cùng dùng được.

Đồ dựng từ lưới thân (`bikini.py`): chép mặt thân vùng ngực–hông, đẩy ra 2,5 mm, vẽ dáng bằng mặt nạ alpha trên UV thân
(đo theo mốc của chính nhân vật: đỉnh ngực, khớp cổ, khớp chậu). Đỉnh trùng da → rig_base chép trọng số từ thân
(`tu_da`), co giãn y hệt da, không xuyên ở bất kỳ điệu nào. Kiểu kín: cúp phủ cả bầu ngực, cạp cao vừa, mảnh sau phủ kín
mông, không mảnh nào lấn xuống mặt trong đùi. **Cúp căng thành vòm** qua đầu ngực (vải ôm sát in hình đầu ngực).

Bộ đồ đang có (model-1): `ao-thun-short` (casualsuit02 + shoes03), `ao-thun-jeans` (casualsuit01 + shoes06), `the-thao`
(sportsuit01 + shoes05), `cong-so` (elegantsuit01 + shoes04), `bikini` (dựng từ thân, đỏ `d8344a`, chân trần).
