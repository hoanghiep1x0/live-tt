# Lời nhắc vẽ trang bị Sơn Hà Tiên Lộ — dùng được cho mọi AI vẽ ảnh

Kho trang bị chia **tông × phẩm**: mỗi tông, mỗi phẩm có 9 món = 3 binh khí + 3 giáp y + 3 bảo vật (biến thể a, b, c) —
đúng một popup chọn đồ trong game. Cùng ô cùng phẩm thì cùng chỉ số; binh khí cùng phẩm cùng loại nên dùng chung một
hình chiêu. Tên và mã: `../js/tang-bao.js` (`BIEN_THE`, mục `trang-bi`).

## Cách vẽ lại / vẽ thêm (ChatGPT, Gemini, Midjourney… đều được)

1. Gửi kèm ảnh mẫu: `mau-phong-cach.jpg` (icon gốc của game) và một tờ đã có cùng tông (vd `trang-bi-son/_to-1.png`).
2. Dán lời nhắc của tờ cần vẽ (bên dưới). Luôn nói rõ **"vẽ không nền" (draw without background)** — nói vậy thì AI mới trả
   ảnh nền trong suốt thật; chỉ nói "transparent background" hay bị vẽ ô caro giả. Mọi tờ là **ảnh vuông**.
3. Kiểm alpha góc ảnh: phải = 0. Nếu = 255 là ô caro giả → xin vẽ lại "REAL transparent PNG alpha, no checkerboard".
4. Cắt: `python cong-cu/cat-luoi.py <tờ.png> tranh-goc/trang-bi-<tông> anh/vp <tên…> 3x2` (tờ 3×3 thì bỏ `3x2`;
   dải chiêu thêm `1x5 --dai`). Có lớp mù xám mờ thì trước khi cắt hạ alpha ≤ 48 về 0 (xem các `_to-*.png` đã làm).
5. Nếu AI cứ trả nền caro giả: mở cuộc trò chuyện MỚI (chat dài hay bị lỗi này), luôn đòi ảnh vuông. Đồ không có quầng
   sáng thì cứu được: `cong-cu/tach-nen-caro.py` rồi `cong-cu/tach-caro-kin.py` (dọn caro kẹp trong lòng cung, lòng vòng).

## Tờ đã có

| Tờ | Lưới | Nội dung | Tên khi cắt |
|---|---|---|---|
| `trang-bi-<tông>/_to-1.png` | 3×3 | biến thể a, phẩm Phàm/Linh/Huyền (hàng = binh khí, giáp, bảo vật; cột = phẩm) | `B1,B2,B3,G1,G2,G3,V1,V2,V3` + `-son`/`-thuy` |
| `trang-bi-<tông>/_to-2.png` | 3×2 | biến thể a, phẩm Địa (hàng 1), Thiên (hàng 2); cột = binh khí, giáp, bảo vật | `B4,G4,V4,B5,G5,V5` |
| `trang-bi-<tông>/_to-bt-<phẩm>.png` | 3×2 | biến thể b (hàng 1), c (hàng 2) của một phẩm | `B1b,G1b,V1b,B1c,G1c,V1c` (đổi số phẩm) |
| `chieu-<tông>/_to.png` | 1×5 | vệt chiêu binh khí phẩm 1→5, bay trái → phải, đầu sáng bên phải, đuôi nối chuỗi | `B1-son-chieu`… |

## Giáp y: xiêm y tu tiên, riêng nam / nữ (thay bộ áo vải cũ)

Giáp y là trang phục mặc lên nhân vật nên vẽ theo **tông × giới × phẩm × biến thể** = 60 bộ, trong `giap-y/`
(`G<phẩm><''|b|c>-<son|thuy>-<nam|nu>.png`, tờ gốc `_to-<tông>-<giới>-<1|2>.png`). Gửi kèm tranh nhân vật cùng tông
(6 nhân vật nam + nữ ở 3 bậc, vd ghép `../anh/nv/son-c0,c4,c9` + `son-nu-c0,c4,c9`) và `mau-phong-cach.jpg`.
Tờ 1 = 3×3 (hàng Phàm / Linh / Huyền, cột a / b / c); tờ 2 = 3×2 (hàng Địa / Thiên). Vẽ bộ nam trước, rồi trong cùng
cuộc trò chuyện xin "bản nữ của đúng 9 (6) mẫu đó" để hai giới khớp nhau. Thủy Tông nhắc thêm cho chau chuốt hơn.

