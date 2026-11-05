# Sàn bar · Kiểu Hộp đêm (`hop-dem`)

Thiết kế: `client/designs/san-bar-hop-dem/` · `design.json`: `"id": "san-bar-hop-dem"`, `"category": "san-bar"`,
`"style": "hop-dem"`. Loại phòng: [README](README.md).

## Bối cảnh

Hộp đêm hiện đại, sang trọng, phòng kín 4 mặt (x −8,5…8,5, z −6,4…7 m), sương mù tím nhẹ, ánh sáng môi trường HDR
`dancing_hall`.

| Thành phần | Mô tả |
|---|---|
| Sàn phòng | đá lát granite phủ bóng (clearcoat 0,6) |
| Tường | gỗ tối phủ bóng |
| Tường LED sau sân khấu | nền equalizer theo nhịp; lõi chiếu vũ công phóng to đè lên (màn 3,6 × 2,0 m ở z −6,05) |
| Quầy DJ | giữa sau, DJ đứng z −5,75 |
| Sàn nhảy | kính đen phản chiếu + lưới LED đổi màu theo nhịp |
| Đèn moving head | tia mờ dần + vệt màu chạm sàn; 3 kiểu quét đổi mỗi 4 ô nhịp |
| Laser | bật ở nửa sau mỗi chu kỳ 4 ô nhịp |
| Quầy bar đá (phải) | mặt marble phát sáng |
| Khu VIP (trái) | sofa nhung |
| Chữ neon | nhấp nháy ngẫu nhiên |

Bảng màu chung của loại: `#ff2d95`, `#7a3cff`, `#18d6ff`, `#ffb02e`; nhịp `BPM` 124.

## Giao kèo với lõi

Kiểu chỉ dựng cảnh; lõi (renderer, bloom, vật liệu, vũ công, DJ, màn chiếu) gọi `build(ctx)` và nhận lại:

| Trường | Hộp đêm | Ý nghĩa |
|---|---|---|
| `floorY` | 0,088 | mặt sàn nhảy (vũ công đứng lên đây) |
| `spots` | `[-1.8,-1.2] [0,-2.4] [1.8,-1.2]` | chỗ đứng 3 vũ công (x, z) |
| `dj` | x 0, z −5,75, `floorY` 0 | chỗ DJ |
| `screen` | 3,6 × 2,0, tâm `[0, 3.35, -6.05]` | màn chiếu vũ công phóng to |
| `camera` | từ `[0, 2.2, 5.8]` nhìn `[0, 1.9, -1.2]`, khoảng cách 3–7 m, góc ngang ±0,55 rad, góc dọc 0,32π–0,52π, hộp giới hạn `[-8.1, 0.5, -6.0]`–`[8.1, 6.9, 6.6]` | luôn đứng trước tường LED |
| `update(t, beat, pulse, bar4)` | vẽ màn, lưới LED, quét đèn, laser, neon | gọi mỗi khung; `beat` = số nhịp, `pulse` 0–1 nảy theo nhịp, `bar4` = số ô 4 nhịp |

`ctx` lõi đưa vào: `THREE`, `scene`, `add`, `strip`, `glow`, `neon`, `pbr`, `lacquer`, `gold`, `chrome`, `velvet`,
`glass`, `loadHDR`, `PALETTE`, `renderer`.

## Assets

`client/designs/san-bar-hop-dem/assets/` — danh sách và giấy phép: `assets/CREDITS.md`. Texture 1k Poly Haven CC0
(granite_tile, marble_01, dark_wood, velour_velvet) + HDR `dancing_hall_1k.hdr`; tổng ~7,9 MB.

## Slot và module

| Slot | Dùng cho |
|---|---|
| `stage-3d` | vũ công 3D (module vũ công — nạp GLB nhân vật ở `docs/phong/san-bar/nhan-vat/`) |

Sàn bar chỉ có một tính năng là vũ công 3D. Top người tặng, bóng chat, dải chữ chạy, cảm ơn quà, chào mừng và nhân vật ảo là của phòng kể chuyện, nên thiết kế này không khai slot hay `crowd` cho chúng.

Không có module nào bật thì vẫn lên hình: cảnh, đèn, màn LED chạy theo nhịp; sàn trống (quy ước 04 §1).

## Còn lại

- ~~Chuyển sang gói thiết kế~~ **xong**: `src/canh.ts` (lõi, bản sao riêng), `src/khong-gian/hop-dem.ts`, `src/nhip.ts` (thuần, có test), `src/Stage.tsx`.
- Camera: cảnh dựng cho khung ngang; khung dọc 9:16 đang cắt hai bên — chỉnh `camera` trong `khong-gian/hop-dem.ts`.
- Màn chiếu và DJ hiện do lõi dựng từ GLB vũ công — khi có module vũ công thì phần nhân vật chuyển hẳn sang module.
- Mức giảm chất lượng khi tụt khung hình (`quality.minFps`), giải phóng tài nguyên THREE khi đổi thiết kế (04 §8).
