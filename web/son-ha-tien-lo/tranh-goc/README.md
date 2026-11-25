# Tranh gốc vật phẩm & con vật — để đưa vào game, làm ảnh động

Vẽ bằng ChatGPT Image (2026-11-19), gửi kèm tranh game làm mẫu (`assets/do/`, `assets/than-thu/`). Mọi tấm **nền trong
suốt thật** (PNG alpha). Bản thu nhỏ cho web ở `../anh/vp/`.

| Thư mục | Nội dung | Cỡ |
|---|---|---|
| `dan-son/`, `dan-thuy/` | Đan dược D1–D9 mỗi tông một bộ (Sơn: đồng, ngọc bích, lá sen; Thủy: vỏ sò, ngọc trai, san hô). `_to.png` là tờ 3×3 gốc | 512×512 mỗi món |
| `cong-phap-son/`, `cong-phap-thuy/` | Bí kíp công pháp C1–C9 (Sơn: cung tên; Thủy: lao) | 512×512 |
| `trang-bi-son/`, `trang-bi-thuy/` | Kho trang bị theo **tông × phẩm**: mỗi phẩm 9 món = binh khí `B`, giáp y `G`, bảo vật `V` × biến thể a (`B1`), b (`B1b`), c (`B1c`); số 1–5 = Phàm → Thiên (Sơn: cung, rìu, đá, lông trĩ, ngọc bích; Thủy: lao, đinh ba, vảy cá, mai rùa, ngọc trai, san hô). Tờ lưới gốc `_to-*.png` giữ lại để cắt / vẽ lại. Binh khí, bảo vật Thủy Tông đã vẽ lại bản chau chuốt: `trang-bi-thuy/_to-binh-khi-1|2.png`, `_to-bao-vat-1|2.png` (các tờ `_to-1`, `_to-2`, `_to-bt-*` của Thủy là bản đầu, không dùng nữa). Mã là của trang truyện — game chưa có mã gõ, đang dùng chung tên `TEN_DO` | 512×512 |
| `giap-y/` | **Giáp y = xiêm y tu tiên riêng nam / nữ** theo tông: `G<phẩm><''|b|c>-<son|thuy>-<nam|nu>.png` (60 bộ), dáng trên ma-nơ-canh vô hình, nhìn thẳng, lưng gọn để sau lắp cánh. Tờ gốc `_to-<tông>-<giới>-<1|2>.png`. Giáp trong các tờ `trang-bi-*/_to-*.png` là bản áo vải cũ, không dùng nữa | 512×512 |
| `chieu-son/`, `chieu-thuy/` | Vệt chiêu binh khí theo phẩm (`B1-son-chieu` … `B5-thuy-chieu`), bay **trái → phải**, đầu sáng bên phải, đuôi là chuỗi nối đuôi mờ dần — để làm hiệu ứng ném / ra chiêu tới đích trong game; biến thể b, c cùng phẩm dùng chung | giữ cỡ vẽ (~1250×300) |
| `chieu-cp-son/`, `chieu-cp-thuy/`, `chieu-cp/` | **Chiêu thức công pháp** C1–C9 mỗi tông (2026-11-22): chiêu bay C1 C4 C5 C8 C9 (dải dài, bay trái → phải) và chiêu quanh người C2 C3 C6 C7 (vuông). `nen-xam/` = cùng tranh trên nền xám phẳng cho AI video; `chieu-cp/chieu.json` = tên, cỡ, điểm neo, lời tả chuyển động; `chieu-cp/bang-chieu.jpg` = bảng xem. Làm bằng `cong-cu/chieu-cp.py`; hồ sơ đầy đủ `docs/phong/tu-tien/chieu-thuc.md` | gốc ~1300×330 / ~640² |
| `thu/` | Con vật đứng nghiêng, **quay sang phải**, chân / cánh / vây tách rõ để rig: `ga-chin-cua`, `chim-lac`, `thuong-luong`, `ca-chep-vang`, `ca-chep-hoa-rong`; thú cưỡi có yên: `cuoi-voi`, `cuoi-ngua`, `cuoi-giao`, `cuoi-rua` | giữ cỡ gốc (~1100–1600 px) |

Voi Chín Ngà, Ngựa Chín Hồng Mao, Giao Long, Rùa Thần (không yên) đã có sẵn ở `client/designs/tu-tien-son-ha/assets/than-thu/`.
Linh thú P9 chưa vẽ (game đang đặt Kỳ Lân, Kinh Thư cấm kỳ lân — chờ quyết tên).

**Lời nhắc vẽ từng tờ (dùng cho mọi AI vẽ ảnh): [`LOI-NHAC-TRANG-BI.md`](LOI-NHAC-TRANG-BI.md)**; ảnh mẫu phong cách: `mau-phong-cach.jpg`.

Cắt tờ 3×3: `python cong-cu/cat-luoi.py <tờ.png> <thư mục gốc> ../anh/vp <tên1,…,tên9>`; tờ lưới khác thêm `CỘTxHÀNG`, vd `3x2` với 6 tên; dải chiêu `1x5 --dai` (giữ tỉ lệ dài).
Lưu con vật: `python cong-cu/luu-thu.py <ảnh.png> <tên>`, ảnh vuông cho bảng: `python cong-cu/vuong-icon.py <gốc.png> <mã>`.
Luôn bảo AI **"vẽ không nền"** (draw without background) — nói vậy mới ra nền trong suốt thật. Nếu vẫn trả nền ô caro
GIẢ (kiểm alpha góc ảnh = 255) thì xin vẽ lại "vẽ không nền, no checkerboard" (cách cứu tạm: `cong-cu/tach-nen-caro.py`, nhưng hào quang vẫn dính caro).
