# Luật Live Đại Chiến

Sổ luật chốt từ các trao đổi với chủ kênh. Sổ này chỉ ghi **luật**, không ghi lời văn; chi tiết và ví dụ tính tay ở [thap-den.md](thap-den.md).

Mỗi luật có mã để gọi tên khi trao đổi. Đổi luật thì sửa ở đây trước, rồi sửa [thap-den.md](thap-den.md) và mã cho khớp.

**Ký hiệu:** `(tạm)` là số hoặc chi tiết mình tự đặt để chơi được, chủ kênh chưa chốt.

## Đổi sang game khác thì giữ gì, thay gì

Luật chia làm hai lớp. Làm game mới cùng thể loại chỉ cần viết lại lớp thế giới.

| Lớp | Gồm | Khi đổi game |
|---|---|---|
| **Lõi** | Vòng đời, Máu Giáp Lực, Điểm và cấp, đánh tầm xa, phe, ưu tiên, lệnh gõ, quà, sao, camera, MC, mốc phiên, hồ sơ | Giữ nguyên, chỉnh số nếu cần |
| **Thế giới** | Tên game, cốt truyện, tên khu, tên nền map, Sương, dòng nhân vật, tên phe, kiểu đạn, tên chiêu, lời MC | Viết lại |

**Thế giới hiện tại:** Tháp Đèn Trời. Thả tim là thắp lửa, trứng lửa nở thành chiến binh, Sương Lạnh dồn người về Đỉnh Đèn, quán quân là Người Giữ Đèn. Toàn văn ở [mục 2 kịch bản](thap-den.md#2-cốt-truyện).

## 1. Nguyên tắc

- **N1.** Game không trả thưởng tiền thật, quà không quy đổi ra tiền.
- **N2.** Ý tưởng phải khó sao chép: map bốc ngẫu nhiên, lịch sử giải riêng từng kênh.
- **N3.** Không vẽ lại nhân vật có bản quyền. Dạng trưởng thành là người lớn, trang phục kín đáo.
- **N4.** MC chỉ cảm ơn sau khi có quà, không giục tặng.
- **N5.** Thoại và lời MC không dùng ngôn từ kích động bạo lực, chỉ thoại sảng, trêu ghẹo vui vẻ, hài kiểu meme.

## 2. Vòng đời

- **V1.** Vào phòng là thành trứng mang avatar của mình. Trứng tự nở sau 10 giây; thả đủ 5 tim là nở ngay.
- **V2.** Ở map thấp ai cũng thành trứng. Ai không muốn chơi thì ngồi xem, đủ thời gian thì có thể thành trứng.
- **V3.** Cấp 2 trở lên hết máu thì tụt 1 cấp và đánh tiếp. Boss to có thể thua người nhỏ mà chưa bị loại.
- **V4.** Chỉ cấp 1 hết máu mới văng khỏi sân. Thả 5 tim để hồi sinh với 100 máu, chưa có giáp, yếu như mới nở.
- **V5.** Còn sống thì tim làm đòn mạnh hơn. Chết rồi tim mới dùng để hồi sinh.
- **V5b.** Rời phòng khi còn là trứng thì trứng mờ dần rồi biến mất sau một khoảng thời gian (tạm: 5 giây).
- **V6.** TikTok không báo ai rời phòng nên game suy ra: im lặng 10 phút (đã tặng quà thì 30 phút), hoặc trên sân đông hơn số người đang xem cộng 2 thì người im lâu nhất (từ 30 giây) coi như đã rời, người đã tặng quà rời sau cùng. Nhân vật được ghi nhớ rồi biến mất, không tự quay lại kể cả sang vòng mới; khách tương tác lại là có trứng mới. Người đã có quà vẫn giữ trên Bảng Vàng dù offline.

- **V7.** Không có quà hoặc ít người chơi thì nhân vật nghỉ ngơi kiểu thư giãn, than phiền hoặc hào hứng bằng hành động nghịch ngợm (tạm: 25 giây không quà hoặc từ 6 người trở xuống; vào cảnh này là đánh trước 54 giây rồi mới nghỉ 6 giây, để phòng vắng vẫn có trận).
- **V7b.** Trò nghỉ kiểu meme (không nằm): đánh rắm, "một mình anh chấp hết", nói sảng. Hút thuốc lào chỉ dành cho nhân vật đã trưởng thành.
- **V8.** Lời than không được xin quà hay giục tặng.

## 3. Máu, Giáp, Lực

- **M1.** Mỗi nhân vật có Máu, Giáp, Lực. Máu và điểm tách riêng.
- **M2.** Mỗi cấp đều 100 máu. Lên hoặc xuống cấp đều về lại 100 máu và đầy giáp của cấp mới.
- **M3.** Máu có phần lẻ theo thời điểm vào: `0,99 − 0,01 × số phút đã qua`, người vào trước phần lẻ cao hơn.
- **M4.** Dưới đất đòn là số nguyên nên trừ phần nguyên trước, phần lẻ sau, để người mạnh càn quét nhanh. Trên trời đòn giảm một nửa nên có thể trừ 0,5.
- **M5.** `Mỗi đòn = Lực × Nhịp tim × hệ số vũ khí × hệ số lệnh × hệ số chiêu`, làm tròn lên.
- **M6.** `Giáp đỡ = đòn × giáp ÷ (giáp + 40)`, làm tròn lên (tạm). Phần còn lại trừ vào máu.
- **M7.** Giáp cao thì máu tụt chậm và ít. Hết giáp thì đau hơn.
- **M8.** Cấp thấp bắn cấp cao vẫn luôn tốn ít nhất 1 giáp và 1 máu. Chỉ Khiên từ quà mới chặn hẳn.
- **M8b.** Mỗi đòn mất tối đa 34 máu để trận nào cũng đủ vài nhịp để xem (tạm).
- **M9.** Tụt dưới 30% máu đầu trận thì tự bỏ chạy.

| Cấp | Hình | Đủ điểm | Máu | Giáp (tạm) | Lực (tạm) | Chiêu |
|---|---|---|---|---|---|---|
| 1 | Sơ sinh | 0 | 100 | 20 | 20 | Đòn thường |
| 2 | Tiến hóa 1 | 20 | 100 | 40 | 30 | Thêm Bắn Đôi ×1,3 |
| 3 | Tiến hóa 2 | 100 | 100 | 70 | 45 | Thêm Bùng Nổ ×1,6 |
| 4 | Trưởng thành | 300 | 100 | 110 | 65 | Thêm Tuyệt Kỹ ×2,2 |

## 4. Điểm và biến hình

- **D1.** Điểm là kinh nghiệm, đơn vị phụ để lên cấp và xếp hạng. Biến hình tính bằng điểm.
- **D2.** Có điểm từ hai việc: thắng trận, hoặc nghỉ khi đã đầy máu và giáp.
- **D3.** Nghỉ là 3 giây không giao tranh trở đi: hồi 5 máu và 3 giáp mỗi giây, đầy cả hai mới được 0,2 điểm mỗi giây (tạm).
- **D4.** Quà, trứng và sao cảm ơn không cho điểm, không nâng cấp trực tiếp (tạm, suy từ D2). Ngoại lệ: đang đi kiếm ăn (lệnh Măm hoặc khách mới) thì mỗi món ăn được thêm 0,5 điểm, để ăn chăm là lớn lên, đủ sức vào trận.
- **D5.** Thua mất nửa điểm. Thua ở cấp 2 trở lên thì điểm nằm trong khoảng của cấp vừa tụt xuống.
- **D5b.** Ngưỡng điểm lên cấp tự co theo thời lượng phiên để phiên ngắn vẫn tới được dạng cuối (tạm: nhân `min(1, số giây ÷ 1000)`).
- **D6.** Điểm lớn thì nhân vật to hơn, có trần để không che map. Người điểm cao nhất mỗi khu là boss khu đó.

## 5. Đánh nhau

- **T1.** Đánh tầm xa, không cận chiến. Vào tầm bắn (9 đơn vị cộng theo cỡ) thì khóa cặp, nhịp chậm để xem rõ hiệu ứng, chiêu và thoại (tạm: 3,6 giây một nhịp).
- **T2.** Đòn theo loại: lửa thổi lửa, người ném phi tiêu, ma trơi ném bóng. Cún Tro phun tro, Mầm Cây bắn hạt (tạm).
- **T3b.** Chiêu phải đẹp, rõ và hài kiểu meme, dùng đạo cụ đời thường; trúng đòn có chữ truyện tranh, người trúng phản ứng hài.
- **T3.** Cấp cao có nhiều chiêu và hiệu ứng hơn, chiêu tự ra theo vòng (tạm: tự ra).
- **T4.** Người bị đánh là người ít máu hơn trong cặp, có mũi tên đỏ trên đầu. Cả hai vẫn bắn nhau để còn lật kèo (tạm).
- **T5.** Thua là rơi sao: 70% phần thưởng tự bay về người hạ gục và được cộng ngay; 30% còn lại rơi quanh chỗ gục, ai tới trước ăn trước, người thua không ăn sao của mình. Nếu có người góp đòn hoặc đấu đội thì 70% được chia như luật góp đòn, luật đội.
- **T6.** Sao Rơi chứa `5 + 50% điểm người thua` và hồi máu, giáp (tạm).
- **T7.** Thứ tự tự động: nhặt sao và vật phẩm trước, rồi đánh, cuối cùng ăn trứng.
- **T7b.** Sau một trận thắng, người thắng nghỉ và không bị chọn làm mục tiêu 30 giây để hồi sức.
- **T7c.** Có vùng giao chiến trên không và mặt đất. Đồng đội phải bay lên mới góp sức được cho trận trên không.
- **T7d.** Mỗi phe có kỹ năng di chuyển riêng, hài kiểu meme: bay, phóng nhanh, lướt, lướt khói, cưỡi chổi. Nhân vật không bao giờ mờ hay tàng hình. Không dùng độn thổ.
- **T7e.** Trên không phải cách xa mặt đất rõ ràng, nhìn xuống thấy người dưới đất bé xíu, bay lên và camera đi chậm cho chân thực; phương tiện bay đa dạng và đẹp, không dùng chổi hoạt hình; người bay luôn quay về phía camera.
- **T7g.** Trên trời camera quay thẳng góc ngang như 2D; đánh chậm hơn và mỗi đòn chỉ trừ một nửa (dưới đất trừ 1 thì trên trời trừ 0,5).
- **T7h.** Trận trên trời tối thiểu 1 phút, đánh đến khi có người out, không được bỏ chạy; camera giữ yên góc, zoom rộng thấy cả người bị đánh.
- **T7j.** Linh thú bay vào đón nhân vật rồi mới cất cánh, luôn nằm ngang thẳng.
- **T7i.** Bay lên bằng linh thú ảnh động đẹp kiểu game cao cấp: tứ linh Long, Lân, Quy, Phụng, thêm hổ, sư tử, hạc hoặc mọc cánh, kèm hào quang.
- **T7f.** Không bay loạn xạ: toàn sân chỉ một trận trên trời mỗi lúc, tối đa 5 người, ví dụ 3 đấu 2; xong thì nghỉ một quãng (tạm: 45 giây).
- **T8.** Ai cũng có Vòng Bảo Vệ: tự bật sau mỗi 4 phút, 8 giây không thể bị tấn công, để nhân vật tham chiến nhiều hơn, hết giờ tự mờ dần rồi biến mất.
- **T8b.** Bị đánh đủ 10 đòn thì được cộng thêm 1 phút Vòng Bảo Vệ, cộng dồn tối đa 5 phút, rồi đếm lại; đòn nào vẫn lọt vào lúc có vòng cũng cộng thêm 1 phút. Đang có vòng thì không đánh và không bị đánh. Trận đang đánh dưới đất dừng lại; trận trên trời đánh xong mới nhận.
- **T9.** Đang đánh thì chờ đánh xong mới bật; trong lúc có vòng thì cũng không đánh ai (tạm).
- **T10.** Ưu tiên nhân vật cùng cấp đi tìm nhau, để nhường sân cho cấp thấp.

### Phe

- **F1.** Mỗi loại nhân vật là một phe, có màu dưới chân (tạm: Lửa, Tro, Cây, Ma, Người).
- **F1b.** Lên hay xuống cấp đều không đổi phe; không mượn hình của phe khác.
- **F2.** Cùng phe không tấn công nhau trong một phạm vi nhất định (tạm: 24 đơn vị).
- **F3.** Ưu tiên va chạm khác phe: nhân vật tìm người khác phe và hai bên cùng chạy lao vào nhau.
- **F4.** Càng về cuối, tỉ lệ hòa trong cùng phe càng giảm và họ tấn công nhau (tạm: mốc 1 đến 5 là 100%, 75%, 50%, 25%, 0%).
- **F5.** Khi được đánh cùng phe, nhân vật vẫn ưu tiên người khác phe trước. Chỉ còn một phe thì hết hòa (tạm).

- **F6.** Hợp Công: người cùng phe đang rảnh tự kéo tới bắn cùng vào đối thủ khác phe của đồng đội, để tiêu diệt hoặc đánh tụt cấp nhanh hơn.
- **F7.** Mỗi người góp 50% đòn thường, mỗi bên tối đa 3 người góp (tạm).
- **F8.** Cùng tấn công thì chia điểm theo phần đã góp (tạm: tổng giáp và máu đã làm đối thủ mất).
- **F9.** Cùng tấn công thì bị phản đòn (tạm: người góp nhiều nhất mỗi nhịp chịu `Lực đối thủ × Giáp còn ÷ Giáp tối đa`).

## 6. Lệnh gõ

Lệnh là bình luận đúng nguyên văn, không phân biệt hoa thường. Lệnh nhắm mục tiêu chỉ có tác dụng trong tầm.

| Mã | Lệnh | Tác dụng |
|---|---|---|
| **L1** | `Chạy` | Bỏ chạy 5 giây |
| **L2** | `Đuổi` | Đuổi người vừa chạy, tầm 16 |
| **L3** | `X` | Quay lại đánh |
| **L4** | `Stop` | Đứng lại 5 giây, không hút và không bị hút |
| **L5** | `Z` | Săn đối thủ lớn trong tầm 24, từ 20 điểm |
| **L5b** | `Măm măm`, `Mem măm`, `Măm` hoặc `Ăn` | `Ăn` chỉ tính khi gõ đúng `ăn` hoặc `ăn đi`, để câu chat như "ăn cơm chưa" không thành lệnh. Lao tới đồ ăn gần nhất 6 giây, nhanh gấp 2,4 lần, ăn xong tự tìm món kế tiếp; hồi 15 giây, không dùng được khi đang đánh |
| **L6** | `p2` | Sang phòng khác khi kênh mở nhiều phòng |
| **L6b** | `t tên` | Nhắm đánh người có tên đó trong tầm |
| **L7** | `Tìm [tên]` | Camera đến nhân vật có tên đó; chỉ gõ `Tìm` thì đến nhân vật của mình |

Ba lệnh khắc nhau: `Đuổi` bắt `Chạy`, `X` phạt `Đuổi`, `Chạy` tránh `X`.

## 7. Quà, sao, vật phẩm

- **Q1.** Quà được quyền lật kèo: ra vũ khí, khiên hoặc sao. Vũ khí tự hao mòn, không có trần sức mạnh.
- **Q2.** Loại quà ra ngẫu nhiên, giá trị tỉ lệ với xu. Ba lần không ra vũ khí thì lần sau chắc ra.
- **Q3.** Sao là lời cảm ơn tung cho cả phòng, bay về người tặng trước, người khác cướp được.
- **Q4.** Gom đủ 10 và 30 sao cảm ơn thì sao hóa vũ khí. Sao Rơi không tính.
- **Q5.** Quà mở Mưa Cảm Ơn. Ai gõ cảm ơn trong cửa 8 giây thì nhận sớm hơn và xác suất cao hơn.
- **Q6.** Sao chỉ tồn tại 3 giây sau khi rơi xuống sàn.
- **Q8.** Càng về cuối phiên, trứng vàng xuất hiện càng ít (tạm: từ 38 quả xuống 2 quả trên sân).
- **Q9.** Càng về cuối phiên, tần suất sao cảm ơn càng giảm (tạm: trên sân từ 20 xuống 3, mỗi quà từ 12 xuống 3). Sao Rơi của người thua giữ nguyên.
- **Q7.** Số sao cảm ơn có giới hạn để tài nguyên co cụm (tạm: mỗi quà tối đa 12 sao, trên sân tối đa 20 sao cảm ơn). Mưa Cảm Ơn rơi quanh người tặng, tối đa 14 món mỗi đợt (tạm).

## 8. Sân, camera, MC

- **S1.** Mọi map là sân đấm bốc rộng quây kín 4 phía, chia 4 khu, mỗi khu một boss.
- **S2.** Trong sân không có vật cản hay đồ trang trí không liên quan game.
- **S3.** Nền và khối luật bốc ngẫu nhiên đầu vòng. Nền chỉ đổi màu sàn và ánh sáng.
- **S4.** Sương dồn dần từ một đầu sân, sân ngắn lại nhưng vẫn là hình chữ nhật.
- **S5.** Camera lướt chậm, bám một nhân vật đến khi chính nhân vật đó bị out khỏi sân rồi mới chọn người mới.
- **S5b.** Khi có giao chiến, camera zoom lại gần, đặt góc chéo đẹp để thấy cả hai bên; người đứng chắn thì mờ đi.
- **S5c.** Không ai tranh camera thì cứ quay một nhân vật ưu tiên. Nhân vật đó out thì chuyển sang người tặng quà nhiều nhất; chưa ai tặng thì chia đều qua các phe. Lệnh và quà cụ thể vẫn được ưu tiên. Người được quay nhờ quà chỉ giữ camera khoảng 30 giây rồi chuyển người khác.
- **S5d.** Hai boss đánh nhau thì vào chế độ điện ảnh: chuyển cảnh nhịp nhàng trên cùng sân giữa toàn cảnh và các góc cận.
- **S8b.** Nhân vật có thật nhiều câu thoại meme đúng theo hành động; kho câu ở mục Lời MC của kịch bản.
- **S8d.** Ảnh nhân vật không lắc nghiêng, không nảy tưng kiểu lật đật.
- **S8c.** Câu thoại kèm điệu bộ, camera chỉ tiến nhẹ vào người đang nói, không zoom mạnh.
- **S3b.** Có nhiều bối cảnh chiến trường, chuyển cảnh tối dần khi sang mốc mới.
- **S5e.** Quà chuyển cảnh làm camera bám người tặng, hoặc người mà họ đã nhắm bằng lệnh `t tên`.
- **S8e.** Bình luận của người xem hiện thành thoại của nhân vật họ, có lọc.
- **S5f.** Đang có trận thì mọi góc máy phải thấy đủ cả hai bên giao chiến.
- **S5g.** Có nhịp nghỉ mắt: camera xem toàn cảnh sân đấu hoặc bầu trời vài giây giữa các cảnh để đỡ rối (tạm: 5 giây, cách nhau ít nhất 20 giây).
- **S5h.** Lúc camera sắp đổi người, ai chat đúng nhịp được ưu tiên lên hình.
- **S6.** Chỉ đổi cảnh sớm khi có lệnh xem vị trí người chơi (`đâu`, xem xong quay về nhân vật đang theo) hoặc nhân vật đang quay bật Vòng Bảo Vệ. Chỉ một món quà cụ thể mới chuyển cảnh (tạm: từ 1.000 xu).
- **S7.** Lệnh và hiển thị trên live là một màn hình chung cho mọi người.
- **S8.** Trong lúc đánh có MC dẫn trận, gọi tên người đánh, người bị đánh và tên chiêu.
- **S9.** Không vẽ thanh kiếm nhỏ cạnh nhân vật. Vũ khí chỉ hiện khi có bộ ảnh cầm vũ khí riêng.
- **S10.** Nhân vật đứng có khoảng cách, hạn chế chồng đè. Người rảnh tự dạt khỏi đường bắn của trận đang đánh.
- **S12.** Bố cục tự động theo số người: sân chia ô, mỗi ô một số trận giới hạn (tạm: 1), ô đông thì người rảnh tự sang ô thưa; quá đông thì nhân vật thu nhỏ.
- **S13.** Sau mỗi 5 giây hoạt động, nhân vật có nhịp nghỉ để lấy độ thoáng (tạm: 1,5 giây, tự dạt khỏi chỗ đông).
- **S14.** Giới hạn số người cùng nhắm một mục tiêu để không túm lại (tạm: 2 người, mục tiêu đang đánh 3 người).
- **S15.** Tên và ảnh đại diện không hiện hết cùng lúc, hiện theo nhịp và so le giữa các nhân vật (tạm: 6 người mỗi lượt 2,5 giây).
- **S16.** Chữ thông báo không được che thoại nhân vật; chỉ sự kiện lớn mới có chữ lớn.
- **S17b.** Camera không zoom ra vào quá mức, giữ khoảng cách trong biên độ hẹp.
- **S17.** Camera đổi góc chậm để kịp xem giao chiến; bay lên, bay xuống chậm để camera theo kịp.
- **S18.** Sân đấu đặt trên mặt đất thật tới chân trời, có đồi và cây; mây chỉ hiện khi camera lên cao.
- **S19.** Hai người giao chiến đứng cách xa để thấy đường bay; chiêu bay tới tận mục tiêu, có vệt sáng và điểm nổ khi trúng; chỉ mất máu khi chiêu chạm tới.
- **S20.** Trước khi đánh hai bên võ mồm bằng câu meme cực ngắn, câu sau đáp đúng câu trước: dưới đất 1 cặp, trên trời 2 cặp.
- **S20b.** Mỗi lượt võ mồm hiện bong bóng ngay trên đầu hai nhân vật, câu trêu giữ lại khi câu đáp hiện ra; nhân vật đang được camera theo màu vàng, đối thủ màu xanh.
- **S21.** Trận trên trời chỉ bắt đầu khi cả hai đã bay tới nơi; camera mặc định là góc cận, hơi ngước lên, lệch 16 đến 38 độ để có người gần người xa, đưa rất chậm và giữ một bên suốt trận; lúc bay lên camera bám con thú đang lên; mọi người xếp trên một hàng ngang, không xếp tầng.
- **S21b.** Khi cưỡi thú chân nhân vật mờ dần; thanh máu và giáp ẩn đi, chỉ hiện thoáng khi vừa giao đòn.
- **S21c.** Trận trên trời có pha rượt đuổi khoảng 10 giây: bên còn nhiều máu đuổi, bên kia chạy, camera bay theo ở góc trước, ngang hoặc sau, kèm câu meme đối đáp.
- **S21d.** Bầu trời chia thành các khu camera riêng: dưới 40 người 1 khu, dưới 150 người 2 khu, từ 150 người 3 khu; mỗi khu một trận, tối đa 5 người. Có nhiều trận thì camera lần lượt chuyển khu sau mỗi 70 giây.
- **S21e.** Đồng đội cùng phe bay lên có thoại đối đáp với người được giúp; khi người được giúp còn dưới 60% máu thì tiếp sức 8 máu, 4 giáp, mỗi 14 giây một lần.
- **S21f.** Thú cưỡi có cảnh ra mắt khoảng 6 giây; chỉ người đã tặng quà mới có: camera cận cảnh góc thấp, tia hào quang xoay, sao bay quanh, nhãn vàng tên người cưỡi và tên thú, âm thanh chúc mừng. Camera giữ cả người được đón và con thú trong khung từ lúc thú bay tới, cặp cùng lên thì lướt tiếp sang người thứ hai không cắt cảnh; thú và người cưỡi nổi lên trên cùng, thú và bong bóng của người khác tạm ẩn, nhân vật khác vẫn hiện rõ. Mỗi lúc chỉ một thú ở gần mặt đất: nhiều người cùng lên thì lần lượt, người đã tặng nhiều quà hơn lên trước, người sau đợi thú trước bay cao mới được đón. Lời trên màn hình không xin quà.
- **S21g.** Các cú đổi cảnh lớn (vào, ra cảnh thú cưỡi, chuyển khu trời, hết trận trên trời) dùng hiệu ứng mây cuốn thay vì cắt thẳng.
- **S21h.** Trên không không có Vòng Bảo Vệ, chỉ có giao chiến. Ảnh tung chiêu chỉ hiện đúng lúc ra đòn, chiêu bật ra ngay khung hình phóng từ miệng hoặc tay.
- **S21i.** Trên trời có hơn 2 người thì thành đấu đội: mỗi đội ra đòn theo nhịp riêng, mặc định tự động 7,2 giây một lần; tim thả cho thành viên trong 3 giây gần nhất làm đội đó đánh nhanh dần, đạt tối đa 1,3 giây một đòn khi đội có từ khoảng 11 tim mỗi giây. Bên thua thì điểm được chia đều cho các thành viên đội thắng. Camera lượn thành cung quanh từng đội, mỗi đội 9 giây rồi lướt sang đội kia, giữ khoảng cách đủ thấy trọn người và thú của cả đội.
- **S21j.** Khung hình không bao giờ được trống: bỏ cảnh toàn cảnh trên không; nếu trên khung không có ai quá 1,2 giây, camera tự cuộn mây về chỗ có nhân vật.
- **S21k.** Thú đang bay và người cưỡi luôn ở lớp hiển thị trên nhân vật mặt đất và bối cảnh; chiêu, thoại trên không nằm trên thú. Tên, thanh máu và bong bóng thoại của người khác tự ẩn khi chạm vào vùng của thú và người cưỡi.
- **S21l.** Cảnh mây phủ kín màn hình chỉ dùng lúc thú cưỡi VIP ra mắt, cách nhau ít nhất 45 giây. Các lần chuyển cảnh khác chỉ mờ nhẹ dưới nửa giây.
- **S21m.** Bảng xếp hạng không treo liên tục: hiện 6 giây trong mỗi 40 giây, hoặc khi đổi người dẫn đầu (hai lần cách nhau ít nhất 20 giây).
- **S21n.** Sàn không in chữ, chia 5 khu màu. Mỗi khu in ảnh và tên một người trong TOP 1 tới TOP 5 **theo xu quà đã tặng**; chưa ai tặng thì sàn trống, tim và người mới vào không tính.
- **S21o.** Bảng lệnh hiện giữa màn hình 12 giây trong mỗi 3 phút, mỗi hàng một lệnh; không hiện lúc thú cưỡi VIP ra mắt hoặc camera đang theo trận trên trời.
- **S21p.** Khi đang là trứng hoặc chờ hồi sinh, gõ `Chọn [số]` (1 đến 6, phía sau gõ gì cũng được, không phân biệt hoa thường) để chọn nhân vật. Dải ảnh mẫu tròn có đánh số và dải hướng dẫn hiện 12 giây trong mỗi 75 giây, chỉ khi có trứng trên sàn.
- **S21q.** Có dữ liệu live thật thì mọi nút thử bị khoá và nhân vật máy rút hết. Số liệu thử không vào TOP quà, không gửi cho MC và không gửi về máy chủ.
- **S21r.** `Chạy`, `Đuổi`, `Stop`, `Tìm` và `Cảm ơn`, `X`, `Z` chỉ cần đúng từ mở đầu tin nhắn, phía sau gõ gì cũng được, không phân biệt hoa thường.
- **S21s.** Toast góc phải báo số người đang trên sân và số trứng sắp nở, hiện 5 giây trong mỗi 15 giây, nhường chỗ khi Bảng Vàng hoặc popup VIP đang hiện.
- **S21t.** Quả trứng nào có người ở trong đều có avatar tròn trên đầu; khách thật dùng ảnh TikTok, không có ảnh thì dùng chữ cái đầu của tên.
- **S21u.** Hết vòng, 10 người đầu Bảng Vàng (xếp theo xu quà) vào thẳng vòng mới, không phải ấp trứng; giữ nhân vật, điểm về 0. Bảng Vàng chỉ hiện 5 người đầu; bảng 10 người hiện 9 giây trong mỗi 3 phút khi có từ 6 người trên sân và lúc chốt vòng, không hiện cùng toast.
- **S21v.** Chỉ khách thật được lưu hồ sơ, ở máy này, trong `database/designs/dai-chien-thap-den/so/ho-so.json`: top 10 và người có tặng quà của 200 phiên gần nhất. Xem ở `/a/dai-chien-thap-den/ho-so.html`.
- **S21w.** Sao may mắn chỉ rơi khi phòng có từ 5 người đang xem (bản thử không nối live thì đếm người trên sân): 5 đến 9 người thì 10 phút một lần, 10 đến 50 người thì 8 phút, hơn 50 người thì 5 phút. Mỗi người chỉ nhận một sao, phải out rồi về lại trứng hoặc hồi sinh mới được nhận tiếp; top 10 vào thẳng vòng sau không tính là về lại trứng. Sao trúng đúng một nhân vật ngẫu nhiên đang ở dưới đất và chưa đạt cấp tối đa, cho lên thẳng một cấp. Có vòng tròn báo trước, MC hô, camera theo. Người bị đánh càng nhiều càng dễ được sao: mỗi đòn bị đánh thêm nửa phần cơ hội so với người chưa bị đánh, tối đa gấp 16 lần (từ 30 đòn), vẫn là ngẫu nhiên. Nhận sao xong hoặc sang vòng mới thì đếm lại.
- **S21x.** Khách thật vào phòng được chào ngay và đưa game sang chế độ thật; ra rồi quay lại sau 45 giây thì được chào lại. Chào bằng bóng nổi viền đỏ giữa màn hình, kèm câu nhắc thả tim do chủ phòng chọn. Mỗi tên hiện 4 giây tính theo giờ thật, một bóng gọi tối đa 6 tên mới nhất, đông hơn thì gộp "và N người khác". Đang cảnh VIP hay máy bay thì giữ tên lại, xong cảnh mới hiện. Câu này cần đối chiếu quy định TikTok trước khi phát rộng.
- **S21y.** Bảng Vàng, 5 ô vinh danh trên sàn, vương miện và danh sách top gửi cho MC dùng chung một thứ tự: tổng xu quà của người đó từ lúc kết nối phiên. Bằng xu thì ai đạt mức đó trước đứng trên. Điểm đánh nhau, tim, sao may mắn, hết máu hay còn là trứng đều không làm đổi hạng. Chưa ai tặng quà thì bảng không hiện.
- **S21z.** Có hai nút, đều bấm hai lần. Cả hai luôn tác động lên phiên live thật, kể cả khi bấm từ bản chơi thử. Reset tất cả lưu hồ sơ phiên rồi xoá khách, nhân vật máy và Bảng Vàng trên sân cho tới khi có khách mới; không nối lại TikTok vì nối lại liên tục dễ bị TikTok chặn (DEVICE_BLOCKED). Reset trận này cho cả sân chơi lại từ đầu, không công bố quán quân cũ và không ai được vào thẳng. Điểm và cấp về 0, phiên đang chơi được lưu hồ sơ trước khi xoá. Tổng xu quà và Bảng Vàng giữ nguyên. Tim không bao giờ tính vào Bảng Vàng.
- **S21za.** Mỗi khách thật giữ một nhân vật cố định theo tài khoản: chưa chọn thì nhân vật được tính từ tài khoản nên luôn ra cùng một con, qua trứng nở, sang vòng mới, kết nối lại hay tải lại trang. Chỉ lệnh Chọn [số] mới đổi, và lựa chọn đó được lưu ở `database/designs/dai-chien-thap-den/so/nhan-vat.json`.
- **S21zb.** Lệnh Tìm nhận tên hiển thị hoặc ID tài khoản và không cần gõ đúng hết: bỏ dấu, bỏ hoa thường, lấy người có nhiều chữ cái khớp nhất, cần khớp từ một nửa số chữ đã gõ. Gõ `tim` không dấu thì cần khớp 80% để tránh nhầm với chat về tim. Người khớp nhất chưa lên sân thì camera đứng yên, không nhảy sang người khớp kém hơn. Tìm được thì camera lia nhanh tới người đó, giữ 10 giây, người khác chat không kéo camera đi. Mỗi người tìm một lần trong 60 giây.
- **S21zc.** Tim và quà là hai thứ riêng. Tim chỉ làm trứng nở, hồi sinh và tăng nhịp đòn. Thú cưỡi, bay lên, trận trên trời, đồng đội lên trời giúp sức và cảnh ra mắt VIP chỉ dành cho người đã tặng quà thật; trận trên trời cần cả hai bên đã tặng quà, thiếu một bên thì đánh dưới đất.
- **S21zd.** Lượt xoay camera theo tim là một dạng riêng, đứng sau lệnh Tìm, chat, cảnh VIP và lượt theo quà, chỉ chen vào khi các luật đó không cần camera. Người thả nhiều tim nhất trong 5 phút gần đây (từ 30 tim) được quay 12 giây. Mỗi người tối đa 3 lượt trong 5 phút, hai lượt tim cách nhau ít nhất 25 giây. Được quay xong thì số tim tính ưu tiên của người đó về 0, phải thả đủ lại mới có lượt tiếp. Lượt này không cho xu, thú cưỡi hay hạng Bảng Vàng.
- **S21ze.** Khách chat thì câu cuối của họ hiện trên đầu nhân vật 30 giây, thay cho thoại máy, câu mới đè câu cũ; hết 30 giây tự xoá rồi quay lại thoại AI. Đối thủ đang chung trận thì im trong lúc đó để không đáp lạc đề. Lệnh và câu có từ cấm không hiện. Đổi bản đồ thì kho thoại AI được xoá và viết lại theo sân mới; AI được biết lời khách vừa chat để câu đôi bám chuyện trong phòng.
- **S21zf.** Nhân vật tiến hóa lên cấp thì có 2,2 giây vận công: ba dòng hào quang xoáy lên quanh người, sao bay, nhún nhảy phấn khích và chữ TIẾN HÓA. Khách thật không bao giờ bị gán câu chat mẫu; câu mẫu chỉ dành cho nhân vật máy.
- **S21zg.** Phòng có tổ ba MC đọc bằng ba giọng khác nhau: Bé Đèn (dẫn chính), Anh Tro (trận trên trời, cà khịa), Nhóc Mây (đáp và chào khách). Giọng chọn ở thẻ MC chỉ là giọng dự phòng khi câu không ghi người nói.
- **S21zh.** Mọi khách vừa vào đều được cấp trứng ngay, phòng đông hay ít cũng vậy; khách chỉ vào phòng dùng tối đa 1000 chỗ, phần còn lại để dành cho người thả tim, bình luận, tặng quà. Khách mới được ưu tiên camera: có trứng là camera lia tới và giữ 15 giây, kể cả lúc đang có trận trên trời, chỉ nhường lệnh Tìm, sao may mắn, cảnh VIP và camera bấm tay. Hàng chờ giữ 4 người, người vào sau cùng được quay trước; còn người chờ thì mỗi lượt 10 giây, các lượt nối nhau, phòng đông cũng vậy. Ra rồi vào lại sau 60 giây thì được quay lại. Khi nở, khách mới tự đi nhặt đồ ăn 45 giây như lệnh Măm, chọn món xa chỗ đang đánh nhau, không thể bị nhắm đánh, luôn hiện tên kèm nhãn MỚI; khách tự gõ lệnh là thôi tự động. Sau khi camera lia tới 15 giây (lúc trứng đã nở, để không che mặt khách), bảng hướng dẫn hiện 15 giây ở phần trên màn hình, gọi tên khách đó (hai lần cách nhau ít nhất 20 giây).
- **S21zh1.** Sân thưa (từ 20 nhân vật trở xuống): không ai trong tầm thì nhân vật đi tìm đối thủ gần nhất khắp sân thay vì lang thang; thắng trận chỉ nghỉ 6 giây thay vì 30 giây; người thua tự hồi sinh sau 10 giây không cần tim, kể cả ở mốc Không Hồi Sinh (khác V4 và P3, vì phòng vắng không có ai thả tim).
- **S21zh2.** Người vận hành chọn tay nhân vật cho camera ở bảng ⚙ (Trước, Sau, chọn trong danh sách). Camera giữ trên người đó tới khi bấm Tự động hoặc người đó rời sân, kể cả qua lệnh Tìm, chat, lượt theo quà và cảnh toàn sân; riêng cảnh VIP vẫn chạy. Lựa chọn áp cho mọi cửa sổ đang phát và tự hết khi sang phiên mới.
- **S21zh3.** Bong bóng chat của khách giữ cỡ chữ lớn cố định trên màn hình dù camera xa hay gần, câu dài tự xuống dòng, tối đa 4 dòng.
- **S21zh4.** Game trò chuyện với từng khách mới ở khung MC, gọi tên, mỗi câu cách nhau ít nhất 6 giây, phòng đông chỉ giữ 4 câu mới nhất: còn trứng thì rủ gõ `Chọn`, nở rồi rủ gõ `Z`, 25 giây sau chưa gõ lệnh thì nhắc thêm, gõ đúng lệnh thì khen. Có MC AI thì đọc thành tiếng, cách nhau ít nhất 25 giây. Các câu này chỉ dạy cách chơi, không nhắc quà.
- **S21zh5.** Nhân vật máy mang tên ghép ngẫu nhiên, không đánh số. Nhân vật máy bị loại không quay lại: sau 10 giây chỗ đó thành một nhân vật mới với tên mới, sang vòng mới cũng vậy. Khách thật thua vẫn theo V4 và S21zh1, trừ khi đã bị coi là rời phòng (V6).
- **S21zh6.** Khách thật bình luận (kể cả gõ lệnh) thì camera quay tới người đó 7 giây, chung hàng chờ với khách mới, ai mới nhất được quay trước. Lượt chat xem ít nhất 4 giây, lượt khách mới ít nhất 8 giây thì lượt sau mới được chen. Người đang được quay chat tiếp thì giữ camera thêm. Câu bị lọc từ cấm không kéo camera. Camera bấm tay, lệnh Tìm, sao may mắn và cảnh VIP vẫn đứng trước.
- **S21zi.** Nhạc nền lặp liên tục ở màn hình phòng, mặc định 10% để không át MC, tự hạ còn 25% mức đó khi MC nói. Bật tắt và âm lượng ở thẻ Nhạc nền, lưu trong `database/designs/dai-chien-thap-den/so/nhac.json`, màn hình phòng tự theo trong vài giây. Bản chơi thử không phát khi phòng đang lên sóng để khỏi chồng tiếng.
- **S21zj.** Cảnh giá lâm hiện bóng đỏ ở chỗ thông báo trên cùng rồi trôi đi sau 5 giây, MC và hướng dẫn chọn số tạm ẩn lúc đó. Người cưỡi thú nói một câu khoe 4 giây; khách đang có lời chat thật thì giữ lời chat.
- **S21zk.** Thú cưỡi động ở mọi góc nhìn. Góc nghiêng dùng 6 khung tranh; chính diện, chéo và phía sau được làm động ngay trên ảnh: cánh vỗ, chân chạy luân phiên, đầu gật, bờm và đuôi bay. Phần lưng giữa đứng yên để người ngồi không bị trôi.
- **S21zl.** Dòng giờ ở góc trên (mặc định 10h đến 12h) đặt ở thẻ Phiên đấu bằng giờ hiện tại cộng thời lượng phiên, lưu trong `database/designs/dai-chien-thap-den/so/san.json`; màn hình phòng tự theo trong vài giây. Dòng này chỉ là chữ hiển thị, không ảnh hưởng thời lượng phiên.
- **S21zm.** Đầu mỗi phiên đấu hiện cốt truyện theo từng trang trong một modal (mặc định 60 giây), game vẫn chạy phía sau. Bật tắt ở thẻ Trận đấu; tiêu đề, từng bước (tối đa 12) và thời gian (10 đến 180 giây) sửa trong hộp Sửa cốt truyện. Giờ, cốt truyện và nhạc nền là các thẻ trong bảng ⚙ của phòng. Nút Hiện lên màn hình và Tắt điều khiển cốt truyện thủ công, màn hình phòng làm theo trong khoảng 3 giây; công tắc trên thẻ là tự hiện đầu mỗi phiên.
- **S21zn.** Bản chơi thử mở ở `/d/dai-chien-thap-den/?thu=1`, dùng chung bảng ⚙ với bản live và thêm thẻ Thử nghiệm. Game ở bản này chỉ có nhân vật giả, không nhận dữ liệu thật, không gọi MC và không ghi hồ sơ; các thẻ cấu hình trong bảng thì vẫn là cấu hình thật của phòng. Lệnh bấm hoặc gõ từ thẻ Thử nghiệm không bị giới hạn thời gian chờ.
- **S21zo.** Trên phiên live, thẻ đó thành thẻ Điều phối: mọi lệnh chạy bằng nhân vật riêng tên Chủ phòng, ngay trong cửa sổ phòng đang bấm. Chủ phòng không có trên Bảng Vàng, sàn vinh danh, camera theo quà và không được lưu hồ sơ.
- **S21zp.** Có 4 sàn theo giờ: Sơ Cấp 10h đến 14h, Trung Cấp 14h đến 18h, Cao Cấp 18h đến 22h, Hoàng Kim 22h đến 10h sáng hôm sau. Trứng nở ra lớn hơn dạng sơ sinh lần lượt 0, 1, 2, 3 bậc, không vượt dạng Trưởng thành. Sàn chỉ đổi hình và kích thước; máu, lực, điểm và cách lên cấp giữ nguyên. Tên sàn và dòng giờ tự đổi ở đầu phiên kế tiếp, không cắt ngang trận. Thẻ Phiên đấu có ô Sàn đấu: mặc định tự động theo giờ, chọn một sàn thì áp dụng ngay và giữ sàn đó cho tới khi đổi lại. Thẻ Phiên đấu gộp cả dòng giờ: Theo lịch sàn, hoặc Từ bây giờ + thời lượng (giờ hiện tại cộng đúng thời lượng phiên, hết giờ tự về lịch).
- **S21zq.** Mỗi loại nhân vật có nhiều chiêu ngẫu nhiên ở mỗi bậc đòn: Lửa ném ớt, pháo, bắp; Cún ném bóng, xúc xích, xương; Cây ném đủ loại trái; Ma ném nến, bí ngô, dơi; Người phi dép, phi tiêu, chảo, bóng chày. Đạn thường cũng đổi đồ theo loại, trúng thì nổ màu và mảnh riêng. Trên trời có bộ thoại cà khịa riêng, AI viết thêm theo trận, và tổ MC nhận tín hiệu gay-chien để cà khịa theo.
- **S21zr.** Toàn sân tối đa 6 nhân vật trên trời cùng lúc, tính cả đồng đội lên giúp và người đang bay. Ai bay xong phải nghỉ mới được lên lại: phòng dưới 20 người nghỉ 2 phút, từ 20 đến 50 người nghỉ 3 phút, trên 50 người nghỉ 5 phút, sang phiên mới thì tính lại từ đầu; trong lúc đó nhường chỗ cho người khác đã tặng quà.
- **S21zs.** Thẻ Phiên đấu có công tắc áp dụng ngay, mặc định tắt: đổi sàn hay thời lượng xong phải bấm Áp dụng. Đổi thời lượng là mở lại phiên.
- **S21zt.** Nhân vật máy có công tắc riêng, bật tắt ngay không tải lại game và không đụng tới khách thật. Khi có khách thật, nhân vật máy vẫn chơi cùng nhưng không lên Bảng Vàng, sàn vinh danh, hồ sơ, không tặng quà giả, không nhận sao may mắn, không bay lên trời, không tính vào phòng ít người.
- **S21zt1.** Thẻ Nhân vật máy có ô giới hạn số lượng (0 đến 56). Đổi là áp ngay, không tải lại game; khách thật không tính vào giới hạn này.
- **S22.** Thú cưỡi có 8 góc nhìn ngang tầm mắt, đón theo góc nghiêng từ trái hoặc phải.
- **S23.** Sân đủ cho hơn 1000 người; phòng ít người tụ ở giữa, phòng đông lan ra hết sân.
- **S11.** Máu và giáp hiện bằng một thanh chia đôi hai màu trong một hàng, không hiện chữ số.

## 9. Phiên và giải

- **P1.** Người live đặt thời lượng, không bắt buộc 2 tiếng, ít nhất 30 phút. Mỗi phiên tìm ra một quán quân.
- **P2.** Phiên chia 5 mốc: Mở Cửa, Siết Sương, Đóng Cửa, Không Hồi Sinh, Trận Cuối.
- **P3.** Từ mốc Đóng Cửa người mới không vào map. Từ mốc Không Hồi Sinh không còn hồi sinh.
- **P4.** Hồ sơ theo mã giải: đúng giải thì lấy lại cấp cao nhất, giải khác làm lại từ đầu.
- **P5.** Phiên cấp cao chỉ quán quân được vào, về lại chỉ số cơ bản, có nhân vật đẹp hơn.

## 10. Ảnh nhân vật

- **A1.** Nhân vật là ảnh dựng đứng luôn quay về camera trên map three.js, mỗi đối tượng nhiều góc.
- **A2.** Mỗi bộ ảnh một thư mục `nhan-vat/<tên>/<bộ ảnh>/`. Bảng kiểm ở [nhan-vat/README.md](nhan-vat/README.md).
- **A3.** Khi tiến hóa, nhân vật đứng hai chân, dáng người lớn dần theo trưởng thành. Cún Tro, Mầm Cây, Ma Trơi chưa có ảnh các cấp sau nên tạm thời chỉ lớn dần về kích thước.
- **A4.** Có vũ khí và không vũ khí là hai bộ trang phục khác nhau.
- **A5.** Mỗi bộ cần đứng, chạy và tấn công tầm xa.
