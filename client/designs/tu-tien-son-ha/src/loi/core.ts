/** Lõi Sơn Hà Tiên Lộ — THUẦN: không React, không DOM, không Date.now(), không Math.random().
 *  Thời gian và ngẫu nhiên tiêm vào; hàm sửa thẳng `The` rồi trả về các việc vừa xảy ra
 *  (`Su[]`) để lớp vẽ làm hiệu ứng, đọc to, chạy dải sử thi. */

import { bocCau, bocCauKho, type CauHoi } from './cau-hoi';
import { docLenh, type Lenh } from './lenh';
import { AO, CANH_CP, CONG_PHAP, DAN, HE_CP, PET, SO_MON, type LoaiMa } from './tang-bao';
import { denGio, sapToiDs, tenLich, yeuCuaLich, type DongLich } from './lich';
import { buocChienTruong, phutChot, quaChienTruong, type ChienTruong, type SuCt } from './chien-truong';
import { quaTruongMon, type GheTruongMon, type SuTm } from './truong-mon';
import { buocLoiDai, chieuDai, LD_SO, moTiThi, quaDai, timDai, xemTop, type KhieuChien, type LoiDai, type SuLd, LD_GIO_LAU } from './loi-dai';
import { BIT, buocToi, cuaMe, doGan, ke, khoang, oGiua, oGuong, taoMeDoiXung, type Huong, type MeCung } from './me-cung';
import {
  bocPham,
  chiSo,
  congGoc,
  lkLuyenHoa,
  lucGoc,
  nenMac,
  O_TRANG_BI,
  PHAM,
  BIEN_THE_DS,
  taoDo,
  tenDo,
  thuGoc,
  VO_LUC,
  type BienThe,
  type MonDo,
  type OTrangBi,
  type TrangBi,
  type TuiDo,
} from './trang-bi';
import {
  CANH_GIOI,
  chieuCua,
  DAC_BIET,
  HINH_LICH,
  LINH_VAT,
  PHE,
  SU_THI,
  THU_TU_YEU,
  YEU,
  SO_DO_CHIEU,
  CAN_CO,
  CAN_CO_DS,
  DAN_GIA,
  DAN_LK,
  VO_CONG,
  VO_GIA,
  NHANH_DAY,
  NHANH_MOC,
  THACH,
  NPC_TRUONG_LAO,
  SO_NPC,
  TRAN_TU,
  GIOI_GOC,
  TRAN_PHAP,
  type CanCo,
  type Gioi,
  type Ky,
  type LoaiDacBiet,
  type LoaiSuThi,
  type Phe,
  type YeuId,
  type ChieuYeu,
  type LoaiChieuYeu,
} from './the-gioi';

export interface Nhip {
  /** Hai lượt độ kiếp cách nhau ít nhất chừng này (mặc định `KIEP_CACH`) — kẻo màn độ kiếp bật ra liên tục. */
  kiepCach: number;
  hoi: number;
  dap: number;
  nghi: number;
  kiep: number;
  kiepKet: number;
  lu: number;
  luDau: number;
  luCach: number;
  luKet: number;
  yeu: number;
  yeuDau: number;
  yeuCach: number;
  yeuKet: number;
  mua: number;
  muaKet: number;
  /** Địa Cung: thời lượng, lần đầu, khoảng cách, màn tổng kết. */
  me: number;
  meDau: number;
  meCach: number;
  meKet: number;
  /** Ải Nhập Môn (mê cung cấp 1): thời gian bước vào, thời gian vượt ải, lần đầu, khoảng cách, màn tổng kết. */
  nmVao: number;
  nm: number;
  nmDau: number;
  nmCach: number;
  nmKet: number;
  /** Thành Trì Tự Do (chợ Đan Các + Tàng Kinh Các). */
  tt: number;
  /** Tu luyện chỉ hiện một môn phái; mỗi lượt dài chừng này rồi đổi phe kia. */
  doiPhe: number;
  /** Đệ tử không tích được linh khí lâu chừng này thì bị xuất môn làm khách. */
  xuatMon: number;
  /** Sự kiện cơ duyên lúc tu luyện (Cơ Duyên Giáng Thế / Linh Thảo Nở Rộ): mở mỗi chừng này, mỗi lần dài chừng này. */
  skTlCach: number;
  skTlLau: number;
}

const PHUT = 60_000;
/** Khoảng cách tối thiểu giữa hai lượt độ kiếp (cả phòng chỉ thấy màn độ kiếp thưa thôi; ai tới lượt thì chờ). */
export const KIEP_CACH = 3 * PHUT;

export const NHIP_LIVE: Nhip = {
  hoi: 22_000,
  dap: 7_000,
  nghi: 2_500,
  kiep: 25_000,
  kiepKet: 7_000,
  lu: 40_000,
  luDau: 3 * PHUT,
  luCach: 5 * PHUT,
  luKet: 7_000,
  yeu: 90_000,
  yeuDau: 8 * PHUT,
  yeuCach: 15 * PHUT,
  yeuKet: 8_000,
  mua: 60 * PHUT,
  muaKet: 12_000,
  me: 90_000,
  meDau: 6 * PHUT,
  meCach: 12 * PHUT,
  meKet: 8_000,
  nmVao: 30_000,
  nm: 60_000,
  nmDau: 1 * PHUT,
  nmCach: 5 * PHUT,
  nmKet: 7_000,
  tt: 10 * PHUT,
  doiPhe: 2 * PHUT,
  xuatMon: 20 * PHUT,
  skTlCach: 150_000,
  skTlLau: 60_000,
  kiepCach: KIEP_CACH,
};

/** Bản chơi thử: dồn đủ mọi sự kiện vào vài phút để người vận hành xem hết một vòng. */
export const NHIP_THU: Nhip = {
  ...NHIP_LIVE,
  hoi: 14_000,
  dap: 5_000,
  luDau: 50_000,
  luCach: 2.5 * PHUT,
  lu: 25_000,
  yeuDau: 95_000,
  yeuCach: 3.5 * PHUT,
  yeu: 45_000,
  mua: 8 * PHUT,
  me: 60_000,
  meDau: 30_000,
  meCach: 3 * PHUT,
  nmDau: 15_000,
  nmCach: 3 * PHUT,
  tt: 60_000,
  doiPhe: 40_000,
  xuatMon: 4 * PHUT,
  kiepCach: 90_000,
};

/** Đổi phe quá dễ thì giữa trận kéo co cả đám nhảy sang phe đang thắng. */
const DOI_PHE_CACH = 15 * PHUT;
/** Còn tương tác trong khoảng này mới tính là đang chơi (chia phe, máu yêu tinh, thưởng mùa). */
const DANG_CHOI = 5 * PHUT;
const KIEP_LAI = 3 * PHUT;
/** Ngã kiếp: lời răn là "thân tử đạo tiêu", nhưng thật ra chỉ có chừng này xác suất rớt một cảnh giới; còn lại
 *  không mất gì, chờ KIEP_LAI rồi độ lại. */
export const KIEP_ROT = 0.05;
/** Độ kiếp không còn câu hỏi: đủ hộ pháp (cả phòng gõ "độ") thì chắc qua, cả phòng được Phúc Lộc; thiếu thì tự
 *  vượt với xác suất KIEP_TU + KIEP_TU_HO × (hộ pháp / cần). */
export const KIEP_TU = 0.3;
/** Thưởng mỗi người hộ pháp (qua hay ngã đều có, qua thì ×2): linh khí, hoặc trúng cơ duyên linh thạch. */
export const HO_LK = 4;
export const HO_CO_DUYEN = 0.2;
export const HO_THACH = 3;
export const KIEP_TU_HO = 0.6;
/** Mỗi người một lần đẩy mỗi 1,2 giây: trận lũ là trận đông người, không phải trận gõ nhanh. */
const DAY_CACH = 1_200;
const DANH_CACH = 2_000;
/** Máu yêu tinh = tổng công × số đòn tối đa trong trận × hệ số này (người thật không đánh liên tục). */
const YEU_PHAN_DANH = 0.2;
const TIM_TOI_DA = 15;
const TIM_CUA_SO = 10 * PHUT;
const MUC_TOI_DA = 5;
const SU_THI_GIU = 6;
/** Địa Cung: 11×13 ô vừa nửa dưới khung dọc. */
export const ME_COT = 11;
export const ME_HANG = 13;
/** Tranh Đoạt Bảo Vật: đồ chỉ rơi ở các hàng trên cùng này (mê cung vẽ từ y 560, mỗi hàng ~101 px → hàng 0–3
 *  nằm trên giữa khung 1920). */
export const ME_HANG_ROI = 4;
const ME_TOI_DA = 48;
/** Mỗi lệnh lên/xuống/trái/phải là một bước — ai nghĩ nhanh gõ nhanh thì tới trước. Chặn gõ dồn
 *  (máy gõ, dán chuỗi) bằng khoảng nghỉ ngắn giữa hai bước. */
const BUOC_CACH = 350;
/** Bảo vật ít và có hạn, luôn rơi theo CẶP đối xứng gương (cùng phẩm, cùng loại) để hai phe bằng
 *  nhau: 2 + 2 món mỗi 8 người, tối đa 12 cả lượt; trên sân cùng lúc tối đa 4 (hai cặp). */
const doTong = (soNguoi: number) => Math.max(4, Math.min(12, 2 * (2 + Math.ceil(soNguoi / 8))));
const DO_TREN_SAN = 4;
/** Thoát ra trước được thưởng linh khí. */
const THUONG_THOAT = [30, 20, 10];
/** Ải Nhập Môn: mê cung nhỏ 9×11 đối xứng, vào giữa mép dưới, Cửa Sơn Tông góc trên trái, Cửa Thủy
 *  Tông góc trên phải. Đường tới cửa không quá dài để 60 giây gõ kịp. */
export const NM_COT = 9;
export const NM_HANG = 11;
/** Ải: đồ chỉ rơi ở các hàng trên cùng này — mê cung vẽ từ y 560, mỗi hàng ~108 px (MeCung.tsx), hàng 0–3 đều
 *  nằm trên giữa khung 1920 (y < 960). */
export const NM_HANG_ROI = 4;
const NM_TOI_DA = 40;
/** Ải nhập môn phải dễ: nhiều ngả thông, đường tới cửa ngắn. */
const NM_THUNG = 0.38;
const NM_DUONG_MAX = 16;
/** Vật phẩm rơi trên đường tới cửa tông, lúc ngẫu nhiên trong 70% đầu giờ chơi: 3 cặp đồ (cặp soi
 *  gương, hai tông bằng nhau), hên thì thêm một cặp bí kíp võ công. Đồ hiếm hơn Địa Cung một chút. */
const NM_CAP_DO = 3;
const NM_TI_LE_BI_KIP = 0.3;
/** Gõ một hướng kèm số ("lên 3") hoặc lặp ("lên lên lên") là đi nhiều bước liền, tối đa chừng này. */
export const NM_BUOC_TOI_DA = 4;
/** Vượt ải sớm được thưởng linh khí khởi đầu. */
const THUONG_NM = [20, 12, 6];
/** Số bộ trang phục cơ bản của mỗi nhân vật (tranh `<nhân vật>-tp<1..5>`). */
export const SO_TRANG_PHUC = 5;
/** PK "Thiên Bình" (Đại Chiến) — luôn công bằng dù lực chiến hai phe lệch nhau:
 *  - Điểm đến từ hành động: bình luận (1 cú / 1,2 giây), tim (0,3 mỗi tim), quà (5×√xu cộng dồn theo
 *    người — giảm dần, một người tặng lớn không một mình định đoạt trận).
 *  - Lực chiến chỉ so TRONG phe: cú đẩy nhân hệ số = lực chiến mình / lực chiến trung bình phe mình
 *    (kẹp ×0,6–×1,8). Trung bình mỗi phe luôn ×1 — phe toàn cao thủ không lấn phe toàn người mới.
 *  - Thế yếu bứt phá: phe đang thua quá 15% được cộng tới ×1,3 cho tới khi bắt kịp.
 *  - Người hệ số ≥ ×1,4 (cao thủ của phe mình) mỗi 12 giây tung một tuyệt kỹ, cú đó gấp đôi. */
const DIEM_TIM = 0.3;
export const DIEM_QUA = 5;
const HE_SO_MIN = 0.6;
const HE_SO_MAX = 1.8;
const BUT_PHA_TOI_DA = 0.3;
// (tuyệt kỹ giờ chỉ đến từ quà)
/** Kịch tính: Liên kích — cả phe ra đòn dồn dập (cách nhau dưới 2,5 giây) thì đếm nối; combo càng dài
 *  điểm càng nặng (+1% mỗi 2 đòn, trần +25%), mỗi mốc 20 đòn nổ sóng xung kích. Quyết chiến — 10 giây
 *  cuối mọi điểm ×1,5. Đảo chiều — phe thua vượt lên thì báo to. Áp như nhau cho cả hai phe. */
const LIEN_KICH_CACH = 2_500;
const LIEN_KICH_MOC = 20;
const QUYET_CHIEN = 10_000;
const QUYET_CHIEN_HE_SO = 1.5;
/** Đấu tướng: mỗi ~15 giây, hai Tiên Phong (công trạng cao nhất mỗi phe) giao chiến riêng 6 giây —
 *  điểm hai người góp trong lúc đó so với nhau; ai hơn thì phe mình thêm 12 điểm, người đó thêm 12
 *  công trạng. Không mở khi trận còn dưới 8 giây. */
const DAU_DAU = 8_000;
const DAU_CACH = 15_000;
const DAU_DAI = 6_000;
const DAU_THUONG = 12;
/** MC hô (giọng đọc) cách nhau ít nhất 4 giây, khỏi lấn nhau. */
const HO_CACH = 4_000;
/** Trận Pháp: đủ người trong phe cùng hô một trận pháp trong 8 giây (20% số người ra tay, 1–6; hô đúng
 *  trận pháp của căn cơ mình tính 2 phiếu) thì kết trận — tốn 10 Linh Mạch, đầu trận mỗi phe được 1 lượt
 *  miễn phí; tặng quà thì kết ngay trận pháp theo căn cơ mình, không tốn Linh Mạch. Hồi chiêu 20 giây. */
/** Phòng vắng vẫn phải cuốn: phe ít người ra tay hơn (kể cả không có ai) được thần binh đánh bù 80%
 *  phần quân số thiếu, nhịp như một người thường (1 cú / 1,2 giây). Một người chơi một mình vẫn có
 *  đối thủ thật: chăm thì thắng, lười thì thua. */
const BINH_TI_LE = 0.8;
/** PK chính là hai Chủ Tướng: đòn của Chủ Tướng nặng gấp ba. Người còn lại là trợ chiến — truyền công
 *  (đòn thường) và hô trận pháp theo căn cơ. Chủ Tướng đứng im quá 12 giây thì người công trạng cao
 *  nhất đang ra tay lên thay. */
const CHU_HE_SO = 3;
const CHU_IM = 12_000;
/** PK tự động + chiêu theo quà (Kinh Thư §12):
 *  - Đòn thường tự ra mỗi 1,5 giây cho cả hai phe, mạnh yếu theo tổng lực chiến phe (kẹp ×0,8–×1,25),
 *    bạo kích may rủi 8%. Không ai làm gì trận vẫn chạy.
 *  - Bình luận: tiếp sức cho phe (đòn thường thêm). Tim: hâm nóng — tăng tỉ lệ bạo kích của đòn thường
 *    (mỗi tim +1%, nguội dần, trần 50%).
 *  - Quà mới ra chiêu, theo mức xu: dưới 10 xu Bạo Kích; từ 10 xu Liên Kích ×3; từ 50 xu trận pháp theo
 *    căn cơ người tặng; từ 200 xu Tuyệt Kỹ hiếm (10% trận khí địch) kèm trận pháp.
 *  - Trận pháp còn tự kết bằng Linh Mạch của phe mỗi 12 giây (tu luyện nhiều thì có nhiều trận pháp). */
const DON_CACH = 1_500;
const DON_GOC = 2;
const BAO_GOC = 0.08;
const BAO_TIM = 0.01;
const BAO_TRAN = 0.5;
export const QUA_MUC = { lien: 10, tran: 50, hiem: 200 } as const;
const QUA_BAO = 6;
const QUA_LIEN = 4;
const QUA_HIEM = 0.1;
const TRAN_TU_CACH = 12_000;
const KY_GIA = 10;
const KY_PHIEU = 8_000;
const KY_HOI_CHIEU = 20_000;
const KY_LAU = 10_000;
const KY_PHA_LAU = 8_000;
const KY_HOI_PK = 0.12;
/** Căn cơ: hệ số đòn (PK và yêu tinh), tỉ lệ đỡ phản đòn cộng thêm. */
const CO_DON: Record<CanCo, number> = { tuong: 1.2, ve: 0.85, y: 0.85, quan: 1 };
const CO_DO: Record<CanCo, number> = { tuong: -0.2, ve: 0.3, y: 0, quan: -0.2 };

/** Đánh yêu tinh: máu yêu tinh mỗi lần tụt thêm 1/8 (Đại Yêu 1/12) thì rơi một món; hạ được thì kết
 *  liễu chắc chắn được một món và rơi thêm một món. Mỗi món chọn người nhận: 15% cho người đang
 *  ngồi xem (không tim, không bình luận trong trận), 85% cho người ra tay — rút thăm có trọng số theo
 *  tim và quà trong trận (phúc duyên), nên top tim + quà được ưu tiên nhưng vẫn là ngẫu nhiên. */
/** Yêu tinh phản đòn: mỗi 7–10 giây đánh ~30% người vừa ra tay (tối đa 6). Thủ cho tỉ lệ đỡ được
 *  (thủ/250, trần 60%); không đỡ được thì choáng 4 giây — không đánh được. Thả tim thì hồi khí, tỉnh ngay. */
const PHAN_CACH = 7_000;
const PHAN_CHOANG = 4_000;
const PHAN_DO_TOI_DA = 0.6;
/** Máu người chơi: gốc 100; vào trận yêu tinh được ×3. */
export const MAU_NGUOI = 100;
export const HE_MAU_YEU = 3;
export const MAU_YEU_NGUOI = MAU_NGUOI * HE_MAU_YEU;
/** Một tim hồi 90% máu vừa mất (mất 10 hồi 9) — 10% còn lại mất hẳn, nên phải hạ yêu kịp. */
export const HOI_TIM = 0.9;
/** Phản đòn màn 1 (nhắm vài người): mất chừng này máu kèm choáng. */
const PHAN_MAU = 30;
/** Cuồng Bạo: sống lại với chừng này phần máu, đồ sát cả đội mỗi CB_CACH, mỗi đòn mất CB_MAU máu (±20%). */
const CB_SONG = 0.5;
const CB_CACH = 5_000;
const CB_MAU = 45;
/** Cuồng Bạo kéo dài ít nhất chừng này (trận gần hết giờ thì cộng thêm, tối đa nửa thời lượng trận). */
const CB_TOI_THIEU = 120_000;
/** Ngã: còn chừng này để thả tim gượng dậy, quá thì trọng thương rời trận. */
export const NGA_HAN = 8_000;
/** Tim cũng là một đòn (Cuồng Bạo): sát thương bằng chừng này phần đòn thường. */
const TIM_DANH = 0.6;
/** Tim dư tiếp sức: mỗi tim +1% sát thương cho người mạnh nhất phe, tối đa +50%, giữ BUFF_GIU kể từ tim cuối. */
export const BUFF_MOI_TIM = 1;
export const BUFF_TOI_DA = 50;
const BUFF_GIU = 10_000;
/** Chiêu lớn của yêu tinh (báo trước, gõ số đỡ): lần đầu sau BAO_DAU, rồi mỗi BAO_CACH (±3 giây; Cuồng Bạo
 *  nhanh hơn ×0,7); báo trước BAO_LAU. Không đỡ thì: `quet` mỗi người phe đó mất QUET_MAU máu (Cuồng Bạo ×1,3) ·
 *  `choang` nửa phe choáng CHOANG_LON và mất CHOANG_MAU máu · `giap` yêu tinh chỉ nhận GIAP_HE sát thương trong
 *  GIAP_LAU · `hut` yêu tinh hồi HUT_PHAN máu tối đa. Đỡ được thì: quét / choáng không ai sao · giáp vỡ, yêu tinh
 *  lộ sơ hở (×1,2 như phá trận) GIAP_VO · hút hụt hơi, phản đòn kế lùi HUT_HUT. */
export const BAO_DAU = 9_000;
export const BAO_CACH = 16_000;
export const BAO_LAU = 4_000;
export const QUET_MAU = 40;
export const CHOANG_LON = 4_000;
const CHOANG_MAU = 15;
export const GIAP_LAU = 8_000;
export const GIAP_HE = 0.3;
const GIAP_VO = 6_000;
export const HUT_PHAN = 0.08;
const HUT_HUT = 4_000;
/** Số gõ -> loại chiêu đỡ được. */
const DO_BANG_SO: Record<string, LoaiChieuYeu> = { '1': 'hut', '2': 'quet', '3': 'choang', '4': 'giap' };
/** Thưởng phe hạ yêu tinh (mỗi lượt yêu một lần): mỗi đệ tử đã ra tay; Đại Yêu gấp đôi. */
export const THUONG_HA_YEU = { thach: 100, lk: 40, linhMach: 30 };
const YEU_MOC = 8;
const YEU_MOC_DAI = 12;
const TI_LE_NGOI_XEM = 0.15;

export interface NguoiChoi {
  user: string;
  ten: string;
  /** null là khách: chỉ xem, chat, chưa gõ lệnh nhập môn — hiện thành phàm nhân. */
  phe: Phe | null;
  /** Nhân vật nam hay nữ (chọn khi nhập môn). */
  gioi: Gioi | null;
  /** Căn cơ (tự chia khi nhập môn, gõ tên để đổi ngoài trận). */
  canCo: CanCo | null;
  /** Lúc tích được linh khí gần nhất trong phiên (0 là chưa tính) — quá lâu thì xuất môn. */
  tienLuc: number;
  /** Đã báo "đủ linh khí, gõ đột phá" cho cảnh giới này chưa. */
  baoDu: boolean;
  /** Linh thạch (tên cũ: tín chỉ): quà tặng cộng vào, trận tu luyện của phe cũng sinh ra; dùng đổi trang phục. */
  tinChi: number;
  /** Trận lực của riêng nhánh mình (tổng xu đã góp vào trận tu luyện). */
  nhanh: number;
  /** Tầng võ công (0–5) của môn võ theo căn cơ. */
  vo: number;
  /** Trang phục đang mặc (T1–T9; 0 là áo theo cảnh giới) — nhập môn được ngẫu nhiên một bộ cơ bản. */
  ao: number;
  /** Tàng Bảo Các: món đã có (bit n là món số n) và món đang dùng. */
  aoCo: number;
  cp: number;
  cpCo: number;
  pet: number;
  petCo: number;
  /** Đan cho trận kế còn trong túi: công, thủ, hồi hồn, hộ kiếp. */
  dan: { cong: number; thu: number; hon: number; kiep: number };
  /** Đan trận đang có hiệu lực tới lúc nào (không ghi sổ). */
  congDen: number;
  thuDen: number;
  /** Đan vừa dùng gần nhất (số D, mới trước, tối đa 2) — thẻ tu vi chỉ hiện chừng này cho gọn (không ghi sổ). */
  danCuoi?: number[];
  /** Số tim trong buổi này (không ghi sổ) — chạm mốc thì thưởng linh thạch. */
  timPhien: number;
  lk: number;
  canh: number;
  linhVat: string[];
  dung: number;
  chuoi: number;
  doiPheLuc: number;
  kiepLai: number;
  lanCuoi: number;
  timLk: number;
  timMoc: number;
  choKiep: boolean;
  /** Đã tương tác trong phiên này — chỉ người này mới lên bảng. */
  phienNay: boolean;
  /** Xu quà phiên này, cho bảng Hương Hỏa. */
  huong: number;
  danhLuc: number;
  /** Chiến thương sau Đại Chiến: hệ số công thủ / lực chiến (1 là lành) và lúc lành lại. */
  thuong: number;
  thuongDen: number;
  dayLuc: number;
  /** Đồ đang mặc, nhặt trong Địa Cung. */
  tb: TuiDo;
  /** Lần tung tuyệt kỹ gần nhất (không ghi sổ). */
  tkLuc: number;
}

export interface ViTriMe {
  o: number;
  /** Lúc bước gần nhất. */
  luc: number;
  /** Đồ đang mang — chỉ thành của mình khi ra tới Cửa Ra. */
  tui: TrangBi[];
  thoat: boolean;
}

/** Một người trong Ải Nhập Môn: nhân vật đã chọn, ô đang đứng, các bước còn chờ đi. */
export interface ViTriNm {
  o: number;
  luc: number;
  phe: Phe;
  gioi: Gioi;
  /** Bước còn chờ (gõ "lên 3" thì xếp ba bước, mỗi bước cách nhau BUOC_CACH). */
  cho: Huong[];
  qua: boolean;
  /** Đồ và bí kíp nhặt dọc đường — chỉ thành của mình khi vượt ải. */
  tui: TrangBi[];
  bk: number;
}

/** Trận pháp của một trận (PK hoặc yêu tinh). */
export interface TranPhap {
  /** `${phe}:${ky}` → người hô → { lúc, số phiếu }. */
  phieu: Map<string, Map<string, { luc: number; w: number }>>;
  /** `${phe}:${ky}` → lúc kết gần nhất. */
  kyLuc: Map<string, number>;
  mien: Record<Phe, number>;
  /** Hiệu lực đang chạy mỗi phe (tới lúc nào): công, thủ, giáp bị phá, miễn phản đòn. */
  hl: Record<Phe, { cong: number; thu: number; vo: number; ho: number }>;
  cuoi: { phe: Phe; ky: Ky; luc: number } | null;
  /** Lúc phe tự kết trận pháp kế tiếp bằng Linh Mạch (0 là chưa hẹn). */
  tuKe: number;
}

const taoTran = (): TranPhap => ({
  phieu: new Map(),
  kyLuc: new Map(),
  mien: { son: 1, thuy: 1 },
  hl: { son: { cong: 0, thu: 0, vo: 0, ho: 0 }, thuy: { cong: 0, thu: 0, vo: 0, ho: 0 } },
  cuoi: null,
  tuKe: 0,
});

export type DoRoi = { id: number; o: number } & ({ loai: 'tb'; vat: TrangBi } | { loai: 'ruong' } | { loai: 'bk' } | { loai: 'thach'; so: number });

/** LINH THẠCH RƠI trong hai mê cung (Ải Nhập Môn, Tranh Đoạt Bảo Vật): cứ `cach` một cặp túi linh thạch rơi vào hai
 *  ô soi gương (hai phe bằng nhau), trên sân nhiều nhất `toiDa` túi; bước vào ô là nhặt, linh thạch cộng NGAY (không
 *  cần ra cửa). Mỗi túi `tu`–`den` viên. Lần rơi đầu sau `dau`. */
export const THACH_ME = { dau: 4_000, cach: 6_000, toiDa: 8, tu: 2, den: 5 } as const;
export const THACH_NM = { dau: 5_000, cach: 8_000, toiDa: 4, tu: 1, den: 3 } as const;

export type Pha =
  | { k: 'cho'; den: number; tong: number }
  | {
      k: 'hoi';
      cau: CauHoi;
      so: number;
      den: number;
      tong: number;
      tra: Map<string, number>;
      dungThuTu: string[];
      /** Câu thứ mấy của Hội thi Ngọc Phả; 0 là câu thường. */
      thi: number;
    }
  | {
      k: 'dap';
      cau: CauHoi;
      so: number;
      den: number;
      tong: number;
      soTra: number;
      soDung: number;
      nhanh: string[];
      thi: number;
    }
  | {
      k: 'kiep';
      user: string;
      ten: string;
      canh: number;
      cau: CauHoi;
      den: number;
      tong: number;
      chon: number | null;
      ho: Set<string>;
    }
  | {
      k: 'kiep-ket';
      user: string;
      ten: string;
      canh: number;
      cau: CauHoi;
      chon: number | null;
      qua: boolean;
      nhoHo: boolean;
      /** Ngã kiếp và rớt một cảnh giới (hiếm, KIEP_ROT). */
      rot: boolean;
      soHo: number;
      den: number;
      tong: number;
    }
  | {
      k: 'lu';
      den: number;
      tong: number;
      /** Sĩ khí tán tu (khách chưa vào tông): xu quà + tim của tán tu trong trận, và người khích lệ gần nhất. Hết trận
       *  thì thưởng linh khí + linh thạch của đệ tử hai tông đã tham chiến nhân `heSoKich`. */
      kich?: { xu: number; nguoi: Map<string, number>; cuoi: { user: string; ten: string; luc: number } | null };
      /** Kiệt sức: lần tính hao khí gần nhất, và đã báo chưa (`haoKhi`). */
      haoLuc?: number;
      haoBao?: boolean;
      /** Điểm mỗi phe (số lẻ — hiện ra thì làm tròn). */
      son: number;
      thuy: number;
      nguoi: Map<string, Phe>;
      dai: boolean;
      /** Tổng lực chiến của người đã ra tay mỗi phe — để tính hệ số nội bộ phe (xem PK Thiên Bình). */
      luc: Record<Phe, { tong: number; so: number }>;
      /** Công trạng từng người trong trận. */
      cong: Map<string, number>;
      tim: Record<Phe, number>;
      xu: Record<Phe, number>;
      xuNguoi: Map<string, number>;
      /** Liên kích đang nối của mỗi phe. */
      combo: Record<Phe, { so: number; luc: number }>;
      /** Phe đang dẫn, và lần đảo chiều gần nhất. */
      dan: Phe | null;
      dao: { phe: Phe; luc: number } | null;
      /** Đấu tướng đang diễn ra, lúc mở trận kế, kết quả trận vừa xong (cho chữ trên màn). */
      dau: { son: string; thuy: string; den: number; diem: Record<Phe, number> } | null;
      dauKe: number;
      dauKet: { thang: Phe | null; son: string; thuy: string; luc: number } | null;
      /** Chủ Tướng mỗi phe — hai người ra trận chính. */
      chu: Record<Phe, string | null>;
      /** Trận khí tối đa mỗi phe (máu): cạn thì phá trận, thua ngay. Trận khí còn = H − điểm phe kia. */
      H: number;
      tran: TranPhap;
      /** Đã báo quyết chiến chưa; lúc MC hô gần nhất; lúc rung khung gần nhất. */
      qcBao: boolean;
      hoLuc: number;
      rungLuc: number;
      /** Lúc ra đòn thường kế tiếp; độ "nóng" của mỗi phe do tim hâm (tăng tỉ lệ bạo kích). */
      donKe: number;
      nong: Record<Phe, number>;
      /** Điểm thần binh đã đánh bù cho mỗi phe, và lúc tính gần nhất. */
      binh: Record<Phe, number>;
      binhLuc: number;
      /** DIỄN BIẾN TRẬN (ban-do.md §3h). Quân số mỗi phe 0..1 (chiêu diện rộng làm tiêu hao, vài giây sau bổ sung
       *  dần) và lúc bị đánh gần nhất; lúc mỗi phe tung chiêu diện rộng kế. */
      qs: Record<Phe, number>;
      qsLuc: Record<Phe, number>;
      drKe: Record<Phe, number>;
      drSo: Record<Phe, number>;
      /** Đã nhắc phe sắp dính chiêu diện rộng của lượt nào (giá trị drKe của bên kia lúc nhắc). */
      drBao: Record<Phe, number>;
      /** Chủ soái: lúc được dùng lại chiêu phòng ngự / hồi phục. */
      thanKe: Record<Phe, { thu: number; hoi: number }>;
      /** Tướng tiên phong (chính là `chu`): máu 0..100, đã báo bị thương chưa; đã bị hạ / hi sinh thì vào `tpRoi`;
       *  lúc tướng mới lên thay; chủ soái (thần) nổi giận tới lúc nào (đòn mạnh hơn). */
      tp: Record<Phe, { mau: number; thuong: boolean; nguong: number; tu: number }>;
      tpRoi: Set<string>;
      tpThay: Record<Phe, number>;
      gian: Record<Phe, number>;
      /** Người tung đòn hi sinh (được vinh danh, dễ nhận đồ hiếm hơn). */
      hiSinh: string[];
      /** Cứ điểm tranh chấp và viện binh do quà (`loi/chien-truong.ts`); có từ món quà đầu tiên của trận. */
      ct?: ChienTruong;
    }
  | {
      k: 'lu-ket';
      den: number;
      tong: number;
      thang: Phe | null;
      son: number;
      thuy: number;
      dai: boolean;
      cong: Map<string, number>;
      /** Kết trận: linh thạch mỗi người đã tương tác của từng phe, hệ số chiến thương (lực chiến còn lại) từng
       *  phe, và ai nhận được vật phẩm hiếm. */
      thuong: Record<Phe, number>;
      ton: Record<Phe, number>;
      hiem: { ten: string; vat: string; phe: Phe }[];
    }
  | {
      k: 'yeu';
      yeu: YeuId;
      mau: number;
      mauMax: number;
      den: number;
      tong: number;
      dmg: Map<string, number>;
      dmgPhe: Record<Phe, number>;
      /** Theo lịch trình: chỉ tông này đánh (null là cả hai tông). */
      phe: Phe | null;
      dai: boolean;
      /** Tim và xu quà từng người trong trận này — phúc duyên khi chia đồ rơi. */
      tim: Map<string, number>;
      qua: Map<string, number>;
      /** Ai đã tim / bình luận / tặng quà trong trận (người còn lại là đang ngồi xem). */
      tuongTac: Set<string>;
      /** Đã rơi tới mốc máu thứ mấy. */
      roiMoc: number;
      /** Lúc phản đòn kế tiếp; ai đang choáng tới lúc nào; lần phản đòn gần nhất (cho chữ trên màn). */
      phanKe: number;
      choang: Map<string, number>;
      tran: TranPhap;
      /** Yêu tinh bị phá giáp tới lúc nào. */
      yeuVo: number;
      phanCuoi: { luc: number; trung: string[]; doDuoc: string[]; chieu: string } | null;
      /** Số lần đã phản đòn (để luân phiên chiêu). */
      soPhan: number;
      /** Màn 2: yêu tinh hết máu lần đầu thì sống lại Cuồng Bạo — đồ sát diện rộng cả đội. */
      cuong: boolean;
      /** Máu người chơi trong trận (gốc MAU_NGUOI × HE_MAU_YEU), máu còn hồi được bằng tim (90% đòn
       *  vừa trúng), ai đang ngã từ lúc nào, ai trọng thương rời trận. */
      hp: Map<string, number>;
      hoiDuoc: Map<string, number>;
      nga: Map<string, number>;
      roi: Set<string>;
      /** Tim dư (máu đầy) tiếp sức người mạnh nhất phe: mỗi tim +1% sát thương, hết hạn nếu lâu không ai tiếp. */
      buff: Map<string, { so: number; den: number; nguoi: Set<string> }>;
      /** Chiêu lớn đang báo trước (ra đòn lúc `den`), ai đã gõ số đỡ của từng phe, phe nào đã đỡ được. */
      bao: { chieu: ChieuYeu; luc: number; den: number; phieu: Map<string, Phe>; do: Phe[] } | null;
      /** Lúc báo chiêu lớn kế; đã ra bao nhiêu chiêu lớn (luân phiên bộ chiêu). */
      baoKe: number;
      soLon: number;
      /** Yêu tinh khoác giáp (chỉ nhận GIAP_HE sát thương) tới lúc nào. */
      giapDen: number;
      /** Chiêu lớn vừa ra (cho chữ trên màn): ai trúng, phe nào đỡ, yêu tinh hồi bao nhiêu máu. */
      lonCuoi: { luc: number; chieu: ChieuYeu; trung: string[]; doPhe: Phe[]; hoi: number } | null;
    }
  | {
      k: 'yeu-ket';
      yeu: YeuId;
      thang: boolean;
      ketLieu: string | null;
      top: string | null;
      /** Phe hạ yêu tinh (sát thương cả trận nhiều hơn) và phần thưởng mỗi đệ tử phe đó. */
      pheHa: Phe | null;
      thuong: { thach: number; lk: number; linhMach: number } | null;
      /** Thua vì cả đội ngã trước Cuồng Bạo. */
      doSat: boolean;
      den: number;
      tong: number;
    }
  | { k: 'mua-ket'; thang: Phe | null; den: number; tong: number }
  | {
      k: 'me';
      den: number;
      tong: number;
      me: MeCung;
      vao: Record<Phe, number>;
      /** Tranh Đoạt riêng một tông (mỗi tông một nick live): chỉ đệ tử tông này xuống, một lối vào giữa mép dưới.
       *  `null`: hai tông cùng xuống, hai cửa như cũ. */
      phe: Phe | null;
      /** Kiểu mê cung (1…N, `ME_LOAI`). */
      loai: number;
      ra: number;
      vt: Map<string, ViTriMe>;
      do: DoRoi[];
      idKe: number;
      /** Còn bao nhiêu bảo vật chưa rơi, và lúc rơi món kế. */
      conRoi: number;
      /** Xu quà tích lũy trong màn (đủ `QUA_ME_XU` thì rơi thêm một cặp bảo vật — `quaMeCung`). */
      quaTich: number;
      /** Thời gian đã cộng thêm nhờ quà (ms). */
      giaHan: number;
      roiKe: number;
      ruongLuc: number;
      daRuong: boolean;
      /** Thứ tự thoát ra. */
      thoat: string[];
    }
  | {
      /** Ải Nhập Môn — mê cung cấp 1. Trước `moLuc` là 30 giây bước vào (gõ "nam s"…); sau đó 60 giây
       *  đi tới cửa phe mình. Tới đúng cửa là vượt ải, nhập môn. */
      k: 'nm';
      den: number;
      tong: number;
      moLuc: number;
      me: MeCung;
      vao: number;
      cua: Record<Phe, number>;
      /** Ải một cửa (mỗi tông live một nick TikTok riêng): chỉ một cửa giữa mép trên, ai vượt ải là vào tông này;
       *  khách chỉ chọn giới (1 nam · 2 nữ). `null`: ải hai cửa như cũ. */
      phe: Phe | null;
      vt: Map<string, ViTriNm>;
      qua: string[];
      do: DoRoi[];
      idKe: number;
      /** Lúc rơi từng đợt (mỗi đợt một cặp), theo thứ tự. */
      hen: { luc: number; bk: boolean }[];
      /** Lúc rơi cặp linh thạch kế (THACH_NM); chưa có thì hẹn ở bước đầu. */
      thachKe?: number;
      /** Xu quà tích lũy trong ải (đủ `QUA_ME_XU` thì rơi thêm một cặp vật phẩm — `quaMeCung`). */
      quaTich: number;
      /** Thời gian đã cộng thêm nhờ quà (ms). */
      giaHan: number;
    }
  | {
      k: 'nm-ket';
      den: number;
      tong: number;
      qua: { user: string; ten: string; phe: Phe }[];
      /** Số người chưa tới cửa (lần sau thử lại). */
      truot: number;
    }
  | {
      /** Thành Trì Tự Do: chợ chung hai tông — Đan Các (D1–D9) và Tàng Kinh Các (C1–C9). */
      k: 'tt';
      den: number;
      tong: number;
      /** Đan Các · Tàng Kinh Các riêng một tông (mỗi tông một nick live): chỉ đệ tử tông này mua, Tàng Kinh Các chỉ
       *  bày chiêu của tông này. `null`: chợ chung hai tông như cũ. */
      phe: Phe | null;
      /** Khảo hạch Tàng Kinh (câu đố A/B/C chuyển từ tu luyện sang đây): câu đang hỏi, hoặc đáp án vừa công bố. */
      kh: KhaoHach | null;
      /** Mấy lượt mua gần nhất (hiện trên bảng chợ). */
      mua: { user: string; ten: string; mon: string; ma: string; luc: number }[];
    }
  | {
      k: 'me-ket';
      den: number;
      tong: number;
      thoat: { user: string; ten: string; so: number; lucTruoc: number; lucSau: number }[];
      /** Số người chưa ra kịp (vẫn giữ đồ, chỉ không có thứ hạng). */
      mat: number;
    };

