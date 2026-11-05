# 06 — Lỗi đã gặp, đã thử / đã bỏ, nhánh cũ

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).
Script của nhánh cũ nằm ở `scripts/phong/san-bar/nhan-vat/cu/` — không dùng cho bản chính, giữ để tra.

## 8. Lỗi đã gặp — cách tránh


| Lỗi | Nguyên nhân | Cách tránh |
|---|---|---|
| Hunyuan: "Missing key(s) in state_dict for SingleImageEncoder" | `transformers` 5.x | `transformers==4.46.3 diffusers==0.31.0` |
| Màu da bạc trắng sau khi nướng | lưu sRGB như tuyến tính | đổi sRGB → tuyến tính khi đọc ảnh |
| Mặt thành vân sóng | lưới xuất ở chế độ flat bị tách đỉnh | `shade_smooth()` trước khi xuất + hàn đỉnh khi nạp |
| Khoét mắt rách mép | glTF tách đỉnh dọc đường nối UV | hàn đỉnh (`remove_doubles`) trước khi khoét |
| Tròng mắt xoay sang bên | quả cầu Blender có sẵn UV | xoá UV cũ trước khi tạo UV chiếu thẳng |
| Texture đen, "Failed OpenEXR write" | ổ C hết chỗ | `TEMP`/`TMP` = `D:\Tools\tmp` |
| Script Blender dừng giữa chừng | lọc output bằng `Select-Object -First` cắt tiến trình | không cắt output khi đang chạy |
| Ảnh chụp thử nhạt màu son | AgX mặc định | `view_transform = "Standard"` |
| Ảnh chụp thử trắng xoá | đèn area mạnh ở thang mét (MPFB) | năng lượng đèn ~10–15 W ở 1 m |
| Mi bị lớp trang điểm đè màu (khi đọc lại GLB trong Blender) | glTF không giữ chế độ dithered | kiểm tra trên trình xem đích (đặt thứ tự vẽ) |
| "Could not write image" khi nướng | đường dẫn ra tương đối | luôn dùng đường dẫn tuyệt đối |
| `BVHTree.FromPolygons: index … must be less than …` | toạ độ lấy từ lưới đã qua mặt nạ "Hide helpers" | tắt modifier trước khi đọc toạ độ |
| `UnicodeEncodeError` khi chạy `eye_fix.py` | cửa sổ lệnh Windows cp1252 | `PYTHONIOENCODING=utf-8` |
| Mắt nhắm sau khi bọc | điểm mốc giữa mí kéo theo khe mắt hẹp của Hunyuan | chỉ giữ khoé mắt khi uốn |
| Tai nhăn, đỉnh vành cụt, miếng da phẳng sau tai | bọc: tai dời theo trường làm mịn, da sau tai áp vào tai rối của tượng | `fix_ears.py` (+ `ear_fit`) |
| Nhìn thẳng thấy góc vát từ đỉnh tai xuống thái dương | đỉnh tai MakeHuman nhọn | `ear-shape-round` 1 + `ear-flap-incr` 0,6, bù `ear-wing-decr` |
| Mảng xám dưới góc hàm (góc 40°) | nếp gập thoải 15–19°, nằm sau "nửa trước" | `fix_folds --edge --any-y` khoanh dải hàm |
| Cổ nhập hàm / cằm vuông sau làm mượt | khoanh `fix_folds` rộng | khoanh hẹp đúng chỗ, soi đất sét |
| Cằm nhọn, hai bên cằm thiếu | hàm hẹp, cao, cằm thụt so ảnh | `oval_cmp` + `jaw_nudge` (1 vòng, σ 20 mm, x-gain 0,5–0,7) |
| Đệm cằm nổi khối, hai bên hàm phồng | nắn đủ số đo MediaPipe, σ nhỏ | giảm như trên |
| Má hóp | lớp `contour` (vệt chéo gò má → khoé miệng) | `contour` 0 |
| Chấm như tàn nhang dưới mắt | vân da MakeHuman nhân vào dải lấp quanh mắt | `--keepout-detail 0.25` |
| Má lốm đốm (mảng 3–15 mm) | ảnh 3 góc chồng lệch | `--even-post 0.8` |
| Chấm đen tách rời ở đuôi mắt | `liner_width` 0,2 + `liner_wing` 0,4 | ≤ 0,17 / 0,32 |
| Mi xám dưới đèn | chất liệu mi MPFB bóng 0,5 | `bake_to_base` đặt nhám 0,9, bóng 0,1 |
| Môi hé sau khi nâng mặt dưới hàm | mặt dưới môi dưới cũng chúc xuống | `jaw_edge.py` chừa hộp miệng |
| Đường hàm thoải vào cổ, góc cằm gãy (nhìn nghiêng) | mặt dưới hàm chéo, không có cạnh | `jaw_edge.py` |
| Tai phẳng màu, nhìn như lộ cạnh | texture tai đã nén bóng + normal map tai phẳng | `ear_ao.py` (AO hình tai, `--warm`) |
| Mi lệch mép mí sau khi mở mắt | thẻ mi (mhclo) không theo đỉnh đã dời | gắn lại mi (`bake_to_base --lashes` / swap) sau `apply_targets` vùng mắt |
| Da lòi qua quần áo | `rig_base` gỡ mọi bộ ẩn (Mask), glTF không áp bộ ẩn | xoá đỉnh nhóm `Delete.<bộ đồ>` cùng lưới phụ |
| Vân lổn nhổn trên váy / quần MPFB | vật liệu đồ để alpha → BLEND | alpha cắt (MASK) như mi |
| Thân trắng, nhạt hơn mặt; vết rám nắng bụng, mông | da nền MakeHuman (tông, vết rám nắng vẽ sẵn) | `body_tone.py` |
| Dáng thân mọi nhân vật như model-1 | thông số thân viết cứng trong base_head / fix_ears | hồ sơ nhân vật `--profile` (`char_profile.py`) |
| Tóc xoè như cánh khi xoay nhanh | kéo về dáng 0,02 quá lỏng | 0,03, giảm chấn 0,9 |
| Da thân trong GLB trong suốt, loang từng mảng (three.js / mở lại GLB) | vật liệu MPFB để alpha → glTF xuất `BLEND` | `rig_base` bỏ alpha da (→ `OPAQUE`), mi alpha cắt (→ `MASK`), mắt giữ `BLEND` (giác mạc) |
| Vệt sọc sau tai (ảnh nghiêng) | ảnh nghiêng in bóng tai (tai ảnh lùi sau) lên da đầu; vùng 2,2 cm chưa đủ | `makeup.py --ear-ring 0.035` + `bake_normal` phẳng vòng quanh tai |
| Vành tai gấp đôi, khấc đỉnh, vụn trong hõm | thanh dáng tai cộng sau khi dựng lại tai; thanh tròn/cong bóp nhàu lòng tai | `fix_ears --ears <tổng dáng tai> --smooth 4` |
| Lộ da đỉnh sau khi đội tóc | ráp tóc phạt xuyên sọ nhẹ | `hair_fit --pen 12` |
| Tóc gần như không bay | lực kéo về dáng gốc lớn | `hair_dyn` kéo 0,02, giảm chấn 0,92 |
| Blender vẫn chạy sau khi dừng chuỗi lệnh, chiếm 5 GB | tiến trình con không bị dừng theo | `tasklist` → `taskkill //PID` |
| Bộ thể thao (croptop MPFB) chỉ ẩn 60/96 đỉnh ngực | nhóm `Delete` của MPFB không phủ hết vùng ngực | `rig_base --outfits` kiểm che: bộ chạm vùng nào thì ẩn hẳn cả vùng |
| Thân trần còn quầng, đầu ngực trên texture và hình khối | da nền MakeHuman vẽ sẵn, lưới có chỗ nhô | `an_toan.py` trước khi mặc đồ (khớp mặt cầu rồi hạ chỗ nhô: chỉ dời 2 đỉnh → bỏ, dùng Laplace 40 lượt) |
| Bikini lấn xuống mặt trong đùi (vệt thõng) | dải đáy rộng 4,8 cm + ranh thân–chân nới 1,5 lần bắt cả đùi | cắt mọi mảnh dưới đáy chậu ở dải giữa; vùng `hang` cũng cắt dưới điểm thấp nhất |
| **Bikini văng thành dải quanh hông khi nhảy, hở thân** (ảnh tĩnh vẫn đẹp) | chép trọng số xương theo mặt thân gần nhất → bắt nhầm lưới phụ váy / quần tất ẩn của MPFB | `bikini.py` ghi `goc` (chỉ số đỉnh thân gốc), `rig_base` chép đúng trọng số từng đỉnh. Luôn soi đồ mới bằng `render_dance --outfit` **khi nhảy**, không chỉ ảnh tư thế đứng |
| Bikini in hình đầu ngực | đồ dựng từ lưới thân ôm sát da, giữ cả chỗ nhô | `bikini.py` căng cúp thành vòm quanh đỉnh ngực (`nippleTip`) |
| Mép quần bikini răng cưa | mặt lưới đồ bị cắt theo ranh thân–chân, cắt vào vùng vải | giữ cả dải thân cổ → dưới đáy (chỉ bỏ tay); dáng đồ do mặt nạ alpha quyết |
| Bikini nằm lọt trong da | pháp tuyến lưới MPFB không chắc hướng ra ngoài | đẩy theo pháp tuyến đã so chiều với trục thân |
| Đồ alpha cắt (bikini) hiện kín cả mảng thân | lõi cảnh ép `alphaTest = 0` cho mọi vật liệu không tên tóc/mi | giữ `alphaTest` của glTF `MASK` (`canh.ts`: `cutout = m.alphaTest > 0 ‖ …`) |
| GLB nhiều bộ: da lòi qua đồ, hoặc mất da khi đổi bộ | xoá da dưới đồ chỉ đúng cho một bộ | `rig_base --outfits`: giữ da, ghi bit che `_COVER`; shader thân bỏ tam giác bị bộ đang mặc che |
| Tất trắng của giày lòi qua ống quần dài (jeans, thể thao) | giày MPFB kèm lưới tất cao cổ | chưa sửa — chọn giày khác cho bộ quần dài, hoặc xoá lưới tất trong món giày |

