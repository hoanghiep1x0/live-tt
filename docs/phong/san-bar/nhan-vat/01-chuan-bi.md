# 01 — Chuẩn bị: máy, phần mềm, dữ liệu, bộ ảnh

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).

## 1. Máy và phần mềm

Từ 2026-11-05 **mọi việc dựng chạy trên `hpc-station`** — cả Blender lẫn phần AI — vì máy đó mạnh hơn hẳn (Xeon E5-2696 v4
88 luồng, 62 GB RAM, RTX 3070 8 GB) so với Windows (E5-2670 v2, 32 GB, RTX 3050). Máy Windows chỉ còn: viết/sửa script trong
repo, tạo ảnh bằng ChatGPT Image (Chrome), giữ bản lưu ở `D:\Assets\`, và Blender dự phòng.

| Máy | Vai trò | Cài sẵn |
|---|---|---|
| `hpc-station` — VPS riêng (Ubuntu 24.04; tên SSH `hpc-station` trong `~/.ssh/config`) | **Mọi bước dựng**: Blender (bọc lưới, tô màu, tóc, đồ, xương, xuất GLB) + AI GPU (hình khối, tách nền, điểm mốc, chấm điểm) | Project `/mnt/D/dung-3d/` (mục 2): Blender 5.2.3 Linux, MPFB 2.0.18 + dữ liệu MakeHuman CC0, script, dữ liệu. Môi trường AI ở `~/ai3d/` (bảng dưới) |
| Windows (máy này) | Sửa script trong repo rồi đẩy sang hpc; tạo bộ ảnh bằng ChatGPT (mục 4); bản lưu `D:\Assets\` | Blender 5.2.3 `D:\Tools\blender-5.2.3-windows-x64\blender.exe` + MPFB ở `%APPDATA%\Blender Foundation\Blender\5.2\` (dự phòng) |

Script tìm dữ liệu MPFB bằng `bpy.utils.user_resource("EXTENSIONS", path=".user/user_default/mpfb/data")` nên chạy đúng ở
cả hai máy, không ghi cứng đường dẫn Windows. Bước nào chạy bằng Python ngoài Blender thì gọi thẳng python của venv.

### Công cụ nằm ở đâu (kiểm 2026-11-05)

| Công cụ | Máy | Vị trí |
|---|---|---|
| Blender 5.2.3 LTS (Cycles thấy RTX 3070 qua OptiX/CUDA) | hpc | `/mnt/D/dung-3d/tools/blender-5.2.3-linux-x64/blender` |
| Cấu hình Blender + add-on MPFB + dữ liệu MPFB (`clothes/`, `skins/`, `eyes/`, `eyelashes/`…) | hpc | `/mnt/D/dung-3d/blender-user/` (biến `BLENDER_USER_RESOURCES`, cửa chạy đọc từ `.env`); dữ liệu ở `blender-user/extensions/.user/user_default/mpfb/data` |
| Script dựng nhân vật | Windows (repo) → hpc | sửa ở `scripts\phong\san-bar\` trong repo, đẩy sang `/mnt/D/dung-3d/repo/scripts/phong/san-bar/` bằng `hpc-dong-bo.sh script` — danh sách: [03](03-script.md) |
| Hunyuan3D-2mv (hình khối đầu, tóc từ ảnh nhiều góc) | hpc | mã `~/ai3d/Hunyuan3D-2`; môi trường `~/ai3d/venv` (6,4 GB; PyTorch 2.6 cu124, **bắt buộc** `transformers==4.46.3`, `diffusers==0.31.0`); trọng số `~/.cache/huggingface/hub/models--tencent--Hunyuan3D-2mv` (≈ 9 GB) |
| MediaPipe + OpenCV (điểm mốc mặt, tách nền) | hpc | `~/ai3d/mpvenv`; mô hình `~/ai3d/face_landmarker.task` (script tự trỏ tới đây) |
| Chấm điểm giống mặt (YuNet dò mặt, SFace so mặt) | hpc | `~/ai3d/models/face_detection_yunet_2023mar.onnx`, `face_recognition_sface_2021dec.onnx` |
| Blender dự phòng | Windows | `D:\Tools\blender-5.2.3-windows-x64\blender.exe` (biến `BLENDER` trong `.env`) |

`~/ai3d/` chỉ giữ **công cụ** AI (venv, mã Hunyuan, mô hình) — venv gắn cứng đường dẫn nên không dời. Không để dữ liệu
nhân vật ở đó nữa; dữ liệu cũ của model-1 (`input/`, `lm/`, `score/`, `clean/`, `output_*.glb`) đã dời vào
`/mnt/D/dung-3d/assets/model-1/hpc/`.

Ổ hệ thống của hpc (`/`, 618 GB) đã đầy ~92% (còn ~49 GB): **không** đặt project, file tạm hay mô hình mới ở `~`. Project
nằm trên phân vùng 800 GB `/dev/nvme0n1p4` (NTFS, UUID `01DC80880E89C610`, còn ~356 GB) gắn ở `/mnt/D` bằng `ntfs3`
(`uid=1000,gid=1000,umask=022`). Đây là ổ D: dữ liệu của Windows trên cùng máy (có thư mục khác: `CloudPhone`,
`PhoneFarm`, `Rom`…) — chỉ đụng vào `/mnt/D/dung-3d/`. Nếu Windows đó ngủ đông/khởi động nhanh thì `ntfs3` không gắn
được chế độ ghi; tắt hẳn Windows rồi gắn lại. Gắn tay (cần sudo):
`sudo mount -t ntfs3 -o uid=1000,gid=1000,umask=022 /dev/nvme0n1p4 /mnt/D`.

Giấy phép: Hunyuan3D-2 (Tencent Hunyuan 3D 2.0 Community License) dùng được ở Việt Nam, không áp dụng ở EU, Anh, Hàn Quốc.
MakeHuman/MPFB tài nguyên CC0. Ảnh đầu vào phải là nhân vật nguyên bản, không dùng nhân vật có bản quyền.

## 2. Thư mục làm việc — QUY ƯỚC

### 2a. Project trên hpc-station: `/mnt/D/dung-3d/`

Mọi thứ của việc dựng 3D nằm **trong** thư mục này; không tạo file ở `~`, `/tmp` hay chỗ khác (trừ công cụ AI có sẵn ở
`~/ai3d/` và bộ đệm `~/.cache/huggingface`, mục 1). Session mới vào làm việc: `ssh hpc-station`, `cd /mnt/D/dung-3d`, đọc
`README.md` ở đó (bản tóm tắt của mục này).

```
/mnt/D/dung-3d/
  README.md        tóm tắt quy ước này (đọc trước khi làm)
  tools/           phần mềm: blender-5.2.3-linux-x64/
  blender-user/    BLENDER_USER_RESOURCES: config/ (userpref), extensions/ (MPFB + dữ liệu MakeHuman)
  repo/            bản chép từ repo: scripts/phong/san-bar/ + .env (BLENDER, BLENDER_USER_RESOURCES, TMP_ROOT)
                   — chỉ ghi đè bằng `hpc-dong-bo.sh script`, không sửa tay ở đây
  assets/          dữ liệu: cùng cấu trúc với D:\Assets (mục 2b) — model-N/, parts/, base/, *.fbx
  .tmp/            MỌI file tạm: TEMP/TMPDIR của Blender (.tmp/blender), ảnh thử, render nháp, file trung gian
                   bỏ đi được. Xoá cả thư mục bất cứ lúc nào không có tiến trình đang chạy
