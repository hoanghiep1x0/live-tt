/** Kho Thiên Vấn. Mỗi dòng: [câu hỏi, đáp án ĐÚNG, sai, sai]. Đáp án đúng luôn đứng đầu ở
 *  đây cho dễ soát; lúc hỏi mới đảo chỗ.
 *
 *  Chỉ đưa câu có MỘT đáp án không cãi được. Câu đố dân gian nào có nhiều lời giải lưu
 *  truyền thì để hai đáp án sai thật xa lời giải, khỏi bị khách cãi trên live. */

export type DongCau = readonly [string, string, string, string];

export interface CauHoi {
  hoi: string;
  /** Ba đáp án theo thứ tự A, B, C. */
  dap: readonly [string, string, string];
  /** Chỉ số đáp án đúng trong `dap`. */
  dung: 0 | 1 | 2;
  /** Nhãn nhỏ trên thẻ: "Câu đố dân gian", "Ca dao"… */
  loai: string;
  kho: boolean;
}

const DO_DAN_GIAN: readonly DongCau[] = [
  ['Con gì đầu dê mình ốc?', 'Con dốc', 'Con dê', 'Con ốc sên'],
  ['Cái gì càng lau càng ướt?', 'Cái khăn', 'Cái bàn', 'Cái gương'],
  ['Cái gì có nhiều răng nhưng không biết cắn?', 'Cái lược', 'Cái kéo', 'Cái thìa'],
  ['Cái gì có chân mà không biết đi?', 'Cái bàn', 'Con rắn', 'Con cá'],
  ['Cái gì có cổ mà không có đầu?', 'Cái áo', 'Cái mũ', 'Cái quần'],
  ['Quả gì mà không ăn được?', 'Quả bóng', 'Quả cam', 'Quả ổi'],
  ['Cái gì luôn đến nhưng chẳng bao giờ tới?', 'Ngày mai', 'Hôm qua', 'Bữa trưa'],
  ['Cái gì của bạn mà người khác dùng nhiều hơn bạn?', 'Tên của bạn', 'Đôi dép', 'Cái điện thoại'],
  ['Con gì đập thì sống, không đập thì chết?', 'Con tim', 'Con muỗi', 'Con ruồi'],
  ['Cái gì đi thì nằm, đứng cũng nằm, nhưng nằm lại đứng?', 'Bàn chân', 'Cái võng', 'Cái gối'],
  ['Tháng nào trong năm có 28 ngày?', 'Tháng nào cũng có', 'Chỉ tháng Hai', 'Không tháng nào'],
  ['Bỏ ngoài nướng trong, ăn ngoài bỏ trong là gì?', 'Bắp ngô', 'Củ khoai', 'Quả trứng'],
  ['Cái gì đen khi mua, đỏ khi dùng, xám khi vứt đi?', 'Cục than', 'Quả ớt', 'Cái nồi'],
  ['Cái gì đầy lỗ mà vẫn giữ được nước?', 'Miếng bọt biển', 'Cái rổ', 'Cái lưới'],
  ['Cái gì đi khắp thế giới mà vẫn nằm yên một góc?', 'Con tem', 'Cái la bàn', 'Tấm bản đồ'],
  ['Quả gì có mắt mà không nhìn thấy?', 'Quả dứa', 'Quả táo', 'Quả chuối'],
  ['Cái gì bạn vẫn giữ được sau khi đã trao cho người khác?', 'Lời hứa', 'Chiếc nhẫn', 'Bó hoa'],
  ['Sáng đi bốn chân, trưa hai chân, chiều ba chân là gì?', 'Con người', 'Con chó', 'Con gà'],
  ['Cái gì càng nhiều thì ta càng nhìn thấy ít?', 'Bóng tối', 'Ánh nắng', 'Ngọn đèn'],
];