## 7. Đã thử / đã bỏ


| Cách | Kết quả | Trạng thái |
|---|---|---|
| Chỉnh mặt bằng thanh trượt MakeHuman | tối đa ~50% giống | Bỏ cho mặt; dùng cho thân |
| Căn ảnh theo khung bao đầu | môi, mắt lệch, chồng hai lớp | Bỏ → đường viền + điểm mốc |
| Một tỉ lệ chung cho mọi ảnh | ảnh tạo riêng có độ phóng khác nhau | Bỏ → tỉ lệ riêng (`--common-scale` cho bộ cắt từ 1 tấm ghép) |
| Uốn mí mắt theo điểm mốc | tròng mắt bị ép dẹt | Bỏ (bật lại: `--warp-eyelids`) |
| Nặn toàn mặt tự động 7 vòng | gờ mày nổi, mặt cứng | Bỏ → chỉ nặn từng vùng (`--only`) |
| Vẽ mắt lên da | vệt trắng, nhoè | Bỏ → nhãn cầu rời |
| Mi 3D dày (220 sợi/512 px) | < 1 px khi lên hình | Bỏ → 120 sợi, 256 px |
| Tô lấp mi/mày bằng inpaint | vệt kéo, mảng bạc | Bỏ → push–pull |
| Bọc lưới bằng điểm gần nhất | nếp gấp ở má, tai méo | Bỏ → chiếu theo pháp tuyến, bỏ tai |
| Mở mí bằng cách dời đỉnh gần điểm mốc `lid_*` (`--open-lids`) | mép mí răng cưa, lộ lòng trắng ở đuôi mắt | Bỏ → thanh trượt mắt (`eye-fit`) |
| Uốn mềm 4 điểm quanh mắt (`--eye-fix`) | mí dưới rời nhãn cầu, hở mảng xám ở đuôi mắt | Bỏ → thanh trượt mắt |
| Uốn RBF nội suy khít điểm mốc | lật 55 mặt cằm/má → gờ quanh môi dưới | Bỏ → làm trơn λ = 0,01 |
| "Lòng miệng" = đỉnh sâu hơn khoé môi 6 mm | bắt nhầm da cằm → không áp sát → gờ | Bỏ → tia pháp tuyến chạm lại chính lưới trong 7 mm |
| Làm mượt + dán điểm gần nhất cả mặt (`--relax`) | sập rãnh mũi–má thành gờ | Tắt mặc định |
| Vẽ lại mắt bằng màu chiếu từ đầu Hunyuan | quầng nâu, vệt cau có quanh mày (mắt vẽ to hơn mí lưới gốc) | Bỏ → làm sạch + kẻ mắt theo mí lưới gốc |
| Mày vẽ từng sợi theo viền điểm mốc | đầu mày xù, chỉ viền trên đậm, không giống mày phấn của ảnh | Dự phòng → tách mày từ ảnh |
| Tách mày: màu = 5 % điểm tối nhất, nới viền 0,10 | độ đậm tụt → mày vỡ thành từng mảng | Bỏ → 25 %, nới 0,06 |
| Vùng cổ chỉ chặn trên (dưới mặt phẳng qua cằm) | phủ cả thân → texture thân thành khối màu, chân đen | Bỏ → chặn dưới ~10 cm dưới cằm |
| Chiếu ảnh sạch còn mày (`clean\nobg`) | màu mày bị kéo ra quanh mày | Bỏ → `clean_b` (xoá cả mày) |
| Lấy ảnh cả vùng mắt | mảng mờ xám của ảnh sạch thành mảng xám từ mày xuống mí (63 %) | Bỏ → chừa mắt + mày nới 6 mm (73,6 %) |
| Chiếu ảnh: khớp một hệ số tông chung | điểm 70 → 63 % | Bỏ → khớp tông lớn σ 25 mm |
| Khử ánh sáng cầu điều hoà bậc 2 | hệ số nhảy ở ảnh nghiêng | Bỏ → bậc 1 |
| `shape_fit.py` trên model-1 | viền má xa chỉ 2,4 → 2,1 mm, texture đổi theo → 67,5 % | Bỏ cho model-1 (hình khối đã sát; "má thiếu" chủ yếu do bóng sáng) |
| Làm mượt mặt gập cả vùng miệng | môi hé, lộ vạch sáng | Chừa hộp miệng |
| Lấp dải quanh mắt bằng push–pull mờ 2 mm | ô vuông quanh mắt, mũi | Mờ 6 mm |
| Cổ một tông da mặt | "cổ áo" đậm ở vai khi nhảy | Tông chuyển dần mặt → thân |
| Mép vùng cổ 2,5 cm | vạch tượng dưới cằm lộ lại | 1,2 cm |
| Chiếu ảnh cho cả khung mặt + cổ | hết RAM (máy còn ~10 GB trống) | Chỉ vùng đầu; giải phóng mảng trung gian, float32 |
| Đo miệng trên ảnh lưới bọc chưa tô màu | MediaPipe dò viền môi theo màu → môi trên lệch ~1 mm | Bỏ → đo trên bản đã tô màu |