```

Luật:
1. File **cần giữ** (ảnh vào, `.blend` theo phiên bản, ortho, texture, glb, điểm số) → `assets/model-N/…` hoặc `assets/parts/…`.
   File **bỏ được** → `.tmp/`. Không có chỗ thứ ba.
2. Lệnh chạy luôn từ gốc project, đường dẫn tương đối: `repo/…`, `assets/…`, `.tmp/…`.
3. Blender chạy qua cửa `repo/scripts/phong/san-bar/dung-nhan-vat.sh` — nó đọc `.env`, đặt `BLENDER_USER_RESOURCES`
   và `TEMP`/`TMPDIR` vào `.tmp/blender`. Python AI: `~/ai3d/venv/bin/python repo/scripts/phong/san-bar/nhan-vat/<x>.py`
   (MediaPipe: `~/ai3d/mpvenv/bin/python`), kèm `TMPDIR=.tmp`.
4. Mỗi lúc **một** tiến trình Blender nặng (nướng texture, Cycles) để khỏi tranh GPU 8 GB với Hunyuan.
5. Sửa script ở repo trên Windows, rồi `scripts/phong/san-bar/hpc-dong-bo.sh script`; kết quả cần lưu thì
   `hpc-dong-bo.sh keo model-N/out/<file>` về `D:\Assets`. GLB chốt mới vào repo (`client/modules/<module>/assets/`).

### 2b. Kho dữ liệu `assets/` (hpc) = `D:\Assets\` (bản lưu trên Windows)

```
D:\Assets\
  model-N\chatgpt\           ảnh gốc ChatGPT Image (mục 4), giữ nguyên tên lúc tải
  model-N\individual-2048\   bộ ảnh đầu vào của nhân vật N (mục 3), chọn và đổi tên từ chatgpt\
  model-N\out\               kết quả từng bước (tượng, ortho, texture, glb)
  model-N\hpc\               kết quả phần AI (tách nền, điểm mốc, điểm giống)
  base\female\               lưới gốc nữ: ảnh chụp + điểm mốc (bước 6)
  parts\                     thư viện bộ phận tái dùng (05 §6): mi, mày, tai, trang điểm…
  parts\body\                hồ sơ nhân vật: dáng thân, da, quần áo (char_profile.py)
  parts\trang-phuc\          danh sách bộ đồ cho GLB nhiều bộ (rig_base --outfits, 05 §7)
  *.fbx                      điệu nhảy Mixamo (không skin, 30 fps) + X Bot.fbx (chữ T)