const CA_DAO: readonly DongCau[] = [
  ['Ăn quả nhớ kẻ…', 'trồng cây', 'hái quả', 'bán quả'],
  ['Uống nước nhớ…', 'nguồn', 'sông', 'mưa'],
  ['Có công mài sắt, có ngày…', 'nên kim', 'nên dao', 'nên vàng'],
  ['Gần mực thì đen, gần đèn thì…', 'rạng', 'mờ', 'nóng'],
  ['Một cây làm chẳng nên non, ba cây chụm lại nên…', 'hòn núi cao', 'cánh rừng xanh', 'ngọn đồi to'],
  ['Nước chảy … mòn', 'đá', 'núi', 'sỏi'],
  ['Lá lành đùm lá…', 'rách', 'khô', 'úa'],
  ['Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một…', 'giàn', 'nhà', 'vườn'],
  ['Tốt gỗ hơn tốt…', 'nước sơn', 'cái vỏ', 'màu sắc'],
  ['Học thầy không tày học…', 'bạn', 'sách', 'trường'],
  ['Chuồn chuồn bay thấp thì mưa, bay cao thì nắng, bay vừa thì…', 'râm', 'gió', 'bão'],
  ['Đi một ngày đàng, học một sàng…', 'khôn', 'chữ', 'gạo'],
  ['Cái nết đánh chết cái…', 'đẹp', 'xấu', 'giàu'],
  ['Nhất nước, nhì phân, tam cần, tứ…', 'giống', 'đất', 'trời'],
  ['Tháng bảy kiến bò, chỉ lo lại…', 'lụt', 'nắng', 'đói'],
  ['Nước dâng bao nhiêu, núi cao…', 'bấy nhiêu', 'mấy nhiêu', 'hơn nhiều'],
  ['Ếch ngồi đáy…', 'giếng', 'ao', 'hồ'],
  ['Mưa dầm thấm…', 'lâu', 'nhanh', 'ướt'],
  ['Thua keo này, bày keo…', 'khác', 'sau', 'mới'],
  ['Tre già măng…', 'mọc', 'non', 'xanh'],
  ['Ăn cây nào rào cây…', 'nấy', 'kia', 'khác'],
  ['Con Rồng cháu…', 'Tiên', 'Phượng', 'Lân'],
];

const TRUYEN_THUYET: readonly DongCau[] = [
  ['Sính lễ của Sơn Tinh: voi chín ngà, gà chín cựa, ngựa chín…', 'hồng mao', 'cái vó', 'sắc lông'],
  ['Sơn Tinh là chúa núi nào?', 'Núi Tản Viên', 'Núi Ngự Bình', 'Núi Bà Đen'],
  ['Mỵ Nương là con gái vua nào?', 'Hùng Vương thứ 18', 'An Dương Vương', 'Lý Thái Tổ'],
  ['Thánh Gióng đánh tan giặc nào?', 'Giặc Ân', 'Giặc Minh', 'Giặc Thanh'],
  ['Roi sắt gãy, Thánh Gióng nhổ gì đánh tiếp?', 'Bụi tre', 'Cây đa', 'Cột đình'],
  ['Lạc Long Quân thuộc nòi gì?', 'Rồng', 'Tiên', 'Hổ'],
  ['Âu Cơ sinh ra một bọc bao nhiêu trứng?', '100', '50', '18'],
  ['Bao nhiêu người con theo Âu Cơ lên núi?', '50', '100', '30'],
  ['An Dương Vương xây thành nào?', 'Thành Cổ Loa', 'Thành Thăng Long', 'Thành nhà Hồ'],
  ['Ai cho An Dương Vương móng làm lẫy nỏ thần?', 'Rùa Vàng', 'Rồng Vàng', 'Chim Lạc'],
  ['Ai làm ra bánh chưng, bánh giầy dâng vua cha?', 'Lang Liêu', 'Sơn Tinh', 'Thạch Sanh'],
  ['Bánh chưng vuông tượng trưng cho gì?', 'Đất', 'Trời', 'Biển'],
  ['Mai An Tiêm trồng quả gì trên đảo hoang?', 'Dưa hấu', 'Dừa', 'Thanh long'],
  ['Vua Lê Lợi trả gươm thần ở hồ nào?', 'Hồ Hoàn Kiếm', 'Hồ Tây', 'Hồ Ba Bể'],
  ['Chử Đồng Tử kết duyên với công chúa nào?', 'Tiên Dung', 'Mỵ Nương', 'Mỵ Châu'],
  ['Chim thần ăn khế trả cho người em thứ gì?', 'Vàng', 'Gạo', 'Ngọc trai'],
  ['Thạch Sanh có niêu cơm gì?', 'Niêu cơm ăn mãi không hết', 'Niêu cơm biết bay', 'Niêu cơm biết hát'],
  ['Tấm hóa thân lần đầu thành con chim gì?', 'Chim vàng anh', 'Chim sẻ', 'Chim én'],
  ['Câu thần chú trong truyện Cây tre trăm đốt?', 'Khắc nhập, khắc xuất', 'Vừng ơi mở ra', 'Biến, biến, biến'],
  ['Thủy Tinh đánh Sơn Tinh vì chuyện gì?', 'Đến muộn, mất Mỵ Nương', 'Bị mất kho báu', 'Bị chiếm biển'],
  ['Truyện Sơn Tinh – Thủy Tinh giải thích hiện tượng gì?', 'Lũ lụt hằng năm', 'Động đất', 'Nhật thực'],
  ['Lạc Long Quân diệt ba yêu nào?', 'Ngư Tinh, Hồ Tinh, Mộc Tinh', 'Chằn Tinh, Xà Tinh, Đại Bàng', 'Ngưu Ma, Bạch Cốt, Hắc Hùng'],
];