### Bước 8. Mắt (nhãn cầu rời), kẻ mắt, mi — ĐÃ CHỐT (trên lưới Hunyuan)

```bash
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/cu/build_eyes.py -- head.glb head_eyes.glb <ortho> face-01-front.png \
    --iris 0.22 --liner 0.02 --wing 0.06 --lash 0.055 --lash-density 120
```
Khoét lỗ mắt theo viền mí (ở vị trí mắt đã vẽ, cùng `--eye-scale`), nhãn cầu bán kính 0,40 × bề ngang mắt, tròng cắt từ ảnh,
giác mạc bóng, bóng mí trên; kẻ mắt là dải rời đậm ở mép mí mờ dần lên, đuôi vút; mi là dải sợi dài dần ra đuôi, cong vểnh.

### Bước 9. Trang điểm + lông mày (lớp phủ rời) — ĐÃ CHỐT

```bash
blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/makeup.py -- head_eyes.glb head_makeup.glb <ortho> \
    [--style <style.json>] [--save <thư mục>] [--save-brow <file>] [--brow-shape <file>]
```
Lớp: phấn mắt, hốc mắt, mí dưới, má hồng, tạo khối, bắt sáng, viền môi, bóng môi, lông mày (nền phấn mày theo đúng viền mày ảnh +
sợi lông nằm xuôi). Vị trí từng lớp tính từ điểm mốc của chính đầu đó → dùng được cho mọi đầu.

### Bước 11. Thân, xương, điệu nhảy — ĐÃ CHỐT (thân)

`build_character.py -- D:\Assets <ra.glb> [điệu...]`: thân MPFB + xương Mixamo + `retarget.py` (đưa về chữ T giống X Bot rồi chuyển
từng khung theo góc thế giới) → nhảy đúng các điệu Mixamo. Với lưới gốc ở bước 6, đầu đã nằm sẵn trên thân này.
