# 04 — Điệu nhảy: danh sách, chọn điệu, thêm điệu mới

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md).

## 1. Nguồn điệu

Điệu nhảy là file FBX tải từ [Mixamo](https://www.mixamo.com) (Adobe; miễn phí, dùng được trong sản phẩm thương mại,
không được bán lại riêng file chuyển động). Tải theo cài đặt: **FBX Binary, Without Skin, 30 fps, không giữ keyframe
reduction**. Để chung trong kho ngoài repo `D:\Assets\*.fbx` cùng `X Bot.fbx` (nhân vật chữ T làm mốc chuyển động).
Kho này nặng, không commit; GLB xuất ra mới là thứ đưa vào module.

## 2. Danh sách điệu đang có (77 điệu + 3 tư thế, kho `D:\Assets`)

`rig_base` lấy **mọi** file `.fbx` trong kho khi không ghi tên điệu nào, trừ `X Bot.fbx` và file có chữ `Pose` (tư thế
đứng, không phải điệu).

| Nhóm | Điệu (tên file = tên điệu trong GLB) |
|---|---|
| Hip hop | Arms Hip Hop Dance · Booty Hip Hop Dance · Hip Hop Dancing · Locking Hip Hop Dance · Robot Hip Hop Dance · Slide Hip Hop Dance · Slide Hip Hop Walk · Snake Hip Hop Dance · Tut Hip Hop Dance · Wave Hip Hop Dance · Dancing Running Man · Shuffling · House Dancing |
| Bboy / breakdance | Bboy Hip Hop Move · Bboy Uprock · Bboy Uprock Start · Breakdance 1990 · Breakdance Ready · Breakdance Swipes · Breakdance Uprock · Breakdance Uprock To Ground · Breakdance Uprock Var 1 · Breakdance Uprock Var 1 Start · Breakdance Uprock Var 1 End · Breakdance Uprock Var 2 · Breakdance Footwork 1 · Breakdance Footwork 2 · Breakdance Footwork 3 · Breakdance Footwork To Freeze · Breakdance Footwork To Idle · Breakdance Freezes · Breakdance Freeze Var 1 · Breakdance Freeze Var 2 · Breakdance Freeze Var 3 · Breakdance Freeze Var 4 · Breakdance Ending 1 · Breakdance Ending 2 · Breakdance Ending 3 · Crossleg Freeze · Flair · Head Spinning · Headspin Start · Headspin End |
| Latin, múa | Belly Dance · Bellydancing · Salsa Dancing · Samba Dancing · Rumba Dancing · Butterfly Twirl |
| Retro, swing | Northern Soul Dance · Northern Soul Spin · Northern Soul Spin Combo · Northern Soul Floor Combo · Northern Soul Floor Spin · Swing Dancing · Jazz Dancing · Twist Dance · Dancing Maraschino Step · Moonwalk |
| Vui, trend | Gangnam Style · Macarena Dance · Ymca Dance · Chicken Dance · Hokey Pokey · Silly Dancing · Shopping Cart Dance · Dancing Twerk · Dancing |
| Kịch bản Thriller | Thriller Idle · Thriller Part 1 · Thriller Part 2 · Thriller Part 3 · Thriller Part 4 |
| Đu dây (cần đạo cụ) | Rope Swinging · Start Swinging · Swinging · Run And Swing |
| Tư thế (bị bỏ qua) | Female Dance Pose · Male Dance Pose · Bboy Pose To Idle |

Lưu ý cho phòng: nhóm **breakdance** có đoạn nằm sàn, xoay đầu — tóc và quần áo dễ xuyên thân; nhóm **đu dây** cần
đạo cụ dây, không có thì tay túm khoảng không. Điệu ngắn kiểu `… Start` / `… End` / `… To Idle` là đoạn nối, dùng để
ghép chuỗi chứ không phát lặp một mình.

## 3. Xuất GLB với một nhóm điệu

```bash
# bộ 6 điệu của bản chính model-1
scripts/phong/san-bar/dung-nhan-vat.ps1 D:\Assets\model-1\out\base_v52.blend rig_base 'D:\Assets' out\model1_hair.glb `
    'Belly Dance' 'Hip Hop Dancing' 'Salsa Dancing' 'Samba Dancing' 'Wave Hip Hop Dance' 'Twist Dance'
# toàn bộ điệu trong kho
scripts/phong/san-bar/dung-nhan-vat.ps1 D:\Assets\model-1\out\base_v52.blend rig_base 'D:\Assets' out\model1_all_dances.glb
```

Mỗi điệu là một dải NLA → một `animation` trong GLB, tên = tên file. `rig_base` cho mỗi điệu:
1. Nạp FBX, chuyển động sang rig MPFB (`retarget.py`: về chữ T như X Bot rồi chép góc thế giới từng khung; hông dời theo
   tỉ lệ chiều cao hai nhân vật).
2. Mô phỏng tóc (`hair_dyn.py`, 3 bước con mỗi khung) nướng thẳng vào chính action đó → tóc bay theo đúng điệu.
3. Gắn dải NLA, tắt tiếng; three.js chọn điệu bằng tên.

Chi phí đo trên model-1: 6 điệu ~1–2 phút, GLB 31,8 MB; toàn bộ 77 điệu 48 phút, GLB 66,4 MB (§5).

## 4. Thêm điệu mới

1. Tải điệu trên Mixamo theo cài đặt §1, **đổi tên file thành tên điệu muốn hiện** (giữ chữ cái tiếng Anh, có thể có
   dấu cách), chép vào `D:\Assets\`.
2. Kiểm tra nhanh trên nhân vật mẫu: xuất GLB một điệu rồi chụp dải khung:
   ```bash
   scripts/phong/san-bar/dung-nhan-vat.ps1 <base.blend> rig_base 'D:\Assets' .tmp\thu.glb '<Tên điệu>'
   scripts/phong/san-bar/dung-nhan-vat.ps1 _ render_dance .tmp\thu.glb '<Tên điệu>' .tmp\thu.png --views back,side,front
   ```
   Xem: chân có trượt (hông dời sai tỉ lệ), tay có xuyên thân, tóc có văng quá (chỉnh `stiff`/`damp` trong `hair_dyn.py`).
3. Ghi điệu vào bảng §2 đúng nhóm. Điệu cần đạo cụ hoặc nằm sàn thì ghi chú ở cột nhóm.

Điệu không phải từ Mixamo (BVH, FBX nơi khác): xương phải đổi tên theo `mixamorig:*` trước, hoặc viết bảng đổi tên
trong `retarget.py` — `retarget.bake` khớp xương **theo tên**.

## 5. Dung lượng khi xuất toàn bộ điệu

Đo trên model-1 (`model1_all_dances.glb`): xem [07 — Nhật ký](07-nhat-ky-model-1.md#xuất-toàn-bộ-điệu). Phòng live chỉ
cần một nhóm điệu hợp bối cảnh (hộp đêm: hip hop + latin; bãi biển: latin + vui + retro) — xuất theo nhóm để GLB nhẹ.