const KIEN_THUC: readonly DongCau[] = [
  ['Đỉnh núi cao nhất Việt Nam?', 'Fansipan', 'Bạch Mã', 'Bà Đen'],
  ['Vịnh Hạ Long thuộc tỉnh nào?', 'Quảng Ninh', 'Hải Phòng', 'Thanh Hóa'],
  ['Tết Trung thu vào ngày nào âm lịch?', 'Rằm tháng Tám', 'Mùng 5 tháng 5', 'Rằm tháng Giêng'],
  ['Giỗ Tổ Hùng Vương là ngày nào âm lịch?', 'Mùng 10 tháng 3', 'Mùng 3 tháng 3', 'Rằm tháng 7'],
  ['Tết Đoan Ngọ là ngày nào âm lịch?', 'Mùng 5 tháng 5', 'Mùng 1 tháng 1', 'Rằm tháng 8'],
  ['Con giáp đứng đầu trong 12 con giáp?', 'Tý (Chuột)', 'Sửu (Trâu)', 'Thìn (Rồng)'],
  ['Năm Mão, người Việt gọi là năm con gì?', 'Con Mèo', 'Con Thỏ', 'Con Hổ'],
  ['Hành tinh lớn nhất Hệ Mặt Trời?', 'Sao Mộc', 'Sao Thổ', 'Trái Đất'],
  ['Hành tinh gần Mặt Trời nhất?', 'Sao Thủy', 'Sao Kim', 'Sao Hỏa'],
  ['Hành tinh được gọi là "hành tinh đỏ"?', 'Sao Hỏa', 'Sao Kim', 'Sao Mộc'],
  ['Nước sôi ở bao nhiêu độ C (áp suất thường)?', '100 độ', '90 độ', '120 độ'],
  ['Năm nhuận dương lịch có bao nhiêu ngày?', '366', '365', '364'],
  ['Con vật chạy nhanh nhất trên cạn?', 'Báo săn', 'Ngựa', 'Sư tử'],
  ['Động vật lớn nhất trên Trái Đất?', 'Cá voi xanh', 'Voi châu Phi', 'Cá mập trắng'],
  ['Con nhện có mấy chân?', '8', '6', '10'],
  ['Cầu vồng có mấy màu?', '7', '5', '9'],
  ['Một ngày có bao nhiêu phút?', '1440', '1200', '3600'],
  ['Đại dương lớn nhất thế giới?', 'Thái Bình Dương', 'Đại Tây Dương', 'Ấn Độ Dương'],
  ['Kim tự tháp Giza ở nước nào?', 'Ai Cập', 'Mexico', 'Hy Lạp'],
  ['Ai là tác giả Truyện Kiều?', 'Nguyễn Du', 'Nguyễn Trãi', 'Hồ Xuân Hương'],
  ['Ngô Quyền thắng trận Bạch Đằng năm nào?', '938', '1288', '1010'],
  ['Triều đại ba lần đánh thắng quân Nguyên Mông?', 'Nhà Trần', 'Nhà Lý', 'Nhà Lê'],
  ['Vua Quang Trung đại phá quân nào năm 1789?', 'Quân Thanh', 'Quân Minh', 'Quân Nguyên'],
  ['Bảng chữ cái tiếng Việt có bao nhiêu chữ?', '29', '26', '24'],
  ['Thành phố nào được gọi là "thành phố hoa phượng đỏ"?', 'Hải Phòng', 'Đà Lạt', 'Huế'],
  ['Thành phố nào được gọi là "thành phố ngàn hoa"?', 'Đà Lạt', 'Hải Phòng', 'Vũng Tàu'],
  ['Kinh đô của triều Nguyễn?', 'Huế', 'Hà Nội', 'Hoa Lư'],
  ['Mũi Cà Mau là điểm cực nào của đất liền Việt Nam?', 'Cực Nam', 'Cực Đông', 'Cực Tây'],
  ['Nước đóng băng ở bao nhiêu độ C?', '0 độ', '4 độ', '−10 độ'],
  ['Ngày Quốc khánh Việt Nam?', '2 tháng 9', '30 tháng 4', '1 tháng 5'],
  ['Đảo lớn nhất Việt Nam?', 'Phú Quốc', 'Côn Đảo', 'Cát Bà'],
  ['Năm Thìn ứng với con vật nào?', 'Con Rồng', 'Con Rắn', 'Con Ngựa'],
];

