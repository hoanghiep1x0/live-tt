# Dựng nhân vật 3D — Sàn bar

Mảng dùng chung các kiểu của loại [Sàn bar](../README.md): từ **bộ ảnh nhân vật nguyên bản** → file **`.glb`** có lưới
sạch MakeHuman, texture khớp ảnh, mắt, mi, mày, trang điểm, tóc bay theo điệu, dáng thân theo hồ sơ, quần áo, xương
Mixamo và các điệu nhảy. Cách **dùng** GLB trong phòng (module vũ công, slot `stage-3d`) không nằm ở đây.

## Mục lục

| # | Tài liệu | Nội dung |
|---|---|---|
| — | README (file này) | Kiến trúc, dữ liệu, cách chạy, nhân vật mới trong 12 bước |
| 01 | [Chuẩn bị](01-chuan-bi.md) | Máy, phần mềm, giấy phép, kho dữ liệu, bộ ảnh đầu vào |
| 02 | [Quy trình từng bước](02-quy-trinh.md) | Lệnh + thông số đã chốt của từng bước, theo thứ tự chạy |
| 03 | [Tham chiếu script](03-script.md) | Mọi script: chạy ở đâu, làm gì, lệnh; nhánh cũ `cu/` |
| 04 | [Điệu nhảy](04-dieu-nhay.md) | 77 điệu đang có, xuất theo nhóm, thêm điệu mới |
| 05 | [Nhân vật mới, kiểm tra, bộ phận](05-mo-rong.md) | Checklist, cách soi lỗi, thư viện bộ phận tái dùng |
| 06 | [Lỗi, đã thử / đã bỏ](06-da-thu-va-loi.md) | Lỗi đã gặp + cách tránh; hướng đã bỏ và vì sao |
| 07 | [Nhật ký model-1](07-nhat-ky-model-1.md) | Chuỗi lệnh, điểm giống từng phiên bản — mốc để so |
| 08 | [ChatGPT cùng Blender](08-chatgpt-blender.md) | Chia việc, vòng lặp vẽ → dựng → so 1:1, luật vẽ, dáng / cỡ / màu, ngưỡng đạt, lời nhắc mẫu |
| 09 | [Tủ đồ chia món](09-tu-do.md) | Món rời gắn xương model-1, thư mục nguồn/ô/món (xoá là xoá thư mục), luật che + lót tự mặc kèm, `xuat_mon.py` |
| 10 | [Nhân vật ảnh động nhiều góc](10-nhan-vat-anh-dong.md) | Ảnh ChatGPT 8 góc theo người nộm + MimicMotion vẽ điệu Mixamo → 8 WebP có alpha; quy ước góc, thông số hpc, lên sàn, tăng độ mượt |

## Kiến trúc

```
 bộ ảnh (8 góc mặt + 4 góc tóc)                                hồ sơ nhân vật (dáng thân, da, đồ)
        │                                                              │
 A. ẢNH → TƯỢNG   Hunyuan3D-2mv (hpc) · tách nền · điểm mốc · nặn · xoá mi/mày · tô màu tượng
        │                    ↓ tượng có màu (nguồn hình + màu)
 B. LƯỚI GỐC      bọc lưới MakeHuman lên tượng · dáng mắt, miệng, tai, hàm–cằm · sửa nếp gập   ← char_profile
        │                    ↓ lưới sạch, UV, xương sẵn
 C. TEXTURE       nướng màu · làm sạch mắt–mày–tai · chiếu ảnh · trang điểm · da thân · normal map · AO tai
        │                    ↓ base_vN.blend
 D. TÓC, THÂN     tóc Hunyuan từ 4 ảnh tóc · đổi dáng thân / mặc đồ theo hồ sơ (apply_profile)
        │
 E. XUẤT          xương Mixamo · 77 điệu (retarget) · tóc bay (hair_dyn) · GLB cho three.js
        └── đo / soi suốt các bước: clay_view (đất sét), face_score, part_swap, oval_cmp, render_dance
```

