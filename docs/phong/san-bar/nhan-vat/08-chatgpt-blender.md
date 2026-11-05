# 08 — Dùng ChatGPT Image cùng Blender: dáng, màu, cỡ

Phòng sàn bar · dựng nhân vật 3D. Mục lục: [README](README.md). Máy và thư mục: [01](01-chuan-bi.md). Thư viện bộ phận:
[05 §6](05-mo-rong.md).

Mục tiêu: bản Blender **giống ảnh mẫu đến mức chồng lên không thấy lệch** — về dáng, màu và cỡ. Không có "100%" bằng mắt
thường; ở đây "đạt" nghĩa là qua đủ ngưỡng đo ở mục 7 **và** được duyệt bằng mắt trên `so-sanh.jpg`.

Trạng thái (2026-11-05): ✅ = đã chạy được, 🔧 = quy ước đã chốt, công cụ chưa viết.

## 1. Chia việc: ai làm gì

| | ChatGPT Image | Blender (hpc-station) |
|---|---|---|
| Thiết kế | vẽ nhân vật, bộ phận, kiểu tóc, đồ — **nguồn ý tưởng và ảnh mẫu** | — |
| Dựng | — | **dựng thật**: lưới MakeHuman, thanh trượt, texture, xương, GLB |
| Đo | — | chụp cùng góc, đo sai số px / màu ✅ / 🔧 |
| Chấm | nhìn ảnh mẫu cạnh ảnh dựng, **liệt kê chỗ khác** theo thứ tự nặng nhẹ 🔧 | dịch nhận xét thành thanh trượt / texture cần chỉnh |
| Sửa mẫu | sửa **một góc** trên chính ảnh Blender chụp (mép sắc) → ảnh mẫu mới cùng khung ✅ | khớp lại, chụp lại **mọi** góc từ khối 3D ✅ |

ChatGPT không bao giờ là sản phẩm cuối — mọi thứ vào phòng đều là lưới Blender. ChatGPT nhanh ở chỗ thiết kế và **nhìn ra khác
biệt**; Blender chính xác ở chỗ đo và dựng. Vòng lặp dưới đây ghép hai cái đó.

## 2. Vòng lặp chuẩn — ChatGPT sửa từng góc, Blender giữ khối 3D

Chốt 2026-11-05 sau khi thử nhiều cách (mục 7, 9). Làm theo skill `.claude/skills/chatgpt-bo-phan-3d/SKILL.md`.

```
 Blender chụp góc X (mép sắc) ──► ChatGPT sửa góc X (P1/P2) ──► cổng lệch khung ──► Blender khớp (thanh + đỉnh, đối xứng)
        ▲                                                                                        │
        └──────────────── chụp lại MỌI góc từ khối 3D ◄──────────────────────────────────────────┘
 thứ tự: nghiêng 90° → chính diện  (khớp)   ·   45°, dưới-trước 45° (duyệt: ChatGPT còn sửa ≤ 0,5 mm là đạt)
```

Vì sao: ChatGPT vẽ mỗi góc như một tranh 2D riêng — nhiều góc vẽ cùng lúc **luôn** mâu thuẫn 1–2 mm (không khối 3D nào thoả).
Cho nó sửa từng góc trên ảnh của một khối 3D có thật thì mỗi lượt chỉ là "góc này đã đúng ý đồ chưa, sửa chỗ nào" — việc nó
làm tốt — còn tính nhất quán do Blender giữ. Nghiêng + chính diện là hai hình chiếu không chồng thông tin (bản vẽ kỹ thuật),
nên khớp được cả hai gần như tuyệt đối; góc chếch chỉ dùng để kiểm.

1. **Vẽ mẫu** — toàn cảnh trước (cả người, cả đầu), bộ phận sau. Bộ phận: luôn sửa trên ảnh khuôn / ảnh Blender gửi kèm.
2. **Khớp** — `bo_phan.py khop-khuon <thư mục> 90=…,0=…` (bộ phận, [05 §6a](05-mo-rong.md)) hoặc chuỗi bước ở
   [02](02-quy-trinh.md) (cả đầu). ✅ (mũi)
3. **Chụp** — `bo_phan.py khuon --khuon … --part … --goc 0,90,45,duoi45 --tung --sac --R 1024`. ✅
4. **So 1:1** — `so-sanh.jpg` (hàng ChatGPT · Blender · chồng 50%); `so-sanh-bien.png` (bóng mẫu xám + viền dựng đỏ). ✅
5. **Duyệt** — góc chếch qua lời nhắc P3; ChatGPT còn sửa > 0,5 mm thì đưa góc đó vào danh sách khớp và lặp. ✅

## 3. Luật khi nhờ ChatGPT vẽ