export type Su =
  | { k: 'su-thi'; chu: string; phe?: Phe }
  | { k: 'nhap'; user: string; phe: Phe }
  | { k: 'nm-vao'; user: string; phe: Phe }
  | { k: 'nm-qua'; user: string; phe: Phe; thu: number; ao: number; vat: TrangBi[]; bk: number; lucTruoc: number; lucSau: number }
  | { k: 'bi-kip'; user: string; o: number }
  | { k: 'dung'; user: string; lk: number }
  /** Đột phá. `thach`: linh thạch người đột phá được; `phong`: mỗi người online trong phòng được. */
  | { k: 'dot-pha'; user: string; canh: number; thach: number; phong: number }
  /** Chạm mốc tim trong buổi: thưởng linh thạch. */
  | { k: 'tim-moc'; user: string; moc: number; thach: number }
  | { k: 'trung'; user: string; dmg: number; bao: boolean; truot: boolean }
  | { k: 'day'; user: string; phe: Phe; luc: number }
  /** Tán tu (khách) ra đòn giúp một phe ngẫu nhiên lúc Đại Chiến. */
  | { k: 'tan-tu'; ten: string; phe: Phe }
  | { k: 'tuyet-ky'; user: string; phe: Phe; chieu: string }
  /** Tim, quà góp vào Đại Chiến (hiệu ứng nhẹ, không hiện tên chiêu). */
  | { k: 'gop'; user: string; phe: Phe; diem: number }
  /** Đòn thường tự động của một phe (Chủ Tướng hoặc tướng binh ra đòn). */
  | { k: 'don'; phe: Phe; bao: boolean; chieu: string }
  /** Chiêu do quà tặng: Bạo Kích, Liên Kích. (Trận pháp và Tuyệt Kỹ có sự kiện riêng.) */
  | { k: 'qua-chieu'; user: string; phe: Phe; ten: string }
  /** Đại Chiến: liên kích qua mốc, đảo chiều. */
  | { k: 'lien-kich'; phe: Phe; so: number }
  | { k: 'dao-chieu'; phe: Phe }
  | { k: 'quyet-chien' }
  | { k: 'dau-tuong'; son: string; thuy: string }
  | { k: 'dau-tuong-ket'; thang: Phe | null; nguoiThang: string | null }
  /** Đại Chiến — diễn biến: chiêu diện rộng (`chan`: bên kia có khiên Thủ nên đỡ bớt), tướng tiên phong bị thương,
   *  bị hạ (`hiSinh`: tung đòn liều chết), tướng mới lên thay (null: thần binh giữ trận). */
  | {
      k: 'dien-rong';
      phe: Phe;
      chieu: string;
      chan: boolean;
      mat: number;
      quy?: boolean;
      /** % trận khí bên kia mất thật (sau khiên, Hộ Vệ, Y Sư); % Chiến Tướng cộng; Phá Quân có xuyên khiên; % Hộ Vệ
       *  đỡ; % trận khí Y Sư hồi. */
      tru?: number;
      cong?: number;
      xuyen?: boolean;
      do?: number;
      hoi?: number;
      /** Trận pháp cả phe đang có tác dụng lên chiêu này. */
      tran?: { cong: boolean; pha: boolean; thu: boolean; hoi: boolean };
    }
  /** Chủ soái dùng chiêu phòng ngự (dựng khiên) hoặc hồi phục (`so`: trận khí hồi được) thay cho đòn công. */
  | { k: 'than-chieu'; phe: Phe; loai: 'thu' | 'hoi'; ten: string; so: number }
  /** Nhắc một phe sắp dính chiêu diện rộng (còn `con` ms): gõ "thủ" để đỡ. */
  | { k: 'canh-bao'; phe: Phe; con: number }
  | { k: 'tp-thuong'; phe: Phe; user: string }
  | { k: 'tp-ha'; phe: Phe; user: string; hiSinh: boolean }
  | { k: 'tp-thay'; phe: Phe; ai: string | null }
  /** Yêu tinh phản đòn: ai trúng (choáng), ai đỡ được. */
  | { k: 'phan-don'; trung: string[]; doDuoc: string[]; chieu: string }
  /** Thả tim hồi khí, hết choáng. */
  | { k: 'hoi-khi'; user: string }
  /** Yêu tinh tụ chiêu lớn: ra đòn lúc `den`, gõ `SO_DO_CHIEU[loai]` để đỡ. */
  | { k: 'bao-chieu'; chieu: ChieuYeu; den: number }
  /** Một phe gõ đủ số đỡ chiêu lớn đang báo. */
  | { k: 'do-chieu'; phe: Phe; chieu: ChieuYeu }
  /** Chiêu lớn ra đòn: ai trúng (mất máu / choáng), phe nào đỡ được, yêu tinh hồi bao nhiêu máu. */
  | { k: 'chieu-lon'; chieu: ChieuYeu; trung: { user: string; dmg: number }[]; doPhe: Phe[]; hoi: number }
  /** Yêu tinh hết máu lần đầu: sống lại Cuồng Bạo (màn 2). */
  | { k: 'cuong-bao'; yeu: YeuId }
  /** Cuồng Bạo đồ sát diện rộng: ai trúng mất bao nhiêu máu, ai đỡ được. */
  | { k: 'cuong-don'; trung: { user: string; dmg: number }[]; doDuoc: string[]; chieu: string }
  /** Máu người chơi trong trận yêu tinh: mất máu (phản đòn màn 1), tim hồi máu, ngã, trọng thương. */
  | { k: 'mat-mau'; user: string; dmg: number }
  | { k: 'hoi-mau'; user: string; mau: number; day: boolean; tu: string | null }
  | { k: 'nga'; user: string }
  | { k: 'trong-thuong'; user: string }
  /** Tim dư tiếp sức người mạnh nhất phe: `tu` thả tim cho `toi`, `so` là % sát thương cộng thêm hiện có. */
  | { k: 'buff'; tu: string; toi: string; so: number }
  /** Kết trận pháp. `nguon`: 'ho' (đủ người hô) hoặc 'qua' (tặng quà). */
  | { k: 'ky-nang'; phe: Phe; ky: Ky; nguon: 'ho' | 'qua'; ai: string | null }
  | { k: 'pha-tran'; thang: Phe }
  /** Tụ Linh Trận: số đồng môn cùng đáp đúng một câu, và linh thạch trận sinh ra cho mỗi người. */
  | { k: 'cong-huong'; phe: Phe; so: number; thach: number }
  /** Trận tu luyện của phe lên cấp; nhánh trận của một môn đồ lên cấp. */
  | { k: 'tran-len'; phe: Phe; cap: number; ten: string }
  | { k: 'nhanh-len'; user: string; cap: number }
  /** Quà lúc tu luyện truyền công: người tặng, các đệ tử phía dưới nhận, mỗi người bao nhiêu linh khí. */
  | { k: 'truyen-cong'; user: string; nhan: string[]; lk: number }
  /** Tiêu linh thạch: học võ công lên một tầng; luyện một viên đan. */
  | { k: 'hoc-vo'; user: string; tang: number; ten: string }
  | { k: 'mua'; user: string; loai: LoaiMa; so: number; ten: string; moi: boolean }
  | { k: 'luyen-dan'; user: string; lk: number }
  /** Hoạt động tu luyện (vận công, hái linh thảo, cơ duyên): chữ bay trên đầu người làm. */
  | { k: 'hd'; user: string; loai: HoatDong; chu: string; hiem: boolean }
  /** Lôi Đài Đồng Môn (tỉ thí cùng tông trên sân tu luyện — `loi/loi-dai.ts`). */
  | SuLd
  /** Chiến trường Đại Chiến: cứ điểm, viện binh, thần ra tay (`loi/chien-truong.ts`). */
  | SuCt
  /** Ghế trưởng môn đổi chủ nhờ quà (`loi/truong-mon.ts`). */
  | SuTm
  /** Đủ linh khí, chờ người chơi gõ "đột phá"; bị xuất môn vì bỏ bê tu luyện. */
  | { k: 'du-lk'; user: string }
  | { k: 'xuat-mon'; user: string }
  /** Phàm nhân nhặt được bảo vật trong Địa Cung: bước vào tiên lộ. */
  | { k: 'ky-ngo'; user: string; phe: Phe; vat: TrangBi }
  | { k: 'ho'; user: string }
  | { k: 'set'; user: string; qua: boolean }
  /** Quà: `ten` tên quà TikTok, `xu` tổng xu lần tặng, `bac` 1–5 (thang quà), `combo` số món liên tiếp. */
  | { k: 'qua'; user: string; so: number; ten: string; xu: number; bac: BacQua; combo: number }
  /** Mưa Linh Thạch (quà bậc 4+ lúc tu luyện): `nguoi` người được nhận, `tong` linh thạch đã rải. */
  | { k: 'mua-thach'; user: string; nguoi: number; tong: number }
  /** Lúc cần quà gấp: cứu viện boss / tử chiến PK của một phe, tới `den`. */
  | { k: 'qua-gap'; loai: LoaiGap; phe: Phe; den: number }
  | { k: 'tim'; user: string }
  | { k: 'the'; user: string }
  | { k: 'doc'; chu: string }
  | { k: 'pha'; pha: Pha['k'] }
  | { k: 'dac-biet'; loai: LoaiDacBiet }
  | { k: 'bao-truoc'; ten: string; chu: string; den: number }
  /** Nhặt đồ. `o` là ô Địa Cung (đồ mới chỉ vào túi), −1 khi đồ rơi từ yêu tinh (mặc ngay). */
  | {
      k: 'nhat';
      user: string;
      o: number;
      vat: TrangBi;
      lk: number;
      mac: boolean;
      ruong: boolean;
      nguon: 'me' | 'yeu' | 'nm' | 'pk';
      lucTruoc: number;
      lucSau: number;
    }
  /** Nhặt túi linh thạch trong mê cung (cộng ngay). */
  | { k: 'nhat-thach'; user: string; o: number; so: number }
  /** Ra tới Cửa Ra: đồ mang theo thành của mình. */
  | { k: 'thoat'; user: string; thu: number; vat: TrangBi[]; lk: number; lucTruoc: number; lucSau: number };

export interface DongSuThi {
  chu: string;
  phe?: Phe;
  luc: number;
}

export interface The {
  nhip: Nhip;
  batDau: number;
  nguoi: Map<string, NguoiChoi>;
  pha: Pha;
  soCau: number;
  daHoi: Set<number>;
  daHoiKho: Set<number>;
  hangKiep: string[];
  /** Còn bao nhiêu câu được nhân đôi linh khí, và nhờ ai. */
  phucLoc: number;
  phucLocTu: string | null;
  luKe: number;
  yeuKe: number;
  muaKe: number;
  yeuThu: number;
  /** Thế trận mùa: dương là nước đang dâng (Thủy Tông thắng thế), âm là núi đang cao. */
  muc: number;
  muaThang: Record<Phe, number>;
  suThi: DongSuThi[];
  /** Hồ sơ có đổi từ lần ghi sổ trước. */
  ban: boolean;
  /** Đếm lượt dùng câu sử thi để xoay vòng, khỏi lặp. */
  xoay: number;
  /** Vừa xong một kiếp: nhịp sau phải là việc khác, để hàng kiếp dài không chặn yêu tinh, mùa lũ, câu hỏi. */
  kiepVua: boolean;
  /** Lúc mở lượt độ kiếp gần nhất. */
  kiepLuc: number;
  /** Lịch sự kiện theo giờ do người vận hành đặt, và độ lệch múi giờ của máy phát. */
  lich: DongLich[];
  lechPhut: number;
  daChayLich: Set<string>;
  /** Việc theo lịch trình đã tới giờ, chờ màn đang chạy xong. */
  hangDacBiet: { loai: LoaiDacBiet; phe: Phe | null; luc: number }[];
  /** Chạy theo lịch trình: Ải, Địa Cung, yêu tinh, Đại Chiến chỉ mở đúng phút trong năm (không theo nhịp). */
  theoLich: boolean;
  /** Chuỗi sự kiện nối tiếp (thẻ 📅): sự kiện kế tiếp là mục thứ `chuoiI`, bắt đầu lúc `chuoiKe`;
   *  `chuoiCho` là đang chạy một sự kiện (xong mới tính giờ nghỉ). */
  chuoi: Chuoi;
  chuoiI: number;
  chuoiKe: number;
  chuoiCho: boolean;
  /** Người vận hành bấm TẠM DỪNG (thanh ngoài khung): giữ nguyên màn đang chạy — màn vẫn chạy, hết giờ thì
   *  lặp lại; lịch, Ải xen, độ kiếp, tổng kết đều không chen vào. Chạy tiếp thì tự căn theo giờ thật. */
  giu: boolean;
  /** Theo giờ: mốc phút 0 (lúc bật lịch) và lúc mục gần nhất đã chạy. */
  chuoiGoc: number;
  chuoiDaChay: number;
  /** Thông báo trước sự kiện kế (10 giây cuối) đang hiện trên màn. */
  baoTruoc: { ten: string; chu: string; den: number } | null;
  /** Hội thi Ngọc Phả: còn mấy câu, đang câu thứ mấy. */
  hoiThiCon: number;
  hoiThiSo: number;
  /** Tu luyện có nhiều cách chơi (gõ số 1–7): lần cuối mỗi người làm từng việc (để hồi chiêu). */
  hdLuc: Map<string, Partial<Record<HoatDong, number>>>;
  /** Sự kiện tu luyện đang mở (Cơ Duyên Giáng Thế / Linh Thảo Nở Rộ) và lúc mở sự kiện kế. */
  skTl: { loai: SuKienTl; den: number; da: Set<string>; ten: string; boi: number; hinh: string } | null;
  skTlKe: number;
  skTlSo: number;
  /** Việc vừa làm gần nhất trong phòng — chữ to giữa màn (tên + kết quả). */
  hdMoi: { user: string; ten: string; viec: string; chu: string; luc: number; hiem: boolean } | null;
  /** Lôi Đài Đồng Môn đang mở (null: chưa ai lên đài), và số trận thắng có thưởng của từng người trong phiên. */
  loiDai: LoiDai | null;
  ldThuong: Map<string, number>;
  /** Điểm Lôi Đài từng người (lưu sổ, khoá `ld`): xếp hạng Top sau cảnh giới. */
  ldDiem: Map<string, number>;
  /** Hàng chờ khiêu chiến (tặng quà theo hạng), và bảng Top đang hiện (gõ 8 / vừa có người khiêu chiến). */
  ldHang: KhieuChien[];
  ldXem: { phe: Phe; den: number } | null;
  /** Giờ Lôi Đài (mục `loi-dai` của lịch): chỉ trong khung này trận mới mở — quà khiêu chiến lúc tu luyện chỉ xếp hàng. */
  ldGio: { den: number } | null;
  /** Món đan (D) / công pháp (C) đệ tử vừa mua hay đổi dùng, mới trước (tối đa 12, không ghi sổ) — quầy tu luyện
   *  chỉ hiện vài món dùng gần nhất của tông cho gọn (TuLuyenVui.tsx `QuayTuLuyen`). */
  muaGan: { phe: Phe; loai: 'd' | 'c'; so: number }[];
  /** Nhật ký mua / đổi món (mới cuối, tối đa 8, không ghi sổ) — dòng tin hoạt động góc phải dưới (QuaBien.tsx `TinHanhVi`). */
  muaLog: { user: string; ten: string; phe: Phe; loai: LoaiMa; so: number; mon: string; gia: number; luc: number }[];
  /** Lượt tung chiêu gần nhất (gõ 1 công · 2 thủ · 3 hồi · 4 phá ở Đại Chiến / boss; mới cuối, tối đa 6, không ghi
   *  sổ). Chiêu bốc ngẫu nhiên trong công pháp người đó đã có đúng hệ phím gõ (`chieuTheoKy`). */
  tungChieu: { user: string; ten: string; phe: Phe; ky: Ky; chieu: string; so: number; luc: number }[];
  /** Đang giữ màn TỈ THÍ (người vận hành nhảy tới tỉ thí): hết trận thì mở ngay trận kế, không rơi về tu luyện. */
  ldGiu: boolean;
  /** Ghế trưởng môn mỗi tông đang do ai giữ nhờ quà (null: thuộc top 1) — `loi/truong-mon.ts`. */
  truongMon: Record<Phe, GheTruongMon | null>;
  /** Câu đố A/B/C lúc tu luyện. Mặc định TẮT (2026-11-19): câu đố chuyển sang Khảo hạch Tàng Kinh (màn Đan Các ·
   *  Tàng Kinh Các); tu luyện chỉ còn gõ số, sự kiện, tỉ thí. Hội thi theo lịch vẫn hỏi câu đố. */
  cauTl: boolean;
  /** Các lần tặng quà gần nhất (mới nhất cuối) — biển quà trên màn. */
  quaMoi: QuaMoi[];
  /** Combo: món quà gần nhất của mỗi người, đếm số món tặng liên tiếp. */
  quaCombo: Map<string, { ten: string; so: number; luc: number }>;
  /** Lúc cần quà gấp đang mở (cứu viện boss / tử chiến PK) và các lượt đã mở trong trận này. */
  quaGap: { loai: LoaiGap; phe: Phe; den: number } | null;
  quaGapDa: Set<string>;
  /** Năm thứ mấy của phiên — mỗi giờ live là một năm (Kinh Thư §2.9). */
  nam: number;
  meKe: number;
  /** Lần mở Ải Nhập Môn kế tiếp (chỉ mở khi có khách đang chờ). */
  nmKe: number;
  /** Màn người vận hành đã tắt trên thẻ cài đặt. */
  /** Kho người vận hành sửa trên thẻ cài đặt (`datKho`): trang bị rơi, phần thưởng cơ duyên, sự kiện tu luyện.
   *  `null` / rỗng là bảng gốc. */
  khoDo: readonly MonDo[] | null;
  khoCoDuyen: readonly PhanCoDuyen[];
  khoSuKien: readonly MucSuKien[];
  /** Màn / sự kiện người vận hành tắt trên thẻ (`coDuyen`: sự kiện cơ duyên lúc tu luyện). */
  tat: { me: boolean; yeu: boolean; lu: boolean; coDuyen: boolean };
  /** Linh Mạch mỗi phe: tu luyện bồi đắp, kết trận pháp tiêu hao, thắng trận thêm (Kinh Thư §12). */
  linhMach: Record<Phe, number>;
  /** Trận lực của trận tu luyện mỗi phe (quà của môn đồ bồi vào) — quyết định cấp trận. */
  tranLuc: Record<Phe, number>;
  /** Lần soát xuất môn kế tiếp. */
  xmKe: number;
  /** Độ dài một lượt môn phái ở màn tu luyện (người vận hành chỉnh được). */
  luotPhe: number;
  /** Môn phái đang hiện ở màn tu luyện, lúc bắt đầu lượt, lúc đổi lượt kế, và tổng thời gian mỗi
   *  phe đã được hiện (để chọn lượt sau cho công bằng). */
  pheHien: Phe;
  pheTu: number;
  pheDoiLuc: number;
  pheTg: Record<Phe, number>;
}

export const HOI_THI_SO_CAU = 8;

export interface TinVao {
  kind: string;
  user?: string | undefined;
  ten: string;
  text?: string | undefined;
  count?: number | undefined;
  xu?: number | undefined;
}

export function taoThe(now: number, nhip: Nhip = NHIP_LIVE): The {
  return {
    nhip,
    batDau: now,
    nguoi: new Map(),
    pha: { k: 'cho', den: now + 3_000, tong: 3_000 },
    soCau: 0,
    daHoi: new Set(),
    daHoiKho: new Set(),
    hangKiep: [],
    phucLoc: 0,
    phucLocTu: null,
    luKe: now + nhip.luDau,
    yeuKe: now + nhip.yeuDau,
    muaKe: now + nhip.mua,
    yeuThu: 0,
    muc: 0,
    muaThang: { son: 0, thuy: 0 },
    suThi: [],
    ban: false,
    xoay: 0,
    kiepVua: false,
    kiepLuc: -Infinity,
    lich: [],
    lechPhut: 0,
    daChayLich: new Set(),
    hangDacBiet: [],
    theoLich: false,
    chuoi: CHUOI_MAU,
    chuoiI: 0,
    chuoiKe: now + CHUOI_MAU.nghi,
    chuoiCho: false,
    giu: false,
    chuoiGoc: now,
    chuoiDaChay: now - 1,
    baoTruoc: null,
    hoiThiCon: 0,
    hdLuc: new Map(),
    skTl: null,
    skTlKe: now + SK_TL_DAU,
    skTlSo: 0,
    hdMoi: null,
    loiDai: null,
    ldThuong: new Map(),
    ldDiem: new Map(),
    ldHang: [],
    ldXem: null,
    ldGio: null,
    muaGan: [],
    muaLog: [],
    tungChieu: [],
    ldGiu: false,
    truongMon: { son: null, thuy: null },
    cauTl: false,
    quaMoi: [],
    quaCombo: new Map(),
    quaGap: null,
    quaGapDa: new Set(),
    hoiThiSo: 0,
    nam: 1,
    meKe: now + nhip.meDau,
    nmKe: now + nhip.nmDau,
    khoDo: null,
    khoCoDuyen: CO_DUYEN_GOC,
    khoSuKien: SU_KIEN_GOC,
    tat: { me: false, yeu: false, lu: false, coDuyen: false },
    linhMach: { son: 0, thuy: 0 },
    tranLuc: { son: 0, thuy: 0 },
    xmKe: now + 5_000,
    luotPhe: nhip.doiPhe,
    pheHien: 'son',
    pheTu: now,
    pheDoiLuc: now + nhip.doiPhe,
    pheTg: { son: 0, thuy: 0 },
  };
}

// ---------- Hồ sơ bền ----------

interface HoSoNguoi {
  t: string;
  p: Phe | null;
  k: number;
  c: number;
  v: string[];
  d: number;
  /** Đồ đang mặc: ô → [phẩm, công, thủ, biến thể?, tên riêng?, ảnh riêng?]. Sổ cũ chỉ có 3 số đầu (món không
   *  biến thể — tên bảng gốc, hình chung). Tông / giới của món lấy lại từ người cầm khi nạp. */
  g?: Partial<Record<OTrangBi, [number, number, number, BienThe?, string?, string?]>>;
  /** Giới nhân vật. */
  x?: Gioi;
  /** Căn cơ. */
  r?: CanCo;
  /** Linh thạch. */
  tc?: number;
  /** Trận lực nhánh. */
  nh?: number;
  /** Tầng võ công. */
  w?: number;
  /** Trang phục đang mặc (1–9), và món đã có (bitmask) của trang phục, công pháp, pet. */
  a?: number;
  ac?: number;
  cp?: number;
  cc?: number;
  pt?: number;
  pc?: number;
  /** Đan trận trong túi: [công, thủ, hồi hồn, hộ kiếp]. */
  dn?: [number, number, number, number];
  /** Điểm Lôi Đài (xếp hạng Top tông sau cảnh giới). */
  ld?: number;
}

export interface SoHoSo {
  nguoi?: Record<string, HoSoNguoi>;
  mua?: Partial<Record<Phe, number>>;
  /** Linh Mạch hai phe. */
  lm?: Partial<Record<Phe, number>>;
  /** Trận lực của trận tu luyện hai phe. */
  tr?: Partial<Record<Phe, number>>;
}

function nguoiMoi(user: string, ten: string): NguoiChoi {
  return {
    user,
    ten,
    phe: null,
    gioi: null,
    canCo: null,
    tienLuc: 0,
    baoDu: false,
    tinChi: 0,
    nhanh: 0,
    vo: 0,
    ao: 0,
    aoCo: 0,
    cp: 0,
    cpCo: 0,
    pet: 0,
    petCo: 0,
    dan: { cong: 0, thu: 0, hon: 0, kiep: 0 },
    congDen: 0,
    thuDen: 0,
    timPhien: 0,
    lk: 0,
    canh: 0,
    linhVat: [],
    dung: 0,
    chuoi: 0,
    doiPheLuc: 0,
    kiepLai: 0,
    lanCuoi: 0,
    timLk: 0,
    timMoc: 0,
    choKiep: false,
    phienNay: false,
    huong: 0,
    danhLuc: 0,
    thuong: 1,
    thuongDen: 0,
    dayLuc: 0,
    tb: {},
    tkLuc: 0,
  };
}

const laPhe = (x: unknown): x is Phe => x === 'son' || x === 'thuy';
const so = (x: unknown, md = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : md);

/** Nạp sổ cũ. Dữ liệu hỏng từng dòng thì bỏ dòng đó, không làm hỏng cả sổ. */
export function napHoSo(the: The, d: SoHoSo): void {
  for (const [user, h] of Object.entries(d.nguoi ?? {})) {
    if (typeof h !== 'object' || h === null || user === '') continue;
    const n = the.nguoi.get(user) ?? nguoiMoi(user, typeof h.t === 'string' ? h.t : user);
    n.phe = laPhe(h.p) ? h.p : null;
    n.gioi = h.x === 'nam' || h.x === 'nu' ? h.x : null;
    n.canCo = CAN_CO_DS.includes(h.r as CanCo) ? (h.r as CanCo) : null;
    n.tinChi = Math.max(0, Math.round(so(h.tc)));
    n.nhanh = Math.max(0, Math.round(so(h.nh)));
    n.vo = Math.max(0, Math.min(VO_GIA.length, Math.round(so(h.w))));
    const bit = (x: unknown) => Math.max(0, Math.round(so(x))) & 0x3fe;
    const chon = (x: unknown, max: number) => Math.max(0, Math.min(max, Math.round(so(x))));
    n.ao = chon(h.a, AO.length);
    n.aoCo = bit(h.ac) | (n.ao > 0 ? 1 << n.ao : 0);
    n.cp = chon(h.cp, CONG_PHAP.length);
    n.cpCo = bit(h.cc) | (n.cp > 0 ? 1 << n.cp : 0);
    n.pet = chon(h.pt, PET.length);
    n.petCo = bit(h.pc) | (n.pet > 0 ? 1 << n.pet : 0);
    const dn = Array.isArray(h.dn) ? h.dn : [];
    n.dan = { cong: chon(dn[0], 99), thu: chon(dn[1], 99), hon: chon(dn[2], 99), kiep: chon(dn[3], 99) };
    n.canh = Math.min(CANH_GIOI.length - 1, Math.max(0, Math.round(so(h.c))));
    n.lk = Math.max(CANH_GIOI[n.canh]!.can, so(h.k));
    n.linhVat = Array.isArray(h.v) ? h.v.filter((x) => LINH_VAT.some((l) => l.id === x)) : [];
    n.dung = Math.max(0, so(h.d));
    n.tb = {};
    for (const o of O_TRANG_BI) {
      const x = h.g?.[o];
      if (!Array.isArray(x)) continue;
      const pham = Math.round(so(x[0], -1));
      if (pham < 0 || pham >= PHAM.length) continue;
      const t: TrangBi = { o, pham, cong: Math.max(0, Math.round(so(x[1]))), thu: Math.max(0, Math.round(so(x[2]))) };
      if (BIEN_THE_DS.includes(x[3] as BienThe)) t.bt = x[3] as BienThe;
      if (typeof x[4] === 'string' && x[4] !== '') t.ten = x[4];
      if (typeof x[5] === 'string' && x[5] !== '') t.anh = x[5];
      n.tb[o] = t;
    }
    dongTui(n);
    const ld = Math.max(0, Math.round(so(h.ld)));
    if (ld > 0) the.ldDiem.set(user, ld);
    the.nguoi.set(user, n);
  }
  the.muaThang = { son: Math.max(0, so(d.mua?.son)), thuy: Math.max(0, so(d.mua?.thuy)) };
  the.linhMach = { son: Math.max(0, Math.round(so(d.lm?.son))), thuy: Math.max(0, Math.round(so(d.lm?.thuy))) };
  the.tranLuc = { son: Math.max(0, Math.round(so(d.tr?.son))), thuy: Math.max(0, Math.round(so(d.tr?.thuy))) };
}

export function xuatHoSo(the: The): SoHoSo {
  const nguoi: Record<string, HoSoNguoi> = {};
  for (const n of the.nguoi.values()) {
    // Người chỉ ghé vào rồi đi, chưa có gì đáng giữ: không phình sổ.
    if (n.phe === null && n.lk === 0) continue;
    const g: NonNullable<HoSoNguoi['g']> = {};
    for (const o of O_TRANG_BI) {
      const t = n.tb[o];
      if (t === undefined) continue;
      const x: NonNullable<HoSoNguoi['g']>[OTrangBi] = [t.pham, t.cong, t.thu];
      if (t.bt !== undefined || t.ten !== undefined || t.anh !== undefined) x.push(t.bt ?? 'a');
      if (t.ten !== undefined || t.anh !== undefined) x.push(t.ten ?? '');
      if (t.anh !== undefined) x.push(t.anh);
      g[o] = x;
    }
    nguoi[n.user] = { t: n.ten, p: n.phe, k: Math.round(n.lk), c: n.canh, v: n.linhVat, d: n.dung };
    if (Object.keys(g).length > 0) nguoi[n.user]!.g = g;
    if (n.gioi !== null) nguoi[n.user]!.x = n.gioi;
    if (n.canCo !== null) nguoi[n.user]!.r = n.canCo;
    if (n.tinChi > 0) nguoi[n.user]!.tc = n.tinChi;
    if (n.nhanh > 0) nguoi[n.user]!.nh = n.nhanh;
    if (n.vo > 0) nguoi[n.user]!.w = n.vo;
    if (n.ao > 0) nguoi[n.user]!.a = n.ao;
    if (n.aoCo > 0) nguoi[n.user]!.ac = n.aoCo;
    if (n.cp > 0) nguoi[n.user]!.cp = n.cp;
    if (n.cpCo > 0) nguoi[n.user]!.cc = n.cpCo;
    if (n.pet > 0) nguoi[n.user]!.pt = n.pet;
    if (n.petCo > 0) nguoi[n.user]!.pc = n.petCo;
    const dn = n.dan;
    if (dn.cong + dn.thu + dn.hon + dn.kiep > 0) nguoi[n.user]!.dn = [dn.cong, dn.thu, dn.hon, dn.kiep];
    const ld = the.ldDiem.get(n.user) ?? 0;
    if (ld > 0) nguoi[n.user]!.ld = ld;
  }
  return { nguoi, mua: { ...the.muaThang }, lm: { ...the.linhMach }, tr: { ...the.tranLuc } };
}

/** Phiên live mới: giữ tu vi, quên mọi thứ của buổi trước. */
export function phienMoi(the: The, now: number): void {
  const giu = new Map(the.nguoi);
  const { muaThang, lich, lechPhut, daChayLich, luotPhe, linhMach, tranLuc, tat, theoLich, chuoi, ldDiem } = the;
  Object.assign(the, taoThe(now, the.nhip));
  Object.assign(the, { muaThang, lich, lechPhut, daChayLich, luotPhe, linhMach, tranLuc, tat, theoLich, chuoi, ldDiem });
  the.chuoiGoc = now;
  the.chuoiDaChay = now - 1;
  if (theoLich && theoGio(chuoi)) {
    henChuoi(the, now);
    the.muaKe = now + PHUT_TONG_KET * PHUT;
  } else the.chuoiKe = now + chuoi.nghi;
  for (const n of giu.values()) {
    n.phienNay = false;
    n.huong = 0;
    n.chuoi = 0;
    n.choKiep = false;
    n.kiepLai = 0;
    n.lanCuoi = 0;
    n.tienLuc = 0;
    n.timPhien = 0;
  }
  the.nguoi = giu;
}

/** Người vận hành đổi độ dài lượt môn phái (phút). */
export function datLuotPhe(the: The, phut: number): void {
  if (!Number.isFinite(phut) || phut <= 0) return;
  the.luotPhe = Math.round(phut * PHUT);
  // Rút ngắn ngay nếu lượt đang chạy dài hơn lượt mới.
  the.pheDoiLuc = Math.min(the.pheDoiLuc, the.pheTu + the.luotPhe);
}

/** Thời lượng gốc mà máu yêu tinh và trận khí được cân theo (90 giây đánh yêu, 40 giây Đại Chiến). */
const YEU_GOC = 90_000;
const LU_GOC = 40_000;

/** Người vận hành chỉnh nhịp trên các thẻ cài đặt (`cai-dat.ts`): mọi thời lượng, khoảng cách giữa các
 *  màn, và màn nào đang tắt. Máu yêu tinh và trận khí tự nhân theo thời lượng trận để trận không hết sớm;
 *  khoảng nghỉ giữa hai trận tính từ lúc trận trước xong. Khoảng cách vừa rút ngắn thì hẹn lại ngay. */
export function datNhip(the: The, nhip: Partial<Nhip>, tat: Partial<Record<'me' | 'yeu' | 'lu' | 'coDuyen', boolean>>, now: number): void {
  const cu = the.nhip;
  const nh: Nhip = { ...cu };
  for (const [k, v] of Object.entries(nhip) as [keyof Nhip, number | undefined][]) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) nh[k] = v;
  }
  the.nhip = nh;
  if (nh.mua !== cu.mua) the.muaKe = Math.min(the.muaKe, now + nh.mua);
  if (nh.nmCach < cu.nmCach) the.nmKe = Math.min(the.nmKe, now + nh.nmCach);
  if (nh.meCach < cu.meCach) the.meKe = Math.min(the.meKe, now + nh.meCach);
  if (nh.yeuCach < cu.yeuCach) the.yeuKe = Math.min(the.yeuKe, now + nh.yeuCach);
  if (nh.luCach < cu.luCach) the.luKe = Math.min(the.luKe, now + nh.luCach);
  if (nh.skTlCach < cu.skTlCach) the.skTlKe = Math.min(the.skTlKe, now + nh.skTlCach);
  the.tat = { me: tat.me === true, yeu: tat.yeu === true, lu: tat.lu === true, coDuyen: tat.coDuyen === true };
}

/** Người vận hành bật / tắt chạy theo lịch trình (thẻ Lịch trình). */
export function datTheoLich(the: The, bat: boolean, now = 0): void {
  const doi = the.theoLich !== bat;
  the.theoLich = bat;
  // Vừa bật: tu luyện một quãng nghỉ rồi chạy sự kiện đầu chuỗi.
  if (bat && doi && now > 0) {
    // Mốc phút 0 của "mỗi giờ" là lúc bật lịch (thường là lúc mở live).
    the.chuoiGoc = now;
    the.chuoiDaChay = now - 1;
    the.chuoiI = 0;
    the.chuoiCho = false;
    if (theoGio(the.chuoi)) {
      henChuoi(the, now);
      the.muaKe = now + PHUT_TONG_KET * PHUT;
    } else the.chuoiKe = now + the.chuoi.nghi;
    the.baoTruoc = null;
  }
}

/** Người vận hành đổi chuỗi sự kiện (kéo-thả thứ tự, sửa thông báo, giờ nghỉ). Sự kiện đang chạy không bị cắt. */
export function datChuoi(the: The, c: Chuoi, now: number): void {
  const nghiCu = the.chuoi.nghi;
  the.chuoi = c;
  if (the.chuoiI >= c.ds.length) the.chuoiI = 0;
  if (theoGio(c)) {
    // Theo giờ: sửa lịch là hẹn lại mốc kế ngay (sự kiện đang chạy không bị cắt).
    if (!the.chuoiCho && the.theoLich) henChuoi(the, now);
  } else if (!the.chuoiCho && c.nghi < nghiCu) {
    // Rút ngắn giờ nghỉ thì sự kiện kế tới sớm hơn ngay.
    the.chuoiKe = Math.min(the.chuoiKe, now + c.nghi);
  }
}

/** Ước lượng một mục chiếm bao lâu (để bảng lịch đoán giờ các mục sau). */
function uocLuong(the: The, m: MucChuoi): number {
  const nh = the.nhip;
  const v = docViec(m.viec);
  if (v === null) return m.phut * PHUT;
  if (m.phut > 0 && LOAI_TRAN.has(v.loai)) return m.phut * PHUT;
  if (v.loai === 'ai') return nh.nmVao + nh.nm + nh.nmKet;
  if (v.loai === 'dia-cung') return nh.me + nh.meKet;
  if (v.loai === 'pk') return nh.lu + nh.luKet;
  if (v.loai === 'cho') return nh.tt;
  if (v.loai === 'dai-lu') return 3 * nh.lu + nh.luKet;
  if (v.loai === 'dai-yeu') return 2 * nh.yeu + nh.yeuKet;
  if (v.loai.startsWith('yeu-')) return nh.yeu + nh.yeuKet;
  return 0;
}

/** Các việc sắp tới: chuỗi sự kiện (giờ ước lượng theo thứ tự) và sự kiện lớn theo giờ đồng hồ. */
export function lichSapToi(the: The, now: number, so = 6): { ten: string; hinh: string; luc: number }[] {
  const ra: { ten: string; hinh: string; luc: number }[] = sapToiDs(the.lich, now, the.lechPhut, so).map(({ d, luc }) => ({
    ten: tenLich(d),
    hinh: HINH_LICH[d.loai],
    luc,
  }));
  const ds = the.chuoi.ds;
  if (the.theoLich && theoGio(the.chuoi)) {
    const k0 = Math.floor((now - the.chuoiGoc) / GIO);
    for (const k of [k0, k0 + 1, k0 + 2]) {
      for (const m of ds) {
        const luc = the.chuoiGoc + k * GIO + m.batDau * PHUT;
        if (luc > now) ra.push({ ten: tenMuc(m), hinh: hinhMuc(m), luc });
      }
    }
  } else if (the.theoLich && ds.length > 0) {
    let t = the.chuoiCho ? Math.max(now, the.pha.den) + the.chuoi.nghi : the.chuoiKe;
    for (let k = 0; k < so; k++) {
      const m = ds[(the.chuoiI + k) % ds.length]!;
      ra.push({ ten: tenMuc(m), hinh: hinhMuc(m), luc: t });
      t += uocLuong(the, m) + (docViec(m.viec) === null ? 0 : the.chuoi.nghi);
    }
  }
  return ra.sort((a, b) => a.luc - b.luc).slice(0, so);
}

/** Người vận hành đổi lịch: áp ngay, không mất dấu sự kiện đã chạy. */
export function datLich(the: The, lich: DongLich[], lechPhut: number): void {
  the.lich = lich;
  the.lechPhut = lechPhut;
}

// ---------- Tiện ích ----------

function chon<T>(ds: readonly T[], rand: () => number): T {
  return ds[Math.floor(rand() * ds.length)]!;
}