| Thứ | Ở đâu | Commit? |
|---|---|---|
| Script (bước) | `scripts/phong/san-bar/nhan-vat/*.py` — mỗi file một bước, docstring đầu file là cách dùng | Có |
| Cửa chạy chung | `scripts/phong/san-bar/dung-nhan-vat.ps1` / `.sh`; đồng bộ với hpc: `scripts/phong/san-bar/hpc-dong-bo.sh`; bộ phận mũi từng bước: `scripts/phong/san-bar/mui-buoc.sh` | Có |
| Nhánh cũ (lưới Hunyuan) | `scripts/phong/san-bar/nhan-vat/cu/` — không dùng, giữ để tra | Có |
| Tài liệu | `docs/phong/san-bar/nhan-vat/` | Có |
| Nơi làm việc (Blender + AI) | project `hpc-station:/mnt/D/dung-3d/` ([01 §2a](01-chuan-bi.md)) | Không |
| Kho dữ liệu: ảnh, tượng, base, ortho, FBX điệu, thư viện bộ phận | `/mnt/D/dung-3d/assets/` khi làm; bản lưu `D:\Assets\` ([01 §2b](01-chuan-bi.md)) | Không — nặng hàng GB |
| File tạm | `/mnt/D/dung-3d/.tmp/` (cửa chạy đặt `TEMP`/`TMPDIR` vào `.tmp/blender`) — xoá lúc nào cũng được | Không |
| **Đầu ra dùng trong phòng** | `.glb` → `client/modules/<module vũ công>/assets/` khi module có (quy ước 04 §6) | Có (bản chốt) |

Giao kèo giữa các bước: mỗi bước đọc một `.blend` (đối tượng `Body`, có thể có `Hair`, `HunyuanAligned`, mi
`Body.eyelashes*`, mắt `Body.high-poly`, đồ `Body.<tên đồ>`) và ghi một `.blend` mới — **không ghi đè** đầu vào, đánh số
phiên bản (`base_v41` → `base_v42a` …). Bước nào chỉ dời đỉnh (giữ UV) chạy được trên base đã tô màu; bước đổi trang
điểm phải gắn lại texture gốc trước (`reset_color`).

## Cách chạy

Mọi bước chạy trên `hpc-station`, từ gốc project `/mnt/D/dung-3d` — quy ước thư mục ở [01 §2a](01-chuan-bi.md):

```bash
scripts/phong/san-bar/hpc-dong-bo.sh script     # (Windows, Git Bash) đẩy script vừa sửa sang hpc
ssh hpc-station
cd /mnt/D/dung-3d
repo/scripts/phong/san-bar/dung-nhan-vat.sh <file.blend | _> <bước> [tham số...]                  # bước Blender
TMPDIR=.tmp ~/ai3d/venv/bin/python   repo/scripts/phong/san-bar/nhan-vat/<bước>.py [tham số...]   # hpc: Hunyuan, tách nền
TMPDIR=.tmp ~/ai3d/mpvenv/bin/python repo/scripts/phong/san-bar/nhan-vat/<bước>.py [tham số...]   # hpc: MediaPipe/OpenCV
```
`_` = mở Blender trống (`--factory-startup`), dùng cho bước tự nạp file. Cửa chạy đọc `.env` của project (`BLENDER`,
`BLENDER_USER_RESOURCES`, `TMP_ROOT`), đặt `TEMP`/`TMPDIR` vào `.tmp/blender`, `PYTHONIOENCODING=utf-8`. Đường dẫn
`D:\Assets\…` trong ví dụ ở các tài liệu khác = `assets/…` trên hpc. Dự phòng trên Windows: `dung-nhan-vat.ps1`.

**Mỗi lúc một tiến trình Blender nặng** (GPU 8 GB dùng chung với Hunyuan). Dừng giữa chừng thì `pgrep -af blender` và
tắt tiến trình mồ côi.

## Nhân vật mới trong 12 bước

Chi tiết từng lệnh: [02](02-quy-trinh.md); checklist soi lỗi: [05](05-mo-rong.md).

1. Bộ ảnh `D:\Assets\model-N\individual-2048\` đúng [01 §3](01-chuan-bi.md) (đầu trọc, 8 góc mặt, 4 góc tóc).
2. Hồ sơ `D:\Assets\parts\body\<tên>.json` (dáng thân, da nền, đồ) — mẫu `model-1.json`, cách ghi ở `char_profile.py`.
3. Giai đoạn A trên hpc + Blender → tượng có màu (bước 1–5, 7).
4. Bọc lưới gốc với `--profile` (bước 6) → dáng mắt, miệng, tai (6b–6b3). **Soi đất sét** (`clay_view`).
5. Sửa tai + nếp gập dưới hàm (6b4), hàm–cằm (6b5). Soi đất sét lại ở 0/40/330°.
6. Nướng màu, tròng, mi (6c), làm sạch + trang điểm + chiếu ảnh (6d, 6d2), da thân (`body_tone`), normal map (6e), AO tai.
7. Chấm điểm + chẩn đoán (6d3, 6d4) → sửa vùng kéo điểm, lặp 4–6. Đừng chạy theo một con số: so ảnh bằng mắt.
8. Tóc từ 4 ảnh tóc (bước 10: Hunyuan → `hair_fit`).
9. Dáng thân / quần áo khác hồ sơ ban đầu: `apply_profile --to <hồ sơ>` (bước 10b).
10. Chọn nhóm điệu hợp phòng ([04](04-dieu-nhay.md)), xuất GLB bằng `rig_base` (bước 6f).
11. Kiểm tra GLB: `render_dance` (sau lưng, bên, trước) — tóc bay, đồ không xuyên, da đặc; vật liệu: da `OPAQUE`, mi + đồ
    `MASK`, mắt `BLEND`.
12. Ghi nhật ký vào `07-nhat-ky-<tên>.md` (chuỗi lệnh, điểm, lỗi mới → [06](06-da-thu-va-loi.md)).

## Mở rộng — đặt cái mới vào đâu

| Thêm | Làm thế nào | Không làm |
|---|---|---|
| Một bước (script) | file mới trong `scripts/phong/san-bar/nhan-vat/`, docstring đầu file theo mẫu (dòng `blender -b … --python scripts/phong/san-bar/nhan-vat/<bước>.py -- …` + gạch đầu dòng giải thích **vì sao**); thêm một dòng vào [03](03-script.md) đúng giai đoạn; nếu vào chuỗi chính thì thêm mục vào [02](02-quy-trinh.md) | sửa cửa chạy `.ps1`/`.sh` cho từng bước |
| Bộ phận tái dùng (mi, mày, tai, trang điểm, tóc, dáng thân) | thư mục trong `D:\Assets\parts\<loại>\<tên>\`, ghi vào bảng thư viện [05 §Thư viện](05-mo-rong.md) | chép thông số vào code |
| Dáng thân, da, quần áo | hồ sơ `parts\body\<tên>.json` (`char_profile.py`) | sửa số trong `base_head` / `fix_ears` |
| Điệu nhảy | FBX Mixamo vào `D:\Assets\`, bảng [04 §2](04-dieu-nhay.md) | — |
| Lỗi mới gặp | một dòng vào bảng lỗi [06](06-da-thu-va-loi.md): lỗi · nguyên nhân · cách tránh | — |
| Quy trình nhân vật cho **loại phòng khác** | bắt đầu bằng sao chép mảng này sang `docs/phong/<cate>/nhan-vat/` + `scripts/phong/<cate>/nhan-vat/` (quy ước 01 §12); khi hai loại dùng y hệt thì mới tính đưa về chung | trỏ script của loại khác vào thư mục này |