```text
Vẽ không nền. Draw it WITHOUT BACKGROUND (transparent PNG).
Image 1 = the <MOUNTAIN|WATER> SECT characters of my game (men left, women right). Image 2 = item icon style.
I need the ARMOR/COSTUME items for the <MALE|FEMALE> characters of this sect, so they must look like the gorgeous
costumes in image 1 — magnificent xianxia (tiên hiệp) robes in ancient Vietnamese Dong Son style: layered silk robes,
flowing sheer sashes and long sleeves, ornate gold Dong Son embroidery (flying Lac birds, 12-point sun star, triangle
and concentric-circle bands), belt plaque with sun star. <Sơn: brown, cream, jade-green, gold, mountain motifs |
Thủy: navy, royal blue, white, silver, aqua, waves and pearls>. Never plain or cheap-looking.
[Thủy thêm: even MORE refined and luxurious — many layered translucent glowing silk panels, silver filigree,
mother-of-pearl inlay, pearl strands and tassels, princely sea-court look.]
<Nam: broad shoulders, cross-collar robe, trousers / long robe panels | Nữ: fitted bodice and waist, long layered
flowing skirt, sheer sleeves>.
Each costume = the full outfit on an INVISIBLE mannequin, front view, shoulders to hem, NO head, NO hands, NO person,
NO lotus, NO halo. Shoulders and upper back kept clean (no cape over the shoulder blades) so wings can be attached later.
ONE SQUARE image (1:1), 3 columns × 3 rows, 9 equal cells, each centered with generous empty margin, all the same
size, glows kept inside their own cell. NO grid lines, NO text, NO background. No Chinese dragons, no Chinese characters.
Columns = 3 different designs of the same rank. Rows: COMMON (no aura) / UNCOMMON (soft green|teal aura) / RARE
(faint blue glow, robe-armor). [tờ 2: EPIC (purple aura) / LEGENDARY (radiant golden divine glow)]
Row 1: (a) … (b) … (c) …   — mô tả từng mẫu theo tên trong BIEN_THE (js/tang-bao.js).
```

## Thủy Tông: binh khí, bảo vật, chiêu bản chau chuốt (thay bản đầu)

Thủy Tông được vẽ lại sang trọng hơn Sơn (Thủy kém được yêu thích): bạc và vàng nhạt chạm lọng, xà cừ, ngọc trai, lụa
xanh nước trong phát sáng. Gửi kèm tờ giáp y Thủy (`giap-y/_to-thuy-nam-1.png`) làm mức sang trọng chuẩn. Tờ gốc:
`trang-bi-thuy/_to-binh-khi-1.png` (3×3, hàng Phàm/Linh/Huyền, cột a/b/c), `_to-binh-khi-2.png` (3×2, Địa/Thiên),
`_to-bao-vat-1.png`, `_to-bao-vat-2.png`; dải chiêu `chieu-thuy/_to.png`. Mở đầu lời nhắc:

```text
Vẽ không nền. Draw it WITHOUT BACKGROUND (transparent PNG).
Image 1 = the costumes of the WATER SECT in my game — this is the quality and luxury level I want. Image 2 = my game's
item icon style. Now make the WATER SECT <WEAPONS|TREASURES> to match those costumes: exquisite, refined, luminous —
silver and pale-gold metal with fine filigree, mother-of-pearl inlay, pearls and pearl tassels, translucent aqua/teal
glowing silk ribbons, wave engravings, Dong Son motifs (flying Lac birds, 12-point sun star). Never plain.
ONE SQUARE image (1:1), 3 columns × 3 rows … (weapons: diagonal, lower-left handle → upper-right tip)
```