function viet(the: The, loai: LoaiSuThi, thay: Record<string, string | number>): string {
  const ds = SU_THI[loai];
  const mau = ds[the.xoay++ % ds.length]!;
  return mau.replace(/\{(\w+)\}/g, (_, k: string) => String(thay[k] ?? ''));
}

function ghiSuThi(the: The, now: number, ra: Su[], loai: LoaiSuThi, thay: Record<string, string | number>, phe?: Phe) {
  const chu = viet(the, loai, thay);
  const dong: DongSuThi = phe === undefined ? { chu, luc: now } : { chu, phe, luc: now };
  the.suThi.push(dong);
  if (the.suThi.length > SU_THI_GIU) the.suThi.shift();
  ra.push(phe === undefined ? { k: 'su-thi', chu } : { k: 'su-thi', chu, phe });
}

export function dangChoi(the: The, now: number): NguoiChoi[] {
  const ra: NguoiChoi[] = [];
  for (const n of the.nguoi.values()) if (n.phienNay && now - n.lanCuoi <= DANG_CHOI) ra.push(n);
  return ra;
}

export function demPhe(the: The, now: number): Record<Phe, number> {
  const d = { son: 0, thuy: 0 };
  for (const n of dangChoi(the, now)) if (n.phe !== null) d[n.phe]++;
  return d;
}

/** Môn phái đang hiện ở màn tu luyện và còn bao lâu tới lượt phe kia. Phe tới lượt mà không có
 *  ai đang chơi thì hiện phe kia — không để sân trống. */
export function pheTuLuyen(the: The, now: number): { phe: Phe; con: number } {
  const phe = the.pheHien;
  const con = Math.max(0, the.pheDoiLuc - now);
  const d = demPhe(the, now);
  const khac: Phe = phe === 'son' ? 'thuy' : 'son';
  return { phe: d[phe] === 0 && d[khac] > 0 ? khac : phe, con };
}

/** Hết lượt môn phái thì chọn lượt sau: ngẫu nhiên nhưng công bằng. Thường đổi sang phe kia; thỉnh
 *  thoảng giữ phe đang hiện thêm một lượt — phe nào tổng thời gian được hiện ít hơn thì dễ được giữ
 *  hơn. Độ dài lượt cũng xê dịch 70–130% để không đoán trước được. Phe không có ai chơi thì nhường. */
function doiLuotPhe(the: The, now: number, rand: () => number) {
  if (now < the.pheDoiLuc) return;
  // Đang giữ màn: tông đang tu luyện ở nguyên, không đổi lượt.
  if (the.giu) return;
  // Đang tỉ thí Lôi Đài: đợi trận xong mới đổi lượt tông.
  if (the.loiDai?.tran != null) return;
  const cu = the.pheHien;
  const khac: Phe = cu === 'son' ? 'thuy' : 'son';
  the.pheTg[cu] += Math.max(0, now - the.pheTu);
  const d = demPhe(the, now);
  let ke: Phe;
  if (d[khac] === 0) ke = cu;
  else if (d[cu] === 0) ke = khac;
  else ke = rand() < (the.pheTg[cu] < the.pheTg[khac] ? 0.4 : 0.12) ? cu : khac;
  the.pheHien = ke;
  the.pheTu = now;
  the.pheDoiLuc = now + the.luotPhe * (0.7 + 0.6 * rand());
}

/** Tổng lực chiến (công + thủ) và số đệ tử đang chơi của một môn phái. */
export function tongLuc(the: The, now: number, phe: Phe): { luc: number; so: number } {
  let luc = 0;
  let so = 0;
  for (const n of dangChoi(the, now)) {
    if (n.phe !== phe) continue;
    luc += lucChien(n);
    so++;
  }
  return { luc, so };
}

export const tenCanh = (i: number) => CANH_GIOI[Math.min(CANH_GIOI.length - 1, Math.max(0, i))]!.ten;

/** Tiến độ trong cảnh giới hiện tại, 0..1. */
export function tienDo(n: NguoiChoi): number {
  const a = CANH_GIOI[n.canh]!.can;
  const b = CANH_GIOI[n.canh + 1]?.can;
  if (b === undefined) return 1;
  return Math.max(0, Math.min(1, (n.lk - a) / (b - a)));
}

const heSoLinhVat = (n: NguoiChoi) => 1 + 0.05 * Math.min(4, n.linhVat.length);

/** Công thủ hiện tại của một người (cảnh giới + đồ đang mặc). */
/** Pet đang theo: phần công thủ gốc được cộng thêm. */
export const phanPet = (n: NguoiChoi) => (n.pet > 0 ? (PET[n.pet - 1]?.phan ?? 0) : 0);

/** Công thủ hiện tại: cảnh giới + trang bị + pet (bảng ban-do.md §3c). */
export function congThu(n: NguoiChoi): { cong: number; thu: number } {
  const c = chiSo(n.canh, n.tb);
  const pp = phanPet(n);
  const t = n.thuong ?? 1;
  return { cong: Math.round((c.cong + Math.round(congGoc(n.canh) * pp)) * t), thu: Math.round((c.thu + Math.round(thuGoc(n.canh) * pp)) * t) };
}

/** Công pháp đang dùng: hệ, bậc và tên chiêu. Chưa chọn môn nào thì là võ công theo căn cơ (cách cũ). */
export function voCua(n: NguoiChoi): { he: CanCo | null; tang: number; ten: string | null } {
  const m = n.cp > 0 ? CONG_PHAP[n.cp - 1] : undefined;
  if (m !== undefined) return { he: m.he, tang: m.bac, ten: m.ten[n.phe ?? 'son'] };
  return { he: n.canCo, tang: n.vo, ten: n.vo > 0 ? tenVo(n) : null };
}

/** Lực chiến theo bảng hệ số (ban-do.md §3c): công + thủ (cảnh giới + trang bị) + công pháp (mỗi tầng
 *  6% lực chiến gốc của cảnh giới). Đan dược, trang phục, linh vật không cộng thẳng vào lực chiến. */
export function lucChienCua(canh: number, tb: TuiDo, vo: number, pp = 0): number {
  const c = chiSo(canh, tb);
  return c.cong + c.thu + Math.round(lucGoc(canh) * (VO_LUC * Math.max(0, vo) + pp));
}

export const lucChien = (n: NguoiChoi) => Math.round(lucChienCua(n.canh, n.tb, voCua(n).tang, phanPet(n)) * (n.thuong ?? 1));

/** Cộng linh khí, đột phá nếu đủ, dừng ở bình cảnh nếu cảnh kế tiếp phải độ kiếp. */
export function congLk(the: The, n: NguoiChoi, goc: number, now: number, ra: Su[], phuc = false): number {
  if (goc <= 0) return 0;
  const them = Math.round(goc * heSoLinhVat(n) * (phuc && the.phucLoc > 0 ? 2 : 1));
  const truoc = n.lk;
  n.lk += them;
  the.ban = true;
  // Không tự lên cấp: linh khí dừng ở ngưỡng cảnh giới kế, chờ người chơi tự gõ "đột phá".
  const ke = CANH_GIOI[n.canh + 1];
  if (ke !== undefined && n.lk >= ke.can) {
    n.lk = ke.can;
    if (!n.baoDu && n.phe !== null) {
      n.baoDu = true;
      ra.push({ k: 'du-lk', user: n.user });
      ghiSuThi(the, now, ra, 'duLinhKhi', { ten: n.ten, canh: ke.ten }, n.phe);
    }
  }
  if (n.lk > truoc) n.tienLuc = now;
  return them;
}

/** Hệ số đòn nhờ võ công (PK và yêu tinh): Chiến Tướng +8%/tầng, Phá Quân +5%, Hộ Vệ và Y Sư +3%. */
export function heSoVo(n: NguoiChoi): number {
  const v = voCua(n);
  if (v.he === null || v.tang <= 0) return 1;
  return 1 + HE_CP[v.he].don * v.tang;
}

/** Tên môn võ của một người (theo căn cơ và phe). */
export const tenVo = (n: NguoiChoi) => (n.canCo === null || n.phe === null ? null : VO_CONG[n.canCo].ten[n.phe]);

/** Gõ "học võ": đổi linh thạch lấy một tầng võ công của căn cơ mình. Thiếu linh thạch thì hiện thẻ tu vi. */
function hocVo(the: The, n: NguoiChoi, now: number, ra: Su[]) {
  // Gõ "học võ": mua môn công pháp rẻ nhất chưa có (như gõ mã C của môn đó).
  const i = CONG_PHAP.findIndex((m, j) => (n.cpCo & (1 << (j + 1))) === 0 && n.canh >= CANH_CP[m.bac]!);
  if (i < 0) {
    ra.push({ k: 'the', user: n.user });
    return;
  }
  dungMa(the, n, 'c', i + 1, now, ra);
}

/** Tàng Bảo Các: gõ mã (T/D/C/P + số). Chưa có thì mua bằng linh thạch rồi dùng; có rồi thì chỉ đổi sang
 *  dùng. Không đủ linh thạch, chưa đủ cảnh giới, hay linh khí đã đầy (đan linh khí) thì hiện thẻ tu vi. */
export function dungMa(the: The, n: NguoiChoi, loai: LoaiMa, so: number, now: number, ra: Su[]) {
  const i = so - 1;
  if (n.phe === null || i < 0 || i >= SO_MON[loai]) return;
  const khong = () => ra.push({ k: 'the', user: n.user });
  const bit = 1 << so;
  let daTra = 0;
  const tra = (gia: number) => {
    if (n.tinChi < gia) return false;
    n.tinChi -= gia;
    daTra = gia;
    return true;
  };
  let ten = '';
  let moi = false;
  if (loai === 't') {
    const m = AO[i]!;
    if (n.canh < m.can) return khong();
    if ((n.aoCo & bit) === 0) {
      if (!tra(m.gia)) return khong();
      n.aoCo |= bit;
      moi = true;
    }
    n.ao = so;
    ten = m.ten[n.phe];
  } else if (loai === 'c') {
    const m = CONG_PHAP[i]!;
    // Môn bậc cao phải đủ cảnh giới mới học (CANH_CP); môn đã có thì đổi về lúc nào cũng được.
    if ((n.cpCo & bit) === 0 && n.canh < CANH_CP[m.bac]!) return khong();
    if ((n.cpCo & bit) === 0) {
      if (!tra(m.gia)) return khong();
      n.cpCo |= bit;
      moi = true;
    }
    n.cp = so;
    ten = m.ten[n.phe];
  } else if (loai === 'p') {
    const m = PET[i]!;
    if ((n.petCo & bit) === 0) {
      if (!tra(m.gia)) return khong();
      n.petCo |= bit;
      moi = true;
    }
    n.pet = so;
    ten = `${m.hinh} ${m.ten}`;
  } else {
    const m = DAN[i]!;
    const dung = m.dung;
    const ke = CANH_GIOI[n.canh + 1];
    if (n.canh < m.can) return khong();
    if (('lk' in dung || 'day' in dung) && (ke === undefined || duLinhKhi(n))) return khong();
    if (!tra(m.gia)) return khong();
    moi = true;
    ten = m.ten;
    if ('lk' in dung) congLk(the, n, dung.lk, now, ra);
    else if ('day' in dung) congLk(the, n, Math.max(1, ke!.can - n.lk), now, ra);
    else n.dan[dung.tran]++;
    n.danCuoi = [so, ...(n.danCuoi ?? []).filter((x) => x !== so)].slice(0, 2);
  }
  the.ban = true;
  const pha = the.pha;
  if (pha.k === 'tt' && moi) {
    pha.mua.push({ user: n.user, ten: n.ten, mon: ten, ma: `${loai.toUpperCase()}${so}`, luc: now });
    if (pha.mua.length > 6) pha.mua.shift();
  }
  the.muaLog.push({ user: n.user, ten: n.ten, phe: n.phe, loai, so, mon: ten, gia: daTra, luc: now });
  if (the.muaLog.length > 8) the.muaLog.splice(0, the.muaLog.length - 8);
  if (loai === 'd' || loai === 'c') {
    const phe = n.phe;
    the.muaGan = [{ phe, loai, so }, ...the.muaGan.filter((x) => !(x.phe === phe && x.loai === loai && x.so === so))].slice(0, 12);
  }
  ra.push({ k: 'mua', user: n.user, loai, so, ten, moi });
  ghiSuThi(the, now, ra, moi ? 'muaMon' : 'dungMon', { ten: n.ten, mon: ten, ma: `${loai.toUpperCase()}${so}` }, n.phe);
}

/** Gõ "luyện đan": 20 linh thạch đổi một viên Tụ Khí Đan, luyện hoá ngay thành linh khí. */
/** TU LUYỆN NHIỀU CÁCH CHƠI — học theo live mẫu: bảng "Chơi nhanh · gõ số" luôn hiện lúc tu luyện.
 *  1 Vận công · 2 Hái linh thảo · 3 Luyện đan · 4 Học võ · 5 Đột phá · 6 Cơ duyên · 7 Tu vi.
 *  Câu đố Ngọc Phả vẫn chạy song song (gõ A B C). Mỗi việc có hồi chiêu riêng để không ai spam mà tiến vọt;
 *  sự kiện tu luyện (mỗi SK_TL_CACH) cho cơ hội lớn trong SK_TL_LAU. */
export type HoatDong = 'van-cong' | 'hai' | 'co-duyen';
export type SuKienTl = 'co-duyen' | 'linh-thao';
export const SO_TU_LUYEN: Record<string, Lenh> = {
  '1': { k: 'van-cong' },
  '2': { k: 'hai' },
  '3': { k: 'dan' },
  '4': { k: 'hoc-vo' },
  '5': { k: 'dot-pha' },
  '6': { k: 'co-duyen' },
  '7': { k: 'toi' },
};
export const HD_CACH: Record<HoatDong, number> = { 'van-cong': 20_000, hai: 45_000, 'co-duyen': 0 };
/** Linh Thảo Nở Rộ: hái nhanh hơn và được gấp đôi. */
const HAI_CACH_NO = 15_000;
export const VAN_CONG_LK = 1;
export const HAI_LK = 2;
const LINH_CHI_LK = 12;
const SK_TL_DAU = 90_000;
export const SK_TL_CACH = NHIP_LIVE.skTlCach;
export const SK_TL_LAU = NHIP_LIVE.skTlLau;
export const TEN_SK_TL: Record<SuKienTl, { ten: string; go: string; chu: string }> = {
  'co-duyen': { ten: 'Cơ Duyên Giáng Thế', go: '6', chu: 'nhận cơ duyên miễn phí' },
  'linh-thao': { ten: 'Linh Thảo Nở Rộ', go: '2', chu: 'hái linh thảo ×2' },
};

/** Một sự kiện tu luyện trong danh sách người vận hành sửa được (thẻ "Cơ duyên"): `loai` quyết định cách chơi
 *  (cơ duyên: gõ 6 nhận thưởng; linh thảo: gõ 2 hái nhanh, được ×`boi`), còn tên / hình / hệ số thì tuỳ. */
export interface MucSuKien {
  id: string;
  loai: SuKienTl;
  ten: string;
  boi: number;
  hinh: string;
  bat: boolean;
}
export const SU_KIEN_GOC: readonly MucSuKien[] = [
  { id: 'co-duyen', loai: 'co-duyen', ten: TEN_SK_TL['co-duyen'].ten, boi: 1, hinh: '✨', bat: true },
  { id: 'linh-thao', loai: 'linh-thao', ten: TEN_SK_TL['linh-thao'].ten, boi: 2, hinh: '🌿', bat: true },
];
/** Dòng "gõ số mấy để làm gì" của sự kiện đang mở. */
export const chuSuKien = (sk: { loai: SuKienTl; boi: number }) => (sk.loai === 'linh-thao' ? `hái linh thảo ×${sk.boi}` : TEN_SK_TL[sk.loai].chu);

/** Một phần thưởng cơ duyên (gõ 6 lúc Cơ Duyên Giáng Thế) — bốc theo tỉ trọng `tiLe`. `loai`: `do` trang bị phẩm
 *  `tu`; `thach` linh thạch `tu`–`den`; `lk` linh khí `tu`–`den`. `hiem`: chữ vàng rực giữa màn. */
export interface PhanCoDuyen {
  id: string;
  loai: 'do' | 'thach' | 'lk';
  ten: string;
  tu: number;
  den: number;
  tiLe: number;
  hiem: boolean;
  hinh: string;
  bat: boolean;
}
export const CO_DUYEN_GOC: readonly PhanCoDuyen[] = [
  { id: 'do', loai: 'do', ten: 'Trang bị Linh phẩm', tu: 1, den: 1, tiLe: 4, hiem: true, hinh: '⚔️', bat: true },
  { id: 'dan', loai: 'lk', ten: 'Tụ Khí Đan', tu: 25, den: 25, tiLe: 10, hiem: true, hinh: '💊', bat: true },
  { id: 'thach', loai: 'thach', ten: 'Linh thạch', tu: 3, den: 6, tiLe: 36, hiem: false, hinh: '💎', bat: true },
  { id: 'lk', loai: 'lk', ten: 'Linh khí', tu: 6, den: 12, tiLe: 50, hiem: false, hinh: '⚡', bat: true },
];

/** Người vận hành sửa kho trên thẻ cài đặt: danh sách rỗng / không còn mục nào bật thì dùng bảng gốc. */
export function datKho(the: The, kho: { do?: readonly MonDo[] | null; coDuyen?: readonly PhanCoDuyen[]; suKien?: readonly MucSuKien[] }): void {
  if (kho.do !== undefined) the.khoDo = kho.do !== null && kho.do.some((m) => m.bat) ? kho.do : null;
  if (kho.coDuyen !== undefined) the.khoCoDuyen = kho.coDuyen.some((m) => m.bat && m.tiLe > 0) ? kho.coDuyen : CO_DUYEN_GOC;
  if (kho.suKien !== undefined) the.khoSuKien = kho.suKien.some((m) => m.bat) ? kho.suKien : SU_KIEN_GOC;
}

const laTuLuyen = (p: Pha) => p.k === 'cho' || p.k === 'hoi' || p.k === 'dap';

/** Ghi việc vừa làm để hiện chữ to giữa màn và chữ bay trên đầu. */
function baoHd(the: The, n: NguoiChoi, loai: HoatDong, viec: string, chu: string, hiem: boolean, now: number, ra: Su[]) {
  the.hdMoi = { user: n.user, ten: n.ten, viec, chu, luc: now, hiem };
  ra.push({ k: 'hd', user: n.user, loai, chu, hiem });
}

/** Còn bao lâu nữa người này mới làm lại được việc `loai` (0 là làm được ngay). */
export function conHoi(the: The, user: string, loai: HoatDong, now: number): number {
  const luc = the.hdLuc.get(user)?.[loai];
  if (luc === undefined) return 0;
  const cach = loai === 'hai' && the.skTl?.loai === 'linh-thao' && now < the.skTl.den ? HAI_CACH_NO : HD_CACH[loai];
  return Math.max(0, luc + cach - now);
}

function hoatDong(the: The, n: NguoiChoi, loai: HoatDong, now: number, rand: () => number, ra: Su[]) {
  if (n.phe === null || !laTuLuyen(the.pha)) return;
  const sk = the.skTl !== null && now < the.skTl.den ? the.skTl : null;
  if (loai === 'co-duyen') {
    // Chỉ trong lúc Cơ Duyên Giáng Thế, mỗi người một lần mỗi đợt.
    if (sk === null || sk.loai !== 'co-duyen' || sk.da.has(n.user)) return;
    sk.da.add(n.user);
    // Bốc một phần thưởng trong kho cơ duyên theo tỉ trọng (thẻ "Cơ duyên" sửa được, mặc định CO_DUYEN_GOC).
    const ds = the.khoCoDuyen.filter((m) => m.bat && m.tiLe > 0);
    let r = rand() * ds.reduce((a, m) => a + m.tiLe, 0);
    let m = ds[ds.length - 1]!;
    for (const x of ds) {
      r -= x.tiLe;
      if (r < 0) {
        m = x;
        break;
      }
    }
    const luong = () => (m.den > m.tu ? m.tu + Math.floor(rand() * (m.den - m.tu + 1)) : m.tu);
    if (m.loai === 'do') {
      const vat = taoDo(O_TRANG_BI[Math.floor(rand() * O_TRANG_BI.length)]!, m.tu, rand, the.khoDo);
      const { mac } = nhanDo(the, n, vat, now, ra);
      baoHd(the, n, loai, sk.ten === TEN_SK_TL['co-duyen'].ten ? 'Cơ duyên' : sk.ten, `nhặt được ${tenDo(vat)}${mac ? ' · mặc ngay' : ''}`, m.hiem, now, ra);
    } else if (m.loai === 'thach') {
      const th = luong();
      n.tinChi += th;
      the.ban = true;
      baoHd(the, n, loai, 'Cơ duyên', m.hiem ? `được tặng ${m.ten} · +${th} linh thạch` : `+${th} linh thạch`, m.hiem, now, ra);
    } else {
      const lk = congLk(the, n, luong(), now, ra);
      baoHd(the, n, loai, 'Cơ duyên', m.hiem ? `được tặng ${m.ten} · +${lk} linh khí` : `+${lk} linh khí`, m.hiem, now, ra);
    }
    return;
  }
  if (conHoi(the, n.user, loai, now) > 0) return;
  const luc = the.hdLuc.get(n.user) ?? {};
  luc[loai] = now;
  the.hdLuc.set(n.user, luc);
  if (loai === 'van-cong') {
    const lk = congLk(the, n, VAN_CONG_LK, now, ra);
    baoHd(the, n, loai, 'Vận công', lk > 0 ? `+${lk} linh khí` : 'linh khí đã đầy · gõ 5 đột phá', false, now, ra);
    return;
  }
  // Hái linh thảo: thường +2 linh khí; đôi khi kèm linh thạch; hiếm gặp Linh Chi Ngàn Năm.
  const boi = sk?.loai === 'linh-thao' ? sk.boi : 1;
  const r = rand();
  if (r < 0.05) {
    const lk = congLk(the, n, LINH_CHI_LK * boi, now, ra);
    baoHd(the, n, loai, 'Hái linh thảo', `Linh Chi Ngàn Năm! +${lk} linh khí`, true, now, ra);
  } else if (r < 0.3) {
    const lk = congLk(the, n, HAI_LK * boi, now, ra);
    n.tinChi += boi;
    the.ban = true;
    baoHd(the, n, loai, 'Hái linh thảo', `+${lk} linh khí · +${boi} linh thạch`, false, now, ra);
  } else {
    const lk = congLk(the, n, HAI_LK * boi, now, ra);
    baoHd(the, n, loai, 'Hái linh thảo', `+${lk} linh khí`, false, now, ra);
  }
}

/** Sự kiện tu luyện: tới giờ mà đang tu luyện thì mở (luân phiên Cơ Duyên / Linh Thảo); hết giờ thì đóng. */
function buocSuKienTl(the: The, now: number, ra: Su[]) {
  if (the.skTl !== null && now >= the.skTl.den) the.skTl = null;
  if (the.skTl !== null || now < the.skTlKe || !laTuLuyen(the.pha) || the.tat.coDuyen) return;
  const ds = the.khoSuKien.filter((m) => m.bat);
  const m = ds[the.skTlSo % ds.length]!;
  moSuKienTl(the, m.loai, now, ra, m);
}

/** Mở ngay một sự kiện cơ duyên (lịch tự động, hoặc nút "✨ Cơ duyên" trên thanh điều khiển của người vận hành).
 *  Đang có sự kiện thì thay bằng sự kiện mới; lần tự mở kế tính lại từ lúc này. */
export function moSuKienTl(the: The, loai: SuKienTl, now: number, ra: Su[], muc?: MucSuKien): void {
  const m = muc ?? the.khoSuKien.find((x) => x.loai === loai) ?? SU_KIEN_GOC.find((x) => x.loai === loai)!;
  the.skTlSo++;
  the.skTl = { loai, den: now + the.nhip.skTlLau, da: new Set(), ten: m.ten, boi: Math.max(1, m.boi), hinh: m.hinh };
  the.skTlKe = now + the.nhip.skTlCach;
  ra.push({ k: 'doc', chu: `${m.ten}! Gõ ${TEN_SK_TL[loai].go} để ${chuSuKien(the.skTl)}.` });
}

function luyenDan(the: The, n: NguoiChoi, now: number, ra: Su[]) {
  if (n.phe === null || n.tinChi < DAN_GIA || duLinhKhi(n)) {
    // Thiếu linh thạch, hoặc linh khí đã đầy (phải đột phá trước, kẻo phí đan).
    ra.push({ k: 'the', user: n.user });
    return;
  }
  n.tinChi -= DAN_GIA;
  const lk = congLk(the, n, DAN_LK, now, ra);
  ra.push({ k: 'luyen-dan', user: n.user, lk });
  the.hdMoi = { user: n.user, ten: n.ten, viec: 'Luyện đan', chu: `Tụ Khí Đan · +${lk} linh khí`, luc: now, hiem: false };
}

/** Đã đủ linh khí cho cảnh giới kế chưa (đang chờ gõ "đột phá"). */
export const duLinhKhi = (n: NguoiChoi) => {
  const ke = CANH_GIOI[n.canh + 1];
  return ke !== undefined && n.lk >= ke.can;
};

/** Đếm tim trong buổi; chạm mốc nào thì thưởng linh thạch mốc đó. */
function demTim(the: The, n: NguoiChoi, so: number, ra: Su[]) {
  const truoc = n.timPhien;
  n.timPhien += so;
  for (const [moc, thach] of THACH.timMoc) {
    if (truoc < moc && n.timPhien >= moc) {
      n.tinChi += thach;
      the.ban = true;
      ra.push({ k: 'tim-moc', user: n.user, moc, thach });
    }
  }
}

/** Có người đột phá là cả phòng có lộc: người đột phá được 5 × cảnh giới mới linh thạch, mỗi người đang
 *  online (còn hành động trong 5 phút qua) được 1 × cảnh giới mới. Trả về sự kiện để lớp vẽ hiện ra. */
function suDotPha(the: The, n: NguoiChoi, now: number): Su {
  const thach = THACH.dotPha * n.canh;
  const phong = THACH.phong * n.canh;
  n.tinChi += thach;
  for (const x of dangChoi(the, now)) if (x !== n) x.tinChi += phong;
  the.ban = true;
  return { k: 'dot-pha', user: n.user, canh: n.canh, thach, phong };
}

/** Người chơi gõ "đột phá": dưới Nguyên Anh thì lên ngay; từ Nguyên Anh thì xin độ kiếp. */
function dotPhaTay(the: The, n: NguoiChoi, now: number, ra: Su[]) {
  const ke = CANH_GIOI[n.canh + 1];
  if (n.phe === null || ke === undefined || n.lk < ke.can) {
    // Chưa đủ: hiện thẻ tu vi cho thấy còn thiếu bao nhiêu.
    ra.push({ k: 'the', user: n.user });
    return;
  }
  if (ke.hoPhap > 0) {
    xepKiep(the, n, now, ra);
    return;
  }
  n.canh++;
  n.baoDu = false;
  n.tienLuc = now;
  the.ban = true;
  ra.push(suDotPha(the, n, now));
  ghiSuThi(the, now, ra, 'dotPha', { ten: n.ten, canh: tenCanh(n.canh) }, n.phe);
}

function xepKiep(the: The, n: NguoiChoi, now: number, ra: Su[]) {
  if (n.choKiep || now < n.kiepLai) return;
  n.choKiep = true;
  the.hangKiep.push(n.user);
  ghiSuThi(the, now, ra, 'binhCanh', { ten: n.ten, canh: tenCanh(n.canh) }, n.phe ?? undefined);
}

const bamChu = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** Phe đang yếu hơn (ít đệ tử đang chơi hơn; bằng nhau thì tổng lực chiến thấp hơn) — nơi xếp người
 *  mới khi họ không tự chọn phe, để lực lượng luôn cân. */
export function pheCanBang(the: The, now: number): Phe {
  const a = tongLuc(the, now, 'son');
  const b = tongLuc(the, now, 'thuy');
  if (a.so !== b.so) return a.so < b.so ? 'son' : 'thuy';
  return b.luc < a.luc ? 'thuy' : 'son';
}

/** Cấp trận tu luyện của phe: cấp (1–5), tên, tiến độ tới cấp kế (0..1), linh thạch mỗi câu đúng. */
export function capTran(the: The, phe: Phe): { cap: number; ten: string; tienDo: number; thach: number } {
  const luc = the.tranLuc[phe];
  let i = 0;
  while (i + 1 < TRAN_TU.length && luc >= TRAN_TU[i + 1]!.can) i++;
  const ke = TRAN_TU[i + 1];
  const tienDo = ke === undefined ? 1 : (luc - TRAN_TU[i]!.can) / (ke.can - TRAN_TU[i]!.can);
  return { cap: i + 1, ten: TRAN_TU[i]!.ten, tienDo, thach: i };
}

/** Cấp nhánh trận của một môn đồ (0–4) theo tổng xu đã góp. */
export const capNhanh = (n: NguoiChoi) => NHANH_MOC.filter((m) => n.nhanh >= m).length;

/** Quà của môn đồ bồi vào trận: nâng nhánh của người tặng, nhánh lên cấp thì đẩy thêm lực cho trận phe. */
function boiTran(the: The, n: NguoiChoi & { phe: Phe }, xu: number, now: number, ra: Su[]) {
  const nhanhTruoc = capNhanh(n);
  const tranTruoc = capTran(the, n.phe).cap;
  n.nhanh += xu;
  const nhanhSau = capNhanh(n);
  the.tranLuc[n.phe] += xu + NHANH_DAY * (nhanhSau - nhanhTruoc);
  the.ban = true;
  if (nhanhSau > nhanhTruoc) ra.push({ k: 'nhanh-len', user: n.user, cap: nhanhSau });
  const sau = capTran(the, n.phe);
  if (sau.cap > tranTruoc) {
    ra.push({ k: 'tran-len', phe: n.phe, cap: sau.cap, ten: sau.ten });
    ghiSuThi(the, now, ra, 'tranLen', { phe: PHE[n.phe].tenNgan, tran: sau.ten, thach: sau.thach }, n.phe);
    ra.push({ k: 'doc', chu: `${PHE[n.phe].ten} nâng trận lên ${sau.ten}!` });
  }
}

/** Quà lúc tu luyện (bảng "Quà tặng quy đổi" bên trái màn): mỗi xu bản thân +QUA_LK linh khí (cùng linh
 *  thạch và trận lực ở chỗ khác), và truyền công cho đệ tử cùng tông ngồi dưới mình (cảnh giới / lực chiến
 *  thấp hơn): mỗi người +1 linh khí cho mỗi QUA_XU_MOI_LK xu, tối đa QUA_DUOI_TOI_DA mỗi lần, tối đa QUA_DUOI_SO người. */
export const QUA_LK = 2;
export const QUA_XU_MOI_LK = 2;
export const QUA_DUOI_TOI_DA = 30;
export const QUA_DUOI_SO = 12;

function truyenCong(the: The, n: NguoiChoi & { phe: Phe }, xu: number, now: number, ra: Su[]) {
  congLk(the, n, QUA_LK * xu, now, ra);
  const moi = Math.min(QUA_DUOI_TOI_DA, Math.ceil(xu / QUA_XU_MOI_LK));
  const lc = lucChien(n);
  const duoi = dangChoi(the, now)
    .filter((m) => m.phe === n.phe && m.user !== n.user && (m.canh < n.canh || (m.canh === n.canh && lucChien(m) < lc)))
    .sort((a, b) => b.canh - a.canh || lucChien(b) - lucChien(a))
    .slice(0, QUA_DUOI_SO);
  for (const m of duoi) congLk(the, m, moi, now, ra);
  if (duoi.length > 0) ra.push({ k: 'truyen-cong', user: n.user, nhan: duoi.map((m) => m.user), lk: moi });
}

/** Số trưởng lão NPC đang ngồi trận của một phe: bù cho đủ 6 khi phe chưa đủ đệ tử thật. */
export function soNpc(the: The, phe: Phe, now: number): number {
  return Math.max(0, SO_NPC - demPhe(the, now)[phe]);
}

const npcNho = new Map<string, NguoiChoi>();
/** Các trưởng lão NPC (dưới dạng nhân vật để lớp vẽ bày lên trận). Không nằm trong `the.nguoi`. */
export function npcCua(phe: Phe, so: number): NguoiChoi[] {
  return NPC_TRUONG_LAO[phe].slice(0, Math.max(0, so)).map((x) => {
    let n = npcNho.get(x.id);
    if (n === undefined) {
      n = { ...nguoiMoi(x.id, x.ten), phe, gioi: x.gioi, canCo: x.canCo, canh: x.canh, lk: CANH_GIOI[x.canh]!.can };
      npcNho.set(x.id, n);
    }
    return n;
  });
}

/** Đóng tông, giới của người cầm lên mọi món đang mặc (tên, hình theo người cầm). Gọi sau khi đổi tông / giới. */
function dongTui(n: NguoiChoi) {
  for (const o of O_TRANG_BI) {
    const t = n.tb[o];
    if (t === undefined) continue;
    if (n.phe !== null) t.tg = n.phe;
    if (n.gioi !== null) t.gi = n.gioi;
  }
}

/** Nhập môn được ban đồ: ô nào còn trống thì nhận một món Phàm phẩm của tông mình (giáp y đúng giới), biến thể
 *  a / b / c bốc ngẫu nhiên. Ô đã có đồ thì giữ nguyên — không ban lại. Chỉ số theo bảng gốc (`GOC_PHAM[0]` ±15%),
 *  không theo kho người vận hành. */
function banDoNhapMon(n: NguoiChoi, rand: () => number) {
  for (const o of O_TRANG_BI) {
    if (n.tb[o] !== undefined) continue;
    n.tb[o] = taoDo(o, 0, rand, null, { phe: n.phe, gioi: n.gioi });
  }
}

function nhapPhe(the: The, n: NguoiChoi, phe: Phe, now: number, ra: Su[], gioi: Gioi | undefined, rand: () => number) {
  n.phe = phe;
  n.gioi = gioi ?? n.gioi ?? GIOI_GOC[phe];
  dongTui(n);
  banDoNhapMon(n, rand);
  // Căn cơ chia ngẫu nhiên — không bắt ai gõ thêm; ai muốn đổi thì gõ tên căn cơ.
  if (n.canCo === null) n.canCo = chon(CAN_CO_DS, rand);
  // Nhập môn được ban ngẫu nhiên một trong năm bộ trang phục cơ bản.
  if (n.ao === 0) n.ao = 1 + Math.floor(rand() * SO_TRANG_PHUC);
  n.aoCo |= 1 << n.ao;
  n.tienLuc = now;
  n.doiPheLuc = now;
  the.ban = true;
  ra.push({ k: 'nhap', user: n.user, phe });
  ghiSuThi(the, now, ra, phe === 'son' ? 'nhapSon' : 'nhapThuy', { ten: n.ten }, phe);
}

/** Cho một người nhập môn ngay, không qua Ải Nhập Môn — chỉ dùng cho bản chơi thử và kiểm thử. */
export function nhapMonThang(the: The, tin: TinVao, phe: Phe, gioi: Gioi | undefined, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  const n = layNguoi(the, tin, now);
  if (n === null || n.phe !== null) return ra;
  n.lanCuoi = now;
  n.phienNay = true;
  nhapPhe(the, n, phe, now, ra, gioi, rand);
  return ra;
}

function layNguoi(the: The, tin: TinVao, now: number): NguoiChoi | null {
  const user = (tin.user ?? '').trim();
  if (user === '') return null;
  let n = the.nguoi.get(user);
  if (n === undefined) {
    n = nguoiMoi(user, tin.ten || user);
    the.nguoi.set(user, n);
  }
  if (tin.ten) n.ten = tin.ten;
  return n;
}

const CHU_ABC = ['A', 'B', 'C'] as const;

// ---------- Tin vào ----------

