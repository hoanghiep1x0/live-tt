# 07 — Nhật ký model-1

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).
Chuỗi lệnh và điểm của từng phiên bản model-1 — dùng làm mốc so khi dựng nhân vật khác.

### Kết quả model-1 (lưới gốc, 2026-11-04)

Chuỗi lệnh đầy đủ: `wrap … --eye-targets D:\Assets\parts\eyeshape\mat-phuong.json` → `wrap_v15.blend` → `bake_to_base` (tròng
`nau-ho-phach` 1,15×, `--sclera 0.3`, mi `eyelashes03`) → `base_v7` → `makeup.py` (`do-cam`) → `base_v8` → `bake_normal` → `base_v9`
→ `rig_base` (6 điệu) → `out\model1_base.glb` (18 MB, texture 4096). So chồng ảnh: lệch điểm mốc trung bình 2,4 px ảnh 1024
(~0,9 mm); lớn nhất ở hàm (5–6 px), môi trên (4,6 px).

Còn khác ảnh: mày ảnh thanh, gọn, đuôi vút — mày dựng ra đầu mày xù và quanh mày còn quầng sáng; hàm/gò má hơi hẹp; da ảnh hồng
ấm hơn, cổ còn loang; kẻ mắt + mi ảnh đậm hơn; một khấc nhỏ ở góc hàm dưới tai. Chưa làm: tóc, trang phục, giảm texture cho web.