Các phần lời nhắc dưới đây (b, c) là bản đầu; với Thủy Tông chỉ còn dùng làm mô tả món.

## Lời nhắc từng tờ biến thể b, c (binh khí, bảo vật — phần giáp y trong các tờ này đã thay bằng `giap-y/`)

### Sơn Tông · Pham — `trang-bi-son/_to-bt-1.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: MOUNTAIN SECT (Son Tinh): bows, axes, stone, bronze, green jade, pheasant feathers, earthy green/brown accents.
Quality: COMMON / plain: no aura, simple natural materials, light bronze accents.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) bow of woven rattan with a rattan-wrapped arrow; (2) tunic of pounded tree-bark cloth with a vine belt; (3) necklace of brown agarwood beads.
Row 2: (1) bamboo bow tied with rope knots and a stone-tipped arrow; (2) rough deer-hide vest with leather lacing; (3) bracelet of curved wild-boar tusks on a cord.
```

### Sơn Tông · Linh — `trang-bi-son/_to-bt-2.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: MOUNTAIN SECT (Son Tinh): bows, axes, stone, bronze, green jade, pheasant feathers, earthy green/brown accents.
Quality: UNCOMMON: soft green (Mountain) or teal (Water) aura, finer craft.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) buffalo-horn recurve bow with a bronze-tipped arrow; (2) mantle of iridescent green peacock feathers on woven cloth; (3) necklace of green jade beads with a bronze clasp.
Row 2: (1) dark ironwood bow with pheasant-feather fletched arrow; (2) highland brocade tunic with red-black geometric Dong Son patterns; (3) necklace of tiger fangs and bronze beads.
```

### Sơn Tông · Huyen — `trang-bi-son/_to-bt-3.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: MOUNTAIN SECT (Son Tinh): bows, axes, stone, bronze, green jade, pheasant feathers, earthy green/brown accents.
Quality: RARE: faint blue glow, ornate bronze.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) Dong Son boot-shaped bronze axe engraved with running deer, wooden haft; (2) buffalo-hide armor covered with bronze studs; (3) bronze bell with a deer-shaped handle.
Row 2: (1) double-bladed bronze axe with mountain-peak motifs; (2) armor of red-brown laterite stone scales with bronze edging; (3) cluster of green jade jingle bells on a cord.
```

### Sơn Tông · Dia — `trang-bi-son/_to-bt-4.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: MOUNTAIN SECT (Son Tinh): bows, axes, stone, bronze, green jade, pheasant feathers, earthy green/brown accents.
Quality: EPIC: purple aura, very ornate, gem inlays.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) bronze short dagger with an elephant-shaped hilt, jade eye; (2) bronze chest-plate armor engraved with deer, jade studs; (3) bronze bracelet hung with many tiny bronze bells.
Row 2: (1) bronze dagger whose hilt is two coiled snakes, jade inlay; (2) bronze armor with a three-peak mountain emblem and green jade; (3) bronze torque necklace with orange carnelian beads.
```

### Sơn Tông · Thien — `trang-bi-son/_to-bt-5.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: MOUNTAIN SECT (Son Tinh): bows, axes, stone, bronze, green jade, pheasant feathers, earthy green/brown accents.
Quality: LEGENDARY: golden divine glow, most magnificent.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) divine bronze-gold bow crackling with lightning over mountain motifs, glowing arrow; (2) celestial robe of cloud-like white-gold fabric with mountain embroidery; (3) large round green jade pendant carved with a Lac bird, gold rim.
Row 2: (1) divine bow with ivory elephant-tusk tips and nine-tusk motifs, glowing arrow; (2) golden mountain-god armor of stone and jade plates; (3) bronze-gold cuff with nine-tusked elephant motifs and jade.
```

### Thủy Tông · Pham — `trang-bi-thuy/_to-bt-1.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: WATER SECT (Thuy Tinh): javelins, tridents, fish scales, turtle shell, pearls, coral, seashells, teal/blue-green accents.
Quality: COMMON / plain: no aura, simple natural materials, light bronze accents.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) bamboo fishing gig with three small barbed bamboo prongs, cord binding; (2) tunic of braided dark-green seaweed and hemp cord; (3) necklace of small river-snail shells on a cord.
Row 2: (1) bamboo spear tipped with a sharpened conch-shell point, shell beads; (2) sleeveless vest of gray stingray skin with a rope belt; (3) bracelet of white fish vertebrae bones and blue beads.
```

### Thủy Tông · Linh — `trang-bi-thuy/_to-bt-2.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: WATER SECT (Thuy Tinh): javelins, tridents, fish scales, turtle shell, pearls, coral, seashells, teal/blue-green accents.
Quality: UNCOMMON: soft green (Mountain) or teal (Water) aura, finer craft.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) bronze javelin with a barbed fishhook-shaped tip; (2) vest of overlapping golden carp scales on woven cloth; (3) necklace of white pearls with a bronze clasp.
Row 2: (1) bronze javelin with green seaweed tassels; (2) mantle of white egret feathers; (3) necklace of shark teeth and teal beads.
```

### Thủy Tông · Huyen — `trang-bi-thuy/_to-bt-3.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: WATER SECT (Thuy Tinh): javelins, tridents, fish scales, turtle shell, pearls, coral, seashells, teal/blue-green accents.
Quality: RARE: faint blue glow, ornate bronze.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) silver-bronze trident with wave-curl prongs; (2) armor of red stone-crab shell plates; (3) conch-shell horn with a bronze mouthpiece on a cord.
Row 2: (1) two-pronged bronze fishing fork with Dong Son engravings; (2) armor of dark crocodile-scale plates with bronze rivets; (3) cluster of bronze bells shaped like clam shells.
```

### Thủy Tông · Dia — `trang-bi-thuy/_to-bt-4.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: WATER SECT (Thuy Tinh): javelins, tridents, fish scales, turtle shell, pearls, coral, seashells, teal/blue-green accents.
Quality: EPIC: purple aura, very ornate, gem inlays.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) bronze dagger with a crocodile-shaped hilt, pearl eye; (2) bronze armor of wave-patterned scale plates, pearl studs; (3) bronze bracelet set with black pearls.
Row 2: (1) bronze dagger with a wavy blade like rolling waves, coral inlay; (2) bronze armor shaped like a divine turtle shell; (3) red coral necklace with bronze beads and pearls.
```

### Thủy Tông · Thien — `trang-bi-thuy/_to-bt-5.png`

```text
Vẽ không nền. Painted fantasy game item icons, ancient Vietnamese Dong Son bronze culture (Hung Kings era): warm bronze/gold metal with engraved Dong Son patterns (concentric circles, 12-point star, flying Lac birds), soft rim light, rich detail. Match the attached reference icons exactly in style, size and painting quality.
Theme: WATER SECT (Thuy Tinh): javelins, tridents, fish scales, turtle shell, pearls, coral, seashells, teal/blue-green accents.
Quality: LEGENDARY: golden divine glow, most magnificent.