export function nhanTin(the: The, tin: TinVao, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  if (tin.kind !== 'comment' && tin.kind !== 'like' && tin.kind !== 'gift') return ra;
  const n = layNguoi(the, tin, now);
  if (n === null) return ra;
  n.lanCuoi = now;
  n.phienNay = true;
  const pha = the.pha;

  if (pha.k === 'yeu') pha.tuongTac.add(n.user);
  // Đệ tử cũ mới quay lại phiên này: bắt đầu tính giờ tu luyện từ lúc này.
  if (n.phe !== null && n.tienLuc === 0) n.tienLuc = now;

  if (tin.kind === 'gift') {
    const xu = Math.max(1, Math.round(tin.xu ?? tin.count ?? 1));
    n.huong += xu;
    n.tinChi += xu;
    the.ban = true;
    if (coPhe(n)) boiTran(the, n, xu, now, ra);
    if (coPhe(n) && (pha.k === 'cho' || pha.k === 'hoi' || pha.k === 'dap')) truyenCong(the, n, xu, now, ra);
    // Ghế trưởng môn: lúc tu luyện (không đang tỉ thí), quà đủ lớn thì lên / giành ghế.
    if (coPhe(n) && (pha.k === 'cho' || pha.k === 'hoi' || pha.k === 'dap') && the.loiDai?.tran == null) quaTruongMon(the, n, xu, now, ra);
    // Lôi Đài: đấu thủ đang đấu thì quà ra chiêu; quà khiêu chiến (theo hạng Top) thì xếp hàng khiêu chiến.
    quaDai(the, n, xu, tin.text ?? '', now, rand, ra);
    if (pha.k === 'yeu') pha.qua.set(n.user, (pha.qua.get(n.user) ?? 0) + xu);
    // Mê cung (Ải Nhập Môn, Tranh Đoạt Bảo Vật): quà làm rơi thêm vật phẩm.
    if (pha.k === 'nm' || pha.k === 'me') quaMeCung(the, pha, n, xu, now, rand, ra);
    if (pha.k === 'lu') {
      if (!coPhe(n)) kichSiKhi(pha, n, xu, now, ra);
      const diem = quaLu(pha, n, xu, now, ra);
      // Tử chiến: quà của tông đang nguy được nhân đôi điểm.
      if (coPhe(n) && the.quaGap?.loai === 'tu-chien' && the.quaGap.phe === n.phe && now < the.quaGap.den) ghiDiem(pha, n, diem, now, ra);
      if (coPhe(n)) quaChieu(the, pha, n, xu, now, ra);
      // Chiến trường: phút chót điểm quà nhân đôi; quà dồn vào cứ điểm, gọi viện binh / thần ra tay.
      if (coPhe(n)) {
        if (phutChot(pha, now)) ghiDiem(pha, n, diem, now, ra);
        quaChienTruong(pha, n.user, n.ten, n.phe, xu, now, ra);
      }
    }
    // Đánh yêu tinh: quà thỉnh ngay trận pháp theo căn cơ người tặng (không tốn Linh Mạch).
    if (pha.k === 'yeu' && n.phe !== null && n.canCo !== null) {
      ketTran(the, pha, n.phe, CAN_CO[n.canCo].ky, now, ra, 'qua', n.user);
    }
    // Thang 5 bậc + combo + biển quà.
    const bac = bacQua(xu);
    const tenQua = (tin.text ?? '').trim() || 'Quà';
    const cb = the.quaCombo.get(n.user);
    const so = Math.max(1, tin.count ?? 1);
    const combo = cb !== undefined && cb.ten === tenQua && now - cb.luc < COMBO_CACH ? cb.so + so : so;
    the.quaCombo.set(n.user, { ten: tenQua, so: combo, luc: now });
    const chu = tacDungBac(the, n, xu, bac, now, rand, ra);
    ghiQuaMoi(the, { user: n.user, ten: n.ten, qua: tenQua, xu, bac, combo, luc: now, chu });
    ra.push({ k: 'qua', user: n.user, so, ten: tenQua, xu, bac, combo });
    ghiSuThi(the, now, ra, 'qua', { ten: n.ten, so: tin.count ?? 1, qua: tin.text || 'nén hương' }, n.phe ?? undefined);
    return ra;
  }

  if (tin.kind === 'like') {
    if (pha.k === 'lu') {
      if (!coPhe(n)) kichSiKhi(pha, n, Math.max(1, tin.count ?? 1) * KICH_TIM, now, ra);
      timLu(pha, n, Math.max(1, tin.count ?? 1), now, ra);
      demTim(the, n, Math.max(1, tin.count ?? 1), ra);
      // Bong bóng tim nổi lên từ chỗ người thả (cả tán tu hàng dưới) — chỉ để vẽ.
      ra.push({ k: 'tim', user: n.user });
    } else {
      if (pha.k === 'me') vaoMe(the, pha, n, now);
      if (pha.k === 'yeu') {
        pha.tim.set(n.user, (pha.tim.get(n.user) ?? 0) + Math.max(1, tin.count ?? 1));
        if ((pha.choang.get(n.user) ?? 0) > now) {
          pha.choang.delete(n.user);
          ra.push({ k: 'hoi-khi', user: n.user });
        }
        timYeu(the, pha, n, now, rand, ra);
      }
      if (laTuLuyen(pha)) timDai(the, n, Math.max(1, tin.count ?? 1));
      if (now - n.timMoc > TIM_CUA_SO) {
        n.timMoc = now;
        n.timLk = 0;
      }
      if (n.timLk < TIM_TOI_DA) {
        n.timLk++;
        congLk(the, n, 1, now, ra);
      }
      demTim(the, n, Math.max(1, tin.count ?? 1), ra);
      ra.push({ k: 'tim', user: n.user });
    }
    return ra;
  }

  // Trong mê cung (Ải lúc đi tới cửa tông, Tranh Đoạt Bảo Vật) gõ số để đi: 1 lên, 2 xuống, 3 trái, 4 phải;
  // gõ lặp ("1 1 1") là đi bấy nhiêu bước.
  const soDi = /^\s*([1-4])((?:\s+\1)*)\s*$/.exec(tin.text ?? '');
  const diSo = soDi !== null && ((pha.k === 'nm' && now >= pha.moLuc) || pha.k === 'me');
  // Tu luyện: gõ số 1–7 theo bảng "Chơi nhanh" (chỉ đệ tử).
  // Lôi Đài: gõ 8 (hay "top") xem bảng Top; đấu thủ đang đấu gõ 1 công · 2 thủ · 3 tuyệt kỹ.
  if (laTuLuyen(pha) && n.phe !== null) {
    const t = (tin.text ?? '').trim().toLowerCase();
    if (t === LD_SO || /^(top|l[eêế]n\s*[dđ][aà]i)$/u.test(t)) {
      xemTop(the, n, now);
      return ra;
    }
    if (/^[1-3]$/.test(t) && chieuDai(the, n, t, now, rand, ra)) return ra;
  }
  const soTl = laTuLuyen(pha) && n.phe !== null ? SO_TU_LUYEN[/^\s*([1-7])\s*$/.exec(tin.text ?? '')?.[1] ?? ''] : undefined;
  // Đại Chiến, đánh yêu tinh: gõ số hô trận pháp — 1 công · 2 thủ · 3 hồi · 4 phá.
  const soKy = (pha.k === 'lu' || pha.k === 'yeu') && n.phe !== null ? SO_KY[/^\s*([1-4])(?:\s+\1)*\s*$/.exec(tin.text ?? '')?.[1] ?? ''] : undefined;
  // Đánh yêu tinh: gõ 5 là đánh (như gõ chữ "đánh"); gõ đúng số lúc yêu tinh báo chiêu lớn thì đỡ.
  const soDanh = pha.k === 'yeu' && /^\s*5(?:\s+5)*\s*$/.test(tin.text ?? '');
  if (pha.k === 'yeu' && soKy !== undefined) doChieu(the, pha, n, /^\s*([1-4])/.exec(tin.text ?? '')![1]!, now, ra);
  // Độ kiếp: gõ 1 / 2 / 3 (như A / B / C, như "độ") là hộ pháp.
  const soHo = pha.k === 'kiep' && /^\s*[1-3](?:\s+[1-3])*\s*$/.test(tin.text ?? '');
  const lenh: Lenh = soHo
    ? { k: 'ho' }
    : soDanh
    ? { k: 'danh' }
    : soKy !== undefined
    ? { k: 'ky', ky: soKy }
    : diSo
    ? { k: 'di', huong: SO_DI[soDi[1]!]!, so: 1 + (soDi[2] === '' ? 0 : soDi[2]!.trim().split(/\s+/).length) }
    : (soTl ?? docLenh(tin.text ?? ''));

  // Khách (phàm nhân) chỉ nhập môn được bằng cách vượt Ải Nhập Môn: trong 30 giây mở ải, gõ chọn
  // nhân vật ("nam s", "nữ t"…) là bước vào. Ngoài giờ ải, khách vẫn trả lời câu hỏi, tích linh khí.
  if (n.phe === null) {
    if (pha.k === 'nm' && now < pha.moLuc) {
      const gioiNgau = (): Gioi => (rand() < 0.5 ? 'nam' : 'nu');
      // Gõ số chọn nhân vật: 1 Nam Sơn, 2 Nữ Sơn, 3 Nam Thủy, 4 Nữ Thủy (chỉ trong lúc bước vào ải).
      const so = CHON_SO_NM[/^\s*(?:s[oố]\s*)?([1-4])(?:\s+\1)*\s*$/iu.exec(tin.text ?? '')?.[1] ?? ''];
      if (so !== undefined) {
        vaoNm(pha, n, so.phe, so.gioi, now, ra);
      } else if (lenh.k === 'phe' || lenh.k === 'gioi') {
        // Chọn nhân vật (đủ hay thiếu): phần nào chưa chọn thì bốc — tông theo phe ít người, giới ngẫu nhiên.
        const phe = lenh.k === 'phe' ? lenh.phe : pheCanBang(the, now);
        vaoNm(pha, n, phe, lenh.gioi ?? gioiNgau(), now, ra);
      } else if (!pha.vt.has(n.user)) {
        // Lên tiếng trong 30 giây bước vào mà chưa chọn nhân vật: bốc ngẫu nhiên nhân vật cấp thấp nhất
        // (tông ít người hơn, giới ngẫu nhiên); vượt ải thì được trang phục ngẫu nhiên như mọi người.
        vaoNm(pha, n, pheCanBang(the, now), gioiNgau(), now, ra);
      }
    }
  } else if (lenh.k === 'phe') {
    if (n.phe !== lenh.phe && now - n.doiPheLuc >= DOI_PHE_CACH && pha.k !== 'lu') {
      nhapPhe(the, n, lenh.phe, now, ra, lenh.gioi, rand);
    } else if (n.phe === lenh.phe && lenh.gioi !== undefined && n.gioi !== lenh.gioi) {
      n.gioi = lenh.gioi;
      dongTui(n);
      the.ban = true;
    }
  } else if (lenh.k === 'can-co' && n.phe !== null && pha.k !== 'lu' && pha.k !== 'yeu' && n.canCo !== lenh.canCo) {
    // Đổi căn cơ ngoài trận (giữa trận đổi là lách luật).
    n.canCo = lenh.canCo;
    the.ban = true;
    ra.push({ k: 'the', user: n.user });
  } else if (lenh.k === 'gioi' && n.gioi !== lenh.gioi) {
    n.gioi = lenh.gioi;
    dongTui(n);
    the.ban = true;
  }

  if (lenh.k === 'toi') ra.push({ k: 'the', user: n.user });
  if (lenh.k === 'dot-pha') dotPhaTay(the, n, now, ra);
  if (lenh.k === 'hoc-vo') hocVo(the, n, now, ra);
  if (lenh.k === 'dan') luyenDan(the, n, now, ra);
  if (lenh.k === 'van-cong' || lenh.k === 'hai' || lenh.k === 'co-duyen') hoatDong(the, n, lenh.k, now, rand, ra);
  // Tàng Bảo Các: mua / đổi đồ ngoài lúc đang đánh (giữa trận đổi đồ là lách luật).
  // Đan Các · Tàng Kinh Các riêng một tông: đệ tử tông kia không mua ở đây.
  if (lenh.k === 'ma' && pha.k !== 'lu' && pha.k !== 'yeu' && !(pha.k === 'tt' && pha.phe !== null && n.phe !== pha.phe)) dungMa(the, n, lenh.loai, lenh.so, now, ra);

  switch (pha.k) {
    case 'tt':
      // Khảo hạch Tàng Kinh: đệ tử (đúng tông nếu chợ riêng một tông) gõ A / B / C, mỗi câu một lần.
      if (lenh.k === 'dap' && pha.kh?.hoi === true && n.phe !== null && (pha.phe === null || n.phe === pha.phe) && !pha.kh.tra.has(n.user)) {
        pha.kh.tra.set(n.user, lenh.chon);
        if (lenh.chon === pha.kh.cau.dung) pha.kh.dung.push(n.user);
      }
      break;
    case 'hoi':
      if (lenh.k === 'dap' && !pha.tra.has(n.user)) {
        pha.tra.set(n.user, lenh.chon);
        if (lenh.chon === pha.cau.dung) pha.dungThuTu.push(n.user);
      }
      break;
    case 'kiep':
      // Không còn câu hỏi: người độ kiếp chỉ ngồi chịu sét, đồng đạo gõ "độ" hộ pháp.
      if (n.user !== pha.user && (lenh.k === 'ho' || lenh.k === 'dap') && !pha.ho.has(n.user)) {
        pha.ho.add(n.user);
        ra.push({ k: 'ho', user: n.user });
      }
      break;
    case 'lu':
      // Tán tu (khách chưa nhập môn): gõ tên tông thì nhập môn ngay giữa trận; không thì đánh thuê ngẫu nhiên.
      if (n.phe === null) {
        if (lenh.k === 'phe') nhapPhe(the, n, lenh.phe, now, ra, lenh.gioi, rand);
        else tanTuDanh(pha, n, now, rand, ra);
      }
      dayLu(pha, n, now, ra);
      if (lenh.k === 'ky') hoKy(the, pha, n, lenh.ky, now, ra);
      break;
    case 'yeu':
      if (lenh.k === 'danh') danhYeu(the, pha, n, now, rand, ra);
      if (lenh.k === 'ky') hoKy(the, pha, n, lenh.ky, now, ra);
      break;
    case 'nm':
      if (lenh.k === 'di') diNm(pha, n, lenh.huong, lenh.so ?? 1, now);
      break;
    case 'me':
      // Ai lên tiếng trong lúc Địa Cung mở là được xuống, đứng ở cửa vào của phe mình.
      vaoMe(the, pha, n, now);
      if (lenh.k === 'di') buocMe(the, pha, n, lenh.huong, now, rand, ra);
      break;
    default:
      break;
  }
  return ra;
}

type PhaLu = Extract<Pha, { k: 'lu' }>;
const pheKia = (p: Phe): Phe => (p === 'son' ? 'thuy' : 'son');

/** Ghi người vào trận (lần đầu ra tay): cộng lực chiến của họ vào trung bình phe. */
/** Đan trận đang có hiệu lực: công +20% (Bạo Khí Đan), thủ +20% (Kim Cương Đan — trong Đại Chiến tính ×1,1). */
function heSoDan(n: NguoiChoi, now: number): number {
  return (n.congDen > now ? 1.2 : 1) * (n.thuDen > now ? 1.1 : 1);
}

/** Vào trận (lần ra tay đầu): đan trận trong túi tự uống, hiệu lực tới hết trận. */
function uongDanTran(n: NguoiChoi, den: number) {
  if (n.dan.cong > 0 && n.congDen < den) {
    n.dan.cong--;
    n.congDen = den;
  }
  if (n.dan.thu > 0 && n.thuDen < den) {
    n.dan.thu--;
    n.thuDen = den;
  }
}

function vaoTran(pha: PhaLu, n: NguoiChoi & { phe: Phe }) {
  if (pha.nguoi.has(n.user)) return;
  uongDanTran(n, pha.den);
  pha.nguoi.set(n.user, n.phe);
  pha.luc[n.phe].tong += lucChien(n);
  pha.luc[n.phe].so++;
  // Phe chưa có Chủ Tướng: người ra tay đầu tiên nhận ấn.
  if (pha.chu[n.phe] === null) pha.chu[n.phe] = n.user;
}

/** Hệ số nội bộ phe: lực chiến mình so với trung bình phe mình. */
export function heSoNoiBo(pha: PhaLu, n: NguoiChoi): number {
  if (n.phe === null) return 1;
  const t = pha.luc[n.phe];
  const tb = t.so > 0 ? t.tong / t.so : lucChien(n);
  return Math.max(HE_SO_MIN, Math.min(HE_SO_MAX, tb > 0 ? lucChien(n) / tb : 1));
}

/** Hệ số bứt phá của phe đang thua xa. */
export function butPha(pha: PhaLu, phe: Phe): number {
  const ta = pha[phe];
  const dich = pha[pheKia(phe)];
  if (dich <= 0 || ta >= dich * 0.85) return 1;
  return 1 + Math.min(BUT_PHA_TOI_DA, (1 - ta / dich) * 0.6);
}

/** Thế trận cho bảng Đại Chiến: số người ra tay, tim, xu, hệ số bứt phá mỗi phe. */
export function theTran(pha: PhaLu): Record<Phe, { so: number; tim: number; xu: number; butPha: number }> {
  const mot = (p: Phe) => ({ so: pha.luc[p].so, tim: pha.tim[p], xu: pha.xu[p], butPha: butPha(pha, p) });
  return { son: mot('son'), thuy: mot('thuy') };
}

type PhaTran = Extract<Pha, { k: 'lu' } | { k: 'yeu' }>;

/** Số người ra tay của một phe trong trận (để tính số phiếu cần). */
export function soRaTay(the: The, pha: PhaTran, phe: Phe): number {
  if (pha.k === 'lu') return pha.luc[phe].so;
  let so = 0;
  for (const u of pha.dmg.keys()) if (the.nguoi.get(u)?.phe === phe) so++;
  return so;
}

/** Số phiếu cần để kết trận: 20% người ra tay của phe, 1–6. */
export const phieuCan = (soNguoi: number) => Math.max(1, Math.min(6, Math.ceil(soNguoi * 0.2)));

/** Phiếu đang có (trong 8 giây qua) cho một trận pháp. */
export function phieuCo(pha: PhaTran, phe: Phe, ky: Ky, now: number): number {
  const m = pha.tran.phieu.get(`${phe}:${ky}`);
  if (m === undefined) return 0;
  let w = 0;
  for (const v of m.values()) if (now - v.luc <= KY_PHIEU) w += v.w;
  return w;
}

/** Còn bao lâu mới kết lại được (0 là sẵn sàng). */
export const hoiChieu = (pha: PhaTran, phe: Phe, ky: Ky, now: number) =>
  Math.max(0, (pha.tran.kyLuc.get(`${phe}:${ky}`) ?? -Infinity) + KY_HOI_CHIEU - now);

/** Hô trận pháp (gõ chữ hoặc số 1 công · 2 thủ · 3 hồi · 4 phá): đủ phiếu thì cả phe kết trận. Căn cơ trùng trận
 *  pháp đó tính hai phiếu. */
function hoKy(the: The, pha: PhaTran, n: NguoiChoi, ky: Ky, now: number, ra: Su[]) {
  if (n.phe === null) return;
  ghiTungChieu(the, n, ky, now);
  const khoa = `${n.phe}:${ky}`;
  let m = pha.tran.phieu.get(khoa);
  if (m === undefined) pha.tran.phieu.set(khoa, (m = new Map()));
  m.set(n.user, { luc: now, w: n.canCo !== null && CAN_CO[n.canCo].ky === ky ? 2 : 1 });
  if (phieuCo(pha, n.phe, ky, now) >= phieuCan(soRaTay(the, pha, n.phe))) ketTran(the, pha, n.phe, ky, now, ra, 'ho', null);
}

/** Kết trận pháp: kiểm hồi chiêu, trả Linh Mạch (hoặc lượt miễn phí, hoặc quà), áp tác dụng. */
function ketTran(the: The, pha: PhaTran, phe: Phe, ky: Ky, now: number, ra: Su[], nguon: 'ho' | 'qua', ai: string | null) {
  const khoa = `${phe}:${ky}`;
  if (hoiChieu(pha, phe, ky, now) > 0) return;
  const tr = pha.tran;
  if (nguon === 'ho') {
    if (tr.mien[phe] > 0) tr.mien[phe]--;
    else if (the.linhMach[phe] >= KY_GIA) {
      the.linhMach[phe] -= KY_GIA;
      the.ban = true;
    } else return;
  }
  // Ai đã hô (để tính Y Sư hồi mạnh thêm, Phá Quân phá lâu hơn).
  const ho = [...(tr.phieu.get(khoa)?.keys() ?? [])].map((u) => the.nguoi.get(u)?.canCo);
  if (ai !== null) ho.push(the.nguoi.get(ai)?.canCo);
  tr.phieu.delete(khoa);
  tr.kyLuc.set(khoa, now);
  tr.cuoi = { phe, ky, luc: now };
  const dich = pheKia(phe);
  const hl = tr.hl;
  if (pha.k === 'lu') {
    if (ky === 'cong') hl[phe].cong = now + KY_LAU;
    if (ky === 'thu') hl[phe].thu = now + KY_LAU;
    if (ky === 'pha') {
      hl[dich].thu = 0;
      hl[dich].vo = now + KY_PHA_LAU + (ho.includes('quan') ? 2_000 : 0);
    }
    if (ky === 'hoi') {
      const ySu = Math.min(3, ho.filter((x) => x === 'y').length);
      pha[dich] = Math.max(0, pha[dich] - pha.H * (KY_HOI_PK + 0.03 * ySu));
    }
    pha.rungLuc = now;
    hoLu(pha, now, ra, `${PHE[phe].tenNgan} kết trận ${TRAN_PHAP[phe][ky]}!`);
  } else {
    if (ky === 'cong') hl[phe].cong = now + KY_LAU;
    if (ky === 'thu') hl[phe].thu = now + KY_LAU;
    if (ky === 'pha') pha.yeuVo = now + KY_PHA_LAU + (ho.includes('quan') ? 2_000 : 0);
    if (ky === 'hoi') {
      hl[phe].ho = now + 5_000;
      for (const u of [...pha.choang.keys()]) if (the.nguoi.get(u)?.phe === phe) pha.choang.delete(u);
    }
  }
  ra.push({ k: 'ky-nang', phe, ky, nguon, ai });
  ghiSuThi(the, now, ra, 'ketTran', { phe: PHE[phe].tenNgan, tran: TRAN_PHAP[phe][ky] }, phe);
}

/** MC hô theo diễn biến (giọng đọc của phòng), cách nhau ít nhất HO_CACH. */
function hoLu(pha: PhaLu, now: number, ra: Su[], chu: string, gap = false) {
  if (!gap && now - pha.hoLuc < HO_CACH) return;
  pha.hoLuc = now;
  ra.push({ k: 'doc', chu });
}

/** Diễn biến Đại Chiến theo đồng hồ: báo quyết chiến, mở và khép đấu tướng. */
function dienBienLu(the: The, pha: PhaLu, now: number, ra: Su[]) {
  // Phá trận: một phe cạn trận khí thì thua ngay.
  if (now < pha.den && (pha.son >= pha.H || pha.thuy >= pha.H)) {
    const thang: Phe = pha.son >= pha.H ? 'son' : 'thuy';
    pha.den = now;
    pha.rungLuc = now;
    ra.push({ k: 'pha-tran', thang });
    hoLu(pha, now, ra, `Phá trận! ${PHE[thang].ten} đánh sập trận khí đối phương!`, true);
    return;
  }
  // Thay tướng: Chủ Tướng đứng im quá lâu thì người công trạng cao nhất đang ra tay lên thay.
  if (now - (pha.den - pha.tong) > CHU_IM) {
    for (const phe of ['son', 'thuy'] as const) {
      const c0 = pha.chu[phe];
      if (c0 === null || now - (the.nguoi.get(c0)?.dayLuc ?? 0) <= CHU_IM) continue;
      let moi: NguoiChoi | null = null;
      let max = 0;
      for (const [u, d] of pha.cong) {
        const n = the.nguoi.get(u);
        if (n === undefined || u === c0 || pha.nguoi.get(u) !== phe || now - n.dayLuc > 5_000 || d <= max) continue;
        max = d;
        moi = n;
      }
      if (moi === null) continue;
      pha.chu[phe] = moi.user;
      ghiSuThi(the, now, ra, 'thayTuong', { ten: moi.ten, phe: PHE[phe].tenNgan }, phe);
    }
  }
  // Thần binh trợ chiến cho phe ít người ra tay hơn.
  const dtB = Math.min(1_000, now - pha.binhLuc);
  pha.binhLuc = now;
  if (dtB > 0 && now < pha.den) {
    for (const phe of ['son', 'thuy'] as const) {
      const thieu = pha.luc[pheKia(phe)].so - pha.luc[phe].so;
      if (thieu <= 0) continue;
      // Phe không có ai: thần binh có một tướng binh ra trận thay Chủ Tướng.
      const quan = thieu + (pha.luc[phe].so === 0 ? CHU_HE_SO - 1 : 0);
      const d = ((BINH_TI_LE * quan) / DAY_CACH) * dtB * (quyetChien(pha, now) ? QUYET_CHIEN_HE_SO : 1);
      pha[phe] += d;
      pha.binh[phe] += d;
    }
  }
  if (!pha.qcBao && quyetChien(pha, now)) {
    pha.qcBao = true;
    pha.rungLuc = now;
    ra.push({ k: 'quyet-chien' });
    hoLu(pha, now, ra, 'Mười giây quyết chiến! Mọi đòn nhân rưỡi, dốc hết sức!', true);
  }
  if (pha.dau !== null && now >= pha.dau.den) {
    const d = pha.dau;
    const thang: Phe | null = d.diem.son > d.diem.thuy ? 'son' : d.diem.thuy > d.diem.son ? 'thuy' : null;
    const user = thang === null ? null : d[thang];
    if (thang !== null && user !== null) {
      pha[thang] += DAU_THUONG;
      pha.cong.set(user, (pha.cong.get(user) ?? 0) + DAU_THUONG);
    }
    pha.dau = null;
    pha.dauKet = { thang, son: d.son, thuy: d.thuy, luc: now };
    pha.rungLuc = now;
    ra.push({ k: 'dau-tuong-ket', thang, nguoiThang: user });
    const ten = user === null ? '' : (the.nguoi.get(user)?.ten ?? user);
    hoLu(pha, now, ra, thang === null ? 'Đấu tướng bất phân thắng bại!' : `${ten} thắng đấu tướng! ${PHE[thang].tenNgan} thêm ${DAU_THUONG} điểm!`, true);
  }
  if (pha.dau === null && now >= pha.dauKe && pha.den - now > DAU_DAI + 2_000) {
    pha.dauKe = now + DAU_CACH;
    const tuong = (phe: Phe) => {
      if (pha.chu[phe] !== null) return pha.chu[phe];
      let ai: string | null = null;
      let max = 0;
      for (const [u, d] of pha.cong) if (pha.nguoi.get(u) === phe && d > max) (max = d), (ai = u);
      return ai;
    };
    const son = tuong('son');
    const thuy = tuong('thuy');
    if (son === null || thuy === null) return;
    pha.dau = { son, thuy, den: now + DAU_DAI, diem: { son: 0, thuy: 0 } };
    ra.push({ k: 'dau-tuong', son, thuy });
    const a = the.nguoi.get(son)?.ten ?? son;
    const b = the.nguoi.get(thuy)?.ten ?? thuy;
    hoLu(pha, now, ra, `Đấu tướng! ${a} đối đầu ${b}! Hai vị tướng gõ, thả tim thật nhanh!`, true);
  }
}

/** Đang trong 10 giây quyết chiến. */
/** Quyết chiến: một tông còn dưới QUYET_CHIEN_KHI % trận khí (hoặc sắp chạm trần an toàn) — điểm ×1,5. */
export const quyetChien = (pha: PhaLu, now: number) =>
  pha.den - now <= QUYET_CHIEN || Math.min(pha.H - pha.son, pha.H - pha.thuy) <= (pha.H * QUYET_CHIEN_KHI) / 100;
const QUYET_CHIEN_KHI = 15;

/** KIỆT SỨC: trận kéo quá LU_HAO_TU thì trận khí CẢ HAI tông hao đều LU_HAO phần H mỗi giây — trận luôn kết (phòng vắng
 *  không treo lịch), tông đã đánh mạnh hơn vẫn thắng. Không có đồng hồ trên màn. */
const LU_HAO_TU = 4 * 60_000;
const LU_HAO = 0.005;
function haoKhi(pha: PhaLu, now: number, ra: Su[]) {
  const truoc = pha.haoLuc ?? now;
  pha.haoLuc = now;
  if (now - (pha.den - pha.tong) < LU_HAO_TU) return;
  if (!pha.haoBao) {
    pha.haoBao = true;
    hoLu(pha, now, ra, 'Hai tông kiệt sức, trận khí hao dần! Dốc sức kết liễu!', true);
  }
  const d = (pha.H * LU_HAO * Math.max(0, now - truoc)) / 1000;
  pha.son += d;
  pha.thuy += d;
}

/** THANG QUÀ 5 BẬC (docs/phong/tu-tien/co-che-qua.md §3): cùng một quà, mỗi màn một tác dụng.
 *  1 Hương Khói 1–9 xu · 2 Linh Đan 10–99 · 3 Pháp Bảo 100–499 · 4 Thần Thông 500–2.999 · 5 Thiên Đạo 3.000+. */
export type BacQua = 1 | 2 | 3 | 4 | 5;
export const MOC_BAC: readonly number[] = [0, 10, 100, 500, 3_000];
export const TEN_BAC: Record<BacQua, string> = { 1: 'Hương Khói', 2: 'Linh Đan', 3: 'Pháp Bảo', 4: 'Thần Thông', 5: 'Thiên Đạo' };
export const bacQua = (xu: number): BacQua => (xu >= 3_000 ? 5 : xu >= 500 ? 4 : xu >= 100 ? 3 : xu >= 10 ? 2 : 1);
export interface QuaMoi {
  user: string;
  ten: string;
  qua: string;
  xu: number;
  bac: BacQua;
  combo: number;
  luc: number;
  /** Tác dụng vừa ra (một dòng ngắn, có thể rỗng). */
  chu: string;
}
/** Combo: tặng cùng một quà trong COMBO_CACH thì cộng dồn số món. */
const COMBO_CACH = 8_000;
/** Mưa Linh Thạch: tối đa bấy nhiêu người, mỗi người 1–3 linh thạch. */
const MUA_THACH_NGUOI = 30;
/** Đánh boss: quà bậc 3 là một đòn ×5 công, bậc 4 ×8; bậc 5 boss mất 15% máu tối đa. */
const QUA_YEU_DON: Record<number, number> = { 3: 5, 4: 8 };
const QUA_YEU_THIEN = 0.15;

/** Lúc cần quà gấp. Cứu viện: máu trung bình của tông trong trận boss dưới GAP_CUU → GAP_CUU_LAU, quà của tông
 *  hồi máu cả tông (bậc × GAP_CUU_HOI máu tối đa). Tử chiến: trận khí tông dưới GAP_TU % → GAP_TU_LAU, quà ×2 điểm.
 *  Mỗi loại mở một lần mỗi phe mỗi trận. */
export type LoaiGap = 'cuu-vien' | 'tu-chien';
const GAP_CUU = 0.25;
const GAP_CUU_LAU = 20_000;
const GAP_CUU_HOI = 0.08;
const GAP_TU = 20;
const GAP_TU_LAU = 30_000;

/** Ghi một lần tặng quà lên biển quà (giữ 8 lần gần nhất). */
function ghiQuaMoi(the: The, q: QuaMoi) {
  the.quaMoi.push(q);
  if (the.quaMoi.length > 8) the.quaMoi.splice(0, the.quaMoi.length - 8);
}

/** Mở "cần quà gấp" khi tới ngưỡng (gọi mỗi bước). */
function buocQuaGap(the: The, now: number, ra: Su[]) {
  const pha = the.pha;
  if (the.quaGap !== null && (now >= the.quaGap.den || (pha.k !== 'yeu' && pha.k !== 'lu'))) the.quaGap = null;
  if (the.quaGap !== null) return;
  if (pha.k === 'yeu') {
    const khoaTran = `yeu:${pha.den - pha.tong}`;
    for (const phe of ['son', 'thuy'] as const) {
      const khoa = `${khoaTran}:${phe}`;
      if (the.quaGapDa.has(khoa)) continue;
      let tong = 0;
      let so = 0;
      for (const [u, hp] of pha.hp) {
        if (the.nguoi.get(u)?.phe !== phe || pha.roi.has(u)) continue;
        tong += hp;
        so++;
      }
      if (so === 0 || tong / so / MAU_YEU_NGUOI >= GAP_CUU) continue;
      the.quaGapDa.add(khoa);
      the.quaGap = { loai: 'cuu-vien', phe, den: now + GAP_CUU_LAU };
      ra.push({ k: 'qua-gap', loai: 'cuu-vien', phe, den: the.quaGap.den });
      ra.push({ k: 'doc', chu: `${PHE[phe].tenNgan} nguy rồi! Tặng quà cứu viện, hồi máu cả tông!` });
      return;
    }
  }
  if (pha.k === 'lu') {
    const khoaTran = `lu:${pha.den - pha.tong}`;
    for (const phe of ['son', 'thuy'] as const) {
      const khoa = `${khoaTran}:${phe}`;
      if (the.quaGapDa.has(khoa) || khiCon(pha, phe) >= GAP_TU) continue;
      the.quaGapDa.add(khoa);
      the.quaGap = { loai: 'tu-chien', phe, den: now + GAP_TU_LAU };
      ra.push({ k: 'qua-gap', loai: 'tu-chien', phe, den: the.quaGap.den });
      ra.push({ k: 'doc', chu: `${PHE[phe].tenNgan} tử chiến! Ba mươi giây quà nhân đôi điểm!` });
      return;
    }
  }
}

/** Tác dụng theo bậc quà ở từng màn (ngoài tác dụng gốc: linh thạch, trận lực, truyền công, chiêu PK). Trả một dòng
 *  mô tả cho biển quà. */
function tacDungBac(the: The, n: NguoiChoi, xu: number, bac: BacQua, now: number, rand: () => number, ra: Su[]): string {
  const pha = the.pha;
  if (n.phe === null) return '';
  const gap = the.quaGap !== null && now < the.quaGap.den && the.quaGap.phe === n.phe ? the.quaGap : null;
  if ((pha.k === 'cho' || pha.k === 'hoi' || pha.k === 'dap') && bac >= 4) {
    // Mưa Linh Thạch: cả phòng đang online được linh thạch, ghi tên người tặng.
    const ds = dangChoi(the, now).filter((x) => x !== n).slice(0, MUA_THACH_NGUOI);
    let tong = 0;
    for (const x of ds) {
      const th = 1 + Math.floor(rand() * 3) + (bac === 5 ? 2 : 0);
      x.tinChi += th;
      tong += th;
    }
    the.ban = true;
    ra.push({ k: 'mua-thach', user: n.user, nguoi: ds.length, tong });
    return `Mưa Linh Thạch · ${ds.length} người +${tong} 💎`;
  }
  if (pha.k === 'yeu' && (pha.phe === null || pha.phe === n.phe)) {
    let chu = '';
    if (gap?.loai === 'cuu-vien') {
      // Cứu viện: hồi máu cả tông, ngã thì gượng dậy.
      const hoi = Math.round(MAU_YEU_NGUOI * GAP_CUU_HOI * bac);
      let so = 0;
      for (const [u, hp] of pha.hp) {
        if (the.nguoi.get(u)?.phe !== n.phe || pha.roi.has(u)) continue;
        pha.hp.set(u, Math.min(MAU_YEU_NGUOI, hp + hoi));
        const day = pha.nga.delete(u);
        ra.push({ k: 'hoi-mau', user: u, mau: hoi, day, tu: n.user });
        so++;
      }
      chu = `Cứu viện · ${so} đồng môn +${hoi} máu`;
    }
    if (bac === 1) {
      // Hương Khói: hồi máu mình và người yếu nhất tông.
      hoiMau(pha, n.user, null, ra);
      let yeu: string | null = null;
      let it = Infinity;
      for (const [u, hp] of pha.hp) {
        if (u === n.user || the.nguoi.get(u)?.phe !== n.phe || pha.roi.has(u)) continue;
        if (hp < it) {
          it = hp;
          yeu = u;
        }
      }
      if (yeu !== null) hoiMau(pha, yeu, n.user, ra);
      return chu || 'Hồi máu đồng môn';
    }
    if (bac === 3 || bac === 4) {
      n.danhLuc = 0;
      danhYeu(the, pha, n, now, rand, ra, QUA_YEU_DON[bac]);
      return chu || `Đòn chí mạng ×${QUA_YEU_DON[bac]}`;
    }
    if (bac === 5 && pha.mau > 0) {
      const dmg = Math.round(pha.mauMax * QUA_YEU_THIEN);
      pha.mau = Math.max(0, pha.mau - dmg);
      pha.dmg.set(n.user, (pha.dmg.get(n.user) ?? 0) + dmg);
      pha.dmgPhe[n.phe] += dmg;
      ra.push({ k: 'trung', user: n.user, dmg, bao: true, truot: false });
      if (pha.mau <= 0) {
        if (pha.cuong) ketYeu(the, pha, now, rand, ra, n.user);
        else vaoCuongBao(the, pha, now, ra);
      }
      return chu || `Thiên Đạo giáng · yêu tinh −15% máu`;
    }
    return chu;
  }
  if (pha.k === 'lu') {
    let chu = '';
    if (bac === 5) {
      // Thiên Đạo: chiêu diện rộng (Thần Thú Đạp Trận / Hô Phong Hoán Vũ) của tông mình ra ngay.
      pha.drKe[n.phe] = now;
      chu = 'Thần thú xuất trận!';
    }
    if (gap?.loai === 'tu-chien') chu = chu ? `${chu} · Tử chiến ×2` : 'Tử chiến · điểm ×2';
    return chu;
  }
  return '';
}

function ghiDiem(pha: PhaLu, n: NguoiChoi & { phe: Phe }, diem: number, now: number, ra: Su[]) {
  const cb = pha.combo[n.phe];
  cb.so = now - cb.luc <= LIEN_KICH_CACH ? cb.so + 1 : 1;
  cb.luc = now;
  if (cb.so % LIEN_KICH_MOC === 0) {
    ra.push({ k: 'lien-kich', phe: n.phe, so: cb.so });
    pha.rungLuc = now;
    if (cb.so % (2 * LIEN_KICH_MOC) === 0) hoLu(pha, now, ra, `${PHE[n.phe].tenNgan} liên kích ${cb.so}! Cả phe đánh như vũ bão!`);
  }
  const dich = pheKia(n.phe);
  const hl = pha.tran.hl;
  const d =
    diem *
    butPha(pha, n.phe) *
    (1 + Math.min(0.25, cb.so / 200)) *
    (quyetChien(pha, now) ? QUYET_CHIEN_HE_SO : 1) *
    (hl[n.phe].cong > now ? 1.3 : 1) *
    (hl[dich].thu > now && hl[dich].vo <= now ? 0.7 : 1) *
    (hl[dich].vo > now ? 1.15 : 1) *
    heSoDienBien(pha, n.phe, now);
  pha[n.phe] += d;
  tpTrung(pha, dich, d);
  pha.cong.set(n.user, (pha.cong.get(n.user) ?? 0) + d);
  // Đấu tướng: điểm của hai vị tướng trong lúc giao chiến.
  if (pha.dau !== null && now < pha.dau.den && pha.dau[n.phe] === n.user) pha.dau.diem[n.phe] += d;
  // Đảo chiều: phe đang thua vượt lên (khi trận đã có điểm kha khá).
  const dan: Phe | null = pha.son > pha.thuy ? 'son' : pha.thuy > pha.son ? 'thuy' : null;
  if (dan !== null && pha.dan !== null && dan !== pha.dan && pha.son + pha.thuy > 20) {
    pha.dao = { phe: dan, luc: now };
    pha.rungLuc = now;
    ra.push({ k: 'dao-chieu', phe: dan });
    hoLu(pha, now, ra, `Đảo chiều! ${PHE[dan].ten} vượt lên!`);
  }
  if (dan !== null) pha.dan = dan;
}

const coPhe = (n: NguoiChoi): n is NguoiChoi & { phe: Phe } => n.phe !== null;

/** Tán tu (khách chưa có tông) bình luận lúc Đại Chiến: ra một đòn giúp một phe NGẪU NHIÊN (đòn bằng `TAN_TU_HE_SO`
 *  đòn thường, không tính công trạng, không vào trận) — chiến trường hỗn loạn, ai vào cũng có việc. */
export const TAN_TU_HE_SO = 0.6;
function tanTuDanh(pha: PhaLu, n: NguoiChoi, now: number, rand: () => number, ra: Su[]) {
  if (now - n.dayLuc < DAY_CACH) return;
  n.dayLuc = now;
  const phe: Phe = rand() < 0.5 ? 'son' : 'thuy';
  pha[phe] += TAN_TU_HE_SO;
  ra.push({ k: 'tan-tu', ten: n.ten, phe });
}

function dayLu(pha: PhaLu, n: NguoiChoi, now: number, ra: Su[]) {
  if (!coPhe(n) || now - n.dayLuc < DAY_CACH) return;
  n.dayLuc = now;
  vaoTran(pha, n);
  const hs = heSoNoiBo(pha, n);
  const chu = pha.chu[n.phe] === n.user ? CHU_HE_SO : 1;
  // Bình luận là tiếp sức: đòn thường, không có chiêu hiếm (chiêu hiếm đến từ quà).
  ghiDiem(pha, n, hs * (n.canCo === null ? 1 : CO_DON[n.canCo]) * chu * heSoVo(n) * heSoDan(n, now), now, ra);
  // Võ công của Y Sư: mỗi đòn tiếp sức hồi một chút trận khí cho phe mình.
  const vo = voCua(n);
  if (vo.he === 'y' && vo.tang > 0) {
    const dich = pheKia(n.phe);
    pha[dich] = Math.max(0, pha[dich] - HE_CP.y.hoi * vo.tang);
  }
  ra.push({ k: 'day', user: n.user, phe: n.phe, luc: hs });
}

/** Hệ số của trận pháp đang chạy lên đòn của một phe. */
/** Đại Chiến — diễn biến trận (ban-do.md §3h). */
/** Chiêu diện rộng: mỗi phe một lần mỗi DR_CACH (hai phe lệch nhịp nhau), lần đầu sau DR_DAU. Trúng thì bên kia
 *  mất DR_QUAN quân số (có khiên Thủ thì chỉ mất ×DR_CHAN), phe tung chiêu được DR_DIEM lần đòn thường. */
