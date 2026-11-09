# Loại phòng: Live Đại Chiến (`dai-chien`)

Phòng live dạng game giải đấu: ai vào phòng cũng thành trứng mang avatar của mình, thả tim để nở thành nhân vật, các nhân vật tự đánh nhau trên map ngẫu nhiên,
người xem gõ lệnh ngắn để chạy, đuổi, quay lại đánh. Hết phiên (thời lượng do người live đặt) tìm ra một quán quân. Mỗi **kiểu** là một thế giới khác trên cùng cách chơi đó.

**Trạng thái: đang nghiên cứu, chưa có mã.**

**Sổ luật:** [luat.md](luat.md) ghi các luật đã chốt, tách lớp lõi và lớp thế giới để sau này đổi game dễ.

## Các kiểu

| Kiểu (`style`) | Thiết kế (dự kiến) | Bối cảnh | Đặc tả |
|---|---|---|---|
| `thap-den` | `client/designs/dai-chien-thap-den/` | Tháp Đèn Trời: thả tim là thắp lửa, trứng lửa nở thành chiến binh, tranh ngôi Người Giữ Đèn | [thap-den.md](thap-den.md) |

## Thiết kế và module (dự kiến)

| Phần | Ở đâu | Làm gì |
|---|---|---|
| **Thiết kế** `dai-chien-thap-den` | `client/designs/dai-chien-thap-den/` | Khung 1080×1920, map three.js, nhân vật ảnh, Bảng Phòng |
| **Module** `dai-chien` | `client/modules/dai-chien/` | Luật chơi thuần, gói map, hồ sơ giải đấu, phần vẽ, lời MC |

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Kịch bản giải đấu, luật, map, bộ nhân vật ([thap-den.md](thap-den.md)) | **bản nháp**, đã trao đổi với chủ kênh, còn vài điểm chốt |
| Đo độ trễ, đợt tim, vùng che của TikTok | chưa làm |
| Thử MimicMotion với động tác đánh | chưa làm |
| Đọc quy định TikTok về quà đổi lợi thế và kết quả ngẫu nhiên | chưa làm |
| Mã | chưa làm |

Bản chơi thử: [live-dai-chien.html](live-dai-chien.html). Trang tải ảnh trong `nhan-vat/` nên cần mở qua máy chủ tĩnh, ví dụ `python -m http.server` trong thư mục này. Phím P để dừng hình và chỉ chỗ cần sửa.
