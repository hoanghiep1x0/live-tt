# 03 — Tham chiếu script

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md). Thứ tự chạy: [02](02-quy-trinh.md).

Sinh từ docstring đầu mỗi file — **docstring là nguồn**, sửa tham số thì sửa docstring rồi sinh lại bảng này
(`.tmp/tham_chieu.py` chỉ là công cụ tạm; xem cách dùng đầy đủ ở đầu từng file).

Mọi script chạy trên `hpc-station` từ gốc project `/mnt/D/dung-3d` ([01 §2a](01-chuan-bi.md)). Trong Blender:
`repo/scripts/phong/san-bar/dung-nhan-vat.sh <file.blend | _> <bước> <tham số…>`. Đánh dấu **hpc**: Python ngoài Blender —
`~/ai3d/venv/bin/python repo/scripts/phong/san-bar/nhan-vat/<bước>.py` (Hunyuan/tách nền) hoặc `~/ai3d/mpvenv/bin/python …`
(MediaPipe/OpenCV).

## A. Ảnh → tượng (hpc + Blender)

| Script | Chạy ở | Việc | Lệnh |
|---|---|---|---|
| `hunyuan_mv.py` | hpc | Dựng hình khối 3D từ ảnh nhiều góc bằng Hunyuan3D-2mv (chạy trên máy có GPU, trong venv ~/ai3d/venv). | `python hunyuan_mv.py <thư mục có front/left/back/right.png> <file .glb> [--swap-lr] [--steps 50] [--octree 384]` |
| `remove_bg.py` | hpc | Tách nền hàng loạt bằng bộ tách nền của Hunyuan3D (rembg). python remove_bg.py <vào> <ra> | — |
| `landmarks.py` | hpc | Tìm điểm mốc khuôn mặt (MediaPipe Face Landmarker) cho mọi ảnh .png trong một thư mục. | `python landmarks.py <thư mục ảnh> <file .json> [--model face_landmarker.task]` |
| `render_ortho.py` | Blender | Chụp mesh (đất sét, chiếu song song) ở các góc cho trước để tìm điểm mốc trên chính hình khối 3D. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_ortho.py -- <mesh.glb> <thư mục ra> <góc,...>` |
| `sculpt.py` | Blender | Nặn lại mặt của mesh Hunyuan cho khớp ảnh: dời mắt, mũi, môi, cằm tới đúng vị trí trong ảnh chụp. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/sculpt.py -- <mesh vào .glb> <mesh ra .glb> <thư mục ortho>     <ảnh chính diện tách nền> <ảnh nghiêng trái tách nền> [--gain 0.7] [--sigma 0.07]` |
| `facefit.py` | Blender | Hàm dùng chung cho dựng mặt: uốn thin-plate spline, căn bóng mesh với đường viền ảnh. | — |
| `slim_nose.py` | Blender | Thu gọn mũi: bóp hẹp sống mũi + đầu mũi theo chiều ngang, thu nhỏ nhẹ đầu mũi (giữ đỉnh mũi đúng chỗ). | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/slim_nose.py -- <vào.glb> <ra.glb> <thư mục ortho> [--width 0.9] [--tip 0.94]` |
| `clean_lashes.py` | hpc | Xoá mi + kẻ mắt khỏi ảnh mặt (tô lấp bằng màu da xung quanh) để thay bằng mi/kẻ mắt 3D rời. | `python clean_lashes.py <ảnh vào .png (RGBA tách nền hoặc RGB)> <ảnh ra .png> <lm_photo.json> [--band 1.7] [--dark 0.5]` |
| `project_texture.py` | Blender | Tô màu mesh Hunyuan3D bằng cách chiếu 4 ảnh góc nhìn (trước/sau/trái/phải), rồi nướng thành texture. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/project_texture.py -- <mesh.glb> <thư mục ảnh tách nền> <out.glb> [--faces 60000] [--tex 2048]` |

## B. Lưới gốc MakeHuman