const DR_CACH = 14_000;
const DR_DAU = 8_000;
export const DR_QUAN = 0.22;
export const DR_CHAN = 0.4;
/** Chiêu diện rộng mất chừng này phần trận khí bên kia (trước hệ số). */
export const DR_KHI = 0.03;
/** Trận: gõ số hô trận pháp. */
export const SO_KY: Record<string, Ky> = { '1': 'cong', '2': 'thu', '3': 'hoi', '4': 'pha' };
/** Mê cung: gõ số để đi. */
export const SO_DI: Record<string, Huong> = { '1': 'len', '2': 'xuong', '3': 'trai', '4': 'phai' };
/** Ải Nhập Môn: khách gõ số để chọn nhân vật (thứ tự hiện trên màn). */
export const CHON_SO_NM: Record<string, { phe: Phe; gioi: Gioi }> = {
  '1': { phe: 'son', gioi: 'nam' },
  '2': { phe: 'son', gioi: 'nu' },
  '3': { phe: 'thuy', gioi: 'nam' },
  '4': { phe: 'thuy', gioi: 'nu' },
};
/** Trận pháp cả phe hô (hoặc do quà) tác động lên chiêu diện rộng: Công đang bật thì chiêu phe mình ×DR_TRAN_CONG;
 *  Hồi vừa kết (trong KY_LAU) thì hồi lại DR_TRAN_HOI phần sát thương vừa mất. Thủ (khiên) và Phá (vỡ khiên địch)
 *  dùng đúng luật khiên đã có. Nhắc trước DR_BAO_TRUOC để cả phe kịp hô "thủ". */
export const DR_TRAN_CONG = 1.3;
export const DR_TRAN_HOI = 0.5;
const DR_BAO_TRUOC = 5_000;
/** Bốn căn cơ khi giao tranh chiêu diện rộng: mỗi người … tối đa … */
export const DR_TUONG = 0.08;
export const DR_TUONG_TOI_DA = 0.4;
export const DR_QUAN_XUYEN = 0.1;
export const DR_QUAN_TOI_DA = 0.4;
export const DR_VE = 0.08;
export const DR_VE_TOI_DA = 0.4;
export const DR_Y = 0.008;
export const DR_Y_TOI_DA = 0.032;
/** Kim Quy hộ cung dựng khiên riêng cho Thủy Tông: xác suất, và phần sát thương còn lọt qua. */
export const KIM_QUY_KHIEN = 0.3;
export const KIM_QUY_CON = 0.3;
const DR_DIEM = 4;
/** Quân số bổ sung: QS_TRE sau lần bị đánh cuối thì hồi QS_HOI mỗi giây. Quân mỏng thì đòn yếu (×0,75 khi hết quân). */
const QS_TRE = 5_000;
const QS_HOI = 0.1;
/** Tướng tiên phong: mỗi 1% trận khí phe mình mất thì tướng mất TP_HE máu (100 máu). Dưới TP_THUONG là bị thương
 *  (đòn phe ×0,9); hết máu thì bị hạ — TP_HI_SINH xác suất tung đòn hi sinh (bên kia mất HI_SINH_DIEM trận khí).
 *  Tướng rời trận thì chủ soái nổi giận GIAN_LAU (đòn ×GIAN_HE), TP_THAY sau tướng mới lên thay. */
const TP_HE = 2.2;
/** Tiên phong ngã khi thanh trận khí phe còn chừng này %; người lên thay thì ngưỡng thấp hơn. Hai bên không ngã
 *  cùng lúc: bên kia vừa mất tướng (đang chờ thay / chủ soái đang giận) thì bên này trụ thêm. */
export const TP_NGUONG = 35;
export const TP_NGUONG_SAU = 12;
/** XA LUÂN CHIẾN: tiên phong lần lượt từ cảnh giới cao xuống thấp; mỗi người giữ một đoạn đều nhau của thanh trận khí
 *  từ chỗ mình lên tới THAN_GIU (đoạn cuối là chủ soái tự giữ). Ai đã ngã / rút thì không lên lại; hết người thì chủ
 *  soái tự chiến tới khi cạn trận khí (thua). */
export const THAN_GIU = 30;
const TP_THUONG = 50;
export const TP_HI_SINH = 0.04;
export const HI_SINH_DIEM = 0.12;
const GIAN_LAU = 8_000;
const GIAN_HE = 1.5;
const TP_THAY = 3_000;
/** Kết trận: linh thạch mỗi người ĐÃ TƯƠNG TÁC trong trận; chiến thương (hệ số lực chiến còn lại) TON_LAU;
 *  xác suất nhận vật phẩm hiếm — chỉ người đã tương tác; công trạng đầu phe và người hi sinh ×3. */
export const THUONG_PK = { thang: 80, thua: 40, hoa: 60 };
export const TON_PK = { thang: 0.9, thua: 0.8, hoa: 0.85 };
export const TON_LAU = 10 * PHUT;
export const HIEM_PK = { thang: 0.12, thua: 0.06, hoa: 0.09 };

/** Chủ soái không chỉ công: PHÒNG NGỰ khi bên kia sắp tung chiêu diện rộng (dựng khiên THAN_THU_LAU, hồi chiêu
 *  THAN_THU_CACH) và HỒI PHỤC khi trận khí phe dưới THAN_HOI_NGUONG % (hồi THAN_HOI trận khí, hồi chiêu
 *  THAN_HOI_CACH). Lượt đó chủ soái không ra đòn công. */
const THAN_THU_LAU = 5_000;
const THAN_THU_CACH = 26_000;
export const THAN_HOI = 0.05;
const THAN_HOI_NGUONG = 60;
const THAN_HOI_CACH = 22_000;
export const CHIEU_THAN_THU: Record<Phe, string> = { son: 'Vạn Sơn Thành Lũy', thuy: 'Huyền Thủy Thần Thuẫn' };
export const CHIEU_THAN_HOI: Record<Phe, string> = { son: 'Đại Địa Hồi Xuân', thuy: 'Cam Lộ Hồi Sinh' };

/** Tên chiêu diện rộng của mỗi phe. */
/** Chủ soái (vị thần) của mỗi phe. */
export const THAN: Record<Phe, string> = { son: 'Sơn Tinh', thuy: 'Thủy Tinh' };
/** Mỗi phe hai chiêu diện rộng, ra luân phiên: chiêu của chủ soái và chiêu gọi thần thú hộ tông. */
export const CHIEU_DIEN_RONG: Record<Phe, readonly string[]> = {
  son: ['Sơn Băng Địa Liệt', 'Thần Thú Đạp Trận'],
  thuy: ['Băng Phong Vạn Lý', 'Hô Phong Hoán Vũ'],
};

/** Phe `phe` vừa mất `d` trận khí: tướng tiên phong của phe đó mất máu theo. */
function tpTrung(_pha: PhaLu, _phe: Phe, _d: number) {
  // Máu tiên phong nay tính thẳng từ thanh trận khí của phe (xem `mauTienPhong`), không trừ dồn từng đòn.
}

/** Trận khí còn lại của một phe, tính theo % (thanh máu PK trên đầu khung). */
const khiCon = (pha: PhaLu, phe: Phe) => (100 * Math.max(0, pha.H - pha[pheKia(phe)])) / pha.H;

/** Máu tướng tiên phong bám theo THANH TRẬN KHÍ của phe: đầy lúc nhận chức (trận khí = `tu`), hết khi trận khí
 *  tụt tới ngưỡng `nguong` — tướng đầu ngã ở TP_NGUONG (35%), người lên thay trụ tới TP_NGUONG_SAU (12%). */
/** Người còn được làm tiên phong của phe (chưa ngã / rút), cảnh giới cao trước. */
function conTienPhong(the: The, pha: PhaLu, phe: Phe, now: number): NguoiChoi[] {
  return dangChoi(the, now)
    .filter((n) => n.phe === phe && !pha.tpRoi.has(n.user))
    .sort((a, b) => b.canh - a.canh || lucChien(b) - lucChien(a));
}

/** Đoạn trận khí tiên phong mới giữ: từ trận khí hiện tại xuống, chia đều cho `so` người còn lại (gồm người này)
 *  phần trên THAN_GIU. */
function doanTienPhong(pha: PhaLu, phe: Phe, so: number): { mau: number; thuong: boolean; nguong: number; tu: number } {
  const tu = khiCon(pha, phe);
  const nguong = so <= 0 ? 0 : Math.max(THAN_GIU, tu - Math.max(4, (tu - THAN_GIU) / so));
  return { mau: 100, thuong: false, nguong, tu: Math.max(nguong + 1, tu) };
}

function mauTienPhong(pha: PhaLu, phe: Phe): number {
  const tp = pha.tp[phe];
  return Math.max(0, Math.min(100, (100 * (khiCon(pha, phe) - tp.nguong)) / Math.max(1, tp.tu - tp.nguong)));
}

/** Nhịp diễn biến (theo nhịp đòn thường): chiêu diện rộng, quân số bổ sung, tướng tiên phong bị thương / bị hạ /
 *  hi sinh, tướng mới lên thay. */
function dienBienTran(the: The, pha: PhaLu, now: number, rand: () => number, ra: Su[]) {
  for (const phe of ['son', 'thuy'] as const) {
    const dich = pheKia(phe);
    // Quân số bổ sung dần.
    if (pha.qs[phe] < 1 && now - pha.qsLuc[phe] >= QS_TRE) pha.qs[phe] = Math.min(1, pha.qs[phe] + QS_HOI * (DON_CACH / 1000));
    // Nhắc bên kia: chiêu diện rộng của phe này sắp tới — gõ "thủ" để đỡ.
    if (pha.drKe[phe] - now <= DR_BAO_TRUOC && pha.drBao[dich] !== pha.drKe[phe] && pha.tran.hl[dich].thu <= now) {
      pha.drBao[dich] = pha.drKe[phe];
      ra.push({ k: 'canh-bao', phe: dich, con: pha.drKe[phe] - now });
      hoLu(pha, now, ra, `${PHE[phe].tenNgan} sắp tung chiêu lớn! ${PHE[dich].tenNgan} gõ 2 để thủ!`);
    }
    // Chiêu diện rộng.
    if (now >= pha.drKe[phe]) {
      pha.drKe[phe] = now + DR_CACH + rand() * 3_000;
      const hl = pha.tran.hl;
      // Bốn căn cơ đồng đội (người đã ra tay trong trận): Chiến Tướng bên tung tăng sát thương, Phá Quân bên tung
      // có cơ xuyên khiên, Hộ Vệ bên trúng đỡ bớt, Y Sư bên trúng hồi lại sau đòn.
      const dem = (p: Phe, cc: CanCo) => {
        let n = 0;
        for (const [u, pp] of pha.nguoi) if (pp === p && the.nguoi.get(u)?.canCo === cc) n++;
        return n;
      };
      const congThem = Math.min(DR_TUONG_TOI_DA, dem(phe, 'tuong') * DR_TUONG);
      const xuyen = rand() < Math.min(DR_QUAN_TOI_DA, dem(phe, 'quan') * DR_QUAN_XUYEN);
      const doBot = Math.min(DR_VE_TOI_DA, dem(dich, 've') * DR_VE);
      const hoiLai = Math.min(DR_Y_TOI_DA, dem(dich, 'y') * DR_Y);
      // Phá (trận pháp) của phe này đang làm vỡ khiên bên kia, hoặc Phá Quân xuyên.
      const phaTran = hl[dich].vo > now;
      const congTran = hl[phe].cong > now;
      const hoiTran = now - (pha.tran.kyLuc.get(`${dich}:hoi`) ?? -Infinity) < KY_LAU;
      const chan = !xuyen && hl[dich].thu > now && !phaTran;
      // Kim Quy hộ cung: Thủy Tông trúng chiêu diện rộng (mà chưa có khiên Thủ) thì có KIM_QUY_KHIEN xác suất Kim
      // Quy hiện ra dựng khiên riêng, chỉ còn KIM_QUY_CON phần sát thương lọt qua (Phá Quân xuyên được).
      const quy = dich === 'thuy' && !chan && !xuyen && !phaTran && rand() < KIM_QUY_KHIEN;
      const heQuy = quy ? KIM_QUY_CON : 1;
      const he = (chan ? DR_CHAN : 1) * heQuy * (1 - doBot);
      const mat = DR_QUAN * he;
      pha.qs[dich] = Math.max(0, pha.qs[dich] - mat);
      pha.qsLuc[dich] = now;
      // Chiêu diện rộng mất DR_KHI trận khí (×1 ± theo lực chiến phe, Chiến Tướng, khiên, Hộ Vệ).
      const d = pha.H * DR_KHI * heSoPheLuc(the, now, phe) * (1 + congThem) * (congTran ? DR_TRAN_CONG : 1) * he;
      pha[phe] += d;
      // Y Sư bên trúng hồi lại một phần ngay sau đòn.
      // Hồi tối đa bằng đúng lượng vừa mất (không hồi lố thành cộng thêm).
      const hoi = Math.min(pha[phe], d, pha.H * hoiLai + (hoiTran ? d * DR_TRAN_HOI : 0));
      pha[phe] -= hoi;
      tpTrung(pha, dich, d - hoi);
      pha.rungLuc = now;
      const chieu = CHIEU_DIEN_RONG[phe][pha.drSo[phe]++ % CHIEU_DIEN_RONG[phe].length]!;
      ra.push({
        k: 'dien-rong',
        phe,
        chieu,
        chan,
        mat,
        quy,
        tru: Math.round((100 * (d - hoi)) / pha.H * 10) / 10,
        cong: Math.round(congThem * 100),
        xuyen,
        do: Math.round(doBot * 100),
        hoi: Math.round(hoiLai * 1000) / 10,
        tran: { cong: congTran, pha: phaTran, thu: chan, hoi: hoiTran },
      });
      hoLu(pha, now, ra, `${PHE[phe].tenNgan} tung ${chieu}!${chan ? ` ${PHE[dich].tenNgan} dựng khiên đỡ được phần lớn!` : ''}`);
    }
    // Tướng tiên phong.
    const u = pha.chu[phe];
    const tp = pha.tp[phe];
    if (u !== null && !dangChoi(the, now).some((n) => n.user === u)) {
      // Tiên phong rút (rời trận): không được lên lại, người kế lên thay.
      pha.tpRoi.add(u);
      pha.chu[phe] = null;
      pha.tpThay[phe] = now + 500;
    } else if (u !== null) {
      tp.mau = mauTienPhong(pha, phe);
      // Bên kia vừa mất tướng thì bên này chưa ngã ngay (giữ 1 máu) — không để hai tiên phong biến mất cùng lúc.
      if (tp.mau <= 0 && (pha.chu[dich] === null || pha.gian[dich] > now)) tp.mau = 1;
      const ten = the.nguoi.get(u)?.ten ?? 'Tướng tiên phong';
      if (!tp.thuong && tp.mau < TP_THUONG && tp.mau > 0) {
        tp.thuong = true;
        ra.push({ k: 'tp-thuong', phe, user: u });
        hoLu(pha, now, ra, `${ten} bị thương! ${PHE[phe].tenNgan} tiếp sức đi!`);
      }
      if (tp.mau <= 0) {
        const hiSinh = rand() < TP_HI_SINH;
        if (hiSinh) {
          const d = pha.H * HI_SINH_DIEM;
          pha[phe] += d;
          pha.cong.set(u, (pha.cong.get(u) ?? 0) + d);
          tpTrung(pha, dich, d);
          pha.hiSinh.push(u);
          ghiSuThi(the, now, ra, 'tpHiSinh', { ten, phe: PHE[phe].tenNgan }, phe);
        } else ghiSuThi(the, now, ra, 'tpHa', { ten, phe: PHE[phe].tenNgan }, phe);
        pha.tpRoi.add(u);
        pha.chu[phe] = null;
        pha.tpThay[phe] = now + TP_THAY;
        pha.gian[phe] = now + GIAN_LAU;
        pha.rungLuc = now;
        ra.push({ k: 'tp-ha', phe, user: u, hiSinh });
        hoLu(
          pha,
          now,
          ra,
          hiSinh
            ? `${ten} tung đòn hi sinh! ${PHE[dich].tenNgan} trúng nặng! ${THAN[phe]} nổi giận!`
            : `${ten} bị hạ! ${THAN[phe]} nổi giận!`,
          true,
        );
      }
    } else if (pha.tpThay[phe] > 0 && now >= pha.tpThay[phe]) {
      pha.tpThay[phe] = 0;
      const con = conTienPhong(the, pha, phe, now);
      const ke = con[0];
      pha.chu[phe] = ke?.user ?? null;
      pha.tp[phe] = doanTienPhong(pha, phe, con.length);
      ra.push({ k: 'tp-thay', phe, ai: ke?.user ?? null });
      if (ke !== undefined) hoLu(pha, now, ra, `${ke.ten} lên thay làm tiên phong ${PHE[phe].tenNgan}!`);
      else hoLu(pha, now, ra, `${PHE[phe].tenNgan} hết tướng! ${THAN[phe]} tự mình ra trận!`, true);
    }
  }
}

function heSoTran(pha: PhaLu, phe: Phe, now: number): number {
  const hl = pha.tran.hl;
  const dich = pheKia(phe);
  return (
    (hl[phe].cong > now ? 1.3 : 1) *
    (hl[dich].thu > now && hl[dich].vo <= now ? 0.7 : 1) *
    (hl[dich].vo > now ? 1.15 : 1) *
    heSoDienBien(pha, phe, now)
  );
}

/** Hệ số đòn theo diễn biến: quân mỏng thì yếu, tướng tiên phong bị thương thì yếu, chủ soái nổi giận thì mạnh. */
function heSoDienBien(pha: PhaLu, phe: Phe, now: number): number {
  return (0.75 + 0.25 * pha.qs[phe]) * (pha.chu[phe] !== null && pha.tp[phe].thuong ? 0.9 : 1) * (pha.gian[phe] > now ? GIAN_HE : 1);
}

/** Tổng lực chiến phe so với trung bình hai phe, kẹp ×0,8–×1,25; phe không có ai (tướng binh) ×0,9. */
export function heSoPheLuc(the: The, now: number, phe: Phe): number {
  const a = tongLuc(the, now, 'son').luc;
  const b = tongLuc(the, now, 'thuy').luc;
  const ta = phe === 'son' ? a : b;
  if (ta === 0) return 0.9;
  const tb = (a + b) / 2;
  return Math.max(0.8, Math.min(1.25, ta / tb));
}

/** Tỉ lệ bạo kích của đòn thường: 8% gốc + phần tim hâm nóng. */
export const tiLeBao = (pha: PhaLu, phe: Phe) => Math.min(BAO_TRAN, BAO_GOC + BAO_TIM * pha.nong[phe]);

/** Đòn thường tự động của cả hai phe. */
function donTuDong(the: The, pha: PhaLu, now: number, rand: () => number, ra: Su[]) {
  if (now < pha.donKe || now >= pha.den) return;
  pha.donKe = now + DON_CACH;
  for (const phe of ['son', 'thuy'] as const) {
    const dich = pheKia(phe);
    const tk = pha.thanKe[phe];
    // Phòng ngự: bên kia sắp tung chiêu diện rộng mà mình chưa có khiên.
    if (now >= tk.thu && pha.drKe[dich] - now < DON_CACH * 2 && pha.tran.hl[phe].thu <= now) {
      tk.thu = now + THAN_THU_CACH;
      pha.tran.hl[phe].thu = now + THAN_THU_LAU;
      ra.push({ k: 'than-chieu', phe, loai: 'thu', ten: CHIEU_THAN_THU[phe], so: 0 });
      hoLu(pha, now, ra, `${THAN[phe]} dựng ${CHIEU_THAN_THU[phe]}!`);
      continue;
    }
    // Hồi phục: trận khí phe đã mỏng.
    if (now >= tk.hoi && khiCon(pha, phe) < THAN_HOI_NGUONG) {
      tk.hoi = now + THAN_HOI_CACH;
      const so = Math.min(pha[dich], pha.H * THAN_HOI);
      pha[dich] -= so;
      ra.push({ k: 'than-chieu', phe, loai: 'hoi', ten: CHIEU_THAN_HOI[phe], so: Math.round(so) });
      hoLu(pha, now, ra, `${THAN[phe]} thi triển ${CHIEU_THAN_HOI[phe]}, hồi trận khí!`);
      continue;
    }
    const bao = rand() < tiLeBao(pha, phe);
    pha.nong[phe] *= 0.8;
    const d =
      DON_GOC *
      heSoPheLuc(the, now, phe) *
      (bao ? 2 : 1) *
      butPha(pha, phe) *
      (quyetChien(pha, now) ? QUYET_CHIEN_HE_SO : 1) *
      heSoTran(pha, phe, now);
    pha[phe] += d;
    tpTrung(pha, pheKia(phe), d);
    const chu = pha.chu[phe];
    if (chu !== null) pha.cong.set(chu, (pha.cong.get(chu) ?? 0) + d);
    // Chủ Tướng đang dùng công pháp nào thì đòn ra đúng chiêu đó; chưa chọn thì chiêu theo cảnh giới.
    const nChu = chu === null ? undefined : the.nguoi.get(chu);
    ra.push({ k: 'don', phe, bao, chieu: (nChu === undefined ? null : voCua(nChu).ten) ?? chieuCua(phe, nChu?.canh ?? 4) });
  }
  const dan: Phe | null = pha.son > pha.thuy ? 'son' : pha.thuy > pha.son ? 'thuy' : null;
  if (dan !== null && pha.dan !== null && dan !== pha.dan && pha.son + pha.thuy > 20) {
    pha.dao = { phe: dan, luc: now };
    pha.rungLuc = now;
    ra.push({ k: 'dao-chieu', phe: dan });
    hoLu(pha, now, ra, `Đảo chiều! ${PHE[dan].ten} vượt lên!`);
  }
  if (dan !== null) pha.dan = dan;
  dienBienTran(the, pha, now, rand, ra);
  buocChienTruong(pha, now, ra);
}

/** Chiêu do quà tặng trong Đại Chiến, theo mức xu. */
function quaChieu(the: The, pha: PhaLu, n: NguoiChoi & { phe: Phe }, xu: number, now: number, ra: Su[]) {
  if (xu >= QUA_MUC.hiem) {
    ghiDiem(pha, n, pha.H * QUA_HIEM, now, ra);
    pha.rungLuc = now;
    ra.push({ k: 'tuyet-ky', user: n.user, phe: n.phe, chieu: chieuCua(n.phe, 9) });
    if (n.canCo !== null) ketTran(the, pha, n.phe, CAN_CO[n.canCo].ky, now, ra, 'qua', n.user);
  } else if (xu >= QUA_MUC.tran) {
    if (n.canCo !== null) ketTran(the, pha, n.phe, CAN_CO[n.canCo].ky, now, ra, 'qua', n.user);
  } else if (xu >= QUA_MUC.lien) {
    for (let i = 0; i < 3; i++) ghiDiem(pha, n, QUA_LIEN, now, ra);
    ra.push({ k: 'qua-chieu', user: n.user, phe: n.phe, ten: 'Liên Kích ×3' });
  } else {
    ghiDiem(pha, n, QUA_BAO, now, ra);
    ra.push({ k: 'qua-chieu', user: n.user, phe: n.phe, ten: 'Bạo Kích' });
  }
}

/** Phe tự kết trận pháp bằng Linh Mạch: chọn theo tình thế. Phe không có người thì không kết. */
function tranTuDong(the: The, pha: PhaTran, now: number, ra: Su[]) {
  const tr = pha.tran;
  if (tr.tuKe === 0) tr.tuKe = now + TRAN_TU_CACH / 2;
  if (now < tr.tuKe || now >= pha.den) return;
  tr.tuKe = now + TRAN_TU_CACH;
  for (const phe of ['son', 'thuy'] as const) {
    if (soRaTay(the, pha, phe) === 0 && (pha.k !== 'lu' || pha.chu[phe] === null)) continue;
    const san = (ky: Ky) => hoiChieu(pha, phe, ky, now) === 0;
    const dich = pheKia(phe);
    let ky: Ky | null = null;
    if (pha.k === 'lu') {
      const khi = (pha.H - pha[dich]) / pha.H;
      if (khi < 0.5 && san('hoi')) ky = 'hoi';
      else if (tr.hl[dich].thu > now && san('pha')) ky = 'pha';
      else if (san('cong')) ky = 'cong';
      else if (san('thu')) ky = 'thu';
    } else {
      const coChoang = [...pha.choang.entries()].some(([u, den]) => den > now && the.nguoi.get(u)?.phe === phe);
      if (coChoang && san('hoi')) ky = 'hoi';
      else if (san('cong')) ky = 'cong';
      else if (san('pha')) ky = 'pha';
      else if (san('thu')) ky = 'thu';
    }
    if (ky !== null) ketTran(the, pha, phe, ky, now, ra, 'ho', null);
  }
}

function timLu(pha: PhaLu, n: NguoiChoi, so: number, now: number, ra: Su[]) {
  if (!coPhe(n)) return;
  vaoTran(pha, n);
  pha.tim[n.phe] += so;
  // Tim hâm nóng phe: tăng tỉ lệ bạo kích của đòn thường.
  pha.nong[n.phe] += so;
  ghiDiem(pha, n, DIEM_TIM * so, now, ra);
  ra.push({ k: 'gop', user: n.user, phe: n.phe, diem: DIEM_TIM * so });
}

function quaLu(pha: PhaLu, n: NguoiChoi, xu: number, now: number, ra: Su[]): number {
  if (!coPhe(n)) return 0;
  vaoTran(pha, n);
  const cu = pha.xuNguoi.get(n.user) ?? 0;
  pha.xuNguoi.set(n.user, cu + xu);
  pha.xu[n.phe] += xu;
  const diem = DIEM_QUA * (Math.sqrt(cu + xu) - Math.sqrt(cu));
  ghiDiem(pha, n, diem, now, ra);
  ra.push({ k: 'gop', user: n.user, phe: n.phe, diem });
  return diem;
}

function danhYeu(
  the: The,
  pha: Extract<Pha, { k: 'yeu' }>,
  n: NguoiChoi,
  now: number,
  rand: () => number,
  ra: Su[],
  heSo = 1,
) {
  // Ngã hay trọng thương thì không đánh được.
  if (pha.nga.has(n.user) || pha.roi.has(n.user)) return;
  // Chỉ đệ tử mới ra trận — khách đứng xem. Lịch trình giao yêu tinh cho một tông thì tông kia đứng xem.
  // Đang choáng vì yêu tinh phản đòn thì chưa đánh được.
  if (n.phe === null || (pha.phe !== null && n.phe !== pha.phe) || pha.mau <= 0 || now - n.danhLuc < DANH_CACH) return;
  if ((pha.choang.get(n.user) ?? 0) > now) return;
  n.danhLuc = now;
  const y = YEU[pha.yeu];
  if (rand() < y.truot) {
    ra.push({ k: 'trung', user: n.user, dmg: 0, bao: false, truot: true });
    return;
  }
  if (!pha.dmg.has(n.user)) uongDanTran(n, pha.den);
  const vo = voCua(n);
  const bao = rand() < (n.canCo === 'quan' ? 0.2 : 0.1) + (vo.he === null ? 0 : HE_CP[vo.he].bao * vo.tang);
  // Sát thương gốc là công: không đồ thì bằng 10 + 6×cảnh giới như cũ, có binh khí thì đau hơn.
  const dmg = Math.round(
    congThu(n).cong *
      (y.khac !== null && y.khac === n.phe ? 1.5 : 1) *
      (bao ? 2 : 1) *
      heSoLinhVat(n) *
      (n.canCo === null ? 1 : CO_DON[n.canCo]) *
      heSoVo(n) *
      (n.congDen > now ? 1.2 : 1) *
      (pha.tran.hl[n.phe].cong > now ? 1.3 : 1) *
      (pha.yeuVo > now ? 1.2 : 1) *
      (pha.giapDen > now ? GIAP_HE : 1) *
      (1 + buffCua(pha, n.user, now) / 100) *
      heSo,
  );
  if (!pha.hp.has(n.user)) pha.hp.set(n.user, MAU_YEU_NGUOI);
  pha.mau = Math.max(0, pha.mau - dmg);
  pha.dmg.set(n.user, (pha.dmg.get(n.user) ?? 0) + dmg);
  if (n.phe !== null) pha.dmgPhe[n.phe] += dmg;
  ra.push({ k: 'trung', user: n.user, dmg, bao, truot: false });
  // Mỗi khi máu tụt qua một mốc: rơi một món cho người được rút thăm.
  const soMoc = pha.dai ? YEU_MOC_DAI : YEU_MOC;
  const moc = Math.floor((1 - pha.mau / pha.mauMax) * soMoc);
  while (!pha.cuong && pha.mau > 0 && pha.roiMoc < moc) {
    pha.roiMoc++;
    const ai = chonNhanDo(the, pha, now, rand);
    if (ai !== null) yeuRoi(the, pha, ai, 0.3, now, rand, ra);
  }
  if (pha.mau <= 0) {
    if (pha.cuong) ketYeu(the, pha, now, rand, ra, n.user);
    else vaoCuongBao(the, pha, now, ra);
  }
}

/** % sát thương cộng thêm nhờ tim dư của đồng môn (0 nếu đã hết hạn). */
export function buffCua(pha: Extract<Pha, { k: 'yeu' }>, u: string, now: number): number {
  const b = pha.buff.get(u);
  return b === undefined || b.den <= now ? 0 : b.so;
}

/** Màn 2: yêu tinh sống lại Cuồng Bạo — máu mới bằng nửa máu cũ, đồ sát cả đội mỗi CB_CACH. */
function vaoCuongBao(the: The, pha: Extract<Pha, { k: 'yeu' }>, now: number, ra: Su[]) {
  pha.cuong = true;
  pha.mauMax = Math.max(1, Math.round(pha.mauMax * CB_SONG));
  pha.mau = pha.mauMax;
  pha.phanKe = now + 3_000;
  pha.choang.clear();
  const them = Math.min(CB_TOI_THIEU, Math.round(pha.tong * 0.5));
  if (pha.den - now < them) {
    pha.tong += them - (pha.den - now);
    pha.den = now + them;
  }
  const y = YEU[pha.yeu];
  ra.push({ k: 'cuong-bao', yeu: pha.yeu });
  ra.push({ k: 'doc', chu: `${y.ten} cuồng bạo! Thả tim liên tục để hồi máu và đánh tiếp!` });
  ghiSuThi(the, now, ra, 'yeuCuong', { yeu: y.ten });
}

/** Mất máu trong trận yêu tinh: 90% đòn vào kho "hồi được bằng tim"; hết máu thì ngã. */
function matMau(pha: Extract<Pha, { k: 'yeu' }>, u: string, dmg: number, now: number, ra: Su[]) {
  const hp = Math.max(0, (pha.hp.get(u) ?? MAU_YEU_NGUOI) - dmg);
  pha.hp.set(u, hp);
  pha.hoiDuoc.set(u, (pha.hoiDuoc.get(u) ?? 0) + Math.round(dmg * HOI_TIM));
  if (hp <= 0 && !pha.nga.has(u)) {
    pha.nga.set(u, now);
    ra.push({ k: 'nga', user: u });
  }
}

/** Hồi máu cho `toi` bằng phần máu còn hồi được (90% đòn vừa trúng); ngã thì gượng dậy. */
function hoiMau(pha: Extract<Pha, { k: 'yeu' }>, toi: string, tu: string | null, ra: Su[]): boolean {
  const hoi = pha.hoiDuoc.get(toi) ?? 0;
  if (hoi <= 0) return false;
  pha.hp.set(toi, Math.min(MAU_YEU_NGUOI, (pha.hp.get(toi) ?? MAU_YEU_NGUOI) + hoi));
  pha.hoiDuoc.set(toi, 0);
  const day = pha.nga.delete(toi);
  ra.push({ k: 'hoi-mau', user: toi, mau: hoi, day, tu });
  return true;
}

/** Người mạnh nhất phe đang trong trận (còn đứng): lực chiến cao nhất trong số đã ra tay. */
function manhNhatPhe(the: The, pha: Extract<Pha, { k: 'yeu' }>, phe: Phe): NguoiChoi | null {
  let tot: NguoiChoi | null = null;
  for (const u of pha.dmg.keys()) {
    const n = the.nguoi.get(u);
    if (n === undefined || n.phe !== phe || pha.roi.has(u)) continue;
    if (tot === null || lucChien(n) > lucChien(tot)) tot = n;
  }
  return tot;
}

/** Thả tim trong trận yêu tinh: hồi 90% máu vừa mất. Máu đầy (tim dư) thì tim tiếp sức người mạnh nhất
 *  phe: người đó đang mất máu thì hồi cho người đó, không thì +1% sát thương (tối đa +50%). Cuồng Bạo
 *  thì tim còn là một đòn. */
function timYeu(the: The, pha: Extract<Pha, { k: 'yeu' }>, n: NguoiChoi, now: number, rand: () => number, ra: Su[]) {
  if (pha.roi.has(n.user) || n.phe === null || (pha.phe !== null && n.phe !== pha.phe)) return;
  if (!hoiMau(pha, n.user, null, ra)) {
    const manh = manhNhatPhe(the, pha, n.phe);
    if (manh !== null && !(manh.user !== n.user && hoiMau(pha, manh.user, n.user, ra))) {
      const b = pha.buff.get(manh.user);
      const cu = b !== undefined && b.den > now ? b : { so: 0, den: 0, nguoi: new Set<string>() };
      cu.so = Math.min(BUFF_TOI_DA, cu.so + BUFF_MOI_TIM);
      cu.den = now + BUFF_GIU;
      cu.nguoi.add(n.user);
      pha.buff.set(manh.user, cu);
      ra.push({ k: 'buff', tu: n.user, toi: manh.user, so: cu.so });
    }
  }
  if (pha.cuong) danhYeu(the, pha, n, now, rand, ra, TIM_DANH);
}

/** Cuồng Bạo đồ sát: trúng mọi người đã ra tay còn đứng (đỡ được khó hơn màn 1). */
function cuongDon(the: The, pha: Extract<Pha, { k: 'yeu' }>, now: number, rand: () => number, ra: Su[]) {
  pha.phanKe = now + CB_CACH + rand() * 1_500;
  const trung: { user: string; dmg: number }[] = [];
  const doDuoc: string[] = [];
  for (const u of pha.dmg.keys()) {
    const n = the.nguoi.get(u);
    if (n === undefined || n.phe === null || pha.nga.has(u) || pha.roi.has(u)) continue;
    if (pha.tran.hl[n.phe].ho > now) {
      doDuoc.push(u);
      continue;
    }
    const thu = congThu(n).thu;
    if (rand() < Math.min(0.35, thu / (thu + 1200) + (pha.tran.hl[n.phe].thu > now ? 0.15 : 0))) {
      doDuoc.push(u);
      continue;
    }
    const dmg = Math.round(CB_MAU * (0.8 + rand() * 0.4));
    matMau(pha, u, dmg, now, ra);
    trung.push({ user: u, dmg });
  }
  const ds = YEU[pha.yeu].chieuDs;
  const chieu = `Đồ Sát · ${ds[pha.soPhan++ % ds.length] ?? YEU[pha.yeu].chieu}`;
  pha.phanCuoi = { luc: now, trung: trung.map((x) => x.user), doDuoc, chieu };
  ra.push({ k: 'cuong-don', trung, doDuoc, chieu });
}

/** Phe đang ra tay trong trận yêu tinh (lịch giao cho một tông thì chỉ tông đó). */
function pheRaTay(the: The, pha: Extract<Pha, { k: 'yeu' }>): Phe[] {
  if (pha.phe !== null) return [pha.phe];
  const co = new Set<Phe>();
  for (const u of pha.dmg.keys()) {
    const p = the.nguoi.get(u)?.phe;
    if (p !== null && p !== undefined) co.add(p);
  }
  return [...co];
}

/** Gõ số lúc yêu tinh đang báo chiêu lớn: đúng số đỡ thì tính phiếu cho phe mình; đủ phiếu (như kết trận pháp,
 *  20% người ra tay, 1–6) thì cả phe đỡ được — không tốn Linh Mạch. */
function doChieu(the: The, pha: Extract<Pha, { k: 'yeu' }>, n: NguoiChoi, so: string, now: number, ra: Su[]) {
  const b = pha.bao;
  if (b === null || n.phe === null || now >= b.den || (pha.phe !== null && n.phe !== pha.phe)) return;
  if (DO_BANG_SO[so] !== b.chieu.loai || b.do.includes(n.phe)) return;
  b.phieu.set(n.user, n.phe);
  let co = 0;
  for (const p of b.phieu.values()) if (p === n.phe) co++;
  if (co >= phieuCan(Math.max(1, soRaTay(the, pha, n.phe)))) {
    b.do.push(n.phe);
    ra.push({ k: 'do-chieu', phe: n.phe, chieu: b.chieu });
  }
}

/** Chiêu lớn: tới giờ thì báo trước BAO_LAU (yêu tinh tụ lực, chữ to giữa màn); hết giờ báo thì ra đòn. */
function buocChieuLon(the: The, pha: Extract<Pha, { k: 'yeu' }>, now: number, rand: () => number, ra: Su[]) {
  if (pha.bao === null) {
    if (now < pha.baoKe || pha.dmg.size === 0) return;
    const ds = YEU[pha.yeu].chieuLon;
    const chieu = ds[pha.soLon++ % ds.length]!;
    pha.bao = { chieu, luc: now, den: now + BAO_LAU, phieu: new Map(), do: [] };
    // Phản đòn thường không chen vào lúc đang tụ chiêu lớn.
    pha.phanKe = Math.max(pha.phanKe, now + BAO_LAU + 1_500);
    ra.push({ k: 'bao-chieu', chieu, den: pha.bao.den });
    ra.push({ k: 'doc', chu: `${YEU[pha.yeu].ten} tụ ${chieu.ten}! Gõ ${SO_DO_CHIEU[chieu.loai]} để đỡ!` });
    return;
  }
  if (now < pha.bao.den) return;
  const { chieu, do: doPhe } = pha.bao;
  pha.bao = null;
  pha.baoKe = now + (BAO_CACH + (rand() - 0.5) * 6_000) * (pha.cuong ? 0.7 : 1);
  const trung: { user: string; dmg: number }[] = [];
  let hoi = 0;
  const conDung = (phe: Phe) =>
    [...pha.dmg.keys()].filter((u) => {
      const p = the.nguoi.get(u)?.phe;
      return p === phe && !pha.nga.has(u) && !pha.roi.has(u);
    });
  if (chieu.loai === 'quet' || chieu.loai === 'choang') {
    for (const phe of pheRaTay(the, pha)) {
      if (doPhe.includes(phe)) continue;
      let ds = conDung(phe);
      if (chieu.loai === 'choang') {
        for (let i = ds.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [ds[i], ds[j]] = [ds[j]!, ds[i]!];
        }
        ds = ds.slice(0, Math.ceil(ds.length / 2));
      }
      for (const u of ds) {
        const dmg = chieu.loai === 'quet' ? Math.round(QUET_MAU * (pha.cuong ? 1.3 : 1) * (0.85 + rand() * 0.3)) : CHOANG_MAU;
        if (chieu.loai === 'choang') pha.choang.set(u, now + CHOANG_LON);
        matMau(pha, u, dmg, now, ra);
        trung.push({ user: u, dmg });
      }
    }
  } else if (chieu.loai === 'giap') {
    if (doPhe.length === 0) pha.giapDen = now + GIAP_LAU;
    else pha.yeuVo = Math.max(pha.yeuVo, now + GIAP_VO);
  } else if (doPhe.length === 0) {
    hoi = Math.min(pha.mauMax - pha.mau, Math.round(pha.mauMax * HUT_PHAN));
    pha.mau += hoi;
  } else pha.phanKe += HUT_HUT;
  pha.lonCuoi = { luc: now, chieu, trung: trung.map((x) => x.user), doPhe: [...doPhe], hoi };
  ra.push({ k: 'chieu-lon', chieu, trung, doPhe: [...doPhe], hoi });
}