/** Câu khó cho Lôi Kiếp. */
const KHO: readonly DongCau[] = [
  ['Ai đánh tráo lẫy nỏ thần của An Dương Vương?', 'Trọng Thủy', 'Triệu Đà', 'Cao Lỗ'],
  ['Trên đường chạy giặc, Mỵ Châu rắc gì làm dấu?', 'Lông ngỗng', 'Hạt thóc', 'Cánh hoa'],
  ['Bánh giầy tròn tượng trưng cho gì?', 'Trời', 'Đất', 'Mặt trăng'],
  ['Hồ Hoàn Kiếm xưa còn có tên là gì?', 'Hồ Lục Thủy', 'Hồ Dâm Đàm', 'Hồ Trúc Bạch'],
  ['Kinh đô nước Văn Lang thời Hùng Vương?', 'Phong Châu', 'Cổ Loa', 'Hoa Lư'],
  ['Đinh Bộ Lĩnh dẹp loạn bao nhiêu sứ quân?', '12', '9', '18'],
  ['Quốc hiệu nước ta thời nhà Đinh?', 'Đại Cồ Việt', 'Đại Việt', 'Văn Lang'],
  ['Lý Thái Tổ dời đô về Thăng Long năm nào?', '1010', '938', '1225'],
  ['Truyện Kiều có bao nhiêu câu thơ?', '3254', '3000', '2468'],
  ['Ai viết "Bình Ngô đại cáo"?', 'Nguyễn Trãi', 'Lê Lợi', 'Trần Hưng Đạo'],
  ['Ai cắm cọc trên sông Bạch Đằng năm 1288?', 'Trần Hưng Đạo', 'Ngô Quyền', 'Lê Hoàn'],
  ['Làng quê của Thánh Gióng tên là gì?', 'Phù Đổng', 'Đường Lâm', 'Bát Tràng'],
  ['Tứ Bất Tử gồm Tản Viên, Thánh Gióng, Chử Đồng Tử và ai?', 'Mẫu Liễu Hạnh', 'Lạc Long Quân', 'Bà Triệu'],
  ['Chim ăn khế dặn người em may túi mấy gang?', 'Ba gang', 'Năm gang', 'Bảy gang'],
  ['Kim loại nào ở thể lỏng ở nhiệt độ thường?', 'Thủy ngân', 'Chì', 'Nhôm'],
  ['Ký hiệu hóa học của vàng?', 'Au', 'Ag', 'Fe'],
  ['Tốc độ ánh sáng khoảng bao nhiêu?', '300.000 km/giây', '30.000 km/giây', '3.000 km/giây'],
  ['Số nguyên tố nhỏ nhất?', '2', '1', '3'],
  ['1 + 2 + 3 + … + 10 bằng bao nhiêu?', '55', '45', '50'],
  ['Căn bậc hai của 144?', '12', '14', '16'],
  ['15% của 200 là bao nhiêu?', '30', '15', '25'],
  ['Thơ lục bát: câu lục có mấy chữ?', '6', '8', '7'],
  ['Chùa Một Cột dựng dưới thời vua nào?', 'Lý Thái Tông', 'Lý Thái Tổ', 'Trần Nhân Tông'],
  ['Văn Miếu – Quốc Tử Giám thờ ai?', 'Khổng Tử', 'Lão Tử', 'Đức Phật'],
  ['Trạng nguyên đầu tiên của Việt Nam?', 'Lê Văn Thịnh', 'Mạc Đĩnh Chi', 'Nguyễn Hiền'],
  ['Đơn vị cấu tạo nhỏ nhất của cơ thể sống?', 'Tế bào', 'Nguyên tử', 'Mô'],
  ['Con sông nào người xưa gọi là sông Cái?', 'Sông Hồng', 'Sông Đà', 'Sông Mã'],
  ['Hai Bà Trưng khởi nghĩa chống quân nào?', 'Quân Hán', 'Quân Tống', 'Quân Minh'],
];

