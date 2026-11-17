# Live Đại Chiến — kiểu Tháp Đèn Trời (`thap-den`), kịch bản giải đấu

Thiết kế dự kiến `dai-chien-thap-den`, module dự kiến `dai-chien`. Tên hiển thị của game: **Live Đại Chiến**. Loại phòng: [README](README.md). Sổ luật đã chốt: [luat.md](luat.md).

**Trạng thái: bước nghiên cứu, chưa có mã.** Luật dưới đây là bản đã trao đổi với chủ kênh. Mọi con số về nhịp chơi là **điểm xuất
phát tính tay**, chưa đo trên live thật. ⚠ là giả định còn phải kiểm, gom lại ở [mục 14](#14-còn-phải-thử-và-phải-chốt).

Tóm một câu: *ai vào phòng cũng thành trứng mang mặt mình, thả tim để nở thành nhân vật, các nhân vật tự lao vào nhau trên map ngẫu nhiên,
hết máu ở cấp thấp nhất thì văng khỏi map và phải thả tim để sống lại yếu như mới, đủ điểm thì tự động lên map cao hơn, hết phiên tìm ra quán quân.*

---

## 1. Những quyết định chính

| Vấn đề | Chốt |
|---|---|
| Một phiên | **Người live tự đặt thời lượng** (mặc định 120 phút), chia **5 mốc**: số người và map hẹp dần về cuối, tìm ra một quán quân (mục 10) |
| Vào game | Vào phòng là thành **trứng**; thả tim càng nhanh càng sớm nở thành nhân vật |
| Điểm và máu | **Tách riêng**. Điểm lớn thì nhân vật to hơn và xếp hạng cao; máu là sức bền trong trận |
| Thua | Cấp 2 trở lên hết máu thì **tụt một cấp và đánh tiếp**. Cấp 1 hết máu mới **văng khỏi map**. Chỉ khi đã chết tim mới thành máu: nạp đủ 5 tim thì quay lại với 100 máu nhưng chưa có giáp, yếu như người mới, và **mất một nửa điểm** |
| Điều khiển | Nhân vật tự chạy, tự hút vào nhau. Người xem gõ `Chạy` `Đuổi` `X` `Stop` `Z`; lệnh nhắm mục tiêu chỉ có tác dụng **trong tầm** |
| Phe | Mỗi loại nhân vật là một phe. **Cùng phe không đánh nhau ở đầu phiên, càng về cuối càng dễ quay sang đánh nhau**; nhân vật ưu tiên tìm người khác phe và hai bên cùng lao vào nhau |
| Map | **Một sân đấm bốc rộng, quây kín 4 phía**, chia 4 khu nối nhau, mỗi khu có boss gom điểm; càng về cuối Sương càng thu ngắn sân |
| Camera | **Bám một nhân vật đến khi chính nhân vật đó bị out khỏi sân**; chỉ đổi cảnh sớm khi có lệnh `đâu` hoặc nhân vật đang quay bật Vòng Bảo Vệ. Trên live mọi người xem chung một hình, nên camera chỉ theo một mục tiêu mỗi lúc |
| Lên cấp | Đủ điểm là **tự động chuyển lên map cao hơn** |
| Map | **Bốc ngẫu nhiên** từ kho nền và khối luật |
| Người chịu chi | **Được lật kèo**: quà ra vũ khí, khiên hoặc sao. Không có trần sức mạnh, vũ khí tự hao mòn |
| Quà và sao | Sao là **lời cảm ơn tung cho cả phòng**, người tặng được ưu tiên, người khác cướp được |
| Biến hình | **Theo cấp, tính bằng điểm kinh nghiệm**: đủ điểm là lên cấp, đổi hình, tăng Giáp và Lực, về lại 100 máu. Quà không nâng cấp trực tiếp |
| Gõ cảm ơn | Ai chat cảm ơn người tặng thì **nhận vật phẩm sớm hơn và có xác suất cao hơn** (mục 7) |
| Hình ảnh | Map **three.js 3D**, nhân vật và vật phẩm là **tấm ảnh dựng đứng luôn quay về camera** (ảnh tĩnh hoặc ảnh động WebP) |
| Rời phòng | Nhân vật được ghi nhớ rồi biến mất; **điểm cao nhất vẫn giữ top dù offline** |
| Qua nhiều phiên | Hồ sơ theo từng giải: đúng giải thì lấy lại cấp cao nhất, giải khác thì làm lại từ đầu |
| Phiên cấp cao | Chỉ các quán quân được vào, **về lại máu cơ bản** nhưng có **nhân vật đẹp hơn** |

---

## 2. Cốt truyện

Trên đỉnh **Tháp Đèn Trời** có ngọn đèn cả, soi cho cõi người khỏi bị **Sương Lạnh** nuốt. Đèn chỉ cháy bằng **lòng người**: mỗi lần ai đó thương một điều gì,
một đốm lửa bay lên tháp. Người đời gọi động tác ấy là **thả tim**.

Đốm lửa mới sinh nằm trong **Trứng Lửa**. Được thắp đủ thì trứng nở thành một chiến binh mang mặt người thắp. Đèn cả chỉ nhận **một ngọn lửa mạnh nhất mỗi đêm**, nên các
chiến binh phải đấu nhau: lửa tìm lửa, ở gần là bị hút vào nhau, không cưỡng được. Ai cạn lửa thì tan, phải được thắp lại từ đầu.

Người xem tặng quà thì **Tháp trả ơn**: khí giới cho người tặng, và sao may mắn tung khắp phòng. Sao bay về người có công trước, nhưng ai nhanh tay vẫn giật được.

Hết phiên, người mạnh nhất lên đài là **Người Giữ Đèn của đêm**. Các Người Giữ Đèn gặp nhau ở tầng trên, nơi không còn ai mới. Tại đó mọi ngọn lửa lại bé như lúc đầu, nhưng
hình hài thì đã được tôi luyện.

---

## 3. Khó sao chép

Luật chơi và cách bốc map thì ai xem vài buổi cũng chép được; ngẫu nhiên chỉ giúp không đêm nào giống đêm nào. Thứ giữ người xem là thứ **không nằm trên màn hình của một buổi**:

| Thứ | Vì sao khó chép |
|---|---|
| Hồ sơ, cấp, danh hiệu của từng người trong giải | Người xem đã có tên tuổi ở kênh này sẽ không muốn làm lại ở kênh khác |
| **Sử Tháp**: AI viết lại mỗi phiên thành truyện có tên thật, chỉ dựa trên nhật ký trận; MC đọc đầu phiên sau ⚠ | Lịch sử cộng đồng của riêng kênh |
| **Nhân vật quán quân** không mua được bằng quà | Chỉ có được bằng cách thắng, phải đầu tư vẽ riêng |
| Công thức và số liệu | Đối thủ chỉ thấy hình; không hiện công thức trên màn hình, đổi số theo mùa |

Ý tưởng game thường khó được bảo hộ về pháp lý; tên thương hiệu và tranh vẽ có cơ sở hơn, nhưng tranh do AI vẽ còn chưa rõ. Muốn làm thật thì nên hỏi luật sư. Tài liệu này nên giữ nội bộ.

---

## 4. Vòng đời một người chơi

| Trạng thái | Chuyển sang | Điều kiện |
|---|---|---|
| Ngoài xem | Trứng | Vào phòng hoặc có tim đầu tiên (sự kiện vào phòng có thể không về đủ khi đông ⚠) |
| Trứng | Nhân vật cấp 1: 100 máu, 20 giáp, 20 lực | **Tự nở sau 10 giây**; mỗi tim rút ngắn 1/5 thời gian, đủ **5 tim** là nở ngay. Trứng nứt dần theo tiến độ |
| Trứng | Ngoài xem | Bị ăn; 30 giây sau có trứng mới |
| Nhân vật | Rời map (chết) | Máu về 0 |
| Rời map | Nhân vật 100 máu, chưa có giáp, ở Map 1 | Nạp đủ **5 tim**; tim dư không tính |
| Nhân vật | Ghi nhớ, biến mất | Im lặng 60 giây |
| Ghi nhớ | Nhân vật như cũ | Có tim, lệnh, quà hoặc vào lại phòng; bảo vệ 3 giây |

**Trứng.** Mang avatar người chơi. Trứng mới được bảo vệ 10 giây. **Người xem rời phòng khi còn là trứng thì trứng mờ dần trong 5 giây rồi biến mất**, không nở và không bị ăn; quay lại thì thành trứng mới ⚠. Cầu nối TikTok hiện chưa có sự kiện rời phòng, cần tìm cách nhận biết trước khi làm thật ⚠. Nhân vật ăn trứng được **+10 máu**, không có điểm. Ngoài trứng của người xem, map luôn có **trứng vàng nhỏ** rải khắp nơi làm đồ ăn; **càng về cuối phiên trứng càng ít**, từ khoảng 38 quả xuống còn 2 quả, mỗi quả tồn tại 40 giây ⚠. Tối đa khoảng 20 trứng trên map; ai đang thả tim được ưu tiên hiện. Trứng của
người đã rời tự mất sau khoảng 3 phút. Kênh vắng thì thêm **trứng hoang** (không mang mặt ai), nên không phải giả người chơi.

**Rời phòng.** TikTok không báo ai đã rời, nên máy suy từ việc im lặng: 45 giây mờ dần, 60 giây ghi nhớ rồi biến mất. Một trận chỉ vài giây nên người rời giữa trận thường
vẫn đánh nốt và có thể chết. Nếu biến mất đúng lúc đang đánh thì trận bị hủy, đối thủ được +1. Lúc offline: **giữ điểm, giữ hạng, giữ suất**, hiện biểu tượng "đang cất".

---

## 5. Máu và đánh nhau

**Điểm** bắt đầu từ 0, quyết định cỡ nhân vật, thứ hạng và **cấp**. Mỗi nhân vật có ba chỉ số: **Máu** quyết định sống chết, **Giáp** đỡ đòn, **Lực** là sức đánh.

| Cấp | Hình | Đủ điểm | Máu | Giáp | Lực |
|---|---|---|---|---|---|
| 1 | Sơ sinh | 0 | 100 | 20 | 20 |
| 2 | Tiến hóa 1 | 20 | 100 | 40 | 30 |
| 3 | Tiến hóa 2 | 100 | 100 | 70 | 45 |
| 4 | Trưởng thành | 300 | 100 | 110 | 65 |

**Ngưỡng điểm tự co theo thời lượng phiên** để phiên ngắn vẫn tới được dạng cuối: `ngưỡng = số trong bảng × min(1, số giây của phiên ÷ 1000)`. Phiên 4 phút cần 5/24/72 điểm, 10 phút cần 12/60/180 điểm, từ khoảng 17 phút trở lên dùng đúng bảng ⚠.

Các số giáp, lực là số tạm ⚠. **Biến hình theo cấp**, nên hình giờ gắn với sức mạnh. Cấp chỉ tính theo điểm; quà cho vũ khí, khiên và sao, không nâng cấp trực tiếp.

**Điểm là kinh nghiệm**, đơn vị phụ dùng để lên cấp và xếp hạng. Có điểm từ hai việc chính:

- **Thắng trận:** được đảm bảo 70% Sao Rơi của người thua, 30% còn lại phải tranh.
- **Nghỉ:** từ 3 giây không giao tranh trở đi (không trong trận, không chạy, không đuổi, không ở trong Sương), mỗi giây hồi 5 máu và 3 giáp. **Đầy cả máu lẫn giáp mới tích điểm**, 0,2 điểm mỗi giây ⚠.

Trứng và sao cảm ơn chỉ hồi máu, không cho điểm. Lệnh `Stop` là cách chủ động nghỉ, vì trong 5 giây đó không hút và không bị hút. Cần đo xem nghỉ có giúp người đứng yên leo hạng quá nhanh không ⚠.

**Lên hoặc xuống cấp đều về lại 100 máu và đầy giáp của cấp mới.**

Nhân vật to dần theo căn bậc hai của điểm, có trần để không che hết map. Người điểm cao nhất mỗi khu là **boss** của khu đó.

```
Máu khởi đầu = 100 + phần lẻ
Phần lẻ      = 0,99 − 0,01 × số phút đã qua của vòng khi vào (thấp nhất là 0)    người vào trước phần lẻ cao hơn
                hồi sinh tính là vào mới

Mỗi đòn      = Lực của người đánh × Nhịp × Bén × Lệnh     làm tròn LÊN số nguyên
Giáp đỡ      = Mỗi đòn × Giáp còn lại ÷ (Giáp còn lại + 40)   làm tròn lên, ít nhất 1 khi còn giáp, không quá giáp còn lại
Giáp mất     = Giáp đỡ
Máu mất      = Mỗi đòn − Giáp đỡ, ít nhất 1
Nhịp         = 1 + min(1, tim trong 5 giây ÷ 30)                                     từ 1 đến 2 ⚠
Bén          = hệ số vũ khí đang cầm (không có vũ khí = 1)
Lệnh         = 1,5 ở đòn đầu sau X hoặc đuổi kịp bằng V; 2 nếu X trúng người đang đuổi; 1,5 sau khi đứng đủ B
```

- **Đánh tầm xa, không cận chiến.** Hai bên vào **tầm bắn** (9 đơn vị, cộng thêm theo cỡ nhân vật) là khóa cặp, đứng tại chỗ, **3,6 giây bắn một nhịp** (chậm để người xem kịp thấy hiệu ứng, chiêu và thoại ⚠). Chỉ người cùng khu mới khóa cặp, trừ khi đang đuổi hoặc cả hai từ 30 điểm.
- **Mỗi loại một đòn:** dòng lửa thổi lửa · người ném phi tiêu · ma trơi ném bóng · Cún Tro phun tro · Mầm Cây bắn hạt ⚠ (hai loại cuối là đề xuất).
- **Giáp chắc chắn hao, máu chắc chắn mất.** Giáp càng cao càng đỡ được phần lớn đòn nên máu tụt chậm và ít; giáp vỡ thì trúng bao nhiêu đau bấy nhiêu. Cấp thấp bắn cấp cao vẫn luôn làm mất ít nhất 1 giáp và 1 máu, không có đòn vô hại (trừ Khiên từ quà).
- Giáp hồi khi nghỉ, khi đổi cấp, hoặc khi ăn Sao Rơi.
- **Trừ phần nguyên trước, phần lẻ sau.** Đòn và máu mất luôn là số nguyên nên `100,99` chỉ tụt phần nguyên, tới `0,99` mới là chút máu cuối, đòn tiếp theo mới hết. Trận vì thế ngắn và người mạnh càn quét nhanh.
- **Người bị đánh** là người ít máu hơn trong cặp: có **mũi tên đỏ nhấp nháy trên đầu** để phân biệt với người đang đánh. Bằng máu thì tính người vào sau. Cả hai vẫn bắn nhau, để người yếu có quà hoặc tim vẫn lật được kèo.
- Tụt dưới **30% máu đầu trận** là **tự bỏ chạy**. Lọt lại vào tầm bắn của người đang đuổi thì trúng một đòn; cạn máu thì chết.
- Cùng về 0 trong một nhịp: ai dư cao hơn thì sống với `0,01`; bằng nhau nữa thì người vào sớm hơn (tính theo giây, không hiện ra).
- **Thua là rơi sao: 70% tự bay về người hạ gục và được cộng ngay ⚠, 30% rơi tại chỗ, phải đi gần mới ăn được.** Phần thưởng `5 + 50% điểm kẻ thua`, `50% máu đầu trận của kẻ thua` và `25% máu đầu trận` quy ra giáp được chia đều thành **1–12 Sao Rơi** quanh chỗ kẻ thua gục (cứ 3 điểm một sao). **Ai tới trước ăn trước**; người hạ được 3 giây chỉ đi nhặt, không vào trận mới, nhưng người khác vẫn có thể cướp. Máu không vượt trần. Sao Rơi không tính vào số sao hóa vũ khí. Kẻ thua vừa hồi sinh dưới 30 giây thì chỉ rơi 1 sao +1 điểm, không hồi máu, để không nuôi người yếu lấy điểm ⚠. Chết vì Sương thì rơi sao bằng nửa điểm bị mất. Người thua không ăn được sao của chính mình.
- **Thua ở cấp 2 trở lên:** không văng khỏi sân. **Tụt đúng 1 cấp**, điểm còn một nửa (nằm trong khoảng điểm của cấp mới), về 100 máu, đầy giáp của cấp đó, được bảo vệ 2 giây rồi đánh tiếp. Boss to vì vậy có thể thua người nhỏ mà chưa bị loại.
- **Chết:** chỉ xảy ra khi cấp 1 hết máu. Mất một nửa điểm, thả 5 tim để hồi sinh với 100 máu nhưng **chưa có giáp**, nên vẫn yếu như mới nở cho tới khi nghỉ, nhặt sao hoặc lên cấp.
- **Tim:** còn sống thì tim làm đòn mạnh hơn (Nhịp), không cộng máu ⚠. Chết rồi tim mới thành máu.

### Hồi Sức sau khi thắng

Hạ được đối thủ (làm đối thủ out hoặc tụt cấp) thì người thắng được **Hồi Sức 30 giây**: không ai chọn làm mục tiêu được, kể cả lệnh `Đuổi`, `Z` và đòn lan. Trong lúc đó nhân vật cũng không đánh ai và không ăn trứng, vẫn nhặt Sao Rơi, vẫn hồi 5 máu và 3 giáp mỗi giây, đầy thì tích điểm như nghỉ thường. Trên tên có dấu ☾. Thắng khi vẫn đang trong một trận khác (do đòn lan hoặc phản đòn) thì chưa tính ⚠.

### Vòng Bảo Vệ

- Ai cũng có. **Tự bật** sau mỗi 4 phút kể từ lúc nở hoặc lần bật trước, không cần gõ lệnh.
- Trong **8 giây** không ai tấn công được, kể cả đòn lan và lệnh đuổi; hết giờ thì **tự mờ dần rồi biến mất**.
- Trên không không có vòng. Đang đánh thì chờ đánh xong mới bật, để không cắt ngang trận ⚠.
- Trong lúc có vòng thì nhân vật cũng không đánh ai ⚠, nhưng vẫn nhặt sao và vẫn hồi khi nghỉ. Sương vẫn trừ máu.

### Giờ nghỉ giải lao

Khi **25 giây không có quà** hoặc trên sân **từ 6 người trở xuống** ⚠, sân đánh trước 54 giây rồi nghỉ 6 giây, lặp lại ⚠. Có quà là hết nghỉ ngay.

Trong lúc nghỉ, nhân vật không vào trận mới và không ăn trứng, vẫn nhặt sao, vẫn hồi và tích điểm như nghỉ thường. Mỗi nhân vật ngẫu nhiên làm một việc, có bong bóng lời ngắn và MC dẫn:

| Trò | Hành động | Lời ví dụ |
|---|---|---|
| Đánh rắm | Xịt khói xanh sau lưng | "Pòòòt~", "Ai vừa đánh rắm?" |
| Khoác lác | Đứng ưỡn người | "Một mình anh chấp hết!", "Sợ chưa?" |
| Nói sảng | Đi vòng tròn | "Con cá biết bay kìa", "Ai lấy dép của tui?" |
| Than phiền | Xụi người | "Sân vắng ghê", "Mỏi chân rồi" |
| Hút thuốc lào | Khói bay trên đầu; **chỉ nhân vật đã trưởng thành** (cấp 3, 4 phe Người) | "Rít phát cho tỉnh" |

Lời than chỉ than về sân và cơn buồn ngủ, **không xin quà, không giục tặng**. Bản thử chỉ làm điệu bộ bằng cách co giãn và lắc ảnh; muốn đẹp cần vẽ thêm bộ ảnh nghỉ cho từng nhân vật.

### Phe

- Phe lấy theo loại nhân vật lúc nở, có vòng màu dưới chân: **Lửa** (Đốm Ngoạm), **Tro** (Cún Tro), **Cây** (Mầm Cây), **Ma** (Ma Trơi), **Người** (Cu Tí, Bé Na) ⚠. **Lên hay xuống cấp đều không đổi phe**: nhân vật giữ đúng loại lúc nở. Loại chưa vẽ dòng tiến hóa riêng thì giữ hình của loại đó ở mọi cấp, không mượn hình loại khác.
- **Cùng phe trong phạm vi 24 đơn vị thì không tấn công nhau** ⚠: không khóa cặp, không nhắm bằng `Đuổi` hoặc `Z`, không dính đòn lan. Tầm bắn và tầm lệnh đều nhỏ hơn hoặc bằng 24, nên ở mốc 1 cùng phe không bao giờ đánh nhau.
- **Càng về cuối, tỉ lệ hòa trong cùng phe càng giảm và họ bắt đầu tấn công nhau** ⚠: mốc 1 hòa 100%, mốc 2 hòa 75%, mốc 3 hòa 50%, mốc 4 hòa 25%, mốc 5 hòa 0%. Mỗi cặp bốc lại sau mỗi 5 giây. Khi đã được đánh nhau, nhân vật vẫn ưu tiên người khác phe trước. Trên sân chỉ còn một phe thì hết hòa ngay, để vẫn tìm được quán quân.
- **Khác phe được ưu tiên:** nhân vật tìm người khác phe trong bán kính 18 đơn vị, từ 30 điểm là 24 đơn vị. Hai người **cùng cấp**: một bên chọn mục tiêu thì bên kia nếu đang rảnh cũng quay sang và **cùng chạy lao vào nhau** để sớm vào tầm bắn. Khác cấp thì không kéo bên kia quay lại, để cấp cao còn đi tìm người cùng cấp.

### Hợp Công

- Khi đồng đội đang đánh người khác phe, người cùng phe đang rảnh trong bán kính 18 đơn vị tự chạy tới. Vào tầm bắn thì đứng lại **bắn cùng vào đối thủ đó**, mỗi nhịp một phát, để tiêu diệt hoặc đánh tụt cấp nhanh hơn. Hai bên đều có thể gọi đồng đội.
- Mỗi người góp **50% đòn thường** (không có chiêu), vẫn trừ giáp và máu như thường. **Mỗi bên tối đa 3 người góp** ngoài người đang đánh ⚠.
- Không góp khi đang chạy, đang đuổi, đang đứng, đang nhặt sao, hoặc đang có Vòng Bảo Vệ. Không có hợp công khi hai bên cùng phe.
- **Chia điểm theo phần đã góp** ⚠: yếu tố là tổng giáp và máu mỗi người đã làm đối thủ mất trong trận. Khi đối thủ thua, người góp được cộng thẳng phần điểm của mình; phần của người đánh chính vẫn rơi thành Sao Rơi, ai tới trước ăn trước.
- **Bị phản đòn theo giáp còn lại của đối thủ** ⚠: mỗi nhịp, người góp đòn nhiều nhất bị phản một phát `Lực của đối thủ × Giáp còn ÷ Giáp tối đa`, ít nhất 1. Đối thủ còn đầy giáp thì vây đánh rất đau; phá giáp xong thì gần như không sao. Người góp vẫn được giáp của mình đỡ như thường, hết máu thì tụt cấp hoặc văng.

### Cùng cấp tìm nhau

Nhân vật ưu tiên tìm người **cùng cấp**, để cấp cao đấu với nhau và nhường sân cho cấp thấp. Từ cấp 2, tầm tìm người cùng cấp là 40 đơn vị và được đi sang khu khác. Đang trên đường tới người cùng cấp thì chưa vào trận với cấp khác, trừ khi đang đuổi. Không có ai cùng cấp trong tầm thì đánh người gần nhất như thường ⚠.

### Vùng giao chiến trên không và mặt đất

**Toàn sân chỉ một trận trên trời mỗi lúc, tối đa 5 người** (ví dụ 3 đấu 2): hai người khóa trận, đồng đội gần đó bay lên góp sức, mỗi bên tối đa 3 người. Xong trận nghỉ 135 giây mới có trận khác bay để có nhịp thở ⚠. Khi trời đang trống, trận hai boss được lên trời, các trận từ cấp 2 trở lên có khoảng 30% cơ hội lên trời ⚠. Kỹ năng di chuyển bay cũng chỉ dùng được khi trời đang trống. Hai bên **bay lên chậm tới tầng trời rất cao**, từ đó nhìn xuống thấy người dưới đất bé xíu, trời và mặt đất cách xa nhau rõ ràng, mỗi người cưỡi một linh thú bay ảnh động: rồng, bạch hổ, sư tử thần, tiên hạc, kỳ lân, Huyền Vũ (rùa thần đuôi rắn), phượng hoàng, hoặc mọc cánh sau lưng, thú nào cũng có hào quang; vẽ theo phong cách game đồ họa cao cấp, không bóng nhựa. Lên trời thì nhân vật nhỏ lại để dễ xem. **Linh thú bay từ ngoài khung vào đón nhân vật** khoảng 2,4 giây, luôn nằm ngang thẳng, nhân vật đứng lên lưng rồi mới cất cánh. Cảnh cất cánh giống truyền hình, lên và xuống đều rất chậm (khoảng 10 giây) để camera theo kịp: bay lên có tăng tốc rồi chậm dần, bụi cuốn dưới đất, gió lướt qua, tới nơi thì lơ lửng nhẹ; camera đặt thấp nhìn lên lúc cất cánh rồi nâng theo. **Camera quay thẳng góc ngang như xem video ngay từ lúc cất cánh**, không xoay, không nghiêng, rộng đủ thấy cả người bị đánh. Khi có trận trên trời, camera chuyển sang trận đó và giữ đến khi có người out. Người đang bay luôn quay mặt về camera, không quay lưng.

- Trận **trên không** kéo dài **ít nhất 1 phút** rồi đánh đến khi có người bị out: không được bỏ chạy, ai hết máu ở cấp cao thì tụt cấp và đánh tiếp ngay trên trời. Đánh chậm hơn (2 lần nhịp thường); phút đầu **mỗi đòn chỉ trừ một nửa** (dưới đất trừ 1 thì trên trời trừ 0,5), phút thứ hai trừ bình thường, sau đó gấp đôi để trận không kéo dài vô tận ⚠.
- Trận **trên không**: đồng đội trong bán kính 24 đơn vị bay lên góp sức, đủ 5 người thì người khác không vào được; đòn lan chỉ trúng người cùng tầng.
- Trận **mặt đất**: Hợp Công và đòn lan như thường.

### Di chuyển theo phe

Mục tiêu còn xa hơn 10 đơn vị thì nhân vật dùng kỹ năng di chuyển riêng của phe: 2 giây, tốc độ gấp 2,4 lần, 9–12 giây một lần ⚠. Đang di chuyển kiểu này thì chưa vào trận.

| Phe | Kỹ năng | Kiểu |
|---|---|---|
| Lửa | Tên Lửa Mông | Bay lên trên phương tiện bay, xịt lửa sau lưng |
| Tro | Cún Đói Phóng Nhanh | Phóng nhanh, bụi bay sau lưng |
| Cây | Lướt Trên Lá | Lướt nhanh, lá bay theo |
| Ma | Lướt Khói Hồn Nhiên | Lướt nhanh, kéo vệt khói xanh, không tàng hình |
| Người | Xe Bay Hạng Sang | Đứng trên phương tiện bay |

### Chiêu thức theo cấp

Cấp càng cao càng có nhiều chiêu và hiệu ứng đòn đánh. Chiêu tự ra theo vòng, mỗi trận bắt đầu lại từ đòn thường; người xem không phải gõ ⚠.

| Cấp | Vòng chiêu | Hệ số | Hiệu ứng |
|---|---|---|---|
| 1 | Đòn thường | ×1 | Một đạn theo loại nhân vật |
| 2 | Thêm chiêu đôi | ×1,3 | Bắn liền hai món |
| 3 | Thêm chiêu nổ | ×1,6 | Đạo cụ khổng lồ, nổ vòng lớn; lan nửa đòn sang 1 đối thủ gần đó |
| 4 | Thêm tuyệt kỹ | ×2,2 | Đạo cụ mưa từ trên trời, chớp sáng và rung camera, MC hô tên chiêu; lan nửa đòn sang mọi đối thủ trong bán kính 8 |

**Chiêu phải hài, kiểu meme Việt** ⚠:

| Loại | Chiêu đôi | Chiêu nổ | Tuyệt kỹ |
|---|---|---|---|
| Người | Phi Dép | Bánh Mì Thần Chưởng | Mẹ Gọi Về Ăn Cơm (mưa chổi lông gà) |
| Lửa | Ợ Lửa | Bắp Rang Nổ | Mì Cay Cấp 7 |
| Tro | Hắt Xì Tro | Xương Bay | Cún Đòi Ăn |
| Cây | Phun Hạt Dưa | Dưa Hấu Rơi | Mưa Sầu Riêng |
| Ma | Hù! | Ma Trêu | Ma Đòi Nợ |

Trúng đòn có chữ truyện tranh ("BỐP!", "RẦM!", "TOANG RỒI!"). Người trúng chiêu bị lắc, có sao quay trên đầu và kêu ca bằng bong bóng lời; người ra chiêu hô tên chiêu.

Nhân hệ số chiêu vào `Mỗi đòn`. Đối thủ bị lan đòn vẫn trừ giáp và máu như thường. Các ví dụ bên dưới chỉ tính đòn thường.

### Bị hút

Nhân vật tự tìm mục tiêu trong bán kính hút, gồm trứng, sao và nhân vật khác; càng gần càng lao nhanh. Thứ tự ưu tiên cố định: **nhặt sao và vật phẩm trước, rồi mới đánh, cuối cùng mới ăn trứng.** Đang đi nhặt sao thì chưa vào trận mới, trừ khi đang bị lệnh đuổi.

### Ví dụ (tính tay)

| Trận | Diễn biến | Kết quả |
|---|---|---|
| Cấp 1 gặp cấp 1, không ai thả tim | Đòn 20 và 20 | Giáp tụt `20 → 13 → 8 → 4 → 2 → 1`, máu tụt `87 → 72 → 56 → 38 → 19`: tự chạy ở nhịp 5, khoảng 18 giây |
| Cấp 1 thả tim đủ gặp cấp 1 không thả | Đòn 40 và 20 | Người không thả máu `74 → 40 → 0`, gục ở nhịp 3; người thả tim còn 56 máu, 4 giáp |
| Cấp 4 gặp cấp 1 | Đòn 65 và 20 | Cấp 1 mất 45 rồi 65 máu, gục ở nhịp 2. Cấp 4 **vẫn mất 30 giáp và 10 máu** |
| Cấp 3 gặp cấp 2 | Đòn 45 và 30 | Cấp 2 máu `78 → 47 → 5`, giáp vỡ, tự chạy ở nhịp 3. Cấp 3 còn 61 máu, 19 giáp |
| Người vừa hồi sinh (giáp 0) gặp cấp 1 | Đòn 20 | Không có giáp nên mất đủ 20 máu mỗi đòn, tự chạy ở nhịp 4 còn 20 máu |
| Cấp 4 có 400 điểm thua người nhỏ | Hết máu | Tụt xuống cấp 3 còn 200 điểm, 100 máu, 70 giáp, đánh tiếp; rơi 12 sao tổng 205 điểm |
| Cấp 1 có vũ khí ×10 và khiên gặp cấp 4 | Đòn 200; khiên chặn đòn 65 | Cấp 4 mất sạch 110 giáp và 90 máu trong một nhịp, còn 10 máu, tự chạy: quà lật được kèo |

Các số trong bảng là máu. **Mỗi đòn mất tối đa 34 máu** để trận nào cũng đủ vài nhịp cho người xem kịp theo dõi ⚠; các ví dụ trên chưa tính giới hạn này. Mọi điểm và máu thưởng đều nằm trong Sao Rơi, người khác cướp được.

---

## 6. Lệnh gõ

Cả bình luận phải đúng bằng lệnh (bỏ qua hoa thường). Người chơi dùng điện thoại nên **không có phím bấm thật**, lệnh là bình luận. Dấu cách không dùng được vì cầu nối bỏ bình luận rỗng, thay bằng `Stop`.

| Lệnh | Tác dụng | Dùng được khi | Hồi lệnh |
|---|---|---|---|
| `Chạy` | **Bỏ chạy** 5 giây, tốc độ +25%, tự tìm hướng | Đang đánh hoặc bị đuổi; trong trận thì đối thủ được một đòn miễn phí | 15 giây |
| `Đuổi` | **Đuổi** 4 giây, tốc độ +100%, nhắm người vừa chạy khỏi mình; vào tầm bắn là trúng một đòn | Có người trong tầm 16 đơn vị | 12 giây |
| `X` | **Quay lại giao chiến** | Đang chạy | 10 giây |
| `Stop` | **Đứng lại** 5 giây: không hút, không bị hút, chỉ `Đuổi` nhắm được; sau đó tự bị hút vào trứng, sao hoặc nhân vật gần nhất | Không trong trận | 15 giây |
| `Z` | **Săn đối thủ lớn** 9 giây, tốc độ +50%: nhắm boss hoặc người điểm cao hơn mình gần nhất **trong tầm 24 đơn vị**; ngoài tầm thì lệnh không có tác dụng | Từ 20 điểm, không trong trận | 20 giây |
| `Măm măm`, `Ăn` | **Đi ăn** 6 giây, nhanh gấp 2,4 lần: lao tới đồ ăn gần nhất, ăn xong tự tìm món kế tiếp, trên đường không bị hút vào trận | Không trong trận | 15 giây |
| `t tên` | **Nhắm đánh** người có tên đó trong tầm 24 đơn vị: chạy tới và vào trận. Không nhắm được người cùng phe đang hòa, người có Vòng Bảo Vệ hoặc đang Hồi Sức | Không trong trận | 15 giây ⚠ |
| `p2` | Sang phòng 2 khi kênh đông mở nhiều phòng song song | Không trong trận, không đang chạy | 20 giây |
| `đâu` | **Camera chuyển đến vị trí của mình 6 giây**, kèm mũi tên chỉ nhân vật | Luôn | Mỗi người 60 giây; cả phòng tối thiểu 8 giây một lần ⚠ |

Ba lệnh khắc nhau: **`Đuổi` bắt `Chạy`, `X` phạt `Đuổi`, `Chạy` tránh `X`**.

Độ trễ bình luận chưa đo ⚠, nên lệnh là "thế" kéo dài vài giây, `Đuổi` và `X` nhớ đối thủ trong 10 giây. Trứng chưa nở gõ lệnh thì hiện chữ "Thả tim để nở". Chữ phản hồi hiện nhỏ trên nhân vật, không đọc giọng.

**Tự tìm hướng chạy.** Mỗi 0,3 giây chấm điểm 12 hướng: càng xa kẻ đe dọa càng tốt, chỗ trống được cộng, sát tường hoặc Sương bị trừ, giữ hướng cũ được cộng nhẹ. Kẹt quá 1,5 giây thì tự húc ra khe hở gần nhất.

---

## 7. Quà tặng

Tính theo **tổng xu của cả chuỗi** (`xuEach × count`), không theo tên quà. Quà nhấn giữ chỉ về khi kết thúc chuỗi, nên combo dài có độ trễ.

Mỗi chuỗi quà bốc một lần. **Giá trị luôn tương xứng số xu, ngẫu nhiên chỉ quyết định loại.** Tỉ lệ công khai trên màn hình.

| Tổng xu | Ra vũ khí + khiên | Ra sao |
|---|---|---|
| 1–9 | 30%: Dao ×1,5, bền 5 | 70%: 2 sao |
| 10–99 | 50%: Kiếm ×3, bền 10, khiên 2 đòn | 50%: 5 sao |
| 100–999 | 70%: Đại đao ×6, bền 15, khiên 5 đòn | 30%: 12 sao |
| từ 1.000 | 100%: Thần binh ×10, bền 25, khiên 10 đòn | Kèm 12 sao |

Con số tạm ⚠. **Không có trần sức mạnh:** vũ khí hao mòn nên muốn thắng tiếp phải tặng tiếp, hai bên đua quà chính là kịch tính.

- **Bảo đảm:** 3 lần liền không ra vũ khí thì lần sau chắc chắn ra.
- **Tăng vũ khí:** ra vũ khí cao hơn thì thay; ra thấp hơn thì cộng độ bền cho cái đang cầm.
- **Hao mòn:** mỗi đòn trúng trừ 1 độ bền. Hết bền thì mất vũ khí. Vũ khí hết tác dụng khi hết phiên.
- **Người tặng chết hoặc offline:** quà giữ lại, quay về map mới bung ra.

### Sao: lời cảm ơn tung cho cả phòng

Quà của người xem được kênh **cảm ơn bằng cách tung sao cho tất cả**, nhưng **người tặng được ưu tiên**:

- Sao rơi thành vòng cách người tặng khoảng 150 px, lơ lửng 1 giây, rồi tự bay về họ khoảng 120 px/giây. Có **khoảng 2,25 giây để cướp**.
- **Sao chỉ tồn tại 3 giây** kể từ khi rơi xuống sàn, mờ dần ở 1,5 giây cuối.
- **Sao cảm ơn có giới hạn để tài nguyên co cụm** ⚠: mỗi quà tung tối đa 12 sao, trên sân cùng lúc tối đa 20 sao cảm ơn, sao rơi sát quanh người tặng. Sao Rơi của người thua không tính vào giới hạn này.
- **Về cuối phiên sao cũng thưa dần** ⚠: trên sân từ 20 giảm còn 3 sao cảm ơn, mỗi quà từ 12 giảm còn 3 sao, Mưa Cảm Ơn còn khoảng 30% số món. Sao Rơi của người thua vẫn giữ nguyên vì là phần thưởng thắng trận.
- Mỗi sao **+5 máu**, cố định. Ai chạm trước người đó được. Trứng thì nhận sao để nở sớm: 1 sao bằng 5 tim.
- Sao hút cả người đứng gần, tạo tranh chấp ngay quanh người tặng.

Vũ khí và khiên chỉ thuộc về người tặng. Không có quy đổi ra tiền.

**Sao hóa vũ khí.** Mỗi lần nhặt đủ **10 sao** (mọi loại sao) thì tự hóa thành Dao ×1,5 bền 5; đủ 30 sao thì thành Kiếm ×3 bền 10 ⚠. Người không tặng quà, nhân vật còn nhỏ, chỉ cần may mắn nhặt được sao cũng có vũ khí.

### Mưa Cảm Ơn: vật phẩm cho cả phòng

Mỗi chuỗi quà, ngoài phần của người tặng, còn tung vật phẩm ngẫu nhiên cho cả phòng. Số vật phẩm theo tổng xu, loại vật phẩm bốc theo tỉ lệ công khai:

| Tổng xu | Số vật phẩm |
|---|---|
| 1–9 | 3 |
| 10–99 | 6 |
| 100–999 | 10 |
| từ 1.000 | 14 |

Vật phẩm rơi tập trung quanh người tặng để mọi người phải kéo về đó ⚠.

| Vật phẩm | Tỉ lệ | Tác dụng |
|---|---|---|
| Sao Đồng | 40% | +2,5 máu |
| Sao Bạc | 25% | +5 máu |
| Sao Vàng | 10% | +10 máu |
| Bình Máu | 8% | +20 máu |
| Khiên Giấy | 6% | Chặn 1 đòn |
| Đá Mài | 5% | +3 độ bền; chưa có vũ khí thì được Dao ×1,5 bền 3 |
| Giày Gió | 4% | Tốc độ +30% trong 6 giây |
| Nam Châm | 2% | Hút vật phẩm xung quanh trong 8 giây |

Con số tạm ⚠.

**Người gõ cảm ơn được ưu tiên.** Sau khi có quà mở **cửa cảm ơn 8 giây** ⚠ (độ trễ bình luận chưa đo, có thể phải dài hơn). Bình luận có `cảm ơn`, `cam on`, `thanks`, `tks` được tính; mỗi người một lần cho mỗi quà.

- Hết cửa, **đợt 1** bay tới người đã cảm ơn ngay; **đợt 2** cho những người còn lại sau 3 giây nữa.
- Mỗi vật phẩm chọn người nhận theo trọng số: **đã cảm ơn = 3**, chưa cảm ơn = 1. Người đã cảm ơn vừa có trước, vừa nhiều khả năng trúng hơn.
- Vật phẩm đang bay vẫn cướp được.
- Một người nhận tối đa khoảng 1 phần thưởng ưu tiên mỗi 20 giây ⚠, để không có ai chỉ spam cảm ơn là thắng.

Việc này khiến khung chat đông hơn sau mỗi món quà; tác động tới phân phối của TikTok chưa kiểm ⚠.

---

## 8. Map và tự động chuyển cấp

Một buổi chỉ có một màn hình, nên game dùng **một sân đấm bốc rộng chia 4 khu nối nhau** và camera chạy theo trận. Mỗi khu có boss riêng gom điểm.

**Mọi map đều là sân đấm bốc hình chữ nhật:** bốn cột góc, ba lớp dây quây kín 4 phía, sàn trơn một màu. **Trong sân không có vật cản hay đồ trang trí**, chỉ có nhân vật, trứng, sao và vật phẩm của game, để không chiếm chỗ và không che trận.

**Máu và giáp hiện bằng thanh, không hiện chữ số.** Một thanh ngang chia đôi: nửa trái màu đỏ là máu, nửa phải màu xanh là giáp. Hiện trên đầu người trong top, nhân vật của mình và mọi người đang đánh.

**Bố cục tự động theo số người** ⚠, vì khách có thể rất đông. Sân tự chia thành các ô, số ô tăng theo số nhân vật (khoảng 3 người một ô, ít nhất 8 ô).

- **Mỗi ô tối đa 1 trận** đang diễn ra, trận mới phải tìm ô khác.
- Ô chỉ tính trên phần sân chưa bị Sương phủ. Ô nào quá đông thì người đang rảnh tự chạy sang ô thưa gần nhất, từ 24 người trở lên thì ô trống cũng kéo một người rảnh từ ô đông tới ⚠; người đi lấp ô vẫn đánh được dọc đường.
- Người mới và người hồi sinh xuất hiện ở chỗ thưa nhất trên sân.
- **Nhịp nghỉ:** cứ 5 giây hoạt động, nhân vật không trong trận nghỉ 1,5 giây ⚠: không tìm mục tiêu, không vào trận và tự dạt khỏi chỗ đông. Mỗi người lệch nhịp nhau để sân không đứng hình cùng lúc.
- **Giới hạn người cùng nhắm:** một mục tiêu đang rảnh chỉ có tối đa 2 người nhắm, đang trong trận 3 người, một quả trứng vàng 2 người ⚠.
- Sân quá đông thì nhân vật tự thu nhỏ để vẫn vừa sân (bắt đầu thu từ khoảng 230 người).

**Tên và ảnh đại diện hiện theo nhịp, so le** ⚠: mỗi lượt 2,5 giây chỉ khoảng 6 nhân vật được hiện, người thì tên, người thì ảnh, lần lượt xoay vòng. Nhân vật của mình và người camera đang theo luôn hiện tên. Thanh máu, giáp vẫn hiện với người đang đánh.

**Chữ phủ không được che thoại** ⚠: thông báo nở trứng, lên cấp, nhận quà không hiện giữa màn hình, chỉ dùng bong bóng lời và MC. Chỉ sự kiện lớn (hai boss đại chiến, giờ nghỉ, đổi chiến trường, quán quân) mới có chữ lớn, đặt cao và nhỏ gọn. Nhãn gõ cảm ơn thu nhỏ ở góc.

**Nhân vật đứng giãn nhau.** Mỗi nhân vật giữ khoảng cách theo đúng bề rộng ảnh nên hạn chế chồng đè; người lớn cần nhiều chỗ hơn. Người đang rảnh tự dạt khỏi đường bắn của trận đang đánh, để đòn và chiêu nhìn rõ ⚠.

| Khu | Ai ở đây | Ngưỡng tự lên |
|---|---|---|
| **Sân Tro** (đầu map) | Tất cả | Đủ **20 điểm** → Khu Gió |
| **Khu Gió** | Người đủ điểm | Đủ **100 điểm** → Khu Đuốc |
| **Khu Đuốc** | Người đủ điểm | Đủ điểm cao → Đỉnh Đèn |
| **Đỉnh Đèn** (cuối map) | Người còn tranh suất; nơi đấu cặp | — |

Đủ ngưỡng thì cổng mở trên đầu, bay lên trong 3 giây; đang trong trận thì đánh xong mới bay (bản chơi thử chưa có phần tự bay). Ngưỡng là con số tạm, có thể nhân hệ số theo lượng tim của kênh ⚠.

**Map tự thu hẹp về cuối.** Sương đi từ đầu map tiến dần, dồn mọi người về phía Đỉnh Đèn; sân ngắn lại nhưng vẫn là hình chữ nhật. Boss có điểm cao hút nhau từ xa hơn, nên càng về cuối các boss càng dễ gặp nhau.

**Một phòng TikTok khác thì không chuyển tự động được:** phần mềm không đẩy được người xem sang kênh khác. Chuyển map diễn ra trong một buổi live.

### Bốc map (Thiên Cơ)

Đầu mỗi vòng có màn cuộn hình 5 giây rồi hiện map mới:

```
Map = 1 nền (màu sàn, ánh sáng) × 1–2 khối luật + thông số lệch ngẫu nhiên
```

9 nền × 21 cách chọn luật (6 + 15 cặp) = **189 tổ hợp**, trừ vài cặp không chơi được. Không lặp nền của 3 lần gần nhất. Map thấp chỉ dùng cặp nhẹ. Nền chỉ đổi màu sàn và ánh sáng, không thêm vật thể trong sân.

**Bối cảnh:** sân đấu đặt trên mặt đất trải tới chân trời, không lơ lửng; mỗi nền có bầu trời, mặt đất và màu sàn riêng. Mỗi lần sang mốc mới, màn hình tối dần rồi hiện chiến trường khác trên cùng sân ⚠.

**Nền:** Đêm Trăng Rằm · Đồi Hoàng Hôn · Thành Mây · Vịnh Bão · Sân Trống · Bến Sương · Chợ Đèn Đêm · Hành Lang Gió · Rừng Đom Đóm (tối) · Hồ Sen Băng (trơn) · Điện Cột Lửa · Vực Mây (sàn sụp) · Đài Thiên Đăng (đấu cặp). Để dành cho mùa: Phố Lồng Đèn, Vườn Đào.

**Khối luật** (ghép bằng dữ liệu, thêm nền không sửa lõi): `gio` đẩy theo hướng · `tron` quán tính · `toi` che tầm nhìn · `moi` rải đồ ăn · `bay` vùng gây sát thương theo nhịp · `sup` sàn biến mất dần.

Ở trong Sương Lạnh mất 1% máu mỗi giây.

Gói một map: `id`, `ten`, map cấp được bốc vào, ảnh nền, số chỗ, khối luật cho phép.

---

## 9. Màn hình

Khổ 1080×1920. TikTok không công bố vùng che của LIVE; các nguồn ngoài chỉ thống nhất **một phần ba dưới có bình luận** và **cột phải có nút** ⚠.

```
y=0     (TikTok che: tên kênh, số xem)
y=220   Mốc hiện tại, đồng hồ, top 5 theo điểm
y=300   Toàn màn hình là map 3D; camera theo boss
y=1280  Bản đồ nhỏ góc phải; phần dưới có bình luận phủ mờ ⚠
y=1640  Dòng nhắc: thả tim để nở · Chạy · Đuổi · X đánh · Stop · Z săn
```

**Camera** lướt chậm, chuyển mục tiêu và đổi độ xa đều mượt, xoay chậm quanh trận đang quay và **bám theo một nhân vật đến khi chính nhân vật đó bị out khỏi sân**, nán thêm khoảng 1,6 giây để thấy sao rơi, rồi chọn người mới, ưu tiên người trong trận có boss và điểm cao. Tụt cấp, bỏ chạy, hạ được đối thủ hay đang rảnh đều chưa đổi cảnh.

**Góc quay trận:** khi có giao chiến, camera lại gần và hạ thấp, đặt chéo khoảng 35 độ so với đường giữa hai bên để khung dọc 9:16 thấy trọn cả hai người và đường đạn. Người đứng chắn giữa camera và trận sẽ mờ đi ⚠.

**Hai boss đại chiến:** khi hai boss cùng từ cấp 2 đánh nhau, màn hình vào chế độ điện ảnh có hai dải đen trên dưới, hiện tên hai boss. Camera tự chuyển cảnh nhịp nhàng trên cùng sân, mỗi cảnh khoảng 8 giây, chuyển chậm để kịp xem: toàn cảnh chiến trường, góc phía sau boss thứ nhất, góc phía sau boss thứ hai, góc chéo cả hai, **luôn thấy đủ hai boss**; hết trận thì quay về nhân vật đang theo. Mỗi lần cách nhau ít nhất 25 giây ⚠.

**Quà điều khiển camera:** món quà chuyển cảnh (tạm: từ 1.000 xu) làm camera bám người tặng; nếu người tặng đã gõ `t tên` thì camera bám người bị nhắm, đến khi người đó out ⚠.

**Zoom giữ trong biên độ hẹp** ⚠: dưới đất camera luôn cách khoảng 36–50 đơn vị, trên trời 46–66 đơn vị, đổi rất chậm để không zoom ra vào liên tục.

**Nhịp nghỉ mắt** ⚠: để người xem dễ theo kịp, camera lùi ra toàn cảnh khoảng 8 giây rồi mới vào cảnh mới, lúc thì toàn sân đấu, lúc thì toàn cảnh bầu trời. Có nhịp này khi có người out, khi trận trên trời kết thúc, đầu giờ nghỉ giải lao và khi nhân vật đang quay rảnh lâu; các lần cách nhau ít nhất 25 giây. Đang toàn cảnh thì ẩn tên và không cận người nói.

Chỉ có hai trường hợp ngoại lệ: có người gõ `đâu` thì camera đến vị trí người đó 6 giây rồi **quay về đúng nhân vật đang theo**; nhân vật đang quay **bật Vòng Bảo Vệ** thì chọn người khác. **Không ai tranh camera thì cứ quay một nhân vật.** Nhân vật đó out thì chuyển sang **người tặng quà nhiều nhất** còn trên sân; chưa ai tặng quà thì mới chia đều lần lượt qua các phe. Người được quay nhờ quà rất ít khi out nên **chỉ được giữ camera khoảng 30 giây** (đang trận thì chờ hết trận, tối đa thêm 15 giây), rồi chuyển sang người tặng nhiều kế tiếp; hết danh sách thì xoay qua các phe ⚠. Quà thường không chuyển cảnh, chỉ **một món quà cụ thể** mới là lệnh chuyển cảnh, đến người tặng 8 giây (tạm: quà từ 1.000 xu, sau sẽ gắn đúng mã quà) ⚠. Mọi người xem chung một hình, nên không thể theo riêng từng người. Chấm nhận tim lóe sáng và hiện tên 2 giây.

---

## 10. Một phiên

Người live đặt **tổng số phút** trước khi bắt đầu, ở ô cấu hình của module, tối thiểu 30 phút. Phiên chia đều thành **5 mốc**, số người và map hẹp dần:

| Mốc | Tên | Người mới | Hồi sinh | Hết mốc |
|---|---|---|---|---|
| 1 | **Mở Cửa** | Vào tự do, thành trứng | 5 tim | — |
| 2 | **Siết Sương** | Vẫn vào được; Sương bắt đầu dồn từ đầu map | 5 tim | — |
| 3 | **Đóng Cửa** | **Không xuất hiện trên map nữa**; trứng chưa nở biến mất | 5 tim | Cắt còn **top N×4** theo điểm |
| 4 | **Không Hồi Sinh** | Không | **Không** | Cắt còn **top N** |
| 5 | **Trận Cuối** | Không | Không | Đấu cặp ở Đỉnh Đèn, ra quán quân |

| Tổng thời lượng | Mỗi mốc | N (số vào đấu cặp) | Số trận |
|---|---|---|---|
| Từ 120 phút | từ 24 phút | 8 | 7 |
| 60–119 phút | 12–23 phút | 4 | 3 |
| 30–59 phút | 6–11 phút | 2 | 1 |

Mỗi trận đấu cặp khoảng 3 phút kể cả nghỉ. Trong lúc live, người live có nút **vào đấu cặp ngay** để rút ngắn phiên.

Bản mặc định 120 phút, mỗi mốc 24 phút, khai mạc nằm trong 5 phút đầu của mốc 1, trao ngôi nằm trong cuối mốc 5.

Người bị cắt hoặc đến sau khi đóng cửa thành **khán giả cổ vũ**: không còn nhân vật trên map, tim dồn cho người mình cổ vũ (`ung 3`), hồ sơ vẫn lưu cho phiên sau.

Hồi sinh được ở ba mốc đầu nhưng về 100 máu không giáp và mất nửa điểm, nên giải vẫn hội tụ dù hồi sinh rẻ.

**Người offline** vẫn được tính top và giữ suất. Vào đấu cặp mà vẫn offline thì nhân vật tự đánh, vũ khí còn lại, không có sức từ tim.

Trận đấu cặp hết giờ mà chưa ai chết thì ai còn tỉ lệ máu cao hơn thắng.

---

## 11. Hồ sơ, cấp và phiên cấp cao

**Mã giải** do chủ kênh chọn khi mở live. Mỗi người trong mỗi giải có **một hồ sơ**.

- Vào đúng giải: lấy lại hồ sơ, hiện đúng cấp cao nhất đã đạt.
- Vào giải khác: hồ sơ mới, cấp 1.
- Hình nhân vật theo cấp hiện tại; cấp theo điểm cao nhất từng đạt, dùng để xếp hạt giống.

Lưu bằng sổ JSON `/s/so/dai-chien-thap-den/dai-chien`, cất định kỳ như module `do-chu`: hồ sơ theo người, cấp, thứ hạng, danh hiệu, các đoạn Sử Tháp. Máu và vũ khí không mang qua phiên.

**Khóa danh tính:** hiện cầu nối chỉ có nick (`displayId`). Đổi nick là mất hồ sơ, và người khác có thể lấy nick cũ để nhận vơ danh hiệu. Cần dùng mã số TikTok cố định; cần kiểm thư viện có cung cấp không ⚠.

### Phiên cấp cao

Không có nhân vật mới, chỉ các quán quân tham gia. **Máu về 5 như người mới, nhưng mang nhân vật đẹp hơn.**

| Hạng | Ai được vào | Nhịp |
|---|---|---|
| **Thường** | Tất cả, thời lượng do người live đặt | Mỗi phiên |
| **Bạc** | 7 quán quân trong tuần + 1 á quân thành tích tốt nhất | Mỗi tuần |
| **Vàng** | Quán quân và á quân của 4 tuần Bạc, đúng 8 người | Mỗi tháng |

Mặc định khoảng 50 phút, người live chỉnh được: 15 phút hỗn chiến để xếp cặp, 7 trận (khoảng 25 phút), khai mạc và trao giải.

Khán giả gõ `ung 3` để cổ vũ võ sĩ số 3: tim của họ dồn thành sức đánh cho võ sĩ đó, có giới hạn; quà của fan biến thành sao rơi quanh võ sĩ. Trứng ở phiên này không nở, chỉ là đồ ăn. Quán quân vắng thì nhân vật tự đánh.

Quán quân vẫn chơi phiên thường để khoe nhân vật, nhưng trong tuần đó không tính vào suất cắt top.

---

## 12. Bộ nhân vật

Mỗi map hoặc nhóm map có một bộ biến hình riêng, gom thành **thế giới** để không nhân chi phí với từng nền. Làm một thế giới trước. Nhân vật là người trưởng thành hoặc linh thú, tự sáng tác, tránh chữ trên áo vì hình bị lật gương.

**Biến hình theo cấp.** Đủ điểm kinh nghiệm là lên cấp, đổi hình, có hiệu ứng và MC gọi tên. Cấp quyết định Giáp và Lực như bảng ở mục 5. Cỡ nhân vật và hào quang thì theo điểm hiện tại.

**Một dòng tiến hóa** (đã vẽ thử dòng lửa bằng ChatGPT, 6 bộ ảnh): càng lên càng đứng thẳng và giống người, dạng cuối là người trưởng thành, trang phục hoạt hình thần thoại tự sáng tác:

| Điểm | Dạng | Hình ảnh |
|---|---|---|
| 0 | Sinh linh nhỏ (Đốm Ngoạm, Cún Tro, Mầm Cây, Ma Trơi, Cu Tí, Bé Na) | Tròn, biết đớp |
| 20 | Hỏa Linh | Sinh vật đứng hai chân ngắn |
| 100 | Hỏa Giáp Vệ | Cao lớn, gần giống người, giáp đá |
| 300 | Chiến Thần Lửa | Người trưởng thành, giáp sen, dải lụa, vòng lửa |
| 300 và đang có vũ khí | Chiến Thần cầm thương | Bộ hình riêng, có GIF tấn công |

Mỗi bộ gồm **6 góc** (trước, chéo, nghiêng, chéo sau, sau, thế phụ; góc bên kia lật gương). ChatGPT làm được **GIF 6 khung** trực tiếp, nên chuyển động chạy và tấn công lấy từ GIF, không cần MimicMotion cho dạng nhỏ; dạng lớn cần so chất lượng với MimicMotion ⚠. Trạng thái: đứng, chạy, tấn công và ăn. Nhân vật khi biến hình vẫn tự đi tìm mồi và đối thủ.

**Cách lưu ảnh** ở [nhan-vat/](nhan-vat/), mỗi bộ một thư mục, thêm nhân vật hoặc nhân bản phong cách chỉ cần thêm thư mục:

```
nhan-vat/<tên nhân vật>/<bộ ảnh>/
  goc0..5.webp      6 góc: trước, chéo, nghiêng, chéo sau, sau, thế phụ
  chay0..5.webp     (tuỳ chọn) khung chạy
  danh0..5.webp     (tuỳ chọn) khung tấn công
  goc-chatgpt/      ảnh gốc, để làm lại khi cần
```

Hiện có: `dom-lua/` (`so-sinh`, `hoa-linh`, `hoa-giap-ve`, `chien-than`, `chien-than-vu-khi`), `cun-tro/so-sinh`, `mam-cay/so-sinh`, `ma-troi/so-sinh`, `be-trai/so-sinh`, `be-gai/so-sinh`.

Danh sách nhân vật dự kiến cũ, chưa vẽ, để tham khảo cho các dòng khác:

| Mốc cũ | Nhân vật | Mô tả |
|---|---|---|
| 0 | **Sinh linh nhỏ**, ngẫu nhiên khi nở: **Đốm Ngoạm** (đốm lửa tròn biết đớp), **Cún Tro** (thú), **Mầm Cây** (cây cối), **Ma Trơi** (ma linh) | Tròn, mắt to, miệng đớp mở ngậm khi chạy; ai nở trứng cũng có. Tự sáng tác, không dùng hình Pac-Man vì đó là nhân vật có bản quyền |
| 10 | **Lính Đuốc** | Áo đỏ sờn, cầm đuốc |
| 50 | **Nữ Hiệp Đèn Lồng** | Áo tím, đèn lồng treo sau lưng |
| 200 | **Xích Giáp Vệ** | Giáp đỏ son, vai rồng |
| 500 | **Thanh Phong Kiếm Khách** | Áo xanh ngọc bay trong gió |
| 1.000 | **Kim Ô Tướng Quân** | Giáp vàng, cánh quạ lửa |
| 3.000 | **Băng Phụng Nữ Tướng** | Giáp bạc xanh, đuôi phượng băng |
| 10.000 | **Hỏa Long Đế** | Long bào lửa, rồng lửa cuộn quanh |
| Chỉ quán quân | **Người Giữ Đèn** và 3 mẫu khác | Không mua được bằng quà |

Ngưỡng là con số tạm ⚠. Mỗi nhân vật: 1 góc nghiêng (lật gương) × 3 hành động (đứng/chạy, đánh, trúng đòn). **Vũ khí là hình riêng gắn thêm**, phát sáng theo độ bền, để tránh MimicMotion làm méo. Nhân vật quán quân: 4 mẫu, phối màu, người thắng tự chọn; dùng cách ghép nét ở [10 §5b](../san-bar/nhan-vat/10-nhan-vat-anh-dong.md).

| Hạng mục (đợt đầu) | Số lượng | Công sức (ước tính) |
|---|---|---|
| ChatGPT: 7 nhân vật quà tặng một thế giới | 28 ảnh | |
| ChatGPT: 4 sinh linh nhỏ (2 hình mở, ngậm miệng) | 8 ảnh | Không cần MimicMotion |
| ChatGPT: 4 nhân vật quán quân | 16 ảnh | |
| ChatGPT: 9 nền × 2 lượt, 4 vũ khí × 2 lượt | 26 ảnh | |
| **Tổng ChatGPT** | **78 ảnh** | 4 đợt, ít nhất 3 lần chờ khoảng 10 giờ |
| MimicMotion | 21 + 12 = **33 đoạn** × 11–19 phút | **6–10,5 giờ GPU** nếu mỗi đoạn tốn như một góc 64 khung ⚠ |
| Mixamo | Chạy, đánh, trúng đòn | Phải tải thêm ⚠ |

File tạm trên hpc chỉ để trong `/mnt/D/dung-3d/.tmp`.

**Rủi ro lớn nhất: chưa thử MimicMotion với động tác đánh.** Làm thử một nhân vật, ba hành động trước. Nếu hỏng thì dùng 2–3 dáng tĩnh và lao tới bằng mã.

**Bộ nhớ.** `anh-dong.ts` giữ 12 khung theo đường dẫn ảnh, không theo người. Ở cao 1024 px: khoảng 28 MB mỗi ảnh, 33 đoạn ≈ 930 MB nếu giải hết. Nên giải ở cao 420 px (khoảng 4,8 MB mỗi ảnh, 33 đoạn ≈ 160 MB), chỉ cận cảnh đấu cặp mới dùng 1024 (số tính tay). Người cùng nhân vật phải **dùng chung đồng hồ khung**, nếu không 12 khung sẽ bị giải đi giải lại. Map 1 chỉ cho khoảng 5 nhân vật động mỗi khoang.

---

## 13. Lời MC

Đọc bằng hàng giọng chung (`say`), giới hạn tần suất. `{ten}` là tên người xem.

| Khoảnh khắc | Lời |
|---|---|
| Mở phiên | "Sử Tháp ghi lại, đêm qua: {doan_su}. Đêm nay, ai sẽ viết tiếp?" |
| Dạy lệnh | "Thả tim để nở! Gõ Chạy, Đuổi, X quay lại đánh, Stop đứng lại!" |
| Nở trứng | "Trứng của {ten} nứt rồi! Một chiến binh vừa ra đời!" |
| Trứng bị ăn | "Ơi {ten}, trứng của bạn bị cắn rồi, thả tim đi nào!" |
| Tự lên map | "{ten} đủ lửa rồi! Tháp đưa bạn lên {map}!" |
| Cảm ơn quà, tung sao | "Cảm ơn {ten}! Tháp tung sao cảm ơn cả phòng, sao bay về {ten} trước đó nha!" |
| Sao bị cướp | "Sao của {ten} bị {nguoicuop} cướp ngay trước mặt!" |
| Có vũ khí | "Cảm ơn {ten}! Khí giới đã về tay bạn: {vukhi}!" |
| Mở cửa cảm ơn | "Ai gõ cảm ơn {ten} sẽ nhận quà trước nha!" |
| Biến hình | "{ten} vừa biến thành {nhanvat}! Đẹp quá cả nhà ơi!" |
| Lật kèo | "Trời ơi! {ten} vừa lật kèo {doithu}!" |
| Vào trận | "{nguoidanh} gặp {nguoibidanh}, căng à nha!" |
| Đang đánh | "Một món nữa của {nguoidanh} bay tới {nguoibidanh}!" |
| Giáp vỡ | "Áo giáp {nguoibidanh} bung nút rồi!" |
| Tung chiêu | "{nguoidanh} tung {tenchieu} về phía {nguoibidanh}, cười xỉu!" |
| Phản đòn | "{nguoibidanh} trả lại dép cho {nguoigop}!" |
| Hợp công | "Họp lớp! {tenphe} kéo nhau tới chỗ {nguoibidanh}!" |
| Sắp gục | "{nguoibidanh} hết pin rồi cả nhà ơi!" |
| Out | "{nguoibidanh} về nhà ăn cơm rồi! Sao rơi đầy sàn, chạy nhanh lên!" |
| Quay lại đánh | "{ten} gõ X! Quay lại rồi! {doithu} coi chừng!" |
| Bỏ chạy | "{ten} quay lưng, khôn lắm!" |
| Hồi sinh | "{ten} sống lại rồi, nhỏ xíu như mới nở, cẩn thận nha!" |
| Thiên Cơ | "Gió đổi rồi! Vòng này là {map}. {nhac_map}" |
| Cắt top | "Top {n} đã rõ! Ai còn trong bảng thì vào vòng tiếp!" |
| Đấu cặp | "Hạng {a} gặp hạng {b}! Cả nhà thả tim!" |
| Quán quân | "Đêm nay, {ten} là Người Giữ Đèn! Tên bạn được ghi vào Sử Tháp." |

### Thoại meme của nhân vật

Nhân vật nói bằng bong bóng lời đúng theo hành động, mỗi người cách nhau ít nhất 3 giây, riêng lúc thắng, thua, bỏ chạy thì nói ngay. Bong bóng hiện với người trong top, người camera đang theo, nhân vật của mình và tối đa 8 người gần camera. Thoại không xin quà, không giục tặng, **không dùng từ kích động bạo lực; chỉ thoại sảng, trêu ghẹo vui vẻ kiểu meme**.

**Chiêu phải bay tới tận người bị đánh** ⚠: hai người giao chiến đứng cách xa nhau để thấy rõ đường bay của chiêu; đạn bám theo mục tiêu đang di chuyển, có vệt sáng kéo sau và nổ sáng ngay chỗ trúng, kể cả trận trên trời. Người bị đánh chỉ mất máu khi chiêu chạm tới.

**Võ mồm trước khi đánh** ⚠: ghép cặp xong hai bên nói với nhau theo một đoạn hội thoại liền mạch, người này đáp đúng câu người kia, dưới đất 2 câu, trên trời 4 câu, rồi mới tung chiêu. Chỉ trêu ghẹo, không có lời kích động bạo lực.

**Đấu đội trên trời** ⚠: có hơn 2 người trên trời thì thành đấu đội. Mỗi đội ra đòn tự động; tim thả cho thành viên đội nào thì đội đó đánh nhanh dần tới mức liên tục. Bên thua, điểm chia đều cho thành viên đội thắng. Trên màn hình chỉ hiện số tim hai đội, không có lời kêu gọi.

**Cảnh ra mắt thú cưỡi** ⚠: thú cưỡi là phần trình diễn đẹp nhất, nên mỗi lần xuất hiện có camera cận cảnh, hào quang, sao bay quanh, nhãn vàng và âm thanh riêng. Chỉ để đẹp, không tăng sức mạnh. Âm thanh tạo bằng code, có nút tắt.

**Chia khu bầu trời và đồng đội** ⚠: phòng đông có tới 3 khu trên trời cách xa nhau, mỗi khu một trận và thời gian nghỉ riêng; camera lần lượt chuyển khu. Đồng đội cùng phe bay lên thì đối đáp với người được giúp, và tiếp sức khi người đó yếu máu.

**Rượt đuổi trên trời** ⚠: sau màn võ mồm, cứ khoảng 26 đến 34 giây có một pha rượt đuổi 10 giây. Bên còn nhiều máu đuổi, bên kia chạy, camera bay theo; phát bắn trong pha này chỉ để vui, không trừ máu. Chiêu nhỏ gọn, có hào quang và tia sáng khi trúng.

**Bay tới nơi mới đánh** ⚠: trận trên trời chỉ bắt đầu khi cả hai đã lên tới độ cao giao chiến; thời gian tối thiểu 1 phút tính từ lúc tới nơi.

**Thú cưỡi 8 góc** ⚠: thú có đủ 8 hướng nhìn ngang tầm mắt, bay vào đón theo góc nghiêng 45 độ từ bên trái hoặc bên phải để thấy rõ con thú, lên tới nơi thì quay mặt đối thủ.

**Sân rộng theo phòng** ⚠: sân đủ cho hơn 1000 người; phòng ít người thì tụ ở giữa sân, phòng đông thì lan ra hết sân.

**Chat đúng nhịp được lên hình** ⚠: lúc camera sắp đổi người, ai vừa chat trong 6 giây gần nhất được ưu tiên lên hình trước, giữ khoảng 30 giây.

**Chat thành thoại:** bình luận của người xem không phải lệnh sẽ hiện thành bong bóng lời của nhân vật họ, tối đa 30 ký tự, mỗi người 4 giây một lần. Bỏ đường dẫn, chặn từ tục và từ kích động bạo lực ⚠; khi làm thật phải dùng bộ lọc đầy đủ vì lời người xem hiện lên màn hình live.

**Thoại phải đi kèm hành động và camera** ⚠: mỗi câu có điệu bộ riêng (xẹp lép khi thua, ưỡn người khi thắng, đít bốc khói khi kêu cứu). **Không dùng kiểu lắc nghiêng hay nảy tưng ảnh như lật đật, không có động tác nằm hay độn thổ**. Khi người đang được quay hoặc đối thủ của họ nói, camera chỉ tiến nhẹ khoảng 2,8 giây rồi lùi về, **không zoom mạnh** và vẫn thấy đủ cả hai bên, tối đa 12 giây một lần để không bị giật cảnh.

| Lúc | Câu thoại |
|---|---|
| Trêu ghẹo đối thủ khi đang đấu | Ê, dép bạn rớt kìa · Áo đẹp đó, mua chợ nào? · Mũi bạn dính cơm kìa · Né kiểu gì dễ thương vậy · Trời ơi đáng yêu ghê · Bắt tui đi nè · Lêu lêu · Cười cái coi · Đi đứng cẩn thận nha · Hù! Giật mình chưa? · Ủa bạn tập ném ở đâu? · Sao nhìn tui hoài vậy? · Tui méc mẹ bạn à nha · Bạn dễ thương mà ném dở ghê |
| Ăn trứng | Yêu quá, cắn miếng coi! · Măm măm! · Ngon dữ thần! · Của tui hết nha · Trứng này béo ghê · Ăn xong rồi tính · Cho miếng nữa coi · Ực, hết rồi à? |
| Nhặt sao | Sao của tui! · Giàu rồi! · Nhặt nhặt nhặt · Ai rơi đó, cảm ơn nha · Của rơi là của tui · Tiền về tiền về · Hú hồn, kịp! · Nhanh tay thì còn |
| Nhặt vật phẩm | Đồ xịn nha · Cái gì đây ta? · Lụm! · Trời cho nè |
| Gặp đối thủ to hơn | Trời ơi to thế! · Em xin phép về trước · Ủa lộn người rồi · Thôi em nỡ mồm · Bự dữ vậy trời · Em chào đại ca · Em chỉ đi ngang qua · Mẹ ơi con về |
| Gặp đối thủ nhỏ hơn | Một mình anh chấp hết! · Bé tí mà dễ thương ghê · Ủa ai đây ta? · Nhìn quen quen · Chào bạn nhỏ · Tui cao hơn nha |
| Gặp đối thủ ngang tầm | Oẳn tù tì không? · Ủa bạn giống tui ghê · Trùng áo rồi · Hôm nay ai trả tiền? · Tới công chuyện luôn · Nhìn gì mà dễ thương vậy? |
| Bị trúng đòn | Ui da! · Ai ném đó! · Ơ kìa? · Toang rồi! · Trúng dép rồi! · Sao lại là tui? · Oan quá trời! · Từ từ đã! · Dép ai đây? |
| Sắp gục | Cứu cứu cháy mông tui! · Mẹ ơi cứu con · Alo tổng đài hả? · Thôi em nỡ mồm · Hết pin rồi · Em biết lỗi rồi · Còn một hơi thôi · Sạc cho em với |
| Bỏ chạy | Chuồn lẹ! · Nhà có việc · Em đi đây, đừng theo · Chạy đi chờ chi · Quên tắt bếp! · Hẹn dịp khác nha · Mẹ gọi về ăn cơm · Ba mươi sáu kế... |
| Thua, tụt cấp, out | Ôi zào thua làm lại · Hôm nay trúng gió · Tại lag đó · Cho xin ván khác · Tui nhường đó · Chưa khởi động mà · Không tính nha · Quê quá |
| Thắng trận | Hehe the end · Dễ như ăn kẹo · Một mình anh chấp hết! · Xong, đi ngủ · Bái bai nha · Tui giỏi ghê á · Vỗ tay đi · Ủa xong rồi hả? |
| Hồi Sức | Hết hơi rồi · Cho thở xíu · Đừng ai gọi tui · Uống miếng nước cái · Mệt nhưng vui |
| Có Vòng Bảo Vệ | Hehe không tới đâu · Lêu lêu · Bong bóng thần kỳ · Tui có màng bọc nè · Ở trong này mát ghê |
| Góp Hợp Công | Anh em ơi cho vui · Để em phụ · Cho em một vé · Đông vui ghê · Tui góp một dép |
| Bị Hợp Công | Đông quá vậy trời · Ủa họp lớp hả? · Một mình tui sao đủ? · Hội nhóm à? |
| Phản đòn | Trả lại nè! · Của bạn nè · Dép này của ai? |
| Lên cấp | Lên đời! · Đẹp trai chưa? · Mẹ ơi con lớn rồi · Giờ mới là tui · Xin chào, tui mới |
| Vừa nở | Tới công chuyện · Ủa đây là đâu? · Chào cả nhà · Oe oe! · Ai nở tui ra vậy? |
| Giờ nghỉ: đánh rắm | Pòòòt~ · Xin lỗi cả nhà · Ai vừa đánh rắm? · Thơm chưa! · Không phải tui · Lỡ tay thôi · Chạy đi, sắp nữa nè |
| Giờ nghỉ: khoác lác | Một mình anh chấp hết! · Cả sân vào đây chơi! · Anh mà nghiêm túc là... · Mê chưa? · Hồi trẻ anh đẹp lắm · Đẹp trai là có thật |
| Giờ nghỉ: nói sảng | Con cá biết bay kìa · Ai lấy dép của tui? · Mẹ ơi cơm chưa? · Ơ hôm nay thứ mấy? · Trái đất tròn hay vuông? · Tui là ai, đây là đâu? · Sao hai mặt trăng vậy? |
| Giờ nghỉ: than phiền | Buồn ngủ quá · Sân vắng ghê · Mỏi chân rồi · Chơi gì giờ? · Chán như con gián · Bao giờ tan ca? · Đói quá trời |
| Giờ nghỉ: thuốc lào (chỉ người lớn) | Rít phát cho tỉnh · Phê ghê · Sòng sọc sòng sọc · Khói này mới đã |

**MC dẫn trận:** trong lúc đánh, MC bình luận liên tục các trận camera đang theo, trận của boss, mỗi câu cách nhau ít nhất khoảng 3,4 giây (hạ gục và bỏ chạy thì nói ngay), luôn gọi tên người đánh và người bị đánh ⚠.

**Luật lời MC:** chỉ **cảm ơn sau khi có quà**, không giục tặng, không nói "tặng đi không là thua". Xem rủi ro ở mục 14.

---

## 14. Còn phải thử và phải chốt

**Đã kiểm trong mã:**

- Sự kiện về `gift`, `like`, `comment`, `join`; không thấy `follow`, `share` ở cầu nối; không có sự kiện rời phòng, chỉ có tổng số người xem (`backend/cau-noi/src/map.ts`).
- Bình luận bị cắt khoảng trắng và bỏ nếu rỗng (`mapChat`), nên dấu cách không làm lệnh được.
- Quà nhấn giữ chỉ tính khi kết thúc chuỗi (`mapGift`).
- Sổ theo module, có `weekKey` (`client/modules/do-chu/src/so-lop.ts`). Ảnh động cache theo đường dẫn (`client/designs/san-bar-bai-bien/src/anh-dong.ts`).

**Phải đo:**

| Việc | Ảnh hưởng tới |
|---|---|
| Độ trễ bình luận và tim, tim đến theo đợt ra sao | Thời lượng lệnh, số tim nở trứng |
| Lượng tim của kênh mỗi phút | Ngưỡng map, số tim nở, hồi sinh |
| TikTok có chặn gõ lặp một ký tự không | `C` `V` `X` `B` |
| TikTok che đến đâu trên điện thoại thật | Bố cục ba khoang |
| Avatar trên trứng có nhận ra không, đường dẫn avatar có hết hạn không, vẽ được lên canvas không | Điểm hấp dẫn chính |
| 5 tim hồi sinh có quá rẻ không, map có thoáng được không | Số chỗ, hàng chờ |
| Máy phát chịu nổi bao nhiêu nhân vật | Khoang đông |
| 189 tổ hợp map có chơi được không | Loại dần cặp dở |
| MimicMotion với động tác đánh | Toàn bộ phần hình |
| Sử Tháp do AI viết có đúng sự thật không, tên người xem khiếm nhã | Lời MC |

**Rủi ro TikTok, cần đọc bản chính thức trước khi phát:** quà đổi lấy lợi thế và kết quả ngẫu nhiên. TikTok có quy tắc kiếm tiền riêng cho LIVE; một nguồn ngoài nói dụ quà và ép chi tiêu không được phép, nhưng mình chưa đọc được văn bản gốc. Cách giảm rủi ro đã đưa vào: hiện tỉ lệ công khai, giá trị luôn tương xứng số xu, sao là lời cảm ơn cho cả phòng, MC không giục tặng. Việc gọi là "cảm ơn" giúp về cách nói nhưng không thay đổi cơ chế, nên vẫn cần kiểm. Nguồn đó cũng nói phát không có người trông có thể bị hạn chế, nên chủ kênh nên có mặt.

**Còn phải chốt:**

| Câu hỏi | Khuyến nghị |
|---|---|
| Còn sống thì tim có tăng đòn không | Có, nếu không người xem sẽ ngừng bấm |
| Lệnh đứng lại | `Stop`, nằm cạnh `Chạy` `Đuổi` `X` |
| Quyết định vị trí chuỗi màn | Trong một buổi live; nhiều kênh để giai đoạn sau |
| Tên game và thế giới | Giữ: thả tim là thắp lửa, trứng lửa nở thành chiến binh |
| Bảng Top tim riêng cho người không tặng quà | Nên có |

**Thứ tự làm đề xuất:** đo độ trễ và đợt tim → thử MimicMotion một nhân vật → lõi luật có test, một map, trứng và avatar, live thử xem vui không → thêm vũ khí, sao, giải đấu, hồ sơ → thêm map và phiên cấp cao.

---

## Nguồn ngoài đã tham khảo

Chỉ cho các điểm rủi ro về TikTok, chưa phải văn bản quy định gốc:

- [TikTok Newsroom: bộ quy tắc kiếm tiền trên LIVE (5/2024)](https://newsroom.tiktok.com/en-africa/tiktoklive)
- [Tiêu chuẩn cộng đồng TikTok, mục tài khoản và tính năng](https://www.tiktok.com/community-guidelines/en/accounts-features)
- [ManyChat: kiếm tiền trên TikTok LIVE (nguồn thứ ba)](https://manychat.com/blog/tiktok-live-monetization/)
- [Revid: vùng an toàn TikTok (nguồn thứ ba, số liệu không chính thức)](https://www.revid.ai/tiktok-safe-zone)