/** Bốc yêu tinh thường ngẫu nhiên, không trùng con vừa đánh (`yeuThu` giữ chỉ số con vừa ra + 1). */
export function bocYeu(the: The, rand: () => number): YeuId {
  const cu = (the.yeuThu - 1 + THU_TU_YEU.length) % THU_TU_YEU.length;
  let i = Math.floor(rand() * (THU_TU_YEU.length - 1));
  if (the.yeuThu > 0 && i >= cu) i++;
  else if (the.yeuThu === 0) i = Math.floor(rand() * THU_TU_YEU.length);
  the.yeuThu = i + 1;
  return THU_TU_YEU[i]!;
}

/** Nhịp máu mỗi bước: ngã quá NGA_HAN thì trọng thương; cả đội ngã / trọng thương thì yêu tinh thắng. */
function buocMau(the: The, pha: Extract<Pha, { k: 'yeu' }>, now: number, rand: () => number, ra: Su[]): boolean {
  for (const [u, luc] of pha.nga) {
    if (now - luc < NGA_HAN) continue;
    pha.nga.delete(u);
    pha.roi.add(u);
    ra.push({ k: 'trong-thuong', user: u });
  }
  if (pha.dmg.size === 0) return false;
  for (const u of pha.dmg.keys()) if (!pha.nga.has(u) && !pha.roi.has(u)) return false;
  ketYeu(the, pha, now, rand, ra, null, true);
  return true;
}

// ---------- Nhịp ----------

function sang(the: The, pha: Pha, ra: Su[]) {
  the.pha = pha;
  ra.push({ k: 'pha', pha: pha.k });
}

function cho(the: The, now: number, ra: Su[]) {
  sang(the, { k: 'cho', den: now + the.nhip.nghi, tong: the.nhip.nghi }, ra);
}

export function buoc(the: The, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  const pha = the.pha;
  const xepHang = (loai: LoaiDacBiet, phe: Phe | null, luc: number) => {
    if (the.hangDacBiet.some((h) => h.loai === loai && h.phe === phe)) return;
    // Xếp theo ưu tiên: sự kiện lớn > yêu tinh > Đại Chiến > Địa Cung > Ải; cùng hạng thì việc tới trước.
    const moi = { loai, phe, luc };
    const i = the.hangDacBiet.findIndex((h) => HANG_LICH[h.loai] > HANG_LICH[loai]);
    if (i < 0) the.hangDacBiet.push(moi);
    else the.hangDacBiet.splice(i, 0, moi);
  };
  buocSuKienTl(the, now, ra);
  buocLoiDai(the, now, rand, ra);
  buocQuaGap(the, now, ra);
  // Sự kiện lớn theo giờ đồng hồ (ô "Sự kiện lớn").
  for (const { d, khoa, luc } of denGio(the.lich, now, the.lechPhut, the.daChayLich)) {
    the.daChayLich.add(khoa);
    xepHang(d.loai, d.phe, luc);
  }
  // Giữ màn (người vận hành tạm dừng): màn sự kiện hết giờ thì chạy lại một lượt nữa (đếm ngược từ đầu);
  // tu luyện thì cứ hỏi tiếp. Lịch, tổng kết không chen vào.
  // Lôi kiếp là một phần của màn tu luyện: cứ để nó tự kết rồi về tu luyện.
  if (the.giu && now >= pha.den && pha.k !== 'cho' && pha.k !== 'hoi' && pha.k !== 'dap' && pha.k !== 'kiep' && pha.k !== 'kiep-ket') {
    pha.den = now + Math.max(5_000, pha.tong);
    if (pha.k === 'nm') pha.moLuc = now;
  }
  // Chuỗi sự kiện: 10 giây trước thì thông báo (và cho câu hỏi đang dở khép lại); tới giờ mà đang tu luyện
  // (giữa hai câu) thì mở ngay, không đợi câu kế.
  if (the.theoLich && !the.giu && !the.chuoiCho && the.chuoi.ds.length > 0) {
    const m = the.chuoi.ds[the.chuoiI % the.chuoi.ds.length]!;
    if (the.baoTruoc === null && now >= the.chuoiKe - BAO_TRUOC_CHUOI && docViec(m.viec) !== null) {
      const chu = m.bao.trim() !== '' ? m.bao.trim() : baoMau(m);
      the.baoTruoc = { ten: tenMuc(m), chu, den: the.chuoiKe };
      ra.push({ k: 'bao-truoc', ten: tenMuc(m), chu, den: the.chuoiKe });
      ra.push({ k: 'doc', chu });
      if (pha.k === 'hoi') pha.den = Math.min(pha.den, now);
    }
    if (now >= the.chuoiKe && (pha.k === 'cho' || pha.k === 'dap' || pha.k === 'hoi')) {
      chayMucChuoi(the, m, now, rand, ra);
      return ra;
    }
  }
  // Theo giờ: tổng kết năm đúng phút 58 — 10 giây trước khép câu hỏi đang dở, tới giờ là vào tổng kết ngay.
  if (the.theoLich && !the.giu && theoGio(the.chuoi) && (pha.k === 'cho' || pha.k === 'dap' || pha.k === 'hoi')) {
    if (pha.k === 'hoi' && now >= the.muaKe - BAO_TRUOC_CHUOI) pha.den = Math.min(pha.den, now);
    if (now >= the.muaKe) {
      batDauTiep(the, now, rand, ra);
      return ra;
    }
  }
  // Đã BỎ luật xuất môn (người vận hành 2026-11-19): đệ tử đã nhập môn thì giữ tông mãi, vào lại phòng không phải
  // vượt Ải Nhập Môn lần nữa. Nhịp `xmKe` giờ chỉ còn lo chiến thương lành lại.
  if (now >= the.xmKe) {
    the.xmKe = now + 5_000;
    // Chiến thương lành lại.
    for (const n of the.nguoi.values()) {
      if (n.thuong < 1 && now >= n.thuongDen) {
        n.thuong = 1;
        the.ban = true;
      }
    }
  }
  doiLuotPhe(the, now, rand);
  if (pha.k === 'me') diMe(the, pha, now, rand, ra);
  if (pha.k === 'tt') buocKhaoHach(the, pha, now, rand, ra);
  if (pha.k === 'nm') {
    // Hết 30 giây bước vào mà không ai vào: đóng ải, quay lại tu luyện.
    if (now >= pha.moLuc && pha.vt.size === 0) {
      cho(the, now, ra);
      return ra;
    }
    if (now >= pha.moLuc) buocNm(the, pha, now, rand, ra);
    if (pha.vt.size > 0 && pha.qua.length === pha.vt.size) pha.den = Math.min(pha.den, now);
  }
  if (pha.k === 'yeu' && pha.mau > 0) buocChieuLon(the, pha, now, rand, ra);
  if (pha.k === 'yeu' && pha.mau > 0 && now >= pha.phanKe && pha.bao === null) {
    if (pha.cuong) cuongDon(the, pha, now, rand, ra);
    else phanDon(the, pha, now, rand, ra);
  }
  if (pha.k === 'yeu' && buocMau(the, pha, now, rand, ra)) return ra;
  if (pha.k === 'lu') {
    donTuDong(the, pha, now, rand, ra);
    dienBienLu(the, pha, now, ra);
  }
  if (pha.k === 'lu' || pha.k === 'yeu') tranTuDong(the, pha, now, ra);
  if (pha.k === 'lu') haoKhi(pha, now, ra);
  // Đại Chiến không hết giờ (người vận hành 2026-11-20): tông nào CẠN TRẬN KHÍ (điểm bên kia chạm H) thì trận kết.
  if (pha.k === 'lu' && (pha.son >= pha.H || pha.thuy >= pha.H)) pha.den = Math.min(pha.den, now);
  if (now < pha.den) return ra;
  switch (pha.k) {
    case 'nm':
      ketNm(the, pha, now, ra);
      break;
    case 'me':
      ketMe(the, pha, now, ra);
      break;
    case 'cho':
      batDauTiep(the, now, rand, ra);
      break;
    case 'hoi':
      ketCau(the, pha, now, ra);
      break;
    case 'kiep':
      ketKiep(the, pha, now, ra, rand);
      break;
    case 'lu':
      ketLu(the, pha, now, ra, rand);
      break;
    case 'yeu':
      ketYeu(the, pha, now, rand, ra, null);
      break;
    default:
      cho(the, now, ra);
  }
  return ra;
}

function batDauTiep(the: The, now: number, rand: () => number, ra: Su[]) {
  const nh = the.nhip;
  // Đang giữ màn tu luyện: chỉ hỏi tiếp, không mở gì khác.
  if (the.giu) {
    moCauHoi(the, now, rand, ra);
    return;
  }
  // Sự kiện của chuỗi vừa xong: tu luyện quãng nghỉ rồi tới sự kiện kế.
  if (the.chuoiCho) {
    the.chuoiCho = false;
    henChuoi(the, now);
  }
  // Đang trong 10 giây thông báo trước sự kiện kế: không mở câu hỏi mới, chờ sự kiện vào đúng giờ.
  if (the.theoLich && !the.chuoiCho && the.chuoi.ds.length > 0 && now >= the.chuoiKe - BAO_TRUOC_CHUOI) {
    sang(the, { k: 'cho', den: Math.max(now + 250, the.chuoiKe), tong: Math.max(250, the.chuoiKe - now) }, ra);
    return;
  }
  // Đang tỉ thí Lôi Đài: không chen độ kiếp hay màn khác giữa trận (trận tối đa 45 giây), hỏi tiếp câu đố.
  if (the.loiDai?.tran != null && laTuLuyen(the.pha)) {
    moCauHoi(the, now, rand, ra);
    return;
  }
  const choi = dangChoi(the, now);

  while (!the.kiepVua && the.hangKiep.length > 0 && now - the.kiepLuc >= nh.kiepCach) {
    const user = the.hangKiep.shift()!;
    const n = the.nguoi.get(user);
    // Người đã rời phòng thì không gọi tên lên độ kiếp trước mặt cả phòng.
    if (n === undefined || !n.choKiep) continue;
    if (now - n.lanCuoi > 3 * PHUT) {
      n.choKiep = false;
      continue;
    }
    const canh = n.canh + 1;
    const cau = bocCauKho(the.daHoiKho, rand);
    the.kiepVua = true;
    the.kiepLuc = now;
    // Hộ Kiếp Đan: hai đạo hộ pháp sẵn từ đầu.
    const ho = new Set<string>();
    if (n.dan.kiep > 0) {
      n.dan.kiep--;
      ho.add('dan:ho-1');
      ho.add('dan:ho-2');
    }
    sang(the, { k: 'kiep', user, ten: n.ten, canh, cau, den: now + nh.kiep, tong: nh.kiep, chon: null, ho }, ra);
    ra.push({
      k: 'doc',
      chu: `Lôi kiếp! ${n.ten} độ kiếp ${tenCanh(canh)}. Cả phòng gõ 1, 2, 3 để hộ pháp, ai hộ pháp cũng có quà!`,
    });
    return;
  }

  the.kiepVua = false;

  // Ải Nhập Môn: cứ mỗi `nmCach` phút, hễ có khách đang chờ (phàm nhân vừa lên tiếng) là mở. Chạy theo
  // lịch mỗi giờ thì Ải vẫn mở xen giữa lúc tu luyện, miễn xong trước mốc sự kiện kế (Ải :00 là mốc chính).
  const nmDai = nh.nmVao + nh.nm + nh.nmKet;
  const hoKip = nmDai + BAO_TRUOC_CHUOI + 20_000;
  // Theo lịch: chỉ xen khi Ải xong kịp trước mốc sự kiện kế và trước tổng kết năm.
  const xenAi = !the.theoLich || (theoGio(the.chuoi) && the.chuoiKe - now > hoKip && the.muaKe - now > hoKip);
  if (xenAi && now >= the.nmKe && choi.some((n) => n.phe === null)) {
    the.nmKe = now + nh.nmCach;
    batDauNm(the, now, rand, ra);
    return;
  }

  // Việc trong lịch lỡ giờ quá hạn (vì đang có trận) thì bỏ, không dồn: Ải, Địa Cung 3 phút; trận 5 phút.
  while (the.hangDacBiet.length > 0 && now - the.hangDacBiet[0]!.luc > HAN_LICH[the.hangDacBiet[0]!.loai]) {
    the.hangDacBiet.shift();
  }
  const db = the.hangDacBiet.shift();
  if (db !== undefined && batDauDacBiet(the, db, now, choi, rand, ra)) return;

  if (!the.theoLich && now >= the.yeuKe && !the.tat.yeu) {
    the.yeuKe = now + nh.yeuCach;
    if (choi.length > 0) {
      moYeu(the, bocYeu(the, rand), null, now, choi, ra);
      return;
    }
  }

  if (!the.theoLich && now >= the.luKe && !the.tat.lu) {
    the.luKe = now + nh.luCach;
    if (choi.length > 0) {
      moLuThuong(the, now, ra);
      return;
    }
  }

  if (!the.theoLich && now >= the.meKe && !the.tat.me) {
    the.meKe = now + nh.meCach;
    if (choi.length > 0) {
      batDauMe(the, now, rand, ra, choi);
      return;
    }
  }

  if (now >= the.muaKe) {
    // Theo giờ: tổng kết ở phút 58 mỗi giờ.
    the.muaKe =
      the.theoLich && theoGio(the.chuoi)
        ? the.chuoiGoc + (Math.floor((now - the.chuoiGoc) / GIO) + 1) * GIO + PHUT_TONG_KET * PHUT
        : now + nh.mua;
    ketMua(the, now, ra);
    return;
  }

  moCauHoi(the, now, rand, ra);
}

function moCauHoi(the: The, now: number, rand: () => number, ra: Su[]) {
  const nh = the.nhip;
  // Tu luyện không còn câu đố (trừ hội thi): một nhịp tu luyện yên, cùng độ dài một câu hỏi + đáp án.
  if (!the.cauTl && the.hoiThiCon <= 0) {
    sang(the, { k: 'cho', den: now + nh.hoi + nh.dap, tong: nh.hoi + nh.dap }, ra);
    return;
  }
  the.soCau++;
  const thi = the.hoiThiCon > 0 ? ++the.hoiThiSo : 0;
  if (thi > 0) the.hoiThiCon--;
  const cau = thi > 0 ? bocCauKho(the.daHoiKho, rand) : bocCau(the.daHoi, rand);
  sang(the, { k: 'hoi', cau, so: the.soCau, den: now + nh.hoi, tong: nh.hoi, tra: new Map(), dungThuTu: [], thi }, ra);
  ra.push({
    k: 'doc',
    chu: `Câu ${the.soCau}. ${cau.hoi.replace(/…$/, ' gì')} A, ${cau.dap[0]}. B, ${cau.dap[1]}. C, ${cau.dap[2]}.`,
  });
}

/** Một mục trong chuỗi sự kiện: việc (mã như "ai", "dia-cung", "pk", "yeu-ngu-son", "tu-luyen"), số phút
 *  (trận: dài bao lâu, 0 là theo thẻ màn; tu-luyen: nghỉ thêm bao lâu) và câu thông báo 10 giây trước. */
export interface MucChuoi {
  viec: string;
  phut: number;
  bao: string;
  /** Bắt đầu ở phút thứ mấy của mỗi giờ (tính từ lúc mở live); -1 là nối tiếp sau sự kiện trước. */
  batDau: number;
}

/** Chuỗi sự kiện chạy nối tiếp: xong một sự kiện thì tu luyện `nghi` ms rồi tới sự kiện kế; hết thì lặp. */
export interface Chuoi {
  ds: MucChuoi[];
  nghi: number;
}

/** Lịch chuẩn mỗi giờ (phút tính từ lúc mở live): 0 Ải Nhập Môn · 15 Đại Chiến tỉ võ 10′ · 25 mê cung nhận đồ ·
 *  30 Thành Trì Tự Do 10′ · 45 Boss lớn 10′ (luân phiên) · 55 mê cung nhận chiến lợi phẩm · 58 tổng kết năm.
 *  Giữa các mốc là tu luyện. */
export const CHUOI_MAU: Chuoi = {
  nghi: 3 * PHUT,
  ds: [
    { viec: 'ai', phut: 0, bao: '', batDau: 0 },
    { viec: 'pk', phut: 10, bao: '', batDau: 15 },
    { viec: 'dia-cung', phut: 0, bao: '', batDau: 25 },
    { viec: 'cho', phut: 10, bao: '', batDau: 30 },
    { viec: 'loi-dai', phut: 5, bao: '', batDau: 40 },
    { viec: 'yeu-luan', phut: 10, bao: '', batDau: 45 },
    { viec: 'dia-cung', phut: 0, bao: '', batDau: 55 },
  ],
};

/** Theo giờ: mọi mục đều có phút bắt đầu (tổng kết năm khi đó cũng ở phút cố định). */
export const theoGio = (c: Chuoi) => c.ds.length > 0 && c.ds.every((m) => m.batDau >= 0);
/** Theo giờ: phút tổng kết năm trong mỗi giờ. */
export const PHUT_TONG_KET = 58;
const GIO = 60 * PHUT;
/** Theo giờ: mục lỡ mốc quá chừng này (vì màn trước kéo dài) thì bỏ, chờ giờ sau. */
const TRE_TOI_DA = 3 * PHUT;

/** Theo giờ: mục kế tiếp và lúc của nó (mốc chưa chạy, không trễ quá TRE_TOI_DA). */
function keTheoGio(the: The, now: number): { i: number; luc: number } | null {
  let tot: { i: number; luc: number } | null = null;
  const k0 = Math.floor((now - the.chuoiGoc) / GIO);
  the.chuoi.ds.forEach((m, i) => {
    for (const k of [k0, k0 + 1]) {
      const luc = the.chuoiGoc + k * GIO + m.batDau * PHUT;
      if (luc <= the.chuoiDaChay || now - luc > TRE_TOI_DA) continue;
      if (tot === null || luc < tot.luc) tot = { i, luc };
    }
  });
  return tot;
}

/** Hẹn sự kiện kế của chuỗi: theo giờ thì mốc kế tiếp; nối tiếp thì sau giờ nghỉ. */
function henChuoi(the: The, now: number) {
  if (theoGio(the.chuoi)) {
    const k = keTheoGio(the, now);
    if (k !== null) {
      the.chuoiI = k.i;
      the.chuoiKe = k.luc;
    } else the.chuoiKe = now + GIO;
  } else the.chuoiKe = now + the.chuoi.nghi;
  the.baoTruoc = null;
}

/** Thông báo hiện trước mỗi sự kiện bao lâu. */
export const BAO_TRUOC_CHUOI = 10_000;

/** "yeu-ngu-son" → { loai: 'yeu-ngu', phe: 'son' }; "tu-luyen" (nghỉ thêm) → null. */
export function docViec(viec: string): { loai: LoaiDacBiet; phe: Phe | null } | null {
  if (viec === 'tu-luyen') return null;
  if (viec === 'yeu-luan') return { loai: 'yeu-ngu', phe: 'son' };
  const m = /^yeu-(ngu|ho|moc)(?:-(son|thuy|ca))?$/.exec(viec);
  if (m !== null) return { loai: `yeu-${m[1]}` as LoaiDacBiet, phe: m[2] === 'son' || m[2] === 'thuy' ? m[2] : null };
  return viec in DAC_BIET ? { loai: viec as LoaiDacBiet, phe: null } : { loai: 'ai', phe: null };
}

/** ĐIỀU KHIỂN (thanh ngoài khung) — lịch luôn bám giờ thật, không dời mốc. */

/** Lần tới của mục `i` trong lịch theo giờ (mốc đã qua ít hơn TRE_TOI_DA vẫn tính là "lần này"). */
function lucMuc(the: The, i: number, now: number): number {
  const m = the.chuoi.ds[i]!;
  if (!theoGio(the.chuoi)) return now;
  const k0 = Math.floor((now - the.chuoiGoc) / GIO);
  for (const k of [k0 - 1, k0, k0 + 1]) {
    const luc = the.chuoiGoc + k * GIO + m.batDau * PHUT;
    if (luc > the.chuoiDaChay && now - luc <= TRE_TOI_DA) return luc;
  }
  return the.chuoiGoc + (k0 + 1) * GIO + m.batDau * PHUT;
}

/** Chạy NGAY mục `i` (cắt màn đang chạy). Mốc giờ của mục đó tính là đã chạy — tới giờ thật không lặp lại;
 *  xong thì lịch đi tiếp theo giờ thật. Bấm lúc đang giữ màn thì bỏ giữ. */
export function nhayMuc(the: The, i: number, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  const m = the.chuoi.ds[i];
  if (m === undefined) return ra;
  the.giu = false;
  the.chuoiCho = false;
  the.hangDacBiet = [];
  the.chuoiI = i;
  the.chuoiKe = lucMuc(the, i, now);
  cho(the, now, ra);
  chayMucChuoi(the, m, now, rand, ra);
  return ra;
}

/** ⏭ Màn kế: sự kiện sắp tới theo lịch chạy ngay bây giờ. */
export function nhayKe(the: The, now: number, rand: () => number): Su[] {
  if (the.chuoi.ds.length === 0) return [];
  the.chuoiCho = false;
  if (theoGio(the.chuoi)) henChuoi(the, now);
  return nhayMuc(the, the.chuoiI % the.chuoi.ds.length, now, rand);
}

/** Nhảy về tu luyện ngay: cắt màn đang chạy, mở câu hỏi tu luyện. Lịch không đổi — tới mốc kế thì sự kiện vẫn
 *  chạy đúng giờ; đang tạm dừng thì vẫn giữ (ở lại tu luyện để soát). */
export function nhayTuLuyen(the: The, now: number, rand: () => number, phe?: Phe): Su[] {
  const ra: Su[] = [];
  the.hangDacBiet = [];
  the.ldGio = null;
  the.baoTruoc = null;
  // Nhắm một tông (tab Sơn / Thủy của thanh điều khiển): tông đó tới lượt tu luyện ngay, đủ một lượt.
  if (phe !== undefined) {
    the.pheTg[the.pheHien] += Math.max(0, now - the.pheTu);
    the.pheHien = phe;
    the.pheTu = now;
    the.pheDoiLuc = now + the.luotPhe;
  }
  moCauHoi(the, now, rand, ra);
  return ra;
}

/** Nhảy tới tỉ thí tông môn (Lôi Đài): về tu luyện rồi mở ngay một trận cho tông đang tới lượt. */
export function nhayTiThi(the: The, now: number, rand: () => number, phe?: Phe): Su[] {
  const ra = nhayTuLuyen(the, now, rand, phe);
  moTiThi(the, now, ra);
  return ra;
}

/** Nhảy tới Thử Thách Nhập Môn một cửa của một tông (thanh điều khiển: "Nhập Môn · Sơn Tông / Thủy Tông"). */
export function nhayNm(the: The, phe: Phe, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  the.giu = false;
  the.hangDacBiet = [];
  the.baoTruoc = null;
  batDauNm(the, now, rand, ra, phe);
  return ra;
}

/** Nhảy tới Tranh Đoạt Bảo Vật riêng một tông, đúng kiểu mê cung `loai` (thanh điều khiển: tab Sơn / Thủy). */
export function nhayMe(the: The, phe: Phe, loai: number, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  the.giu = false;
  the.hangDacBiet = [];
  the.baoTruoc = null;
  batDauMe(the, now, rand, ra, dangChoi(the, now), phe, loai);
  return ra;
}

/** Mở Thành Trì: chợ chung hai tông (`phe` null) hoặc Đan Các · Tàng Kinh Các riêng một tông. */
function moTt(the: The, phe: Phe | null, lau: number, now: number, ra: Su[]) {
  sang(the, { k: 'tt', den: now + lau, tong: lau, phe, kh: null, mua: [] }, ra);
  ghiSuThi(the, now, ra, 'choMo', {});
  ra.push({
    k: 'doc',
    chu:
      phe !== null
        ? `Đan Các và Tàng Kinh Các ${PHE[phe].ten} mở cửa! Đan dược gõ D1 tới D9, chiêu thức gõ C1 tới C9.`
        : 'Cửa Thành Trì Tự Do mở! Đan Các gõ D1 tới D9, Tàng Kinh Các gõ C1 tới C9.',
  });
}

/** Nhảy tới Đan Các · Tàng Kinh Các riêng một tông (thanh điều khiển: tab Sơn / Thủy). */
export function nhayTt(the: The, phe: Phe, now: number): Su[] {
  const ra: Su[] = [];
  the.giu = false;
  the.hangDacBiet = [];
  the.baoTruoc = null;
  moTt(the, phe, the.nhip.tt, now, ra);
  return ra;
}

/** Nhảy tới tổng kết năm ngay. */
export function nhayTongKet(the: The, now: number): Su[] {
  const ra: Su[] = [];
  the.giu = false;
  the.muaKe = now;
  the.hangDacBiet = [];
  the.baoTruoc = null;
  cho(the, now, ra);
  return ra;
}

/** Bao lâu một mục chiếm trong lịch (để biết giờ thật đang rơi vào khung của mục nào). */
function daiMuc(the: The, m: MucChuoi): number {
  return Math.max(PHUT, uocLuong(the, m));
}

/** ⏸ Tạm dừng: giữ nguyên màn đang chạy. `tiThi`: giữ luôn màn tỉ thí (hết trận mở trận kế). Thanh điều khiển gọi
 *  hàm này sau MỌI lần "Nhảy tới" — nhảy tới màn nào thì ở lại màn đó tới khi bấm ▶ Chạy tiếp. */
export function giuMan(the: The, tiThi = false): void {
  the.giu = true;
  // Đang ở giờ Lôi Đài (lịch / Nhảy tới :40) mà giữ màn: giữ luôn màn tỉ thí, giờ Lôi Đài không tự hết.
  the.ldGiu = tiThi || the.ldGio !== null;
  the.baoTruoc = null;
}

/** ▶ Chạy tiếp: tự căn theo giờ thật. Giờ này đang nằm trong khung của mục nào thì chạy mục đó với phần thời
 *  gian còn lại (đang đúng màn đó thì chạy tiếp, chỉ cắt cho khớp giờ kết); không rơi vào khung nào thì về tu
 *  luyện, chờ mục kế đúng giờ. */
export function thaGiu(the: The, now: number, rand: () => number): Su[] {
  const ra: Su[] = [];
  if (!the.giu) return ra;
  the.giu = false;
  the.ldGiu = false;
  the.hangDacBiet = [];
  the.chuoiCho = false;
  const pha = the.pha;
  const dangSuKien = pha.k !== 'cho' && pha.k !== 'hoi' && pha.k !== 'dap';
  if (!the.theoLich || !theoGio(the.chuoi)) {
    if (dangSuKien) pha.den = Math.min(pha.den, now);
    the.chuoiKe = now + the.chuoi.nghi;
    return ra;
  }
  const phut = ((((now - the.chuoiGoc) % GIO) + GIO) % GIO) / PHUT;
  const goc = now - phut * PHUT;
  let khop = -1;
  the.chuoi.ds.forEach((m, i) => {
    const dau = m.batDau;
    if (phut >= dau && phut < dau + daiMuc(the, m) / PHUT && (khop < 0 || dau > the.chuoi.ds[khop]!.batDau)) khop = i;
  });
  if (khop < 0) {
    // Giữa hai mốc: kết màn đang giữ, tu luyện chờ mục kế.
    if (dangSuKien) cho(the, now, ra);
    the.chuoiDaChay = Math.max(the.chuoiDaChay, now - TRE_TOI_DA - 1);
    henChuoi(the, now);
    return ra;
  }
  const m = the.chuoi.ds[khop]!;
  const ketLuc = goc + m.batDau * PHUT + daiMuc(the, m);
  the.chuoiI = (khop + 1) % the.chuoi.ds.length;
  the.chuoiDaChay = goc + m.batDau * PHUT;
  const v = m.viec === 'yeu-luan' ? null : docViec(m.viec);
  if (v?.loai === 'loi-dai') {
    if (dangSuKien) cho(the, now, ra);
    the.ldGio = { den: ketLuc };
    return ra;
  }
  const cungMan =
    v !== null &&
    ((v.loai === 'pk' && (pha.k === 'lu' || pha.k === 'lu-ket')) ||
      (v.loai === 'cho' && pha.k === 'tt') ||
      (v.loai === 'dia-cung' && (pha.k === 'me' || pha.k === 'me-ket')) ||
      (v.loai === 'ai' && (pha.k === 'nm' || pha.k === 'nm-ket')) ||
      (v.loai.startsWith('yeu-') && (pha.k === 'yeu' || pha.k === 'yeu-ket')));
  if (cungMan || (m.viec === 'yeu-luan' && (pha.k === 'yeu' || pha.k === 'yeu-ket'))) {
    // Đang đúng màn của khung giờ này: chạy tiếp, kết đúng giờ kết của khung.
    pha.den = Math.min(Math.max(pha.den, now + 5_000), Math.max(now + 5_000, ketLuc));
    the.chuoiCho = true;
    return ra;
  }
  // Màn khác: mở màn của khung giờ này với phần thời gian còn lại.
  const conPhut = Math.max(1, Math.round((ketLuc - now) / PHUT));
  the.chuoiKe = goc + m.batDau * PHUT;
  cho(the, now, ra);
  chayMucChuoi(the, { ...m, phut: m.phut > 0 ? conPhut : m.phut }, now, rand, ra);
  return ra;
}

export const tenMuc = (m: MucChuoi) => {
  if (m.viec === 'yeu-luan') return 'Boss lớn (luân phiên)';
  const v = docViec(m.viec);
  return v === null ? `Tu luyện thêm ${m.phut} phút` : tenLich(v);
};
export const hinhMuc = (m: MucChuoi) => {
  const v = docViec(m.viec);
  return v === null ? '🧘' : HINH_LICH[v.loai];
};

/** Câu thông báo mặc định 10 giây trước mỗi loại sự kiện (người vận hành sửa được từng mục). */
export function baoMau(m: MucChuoi): string {
  const v = docViec(m.viec);
  if (v === null) return '';
  const tong = v.phe === null ? 'Hai tông' : `Đệ tử ${PHE[v.phe].tenNgan}`;
  switch (v.loai) {
    case 'ai':
      return 'Mười giây nữa Ải Nhập Môn mở! Phàm nhân chuẩn bị gõ số một, hai để theo Sơn Tông; ba, bốn để theo Thủy Tông.';
    case 'dia-cung':
      return 'Mười giây nữa Tranh Đoạt Bảo Vật! Đệ tử chuẩn bị gõ lên, xuống, trái, phải giành bảo vật.';
    case 'pk':
      return 'Mười giây nữa Đại Chiến tỉ võ tông môn! Bình luận tiếp sức, thả tim, tặng quà ra chiêu!';
    case 'cho':
      return 'Mười giây nữa mở cửa Thành Trì Tự Do! Đan Các gõ D1 tới D9, Tàng Kinh Các gõ C1 tới C9.';
    case 'dai-yeu':
      return 'Mười giây nữa Đại Yêu Dạ — Tam Yêu Hợp Thể! Cả phòng chuẩn bị gõ đánh!';
    case 'dai-lu':
      return 'Mười giây nữa Đại Hồng Thủy! Hai tông chuẩn bị!';
    case 'hoi-thi':
      return 'Mười giây nữa Hội thi Ngọc Phả — tám câu khó, linh khí nhân đôi!';
    case 'loi-dai':
      return 'Mười giây nữa Tỉ Thí Lôi Đài! Ai đã tặng quà khiêu chiến chuẩn bị lên đài, gõ một đánh, hai thủ, ba tuyệt kỹ!';
    case 'phuc-loc':
      return 'Mười giây nữa Giờ Linh Khí — Mỵ Nương rải phúc, linh khí nhân đôi!';
    default:
      return m.viec === 'yeu-luan'
        ? 'Mười giây nữa Boss lớn xuất thế! Đệ tử chuẩn bị gõ đánh!'
        : `Mười giây nữa ${DAC_BIET[v.loai].ten} xuất thế! ${tong} chuẩn bị gõ đánh!`;
  }
}

/** Mở một mục của chuỗi. Phòng trống thì hoãn 30 giây; mục tu-luyen chỉ kéo dài giờ nghỉ. */
function chayMucChuoi(the: The, m: MucChuoi, now: number, rand: () => number, ra: Su[]) {
  const gio = theoGio(the.chuoi);
  // Boss lớn: bốc ngẫu nhiên một con (không trùng con vừa đánh), tông khắc nó ra tay (không khắc ai thì hai tông).
  const yeuBoc = m.viec === 'yeu-luan' ? bocYeu(the, rand) : null;
  const v = yeuBoc !== null ? { loai: `yeu-${yeuBoc}` as LoaiDacBiet, phe: YEU[yeuBoc].khac } : docViec(m.viec);
  const n = the.chuoi.ds.length;
  the.chuoiDaChay = the.chuoiKe;
  if (v === null) {
    the.chuoiI = (the.chuoiI + 1) % n;
    the.chuoiKe = now + Math.max(0, m.phut) * PHUT;
    the.baoTruoc = null;
    if (gio) henChuoi(the, now);
    return;
  }
  const choi = dangChoi(the, now);
  if (choi.length === 0) {
    the.baoTruoc = null;
    if (gio) henChuoi(the, now);
    else the.chuoiKe = now + 30_000;
    return;
  }
  const dai = m.phut > 0 && (LOAI_TRAN.has(v.loai) || v.loai === 'cho' || v.loai === 'loi-dai') ? m.phut * PHUT : undefined;
  the.chuoiI = (the.chuoiI + 1) % n;
  the.baoTruoc = null;
  if (batDauDacBiet(the, { ...v, luc: now }, now, choi, rand, ra, dai)) the.chuoiCho = true;
  else henChuoi(the, now);
}

/** Ưu tiên khi nhiều việc trong lịch cùng tới giờ (số nhỏ chạy trước). */
const HANG_LICH: Record<LoaiDacBiet, number> = {
  'dai-yeu': 0,
  'dai-lu': 0,
  'yeu-ngu': 1,
  'yeu-ho': 1,
  'yeu-moc': 1,
  pk: 2,
  cho: 2,
  'loi-dai': 2,
  'dia-cung': 3,
  ai: 4,
  'hoi-thi': 5,
  'phuc-loc': 5,
};
/** Lỡ giờ quá chừng này thì bỏ việc đó (đợi lượt sau trong lịch). */
const HAN_LICH: Record<LoaiDacBiet, number> = {
  'dai-yeu': 15 * PHUT,
  'dai-lu': 15 * PHUT,
  'yeu-ngu': 5 * PHUT,
  'yeu-ho': 5 * PHUT,
  'yeu-moc': 5 * PHUT,
  pk: 5 * PHUT,
  cho: 5 * PHUT,
  'loi-dai': 5 * PHUT,
  'dia-cung': 3 * PHUT,
  ai: 3 * PHUT,
  'hoi-thi': 60 * PHUT,
  'phuc-loc': 60 * PHUT,
};
const LOAI_TRAN = new Set<LoaiDacBiet>(['dai-yeu', 'dai-lu', 'yeu-ngu', 'yeu-ho', 'yeu-moc', 'pk']);
/** Trận ngắn nhất khi phải co cho kịp trận kế. */
const TRAN_IT_NHAT = 3 * PHUT;

/** Sự kiện lớn theo giờ đồng hồ: trận phải xong trước sự kiện lớn kế tiếp (chừa 1 phút), ngắn nhất 3 phút. */
function thoiLuongTran(the: The, now: number, muon: number): number {
  for (const x of sapToiDs(the.lich, now + 60_000, the.lechPhut, 12)) {
    if (LOAI_TRAN.has(x.d.loai)) return Math.max(TRAN_IT_NHAT, Math.min(muon, x.luc - now - 60_000));
  }
  return muon;
}

/** Mở yêu tinh (theo nhịp hoặc theo lịch trình). `phe` khác null: chỉ tông đó ra tay, máu theo tông đó. */
function moYeu(the: The, yeu: YeuId, phe: Phe | null, now: number, choi: NguoiChoi[], ra: Su[], dai?: number) {
  const nh = { ...the.nhip, yeu: thoiLuongTran(the, now, dai ?? the.nhip.yeu) };
  // Máu theo tổng công của đệ tử được đánh: mỗi người đánh được ~20% số đòn tối đa trong cả trận
  // (trận dài bao nhiêu thì máu dày bấy nhiêu). Sàn 250 mỗi 90 giây để một người cũng có trận ra trò.
  const congTong = choi.filter((n) => n.phe !== null && (phe === null || n.phe === phe)).reduce((a, n) => a + congThu(n).cong, 0);
  const mauMax = Math.ceil(Math.max(250 * Math.max(1, nh.yeu / YEU_GOC), congTong * (nh.yeu / DANH_CACH) * YEU_PHAN_DANH) / 50) * 50;
  sang(the, { ...phaYeu(yeu, mauMax, now, nh.yeu, false), phe }, ra);
  ghiSuThi(the, now, ra, 'yeuHien', { yeu: YEU[yeu].ten });
  ra.push({
    k: 'doc',
    chu: phe === null ? `${YEU[yeu].ten} xuất thế! Cả phòng gõ 5 để đánh!` : `${YEU[yeu].ten} xuất thế! Đệ tử ${PHE[phe].tenNgan} gõ 5 để đánh!`,
  });
}

function moLuThuong(the: The, now: number, ra: Su[], muon?: number) {
  const dai = thoiLuongTran(the, now, muon ?? the.nhip.lu);
  moLu(the, now, ra, dai, false, Math.max(1, dai / LU_GOC));
  ghiSuThi(the, now, ra, 'luBatDau', {});
  ra.push({ k: 'doc', chu: 'Thủy Tinh dâng nước! Gõ gì cũng được, phe nào đông tay hơn thì thắng!' });
}

/** Mở việc tới giờ trong lịch trình. Trả `true` khi việc chiếm nhịp này (mê cung, yêu tinh, Đại Chiến,
 *  Đại Yêu, Đại Hồng Thủy); `false` thì nhịp này làm việc thường — Phúc Lộc và Hội thi chạy cùng câu hỏi. */
