---
name: chatgpt-bo-phan-3d
description: Dựng một kiểu bộ phận mặt (mũi, dáng mắt; sau này tai) cho thư viện bộ phận 3D của phòng sàn bar bằng ChatGPT Image + Blender, khớp 1:1. Dùng khi cần thêm/sửa một kiểu mũi (hếch, thẳng, gồ, tẹt…) hoặc kiểu mắt (xếch, hạnh nhân, tròn to, cụp, một mí…), khi nhờ ChatGPT vẽ hoặc sửa ảnh bộ phận để Blender dựng theo, hoặc khi cần các lời nhắc ChatGPT đã kiểm chứng cho việc này. Có quy trình từng bước, lệnh chạy trên hpc-station, lời nhắc mẫu, cổng kiểm tra và ngưỡng đạt.
---

# Dựng một kiểu bộ phận: ChatGPT sửa từng góc, Blender giữ khối 3D

Tài liệu gốc: `docs/phong/san-bar/nhan-vat/05-mo-rong.md` §6a và `08-chatgpt-blender.md`. Máy, thư mục, đồng bộ:
`01-chuan-bi.md` §2a (project `hpc-station:/mnt/D/dung-3d`). Script: `scripts/phong/san-bar/nhan-vat/bo_phan.py`.

## Nguyên tắc (vì sao làm thế này)

- **Blender là nguồn sự thật về hình khối.** ChatGPT vẽ mỗi góc như một ảnh 2D riêng → nhiều góc vẽ cùng lúc luôn mâu thuẫn
  1–2 mm. Đừng bắt ChatGPT tự nghĩ ra cả bộ góc; chỉ cho nó **sửa một góc trên ảnh Blender chụp**.
- **Hai góc chính để khớp: nghiêng 90° + chính diện** (như bản vẽ kỹ thuật — không chồng thông tin nên không mâu thuẫn).
  **45° và dưới-trước 45° chỉ để duyệt.**
- **Chỉ bộ phận, nền trong suốt, mép SẮC.** Ảnh mép mờ làm ChatGPT phóng to cả vùng.
- **Ép đối xứng** khi tinh chỉnh đỉnh (góc 45° chỉ thấy một bên — không ép thì số đẹp mà mũi lệch).
- Ngưỡng tính bằng **mm thật**, không bằng px.

## Quy trình một kiểu (ví dụ `<tên>` = `hech`, loại `nose`)

