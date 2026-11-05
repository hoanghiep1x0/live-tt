# 09 — Tủ đồ chia món

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).

Vũ công mặc **từng món rời** (áo, quần/váy, đầm, giày, lót…) thay cho "một GLB chứa sẵn N bộ" ([05 §7](05-mo-rong.md)).
Mỗi món một GLB nhỏ gắn vào đúng xương model-1; sân khấu tải món nào đang mặc thì mới tải món đó.

## 1. Thư mục — xoá là xoá thư mục

```
client/modules/vu-cong-3d/assets/tu-do/      ← bản sân khấu đọc (máy chủ phục vụ /m/vu-cong-3d/tu-do/…)
 <thân>/            model-1, model-2… — nhân vật mà món được ôm theo. Đồ của thân này KHÔNG mặc vừa thân khác:
                    nhân vật mới thì xuất lại cùng các .mhclo trên base của nó, ra thư mục thân của nó.
  <nguồn>/          makehuman-cc0, makehuman-ccby, mpfb-he-thong, …   (giấy phép giống nhau thì chung một nguồn)
    <ô>/            lien · ao · duoi · lot · giay · toc · mu · kinh · gang-tay · phu-kien
      <món>/        mon.glb · mat-na.png · anh.webp · mon.json
```

- **Không có file danh sách.** Máy chủ quét thư mục mỗi lần hỏi (`GET /s/tu-do/vu-cong-3d`, `backend/src/tu_do.rs`).
  Thêm món = chép thư mục vào; xoá một món / một ô / một nguồn / mọi đồ của một thân = xoá đúng thư mục đó.
- **Xoá từ giao diện:** bảng xem → Vũ công 3D → tủ đồ bất kỳ (Vai chính, Đám đông, Đồ chung) → nút ✕ trên từng món, hoặc "Xoá cả nguồn"
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
| `lot` | đồ lót an toàn | **luôn mặc bên trong** — chưa chọn thì sân khấu tự mặc kèm |
| `giay`, `toc`, `mu`, `kinh`, `gang-tay`, `phu-kien` | | mỗi ô một món; mặc tóc tủ đồ thì sân khấu ẩn tóc của GLB |

**Che bắt buộc (TikTok):** bộ lên sóng phải che `nguc` và `hang`, và **luôn có đồ lót bên trong** dù áo, quần đã che —
nhảy mạnh vải ngoài xô lệch vẫn không lộ. Vùng nào chưa có món `lot` che thì `boLenSong` tự thêm; tủ không có lót phù
hợp thì không cho mặc (sân khấu giữ bộ dựng sẵn). `che` của áo, quần, đầm vẫn được đo và hiện trên thẻ món (váy, đầm
thường **không** che `hang` — hở đáy). Chỉ `lien`, `ao`, `duoi`, `lot` được tính là che: tóc dài
xoã ngực là sợi alpha nhìn xuyên, nên `xuat_mon.py` không đo che cho ô khác và `boLenSong` bỏ qua `che` của chúng.

### Chọn đồ trên bảng xem

- **Vai chính:** mỗi người (Chính, Bên trái, Bên phải, DJ, Màn chiếu) có tủ đồ riêng ngay dưới "Có mặt" — chọn người
  xong chọn đồ luôn. Có món riêng thì người đó mặc món riêng (`VuCong3D.monRieng`); chưa có thì dùng "Bộ dựng sẵn"
  (bộ riêng, hoặc "Theo cả nhóm").
- **Kho nhân vật** (tab Đám đông): mỗi nhân vật một bộ phối sẵn (tên + món tủ đồ), có sẵn 8 nhân vật dự tiệc. Nhóm đám
  đông bật "Lấy người từ kho nhân vật" thì mỗi người một nhân vật, lần lượt không ai trùng ai (`NhomDamDong.monBo`) —
  không bốc lung tung cả tủ (phối lệch trông xấu). Sau này khách vào phòng cũng nhân bản từ kho này.
- **Đồ chung:** tủ đồ cho người chọn "Theo cả nhóm" (`VuCong3D.mon`), cùng các bộ dựng sẵn phòng luân phiên.
- Mỗi tủ đồ có **khung thử đồ 3D** (`XemThuDo` trong stage-sdk): nhân vật mặc đúng bộ sẽ lên sóng (kể cả lót tự kèm),
  bấm món là đổi ngay, kéo để xoay. Chưa chọn món thì khung mặc bộ dựng sẵn ở ô `boSan` của trường.

### Màn thay đồ VIP (tab Thay đồ VIP)

Quà từ `thayDoXu` xu trở lên (hoặc nút "Thay đồ VIP" trên thẻ): khung cửa vàng trồi lên quanh vũ công, rèm khép, đèn chớp
+ khói, đổi đồ sau rèm (`MAN_THAY_DO.doiDo`), rèm bung ra cùng pháo hoa, lấp lánh, vòng sáng dưới chân và chữ cảm ơn khách;
mặc đồ VIP `giuVipPhut` phút rồi về đồ cũ. Bộ VIP bốc ngẫu nhiên trong kho nhân vật mỗi màn (hoặc một bộ chọn sẵn). Lõi
module giữ trạng thái (`State.thayDo`), mốc thời gian gửi qua `VuCong3D.thayDo.moc`; phần nhìn ở `thay-do.ts` của thiết kế.
Màn đang diễn thì quà sau không cắt ngang.

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
- Nguồn đồ đã chấm và phân loại: `.tmp/nguon-thu/PHAN-LOAI.md` trên hpc. Gói MakeHuman: `*_cc0` → nguồn `makehuman-cc0`, dùng
  và bán tự do; `*_ccby` → nguồn `makehuman-ccby`, phải ghi công (`tacGia` trong `mon.json`). `giayPhep` lấy theo nguồn
  (`GIAY_PHEP_NGUON`), không theo dòng `license` trong `.mhclo` — nhiều món CC0 vẫn mang chữ AGPL3 mẫu của MakeClothes cũ.
- **Ảnh nhỏ:** đồ mặc (áo, quần váy, đầm) chụp trên thân; tóc, mũ, kính, găng, giày, lót, phụ kiện chụp riêng món, khung sát
  món (`O_ANH_RIENG`) — chụp cả người thì không nhìn ra món nhỏ. Găng chỉ chụp một bên tay.
- **Nén:** hoa văn thu về ≤ 1024 px và xuất WebP trong GLB (`EXT_texture_webp`, three.js đọc sẵn) — đầm 4K từ 39 MB còn
  ~0,5 MB. Xuất lại món cũ: dựng danh sách từ các `mon.json` đang có rồi chạy lại `xuat_mon.py` theo từng (nguồn, ô, giới).

## 4. Đang thiếu

- Ảnh nhỏ chụp trên hpc: da, tóc tô màu phẳng (hoa văn của base nằm ở ổ Windows).
- Ô phụ kiện (cánh, đồ cầm tay) chưa có món; kho đồ VIP riêng (đồ chỉ màn thay đồ mới có) chưa có — đang bốc từ kho nhân vật.
- Món có `neutral_bone` (vài đỉnh không gắn xương, gặp ở 10 kiểu tóc): sân khấu buộc tạm vào xương đầu / hông; nên sửa ở `xuat_mon.py` (gán trọng số đỉnh trống).