function batDauDacBiet(
  the: The,
  muc: { loai: LoaiDacBiet; phe: Phe | null; luc: number },
  now: number,
  choi: NguoiChoi[],
  rand: () => number,
  ra: Su[],
  dai?: number,
): boolean {
  const nh = the.nhip;
  const loai = muc.loai;
  const info = DAC_BIET[loai];
  const soChoi = choi.length;
  if (loai !== 'hoi-thi' && loai !== 'phuc-loc' && soChoi === 0) {
    // Phòng trống thì để dành (còn trong hạn), có người vào mới mở.
    the.hangDacBiet.unshift(muc);
    return false;
  }
  if (loai === 'ai') {
    // Mục lịch ghi tông: ải một cửa của tông đó (mỗi tông live một nick riêng).
    batDauNm(the, now, rand, ra, muc.phe);
    return true;
  }
  if (loai === 'dia-cung') {
    // Mục lịch ghi tông: Tranh Đoạt riêng tông đó, bốc ngẫu nhiên một kiểu mê cung.
    batDauMe(the, now, rand, ra, choi, muc.phe, muc.phe !== null ? 1 + Math.floor(rand() * ME_LOAI[muc.phe].length) : 1);
    return true;
  }
  if (loai === 'pk') {
    moLuThuong(the, now, ra, dai);
    return true;
  }
  if (loai === 'loi-dai') {
    // Giờ Lôi Đài: màn Tỉ Thí riêng chạy liên tục trong khung này (loi-dai.ts `buocLoiDai`), xong về tu luyện.
    the.ldGio = { den: now + (dai ?? LD_GIO_LAU) };
    ghiSuThi(the, now, ra, 'dacBiet', { ten: info.ten, loi: info.loi });
    ra.push({ k: 'doc', chu: `${info.ten} bắt đầu! ${info.loi}.` });
    return false;
  }
  if (loai === 'cho') {
    const lau = dai ?? nh.tt;
    moTt(the, muc.phe, lau, now, ra);
    return true;
  }
  const yeu = yeuCuaLich(loai);
  if (yeu !== null) {
    moYeu(the, yeu, muc.phe, now, choi, ra, dai);
    return true;
  }
  if (loai === 'phuc-loc') {
    the.phucLoc = 10;
    the.phucLocTu = 'Mỵ Nương';
  } else if (loai === 'hoi-thi') {
    the.hoiThiCon = HOI_THI_SO_CAU;
    the.hoiThiSo = 0;
  } else if (loai === 'dai-yeu') {
    const mauMax = Math.max(700, Math.ceil((soChoi * 900) / 100) * 100);
    const dai = 2 * nh.yeu;
    sang(
      the,
      phaYeu('tam', mauMax, now, dai, true),
      ra,
    );
  } else {
    const dai = 3 * nh.lu;
    moLu(the, now, ra, dai, true, 2);
  }
  ghiSuThi(the, now, ra, 'dacBiet', { ten: info.ten, loi: info.loi });
  ra.push({ k: 'doc', chu: `${info.ten} bắt đầu! ${info.loi}.` });
  ra.push({ k: 'dac-biet', loai });
  return loai === 'dai-yeu' || loai === 'dai-lu';
}

function phaYeu(yeu: YeuId, mauMax: number, now: number, dai: number, lon: boolean): Extract<Pha, { k: 'yeu' }> {
  return {
    k: 'yeu',
    yeu,
    mau: mauMax,
    mauMax,
    den: now + dai,
    tong: dai,
    dmg: new Map(),
    dmgPhe: { son: 0, thuy: 0 },
    phe: null,
    dai: lon,
    tim: new Map(),
    qua: new Map(),
    tuongTac: new Set(),
    roiMoc: 0,
    phanKe: now + PHAN_CACH,
    choang: new Map(),
    tran: taoTran(),
    yeuVo: 0,
    phanCuoi: null,
    soPhan: 0,
    cuong: false,
    hp: new Map(),
    hoiDuoc: new Map(),
    nga: new Map(),
    roi: new Set(),
    buff: new Map(),
    bao: null,
    baoKe: now + BAO_DAU,
    soLon: 0,
    giapDen: 0,
    lonCuoi: null,
  };
}

/** Mở Đại Chiến: mỗi phe chọn Chủ Tướng là người cảnh giới (rồi lực chiến) cao nhất đang chơi. Khách
 *  (phàm nhân) chỉ đứng xem — muốn ra trận phải vượt Ải Nhập Môn. */
function moLu(the: The, now: number, ra: Su[], dai: number, lon: boolean, he: number) {
  // Không đếm giờ: đánh tới khi một tông cạn trận khí; `LU_TRAN_TOI_DA` chỉ là trần an toàn (phòng vắng không treo).
  void dai;
  const pha = phaLu(now, LU_TRAN_TOI_DA, lon, tranKhi(the, now, he));
  for (const phe of ['son', 'thuy'] as const) {
    const ds = dangChoi(the, now)
      .filter((n) => n.phe === phe)
      .sort((a, b) => b.canh - a.canh || lucChien(b) - lucChien(a));
    pha.chu[phe] = ds[0]?.user ?? null;
    pha.tp[phe] = doanTienPhong(pha, phe, ds.length);
  }
  sang(the, pha, ra);
}

/** Trận khí mỗi phe theo số người đang chơi lúc mở trận — như nhau cho hai phe. */
function tranKhi(the: The, now: number, he = 1): number {
  const d = demPhe(the, now);
  // Trận đánh tới khi cạn khí: KHI_NGUOI mỗi người (đo: mỗi đệ tử gõ đều ~1 điểm / giây → không quà ~4 phút; quà
  // làm trận nhanh hơn), tối thiểu KHI_TOI_THIEU.
  return Math.round(Math.max(KHI_TOI_THIEU, KHI_NGUOI * (d.son + d.thuy)) * he);
}
/** Trận khí mỗi người đang chơi lúc mở trận, và mức tối thiểu. */
const KHI_NGUOI = 120;
const KHI_TOI_THIEU = 800;
/** Trần an toàn của một trận Đại Chiến (không hiện đồng hồ): quá chừng này mà chưa tông nào cạn khí thì phân xử. */
export const LU_TRAN_TOI_DA = 30 * 60_000;

function phaLu(now: number, dai: number, lon: boolean, H = 200): Extract<Pha, { k: 'lu' }> {
  return {
    k: 'lu',
    den: now + dai,
    tong: dai,
    son: 0,
    thuy: 0,
    nguoi: new Map(),
    dai: lon,
    luc: { son: { tong: 0, so: 0 }, thuy: { tong: 0, so: 0 } },
    cong: new Map(),
    tim: { son: 0, thuy: 0 },
    xu: { son: 0, thuy: 0 },
    xuNguoi: new Map(),
    combo: { son: { so: 0, luc: 0 }, thuy: { so: 0, luc: 0 } },
    dan: null,
    dao: null,
    dau: null,
    dauKe: now + DAU_DAU,
    dauKet: null,
    chu: { son: null, thuy: null },
    H,
    tran: taoTran(),
    qcBao: false,
    hoLuc: 0,
    rungLuc: 0,
    donKe: now + 2_000,
    nong: { son: 0, thuy: 0 },
    binh: { son: 0, thuy: 0 },
    binhLuc: now,
    qs: { son: 1, thuy: 1 },
    qsLuc: { son: 0, thuy: 0 },
    drKe: { son: now + DR_DAU, thuy: now + DR_DAU + DR_CACH / 2 },
    drSo: { son: 0, thuy: 0 },
    drBao: { son: 0, thuy: 0 },
    thanKe: { son: { thu: now + 6_000, hoi: now + 15_000 }, thuy: { thu: now + 6_000, hoi: now + 15_000 } },
    tp: { son: { mau: 100, thuong: false, nguong: TP_NGUONG, tu: 100 }, thuy: { mau: 100, thuong: false, nguong: TP_NGUONG, tu: 100 } },
    tpRoi: new Set(),
    tpThay: { son: 0, thuy: 0 },
    gian: { son: 0, thuy: 0 },
    hiSinh: [],
  };
}

// ---------- Ải Nhập Môn (mê cung cấp 1) ----------

type PhaNm = Extract<Pha, { k: 'nm' }>;

function batDauNm(the: The, now: number, rand: () => number, ra: Su[], pheMuon: Phe | null = null) {
  // Ải HAI CỬA đã bỏ (người dùng: mỗi tông có màn nhập môn riêng): không ghi tông thì mở ải một cửa của tông đang
  // tới lượt tu luyện. Nhánh `phe === null` bên dưới và ở màn vẽ giữ lại cho hồ sơ cũ, không còn đường nào tới.
  const phe: Phe | null = pheMuon ?? pheTuLuyen(the, now).phe;
  const nh = the.nhip;
  // Ải nào mở (theo lịch hay xen giữa) cũng tính vào nhịp: lần xen kế cách lần này đủ `nmCach`.
  the.nmKe = Math.max(the.nmKe, now + nh.nmCach);
  // Đối xứng gương: hai cửa cách lối vào đúng bằng nhau. Đường quá dài thì đào lại (60 giây phải gõ kịp).
  // Ải một cửa: cửa giữa mép trên (ô giữa hàng 0); hai cửa: hai góc trên.
  const oCua = phe === null ? 0 : Math.floor(NM_COT / 2);
  let me = taoMeDoiXung(NM_COT, NM_HANG, rand, NM_THUNG);
  for (let thu = 0; thu < 20 && khoang(me, (NM_HANG - 1) * NM_COT + Math.floor(NM_COT / 2), oCua) > NM_DUONG_MAX; thu++) {
    me = taoMeDoiXung(NM_COT, NM_HANG, rand, NM_THUNG);
  }
  const vao = (NM_HANG - 1) * NM_COT + Math.floor(NM_COT / 2);
  const cua = phe === null ? { son: 0, thuy: NM_COT - 1 } : { son: oCua, thuy: oCua };
  // Mở khe tường ngoài ở lối vào và cửa (chỉ để vẽ).
  me.tuong[vao]! &= ~BIT.xuong;
  me.tuong[cua.son]! &= ~BIT.len;
  me.tuong[cua.thuy]! &= ~BIT.len;
  const tong = nh.nmVao + nh.nm;
  const moLuc = now + nh.nmVao;
  // Hẹn giờ rơi: rải ngẫu nhiên trong 70% đầu giờ chơi.
  const hen: { luc: number; bk: boolean }[] = [];
  for (let i = 0; i < NM_CAP_DO; i++) hen.push({ luc: moLuc + rand() * nh.nm * 0.7, bk: false });
  if (rand() < NM_TI_LE_BI_KIP) hen.push({ luc: moLuc + nh.nm * (0.2 + rand() * 0.45), bk: true });
  hen.sort((a, b) => a.luc - b.luc);
  sang(the, { k: 'nm', den: now + tong, tong, moLuc, me, vao, cua, phe, vt: new Map(), qua: [], do: [], idKe: 1, hen, quaTich: 0, giaHan: 0 }, ra);
  ghiSuThi(the, now, ra, 'nmMo', {});
  ra.push({
    k: 'doc',
    chu:
      phe !== null
        ? `Ải Nhập Môn ${PHE[phe].ten} mở! Ba mươi giây để bước vào: gõ một là nam, hai là nữ.`
        : 'Ải Nhập Môn mở! Ba mươi giây để bước vào: gõ một là nam, hai là nữ Sơn Tông; ba là nam, bốn là nữ Thủy Tông.',
  });
}

function vaoNm(pha: PhaNm, n: NguoiChoi, pheChon: Phe, gioi: Gioi, now: number, ra: Su[]) {
  // Ải một cửa: ai bước vào cũng thuộc tông của ải (gõ 1 / 3 là nam, 2 / 4 là nữ).
  const phe = pha.phe ?? pheChon;
  const v = pha.vt.get(n.user);
  if (v !== undefined) {
    // Còn trong 30 giây bước vào thì đổi nhân vật được.
    v.phe = phe;
    v.gioi = gioi;
    return;
  }
  if (pha.vt.size >= NM_TOI_DA) return;
  pha.vt.set(n.user, { o: pha.vao, luc: now, phe, gioi, cho: [], qua: false, tui: [], bk: 0 });
  ra.push({ k: 'nm-vao', user: n.user, phe });
}

function diNm(pha: PhaNm, n: NguoiChoi, h: Huong, so: number, now: number) {
  const v = pha.vt.get(n.user);
  if (v === undefined || v.qua || now < pha.moLuc) return;
  // Lệnh mới thay cho các bước còn chờ: người chơi đổi ý thì đi theo ý mới.
  v.cho = new Array<Huong>(Math.max(1, Math.min(NM_BUOC_TOI_DA, so))).fill(h);
}

/** Các ô trên đường ngắn nhất từ lối vào tới Cửa Sơn Tông (không kể hai đầu). Mê cung soi gương nên
 *  ô soi gương của chúng nằm đúng trên đường tới Cửa Thủy Tông. */
function duongNm(pha: PhaNm): number[] {
  const ds: number[] = [];
  let o = pha.vao;
  const dich = new Set([pha.cua.son]);
  // Đường ngắn nhất cố định (không xáo) để đồ luôn nằm đúng lối chính.
  for (let i = 0; i < 80; i++) {
    const k = buocToi(pha.me, o, dich, () => 0);
    if (k === null || k === pha.cua.son) break;
    ds.push(k);
    o = k;
  }
  return ds;
}

/** Thả một CẶP vật phẩm lên đường tới hai cửa (ô soi gương nhau, cùng phẩm, cùng chỉ số). */
function roiNm(the: The, pha: PhaNm, bk: boolean, rand: () => number, may = 0.55) {
  const giua = Math.floor(pha.me.cot / 2);
  const co = new Set(pha.do.map((d) => d.o));
  const duong = duongNm(pha).filter((o) => o % pha.me.cot !== giua && !co.has(o) && !co.has(oGuong(pha.me, o)));
  // Đồ chỉ rơi ở nửa TRÊN màn hình (hàng < NM_HANG_ROI, gần hai cửa tông) — cả phòng thấy rõ mà tranh nhau;
  // đường ngắn quá không có ô nào đủ cao thì lấy những ô cao nhất trên đường.
  let ds = duong.filter((o) => Math.floor(o / pha.me.cot) < NM_HANG_ROI);
  if (ds.length === 0 && duong.length > 0) {
    const cao = Math.min(...duong.map((o) => Math.floor(o / pha.me.cot)));
    ds = duong.filter((o) => Math.floor(o / pha.me.cot) === cao);
  }
  if (ds.length === 0) return;
  const o = ds[Math.floor(rand() * ds.length)]!;
  const g = oGuong(pha.me, o);
  if (bk) {
    pha.do.push({ id: pha.idKe++, o, loai: 'bk' }, { id: pha.idKe++, o: g, loai: 'bk' });
    return;
  }
  // Hên xui: đôi khi rơi đồ hiếm (Huyền, Địa, Thiên phẩm).
  const vat = taoDo(chon(O_TRANG_BI, rand), bocPham(rand, may), rand, the.khoDo);
  pha.do.push({ id: pha.idKe++, o, loai: 'tb', vat }, { id: pha.idKe++, o: g, loai: 'tb', vat: { ...vat } });
}

/** QUÀ RƠI BẢO VẬT trong mê cung (Ải Nhập Môn, Tranh Đoạt Bảo Vật): ai cũng tặng được, kể cả khách đứng xem.
 *  Mỗi `QUA_ME_XU` xu tích lũy trong màn rơi thêm một cặp vật phẩm (hai ô soi gương — hai phe vẫn bằng nhau); một
 *  món quà từ `QUA_ME_QUY` xu rơi ngay một cặp đồ quý (phẩm cao hơn hẳn). Trên sân không quá `QUA_ME_TRAN` món
 *  cùng lúc — dư thì để dành tới khi có người nhặt bớt. */
export const QUA_ME_XU = 10;
export const QUA_ME_QUY = 100;
/** Mỗi cặp vật phẩm rơi nhờ quà cộng thêm chừng này thời gian cho màn mê cung, tối đa bấy nhiêu mỗi màn. */
export const QUA_ME_GIO = 5_000;
export const QUA_ME_GIO_TOI_DA = 90_000;
const QUA_ME_TRAN = 12;
function quaMeCung(the: The, pha: PhaNm | PhaMe, n: NguoiChoi, xu: number, now: number, rand: () => number, ra: Su[]) {
  if (pha.k === 'nm' && now < pha.moLuc) return;
  const truoc = pha.do.length;
  const roi = (may: number) => {
    if (pha.do.length >= QUA_ME_TRAN) return false;
    if (pha.k === 'nm') roiNm(the, pha, false, rand, may);
    else roiDo(the, pha, rand, true, may);
    return true;
  };
  if (xu >= QUA_ME_QUY) roi(0.92);
  pha.quaTich += xu;
  while (pha.quaTich >= QUA_ME_XU && roi(0.55)) pha.quaTich -= QUA_ME_XU;
  const them = (pha.do.length - truoc) / 2;
  // Mỗi cặp rơi nhờ quà còn kéo dài màn thêm `QUA_ME_GIO` (tối đa `QUA_ME_GIO_TOI_DA` mỗi màn) để kịp nhặt.
  if (them > 0) {
    const cong = Math.min(them * QUA_ME_GIO, QUA_ME_GIO_TOI_DA - pha.giaHan);
    if (cong > 0) {
      pha.giaHan += cong;
      pha.den += cong;
      pha.tong += cong;
    }
  }
  if (them > 0) ra.push({ k: 'doc', chu: `${n.ten} tặng quà, ${them > 1 ? `${them} cặp bảo vật` : 'bảo vật'} rơi xuống!` });
}

/** Tới giờ thì thả một cặp túi linh thạch vào hai ô soi gương còn trống trong `ds` (ô đã lọc sẵn theo mê cung). */
function roiThach(pha: { do: DoRoi[]; idKe: number; me: MeCung; thachKe?: number }, luat: typeof THACH_ME | typeof THACH_NM, ds: () => number[], now: number, rand: () => number) {
  if (pha.thachKe === undefined) {
    pha.thachKe = now + luat.dau;
    return;
  }
  if (now < pha.thachKe) return;
  pha.thachKe = now + luat.cach;
  if (pha.do.filter((d) => d.loai === 'thach').length > luat.toiDa - 2) return;
  const co = new Set(pha.do.map((d) => d.o));
  const giua = Math.floor(pha.me.cot / 2);
  const cho = ds().filter((o) => o % pha.me.cot !== giua && !co.has(o) && !co.has(oGuong(pha.me, o)));
  if (cho.length === 0) return;
  const o = cho[Math.floor(rand() * cho.length)]!;
  const so = luat.tu + Math.floor(rand() * (luat.den - luat.tu + 1));
  pha.do.push({ id: pha.idKe++, o, loai: 'thach', so }, { id: pha.idKe++, o: oGuong(pha.me, o), loai: 'thach', so });
}

/** Bước vào ô có túi linh thạch: cộng ngay cho người nhặt (khách chưa nhập môn cũng giữ). */
function nhatThach(the: The, user: string, o: number, so: number, ra: Su[]) {
  const n = the.nguoi.get(user);
  if (n === undefined) return;
  n.tinChi += so;
  the.ban = true;
  ra.push({ k: 'nhat-thach', user, o, so });
}

function buocNm(the: The, pha: PhaNm, now: number, rand: () => number, ra: Su[]) {
  while (pha.hen.length > 0 && now >= pha.hen[0]!.luc) roiNm(the, pha, pha.hen.shift()!.bk, rand);
  // Ô gần đường tới cửa (đi vòng không quá 4 bước): ải một cửa có đường thẳng cột giữa nên phải lấy cả ô hai bên.
  const dai = khoang(pha.me, pha.vao, pha.cua.son);
  roiThach(
    pha,
    THACH_NM,
    () =>
      Array.from({ length: pha.me.cot * pha.me.hang }, (_, o) => o).filter(
        (o) => o !== pha.vao && o !== pha.cua.son && o !== pha.cua.thuy && khoang(pha.me, pha.vao, o) + khoang(pha.me, o, pha.cua.son) <= dai + 4,
      ),
    now,
    rand,
  );
  for (const [user, v] of pha.vt) {
    if (v.qua || v.cho.length === 0 || now - v.luc < BUOC_CACH) continue;
    const h = v.cho.shift()!;
    const toi = ke(pha.me, v.o, h);
    if (toi === null) {
      v.cho = [];
      continue;
    }
    v.luc = now;
    v.o = toi;
    const i = pha.do.findIndex((d) => d.o === toi);
    if (i >= 0) {
      const d = pha.do.splice(i, 1)[0]!;
      if (d.loai === 'bk') {
        v.bk++;
        ra.push({ k: 'bi-kip', user, o: toi });
        const n = the.nguoi.get(user);
        if (n !== undefined) ghiSuThi(the, now, ra, 'nmBiKip', { ten: n.ten });
      } else if (d.loai === 'tb') {
        d.vat.tg = v.phe;
        d.vat.gi = v.gioi;
        v.tui.push(d.vat);
        ra.push({ k: 'nhat', user, o: toi, vat: d.vat, lk: 0, mac: false, ruong: false, nguon: 'nm', lucTruoc: 0, lucSau: 0 });
      } else if (d.loai === 'thach') {
        nhatThach(the, user, toi, d.so, ra);
      }
    }
    if (toi !== pha.cua[v.phe]) continue;
    // Tới đúng cửa phe đã chọn: vượt ải, nhập môn; đồ và bí kíp nhặt dọc đường thành của mình.
    const n = the.nguoi.get(user);
    if (n === undefined) continue;
    v.qua = true;
    v.cho = [];
    pha.qua.push(user);
    const thu = pha.qua.length;
    nhapPhe(the, n, v.phe, now, ra, v.gioi, rand);
    const lucTruoc = lucChien(n);
    for (const vat of v.tui) nhanDo(the, n, vat, now, ra);
    // Bí kíp: lĩnh ngộ thêm một tầng võ công của căn cơ mình (không tốn linh thạch).
    // Bí kíp: lĩnh ngộ một môn công pháp chưa có (rẻ nhất trước), dùng ngay.
    for (let k = 0; k < v.bk; k++) {
      const i = CONG_PHAP.findIndex((m, j) => (n.cpCo & (1 << (j + 1))) === 0 && n.canh >= CANH_CP[m.bac]!);
      if (i < 0) break;
      n.cpCo |= 1 << (i + 1);
      n.cp = i + 1;
    }
    congLk(the, n, THUONG_NM[thu - 1] ?? 3, now, ra);
    ra.push({ k: 'nm-qua', user, phe: v.phe, thu, ao: n.ao, vat: v.tui.slice(), bk: v.bk, lucTruoc, lucSau: lucChien(n) });
    ghiSuThi(the, now, ra, 'nmQua', { ten: n.ten, phe: PHE[v.phe].tenNgan, thu }, v.phe);
  }
}

function ketNm(the: The, pha: PhaNm, now: number, ra: Su[]) {
  const qua = pha.qua.map((user) => {
    const n = the.nguoi.get(user);
    return { user, ten: n?.ten ?? user, phe: pha.vt.get(user)!.phe };
  });
  const truot = pha.vt.size - qua.length;
  sang(the, { k: 'nm-ket', den: now + the.nhip.nmKet, tong: the.nhip.nmKet, qua, truot }, ra);
  ra.push({
    k: 'doc',
    chu:
      qua.length > 0
        ? `Ải Nhập Môn đóng! ${qua.length} người vượt ải, chào mừng đồng môn mới!`
        : 'Ải Nhập Môn đóng! Chưa ai tới cửa — mười phút nữa ải lại mở.',
  });
}

// ---------- Địa Cung ----------

type PhaMe = Extract<Pha, { k: 'me' }>;

/** Một kiểu mê cung: cỡ, độ nhiều lối tắt (`thung`), thời gian và số bảo vật nhân thêm, tranh nền (`nen/<nen>.webp`). */
export interface KieuMe {
  ten: string;
  cot: number;
  hang: number;
  thung: number;
  gio: number;
  do: number;
  nen: string;
}
/** Mê cung chung hai tông (Địa Cung gốc). */
export const ME_CHUNG: KieuMe = { ten: 'Địa Cung', cot: ME_COT, hang: ME_HANG, thung: 0.12, gio: 1, do: 1, nen: 'me' };
/** Mê cung riêng của từng tông (Mê cung 1…N, mỗi tông một bộ, mỗi mê cung một tranh nền). */
export const ME_LOAI: Record<Phe, readonly KieuMe[]> = {
  son: [
    { ten: 'Hang Đá Tản Viên', cot: 9, hang: 11, thung: 0.14, gio: 0.9, do: 0.8, nen: 'me-son-1' },
    { ten: 'Rừng Tre Cổ Thụ', cot: 11, hang: 13, thung: 0.12, gio: 1.1, do: 1, nen: 'me-son-2' },
    { ten: 'Lò Đúc Đồng', cot: 13, hang: 17, thung: 0.1, gio: 1.4, do: 1.4, nen: 'me-son-3' },
  ],
  thuy: [
    { ten: 'Rạn San Hô', cot: 9, hang: 11, thung: 0.16, gio: 0.9, do: 0.8, nen: 'me-thuy-1' },
    { ten: 'Động Băng Ngầm', cot: 11, hang: 15, thung: 0.06, gio: 1.2, do: 1.1, nen: 'me-thuy-2' },
    { ten: 'Long Cung Ngầm', cot: 13, hang: 15, thung: 0.2, gio: 1.4, do: 1.3, nen: 'me-thuy-3' },
  ],
};
/** Kiểu mê cung của một màn Tranh Đoạt. */
export const kieuMe = (phe: Phe | null, loai: number): KieuMe =>
  phe === null ? ME_CHUNG : ME_LOAI[phe][Math.max(0, Math.min(ME_LOAI[phe].length - 1, loai - 1))]!;

function batDauMe(the: The, now: number, rand: () => number, ra: Su[], choi: NguoiChoi[], phe: Phe | null = null, loai = 1) {
  const nh = the.nhip;
  const L = kieuMe(phe, loai);
  const me = taoMeDoiXung(L.cot, L.hang, rand, L.thung);
  // Riêng một tông: một lối vào giữa mép dưới, Cửa Ra giữa mép trên. Hai tông: hai cửa góc dưới như cũ.
  let cua: { vao: Record<Phe, number>; ra: number };
  if (phe === null) cua = cuaMe(me);
  else {
    const giua = Math.floor(me.cot / 2);
    const v = (me.hang - 1) * me.cot + giua;
    me.tuong[v]! &= ~BIT.xuong;
    me.tuong[giua]! &= ~BIT.len;
    cua = { vao: { son: v, thuy: v }, ra: giua };
  }
  const ds = choi.filter((n) => phe === null || n.phe === phe).sort((a, b) => b.lanCuoi - a.lanCuoi);
  const tong = Math.max(2, Math.round((doTong(ds.length) * L.do) / 2) * 2);
  const lau = Math.round(nh.me * L.gio);
  const pha: PhaMe = {
    k: 'me',
    den: now + lau,
    tong: lau,
    me,
    vao: cua.vao,
    phe,
    loai: phe === null ? 1 : ME_LOAI[phe].indexOf(L) + 1,
    ra: cua.ra,
    vt: new Map(),
    do: [],
    idKe: 1,
    conRoi: tong,
    quaTich: 0,
    giaHan: 0,
    roiKe: now,
    ruongLuc: now + lau * 0.4,
    daRuong: false,
    thoat: [],
  };
  sang(the, pha, ra);
  for (const n of ds) vaoMe(the, pha, n, now);
  // Một cặp rơi ngay, còn lại rơi rải rác trong 70% đầu lượt.
  roiDo(the, pha, rand);
  henRoi(pha, now, rand);
  ghiSuThi(the, now, ra, 'meMo', {});
  ra.push({
    k: 'doc',
    chu: `Tranh Đoạt Bảo Vật${phe !== null ? ` ${PHE[phe].ten}, mê cung ${pha.loai} ${L.ten}` : ''}! Gõ lên, xuống, trái, phải, mỗi lệnh một bước. Giành bảo vật, ai ra Cửa Ra trước được thưởng thêm!`,
  });
}

function henRoi(pha: PhaMe, now: number, rand: () => number) {
  const conLai = Math.max(1, pha.den - pha.tong * 0.3 - now);
  pha.roiKe = now + (conLai / Math.max(1, pha.conRoi / 2)) * (0.5 + rand());
}

/** Địa Cung (mê cung cấp 2) chỉ dành cho đệ tử; khách phải vượt Ải Nhập Môn trước. */
function vaoMe(_the: The, pha: PhaMe, n: NguoiChoi, now: number) {
  if (n.phe === null || pha.vt.has(n.user) || pha.vt.size >= ME_TOI_DA) return;
  // Tranh Đoạt riêng một tông: đệ tử tông kia không xuống được.
  if (pha.phe !== null && n.phe !== pha.phe) return;
  pha.vt.set(n.user, { o: pha.vao[n.phe], luc: now - BUOC_CACH, tui: [], thoat: false });
}

/** Thả một CẶP bảo vật vào hai ô soi gương nhau (cùng phẩm, cùng loại, cùng chỉ số): xa cửa vào (ít
 *  nhất 4 bước), không nằm cột giữa, không đè Cửa Ra, không đè món khác — hai phe luôn bằng nhau. */
function roiDo(the: The, pha: PhaMe, rand: () => number, qua = false, may = 0) {
  // Đồ do quà rơi thêm: không trừ vào số đồ định sẵn của màn; `may` nâng độ hiếm.
  if (!qua && pha.conRoi < 2) return;
  const me = pha.me;
  const co = new Set(pha.do.map((d) => d.o));
  const giua = Math.floor(me.cot / 2);
  for (let thu = 0; thu < 40; thu++) {
    // Đồ chỉ rơi ở nửa TRÊN màn hình (các hàng trên cùng, phía Cửa Ra) — cả phòng thấy rõ mà tranh nhau.
    const o = Math.floor(rand() * me.cot * Math.min(me.hang, ME_HANG_ROI));
    const g = oGuong(me, o);
    if (o % me.cot === giua || co.has(o) || co.has(g)) continue;
    if (khoang(me, o, pha.vao.son) < 4 || khoang(me, o, pha.vao.thuy) < 4) continue;
    const vat = taoDo(chon(O_TRANG_BI, rand), bocPham(rand, Math.max(may, doGan(me, o))), rand, the.khoDo);
    pha.do.push({ id: pha.idKe++, o, loai: 'tb', vat });
    pha.do.push({ id: pha.idKe++, o: g, loai: 'tb', vat: { ...vat } });
    if (!qua) pha.conRoi -= 2;
    return;
  }
}

function diMe(the: The, pha: PhaMe, now: number, rand: () => number, ra: Su[]) {
  if (now >= pha.roiKe && pha.conRoi > 0) {
    if (pha.do.filter((d) => d.loai === 'tb').length <= DO_TREN_SAN - 2) roiDo(the, pha, rand);
    henRoi(pha, now, rand);
  }
  // Linh thạch rải khắp mê cung (xa hai cửa vào ít nhất 3 bước, không đè Cửa Ra).
  roiThach(
    pha,
    THACH_ME,
    () => Array.from({ length: pha.me.cot * pha.me.hang }, (_, o) => o).filter((o) => o !== pha.ra && khoang(pha.me, o, pha.vao.son) >= 3 && khoang(pha.me, o, pha.vao.thuy) >= 3),
    now,
    rand,
  );
  if (!pha.daRuong && now >= pha.ruongLuc) {
    pha.daRuong = true;
    // Rương Đồng cũng hiện ở nửa trên: cột giữa, hàng thứ ba (hai phe cách đều).
    const g = pha.me.hang > ME_HANG_ROI ? Math.floor(pha.me.cot / 2) + pha.me.cot * 2 : oGiua(pha.me);
    pha.do = pha.do.filter((d) => d.o !== g);
    pha.do.push({ id: pha.idKe++, o: g, loai: 'ruong' });
    ghiSuThi(the, now, ra, 'meRuong', {});
    ra.push({ k: 'doc', chu: 'Rương Đồng hiện giữa mê cung! Ai tới trước được đồ quý!' });
  }
}

function buocMe(the: The, pha: PhaMe, n: NguoiChoi, h: Huong, now: number, rand: () => number, ra: Su[]) {
  const v = pha.vt.get(n.user);
  if (v === undefined || v.thoat || now - v.luc < BUOC_CACH) return;
  v.luc = now;
  const toi = ke(pha.me, v.o, h);
  if (toi === null) return;
  v.o = toi;
  const i = pha.do.findIndex((d) => d.o === toi);
  if (i >= 0) {
    const d = pha.do.splice(i, 1)[0]!;
    if (d.loai === 'thach') {
      nhatThach(the, n.user, toi, d.so, ra);
      if (toi === pha.ra) thoatMe(the, pha, n, v, now, ra);
      return;
    }
    const ruong = d.loai === 'ruong';
    // Rương: chắc chắn Địa phẩm, một phần ba là Thiên phẩm.
    const vat = d.loai === 'tb' ? d.vat : taoDo(chon(O_TRANG_BI, rand), rand() < 0.35 ? 4 : 3, rand, the.khoDo);
    if (n.phe !== null) vat.tg = n.phe;
    if (n.gioi !== null) vat.gi = n.gioi;
    v.tui.push(vat);
    const luc = lucChien(n);
    ra.push({ k: 'nhat', user: n.user, o: toi, vat, lk: 0, mac: false, ruong, nguon: 'me', lucTruoc: luc, lucSau: luc });
    if (ruong || vat.pham >= 3) {
      ghiSuThi(the, now, ra, ruong ? 'meRuongMo' : 'meNhat', { ten: n.ten, vat: `${tenDo(vat)} (${PHAM[vat.pham]!.ten})` }, n.phe ?? undefined);
    }
  }
  if (toi === pha.ra) thoatMe(the, pha, n, v, now, ra);
}

function thoatMe(the: The, pha: PhaMe, n: NguoiChoi, v: ViTriMe, now: number, ra: Su[]) {
  v.thoat = true;
  pha.thoat.push(n.user);
  const thu = pha.thoat.length;
  const lucTruoc = lucChien(n);
  let lk = 0;
  for (const vat of v.tui) lk += nhanDo(the, n, vat, now, ra).lk;
  lk += congLk(the, n, THUONG_THOAT[thu - 1] ?? 5, now, ra);
  if (n.phe !== null) the.linhMach[n.phe] += 2;
  ra.push({ k: 'thoat', user: n.user, thu, vat: v.tui.slice(), lk, lucTruoc, lucSau: lucChien(n) });
  ghiSuThi(the, now, ra, 'meThoat', { ten: n.ten, thu, so: v.tui.length }, n.phe ?? undefined);
}

function ketMe(the: The, pha: PhaMe, now: number, ra: Su[]) {
  // Mê cung có nhiều ngả, kiểu gì cũng ra được: hết giờ còn bên trong vẫn giữ đồ đã nhặt (chỉ không
  // có thứ hạng và thưởng thoát ra).
  let mat = 0;
  for (const [user, v] of pha.vt) {
    if (v.thoat || v.tui.length === 0) continue;
    const n = the.nguoi.get(user);
    if (n === undefined) continue;
    mat++;
    for (const vat of v.tui) nhanDo(the, n, vat, now, ra);
  }
  const thoat = pha.thoat.slice(0, 5).map((user) => {
    const n = the.nguoi.get(user);
    const v = pha.vt.get(user);
    const luc = n === undefined ? 0 : lucChien(n);
    return { user, ten: n?.ten ?? user, so: v?.tui.length ?? 0, lucTruoc: luc, lucSau: luc };
  });
  ghiSuThi(the, now, ra, thoat.length > 0 ? 'meDong' : 'meVang', { ten: thoat[0]?.ten ?? '', so: pha.thoat.length });
  sang(the, { k: 'me-ket', den: now + the.nhip.meKet, tong: the.nhip.meKet, thoat, mat }, ra);
  ra.push({
    k: 'doc',
    chu:
      thoat.length > 0
        ? `Tranh Đoạt Bảo Vật kết thúc! ${thoat[0]!.ten} ra cửa đầu tiên.`
        : 'Tranh Đoạt Bảo Vật kết thúc! Ai giành được gì cũng mang về được.',
  });
}

const THUONG_NHANH = [6, 4, 2];

/** Khảo hạch Tàng Kinh — câu đố A/B/C trong màn Đan Các · Tàng Kinh Các (chuyển từ tu luyện sang). */
export interface KhaoHach {
  /** true: đang hỏi; false: đang công bố đáp án. */
  hoi: boolean;
  so: number;
  cau: CauHoi;
  den: number;
  tra: Map<string, number>;
  /** Người đáp đúng theo thứ tự nhanh. */
  dung: string[];
}
/** Đáp đúng: +KH_LK linh khí, +KH_THACH linh thạch; ba người nhanh nhất thêm THUONG_NHANH linh khí. */
export const KH_LK = 10;
export const KH_THACH = 2;
const KH_HOI = 15_000;
const KH_DAP = 5_000;

function buocKhaoHach(the: The, pha: Extract<Pha, { k: 'tt' }>, now: number, rand: () => number, ra: Su[]) {
  const kh = pha.kh;
  // Câu đầu mở sau 3 giây; đủ thời gian còn lại mới mở câu mới.
  if (kh === null) {
    if (now - (pha.den - pha.tong) < 3_000 || pha.den - now < KH_HOI + KH_DAP) return;
    moKhaoHach(the, pha, 1, now, rand, ra);
    return;
  }
  if (now < kh.den) return;
  if (kh.hoi) {
    // Hết giờ hỏi: chấm, công bố đáp án.
    kh.dung.forEach((u, i) => {
      const n = the.nguoi.get(u);
      if (n === undefined) return;
      n.dung++;
      const lk = congLk(the, n, KH_LK + (THUONG_NHANH[i] ?? 0), now, ra, true);
      n.tinChi += KH_THACH;
      if (i < 30) ra.push({ k: 'dung', user: u, lk });
    });
    the.ban = true;
    kh.hoi = false;
    kh.den = now + KH_DAP;
    const ten = kh.dung.slice(0, 1).map((u) => the.nguoi.get(u)?.ten ?? u)[0];
    ra.push({ k: 'doc', chu: `Đáp án ${CHU_ABC[kh.cau.dung]}, ${kh.cau.dap[kh.cau.dung]}.${ten !== undefined ? ` ${ten} nhanh nhất!` : ''}` });
    return;
  }
  if (pha.den - now < KH_HOI + KH_DAP) return;
  moKhaoHach(the, pha, kh.so + 1, now, rand, ra);
}

function moKhaoHach(the: The, pha: Extract<Pha, { k: 'tt' }>, so: number, now: number, rand: () => number, ra: Su[]) {
  const cau = bocCau(the.daHoi, rand);
  pha.kh = { hoi: true, so, cau, den: now + KH_HOI, tra: new Map(), dung: [] };
  ra.push({ k: 'doc', chu: `Khảo hạch Tàng Kinh, câu ${so}. ${cau.hoi.replace(/…$/, ' gì')} A, ${cau.dap[0]}. B, ${cau.dap[1]}. C, ${cau.dap[2]}.` })
}