**Bản hiện tại (v41, 2026-11-04)** — chuỗi từ `base_v21` (bake_to_base) trở đi, tất cả ở `D:\Assets\model-1\out\`:
mi `lash_style.py` (`parts\lashes\day-04`) → `base_v24a` → makeup `anh-mau-2` → normal (`--ortho`, phẳng tai) `base_v27` →
`fix_ears --ears tai-thon` → `fix_folds` dải hàm + dưới cằm (`--x-max 0.03`) → `ear_fit` → thanh tai tròn (`parts\ears\tai-tron.json`
là tổng) `base_v33` → `jaw_nudge` (1 vòng, σ 20 mm, x-gain 0,5, depth 0,8) → `fix_folds` chỗ gợn dưới môi `base_v37` →
`reset_color` (texture `base_v21`) → `jaw_nudge` thêm (x-gain 0,7, depth 0) → makeup `anh-mau-5` `--pores 0.015 --even-post 0.8
--keepout-detail 0.25` → `base_v41` → `rig_base` → `model1_base.glb` (22,3 MB, 6 điệu).
Điểm giống 73,2 % (chính diện 85,4 %, 40° 67,2 %, 330° 67,0 %); lịch sử: 62 → 76,1 (v22, còn lỗi hình) → 70,6 (sửa lỗi hình) →
73,2. Chẩn đoán v41 (`part_swap`): da cả mặt +0,175, mắt +0,076, trán +0,048, mày +0,031 — mắt là vùng còn lệch nhiều nhất sau da.
Còn: góc nghiêng 65–67 % (thấp hơn chính diện ~18 điểm), một chỗ lõm nhỏ dưới mắt trái (thấy trên đất sét và ảnh dải tần), vạch
sáng ở khe môi, tai nhìn thẳng lộ cạnh hơn ảnh.

**v44 (chọn theo mắt nhìn, không theo điểm)**: v41 → `jaw_edge.py --lift 0.005 --back 0.004 --corner-iters 12` (đường hàm thành
cạnh, bo góc cằm) → `apply_targets.py '{"eyes/eye-height2-incr": 0.4}'` (mở mắt +1 mm: 10,1 / 9,5 mm vs ảnh 10,2 / 9,5) → mi
`parts\lashes\day-04b` (`--dense 1.5 --upper 0.75 --color 0.07,0.045,0.035`, gắn lại mi sau khi đổi mí) → dò lại điểm mốc
(`ortho_base12`) → `reset_color` → makeup `anh-mau-6` (dưới mắt nâu đỏ ấm thay vì xám) → `ear_ao.py --k 0.7` (hõm tai tối ấm)
→ `base_v44` → GLB. Điểm: chính diện 79,4 %, trung bình 68,9 % — **thấp hơn v41** (85,4 / 73,2): đo riêng từng bước, sửa
cạnh hàm −4,3, mở mắt −3,0 (SFace), mi không đổi; người dùng chọn bản này vì nhìn giống hơn. Bài học: SFace là một thước đo,
không phải mục tiêu; khi số đo hình (điểm mốc, bóng) và mắt người cùng nói "giống hơn" mà SFace nói ngược, hỏi người dùng.

### Sau v41 (2026-11-04 → 05)

| Bản | Đổi | Ghi chú |
|---|---|---|
| v42c | `jaw_edge` (cạnh hàm) + `apply_targets eyes/eye-height2-incr 0.4` (mắt mở như ảnh) + mi `day-04b` | SFace chính diện 78,3 % (v41: 85,4); người dùng chọn theo mắt nhìn |
| v43 | dò lại điểm mốc (`ortho_base12`), makeup `anh-mau-6` (dưới mắt nâu ấm) | |
| v44 | `ear_ao --k 0.7` (hõm tai) | |
| v45–v48 | `fix_ears --ears tai-tron --smooth 4` (hết vành gấp đôi, vụn trong hõm); makeup `--ear-ring 0.035` + `bake_normal` phẳng vòng quanh tai (hết vệt sọc sau tai) | |
| v49 | tóc `hair_fit` (Hunyuan từ 4 ảnh tóc, `--pen 12`, `--gain 0.7`) | thẻ tóc tự sinh đã thử, bỏ (06) |
| v52 | `body_tone` (thân khớp da mặt, bỏ vết rám nắng) | bản chính: `model1_hair.glb` 31,8 MB, 6 điệu, tóc bay, da `OPAQUE` |
| v58_bikini, cả kho điệu | `rig_base` không ghi tên điệu (lấy **77 điệu**) `--outfits parts\trang-phuc\model-1.json`: `dung-nhan-vat.ps1 out\base_v58_bikini.blend rig_base 'D:\Assets' out\model1_tu_do_all.glb --outfits D:\Assets\parts\trang-phuc\model-1.json`, dựng ~45 phút | **bản lên sóng** thay v58 6 điệu: `model1_tu_do_all.glb` 93,5 MB → `client/modules/vu-cong-3d/assets/model-1.glb`. Tên điệu khớp đủ 77 với `KHO_DIEU` (`client/modules/vu-cong-3d/src/core.ts`); đoạn nối và điệu đu dây chỉ chọn tay, không vào vòng tự đổi |
| v56_an_toan → v58_bikini | `an_toan` (thân trơn vùng nhạy cảm) → `apply_profile` đủ đồ (v57) → `bikini` kiểu kín, tự kiểm che 116/116 ngực, 103/103 vùng kín → `rig_base --outfits` kiểm che từng bộ | **bản lên sóng** thay v55 (xem dưới) |
| v54_tu → v55_bikini | `apply_profile --to parts\body\model-1-tu-do.json` (mặc cả 4 bộ MPFB + 4 giày) → `bikini` (đỏ `d8344a`) → `rig_base` 6 điệu `--outfits parts\trang-phuc\model-1.json` → `chup_trang_phuc` | **bản lên sóng**: `model1_tu_do.glb` 58 MB, 5 bộ chọn lúc chạy → `client/modules/vu-cong-3d/assets/model-1.glb`; ảnh nhỏ → `assets/thumbs/`. Đã thử trên app (hộp đêm, bãi biển): đổi bộ khi đang nhảy, đồng diễn. Còn: tất trắng lòi ống quần dài (06) |
| v53_casual | `apply_profile --to parts\body\model-1-casual.json` (áo thun + short jeans `female_casualsuit02`, giày `shoes03`; dáng thân giữ nguyên) → `rig_base` 6 điệu | bản lên sóng trước v55: `model1_casual.glb` 38 MB, xuất 6 phút 43 giây → `client/modules/vu-cong-3d/assets/model-1.glb`; soi `out\casual_hiphop.png`: không xuyên da. Áo có in logo hình người MakeHuman (texture gốc CC0) |

Biến thể dáng thân + đồ (cùng mặt v52): `apply_profile --to parts\body\nguc-to-mong-to.json` (đồ `female_elegantsuit01`),
`nguc-nho-mong-nho.json` (đồ `female_sportsuit01`); ảnh `out\variants_body.png`, mẫu 4 bộ đồ `out\clothes_catalog.png`.

### Xuất toàn bộ điệu

`rig_base` không ghi tên điệu (lấy hết kho `D:\Assets`) trên `base_v52.blend`: **77 điệu, 48 phút 27 giây, GLB 66,4 MB**
(`out\model1_all_dances.glb`). So với 6 điệu (31,8 MB): mỗi điệu thêm ~0,5 MB (108 xương × khung, gồm 14 chuỗi xương
tóc). Phòng live nên xuất theo nhóm điệu hợp bối cảnh ([04 §5](04-dieu-nhay.md)).

