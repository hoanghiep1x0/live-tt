# Cơ chế quà — Sơn Hà Tiên Lộ

> Trạng thái: **đợt 1 đã làm** (2026-11-19) — thang 5 bậc (`bacQua`, `tacDungBac`), combo, biển quà có ảnh thật
> (`QuaBien.tsx`), thẻ Cung Phụng (thẻ nổi phải lúc tu luyện, xoay cùng Bảng Tu Vi / Lịch trình), cứu viện boss và
> tử chiến PK (`buocQuaGap`). Riêng tu luyện bậc 3 (cận cảnh nhỏ) dùng biển quà giữa màn; rương là đợt 3. Đợt 2, 3 chờ.

Mục tiêu: người xem **muốn tặng**, vì quà thấy ngay kết quả trên màn, có tên mình to, giúp tông thắng. Người không
tặng vẫn chơi và lên cấp được, chỉ chậm hơn. Dữ liệu quà thật: `client/shared/qua-tiktok/` (775 quà, có ảnh).

## 1. Hiện có (để khỏi làm lại)

| Ở đâu | Quà làm gì bây giờ |
|---|---|
| Mọi màn | 1 xu = 1 linh thạch; cộng trận lực tông (`boiTran`); câu sử thi "X dâng hương" |
| Tu luyện | +2 linh khí/xu bản thân; truyền công: đệ tử phía dưới +1 linh khí / 2 xu (tối đa 12 người) |
| Đánh boss | kết ngay trận pháp theo căn cơ người tặng; tính vào bảng quà boss |
| Đại Chiến | dưới 10 xu Bạo Kích · 10 xu Liên Kích ×3 · 50 xu Trận Pháp · 200 xu Tuyệt Kỹ |

**Thiếu:**
- quà chỉ là con số, không có ảnh và tên quà trên màn;
- không có lý do để tặng quà lớn hơn 200 xu;
- không có danh hiệu theo buổi hay tích lũy;
- không có lúc "cần quà gấp" (cứu boss, lật kèo PK).

## 2. Năm nguyên tắc moi xèng (học từ các live tương tác)

1. **Thấy ngay:** tặng xong trong 1 giây phải có hiệu ứng, kèm **ảnh quà thật + tên người** chữ to.
2. **Tên tuổi:** người tặng nhiều được ngồi cao, có danh hiệu, khung tên riêng; người khác nhìn thấy cả buổi.
3. **Phe phái:** quà giúp **cả tông**. Thua thì người cùng tông thấy mình "phải góp".
4. **Gấp:** có đếm ngược, ví dụ "boss sắp thắng / PK sắp thua / sự kiện quà ×2 còn 30 giây".
5. **Sưu tầm:** quà lớn cho đồ để đời (thú cưỡi, trang phục, danh hiệu) chứ không chỉ là số.

## 3. Thang quà 5 bậc — cùng một quà, mỗi màn một tác dụng

| Bậc | Xu | Ví dụ quà | Tu luyện | Đánh boss | Đại Chiến |
|---|---|---|---|---|---|
| 1 Hương Khói | 1–9 | Rose, GG, Finger Heart | linh khí như cũ | **hồi máu** cho mình + 1 người yếu nhất tông | Bạo Kích |
| 2 Linh Đan | 10–99 | Rosa, Perfume, Doughnut | thêm **truyền công** cho đệ tử phía dưới | kết trận pháp | Liên Kích ×3 |
| 3 Pháp Bảo | 100–499 | Hand Heart, Corgi, Forever Rosa | **cận cảnh nhỏ** 3 giây + rương (§5) | **đòn chí mạng** ×5 công | Trận Pháp cả tông |
| 4 Thần Thông | 500–2.999 | Money Gun, Galaxy, Wedding | **Mưa Linh Thạch**: cả phòng mỗi người +1–3 linh thạch, ghi tên người tặng | **phá Cuồng Bạo** ngay | Tuyệt Kỹ |
| 5 Thiên Đạo | 3.000+ | Meteor Shower, Lion, TikTok Universe | **cận cảnh cả khung** + danh hiệu cả buổi | boss mất 15% máu | **Thần Thú Đạp Trận** của tông mình, đổi cục diện |

## 4. Quà chữ ký — một số quà có tác dụng riêng để người xem nhớ

| Quà TikTok (xu) | Tên trong game | Tác dụng riêng (ngoài tác dụng theo bậc) |
|---|---|---|
| Rose (1) | Linh Hoa | tim của quà: hồi 5% máu khi đánh boss |
| Finger Heart (5) | Kết Ấn | tự hô trận pháp **Thủ** cho tông (như gõ 2) |
| Rosa (10) | Hồng Liên Đan | +1 Tụ Khí Đan (như gõ 3, không tốn linh thạch) |
| Doughnut (30) | Linh Thực | linh thú của mình +1 cấp thân mật (sau khi có linh thú) |
| Hand Heart (100) | Song Tu | mình và người đứng ngay trên/dưới cùng +20 linh khí |
| Money Gun (500) | Mưa Linh Thạch | như bậc 4, hiệu ứng mưa đá quý bay khắp màn |
| Meteor Shower (3.000) | Thiên Thạch Giáng Thế | chiêu Sơn Băng Địa Liệt bản lớn bất kể tông (Thủy Tông ra băng) |
| Lion (29.999) | Thần Thú Hộ Sơn | gọi thần thú tông bay qua cả khung, cả tông ×2 linh khí 5 phút |