```

## 3. Bộ ảnh đầu vào — ĐÃ CHỐT


| File | Nội dung |
|---|---|
| `face-01-front.png` | chính diện |
| `face-02-front-left-45.png` … `face-08-front-right-315.png` | 8 góc cách nhau 45°. Hậu tố là góc máy: 0 chính diện, 90 = nghiêng mà mũi chỉ sang trái người xem, 180 sau lưng |
| `hair-01-front.png`, `hair-02-left-profile.png`, `hair-03-right-profile.png`, `hair-04-back.png` | tóc riêng, nền đen |

Yêu cầu: 2048×2048; **đầu trọc**; cùng biểu cảm, ánh sáng, cỡ đầu ở mọi góc; nền trơn. Ảnh lớn hơn 2048 không giúp gì
(Hunyuan3D thu ảnh về ~518 px). Trước khi chạy: ghép 8 ảnh thành một tấm nhỏ có nhãn, kiểm tra hướng mũi khớp tên file.

## 4. Tạo bộ ảnh bằng ChatGPT Image — ĐANG LÀM (model-2)

Làm trong Chrome qua Claude in Chrome, ở `https://chatgpt.com/` chế độ **Create image**, một cuộc trò chuyện cho mỗi
nhân vật. Rút ra từ model-2:

1. **Toàn cảnh trước, chi tiết sau.** Thứ tự: mặt chính diện (định danh) → toàn thân 4 góc (trước, trái 90°, sau, phải
   270°) dáng chữ A, cùng đồ, cùng tóc → tóc tách riêng 4 góc trên nền đen → đầu trọc **cận cảnh** 8 góc (mục 3). Ảnh cho
   **thư viện bộ phận** (mũi, mắt, tai) theo luật riêng ở [05 §6a](05-mo-rong.md): chỉ bộ phận đó, nền trong suốt, nhiều
   góc trên một tấm.
2. **Đính kèm ảnh mốc mỗi lần.** Chỉ dựa vào lịch sử trò chuyện thì mặt trôi thành người khác (model-2: góc 45° đầu tiên
   hẹp mặt, da sáng hơn). Đính kèm ảnh cận chính diện đã chốt (`chatgpt\m2-face-01-closeup-a.png`) và nói rõ "ảnh đính
   kèm là chuẩn, giữ đúng bề rộng mặt, màu da, mắt, mày, mũi, môi, tai".
3. **Cận cảnh:** đầu chiếm ~85% chiều cao khung, hết đỉnh sọ có lề nhỏ, cắt ở cổ trên, ống kính dài (không méo góc rộng).
4. **Mô tả góc bằng hướng mũi** ("mũi chỉ về mép TRÁI ảnh") thay vì độ — ChatGPT hiểu đúng hơn.
5. Mỗi yêu cầu chờ ~60 s. Ảnh ra 1254×1254 (vuông) hoặc 1024×1536 (2:3); phóng lên 2048 khi chép vào `individual-2048`.
6. Tải ảnh: nút tải của ChatGPT không ra file — lấy `blob:` của thẻ `<img>` cuối cùng rồi bấm một thẻ `<a download>`
   (file vào `Downloads`), rồi dời vào `D:\Assets\model-N\chatgpt\`. Ảnh cần đính kèm phải chép vào thư mục session đọc
   được (`D:\TikTok\.tmp\…`) trước khi tải lên.