| Script | Chạy ở | Việc | Lệnh |
|---|---|---|---|
| `base_head.py` | Blender | Quy trình chuẩn studio: bọc lưới gốc sạch (MakeHuman/MPFB) lên hình khối đầu Hunyuan. | `blender -b --python scripts/phong/san-bar/nhan-vat/base_head.py -- render <thư mục ra>` |
| `char_profile.py` | Blender | Hồ sơ nhân vật (parts\body\<tên>.json): dáng thân, loại da nền, quần áo — dùng chung cho base_head, fix_ears, apply_profile, build_character (import char_profile). | — |
| `eye_fix.py` | Blender | Đo dáng mắt của lưới đã bọc so với ảnh → độ dời mong muốn (mm) cho base_head.py eye-fit. | `python scripts/phong/san-bar/nhan-vat/eye_fix.py <ortho lưới đã bọc> <lm_photo.json> <ảnh> <ra.json> [--prev <eye_fix trước.json>] [--gain 1.0] [--sym]` |
| `face_nudge.py` | Blender | Nắn miệng theo ảnh sau khi bọc: trường dời mềm (RBF gauss) quanh điểm mốc môi, áp cho lưới gốc và tượng nguồn. | `blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/face_nudge.py -- <ortho lưới bọc> <lm_photo.json> <ra.blend>     [--photo face-01-front.png] [--sigma 0.012] [--gain 1.0] [--sym]` |
| `ear_fit.py` | Blender | Dáng tai theo ảnh: khớp đường viền tai nhìn chính diện bằng thanh trượt tai MakeHuman (sau bọc, trước bake_to_base). | `blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/ear_fit.py -- <ortho_b> <lm_photo.json> <ảnh chính diện đã tách nền .png> <ra.blend>     [--photo-key face-01-front.png] [--save <parts\ears\<tên>.json>]` |
| `shape_fit.py` | Blender | Khớp đường viền đầu nhiều góc (má, gò má, cằm, gáy, cổ sau) bằng thanh trượt MakeHuman — sau bọc / nắn miệng / dáng tai. | `blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/shape_fit.py -- <ortho nhiều góc có lm_ortho.json> <lm_photo.json>     <thư mục ảnh tách nền> <ra.blend> [--views 0:face-01-front.png,40:face-02-front-left-45.png,330:face-08-front-right-315.png]     [--save <parts\shape\<tên>.json>] [--keep 3] [--cand chin/chin-width-incr,cheek/cheek-volume-incr:p,...] [--band-top mouth]` |
| `fix_ears.py` | Blender | Dựng lại tai + da quanh tai từ tai MakeHuman gốc (đã khớp dáng), đặt cứng lên đầu đã bọc. | `blender -b <base hoặc wrap.blend> --python scripts/phong/san-bar/nhan-vat/fix_ears.py -- <ra.blend> [--ears D:\Assets\parts\ears\<tên>.json] [--hops 6]` |
| `fix_folds.py` | Blender | Gỡ khấc / nếp gập sót sau bọc ở nửa dưới mặt (góc hàm, cằm): làm mượt cục bộ quanh các mặt lưới gập gắt. | `blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/fix_folds.py -- <ortho_b> <ra.blend> [--deg 40] [--iters 15] [--lam 0.5] [--jaw]` |
| `jaw_nudge.py` | Blender | Nắn hàm–cằm theo ảnh: điểm viền hàm, cằm (MediaPipe 478 điểm) của ảnh chụp lưới vs ảnh mẫu → trường dời mềm (RBF gauss). | `python oval_cmp.py <thư mục ảnh mẫu> <ảnh chụp lưới (ortho_0.png…)> --pairs 0:face-01-front.png --out jaw.json` |
| `jaw_edge.py` | Blender | Cạnh hàm–cằm: bo góc gãy hai bên cằm + nâng/lùi mặt dưới hàm cho đường hàm thành cạnh rõ (sau jaw_nudge). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/jaw_edge.py -- <ortho_b> <ra.blend> [--lift 0.003] [--back 0.002]     [--corner-iters 6] [--corner-lam 0.5]` |
| `apply_targets.py` | Blender | Cộng thẳng thanh trượt MakeHuman vào lưới Body hiện tại (sau bọc / đã tô màu; chỉ dời đỉnh, giữ UV). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/apply_targets.py -- <ra.blend> '{"eyes/eye-height2-incr": 0.3, "ears/ear-shape-round": 1}'` |
| `ear_carve.py` | Blender | Khoét hõm giữa đỉnh tai và thái dương theo bóng ảnh chính diện (sau fix_ears + ear_fit). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/ear_carve.py -- <ortho_b> <lm_photo.json> <ảnh chính diện tách nền.png> <ra.blend>     [--photo-key face-01-front.png] [--wing 1.0] [--gain 1.0] [--dry]` |
| `apply_profile.py` | Blender | Đổi dáng thân (ngực, mông, hông, eo, vai, cổ, tay…) + mặc quần áo theo hồ sơ nhân vật, trên base đã làm xong mặt. | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/apply_profile.py -- <ra.blend> --to D:\Assets\parts\body\<tên>.json     [--from D:\Assets\parts\body\model-1.json]` |
| `an_toan.py` | Blender | Lớp an toàn trên thân: làm mịn hình khối + xoá chi tiết vùng ngực, vùng kín trên texture da và normal map (chạy trước khi mặc đồ). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/an_toan.py -- <ra.blend> [--anh <tiền tố ảnh ra>]` |
| `vung_nhay_cam.py` | (import) | Một định nghĩa vùng nhạy cảm (ngực, vùng kín) dùng chung cho an_toan, bikini, rig_base. | — |
| `bikini.py` | Blender | Bikini dựng từ chính lưới thân (không có trong thư viện đồ MPFB): chép mặt thân vùng ngực–hông, đẩy ra 2,5 mm, vẽ dáng áo/quần bằng mặt nạ alpha trên UV thân; cúp căng vòm qua đầu ngực. | `blender -b <base_do.blend> --python scripts/phong/san-bar/nhan-vat/bikini.py -- <ra.blend> [--ten bikini] [--mau d8344a] [--res 2048] [--day 0.0025]` |
| `bo_phan.py` | Blender | Thư viện bộ phận (05 §6a, 08 §2, skill `chatgpt-bo-phan-3d`): `khuon` chụp riêng vùng bộ phận của đầu chuẩn (`--tung` mỗi góc một ảnh, `--sac` mép sắc, góc 0/90/45/duoi45, khung ghi `khuon.json`); `khop-khuon` khớp thanh trượt theo ảnh ChatGPT sửa từng góc (`90=…,0=…`) trên khung cố định, `--tu-do` tinh chỉnh đỉnh ép đối xứng, in cổng lệch khung (`CONG`) và lệch mép mm → `part.json` (`targets` + `dinh`); `chup` chụp cả đầu. Đã bỏ: `khop` (ảnh cả đầu), `khop-tach` (tấm rời chuẩn hoá). | `-- khuon <ra> --khuon <khuon.json> [--part …] --goc 0,90 --tung --sac --R 1024` · `-- khop-khuon <thư mục> 90=a.png,0=b.png [--tu-part …] [--tu-do 14] [--mu 1]` · `-- chup <ra> [--part …]` |

## C. Texture: màu, trang điểm, normal map

| Script | Chạy ở | Việc | Lệnh |
|---|---|---|---|
| `bake_to_base.py` | Blender | Nướng màu (+ normal map) từ đầu Hunyuan đã tô màu sang UV của lưới gốc MPFB đã bọc. | `blender -b <wrap.blend> --python scripts/phong/san-bar/nhan-vat/bake_to_base.py -- <đầu Hunyuan đã tô màu .glb> <ra.blend> [--tex 4096] [--iris <png>]` |
| `lash_style.py` | Blender | Dựng bộ mi riêng (parts\lashes\<tên>) từ bộ mi MPFB (CC0): sợi đậm, dày hơn, mi dưới nhạt theo ý. | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/lash_style.py -- <eyelashes0N> <parts\lashes\<tên>> [--low 0.35] [--thick 0.5] [--dense 2] [--upper 1] [--color r,g,b]` |
| `swap_lashes.py` | Blender | Gắn lại thẻ mi (bộ mi thư mục parts\lashes\<tên>) vào Body hiện tại — sau khi đổi dáng mí (apply_targets vùng mắt). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/swap_lashes.py -- <thư mục bộ mi> <ra.blend>` |
| `makeup.py` | Blender | Trang điểm thành lớp phủ rời (bộ phận tái dùng): phấn mắt, hốc mắt, mí dưới, má hồng, tạo khối, bắt sáng, viền môi. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/makeup.py -- <head.glb> <ra.glb> <thư mục ortho> [--style <file .json>] [--save <thư mục>]` |
| `photo_project.py` | Blender | Chiếu thẳng ảnh mẫu (đã xoá mi/kẻ mắt) lên UV lưới gốc: da, má hồng, môi, tạo khối của chính ảnh — dùng trong makeup.py. | — |
| `reset_color.py` | Blender | Gắn lại texture màu CHƯA trang điểm (đầu ra bake_to_base) vào base, để chạy lại makeup.py trên hình khối mới nhất. | `blender -b <base đã sửa hình.blend> --python scripts/phong/san-bar/nhan-vat/reset_color.py -- <base_xx_body_color.png của bake_to_base> <ra.blend>` |
| `body_tone.py` | Blender | Da thân đều màu + khớp màu da mặt (sau makeup.py): bỏ vết rám nắng của da MakeHuman, thân không nhạt/trắng hơn mặt. | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/body_tone.py -- <ra.blend> [--sigma 0.04] [--gain 1,1,1] [--res 2048]` |
| `ear_ao.py` | Blender | Bóng khối tai: nướng che khuất (AO) của chính lưới vào texture màu vùng tai (sau makeup.py). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/ear_ao.py -- <ra.blend> [--k 0.7] [--gamma 1.3] [--res 2048] [--samples 64] [--warm 0.75,1,1.15]` |
| `bake_normal.py` | Blender | Nướng normal map (chi tiết nhỏ của tượng Hunyuan: viền môi, cánh mũi, nếp mí…) sang UV lưới gốc. | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/bake_normal.py -- <ra.blend> [--tex 2048] [--max-deg 20] [--ortho <ortho_b>]` |

## D. Tóc

| Script | Chạy ở | Việc | Lệnh |
|---|---|---|---|
| `hair_fit.py` | Blender | Tóc từ 4 ảnh tóc: khối Hunyuan3D-2mv → giảm lưới → ráp lên da đầu MakeHuman → chiếu màu từ 4 ảnh → đối tượng "Hair". | `python hunyuan_mv.py input/<tên> output_<tên>.glb --octree 448` |
| `hair_dyn.py` | Blender | Tóc bay theo điệu nhảy: chuỗi xương tóc dựng từ khối tóc + mô phỏng lò xo nướng thành khung hình (dùng trong rig_base.py). | — |

## E. Xương, điệu nhảy, xuất GLB

| Script | Chạy ở | Việc | Lệnh |
|---|---|---|---|
| `rig_base.py` | Blender | Gắn xương Mixamo + điệu nhảy cho nhân vật lưới gốc (sau makeup.py), xuất GLB cho three.js. | `blender -b <base_mk.blend> --python scripts/phong/san-bar/nhan-vat/rig_base.py -- <thư mục FBX điệu nhảy> <ra.glb> [điệu ...]     [--render <tiền tố ảnh>] [--outfits <bộ đồ.json>]` — `--outfits`: một GLB nhiều bộ đồ (05 §7) |
| `retarget.py` | Blender | Chuyển điệu nhảy Mixamo sang một bộ xương khác cùng tên xương (mixamorig:*) nhưng khác tư thế gốc / trục xương. | — |
| `chup_trang_phuc.py` | Blender | Ảnh nhỏ từng bộ trang phục (ô `gallery` của module vũ công) — chụp trên base đã mặc đủ đồ, nền trong suốt, `<id>.webp`. | `blender -b <base_do.blend> --python scripts/phong/san-bar/nhan-vat/chup_trang_phuc.py -- <bộ đồ.json> <thư mục ra> [--size 240x360] [--goc 20]` |
| `render_dance.py` | Blender | Chụp dải khung một điệu nhảy từ file GLB (kiểm tra tóc bay, mi, mắt bám theo) — mở chính file xuất ra, không phải .blend. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_dance.py -- <model.glb> <điệu> <ra.png> [--frames 0,8,16,...]     [--views back,side,front,low] [--size 360] [--outfit <id>]` |