function ketCau(the: The, pha: Extract<Pha, { k: 'hoi' }>, now: number, ra: Su[]) {
  const dung = new Set(pha.dungThuTu);
  for (const [user] of pha.tra) {
    const n = the.nguoi.get(user);
    // Hộ Vệ: trả lời sai không mất chuỗi.
    if (n !== undefined && !dung.has(user) && n.canCo !== 've') n.chuoi = 0;
  }
  // Tụ Linh Trận: người tu luyện liên kết với nhau — mỗi người đúng được thêm 1 linh khí cho mỗi đồng
  // môn cùng đúng câu này; phe chưa đủ 6 đệ tử thì mỗi trưởng lão NPC ngồi trận truyền thêm 0,5. Tối đa +5.
  const dungPhe: Record<Phe, number> = { son: 0, thuy: 0 };
  for (const u of pha.dungThuTu) {
    const p = the.nguoi.get(u)?.phe;
    if (p !== null && p !== undefined) dungPhe[p]++;
  }
  const npc: Record<Phe, number> = { son: soNpc(the, 'son', now), thuy: soNpc(the, 'thuy', now) };
  // Trận phe càng cao cấp: trần cộng hưởng càng lớn, và mỗi người đúng được thêm linh thạch.
  const tran = { son: capTran(the, 'son'), thuy: capTran(the, 'thuy') };
  const lienKet = (p: Phe | null) => (p === null ? 0 : Math.min(4 + tran[p].cap, Math.round(dungPhe[p] - 1 + 0.5 * npc[p])));
  for (const p of ['son', 'thuy'] as const) {
    if (dungPhe[p] === 0) continue;
    ra.push({ k: 'cong-huong', phe: p, so: dungPhe[p], thach: tran[p].thach });
    if (dungPhe[p] >= 3) ghiSuThi(the, now, ra, 'congHuong', { so: dungPhe[p], phe: PHE[p].tenNgan }, p);
  }
  const nhanh: string[] = [];
  pha.dungThuTu.forEach((user, i) => {
    const n = the.nguoi.get(user);
    if (n === undefined) return;
    n.chuoi++;
    n.dung++;
    const chuoi = n.chuoi >= 3 ? Math.min(6, 2 * (n.chuoi - 2)) : 0;
    const thuongNhanh = (THUONG_NHANH[i] ?? 0) * (n.canCo === 'tuong' ? 1.5 : 1);
    const them = congLk(the, n, (10 + thuongNhanh + chuoi + lienKet(n.phe)) * (pha.thi > 0 ? 2 : 1), now, ra, true);
    // Tu luyện bồi đắp Linh Mạch phe (Phá Quân +2); trận phe sinh linh thạch cho người đáp đúng.
    if (n.phe !== null) {
      n.tinChi += tran[n.phe].thach;
      the.linhMach[n.phe] += n.canCo === 'quan' ? 2 : 1;
      the.ban = true;
    }
    if (i < 3) nhanh.push(n.ten);
    if (i < 30) ra.push({ k: 'dung', user, lk: them });
  });
  if (the.phucLoc > 0) the.phucLoc--;
  if (the.phucLoc === 0) the.phucLocTu = null;
  sang(
    the,
    {
      k: 'dap',
      cau: pha.cau,
      so: pha.so,
      den: now + the.nhip.dap,
      tong: the.nhip.dap,
      soTra: pha.tra.size,
      soDung: pha.dungThuTu.length,
      nhanh,
      thi: pha.thi,
    },
    ra,
  );
  const chu = CHU_ABC[pha.cau.dung];
  ra.push({
    k: 'doc',
    chu:
      nhanh.length > 0
        ? `Đáp án ${chu}, ${pha.cau.dap[pha.cau.dung]}. ${nhanh[0]} nhanh nhất!`
        : `Đáp án ${chu}, ${pha.cau.dap[pha.cau.dung]}.`,
  });
}

/** Số hộ pháp cần để qua kiếp khi trả lời sai: theo cảnh giới, nhưng không quá số đồng đạo đang có
 *  mặt (trừ người độ kiếp), ít nhất 1 — phòng vắng vẫn cứu được nhau. */
export function hoPhapCan(the: The, canh: number, now: number): number {
  const goc = CANH_GIOI[canh]?.hoPhap ?? 0;
  if (goc === 0) return 0;
  return Math.min(goc, Math.max(1, dangChoi(the, now).length - 1));
}

/** Số hộ pháp khi độ kiếp: Y Sư tính 2. */
export function soHoPhap(the: The, ho: ReadonlySet<string>): number {
  let so = 0;
  for (const u of ho) so += the.nguoi.get(u)?.canCo === 'y' ? 2 : 1;
  return so;
}

/** Mỗi đồng đạo hộ pháp nhận phần riêng: thường +linh khí, đôi khi cơ duyên +linh thạch; kiếp qua thì gấp đôi. */
function thuongHoPhap(the: The, pha: Extract<Pha, { k: 'kiep' }>, qua: boolean, now: number, rand: () => number, ra: Su[]) {
  const boi = qua ? 2 : 1;
  for (const u of pha.ho) {
    const h = the.nguoi.get(u);
    if (h === undefined) continue;
    if (rand() < HO_CO_DUYEN) {
      h.tinChi += HO_THACH * boi;
      the.ban = true;
      ra.push({ k: 'hd', user: h.user, loai: 'co-duyen', chu: `hộ pháp · cơ duyên +${HO_THACH * boi} linh thạch`, hiem: true });
    } else {
      const lk = congLk(the, h, HO_LK * boi, now, ra);
      ra.push({ k: 'hd', user: h.user, loai: 'van-cong', chu: `hộ pháp · +${lk} linh khí`, hiem: false });
    }
  }
}

function ketKiep(the: The, pha: Extract<Pha, { k: 'kiep' }>, now: number, ra: Su[], rand: () => number = Math.random) {
  let rot = false;
  const n = the.nguoi.get(pha.user);
  const can = hoPhapCan(the, pha.canh, now);
  const soHo = soHoPhap(the, pha.ho);
  // `nhoHo`: đủ hộ pháp, cả phòng che sét (Phúc Lộc). Không đủ thì tự vượt theo vận.
  const nhoHo = soHo >= can;
  const dung = !nhoHo && rand() < KIEP_TU + KIEP_TU_HO * Math.min(1, soHo / Math.max(1, can));
  const qua = dung || nhoHo;
  if (n !== undefined) {
    n.choKiep = false;
    if (qua) {
      n.canh = pha.canh;
      n.baoDu = false;
      n.tienLuc = now;
      the.ban = true;
      ra.push(suDotPha(the, n, now));
      if (dung) {
        ghiSuThi(the, now, ra, 'quaKiep', { ten: n.ten, canh: tenCanh(n.canh) }, n.phe ?? undefined);
      } else {
        ghiSuThi(the, now, ra, 'quaKiepNhoHo', { ten: n.ten, canh: tenCanh(n.canh), so: pha.ho.size }, n.phe ?? undefined);
        the.phucLoc = 2;
        the.phucLocTu = n.ten;
      }
    } else {
      if (n.canh > 0 && rand() < KIEP_ROT) {
        rot = true;
        n.canh--;
        n.lk = CANH_GIOI[n.canh]!.can;
        n.baoDu = false;
      }
      n.kiepLai = now + KIEP_LAI;
      the.ban = true;
      ghiSuThi(the, now, ra, 'ngaKiep', { ten: n.ten }, n.phe ?? undefined);
    }
    ra.push({ k: 'set', user: n.user, qua });
  }
  thuongHoPhap(the, pha, qua, now, rand, ra);
  sang(
    the,
    {
      k: 'kiep-ket',
      user: pha.user,
      ten: pha.ten,
      canh: pha.canh,
      cau: pha.cau,
      chon: pha.chon,
      qua,
      nhoHo,
      rot,
      soHo: soHoPhap(the, pha.ho),
      den: now + the.nhip.kiepKet,
      tong: the.nhip.kiepKet,
    },
    ra,
  );
  ra.push({
    k: 'doc',
    chu: qua
      ? dung
        ? `${pha.ten} một mình chịu sét, vượt kiếp thành ${tenCanh(pha.canh)}!`
        : `${pha.ho.size} đồng đạo che sét, ${pha.ten} thành ${tenCanh(pha.canh)}! Cả phòng nhân đôi linh khí hai câu!`
      : rot
        ? `${pha.ten} ngã kiếp, đạo cơ tổn hại, rớt một cảnh giới!`
        : `${pha.ten} ngã kiếp, may còn giữ được đạo cơ. Ba phút nữa thử lại nhé!`,
  });
}

function ketLu(the: The, pha: Extract<Pha, { k: 'lu' }>, now: number, ra: Su[], rand: () => number = Math.random) {
  // Trận dài: khoảng nghỉ tới trận sau tính từ lúc trận này xong, để còn giờ tu luyện.
  the.luKe = Math.max(the.luKe, now + the.nhip.luCach);
  const thang: Phe | null = pha.son > pha.thuy ? 'son' : pha.thuy > pha.son ? 'thuy' : null;
  // Sĩ khí tán tu: thưởng tu vi (linh khí) + linh thạch của đệ tử hai tông đã tham chiến nhân hệ số này.
  const hsKich = heSoKich(pha);
  for (const [user, phe] of pha.nguoi) {
    const n = the.nguoi.get(user);
    if (n !== undefined) congLk(the, n, Math.round((thang === null ? 8 : phe === thang ? 15 : 5) * hsKich), now, ra);
  }
  const buocMuc = pha.dai ? 2 : 1;
  if (thang !== null) {
    the.muc = Math.max(-MUC_TOI_DA, Math.min(MUC_TOI_DA, the.muc + (thang === 'thuy' ? buocMuc : -buocMuc)));
  }
  ghiSuThi(the, now, ra, thang === 'son' ? 'luSon' : thang === 'thuy' ? 'luThuy' : 'luHoa', {}, thang ?? undefined);
  // Linh Mạch: thắng giữ được đất, mạch dày thêm; thua cũng còn chút.
  if (thang !== null) {
    the.linhMach[thang] += 15;
    the.linhMach[pheKia(thang)] += 5;
    the.ban = true;
  }
  // Ba người công trạng cao nhất mỗi phe được thêm linh khí.
  for (const phe of ['son', 'thuy'] as const) {
    const top = [...pha.cong.entries()].filter(([u]) => pha.nguoi.get(u) === phe).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [u] of top) {
      const n = the.nguoi.get(u);
      if (n !== undefined) congLk(the, n, 10, now, ra);
    }
  }
  // CHIẾN LỢI PHẨM VÀ CHIẾN THƯƠNG (ban-do.md §3h) — chỉ người ĐÃ TƯƠNG TÁC trong trận (bình luận, tim, quà):
  // được linh thạch (thắng nhiều hơn), nhưng mang chiến thương: lực chiến giảm TON_LAU (thua nặng hơn);
  // có xác suất nhận một vật phẩm hiếm (công trạng đầu phe và người hi sinh ×3).
  const kq = (phe: Phe) => (thang === null ? 'hoa' : phe === thang ? 'thang' : 'thua') as 'thang' | 'thua' | 'hoa';
  const k2 = pha.dai ? 2 : 1;
  const thuong: Record<Phe, number> = {
    son: Math.round(THUONG_PK[kq('son')] * k2 * hsKich),
    thuy: Math.round(THUONG_PK[kq('thuy')] * k2 * hsKich),
  };
  const ton: Record<Phe, number> = { son: TON_PK[kq('son')], thuy: TON_PK[kq('thuy')] };
  const hiem: { ten: string; vat: string; phe: Phe }[] = [];
  const dauPhe = new Set<string>();
  for (const phe of ['son', 'thuy'] as const) {
    const top = [...pha.cong.entries()].filter(([u]) => pha.nguoi.get(u) === phe).sort((a, b) => b[1] - a[1])[0];
    if (top !== undefined) dauPhe.add(top[0]);
  }
  for (const [user, phe] of pha.nguoi) {
    const n = the.nguoi.get(user);
    if (n === undefined) continue;
    n.tinChi += thuong[phe];
    const he = dauPhe.has(user) || pha.hiSinh.includes(user) ? 3 : 1;
    if (rand() < HIEM_PK[kq(phe)] * he) {
      const vat = taoDo(chon(O_TRANG_BI, rand), bocPham(rand, 0.85), rand, the.khoDo);
      const lucTruoc = lucChien(n);
      const { mac, lk } = nhanDo(the, n, vat, now, ra);
      ra.push({ k: 'nhat', user, o: -1, vat, lk, mac, ruong: false, nguon: 'pk', lucTruoc, lucSau: lucChien(n) });
      hiem.push({ ten: n.ten, vat: `${tenDo(vat)} (${PHAM[vat.pham]!.ten})`, phe });
    }
    // Chiến thương tính sau khi nhận đồ: lực chiến hiện trên bảng là đã trừ.
    n.thuong = Math.min(n.thuong, ton[phe]);
    n.thuongDen = now + TON_LAU;
  }
  the.ban = true;
  sang(
    the,
    {
      k: 'lu-ket',
      thang,
      son: pha.son,
      thuy: pha.thuy,
      den: now + the.nhip.luKet,
      tong: the.nhip.luKet,
      dai: pha.dai,
      cong: pha.cong,
      thuong,
      ton,
      hiem,
    },
    ra,
  );
  ra.push({
    k: 'doc',
    chu: thang === null ? 'Hòa! Nước và núi giằng co.' : `${PHE[thang].ten} thắng trận lũ này!`,
  });
}

/** Nhận một món đồ (Địa Cung hoặc yêu tinh rơi): mặc nếu tốt hơn và đủ cảnh giới, không thì luyện hoá. */
function nhanDo(the: The, n: NguoiChoi, vat: TrangBi, now: number, ra: Su[]): { mac: boolean; lk: number } {
  // Món về tay ai thì mang tên, hình theo tông + giới người đó (sửa tại chỗ để lời báo phía sau đọc đúng tên).
  if (n.phe !== null) vat.tg = n.phe;
  if (n.gioi !== null) vat.gi = n.gioi;
  if (nenMac(n.canh, n.tb, vat)) {
    n.tb[vat.o] = vat;
    the.ban = true;
    return { mac: true, lk: 0 };
  }
  return { mac: false, lk: congLk(the, n, lkLuyenHoa(vat), now, ra) };
}

function phanDon(the: The, pha: Extract<Pha, { k: 'yeu' }>, now: number, rand: () => number, ra: Su[]) {
  pha.phanKe = now + PHAN_CACH + rand() * 3_000;
  // Nhắm người vừa ra tay trong 10 giây qua, chưa choáng.
  const ds: NguoiChoi[] = [];
  for (const u of pha.dmg.keys()) {
    const n = the.nguoi.get(u);
    if (n === undefined || n.phe === null || now - n.danhLuc >= 10_000 || (pha.choang.get(u) ?? 0) > now) continue;
    if (pha.nga.has(u) || pha.roi.has(u)) continue;
    // Phe vừa kết trận Hồi: miễn phản đòn vài giây.
    if (pha.tran.hl[n.phe].ho > now) continue;
    ds.push(n);
  }
  if (ds.length === 0) return;
  for (let i = ds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ds[i], ds[j]] = [ds[j]!, ds[i]!];
  }
  const nham = ds.slice(0, Math.min(6, Math.max(1, Math.ceil(ds.length * 0.3))));
  const trung: string[] = [];
  const doDuoc: string[] = [];
  for (const n of nham) {
    const doThem =
      (n.canCo === null ? 0 : CO_DO[n.canCo]) +
      (voCua(n).he === null ? 0 : HE_CP[voCua(n).he!].do * voCua(n).tang) +
      (n.thuDen > now ? 0.15 : 0) +
      (n.phe !== null && pha.tran.hl[n.phe].thu > now ? 0.3 : 0);
    if (rand() < Math.max(0, Math.min(PHAN_DO_TOI_DA + Math.max(0, doThem), congThu(n).thu / (congThu(n).thu + 600) + doThem))) doDuoc.push(n.user);
    else if (n.dan.hon > 0) {
      // Hồi Hồn Đan: đỡ trọn một lần choáng.
      n.dan.hon--;
      doDuoc.push(n.user);
    } else {
      trung.push(n.user);
      matMau(pha, n.user, PHAN_MAU, now, ra);
      ra.push({ k: 'mat-mau', user: n.user, dmg: PHAN_MAU });
      // Phòng vắng (1–2 người ra tay): choáng ngắn một nửa, kẻo cả trận chỉ đứng nhìn.
      pha.choang.set(n.user, now + (ds.length <= 2 ? PHAN_CHOANG / 2 : PHAN_CHOANG));
    }
  }
  // Mỗi lần phản đòn một chiêu, luân phiên trong bộ chiêu của yêu tinh.
  const ds3 = YEU[pha.yeu].chieuDs;
  const chieu = ds3[pha.soPhan++ % ds3.length] ?? YEU[pha.yeu].chieu;
  pha.phanCuoi = { luc: now, trung, doDuoc, chieu };
  ra.push({ k: 'phan-don', trung, doDuoc, chieu });
}

/** Rút thăm người nhận đồ rơi của yêu tinh (xem YEU_MOC). Trọng số người ra tay: 1 + 2×√tim + 4×√xu. */
export function chonNhanDo(the: The, pha: Extract<Pha, { k: 'yeu' }>, now: number, rand: () => number): NguoiChoi | null {
  const danh: NguoiChoi[] = [];
  for (const u of pha.dmg.keys()) {
    const n = the.nguoi.get(u);
    if (n !== undefined && n.phe !== null) danh.push(n);
  }
  const ngoi = dangChoi(the, now).filter((n) => n.phe !== null && !pha.tuongTac.has(n.user) && !pha.dmg.has(n.user));
  if (ngoi.length > 0 && (danh.length === 0 || rand() < TI_LE_NGOI_XEM)) return chon(ngoi, rand);
  if (danh.length === 0) return null;
  const w = danh.map((n) => 1 + 2 * Math.sqrt(pha.tim.get(n.user) ?? 0) + 4 * Math.sqrt(pha.qua.get(n.user) ?? 0));
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < danh.length; i++) {
    r -= w[i]!;
    if (r < 0) return danh[i]!;
  }
  return danh[danh.length - 1]!;
}

function yeuRoi(the: The, pha: Extract<Pha, { k: 'yeu' }>, n: NguoiChoi, gan: number, now: number, rand: () => number, ra: Su[]) {
  const vat = taoDo(chon(O_TRANG_BI, rand), bocPham(rand, Math.min(1, gan + (pha.dai ? 0.4 : 0))), rand, the.khoDo);
  const lucTruoc = lucChien(n);
  const { mac, lk } = nhanDo(the, n, vat, now, ra);
  ra.push({ k: 'nhat', user: n.user, o: -1, vat, lk, mac, ruong: false, nguon: 'yeu', lucTruoc, lucSau: lucChien(n) });
  if (vat.pham >= 2) {
    ghiSuThi(the, now, ra, 'yeuRoi', { yeu: YEU[pha.yeu].ten, ten: n.ten, vat: `${tenDo(vat)} (${PHAM[vat.pham]!.ten})` }, n.phe ?? undefined);
  }
}

function trao(the: The, n: NguoiChoi, now: number, rand: () => number, ra: Su[]) {
  // Kinh Thư §4: thần phe nào ban linh vật phe ấy. Chưa có phe thì không thần nào ban.
  const con = LINH_VAT.filter((l) => l.phe === n.phe && !n.linhVat.includes(l.id));
  if (con.length === 0) {
    congLk(the, n, 50, now, ra);
    return;
  }
  const lv = chon(con, rand);
  n.linhVat.push(lv.id);
  the.ban = true;
  ghiSuThi(the, now, ra, lv.phe === 'son' ? 'linhVatSon' : 'linhVatThuy', { ten: n.ten, lv: `${lv.hinh} ${lv.ten}` }, lv.phe);
}

function ketYeu(
  the: The,
  pha: Extract<Pha, { k: 'yeu' }>,
  now: number,
  rand: () => number,
  ra: Su[],
  ketLieu: string | null,
  doSat = false,
) {
  the.yeuKe = Math.max(the.yeuKe, now + the.nhip.yeuCach);
  const thang = pha.mau <= 0;
  let pheHa: Phe | null = null;
  let thuong: { thach: number; lk: number; linhMach: number } | null = null;
  const y = YEU[pha.yeu];
  let top: string | null = null;
  let max = 0;
  for (const [u, d] of pha.dmg) {
    if (d > max) {
      max = d;
      top = u;
    }
  }
  for (const u of pha.dmg.keys()) {
    const n = the.nguoi.get(u);
    if (n !== undefined) congLk(the, n, thang ? (pha.dai ? 40 : 20) : 5, now, ra);
  }
  const nKet = ketLieu === null ? undefined : the.nguoi.get(ketLieu);
  const nTop = top === null ? undefined : the.nguoi.get(top);
  if (thang) {
    if (nKet !== undefined) {
      ghiSuThi(the, now, ra, 'yeuChet', { ten: nKet.ten, yeu: y.ten }, nKet.phe ?? undefined);
      congLk(the, nKet, 30, now, ra);
      trao(the, nKet, now, rand, ra);
      yeuRoi(the, pha, nKet, 0.8, now, rand, ra);
    }
    // Yêu tinh gục: rơi thêm một món quý cho người được rút thăm (phúc duyên).
    const may = chonNhanDo(the, pha, now, rand);
    if (may !== null) yeuRoi(the, pha, may, 0.8, now, rand, ra);
    // Đại Yêu: ba người sát thương cao nhất đều nhận; yêu thường: chỉ người cao nhất.
    const topDs = [...pha.dmg.entries()].sort((a, b) => b[1] - a[1]).slice(0, pha.dai ? 3 : 1);
    for (const [u] of topDs) {
      const n = the.nguoi.get(u);
      if (n === undefined || n === nKet) continue;
      congLk(the, n, 30, now, ra);
      trao(the, n, now, rand, ra);
    }
    // Linh Mạch: hạ yêu tinh, hai phe chia theo sát thương (mỗi phe ít nhất 5).
    const tongDmg = Math.max(1, pha.dmgPhe.son + pha.dmgPhe.thuy);
    for (const p of ['son', 'thuy'] as const) the.linhMach[p] += 5 + Math.round((20 * pha.dmgPhe[p]) / tongDmg);
    the.ban = true;
    const { son, thuy } = pha.dmgPhe;
    if (son !== thuy) the.muc = Math.max(-MUC_TOI_DA, Math.min(MUC_TOI_DA, the.muc + (thuy > son ? 1 : -1)));
    // Thưởng phe hạ yêu tinh — mỗi lượt yêu một lần: phe sát thương cả trận nhiều hơn (bằng nhau thì phe
    // kết liễu). Mỗi đệ tử phe đó đã ra tay nhận linh thạch + linh khí; ba người đánh mạnh nhất phe thêm một
    // rương bảo vật; cả phe thêm Linh Mạch. Đại Yêu gấp đôi.
    pheHa = son > thuy ? 'son' : thuy > son ? 'thuy' : (nKet?.phe ?? null);
    if (pheHa !== null) {
      const k = pha.dai ? 2 : 1;
      const tg = { thach: THUONG_HA_YEU.thach * k, lk: THUONG_HA_YEU.lk * k, linhMach: THUONG_HA_YEU.linhMach * k };
      thuong = tg;
      const phe = pheHa;
      const dsPhe = [...pha.dmg.entries()].filter(([u]) => the.nguoi.get(u)?.phe === phe).sort((a, b) => b[1] - a[1]);
      for (const [u] of dsPhe) {
        const n = the.nguoi.get(u)!;
        n.tinChi += tg.thach;
        congLk(the, n, tg.lk, now, ra);
      }
      for (const [u] of dsPhe.slice(0, 3)) yeuRoi(the, pha, the.nguoi.get(u)!, 0.7, now, rand, ra);
      the.linhMach[phe] += tg.linhMach;
      the.ban = true;
      ghiSuThi(the, now, ra, 'yeuThuong', { phe: PHE[phe].ten, yeu: y.ten, thach: tg.thach }, phe);
    }
  } else {
    ghiSuThi(the, now, ra, doSat ? 'yeuDoSat' : 'yeuChay', { yeu: y.ten });
  }
  sang(
    the,
    {
      k: 'yeu-ket',
      yeu: pha.yeu,
      thang,
      ketLieu: nKet?.ten ?? null,
      top: nTop?.ten ?? null,
      pheHa,
      thuong,
      doSat,
      den: now + the.nhip.yeuKet,
      tong: the.nhip.yeuKet,
    },
    ra,
  );
  ra.push({
    k: 'doc',
    chu: thang
      ? `${y.ten} đã gục! ${nKet ? `${nKet.ten} kết liễu.` : ''}${pheHa !== null && thuong !== null ? ` ${PHE[pheHa].ten} hạ yêu, mỗi đệ tử được ${thuong.thach} linh thạch!` : ''}`
      : doSat
        ? `${y.ten} đồ sát cả đội! Lần sau thả tim hồi máu kịp nhé!`
        : `${y.ten} chạy mất rồi!`,
  });
}

function ketMua(the: The, now: number, ra: Su[]) {
  const thang: Phe | null = the.muc > 0 ? 'thuy' : the.muc < 0 ? 'son' : null;
  if (thang !== null) {
    the.muaThang[thang]++;
    the.ban = true;
    for (const n of dangChoi(the, now)) if (n.phe === thang) congLk(the, n, 30, now, ra);
  }
  ghiSuThi(the, now, ra, thang === 'son' ? 'muaSon' : thang === 'thuy' ? 'muaThuy' : 'muaHoa', { nam: the.nam }, thang ?? undefined);
  sang(the, { k: 'mua-ket', thang, den: now + the.nhip.muaKet, tong: the.nhip.muaKet }, ra);
  the.muc = 0;
  ra.push({
    k: 'doc',
    chu:
      thang === null
        ? `Hết năm thứ ${the.nam}, hai phe hòa nhau!`
        : `Hết năm thứ ${the.nam}! ${PHE[thang].ten} thắng mùa lũ!`,
  });
  the.nam++;
}

// ---------- Đọc cho lớp vẽ và MC ----------

export function bangTuVi(the: The, n: number): NguoiChoi[] {
  return [...the.nguoi.values()]
    .filter((x) => x.phienNay && x.phe !== null)
    .sort((a, b) => b.canh - a.canh || b.lk - a.lk)
    .slice(0, n);
}

export function bangHuong(the: The, n: number): NguoiChoi[] {
  return [...the.nguoi.values()]
    .filter((x) => x.huong > 0)
    .sort((a, b) => b.huong - a.huong)
    .slice(0, n);
}

/** Sự kiện lớn kế tiếp và còn bao lâu — cho đồng hồ trên đầu màn. */
export function suKienKe(the: The, now: number): { ten: string; con: number; dacBiet: boolean } {
  // Sự kiện theo lịch báo trước 15 phút, đè lên sự kiện thường: đó là cái hẹn giữ người xem ở lại.
  const lich = lichSapToi(the, now, 1)[0];
  if (lich !== undefined && lich.luc - now <= BAO_TRUOC_LICH) {
    return { ten: lich.ten, con: lich.luc - now, dacBiet: true };
  }
  const ds = [
    { ten: 'Mùa Lũ', luc: the.luKe },
    { ten: 'Yêu Tinh', luc: the.yeuKe },
    { ten: 'Tổng kết năm', luc: the.muaKe },
    { ten: 'Tranh Đoạt Bảo Vật', luc: the.meKe },
    { ten: 'Thử Thách Nhập Môn', luc: the.nmKe },
  ].sort((a, b) => a.luc - b.luc);
  const ke = ds[0]!;
  return { ten: ke.ten, con: Math.max(0, ke.luc - now), dacBiet: false };
}

const BAO_TRUOC_LICH = 15 * PHUT;

/** Mỗi màn là một hồi của cùng một câu chuyện (Kinh Thư §13) — gửi cho MC để dẫn cho liền mạch. */
const MACH_TRUYEN: Record<Pha['k'], string> = {
  cho: 'Nghỉ giữa hai hồi. Linh khí và Linh Mạch vừa tích sẽ dùng cho trận tới.',
  hoi: 'Hồi Nghe Ngọc Phả: đáp đúng thì được linh khí và bồi Linh Mạch cho phe — Linh Mạch dùng để kết trận pháp khi chiến.',
  dap: 'Vừa xong một câu Ngọc Phả. Ai đúng đã bồi thêm Linh Mạch cho phe mình.',
  kiep: 'Hồi Vượt Lôi Kiếp: trời thử người sắp lên cảnh giới; đồng đạo hô "độ" để che sét. Qua kiếp thì lên chức, đổi ghế.',
  'kiep-ket': 'Lôi kiếp vừa xong. Người qua kiếp mạnh lên, sẽ là trụ cột khi yêu tinh hay mùa lũ tới.',
  me: 'Hồi Tranh Đoạt Bảo Vật: nước rút, lò đúc đồng vua Hùng lộ ra. Đồ nhặt được tăng công thủ, dùng khi đánh yêu tinh và Đại Chiến.',
  nm: 'Hồi Ải Nhập Môn: phàm nhân muốn theo tiên lộ phải vượt mê cung. Gõ số một, hai theo Sơn Tông; ba, bốn theo Thủy Tông, rồi lên, xuống, trái, phải tới đúng cửa phe mình.',
  'nm-ket': 'Ải Nhập Môn vừa đóng. Ai tới cửa đã thành đệ tử, được ban trang phục; ai chưa kịp thì chờ lần ải sau.',
  tt: 'Hồi Thành Trì Tự Do: chợ chung của hai tông. Đan Các bán đan dược (gõ D1 tới D9), Tàng Kinh Các bán bí kíp công pháp (gõ C1 tới C9), trả bằng linh thạch. Mua trước, mang vào trận sau.',
  'me-ket': 'Tranh Đoạt Bảo Vật vừa xong. Ai nhặt được đồ thì lực chiến đã tăng — sắp có chỗ dùng.',
  yeu: 'Hồi Yêu Tinh Trồi Lên: phong ấn yếu, hai phe gác thù cùng đánh. Hô trận pháp, thả tim hồi khí; hạ được thì rơi đồ, được linh vật và Linh Mạch.',
  'yeu-ket': 'Yêu tinh vừa xong. Hai phe lại là đối thủ: mùa lũ sắp tới.',
  lu: 'Hồi Mùa Lũ (Đại Chiến): trận của đồ đệ hai thần. Đánh cạn trận khí đối phương; cả phe cùng hô hồi, thủ, công, phá để kết trận pháp.',
  'lu-ket': 'Mùa lũ vừa phân thắng bại. Phe thắng dày thêm Linh Mạch; phe thua về tu luyện gỡ lại.',
  'mua-ket': 'Hồi Thiên Đình Ghi Công: hết một năm, phe giữ được đất thắng mùa. Sang năm mới, mọi tu vi và đồ đều còn.',
};

/** Tình hình gửi cho MC AI (`POST /s/boi-canh/:id`). Chỉ chuyện có thật trên sân. */
export function tinhHinh(the: The, now: number): Record<string, unknown> {
  const pha = the.pha;
  const d = demPhe(the, now);
  const v: Record<string, unknown> = {
    game: 'Sơn Hà Tiên Lộ',
    pha: pha.k,
    conGiay: Math.max(0, Math.round((pha.den - now) / 1000)),
    soNguoi: { sonMon: d.son, thuyPhu: d.thuy },
    theTran: the.muc > 0 ? `nước đang dâng (+${the.muc})` : the.muc < 0 ? `núi đang cao (${the.muc})` : 'cân bằng',
    muaThang: { sonMon: the.muaThang.son, thuyPhu: the.muaThang.thuy },
    top: bangTuVi(the, 5).map((n) => ({ ten: n.ten, canh: tenCanh(n.canh), phe: n.phe === null ? null : PHE[n.phe].tenNgan })),
    suThi: the.suThi.slice(-3).map((s) => s.chu),
    keTiep: suKienKe(the, now).ten,
    lichTrinh: lichSapToi(the, now, 4).map((x) => `${x.ten} sau khoảng ${Math.max(0, Math.round((x.luc - now) / 60_000))} phút`),
    nam: the.nam,
    linhMach: { sonMon: the.linhMach.son, thuyPhu: the.linhMach.thuy },
    mach: MACH_TRUYEN[pha.k],
  };
  if (pha.k === 'hoi') v['cauHoi'] = { hoi: pha.cau.hoi, soTra: pha.tra.size };
  if (pha.k === 'dap') v['dapAn'] = { dung: pha.cau.dap[pha.cau.dung], soDung: pha.soDung, nhanh: pha.nhanh };
  if (pha.k === 'kiep') v['loiKiep'] = { ten: pha.ten, canh: tenCanh(pha.canh), hoPhap: pha.ho.size, can: CANH_GIOI[pha.canh]?.hoPhap };
  if (pha.k === 'kiep-ket') v['ketKiep'] = { ten: pha.ten, qua: pha.qua, nhoHoPhap: pha.nhoHo };
  if (pha.k === 'lu') {
    const top = [...pha.cong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    v['muaLu'] = {
      sonMon: Math.round(pha.son),
      thuyPhu: Math.round(pha.thuy),
      quyetChien: quyetChien(pha, now),
      tranKhi: { sonMon: Math.round(pha.H - pha.thuy), thuyPhu: Math.round(pha.H - pha.son), toiDa: pha.H },
      lienKich: { sonMon: pha.combo.son.so, thuyPhu: pha.combo.thuy.so },
      dauTuong:
        pha.dau === null
          ? null
          : `${the.nguoi.get(pha.dau.son)?.ten ?? ''} đối đầu ${the.nguoi.get(pha.dau.thuy)?.ten ?? ''}`,
      congTrangCaoNhat: top.map(([u, d]) => `${the.nguoi.get(u)?.ten ?? u} (${Math.round(d)})`),
    };
  }
  if (pha.k === 'me') {
    v['diaCung'] = {
      soNguoi: pha.vt.size,
      daThoat: pha.thoat.map((u) => the.nguoi.get(u)?.ten ?? u),
      baoVatTrenSan: pha.do.length,
      coRuong: pha.do.some((d) => d.loai === 'ruong'),
    };
  }
  if (pha.k === 'nm') {
    v['aiNhapMon'] = {
      dangBuocVao: now < pha.moLuc,
      soNguoi: pha.vt.size,
      daVuotAi: pha.qua.map((u) => the.nguoi.get(u)?.ten ?? u),
      vatPhamTrenDuong: pha.do.length,
      coBiKip: pha.do.some((d) => d.loai === 'bk'),
    };
  }
  if (pha.k === 'nm-ket') v['ketAiNhapMon'] = { vuotAi: pha.qua.map((q) => q.ten), truot: pha.truot };
  if (pha.k === 'tt') v['thanhTri'] = { daMua: pha.mua.map((m) => `${m.ten} mua ${m.mon}`) };
  if (pha.k === 'me-ket') v['ketDiaCung'] = { thoatRa: pha.thoat.map((t) => t.ten), ketLai: pha.mat };
  if (pha.k === 'lu-ket') v['ketLu'] = { thang: pha.thang === null ? 'hòa' : PHE[pha.thang].tenNgan };
  if (pha.k === 'yeu') v['yeuTinh'] = { ten: YEU[pha.yeu].ten, mau: Math.round((100 * pha.mau) / pha.mauMax), tongDanh: pha.phe === null ? 'hai tông' : PHE[pha.phe].tenNgan, cuongBao: pha.cuong, dangNga: pha.nga.size };
  if (pha.k === 'yeu-ket') v['ketYeu'] = { ten: YEU[pha.yeu].ten, ha: pha.thang, ketLieu: pha.ketLieu };
  if (the.phucLoc > 0) v['phucLoc'] = { nho: the.phucLocTu, conCau: the.phucLoc };
  if ((pha.k === 'hoi' || pha.k === 'dap') && pha.thi > 0) v['hoiThi'] = { cau: pha.thi, tren: HOI_THI_SO_CAU };
  if ((pha.k === 'lu' || pha.k === 'yeu') && pha.dai) v['suKienLon'] = pha.k === 'lu' ? 'Đại Hồng Thủy' : 'Đại Yêu Dạ';
  return v;
}

/** Chiêu mặc định theo phím khi chưa có công pháp đúng hệ. */
const CHIEU_GOC: Record<Ky, string> = { cong: 'Đòn Thường', thu: 'Hộ Thể', hoi: 'Hồi Khí', pha: 'Phá Trận' };
/** Mỗi người ghi lượt tung chiêu cách nhau ít nhất chừng này (gõ dồn không tràn bảng). */
const TUNG_CACH = 1_500;

/** Chiêu khi gõ phím `ky`: bốc trong các công pháp người đó đã có, đúng hệ của phím (1 công → hệ Chiến Tướng,
 *  2 thủ → Hộ Vệ, 3 hồi → Y Sư, 4 phá → Phá Quân); chưa có môn nào đúng hệ thì chiêu mặc định. `r` 0..1 để bốc.
 *  (Sau này công / thủ của nhân vật cũng dựa theo công pháp đã có.) */
export function chieuTheoKy(n: NguoiChoi, ky: Ky, r: number): { chieu: string; so: number } {
  if (n.phe === null) return { chieu: CHIEU_GOC[ky], so: 0 };
  const co: number[] = [];
  CONG_PHAP.forEach((m, i) => {
    if (CAN_CO[m.he].ky === ky && (n.cpCo & (1 << (i + 1))) !== 0) co.push(i + 1);
  });
  if (co.length === 0) return { chieu: CHIEU_GOC[ky], so: 0 };
  const so = co[Math.min(co.length - 1, Math.floor(r * co.length))]!;
  return { chieu: CONG_PHAP[so - 1]!.ten[n.phe], so };
}

function ghiTungChieu(the: The, n: NguoiChoi, ky: Ky, now: number) {
  if (n.phe === null) return;
  const cu = [...the.tungChieu].reverse().find((x) => x.user === n.user);
  if (cu !== undefined && now - cu.luc < TUNG_CACH) return;
  // Bốc chiêu theo nhịp thời gian (lõi không có rand ở đây) — đủ "ngẫu nhiên" giữa các lượt gõ.
  const { chieu, so } = chieuTheoKy(n, ky, ((now * 0.6180339887) % 1000) / 1000);
  the.tungChieu.push({ user: n.user, ten: n.ten, phe: n.phe, ky, chieu, so, luc: now });
  if (the.tungChieu.length > 6) the.tungChieu.splice(0, the.tungChieu.length - 6);
}

/** SĨ KHÍ TÁN TU (Đại Chiến, người vận hành 2026-11-20): khách chưa vào tông tặng quà / thả tim thì khích lệ sĩ khí —
 *  đủ KICH_DAY xu thì thưởng hai tông ×(1 + KICH_TOI_DA). Mỗi tim tính KICH_TIM xu. */
export const KICH_DAY = 300;
export const KICH_TOI_DA = 0.5;
const KICH_TIM = 0.2;
/** Lời MC khi tán tu khích lệ, cách nhau ít nhất chừng này. */
const KICH_HO_CACH = 6_000;

/** Hệ số thưởng hết trận Đại Chiến theo sĩ khí tán tu: 1 → 1 + KICH_TOI_DA. */
export function heSoKich(pha: PhaLu): number {
  const xu = pha.kich?.xu ?? 0;
  return 1 + KICH_TOI_DA * Math.min(1, xu / KICH_DAY);
}

function kichSiKhi(pha: PhaLu, n: NguoiChoi, xu: number, now: number, ra: Su[]) {
  const k = (pha.kich ??= { xu: 0, nguoi: new Map(), cuoi: null });
  const truoc = heSoKich(pha);
  k.xu += xu;
  k.nguoi.set(n.user, (k.nguoi.get(n.user) ?? 0) + xu);
  const moiHo = k.cuoi === null || now - k.cuoi.luc > KICH_HO_CACH;
  k.cuoi = { user: n.user, ten: n.ten, luc: now };
  const sau = heSoKich(pha);
  if (moiHo && xu >= 1) {
    ra.push({ k: 'doc', chu: `Tán tu ${n.ten} khích lệ sĩ khí! Thưởng hai tông nhân ${sau.toFixed(1).replace('.', ',')}.` });
  } else if (Math.floor(truoc * 10) !== Math.floor(sau * 10) && sau >= 1 + KICH_TOI_DA) {
    ra.push({ k: 'doc', chu: 'Sĩ khí tán tu đã đầy! Thưởng hai tông nhân một rưỡi.' });
  }
}
