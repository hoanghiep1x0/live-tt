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

- **V1.** Vào phòng là thành trứng mang avatar của mình. Trứng tự nở sau một khoảng thời gian (tạm: 135 giây); thả tim thì nở nhanh hơn (tạm: 20 tim là nở ngay).
- **V2.** Ở map thấp ai cũng thành trứng. Ai không muốn chơi thì ngồi xem, đủ thời gian thì có thể thành trứng.
- **V3.** Cấp 2 trở lên hết máu thì tụt 1 cấp và đánh tiếp. Boss to có thể thua người nhỏ mà chưa bị loại.
- **V4.** Chỉ cấp 1 hết máu mới văng khỏi sân. Thả 5 tim để hồi sinh với 100 máu, chưa có giáp, yếu như mới nở.
- **V5.** Còn sống thì tim làm đòn mạnh hơn. Chết rồi tim mới dùng để hồi sinh.
- **V5b.** Rời phòng khi còn là trứng thì trứng mờ dần rồi biến mất sau một khoảng thời gian (tạm: 5 giây).
- **V6.** Rời phòng hoặc im lặng 60 giây thì nhân vật được ghi nhớ rồi biến mất. Người điểm cao nhất vẫn giữ top dù offline.

- **V7.** Không có quà hoặc ít người chơi thì nhân vật nghỉ ngơi kiểu thư giãn, than phiền hoặc hào hứng bằng hành động nghịch ngợm (tạm: 25 giây không quà hoặc từ 6 người trở xuống; luân phiên 20 giây nghỉ, 20 giây đánh).
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
- **D4.** Quà, trứng và sao cảm ơn không cho điểm, không nâng cấp trực tiếp (tạm, suy từ D2).
- **D5.** Thua mất nửa điểm. Thua ở cấp 2 trở lên thì điểm nằm trong khoảng của cấp vừa tụt xuống.
- **D5b.** Ngưỡng điểm lên cấp tự co theo thời lượng phiên để phiên ngắn vẫn tới được dạng cuối (tạm: nhân `min(1, số giây ÷ 1000)`).
- **D6.** Điểm lớn thì nhân vật to hơn, có trần để không che map. Người điểm cao nhất mỗi khu là boss khu đó.

## 5. Đánh nhau