export const BO_CAU: readonly { loai: string; ds: readonly DongCau[] }[] = [
  { loai: 'Câu đố dân gian', ds: DO_DAN_GIAN },
  { loai: 'Ca dao tục ngữ', ds: CA_DAO },
  { loai: 'Truyền thuyết', ds: TRUYEN_THUYET },
  { loai: 'Kiến thức', ds: KIEN_THUC },
];

export const SO_CAU_THUONG = BO_CAU.reduce((n, b) => n + b.ds.length, 0);
export const CAU_KHO: readonly DongCau[] = KHO;

/** Đảo ba đáp án, giữ dấu đáp án đúng. */
export function dongThanhCau(d: DongCau, loai: string, kho: boolean, rand: () => number): CauHoi {
  const ds = [
    { c: d[1], dung: true },
    { c: d[2], dung: false },
    { c: d[3], dung: false },
  ];
  for (let i = ds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ds[i], ds[j]] = [ds[j]!, ds[i]!];
  }
  const dung = ds.findIndex((x) => x.dung) as 0 | 1 | 2;
  return { hoi: d[0], dap: [ds[0]!.c, ds[1]!.c, ds[2]!.c], dung, loai, kho };
}

/** Phép tính nhanh: không bao giờ hết câu, và người chưa thuộc ca dao vẫn có phần. */
export function cauTinh(rand: () => number): CauHoi {
  const r = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const kieu = r(0, 2);
  let hoi: string;
  let kq: number;
  if (kieu === 0) {
    const a = r(3, 9);
    const b = r(4, 12);
    hoi = `${a} × ${b} = ?`;
    kq = a * b;
  } else if (kieu === 1) {
    const a = r(25, 89);
    const b = r(17, 69);
    hoi = `${a} + ${b} = ?`;
    kq = a + b;
  } else {
    const b = r(3, 9);
    const kqc = r(4, 12);
    hoi = `${b * kqc} : ${b} = ?`;
    kq = kqc;
  }
  // Đáp án sai sát nút để không đoán bừa được.
  const lech = [1, 2, 10];
  const sai1 = kq + lech[r(0, 2)]!;
  let sai2 = kq - lech[r(0, 2)]!;
  if (sai2 === sai1 || sai2 < 0) sai2 = kq + 3;
  return dongThanhCau([hoi, String(kq), String(sai1), String(sai2)], 'Tính nhanh', false, rand);
}

/** Bốc câu kế tiếp, không lặp câu đã hỏi trong phiên cho tới khi hết kho.
 *  `daHoi` là chỉ số đã dùng (đếm liên tục qua các bộ), lõi giữ hộ. */
export function bocCau(daHoi: Set<number>, rand: () => number): CauHoi {
  // Cứ khoảng sáu câu chen một câu tính nhanh.
  if (rand() < 0.16) return cauTinh(rand);
  if (daHoi.size >= SO_CAU_THUONG) daHoi.clear();
  const con: number[] = [];
  for (let i = 0; i < SO_CAU_THUONG; i++) if (!daHoi.has(i)) con.push(i);
  const chon = con[Math.floor(rand() * con.length)]!;
  daHoi.add(chon);
  let i = chon;
  for (const b of BO_CAU) {
    if (i < b.ds.length) return dongThanhCau(b.ds[i]!, b.loai, false, rand);
    i -= b.ds.length;
  }
  return cauTinh(rand);
}

export function bocCauKho(daHoi: Set<number>, rand: () => number): CauHoi {
  if (daHoi.size >= CAU_KHO.length) daHoi.clear();
  const con: number[] = [];
  for (let i = 0; i < CAU_KHO.length; i++) if (!daHoi.has(i)) con.push(i);
  const chon = con[Math.floor(rand() * con.length)]!;
  daHoi.add(chon);
  return dongThanhCau(CAU_KHO[chon]!, 'Lôi Kiếp', true, rand);
}