ONE SQUARE image (1:1), 3 columns x 2 rows, 6 equal cells. Columns: weapon, armor (garment shown on its own), treasure. Draw it WITHOUT BACKGROUND (vẽ không nền). Each item centered in its cell with generous empty margin, all items about the same size, nothing touching the cell edge, glows kept inside their own cell. NO grid lines, NO text, NO labels, NO frames, NO background, NO person. Truly transparent background (PNG RGBA, empty pixels alpha 0) - NOT a checkerboard painted into the pixels, no white, no gray haze. No Chinese dragons, no Chinese characters, no crossbow.
Row 1: (1) divine bronze-gold javelin wrapped by a surging water spiral, glowing tip; (2) celestial robe of flowing silver-blue water-like fabric with pearl strands; (3) giant glowing pearl held by a small golden turtle.
Row 2: (1) divine bronze-gold javelin with a golden turtle emblem and pearls; (2) gold-and-teal divine turtle-shell armor; (3) bronze-gold cuff with ocean-wave motifs and pearls.
```

## Lời nhắc dải chiêu (mẫu)

```text
SKILL EFFECTS for 5 weapons (same style). ONE SQUARE image (1:1), 5 horizontal bands of equal height. Each band = one
effect flying LEFT -> RIGHT: bright head on the right, a LONG trail stretching back to the left made of linked repeating
segments (a chain of echoes / afterimages) fading out toward the left, small impact burst at the head. Each effect spans
about 85% of the width, centered in its band, not touching other bands. NO person, NO text, NO grid lines, NO background.
Draw it WITHOUT BACKGROUND (vẽ không nền): transparent PNG, no checkerboard, no white, no gray haze.
Row 1..5: <mô tả vũ khí + vệt chiêu theo phẩm Phàm -> Thiên: plain / green-teal aura / blue glow / purple / gold divine>
```

## Chiêu thức công pháp (C1–C9 mỗi tông, 2026-11-22)

Bốn tờ, mỗi tông hai: **tấn công** 1×5 dải (C1 C4 C5 C8 C9, bay trái → phải) và **hỗ trợ** 2×2 (C2 C3 / C6 C7, hiện
quanh người, không phải đạn). Sơn Tông gửi kèm `cong-phap-son/_to.png` + `chieu-son/_to.png`; Thủy Tông mở cuộc trò
chuyện mới, gửi kèm `cong-phap-thuy/_to.png` + `chieu-cp-son/_to-tan-cong.png` (để cùng bố cục, chất lượng). Tờ hỗ trợ
xin ngay sau tờ tấn công trong cùng cuộc trò chuyện ("Perfect, exactly this quality…"). Kết quả, cách cắt, cách làm
ảnh động: `docs/phong/tu-tien/chieu-thuc.md`.

```text
Vẽ không nền. Draw it WITHOUT BACKGROUND (real transparent PNG, empty pixels alpha 0, NO checkerboard, no white, no
gray haze). Image 1 = the martial-art scroll icons of the <MOUNTAIN SECT (Son Tinh, archers) | WATER SECT (Thuy Tinh,
spear throwers, Dragon Palace)> in my game; image 2 = <my old weapon trail effects | the skill effects of the rival
MOUNTAIN SECT: match exactly that layout, size and painting quality>. Now I need the SKILL EFFECTS (chiêu thức) of 5
<archery | spear> techniques, to fly across a battlefield in my live game and later be animated by a video AI.
Style: painted premium xianxia game VFX, ancient Vietnamese Dong Son culture (12-point sun star, flying Lac birds),
<Sơn: warm bronze/gold, earthy brown, cream, jade-green | Thủy: EVEN MORE refined — silver and pale-gold filigree,
mother-of-pearl, pearls, translucent aqua/teal water, white foam, navy, royal blue>, glowing energy, crisp clean
silhouette. ONE SQUARE image (1:1), 5 horizontal bands of equal height, each band = ONE effect flying LEFT -> RIGHT:
bright head on the right, trail stretching back to the left fading out, about 85% of the width, centered in its
band, nothing touching other bands or the image edges, glows kept inside their own band. NO person, NO bow, NO hands,
NO text, NO grid lines, NO frames, NO background. No Chinese dragons (no horns, no whiskers), no Chinese characters.
Band 1 = … Band 5 = …   (mô tả từng chiêu: bảng §1 của chieu-thuc.md)
```

```text
Perfect, exactly this quality. Vẽ không nền. Draw it WITHOUT BACKGROUND (real transparent PNG alpha 0, NO
checkerboard). Now the 4 SUPPORT skills of the same <SECT>, same style, colors and painting quality. These are NOT
projectiles: each one is a magic effect that appears AROUND / IN FRONT OF the caster (the caster is NOT drawn), seen
from the front, symmetrical, centered, so a video AI can animate it later (glow pulse, rising particles, slow
rotation). ONE SQUARE image (1:1), 2 columns x 2 rows, 4 equal cells, each effect centered in its cell, about 80% of
the cell, generous empty margin, glows kept inside their own cell. NO person, NO hands, NO text, NO grid lines, NO
frames, NO background. Top-left = C2 … Top-right = C3 … Bottom-left = C6 … Bottom-right = C7 …
```