1. **Một cuộc trò chuyện cho một việc** (một nhân vật, hoặc thư viện bộ phận) — lịch sử giữ phong cách.
2. **Đính kèm ảnh mốc mỗi lần** khi cần giữ danh tính / thiết kế (ảnh mặt đã chốt, mũi đã chốt). Chỉ dựa vào lịch sử thì sau
   vài lượt mặt trôi thành người khác.
3. **Bộ phận: chỉ vẽ bộ phận đó, nền trong suốt** — không kèm mặt, cổ, bộ phận khác ([05 §6a](05-mo-rong.md)).
4. **Cần nhiều góc → từng góc một trên ảnh Blender**, không xin tấm nhiều góc (các góc tự mâu thuẫn — mục 7). Ảnh gửi đi
   **mép sắc**, ghi "no zoom", "keep the background TRANSPARENT (PNG alpha, not black)".
5. **Tả góc bằng hướng** ("đầu mũi chỉ về mép TRÁI ảnh", "nhìn từ dưới lên, đầu mũi hướng mép trên") thay vì chỉ ghi độ.
6. **Chiếu song song**: ghi "orthographic look, no perspective distortion" — ảnh dựng của Blender cũng là ortho.
7. **Đèn**: ảnh để so dáng → "soft even studio lighting"; ảnh để lấy màu → lời nhắc B (đèn phẳng, không bóng).
8. **Đừng tin ChatGPT giữ cỡ tuyệt đối** — nó giữ được tỉ lệ *trong một tấm*, không giữ được cỡ so với khung khác (mục 5).
9. Mỗi ảnh ~60 s; mỗi lượt chỉ một yêu cầu rồi chờ ảnh xong (gộp nhiều yêu cầu vào một lượt thì trình duyệt treo).

## 4. Dáng (hình khối)

- Đo trên **bóng** (alpha / tách nền) và **đường nghiêng**: góc nghiêng 90° cho đường sống mũi, trán–cằm; chính diện cho bề rộng;
  từ dưới lên cho cánh và lỗ mũi; 45° cho khối gò má, đầu mũi.
- Điểm mốc MediaPipe chỉ có ở ảnh **có mặt** (chính diện, 45°); ảnh bộ phận rời không có mặt → dùng mép alpha. 🔧
- Thanh trượt nào cũng có cặp tăng/giảm → mỗi cặp chỉ giữ một chiều; phạt `lam·|w|²` để không vặn thanh thừa.
- Thứ thanh trượt không tạo được (nếp sâu, lỗ mũi lộ rõ, sụn cạnh) → normal map / chỉnh tay đỉnh cục bộ, ghi vào [06](06-da-thu-va-loi.md).

## 5. Cỡ và vị trí

ChatGPT không giữ cỡ tuyệt đối (mũi rời vẽ lên khung đầu chuẩn bị phóng to — đã gặp). Nên tách hai việc:
- **Thư viện bộ phận lưu DÁNG ở cỡ của đầu chuẩn** (khung khuôn cố định nên cỡ không trôi).
- **Cỡ và chỗ đặt lấy từ ảnh NHÂN VẬT** (ảnh cả mặt có ở 01 §4): đo tỉ lệ giữa các bộ phận trên ảnh mặt — bề rộng mũi / khoảng
  hai khoé mắt trong, dài mũi / mắt→cằm, khoảng hai mắt / bề rộng mặt… — rồi đặt thanh cỡ (`nose-scale-*`, `eye-scale-*`,
  `ears-scale-*`) và thanh dời (`*-trans-*`) cho tỉ lệ trên lưới bằng tỉ lệ trên ảnh. 🔧
- Kiểm tra: chụp nhân vật cùng góc với ảnh mặt, chồng theo hai khoé mắt; lệch điểm mốc ≤ ngưỡng mục 7.

## 6. Màu sắc

- **Ảnh lấy màu khác ảnh so dáng.** Ảnh có bóng đổ trộn màu da với ánh sáng. Xin thêm bản **đèn phẳng** (lời nhắc B): cùng
  bộ phận/nhân vật, ánh sáng đều mọi phía, không bóng, không bóng loáng → gần màu gốc (albedo) để chiếu lên texture. 🔧
- So màu trong **cùng đèn**: Blender chụp bằng đúng bộ đèn studio của đầu chuẩn; so độ lệch màu ΔE (CIEDE2000) trung bình trên
  vùng da của bộ phận. 🔧
- Màu chi tiết (lòng lỗ mũi, viền môi, tròng mắt, mày) lấy thẳng từ ảnh đèn phẳng — đừng hỏi ChatGPT "mã màu bao nhiêu" (nó
  đoán, không đo).

## 7. Ngưỡng "đạt" — tính bằng mm thật

