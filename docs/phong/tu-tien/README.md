# Loại phòng: Live Tu Tiên (`tu-tien`)

Phòng live dạng game nhập vai chơi bằng bình luận: người xem chọn phe, trả lời câu đố để tích linh khí, đột phá
cảnh giới, cùng phe kéo co, cùng cả phòng đánh yêu tinh. Không tải app, không đăng ký — gõ một chữ là vào chơi.
Tu vi lưu bền qua các buổi live, nên người xem có lý do quay lại.

Mỗi **kiểu** là một thế giới khác trên cùng cách chơi đó.

**Trạng thái: bản đầu ở `client/designs/tu-tien-son-ha/`, đã chạy bản chơi thử, chưa thử trên phiên thật.**

## Các kiểu

| Kiểu (`style`) | Thiết kế | Bối cảnh | Đặc tả |
|---|---|---|---|
| `son-ha` | `client/designs/tu-tien-son-ha/` | Sơn Hà Tiên Lộ: thần thoại Lạc Việt, Sơn Tinh đấu Thủy Tinh, ba yêu Lạc Long Quân từng trấn sống lại | [son-ha.md](son-ha.md) |

## So với game tu tiên bình luận đang có trên TikTok

Ý tưởng gốc (chọn phe, câu đố mỗi phút, cảnh giới, kéo co, boss) là thể loại chung. Phòng này khác ở chỗ:

| Chỗ | Game thường thấy | Sơn Hà Tiên Lộ |
|---|---|---|
| Bối cảnh | Tiên hiệp Trung Hoa chung chung, chính đạo đấu ma đạo | Thần thoại Việt ai cũng thuộc từ bé: Sơn Tinh, Thủy Tinh, Hồ Tinh, Ngư Tinh, Mộc Tinh. Hai phe đều có lý, không phe nào là "ác" |
| Kéo co | Thanh điểm | Cả màn hình là chiến trường: nước dâng ngập chân núi hay núi mọc cao lên — "nước dâng bao nhiêu, núi cao bấy nhiêu" thành chính luật chơi |
| Độ kiếp | Một mình trả lời câu khó | Cả phòng gõ **độ** để hộ pháp: trả lời sai vẫn sống nếu đủ người che chở. Người mới cũng có việc để làm khi đại lão độ kiếp |
| Câu đố | Câu hỏi khô | Câu đố dân gian, ca dao, truyền thuyết, sử Việt — đúng bối cảnh, MC đọc to |
| Người mới | Phải tự gõ tên phe | Gõ bất cứ gì là được xếp vào phe đang ít người, chơi ngay |
| Lệnh | Gần 100 lệnh | 5 lệnh: **núi / nước**, **A B C**, **đánh**, **độ**, **tôi** |
| Quà | Thường đổi sức mạnh | Chỉ là hương hỏa: đèn trời bay lên, bảng Hương Hỏa riêng. Không mua được thắng thua |
| Kịch bản | Thông báo hệ thống | Mỗi việc trên sân thành một dòng **sử thi** có tên người chơi; tổ MC hai phe cà khịa nhau |

## Thiết kế và tài liệu

| Phần | Ở đâu |
|---|---|
| Thiết kế | `client/designs/tu-tien-son-ha/` — lõi thuần ở `src/loi/`, vẽ cảnh ở `src/ve/` |
| Test | `tests/client/designs/tu-tien-son-ha/` |
| Lời dặn MC | `client/designs/tu-tien-son-ha/mc-dan.md` |
