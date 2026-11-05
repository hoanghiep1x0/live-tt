# 09 — Tủ đồ chia món

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).

Vũ công mặc **từng món rời** (áo, quần/váy, đầm, giày, lót…) thay cho "một GLB chứa sẵn N bộ" ([05 §7](05-mo-rong.md)).
Mỗi món một GLB nhỏ gắn vào đúng xương model-1; sân khấu tải món nào đang mặc thì mới tải món đó.

## 1. Thư mục — xoá là xoá thư mục

```
client/modules/vu-cong-3d/assets/tu-do/      ← bản sân khấu đọc (máy chủ phục vụ /m/vu-cong-3d/tu-do/…)
 <thân>/            model-1, model-2… — nhân vật mà món được ôm theo. Đồ của thân này KHÔNG mặc vừa thân khác:
                    nhân vật mới thì xuất lại cùng các .mhclo trên base của nó, ra thư mục thân của nó.
  <nguồn>/          makehuman-cc0, mpfb-he-thong, …   (giấy phép giống nhau thì chung một nguồn)
    <ô>/            lien · ao · duoi · lot · giay · toc · phu-kien
      <món>/        mon.glb · mat-na.png · anh.webp · mon.json
```

- **Không có file danh sách.** Máy chủ quét thư mục mỗi lần hỏi (`GET /s/tu-do/vu-cong-3d`, `backend/src/tu_do.rs`).
  Thêm món = chép thư mục vào; xoá một món / một ô / một nguồn / mọi đồ của một thân = xoá đúng thư mục đó.
- **Xoá từ giao diện:** bảng xem → Vũ công 3D → tab Trang phục → nút ✕ trên từng món, hoặc "Xoá cả nguồn"
  (`DELETE /s/tu-do/vu-cong-3d/<thân>[/<nguồn>[/<ô>[/<món>]]]`). Bảng hỏi lại trước khi xoá.
- Bản gốc giữ ở `D:\Assets\tu-do` (và `assets/tu-do` trên hpc). Xoá trên giao diện chỉ xoá bản của sân khấu — muốn
  bỏ hẳn thì xoá cả bản gốc, không thì lần chép sau món quay lại.
- `mon.json`: `ten` (tiếng Việt), `o`, `che` (vùng món che: `nguc`, `hang`), `than`, `gioi` (`nu`, `nam`, `chung`),
  `tuoi`, `giayPhep`, `tacGia` (đọc từ `.mhclo`), `tamGiac`, `mhclo`. Thân / nguồn / ô / id theo thư mục, không theo nhãn.

### Luật tuổi (bắt buộc)

Phòng sàn bar chỉ có **người lớn**: nhân vật (`NHAN_VAT_MAU.tuoi` trong module) và món (`tuoi` = `nguoi-lon`). Món
không khai tuổi coi như không phải người lớn. Chặn ở ba chỗ: `xuat_mon.py` từ chối `--tuoi` khác; `locTuDo` (contracts)
bỏ món khác tuổi trước khi bảng xem hay sân khấu thấy; phần vẽ module không dựng nhân vật không phải người lớn. Lý do:
chính sách TikTok về trẻ vị thành niên trong nội dung gợi cảm — nhân vật trẻ em nhảy, mặc đồ lót trong quán bar là rủi
ro khoá kênh. Phòng cho trẻ em (nếu có) là tủ đồ và bộ điệu riêng, không dùng chung module này.

## 2. Ô và luật mặc (`client/shared/contracts/src/tu-do.ts`)

| Ô | Là gì | Luật |
|---|---|---|
| `lien` | đầm, suit liền | chiếm cả `ao` và `duoi` — mặc đầm là cởi áo + quần |
| `ao`, `duoi` | áo; quần, váy | mặc áo / quần là cởi đầm |
| `lot` | đồ lót an toàn | **sân khấu tự mặc kèm** khi bộ chưa che đủ |
| `giay`, `toc`, `phu-kien` | | mỗi ô một món |

**Che bắt buộc (TikTok):** bộ lên sóng phải che `nguc` và `hang`. Thiếu vùng nào thì `boLenSong` thêm món `lot` che
vùng đó; tủ không có lót phù hợp thì không cho mặc (sân khấu giữ bộ dựng sẵn). Váy, đầm thường **không** che `hang`
(hở đáy — nhảy là lộ) → luôn kèm quần lót; quần, short che được.

## 3. Thêm món mới (`xuat_mon.py`, chạy trên hpc)

```bash
# trên hpc, trong /mnt/D/dung-3d
BLENDER_USER_RESOURCES=$PWD/blender-user tools/blender-5.2.3-linux-x64/blender -b assets/model-1/out/base_v58_bikini.blend \
  --python repo/scripts/phong/san-bar/nhan-vat/xuat_mon.py -- assets assets/tu-do model-1 <nguồn> <ô> <file.mhclo>...   --ten <ten.json> [--gioi nu|nam|chung]
# máy Windows: kéo về rồi chép vào module
scripts/phong/san-bar/hpc-dong-bo.sh keo tu-do
cp -r /d/Assets/tu-do client/modules/vu-cong-3d/assets/
```

- Cùng đường với `rig_base`: xương "mixamo" của MPFB, chữ T như X Bot → món khớp xương `model-1.glb`; three.js buộc lưới
  món vào xương của từng vũ công theo tên xương (`macMon` trong `canh.ts` của thiết kế).
- **Mặt nạ da** (`mat-na.png`, 512², theo UV của thân): trắng = da dưới món, shader thân bỏ điểm đó. Theo UV chứ không
  theo số đỉnh vì xuất glTF xáo thứ tự đỉnh. Mặc nhiều món thì sân khấu gộp mặt nạ (sáng hơn thắng).
- **Đo che:** từ mỗi đỉnh **lõi** vùng (thu vào 1 cm), bắn tia ra ngoài theo pháp tuyến (bắt đầu lùi 6 mm vào trong da;
  ngực 4 cm, vùng kín 8 cm) hoặc điểm vải gần nhất < 3 cm → có vải phủ. ≥ 85 % đỉnh phủ mới tính là che; che thì ẩn hẳn
  cả vùng. Không dựa vào nhóm Delete của `.mhclo` — món cộng đồng nhiều món không khai.
- Nguồn đồ đã chấm và phân loại: `.tmp/nguon-thu/PHAN-LOAI.md` trên hpc. Gói MakeHuman: `*_cc0` dùng và bán tự do;
  `*_ccby` phải ghi công (`tacGia` trong `mon.json`).

## 4. Đang thiếu

- Vai chính có "bộ riêng" (tab Vai chính) thì giữ bộ dựng sẵn, chưa chọn được món tủ đồ riêng cho từng người.
- Đám đông vẫn mặc bộ dựng sẵn.
- Ảnh nhỏ chụp trên hpc: da, tóc tô màu phẳng (hoa văn của base nằm ở ổ Windows).
- Hoa văn món chưa nén (món lót 12–17 MB) — nén khi tủ lớn.
- Ô tóc, phụ kiện chưa có món.