## F. Đo, chẩn đoán, kiểm tra

| Script | Chạy ở | Việc | Lệnh |
|---|---|---|---|
| `face_score.py` | hpc | (hpc) Thước đo độ giống: mô hình nhận diện khuôn mặt chấm bản dựng so với ảnh mẫu, cùng góc. | `python face_score.py <thư mục ảnh mẫu> <thư mục ảnh dựng> [--pairs 0:face-01-front.png,45:face-02-front-left-45.png,...] [--json ra.json]` |
| `part_swap.py` | hpc | (hpc) Vùng nào kéo điểm giống xuống: thay từng vùng của ảnh dựng bằng vùng đó của ảnh mẫu (và ngược lại), chấm lại SFace. python part_swap.py <ảnh mẫu> <ảnh dựng> [--out thư mục ảnh ghép] [--band <ảnh dải tần.png>] Ảnh dựng được đặt chồng vào khung ảnh mẫu bằng phép đồng dạng (khoé mắt, mũi, khoé miệng). Vùng = bao lồi điểm MediaPipe, nới rộng, mép mờ. - Cột 1: ảnh dựng + vùng đó của ảnh mẫu → điểm tăng bao nhiêu (vùng đáng sửa). Cột 2: ảnh mẫu + vùng đó của ảnh dựng → tụt. - Phần da: tách tông màu (TB + lệch Lab) / sáng–tối thô (mờ σ 6, 15, 30 px) / vân (< σ 4 px). - --band: ảnh dải tần độ sáng (DoG): kênh L (Lab), mờ σ 2 px − mờ σ 15 px, hiện 128 + 4 × giá trị; trái ảnh mẫu, phải ảnh dựng   đã đặt chồng, cắt quanh mặt. Giữ chi tiết sáng–tối cỡ 2–15 px (~1–5 mm): nếp, khối mềm, kẻ mắt; bỏ tông màu, đèn tổng.   Ảnh 1024 px chiều cao (ảnh mẫu thu về 1024). | `python part_swap.py <ảnh mẫu> <ảnh dựng> [--out thư mục ảnh ghép] [--band <ảnh dải tần.png>]` |
| `oval_cmp.py` | hpc | So viền hàm–cằm (MediaPipe 478 điểm) giữa ảnh chụp bản dựng và ảnh mẫu cùng góc. python oval_cmp.py <thư mục ảnh mẫu> <thư mục ảnh dựng> --pairs 0:face-01-front.png,... Căn theo khoé mắt, mũi, khoé miệng (đồng dạng 2D); in độ lệch dựng→mẫu của điểm viền hàm (đơn vị mm, quy theo 63 mm khoảng hai khoé mắt ngoài... dùng bề ngang mắt trung bình 30 mm), và chiều sâu z (MediaPipe, tương đối mũi). | `python oval_cmp.py <thư mục ảnh mẫu> <thư mục ảnh dựng> --pairs 0:face-01-front.png,...` |
| `eye_diag.py` | hpc | (hpc) Chẩn đoán vùng mắt: ghép thử từng phần (nhãn cầu/tròng, viền mi–kẻ, da mí trên, da dưới mắt) + đo dáng mắt. python eye_diag.py <ảnh mẫu> <ảnh dựng> [--out thư mục] | `python eye_diag.py <ảnh mẫu> <ảnh dựng> [--out thư mục]` |
| `clay_view.py` | Blender | Bản "đất sét" để soi lỗi hình: thay mọi vật liệu của Body bằng màu trơn (không texture, không normal map). | `blender -b <base.blend> --python scripts/phong/san-bar/nhan-vat/clay_view.py -- <ra_clay.blend>` |
| `compare_overlay.py` | Blender | Mẹo của hoạ sĩ: chồng ảnh mẫu lên bản dựng (50%) và xem bản lật gương để thấy ngay chỗ lệch. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/compare_overlay.py -- <ortho_0.png (màu)> <lm_ortho.json> <ảnh mẫu> <lm_photo.json> <ra.png>` |
| `render_blend_head.py` | Blender | Chụp đầu người MPFB trong file .blend (sau khi bọc) ở vài góc, đất sét hoặc màu. | `blender -b <file.blend> --python scripts/phong/san-bar/nhan-vat/render_blend_head.py -- <tiền tố ảnh> [--clay] [--show-hunyuan]` |
| `render_closeup.py` | Blender | Chụp cận một vùng mặt (mặc định miệng) của mesh, chiếu song song, để soi lỗi hình khối/màu. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_closeup.py -- <mesh.glb> <ra.png> [--z 0.0] [--size 0.35] [--color]` |
| `render_mesh.py` | Blender | Chụp một mesh (glb/obj) ở 4 góc bằng chất liệu đất sét để so hình khối với ảnh mẫu. | `blender -b --factory-startup --python scripts/phong/san-bar/nhan-vat/render_mesh.py -- <mesh> <tiền tố ảnh .png>` |

## Nhánh cũ — `cu/` (không dùng cho bản chính)

| Script | Thay bằng |
|---|---|
| `cu/build_character.py` | `base_head` + `char_profile` + `rig_base` |
| `cu/build_dancers.py` | `rig_base` + `render_dance` |
| `cu/build_eyes.py` | `bake_to_base` (tròng) + `lash_style`/`swap_lashes` + `makeup` (kẻ mắt vào texture) |
| `cu/build_hair.py` | `hair_fit` + `hair_dyn` |
| `cu/build_lashes.py` | `lash_style` |
| `cu/hair_cards.py` | khối tóc trơn (`hair_fit`), xem 06 |
| `cu/measure_head.py` | đo điểm mốc (`landmarks`, `oval_cmp`) |
| `cu/smooth_eyes.py` | dáng mắt bằng `eye-fit` trên lưới gốc |
