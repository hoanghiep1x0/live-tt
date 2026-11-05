# Sàn bar · Kiểu Bãi biển (`bai-bien`)

Thiết kế: `client/designs/san-bar-bai-bien/` · `design.json`: `"id": "san-bar-bai-bien"`, `"category": "san-bar"`,
`"style": "bai-bien"`. Loại phòng: [README](README.md). Giao kèo với lõi giống [Hộp đêm](hop-dem.md#giao-kèo-với-lõi).

## Bối cảnh

Bãi biển hoàng hôn, không gian mở, mặt trời thấp.

| Thành phần | Mô tả |
|---|---|
| Trời, biển | trời hoàng hôn; mặt biển gợn sóng (normal map `waternormals`) |
| Bãi cát | dốc nhẹ xuống biển; sóng nhỏ xô bờ: dải bọt trắng trườn lên rồi rút, để lại vệt cát ướt |
| Sàn nhảy | nhảy thẳng trên cát (không sàn gỗ); chỉ DJ đứng bục thấp |
| Quầy DJ + khung màn hình | quay về phía khán giả (ngược hướng biển); màn 5,0 × 2,8 m |
| Dây đèn bóng tròn | giăng trên sân khấu, nảy theo nhịp |
| Dừa | thân gỗ tối; treo đèn moving head xoay như hộp đêm |
| Máy bay nhỏ | bay vòng trên đầu, treo đèn chiếu xuống |
| Đuốc tiki, lửa trại | lửa lay động, đèn lửa chập chờn |
| Dù che nắng, ghế nằm, cua bò ngang, hải âu, sao biển, vỏ sò | tạo không khí, chuyển động nhẹ |
| Chữ neon | |

## Thông số trả về lõi

| Trường | Bãi biển |
|---|---|
| `floorY` | độ cao bục (`DECK.h`) |
| `spots` | `[-2.4, 3.6] [0, 2.4] [2.4, 3.6]` |
| `dj` | x 0, z = mép sau + 0,7, `floorY` 0,4 |
| `screen` | 5,0 × 2,8, tâm ở mép sau, cao `DECK.h + 3.9` |
| `camera` | từ `[0, 4.2, 22]` nhìn `[0, 2.6, 2]`, khoảng cách 8–30 m, góc ngang ±0,45 rad, góc dọc 0,32π–0,49π, hộp giới hạn `[-60, 0.8, -8]`–`[60, 40, 60]` |
| `update(t, beat, pulse, bar4)` | máy bay, đèn trên dừa, mặt biển, sóng, cua, hải âu, màn chiếu (vẽ cách khung), lửa, dây đèn |

## Assets

`client/designs/san-bar-bai-bien/assets/` — danh sách và giấy phép: `assets/CREDITS.md`. Texture 1k Poly Haven CC0
(coast_sand_01, dark_wood) + `waternormals.jpg` (three.js, MIT); tổng ~6,5 MB.

## Slot và module

Như [Hộp đêm](hop-dem.md#slot-và-module).

## Còn lại

- ~~Chuyển sang gói thiết kế~~ **xong**: `src/canh.ts` (lõi, bản sao riêng), `src/khong-gian/bai-bien.ts` (đã chép `fadeTexture`, `radialTexture` vào, không trỏ sang hộp đêm), `src/nhip.ts`, `src/Stage.tsx`.
- Camera: khung dọc 9:16 đang cắt hai bên — chỉnh `camera` trong `khong-gian/bai-bien.ts`.
- Cảnh mở nhiều vật chuyển động: khai `quality` và giảm số cua/hải âu/máy bay khi tụt khung hình.