Ngưỡng px vô nghĩa khi khung đổi cỡ (1,5 px trên khung 1024 của khuôn mũi chỉ là 0,08 mm — nhỏ hơn cả độ tự mâu thuẫn của
ảnh ChatGPT). Đo bằng mm trên khung khuôn (`part.json → sai_so → lech_mep_mm`):

| Đo | Ngưỡng | Có công cụ |
|---|---|---|
| Lệch mép, góc chính (nghiêng, chính diện) sau khớp | ≤ 0,3 mm | ✅ `lech_mep_mm` |
| ChatGPT còn sửa bao nhiêu ở góc duyệt (45°, dưới-trước 45°) | ≤ 0,5 mm | ✅ `khop-khuon <tạm> 45=… --tu-part part.json` |
| Cổng lệch khung ảnh ChatGPT | IoU ≥ 0,75; lệch trên ≤ 4 %, dưới ≤ 8 % | ✅ dòng `CONG` |
| Mặt lật / gập (tam giác xoay > 90° / > 60° so với đầu chuẩn) | 0 lật, ≤ 2 gập — tự gỡ gập trong `khop-khuon` | ✅ dòng `MAT_LAT` |
| Lệch màu ΔE2000 trung bình vùng da | ≤ 3 | 🔧 |
| Mắt người duyệt `so-sanh.jpg`, `tren-dau.jpg` | không thấy lệch ở hàng chồng 50%; mũi đối xứng, không gồ | ✅ |

**Bộ mẫu mũi 8 kiểu — ĐẠT** (quy trình mục 2, bảng ở [05 §6a](05-mo-rong.md)): góc chính 0,02–0,28 mm, góc duyệt 0,16–0,46 mm,
0 mặt lật. Hai kiểu cần 3 vòng duyệt góc 45° (ChatGPT sửa ít dần: 1,31 → 0,55 → 0,43 mm) — vòng lặp hội tụ.
Lỗi bắt được muộn: mũi gồ đạt mọi số mà có vệt mảnh dưới lỗ mũi (lưới gập do tinh chỉnh đỉnh) → thêm cổng `MAT_LAT` + bước
gỡ gập; góc dưới-trước đo nhầm mép cắt giáp má/môi → chỉ đo viền trên ở cột giữa.

Các bản trước (khung 192 px, tấm 2×2): chỉ thanh trượt 2,7–5,5 px; + tinh chỉnh đỉnh không đối xứng 0,9–2,2 px (mũi lệch);
đối xứng 0,5–7,8 px (ảnh ChatGPT tự mâu thuẫn).

**Tinh chỉnh từng đỉnh** (`khop-khuon --tu-do N --mu M`, sau thanh trượt; `--tu-part` để khỏi dò lại thanh, nạp cả `dinh`):
mỗi mẫu mép gán cho vài đỉnh gần, giải bình phương tối thiểu với ràng buộc trơn Laplace (`mu`), nửa bước mỗi vòng, giữ vòng
tốt nhất, **ép đối xứng trái–phải**. Độ dời lưu ở `part.json → dinh`, áp thành shape key `part_dinh`.

Bài học khi đuổi ngưỡng (2026-11-05):
- **Không ép đối xứng thì số đẹp mà mũi lệch** (từ dưới 0,96 px nhưng đầu mũi xô một bên): góc 45° chỉ thấy một bên mũi.
- Phần còn lại là **ảnh ChatGPT tự mâu thuẫn** ~1–2 mm: khớp riêng từng góc thì góc đó xuống 0,5–2 px nhưng các góc khác vọt
  7–15 px; chóp mũi ở 45° nhô quá mức góc nghiêng cho phép, cánh mũi nhìn từ dưới loe rộng hơn nhìn thẳng.
- **Góc từ dưới lên lệch nhiều nhất ở mọi bản** — có hệ thống: ô này trên khuôn khó đọc (nửa vòng + dải nâu), ChatGPT vẽ như
  nhìn chếch. Hướng sửa: đổi ô thành nhìn từ dưới-trước chếch 45° (dễ hiểu hơn, vẫn thấy lỗ mũi), hoặc chỉ dùng để duyệt mắt.
- Đưa ảnh Blender (có mép mờ) cho ChatGPT sửa tiếp thì nó **phóng to cả vùng** gần kín ô. Ảnh **mép sắc, một góc** thì
  ChatGPT giữ khung tuyệt đối (lệch 0 %) → đó là quy trình mục 2.

## 8. Lời nhắc mẫu (chép rồi sửa phần trong <…>)

**Lời nhắc đang dùng cho bộ phận: P1 (nghiêng), P2 (chính diện), P3 (duyệt) + bảng mô tả kiểu — ở skill
`.claude/skills/chatgpt-bo-phan-3d/SKILL.md`.** A và E dưới đây là của cách tấm nhiều góc đã bỏ, giữ để tra; B, C, D vẫn dùng.