- **T1.** Đánh tầm xa, không cận chiến. Vào tầm bắn (9 đơn vị cộng theo cỡ) thì khóa cặp, nhịp chậm để xem rõ hiệu ứng, chiêu và thoại (tạm: 3,6 giây một nhịp).
- **T2.** Đòn theo loại: lửa thổi lửa, người ném phi tiêu, ma trơi ném bóng. Cún Tro phun tro, Mầm Cây bắn hạt (tạm).
- **T3b.** Chiêu phải đẹp, rõ và hài kiểu meme, dùng đạo cụ đời thường; trúng đòn có chữ truyện tranh, người trúng phản ứng hài.
- **T3.** Cấp cao có nhiều chiêu và hiệu ứng hơn, chiêu tự ra theo vòng (tạm: tự ra).
- **T4.** Người bị đánh là người ít máu hơn trong cặp, có mũi tên đỏ trên đầu. Cả hai vẫn bắn nhau để còn lật kèo (tạm).
- **T5.** Thua là rơi sao quanh chỗ gục. Chỉ khi nhặt sao mới cần đi gần. Ai tới trước ăn trước, người thua không ăn sao của mình.
- **T6.** Sao Rơi chứa `5 + 50% điểm người thua` và hồi máu, giáp (tạm).
- **T7.** Thứ tự tự động: nhặt sao và vật phẩm trước, rồi đánh, cuối cùng ăn trứng.
- **T7b.** Sau một trận thắng, người thắng nghỉ và không bị chọn làm mục tiêu 30 giây để hồi sức.
- **T7c.** Có vùng giao chiến trên không và mặt đất. Đồng đội phải bay lên mới góp sức được cho trận trên không.
- **T7d.** Mỗi phe có kỹ năng di chuyển riêng, hài kiểu meme: bay, phóng nhanh, lướt, tàng hình, cưỡi chổi. Không dùng độn thổ.
- **T7e.** Trên không phải cách xa mặt đất rõ ràng, nhìn xuống thấy người dưới đất bé xíu, bay lên và camera đi chậm cho chân thực; phương tiện bay đa dạng và đẹp, không dùng chổi hoạt hình; người bay luôn quay về phía camera.
- **T7g.** Trên trời camera quay thẳng góc ngang như 2D; đánh chậm hơn và mỗi đòn chỉ trừ một nửa (dưới đất trừ 1 thì trên trời trừ 0,5).
- **T7h.** Trận trên trời tối thiểu 1 phút, đánh đến khi có người out, không được bỏ chạy; camera giữ yên góc, zoom rộng thấy cả người bị đánh.
- **T7j.** Linh thú bay vào đón nhân vật rồi mới cất cánh, luôn nằm ngang thẳng.
- **T7i.** Bay lên bằng linh thú ảnh động đẹp kiểu game cao cấp: tứ linh Long, Lân, Quy, Phụng, thêm hổ, sư tử, hạc hoặc mọc cánh, kèm hào quang.
- **T7f.** Không bay loạn xạ: toàn sân chỉ một trận trên trời mỗi lúc, tối đa 5 người, ví dụ 3 đấu 2; xong thì nghỉ một quãng (tạm: 45 giây).
- **T8.** Ai cũng có Vòng Bảo Vệ: tự bật sau mỗi 5 phút, 30 giây không thể bị tấn công, hết giờ tự mờ dần rồi biến mất.
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
| **L1** | `C` | Bỏ chạy 5 giây |
| **L2** | `V` | Đuổi người vừa chạy, tầm 16 |
| **L3** | `X` | Quay lại đánh |
| **L4** | `B` | Đứng lại 5 giây, không hút và không bị hút |
| **L5** | `Z` | Săn đối thủ lớn trong tầm 24, từ 20 điểm |
| **L6** | `p2` | Sang phòng khác khi kênh mở nhiều phòng |
| **L6b** | `t tên` | Nhắm đánh người có tên đó trong tầm |
| **L7** | `đâu` | Camera đến vị trí của mình, kèm mũi tên chỉ nhân vật |

Ba lệnh khắc nhau: `V` bắt `C`, `X` phạt `V`, `C` tránh `X`.

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
- **S21.** Trận trên trời chỉ bắt đầu khi cả hai đã bay tới nơi; camera ngang tầm mắt, mọi người xếp trên một hàng ngang, không xếp tầng.
- **S21b.** Khi cưỡi thú chân nhân vật mờ dần; thanh máu và giáp ẩn đi, chỉ hiện thoáng khi vừa giao đòn.
- **S21c.** Trận trên trời có pha rượt đuổi khoảng 10 giây: bên còn nhiều máu đuổi, bên kia chạy, camera bay theo ở góc trước, ngang hoặc sau, kèm câu meme đối đáp.
- **S21d.** Bầu trời chia thành các khu camera riêng: dưới 40 người 1 khu, dưới 150 người 2 khu, từ 150 người 3 khu; mỗi khu một trận, tối đa 5 người. Có nhiều trận thì camera lần lượt chuyển khu sau mỗi 38 giây.
- **S21e.** Đồng đội cùng phe bay lên có thoại đối đáp với người được giúp; khi người được giúp còn dưới 60% máu thì tiếp sức 8 máu, 4 giáp, mỗi 14 giây một lần.
- **S21f.** Mỗi lần thú cưỡi xuất hiện có cảnh ra mắt khoảng 6 giây: camera cận cảnh góc thấp, tia hào quang xoay, sao bay quanh, nhãn vàng tên người cưỡi và tên thú, âm thanh chúc mừng. Camera bám đúng con thú từ lúc bay vào; thú và người cưỡi nổi lên trên cùng, các nhân vật khác mờ đi. Nhiều người cùng lên thì lần lượt từng người, tối đa 3 người chờ. Lời trên màn hình không xin quà.
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
- **A3.** Khi tiến hóa, nhân vật đứng hai chân, dáng người lớn dần theo trưởng thành.
- **A4.** Có vũ khí và không vũ khí là hai bộ trang phục khác nhau.
- **A5.** Mỗi bộ cần đứng, chạy và tấn công tầm xa.