Phần Blender của mỗi bước đã gói trong **`scripts/phong/san-bar/mui-buoc.sh <tên> <bước>`** (Git Bash trên Windows): nó lấy
ảnh ChatGPT vừa tải ở `~/Downloads` (đúng tên `<tên>-a-90.png`, `<tên>-b-0.png`, `<tên>-c-45.png`, `<tên>-c-duoi45.png`),
đẩy lên hpc, khớp, chụp lại, in `CONG` / `MAT_LAT` / `KHOP`, và chép ảnh cần đính kèm về `D:\TikTok\.tmp\mui\<tên>\gui\`.
Sửa `bo_phan.py` ở repo rồi `scripts/phong/san-bar/hpc-dong-bo.sh script`.

0. **Khuôn** (đã có cho mũi: `assets/parts/nose/_khuon/khuon.json`; ảnh từng góc chép sẵn ở `D:\TikTok\.tmp\mui\_khuon\`).
   Loại bộ phận mới phải viết vùng riêng (như `nose_alpha`) rồi `bo_phan khuon <ra> --goc 0,90,45,duoi45 --tung --sac --R 1024`.
1. **A — nghiêng.** Cuộc trò chuyện ChatGPT **mới** cho mỗi kiểu; đính kèm `_khuon\90.png` → **P1**; lưu `<tên>-a-90.png`
   → `mui-buoc.sh <tên> a` (khớp nghiêng → `part-a.json`, chụp `gui/`).
2. **B — chính diện.** Đính kèm `gui\0.png` → **P2** → lưu `<tên>-b-0.png` → `mui-buoc.sh <tên> b` (khớp nghiêng + chính
   diện → `part-b.json`, chụp lại `gui/`).
3. **C — duyệt.** Đính kèm `gui\45.png` → **P3**, rồi `gui\duoi45.png` → **P3** (mỗi cái một lượt) → lưu `<tên>-c-45.png`,
   `<tên>-c-duoi45.png` → `mui-buoc.sh <tên> c` (đo ChatGPT còn sửa bao nhiêu, chốt `part.json`, chụp `dung/` + `mat/`, kéo về).
4. **Duyệt chưa đạt (> 0,5 mm)** → `GOC_THEM=45 mui-buoc.sh <tên> b2` (hoặc `duoi45`, hoặc `"45 duoi45"`): khớp lại có
   thêm góc đó. Vẫn > 0,5 mm → **vòng duyệt nữa**: chụp lại góc đó từ `part-b2.json`, gửi P3 lần 2 (`<tên>-c2-45.png`), khớp
   thêm, lặp. Mũi nhỏ thon 1,31 → 0,55 → 0,43 mm; đầu tròn 0,74 → 0,56 → 0,45 mm — **thường hội tụ ở vòng 3**. Đạt thì
   `cp part-bN.json part.json` rồi `mui-buoc.sh <tên> chot`.
5. **Xem bằng mắt** `mat/view_0.png` vùng chân mũi và `so-sanh.jpg` — đừng chỉ tin số. Thêm kiểu vào bảng
   `D:\Assets\parts\nose\_tong\bang.json` và ảnh tổng `_tong\bo-mau.jpg`.

## Cổng kiểm tra (đọc dòng `CONG`, `MAT_LAT`, `KHOP` trong log)

| Cổng | Đạt khi | Không đạt thì |
|---|---|---|
| Lệch khung ảnh ChatGPT so với ảnh gửi (`CONG`) | `iou ≥ 0,75`, lệch trên ≤ 4 %, lệch dưới ≤ 8 % | xin lại (thường do ảnh gửi có mép mờ, hoặc thiếu câu "no zoom") |
| Góc chính (0, 90) sau khớp (`KHOP`) | `lech_mep_mm ≤ 0,3` | thêm vòng `--tu-do`, xem `so-sanh-khuon.png` |
| Góc duyệt (45, duoi45): ChatGPT còn sửa bao nhiêu | `lech_mep_mm ≤ 0,5` | bước 4 (`b2`, vòng duyệt nữa) |
| **Mặt lật / gập** (`MAT_LAT`) | `lat = 0`, `gap ≤ 2` | lưới gập → vệt đen mảnh dưới lỗ mũi. `khop-khuon` đã tự **gỡ gập** (kéo độ dời quanh chỗ gập về hình thanh trượt); còn trượt thì khớp lại từ `part-a.json` |
| Mắt người | mũi đối xứng, không gồ, không nếp lạ, không vệt dưới lỗ mũi | như trên |

**Số lệch mép không bắt được lưới gập** (mũi gồ từng đạt 0,10–0,38 mm mà vẫn có vệt dưới lỗ mũi) — luôn đọc `MAT_LAT`.

Phép đo góc dưới-trước chỉ lấy **viền trên ở 60 % cột giữa** (chóp + cánh mũi nhìn từ dưới); hai bên và đáy ảnh là mép cắt
giáp má/môi do khuôn tự chọn, không mang dáng. Góc chính diện lấy hai mép trái/phải nửa dưới; 45° và 90° lấy mép phía đầu mũi.

**Bộ mẫu mũi (2026-11-05)** — `D:\Assets\parts\nose\<tên>\`, bảng `_tong\bang.json`, mm (nghiêng · chính diện · 45° · dưới-trước):
hếch 0,13 · 0,09 · 0,39 · 0,21 — thẳng 0,03 · 0,18 · 0,30 · 0,19 — cao 0,02 · 0,12 · 0,41 · 0,16 — tẹt 0,04 · 0,18 · 0,28 · 0,23 —
gồ 0,11 · 0,28 · 0,34 · 0,38 — nhỏ thon 0,03 · 0,19 · 0,43 · 0,22 — đầu tròn 0,06 · 0,07 · 0,45 · 0,30 — dài rủ 0,02 · 0,16 ·
0,45 · 0,46. Cả 8 kiểu: 0 mặt lật.

## Thao tác ChatGPT trong Chrome (Claude in Chrome)

- Đính kèm: file phải nằm trong thư mục session đọc được → chép vào `D:\TikTok\.tmp\…` trước; tìm ô `Attach photos`
  (input file ẩn) bằng `find`, tải bằng `file_upload`.
- Mỗi lượt **một** yêu cầu, chờ ~60 s (6 lần `wait 10`), cuộn xuống rồi mới lưu. Gộp nhiều yêu cầu trong một lô → trình duyệt treo.
- Lưu ảnh: nút tải của ChatGPT không ra file. Dùng JS lấy `<img>` cuối (naturalWidth > 500), `fetch(blob:)`, bấm `<a download>`
  → file vào `~/Downloads`, dời vào `D:\TikTok\.tmp\…` và `D:\Assets\parts\<loại>\<tên>\chatgpt\`.
- Ảnh ra 1254×1254. Đôi khi **mất alpha (RGB nền đen)** — `khop-khuon` tự tách nền theo màu góc, nhưng tốt nhất ghi rõ
  "keep the background TRANSPARENT (PNG alpha, not black)".

## Lời nhắc (tiếng Anh — ChatGPT theo sát hơn; thay phần <…>)

**P1 — sửa góc nghiêng** (đính kèm `90.png`, cuộc trò chuyện mới)
> Edit this image. It is an orthographic SIDE PROFILE render (90°, nose tip pointing LEFT) of a neutral human nose from my
> 3D software, isolated on a transparent background, used as a fixed reference camera. Reshape ONLY the nose into
> <KIỂU — PROFILE>. Keep EXACTLY: canvas size, camera angle and scale (no zoom), the top of the bridge at the same place,
> the back edge where the nose meets the cheek at the same place, the nostril base height about the same, lighting, skin
> texture, clean sharp outer edge, transparent background (PNG alpha, not black). Change the profile line only, clearly
> (the type must be recognisable) but naturally. Only the nose, nothing else.

**P2 — sửa chính diện** (đính kèm `gui/0.png`, cùng cuộc trò chuyện)
> Great, I built that profile in 3D. The attached image is the FRONT view (0°, orthographic) of my 3D nose now, same fixed
> camera, transparent background. Edit this front view so it fully matches the same <KIỂU> design: <KIỂU — FRONT>,
> symmetric left and right. It must stay consistent with the profile you made (tip height and nostril base height stay
> where they are). Keep EXACTLY: canvas size, camera and scale (no zoom), the top of the bridge at the same place, the
> outer cut edge where the nose meets the cheeks at the same place, lighting, skin, clean sharp outer edge, transparent
> background (PNG alpha, not black). Change clearly (the type must be recognisable) but naturally. Only the nose, nothing
> else.

**P3 — góc duyệt** (đính kèm `gui/45.png` hoặc `gui/duoi45.png`; vòng duyệt sau mở đầu bằng "Updated again from your last
45° correction. Attached: the new … check view …")
> I updated the 3D nose from your front view. The attached image is a CHECK view: <THREE-QUARTER 45° (tip pointing left) |
> seen from BELOW-FRONT at 45° (camera under the nose looking up and back, nose tip at the top, both nostrils visible)>,
> orthographic, same nose. Compare it to the <KIỂU> design you drew (profile + front); it must stay consistent with your
> front and profile views. If something is off for this angle,
> edit this image to correct it; if it already matches, change as little as possible. Keep EXACTLY: canvas size, camera and
> scale, the top of the bridge and the outer cut edges at the same place, lighting, skin, clean sharp edge, and keep the
> background TRANSPARENT (PNG alpha, not black). Only the nose.

## Mô tả kiểu mũi (điền vào <KIỂU — PROFILE> / <KIỂU — FRONT>)

| Kiểu (`<tên>`) | PROFILE | FRONT |
|---|---|---|
| `hech` (đã làm) | an UPTURNED nose: tip rotated upward (nostril opening visible from the side), short slightly concave bridge, softly rounded tip, a bit shorter columella | softly rounded tip, nostrils slightly visible from the front, alar wings and tip width natural for this nose |
| `thang` | a STRAIGHT nose: straight bridge line from root to tip, tip neither raised nor drooping, defined tip | straight narrow bridge, medium alar width, defined tip, nostrils hidden from the front |
| `cao` | a HIGH-BRIDGED nose: tall straight bridge projecting further from the face, defined tip | narrow tall bridge with clear side walls, slim tip, narrow alar base |
| `tet` | a FLAT LOW-BRIDGED nose: low shallow bridge close to the face, short projection, rounded tip | wide soft bridge, wide alar base, broad rounded tip |
| `gu` | a ROMAN / AQUILINE nose: visible hump in the middle of the bridge, tip slightly downward | straight bridge with a slight widening at the hump, medium alar width |
| `nho-thon` | a SMALL SLIM nose: short bridge, small refined slightly upturned tip | narrow bridge, narrow alar base, small tip |
| `dau-tron` | a BULBOUS-TIP nose: straight bridge, large rounded fleshy tip | normal bridge, wide round tip, medium-wide alar wings |
| `dai-ru` | a LONG nose with DROOPING tip: long bridge, tip pointing slightly downward, columella hidden | long narrow bridge, tip lower, nostrils hidden from the front |

Thêm kiểu mới: thêm một dòng vào bảng này + bảng thư viện ở 05 §6, và **xếp giới** (nữ / nam / cả hai) vào
`D:\Assets\parts\phan-loai.json` + trường `"gioi"` của `part.json` (bảng phân loại ở 05 §6a).

Ghi chú về độ đa dạng: với lời nhắc "clearly but naturally", hếch, tẹt, gồ, dài rủ khác nhau rõ; thẳng, cao, nhỏ thon, đầu
tròn còn gần nhau khi nhìn nghiêng. Muốn khác hơn thì tả đặc điểm mạnh hơn trong cột PROFILE (vd. cao: "bridge clearly
higher and projecting further than average"), giữ nguyên các câu khoá khung.

## Mắt (`eyeshape`) — khác mũi ở đâu

Dáng mắt nằm ở **khe mở mí** (viền mí trên + mí dưới + hai khoé), không ở mép bóng vùng như mũi. Lệnh: `bo_phan khop-mat`
(thay `khop-khuon`); script từng bước **`scripts/phong/san-bar/mat-buoc.sh <tên> a|b|c|lai|b2|chot`**; ảnh gửi ChatGPT ở
`D:\TikTok\.tmp\mat\<tên>\gui\`, lưu ở `D:\Assets\parts\eyeshape\<tên>\`.

- **Khuôn** `assets/parts/eyeshape/_khuon/` (`bo_phan khuon <ra> --loai eyes --goc 0,45,90 --tung --sac --R 1024`): **một mắt**
  (mắt +X — bên phải ảnh chính diện, khoé trong bên trái cạnh mũi), không mi, không mày; vùng = đỉnh thanh `l-eye-*` dời (bỏ
  `trans-`, `scale-`), cắt elip quanh nhãn cầu, **bỏ mặt trong hốc mắt** (đỉnh không nhìn thấy từ hướng nào phía trước — nếu
  không, góc 45/90 lộ mảng đỏ), bỏ lưới phụ helper; nhãn cầu chỉ giữ mặt nằm trọn trong bóng da ở cả 3 góc.
- **Nhãn cầu màu khuôn**: lòng trắng · tròng **xanh lam phẳng** · con ngươi đen — để tách khe trên ảnh ChatGPT theo màu (học màu
  trên chính khuôn, khe Blender = chỗ nhãn cầu gần camera hơn da). Tròng nâu thật lẫn với bóng nâu khoé mắt → sai 110 px².
  Màu tròng thật là thư viện riêng `parts\eyes`.
- **Thứ tự góc**: A chính diện (P1) → B 45° (P2) → C nghiêng 90° (P3, duyệt). Thanh `l-eye-*` khớp một bên rồi **soi gương**
  sang `r-eye-*`; tinh chỉnh đỉnh cũng soi gương (`dinh` có cả hai bên).
- **Bước B gồm 3 việc**: thanh trượt (phạt mặt gập nặng — kéo `height*-decr` quá tay làm mí sụp gập), **nắn đỉnh mép mí**
  (`--tu-do 10 --mu 2`, thanh thường dừng ở 0,3–0,8 mm), **gỡ gập** nhẹ tay (chỉ quanh chỗ gập, 15 vòng đầu chỉ làm trơn —
  co mạnh thì mất hết phần nắn: 0,2 → 0,5 mm).
- **Góc nghiêng 90° chỉ để báo cáo, không chặn**: ở góc này ChatGPT luôn vẽ khe hở sâu về đuôi mắt hơn khối 3D (0,3–2,4 mm ở
  mọi kiểu, hai vòng duyệt không giảm; thêm góc 90 vào khớp hay nắn đỉnh theo nó đều làm lưới gập). Khe nghiêng chỉ là một
  vệt mảnh, nhìn trên cả đầu không thấy khác.
- Ngưỡng: chính diện, 45° ≤ 0,3 mm; 0 mặt lật; tự thử (khớp chính khuôn) cho 0,13 · 0,06 · 0,03 mm — sàn nhiễu ~0,1 mm.
- ChatGPT từng **từ chối** lời nhắc góc nghiêng dài ("guardrails… fraudulent") — dùng lời nhắc P3 ngắn bên dưới (mở đầu
  "3D modelling reference for a stylised character").

**P1 mắt — chính diện** (đính kèm `_khuon\0.png`, cuộc trò chuyện mới)
> Image edit. Attached: a single human eye cut out on a transparent background — straight front view, orthographic, no
> eyelashes, no eyebrow (the inner corner is on the left, next to the nose). Redraw it as <KIỂU MẮT>. Keep exactly: the
> canvas size and framing (no zoom, no shift, no crop), the outer cut edge of the skin patch at the same place, the eyeball
> position and size, the iris colour (flat bright blue) and black pupil, the lighting, skin colour and texture, clean sharp
> outer edge, transparent background (PNG alpha, not black). Change only the shape of the eyelid opening (upper and lower
> lid margins and the two corners), clearly (the type must be recognisable) but naturally. No eyelashes, no eyebrow, no
> makeup. Only this eye, nothing else.

**P2 mắt — 45°** (đính kèm `gui\45.png`, cùng cuộc trò chuyện)
> Image edit. Attached: the same eye rebuilt in 3D from your front view, now seen from 45 degrees to the side
> (orthographic, the outer corner is on the right). Redraw it so it matches the <TÊN KIỂU> eye design you drew; it must
> stay consistent with your front view. Keep exactly: [như P1 từ "the canvas size…" đến "not black"]. Change only the
> eyelid opening (lid margins and corners) where needed for this angle. No eyelashes, no eyebrow, no makeup. Only this eye,
> nothing else.

**P3 mắt — nghiêng (duyệt)** (đính kèm `gui\90.png`)
> 3D modelling reference for a stylised character, image edit: this is the same eye as before, side view (profile, face
> pointing left). Adjust the eyelid opening so it matches the <tên kiểu> eye you drew, consistent with your front and 45
> degree images; if it already matches, return it unchanged. Same canvas, same framing, same skin patch outline, same blue
> iris, transparent background. Only the eye.

| Kiểu (`<tên>`) | <KIỂU MẮT> |
|---|---|
| `xech` | an UPTURNED CAT-EYE shape: the outer corner clearly higher than the inner corner, the lower lid margin rising toward the outer corner, almond opening tapering to a lifted point at the outer corner |
| `hanh-nhan` | a classic ALMOND eye: the opening clearly wider than tall, both corners gently pointed, the outer corner level with the inner corner, the upper lid arc highest slightly toward the inner side, the lower lid a shallow smooth curve, the lids just touching the top and bottom of the iris |
| `tron-to` | a ROUND, OPEN eye: the opening rounder and somewhat taller than now, the upper lid a smooth round arch that just touches the top edge of the iris, the lower lid a rounder curve that sits slightly below the iris so a thin line of white shows under it, the corners softly rounded. Moderate, believable change — the lids must still wrap the eyeball naturally, do not open the eye wider than the eyeball. (Bản cũ "white above and below the iris" làm ChatGPT mở khe quá nhãn cầu → Blender lộ viền trong mí, 0,6 mm. Còn > 0,3 ở 45° thì thêm một vòng 45°: gửi `gui\45.png` mới, "Updated again from your last 45 degree correction…", khớp lại 0 + ảnh 45° mới.) |
| `cup` | a DOWNTURNED eye: the outer corner (right) clearly lower than the inner corner, the upper lid sloping down toward the outer corner, the lower lid dipping at the outer end, a soft gentle look |
| `hep-dai` | a NARROW, LONG eye: the opening clearly longer horizontally and clearly narrower vertically, the upper lid low and flat covering the top part of the iris, the lower lid flat covering the bottom edge of the iris, both corners extended and sharply pointed, the corners level |
| `mot-mi` | an East Asian MONOLID eye: a smooth upper lid with no visible crease, the opening narrower in height, the upper lid covering the top part of the iris, the inner corner (left) partly covered by a soft epicanthic fold so it looks rounded and hidden, the outer corner slightly higher than the inner corner (P1 đổi câu cuối thành "Change only the eyelid shape and opening") |
| `nho` | a SMALL eye: the opening clearly shorter from corner to corner and smaller overall, the two corners moved closer to the iris, the upper and lower lids covering a little of the top and bottom of the iris, a compact oval opening |
| `phuong` | a PHOENIX eye: a long slim opening, the outer corner (right) lifted and tapering into a long fine point, the inner corner (left) sharply pointed and angled slightly downward, the upper lid a long low sweeping line, the lower lid fairly straight |
