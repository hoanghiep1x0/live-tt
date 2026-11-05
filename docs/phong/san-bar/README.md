# Loại phòng: Sàn bar (`san-bar`)

Phòng live dạng sàn nhảy 3D: vũ công 3D nhảy theo nhạc, quầy DJ, đèn moving head, màn hình chiếu vũ công phóng to;
người xem tặng quà thì vũ công đổi điệu, sàn sáng lên. Mỗi **kiểu** là một bối cảnh khác nhau của cùng cơ chế đó.

## Các kiểu

| Kiểu (`style`) | Thiết kế | Bối cảnh | Đặc tả |
|---|---|---|---|
| `hop-dem` | `client/designs/san-bar-hop-dem/` | Hộp đêm sang trọng, phòng kín 4 mặt, sàn kính đen lưới LED, tường LED, quầy bar đá phát sáng, khu VIP sofa nhung | [hop-dem.md](hop-dem.md) |
| `bai-bien` | `client/designs/san-bar-bai-bien/` | Bãi biển hoàng hôn, nhảy trên cát, dừa treo đèn, đuốc, lửa trại, dây đèn, máy bay nhỏ chiếu đèn | [bai-bien.md](bai-bien.md) |

## Dùng chung trong loại

| Mảng | Ở đâu | Ghi chú |
|---|---|---|
| **Lõi dựng cảnh** (renderer, hậu kỳ bloom, vật liệu PBR, nạp vũ công + điệu, DJ, màn hình chiếu) | sao chép vào `src/` của từng kiểu | Quy ước 01 §12: code chung giữa các kiểu thì sao chép, đổi kiểu này không làm vỡ kiểu kia. Bản gốc: `D:\Live-bar\client\public\bar\core.js`. |
| **Dựng nhân vật 3D** (ảnh → GLB có xương, 77 điệu Mixamo, tóc bay) | tài liệu [nhan-vat/](nhan-vat/README.md), script `scripts/phong/san-bar/nhan-vat/` | Đầu ra (file `.glb`) là asset của **module** vũ công, không nằm trong thiết kế (quy ước 04 §6). |

Giao kèo giữa lõi và một kiểu (`khong-gian`): kiểu chỉ dựng cảnh và trả về thông số camera, chỗ đứng của vũ công, DJ,
màn hình chiếu, hàm cập nhật theo nhịp (`BPM` 124). Lõi lo phần còn lại. Chi tiết: [hop-dem.md §Giao kèo](hop-dem.md#giao-kèo-với-lõi).

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Cảnh hộp đêm, bãi biển (three.js, chạy bằng `bar-preview.html` ở bản cũ) | **xong** ở bản cũ `D:\Live-bar` |
| Assets từng kiểu + `CREDITS.md` | **xong** — `client/designs/san-bar-*/assets/` |
| Quy trình dựng nhân vật, script, tài liệu | **xong** — model-1: `D:\Assets\model-1\out\model1_hair.glb` |
| Gói thiết kế theo kiến trúc mới: `design.json` (category/style), `StageProvider`, slot, `useAsset`, `dispose` WebGL | **xong** — build được, backend phục vụ `/d/san-bar-hop-dem/`, `/d/san-bar-bai-bien/`, lên hình không lỗi console |
| Test lõi thuần (nhịp nhạc, màu dải LED) | **xong** — `tests/client/designs/san-bar-*/nhip.test.ts` |
| Module vũ công 3D `vu-cong-3d`: chọn / bật tắt bộ đồ bằng ảnh nhỏ, đổi đồ khi có quà hoặc theo phút, đồng diễn khi có quà | **xong** — `client/modules/vu-cong-3d/`, hợp đồng slot `stage-3d` (docs/02 §5b); test `tests/client/modules/vu-cong-3d/` |
| GLB 5 bộ đồ (áo thun + short, áo thun + jeans, thể thao, sơ mi + chân váy, bikini) | **xong** — `client/modules/vu-cong-3d/assets/model-1.glb` 58 MB; cách dựng: [nhan-vat/05 §7](nhan-vat/05-mo-rong.md#7-trang-phục-một-glb-nhiều-bộ-đồ) |
| Camera theo khung dọc 9:16 (cảnh dựng cho khung ngang, khung dọc đang cắt hai bên) | chưa |

## Chạy thử

```
http://127.0.0.1:47830/d/san-bar-hop-dem/                                   cảnh trống (không module)
http://127.0.0.1:47830/d/san-bar-hop-dem/?model=/m/vu-cong-3d/model-1.glb   có vũ công, DJ, màn chiếu
http://127.0.0.1:47830/d/san-bar-bai-bien/?model=/m/vu-cong-3d/model-1.glb
```
Cần backend đang chạy và đã build thiết kế (`npm run build -w @live/design-san-bar-hop-dem`). Bật module **Vũ công 3D**
(mục "Live Sàn Bar" ở trang quản lý / bảng xem — nút bật chỉ mở khi đang phát thiết kế) thì module quyết GLB, bộ đồ, điệu;
`?model=` (chỉ nhận GLB backend phục vụ ở `/m/<module>/…`) là lối chạy thử khi chưa bật module.
Kiểu `bai-bien` đặt sẵn mặc định cho module: bật cả bikini (`design.json` → `defaults.vu-cong-3d.boBat`).
`?inspect=1` mở khoá camera để xoay tay. GLB 38 MB: vài giây đầu trang đang giải nén, WebSocket nối lại sau đó.

**Quần áo**: GLB trong module có 5 bộ, chọn lúc chạy; không có lựa chọn "không mặc gì" — id lạ hay tắt hết thì về bộ
đầu. **Không** đưa lên sóng bản chưa mặc đồ (`model1_hair.glb`, `model1_all_dances.glb` — chỉ để soi dáng). Bikini mặc
định **tắt** ở module: hợp bãi biển; hộp đêm mặc đồ bơi kèm điệu lắc hông dễ bị TikTok coi là phô trương, gỡ live.

## Nguồn gốc

Bản dựng thử ở `D:\Live-bar` nhánh `phong-kieu-4-bar` (chưa commit): `client/public/bar-preview.html`,
`client/public/bar/{core,space-luxe,space-beach}.js`, `client/public/models/bar/`.