**A — bộ phận nhiều góc, nền trong suốt**
> MULTI-ANGLE sheet of <a/the same> <upturned nose: slightly turned-up tip, nostrils visible from the front, short slightly
> concave bridge>. ONLY THE <NOSE>, no face, no eyes, no lips, no cheeks, no neck, nothing else. Transparent background (PNG
> with alpha). Landscape, 4 views in one row, left to right, evenly spaced, SAME scale, same vertical alignment: 1) FRONT,
> 2) THREE-QUARTER (45°, tip pointing LEFT), 3) SIDE PROFILE (90°, tip pointing LEFT), 4) BOTTOM (from directly below, tip
> pointing to the TOP, both nostrils visible). Orthographic look, no perspective distortion. Neutral skin, soft studio
> lighting, same in every view. Soft feathered edge.

**B — bản đèn phẳng để lấy màu**
> Same <nose> sheet, identical shapes, positions and scale, but FLAT ALBEDO lighting: perfectly even light from all sides,
> no shadows, no highlights, no specular shine — only the true skin colors. Transparent background.

**C — chấm so sánh**
> Left: reference. Right: my 3D render of the same <nose> from the same angles. List every visible difference in SHAPE,
> COLOR and SIZE, most important first, each as one line: view · where · what (e.g. "side · tip · render tip 2 mm lower,
> less upturned"). Say "no significant difference" if none.

**E — sửa dáng bộ phận trên tấm khuôn (đính kèm `khuon.png`)**
> The attached image is a TEMPLATE rendered from my 3D software: a 2x2 sheet of ONE neutral <nose> on a transparent
> background. Top-left = FRONT, top-right = THREE-QUARTER 45° (tip pointing left), bottom-left = SIDE PROFILE 90° (tip
> pointing left), bottom-right = BOTTOM view (from below, tip pointing up, both nostrils visible). Edit this template: reshape
> the <nose> in ALL FOUR views into <the UPTURNED nose: slightly turned-up tip, nostrils a bit more visible from the front,
> short slightly concave bridge>, consistent between views. Keep EVERYTHING else exactly as in the template: same canvas
> size, same 2x2 layout, each <nose> at the same position and the same overall size, same camera angles, same lighting and
> skin, same soft feathered edges, transparent background. Only the <nose>, nothing else.

**D — sửa chỗ sai lên chính ảnh dựng**
> Edit the attached image (my 3D render, fixed camera). Change ONLY <the nostrils: make them visible from the front like the
> reference>. Everything else must stay pixel-identical: framing, position, size, lighting, background, image size.

## 9. Lỗi đã gặp

| Lỗi | Cách tránh |
|---|---|
| Mặt trôi thành người khác sau vài góc | đính kèm ảnh mốc mỗi lần (mục 3.2) |
| Mũi rời vẽ lên khung đầu chuẩn bị phóng to | chuẩn hoá theo chính bộ phận; cỡ lấy từ ảnh nhân vật (mục 5) |
| Nút tải của ChatGPT không ra file | lấy `blob:` của `<img>` cuối, bấm `<a download>` (01 §4) |
| Không đính kèm được ảnh ở `D:\Assets` | chép vào `D:\TikTok\.tmp\…` (thư mục session đọc được) rồi tải lên |
| Gộp nhiều ảnh trong một lượt → trình duyệt treo | một yêu cầu một lượt, chờ ~60 s |
| Ảnh ChatGPT 1254 px, khung Blender 1024 px | thu ảnh mẫu về đúng khổ khung trước khi đo (`khop-khuon` tự làm) |
| Khớp khuôn so cả bóng → lệch 6–9 px dù dáng gần đúng | bóng lưới phải tính như ảnh chụp (alpha nội suy ≥ 0,5, giữ cả vòng mặt ngoài); bỏ mép cắt tự do (giáp má, sống mũi trên), chỉ so mép mang dáng |
| Alpha có nhiễu mờ khắp ảnh | tách bộ phận theo ngưỡng alpha > 40 |
| Khớp tấm mũi rời "chuẩn hoá theo chính bộ phận" (`bo_phan.py khop-tach`, 2026-11-05): số đẹp (lệch 2,5–3,4 % H) nhưng mũi dựng **méo** — to phình, rủ xuống môi, nếp hai bên | chuẩn hoá theo bộ phận để cỡ trôi tự do → thanh dồn kịch 1,0 đuổi theo mũi ChatGPT vẽ rộng; chỗ ChatGPT cắt "gốc sống mũi" cũng không trùng gốc sống của lưới. Đã sửa bằng **tấm khuôn** (05 §6a, lời nhắc E): Blender chụp mũi rời của đầu chuẩn → ChatGPT sửa dáng trên khuôn → khớp khung cố định. Luôn xem ảnh dựng, đừng chỉ tin số |