Nhận quà theo **tên quà** TikTok gửi (`gift` trong sự kiện quà, khớp `ten` trong `danh-sach.json`). Nên thêm
`giftId` vào sự kiện (`backend/cau-noi/src/map.ts`) để khỏi lệ thuộc ngôn ngữ của tên.

## 5. Hệ thống giữ người tặng quay lại

| Hệ thống | Cách chạy | Cho gì | Lưu sổ |
|---|---|---|---|
| **Cung Phụng** (theo buổi) | top 3 tổng xu buổi này | thẻ trên phải luôn hiện (như live mẫu); top 1 ngồi **ngai Cung Phụng** cạnh Chưởng Môn, tên vàng | không |
| **Tiên Duyên** (tích lũy, 9 bậc) | tổng xu mọi buổi: 10 / 50 / 200 / 500 / 1k / 3k / 10k / 30k / 100k | khung tên, vòng hào quang, danh hiệu; +1%…+9% linh khí (nhỏ, không vượt cảnh giới) | có (khoá mới) |
| **Hương Hỏa Tông** (theo năm = giờ) | tổng xu của mỗi tông trong năm | tông thắng: +10% linh khí cả năm sau, cờ tông trên nền | không |
| **Rương Bảo** | quà ≥ 100 xu mở 1 rương | 70% đan / linh thạch, 25% trang bị, 5% trang phục hiếm; tỉ lệ ghi rõ | đồ: có |
| **Combo** | tặng liên tiếp cùng một quà | số combo ×N to dần cạnh ảnh quà; ×10, ×50, ×100 thêm thưởng | không |

## 6. Khoảnh khắc "cần quà gấp" (đếm ngược trên màn)

- **Cứu viện boss:** máu tông còn dưới 25% → biển đỏ "Tông nguy! Tặng quà cứu viện · 20 giây"; quà lúc này hồi máu ×2.
- **Tử chiến PK:** trận khí bên thua dưới 20% → "Tử Chiến · quà ×2 điểm · 30 giây". Bên kia thấy cũng phải tặng giữ thế.
- **Giờ Hồng Phúc** (theo lịch, ví dụ :40): 3 phút quà ×2 linh thạch, báo trước 1 phút.
- **Đột phá hộ:** người sắp độ kiếp thất bại → "Tặng quà hộ pháp cho X" → quà = một lượt hộ pháp chắc chắn.

## 7. Hiển thị

- **Biển quà**: ảnh quà thật (từ `qua-tiktok/anh/<id>.webp`) + tên người + tên trong game. Bậc 1–2 hiện góc nhỏ,
  bậc 3 hiện giữa 3 giây, bậc 4–5 cận cảnh. Nhiều quà một lúc: gộp, ưu tiên quà to.
- **Bảng "Quà tặng quy đổi"** (thẻ trái lúc tu luyện) đổi sang ảnh quà thật: 4 dòng = 4 quà chữ ký rẻ nhất.
- **Thẻ Cung Phụng** góc trên phải, như live mẫu.

## 8. Giữ cân bằng

- Neo **1 xu = 1 linh thạch** như cũ (§3b Bản đồ). Lực chiến từ quà không vượt mức cảnh giới (§3c).
- Người không tặng: vẫn có gõ số, câu đố, sự kiện miễn phí (Cơ Duyên). Quà chỉ giúp nhanh hơn, oai hơn.
- Không hứa hẹn tiền thật, không đổi đồ game ra tiền. Rương ghi rõ tỉ lệ.

## 9. Lộ trình đề xuất

| Đợt | Làm gì | Vì sao trước |
|---|---|---|
| 1 | Biển quà có ảnh + combo · thẻ Cung Phụng · thang 5 bậc · cứu viện boss / tử chiến PK | thấy tiền ngay, ít đụng lưu sổ |
| 2 | Quà chữ ký (8 món) · Hương Hỏa Tông theo năm · bảng quy đổi ảnh thật | nhận diện quà, cạnh tranh tông |
| 3 | Tiên Duyên tích lũy (lưu sổ) · Rương Bảo · Giờ Hồng Phúc · Đột phá hộ | giữ người tặng lâu dài |

Cần kiểm tra trước đợt 1: tên quà trong sự kiện live thật có đúng tên tiếng Anh như danh sách không (nếu không thì
thêm `giftId`).
