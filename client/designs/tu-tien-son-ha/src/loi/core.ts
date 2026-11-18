/** Lõi Sơn Hà Tiên Lộ — THUẦN: không React, không DOM, không Date.now(), không Math.random().
 *  Thời gian và ngẫu nhiên tiêm vào; hàm sửa thẳng `The` rồi trả về các việc vừa xảy ra
 *  (`Su[]`) để lớp vẽ làm hiệu ứng, đọc to, chạy dải sử thi. */

import { bocCau, bocCauKho, type CauHoi } from './cau-hoi';
import { docLenh } from './lenh';
import { denGio, sapToi, type DongLich } from './lich';
import { cuaMe, doGan, ke, khoang, oGiua, oGuong, taoMeDoiXung, type Huong, type MeCung } from './me-cung';
import {
  bocPham,
  chiSo,
  lkLuyenHoa,
  nenMac,
  O_TRANG_BI,
  PHAM,
  taoDo,
  tenDo,
  type OTrangBi,
  type TrangBi,
  type TuiDo,
} from './trang-bi';
import {
  CANH_GIOI,
  chieuCua,
  DAC_BIET,
  LINH_VAT,
  PHE,
  SU_THI,
  THU_TU_YEU,
  YEU,
  CAN_CO,
  CAN_CO_DS,
  NPC_TRUONG_LAO,
  SO_NPC,
  GIOI_GOC,
  TRAN_PHAP,
  type CanCo,
  type Gioi,
  type Ky,
  type LoaiDacBiet,
  type LoaiSuThi,
  type Phe,
  type YeuId,
} from './the-gioi';

export interface Nhip {
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
  /** Tu luyện chỉ hiện một môn phái; mỗi lượt dài chừng này rồi đổi phe kia. */
  doiPhe: number;
}

const PHUT = 60_000;

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
  doiPhe: 3 * PHUT,
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
  doiPhe: 40_000,
};

/** Đổi phe quá dễ thì giữa trận kéo co cả đám nhảy sang phe đang thắng. */
const DOI_PHE_CACH = 15 * PHUT;
/** Còn tương tác trong khoảng này mới tính là đang chơi (chia phe, máu yêu tinh, thưởng mùa). */
const DANG_CHOI = 5 * PHUT;
const KIEP_LAI = 3 * PHUT;
/** Mỗi người một lần đẩy mỗi 1,2 giây: trận lũ là trận đông người, không phải trận gõ nhanh. */
const DAY_CACH = 1_200;
const DANH_CACH = 2_000;
const TIM_TOI_DA = 15;
const TIM_CUA_SO = 10 * PHUT;
const MUC_TOI_DA = 5;
const SU_THI_GIU = 6;
/** Địa Cung: 11×13 ô vừa nửa dưới khung dọc. */
export const ME_COT = 11;
export const ME_HANG = 13;
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
/** PK "Thiên Bình" (Đại Chiến) — luôn công bằng dù lực chiến hai phe lệch nhau:
 *  - Điểm đến từ hành động: bình luận (1 cú / 1,2 giây), tim (0,3 mỗi tim), quà (5×√xu cộng dồn theo
 *    người — giảm dần, một người tặng lớn không một mình định đoạt trận).
 *  - Lực chiến chỉ so TRONG phe: cú đẩy nhân hệ số = lực chiến mình / lực chiến trung bình phe mình
 *    (kẹp ×0,6–×1,8). Trung bình mỗi phe luôn ×1 — phe toàn cao thủ không lấn phe toàn người mới.
 *  - Thế yếu bứt phá: phe đang thua quá 15% được cộng tới ×1,3 cho tới khi bắt kịp.
 *  - Người hệ số ≥ ×1,4 (cao thủ của phe mình) mỗi 12 giây tung một tuyệt kỹ, cú đó gấp đôi. */
const DIEM_TIM = 0.3;
const DIEM_QUA = 5;
const HE_SO_MIN = 0.6;
const HE_SO_MAX = 1.8;
const BUT_PHA_TOI_DA = 0.3;
const TUYET_KY_HE_SO = 1.4;
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
const KY_GIA = 10;
const KY_PHIEU = 8_000;
const KY_HOI_CHIEU = 20_000;
const KY_LAU = 10_000;
const KY_PHA_LAU = 8_000;
const KY_HOI_PK = 0.12;
/** Căn cơ: hệ số đòn (PK và yêu tinh), tỉ lệ đỡ phản đòn cộng thêm. */
const CO_DON: Record<CanCo, number> = { tuong: 1.2, ve: 0.85, y: 0.85, quan: 1 };
const CO_DO: Record<CanCo, number> = { tuong: -0.2, ve: 0.3, y: 0, quan: -0.2 };
const TUYET_KY_CACH = 12_000;
/** Đánh yêu tinh: máu yêu tinh mỗi lần tụt thêm 1/8 (Đại Yêu 1/12) thì rơi một món; hạ được thì kết
 *  liễu chắc chắn được một món và rơi thêm một món. Mỗi món chọn người nhận: 15% cho người đang
 *  ngồi xem (không tim, không bình luận trong trận), 85% cho người ra tay — rút thăm có trọng số theo
 *  tim và quà trong trận (phúc duyên), nên top tim + quà được ưu tiên nhưng vẫn là ngẫu nhiên. */
/** Yêu tinh phản đòn: mỗi 7–10 giây đánh ~30% người vừa ra tay (tối đa 6). Thủ cho tỉ lệ đỡ được
 *  (thủ/250, trần 60%); không đỡ được thì choáng 4 giây — không đánh được. Thả tim thì hồi khí, tỉnh ngay. */
const PHAN_CACH = 7_000;
const PHAN_CHOANG = 4_000;
const PHAN_DO_TOI_DA = 0.6;
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
}

const taoTran = (): TranPhap => ({
  phieu: new Map(),
  kyLuc: new Map(),
  mien: { son: 1, thuy: 1 },
  hl: { son: { cong: 0, thu: 0, vo: 0, ho: 0 }, thuy: { cong: 0, thu: 0, vo: 0, ho: 0 } },
  cuoi: null,
});

export type DoRoi = { id: number; o: number } & ({ loai: 'tb'; vat: TrangBi } | { loai: 'ruong' });

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
      soHo: number;
      den: number;
      tong: number;
    }
  | {
      k: 'lu';
      den: number;
      tong: number;
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
      /** Điểm thần binh đã đánh bù cho mỗi phe, và lúc tính gần nhất. */
      binh: Record<Phe, number>;
      binhLuc: number;
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
      phanCuoi: { luc: number; trung: string[]; doDuoc: string[] } | null;
    }
  | {
      k: 'yeu-ket';
      yeu: YeuId;
      thang: boolean;
      ketLieu: string | null;
      top: string | null;
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
      ra: number;
      vt: Map<string, ViTriMe>;
      do: DoRoi[];
      idKe: number;
      /** Còn bao nhiêu bảo vật chưa rơi, và lúc rơi món kế. */
      conRoi: number;
      roiKe: number;
      ruongLuc: number;
      daRuong: boolean;
      /** Thứ tự thoát ra. */
      thoat: string[];
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
  | { k: 'dung'; user: string; lk: number }
  | { k: 'dot-pha'; user: string; canh: number }
  | { k: 'trung'; user: string; dmg: number; bao: boolean; truot: boolean }
  | { k: 'day'; user: string; phe: Phe; luc: number }
  | { k: 'tuyet-ky'; user: string; phe: Phe; chieu: string }
  /** Tim, quà góp vào Đại Chiến (hiệu ứng nhẹ, không hiện tên chiêu). */
  | { k: 'gop'; user: string; phe: Phe; diem: number }
  /** Đại Chiến: liên kích qua mốc, đảo chiều. */
  | { k: 'lien-kich'; phe: Phe; so: number }
  | { k: 'dao-chieu'; phe: Phe }
  | { k: 'quyet-chien' }
  | { k: 'dau-tuong'; son: string; thuy: string }
  | { k: 'dau-tuong-ket'; thang: Phe | null; nguoiThang: string | null }
  /** Yêu tinh phản đòn: ai trúng (choáng), ai đỡ được. */
  | { k: 'phan-don'; trung: string[]; doDuoc: string[] }
  /** Thả tim hồi khí, hết choáng. */
  | { k: 'hoi-khi'; user: string }
  /** Kết trận pháp. `nguon`: 'ho' (đủ người hô) hoặc 'qua' (tặng quà). */
  | { k: 'ky-nang'; phe: Phe; ky: Ky; nguon: 'ho' | 'qua'; ai: string | null }
  | { k: 'pha-tran'; thang: Phe }
  /** Tụ Linh Trận: số đồng môn cùng đáp đúng một câu. */
  | { k: 'cong-huong'; phe: Phe; so: number }
  /** Phàm nhân nhặt được bảo vật trong Địa Cung: bước vào tiên lộ. */
  | { k: 'ky-ngo'; user: string; phe: Phe; vat: TrangBi }
  | { k: 'ho'; user: string }
  | { k: 'set'; user: string; qua: boolean }
  | { k: 'qua'; user: string; so: number }
  | { k: 'tim'; user: string }
  | { k: 'the'; user: string }
  | { k: 'doc'; chu: string }
  | { k: 'pha'; pha: Pha['k'] }
  | { k: 'dac-biet'; loai: LoaiDacBiet }
  /** Nhặt đồ. `o` là ô Địa Cung (đồ mới chỉ vào túi), −1 khi đồ rơi từ yêu tinh (mặc ngay). */
  | {
      k: 'nhat';
      user: string;
      o: number;
      vat: TrangBi;
      lk: number;
      mac: boolean;
      ruong: boolean;
      nguon: 'me' | 'yeu';
      lucTruoc: number;
      lucSau: number;
    }
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
  /** Thế trận mùa: dương là nước đang dâng (Thủy Phủ thắng thế), âm là núi đang cao. */
  muc: number;
  muaThang: Record<Phe, number>;
  suThi: DongSuThi[];
  /** Hồ sơ có đổi từ lần ghi sổ trước. */
  ban: boolean;
  /** Đếm lượt dùng câu sử thi để xoay vòng, khỏi lặp. */
  xoay: number;
  /** Vừa xong một kiếp: nhịp sau phải là việc khác, để hàng kiếp dài không chặn yêu tinh, mùa lũ, câu hỏi. */
  kiepVua: boolean;
  /** Lịch sự kiện theo giờ do người vận hành đặt, và độ lệch múi giờ của máy phát. */
  lich: DongLich[];
  lechPhut: number;
  daChayLich: Set<string>;
  hangDacBiet: LoaiDacBiet[];
  /** Hội thi Ngọc Phả: còn mấy câu, đang câu thứ mấy. */
  hoiThiCon: number;
  hoiThiSo: number;
  /** Năm thứ mấy của phiên — mỗi giờ live là một năm (Kinh Thư §2.9). */
  nam: number;
  meKe: number;
  /** Linh Mạch mỗi phe: tu luyện bồi đắp, kết trận pháp tiêu hao, thắng trận thêm (Kinh Thư §12). */
  linhMach: Record<Phe, number>;
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
    lich: [],
    lechPhut: 0,
    daChayLich: new Set(),
    hangDacBiet: [],
    hoiThiCon: 0,
    hoiThiSo: 0,
    nam: 1,
    meKe: now + nhip.meDau,
    linhMach: { son: 0, thuy: 0 },
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
  /** Đồ đang mặc: ô → [phẩm, công, thủ]. */
  g?: Partial<Record<OTrangBi, [number, number, number]>>;
  /** Giới nhân vật. */
  x?: Gioi;
  /** Căn cơ. */
  r?: CanCo;
}

export interface SoHoSo {
  nguoi?: Record<string, HoSoNguoi>;
  mua?: Partial<Record<Phe, number>>;
  /** Linh Mạch hai phe. */
  lm?: Partial<Record<Phe, number>>;
}

function nguoiMoi(user: string, ten: string): NguoiChoi {
  return {
    user,
    ten,
    phe: null,
    gioi: null,
    canCo: null,
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
      n.tb[o] = { o, pham, cong: Math.max(0, Math.round(so(x[1]))), thu: Math.max(0, Math.round(so(x[2]))) };
    }
    the.nguoi.set(user, n);
  }
  the.muaThang = { son: Math.max(0, so(d.mua?.son)), thuy: Math.max(0, so(d.mua?.thuy)) };
  the.linhMach = { son: Math.max(0, Math.round(so(d.lm?.son))), thuy: Math.max(0, Math.round(so(d.lm?.thuy))) };
}

export function xuatHoSo(the: The): SoHoSo {
  const nguoi: Record<string, HoSoNguoi> = {};
  for (const n of the.nguoi.values()) {
    // Người chỉ ghé vào rồi đi, chưa có gì đáng giữ: không phình sổ.
    if (n.phe === null && n.lk === 0) continue;
    const g: NonNullable<HoSoNguoi['g']> = {};
    for (const o of O_TRANG_BI) {
      const t = n.tb[o];
      if (t !== undefined) g[o] = [t.pham, t.cong, t.thu];
    }
    nguoi[n.user] = { t: n.ten, p: n.phe, k: Math.round(n.lk), c: n.canh, v: n.linhVat, d: n.dung };
    if (Object.keys(g).length > 0) nguoi[n.user]!.g = g;
    if (n.gioi !== null) nguoi[n.user]!.x = n.gioi;
    if (n.canCo !== null) nguoi[n.user]!.r = n.canCo;
  }
  return { nguoi, mua: { ...the.muaThang }, lm: { ...the.linhMach } };
}

/** Phiên live mới: giữ tu vi, quên mọi thứ của buổi trước. */
export function phienMoi(the: The, now: number): void {
  const giu = new Map(the.nguoi);
  const { muaThang, lich, lechPhut, daChayLich, luotPhe, linhMach } = the;
  Object.assign(the, taoThe(now, the.nhip));
  Object.assign(the, { muaThang, lich, lechPhut, daChayLich, luotPhe, linhMach });
  for (const n of giu.values()) {
    n.phienNay = false;
    n.huong = 0;
    n.chuoi = 0;
    n.choKiep = false;
    n.kiepLai = 0;
    n.lanCuoi = 0;
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
    const ct = chiSo(n.canh, n.tb);
    luc += ct.cong + ct.thu;
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
export const congThu = (n: NguoiChoi) => chiSo(n.canh, n.tb);

/** Lực chiến = công + thủ — xếp hạng khi ngang cảnh giới. */
export const lucChien = (n: NguoiChoi) => {
  const c = chiSo(n.canh, n.tb);
  return c.cong + c.thu;
};

/** Cộng linh khí, đột phá nếu đủ, dừng ở bình cảnh nếu cảnh kế tiếp phải độ kiếp. */
function congLk(the: The, n: NguoiChoi, goc: number, now: number, ra: Su[], phuc = false): number {
  if (goc <= 0) return 0;
  const them = Math.round(goc * heSoLinhVat(n) * (phuc && the.phucLoc > 0 ? 2 : 1));
  n.lk += them;
  the.ban = true;
  for (;;) {
    const ke = CANH_GIOI[n.canh + 1];
    if (ke === undefined || n.lk < ke.can) break;
    if (ke.hoPhap > 0) {
      n.lk = ke.can;
      xepKiep(the, n, now, ra);
      break;
    }
    n.canh++;
    ra.push({ k: 'dot-pha', user: n.user, canh: n.canh });
    ghiSuThi(the, now, ra, 'dotPha', { ten: n.ten, canh: tenCanh(n.canh) }, n.phe ?? undefined);
  }
  return them;
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

function nhapPhe(the: The, n: NguoiChoi, phe: Phe, now: number, ra: Su[], gioi: Gioi | undefined, rand: () => number) {
  n.phe = phe;
  n.gioi = gioi ?? n.gioi ?? GIOI_GOC[phe];
  // Căn cơ chia ngẫu nhiên — không bắt ai gõ thêm; ai muốn đổi thì gõ tên căn cơ.
  if (n.canCo === null) n.canCo = chon(CAN_CO_DS, rand);
  n.doiPheLuc = now;
  the.ban = true;
  ra.push({ k: 'nhap', user: n.user, phe });
  ghiSuThi(the, now, ra, phe === 'son' ? 'nhapSon' : 'nhapThuy', { ten: n.ten }, phe);
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
  // Đại Chiến đang nổ: khách lên tiếng là được xếp ngay vào phe đang yếu hơn.
  if (pha.k === 'lu' && n.phe === null) nhapPhe(the, n, pheCanBang(the, now), now, ra, undefined, rand);

  if (tin.kind === 'gift') {
    const xu = Math.max(1, Math.round(tin.xu ?? tin.count ?? 1));
    n.huong += xu;
    if (pha.k === 'yeu') pha.qua.set(n.user, (pha.qua.get(n.user) ?? 0) + xu);
    if (pha.k === 'lu') quaLu(pha, n, xu, now, ra);
    // Hương hỏa thỉnh trận: tặng quà giữa trận thì kết ngay trận pháp theo căn cơ mình (không tốn Linh Mạch).
    if ((pha.k === 'lu' || pha.k === 'yeu') && n.phe !== null && n.canCo !== null) {
      ketTran(the, pha, n.phe, CAN_CO[n.canCo].ky, now, ra, 'qua', n.user);
    }
    ra.push({ k: 'qua', user: n.user, so: Math.max(1, tin.count ?? 1) });
    ghiSuThi(the, now, ra, 'qua', { ten: n.ten, so: tin.count ?? 1, qua: tin.text || 'nén hương' }, n.phe ?? undefined);
    return ra;
  }

  if (tin.kind === 'like') {
    if (pha.k === 'lu') {
      timLu(pha, n, Math.max(1, tin.count ?? 1), now, ra);
    } else {
      if (pha.k === 'me') vaoMe(the, pha, n, now);
      if (pha.k === 'yeu') {
        pha.tim.set(n.user, (pha.tim.get(n.user) ?? 0) + Math.max(1, tin.count ?? 1));
        if ((pha.choang.get(n.user) ?? 0) > now) {
          pha.choang.delete(n.user);
          ra.push({ k: 'hoi-khi', user: n.user });
        }
      }
      if (now - n.timMoc > TIM_CUA_SO) {
        n.timMoc = now;
        n.timLk = 0;
      }
      if (n.timLk < TIM_TOI_DA) {
        n.timLk++;
        congLk(the, n, 1, now, ra);
      }
      ra.push({ k: 'tim', user: n.user });
    }
    return ra;
  }

  const lenh = docLenh(tin.text ?? '');

  // Không tự xếp phe nữa: ai chưa gõ lệnh nhập môn là khách (phàm nhân) — vẫn trả lời câu hỏi,
  // vẫn tích linh khí, nhưng không ra trận, không xuống Địa Cung.
  if (lenh.k === 'phe') {
    if (n.phe === null) nhapPhe(the, n, lenh.phe, now, ra, lenh.gioi, rand);
    else if (n.phe !== lenh.phe && now - n.doiPheLuc >= DOI_PHE_CACH && pha.k !== 'lu') {
      nhapPhe(the, n, lenh.phe, now, ra, lenh.gioi, rand);
    } else if (n.phe === lenh.phe && lenh.gioi !== undefined && n.gioi !== lenh.gioi) {
      n.gioi = lenh.gioi;
      the.ban = true;
    }
  } else if (lenh.k === 'can-co' && n.phe !== null && pha.k !== 'lu' && pha.k !== 'yeu' && n.canCo !== lenh.canCo) {
    // Đổi căn cơ ngoài trận (giữa trận đổi là lách luật).
    n.canCo = lenh.canCo;
    the.ban = true;
    ra.push({ k: 'the', user: n.user });
  } else if ((lenh.k === 'vao' || lenh.k === 'gioi') && n.phe === null) {
    // Không chọn phe: xếp vào phe đang yếu hơn.
    nhapPhe(the, n, pheCanBang(the, now), now, ra, lenh.k === 'gioi' ? lenh.gioi : undefined, rand);
  } else if (lenh.k === 'gioi' && n.gioi !== lenh.gioi) {
    n.gioi = lenh.gioi;
    the.ban = true;
  }

  if (lenh.k === 'toi') ra.push({ k: 'the', user: n.user });

  switch (pha.k) {
    case 'hoi':
      if (lenh.k === 'dap' && !pha.tra.has(n.user)) {
        pha.tra.set(n.user, lenh.chon);
        if (lenh.chon === pha.cau.dung) pha.dungThuTu.push(n.user);
      }
      break;
    case 'kiep':
      if (n.user === pha.user) {
        if (lenh.k === 'dap' && pha.chon === null) {
          pha.chon = lenh.chon;
          // Đã chọn thì chỉ chờ thêm chút cho cả phòng kịp hô.
          pha.den = Math.min(pha.den, now + 4_000);
        }
      } else if (lenh.k === 'ho' && !pha.ho.has(n.user)) {
        pha.ho.add(n.user);
        ra.push({ k: 'ho', user: n.user });
      }
      break;
    case 'lu':
      dayLu(pha, n, now, ra);
      if (lenh.k === 'ky') hoKy(the, pha, n, lenh.ky, now, ra);
      break;
    case 'yeu':
      if (lenh.k === 'danh') danhYeu(the, pha, n, now, rand, ra);
      if (lenh.k === 'ky') hoKy(the, pha, n, lenh.ky, now, ra);
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
function vaoTran(pha: PhaLu, n: NguoiChoi & { phe: Phe }) {
  if (pha.nguoi.has(n.user)) return;
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

function hoKy(the: The, pha: PhaTran, n: NguoiChoi, ky: Ky, now: number, ra: Su[]) {
  if (n.phe === null) return;
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
export const quyetChien = (pha: PhaLu, now: number) => pha.den - now <= QUYET_CHIEN;

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
    (hl[dich].vo > now ? 1.15 : 1);
  pha[n.phe] += d;
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

function dayLu(pha: PhaLu, n: NguoiChoi, now: number, ra: Su[]) {
  if (!coPhe(n) || now - n.dayLuc < DAY_CACH) return;
  n.dayLuc = now;
  vaoTran(pha, n);
  const hs = heSoNoiBo(pha, n);
  const nguongTk = n.canCo === 'quan' ? 1.25 : TUYET_KY_HE_SO;
  const tk = hs >= nguongTk && (n.tkLuc === 0 || now - n.tkLuc >= TUYET_KY_CACH);
  if (tk) n.tkLuc = now;
  const chu = pha.chu[n.phe] === n.user ? CHU_HE_SO : 1;
  ghiDiem(pha, n, hs * (tk ? 2 : 1) * (n.canCo === null ? 1 : CO_DON[n.canCo]) * chu, now, ra);
  ra.push({ k: 'day', user: n.user, phe: n.phe, luc: hs });
  if (tk) ra.push({ k: 'tuyet-ky', user: n.user, phe: n.phe, chieu: chieuCua(n.phe, n.canh) });
}

function timLu(pha: PhaLu, n: NguoiChoi, so: number, now: number, ra: Su[]) {
  if (!coPhe(n)) return;
  vaoTran(pha, n);
  pha.tim[n.phe] += so;
  ghiDiem(pha, n, DIEM_TIM * so, now, ra);
  ra.push({ k: 'gop', user: n.user, phe: n.phe, diem: DIEM_TIM * so });
}

function quaLu(pha: PhaLu, n: NguoiChoi, xu: number, now: number, ra: Su[]) {
  if (!coPhe(n)) return;
  vaoTran(pha, n);
  const cu = pha.xuNguoi.get(n.user) ?? 0;
  pha.xuNguoi.set(n.user, cu + xu);
  pha.xu[n.phe] += xu;
  const diem = DIEM_QUA * (Math.sqrt(cu + xu) - Math.sqrt(cu));
  ghiDiem(pha, n, diem, now, ra);
  ra.push({ k: 'gop', user: n.user, phe: n.phe, diem });
}

function danhYeu(
  the: The,
  pha: Extract<Pha, { k: 'yeu' }>,
  n: NguoiChoi,
  now: number,
  rand: () => number,
  ra: Su[],
) {
  // Chỉ đệ tử mới ra trận — khách đứng xem. Đang choáng vì yêu tinh phản đòn thì chưa đánh được.
  if (n.phe === null || pha.mau <= 0 || now - n.danhLuc < DANH_CACH) return;
  if ((pha.choang.get(n.user) ?? 0) > now) return;
  n.danhLuc = now;
  const y = YEU[pha.yeu];
  if (rand() < y.truot) {
    ra.push({ k: 'trung', user: n.user, dmg: 0, bao: false, truot: true });
    return;
  }
  const bao = rand() < (n.canCo === 'quan' ? 0.2 : 0.1);
  // Sát thương gốc là công: không đồ thì bằng 10 + 6×cảnh giới như cũ, có binh khí thì đau hơn.
  const dmg = Math.round(
    congThu(n).cong *
      (y.khac !== null && y.khac === n.phe ? 1.5 : 1) *
      (bao ? 2 : 1) *
      heSoLinhVat(n) *
      (n.canCo === null ? 1 : CO_DON[n.canCo]) *
      (pha.tran.hl[n.phe].cong > now ? 1.3 : 1) *
      (pha.yeuVo > now ? 1.2 : 1),
  );
  pha.mau = Math.max(0, pha.mau - dmg);
  pha.dmg.set(n.user, (pha.dmg.get(n.user) ?? 0) + dmg);
  if (n.phe !== null) pha.dmgPhe[n.phe] += dmg;
  ra.push({ k: 'trung', user: n.user, dmg, bao, truot: false });
  // Mỗi khi máu tụt qua một mốc: rơi một món cho người được rút thăm.
  const soMoc = pha.dai ? YEU_MOC_DAI : YEU_MOC;
  const moc = Math.floor((1 - pha.mau / pha.mauMax) * soMoc);
  while (pha.mau > 0 && pha.roiMoc < moc) {
    pha.roiMoc++;
    const ai = chonNhanDo(the, pha, now, rand);
    if (ai !== null) yeuRoi(the, pha, ai, 0.3, now, rand, ra);
  }
  if (pha.mau <= 0) ketYeu(the, pha, now, rand, ra, n.user);
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
  for (const { d, khoa } of denGio(the.lich, now, the.lechPhut, the.daChayLich)) {
    the.daChayLich.add(khoa);
    if (!the.hangDacBiet.includes(d.loai)) the.hangDacBiet.push(d.loai);
  }
  // Người đã hết thời gian chờ sau khi ngã kiếp mà vẫn ở bình cảnh: cho vào hàng lại.
  if (pha.k === 'cho' || pha.k === 'hoi') {
    for (const n of dangChoi(the, now)) {
      const ke = CANH_GIOI[n.canh + 1];
      if (ke !== undefined && ke.hoPhap > 0 && n.lk >= ke.can) xepKiep(the, n, now, ra);
    }
  }
  doiLuotPhe(the, now, rand);
  if (pha.k === 'me') diMe(the, pha, now, rand, ra);
  if (pha.k === 'yeu' && pha.mau > 0 && now >= pha.phanKe) phanDon(the, pha, now, rand, ra);
  if (pha.k === 'lu') dienBienLu(the, pha, now, ra);
  if (now < pha.den) return ra;
  switch (pha.k) {
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
      ketKiep(the, pha, now, ra);
      break;
    case 'lu':
      ketLu(the, pha, now, ra);
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
  const choi = dangChoi(the, now);

  while (!the.kiepVua && the.hangKiep.length > 0) {
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
    sang(the, { k: 'kiep', user, ten: n.ten, canh, cau, den: now + nh.kiep, tong: nh.kiep, chon: null, ho: new Set() }, ra);
    ra.push({
      k: 'doc',
      chu: `Lôi kiếp! ${n.ten} độ kiếp ${tenCanh(canh)}. Cả phòng gõ "độ" để hộ pháp!`,
    });
    return;
  }

  the.kiepVua = false;

  const db = the.hangDacBiet.shift();
  if (db !== undefined && batDauDacBiet(the, db, now, choi.length, ra)) return;

  if (now >= the.yeuKe) {
    the.yeuKe = now + nh.yeuCach;
    if (choi.length > 0) {
      const yeu = THU_TU_YEU[the.yeuThu++ % THU_TU_YEU.length]!;
      // Máu theo số đệ tử (khách không đánh được); sàn 250 để một người cũng hạ nổi.
      const soDeTu = Math.max(1, choi.filter((n) => n.phe !== null).length);
      const mauMax = Math.max(250, Math.ceil((soDeTu * 300) / 50) * 50);
      sang(
        the,
        phaYeu(yeu, mauMax, now, nh.yeu, false),
        ra,
      );
      ghiSuThi(the, now, ra, 'yeuHien', { yeu: YEU[yeu].ten });
      ra.push({ k: 'doc', chu: `${YEU[yeu].ten} xuất thế! Cả phòng gõ "đánh"!` });
      return;
    }
  }

  if (now >= the.luKe) {
    the.luKe = now + nh.luCach;
    if (choi.length > 0) {
      moLu(the, now, ra, nh.lu, false, 1);
      ghiSuThi(the, now, ra, 'luBatDau', {});
      ra.push({ k: 'doc', chu: 'Thủy Tinh dâng nước! Gõ gì cũng được, phe nào đông tay hơn thì thắng!' });
      return;
    }
  }

  if (now >= the.meKe) {
    the.meKe = now + nh.meCach;
    if (choi.length > 0) {
      batDauMe(the, now, rand, ra, choi);
      return;
    }
  }

  if (now >= the.muaKe) {
    the.muaKe = now + nh.mua;
    ketMua(the, now, ra);
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

/** Mở sự kiện theo lịch. Trả `true` khi sự kiện chiếm nhịp này (Đại Yêu, Đại Hồng Thủy);
 *  `false` thì nhịp này làm việc thường — Phúc Lộc và Hội thi chạy cùng câu hỏi. */
function batDauDacBiet(the: The, loai: LoaiDacBiet, now: number, soChoi: number, ra: Su[]): boolean {
  const nh = the.nhip;
  const info = DAC_BIET[loai];
  if ((loai === 'dai-yeu' || loai === 'dai-lu') && soChoi === 0) {
    // Phòng trống thì để dành, có người vào mới mở.
    the.hangDacBiet.unshift(loai);
    return false;
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
  };
}

/** Mở Đại Chiến: khách đang có mặt được tự xếp phe cho cân lực lượng; mỗi phe chọn Chủ Tướng là người
 *  cảnh giới (rồi lực chiến) cao nhất đang chơi. */
function moLu(the: The, now: number, ra: Su[], dai: number, lon: boolean, he: number) {
  for (const n of dangChoi(the, now)) {
    if (n.phe === null) nhapPhe(the, n, pheCanBang(the, now), now, ra, undefined, () => (bamChu(n.user) % 997) / 997);
  }
  const pha = phaLu(now, dai, lon, tranKhi(the, now, he));
  for (const phe of ['son', 'thuy'] as const) {
    const ds = dangChoi(the, now)
      .filter((n) => n.phe === phe)
      .sort((a, b) => b.canh - a.canh || lucChien(b) - lucChien(a));
    pha.chu[phe] = ds[0]?.user ?? null;
  }
  sang(the, pha, ra);
}

/** Trận khí mỗi phe theo số người đang chơi lúc mở trận — như nhau cho hai phe. */
function tranKhi(the: The, now: number, he = 1): number {
  const d = demPhe(the, now);
  return Math.round(Math.max(200, 25 * (d.son + d.thuy)) * he);
}

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
    binh: { son: 0, thuy: 0 },
    binhLuc: now,
  };
}

// ---------- Địa Cung ----------

type PhaMe = Extract<Pha, { k: 'me' }>;

function batDauMe(the: The, now: number, rand: () => number, ra: Su[], choi: NguoiChoi[]) {
  const nh = the.nhip;
  const me = taoMeDoiXung(ME_COT, ME_HANG, rand);
  const cua = cuaMe(me);
  const ds = choi.slice().sort((a, b) => b.lanCuoi - a.lanCuoi);
  const tong = doTong(ds.length);
  const pha: PhaMe = {
    k: 'me',
    den: now + nh.me,
    tong: nh.me,
    me,
    vao: cua.vao,
    ra: cua.ra,
    vt: new Map(),
    do: [],
    idKe: 1,
    conRoi: tong,
    roiKe: now,
    ruongLuc: now + nh.me * 0.4,
    daRuong: false,
    thoat: [],
  };
  sang(the, pha, ra);
  for (const n of ds) vaoMe(the, pha, n, now);
  // Một cặp rơi ngay, còn lại rơi rải rác trong 70% đầu lượt.
  roiDo(pha, rand);
  henRoi(pha, now, rand);
  ghiSuThi(the, now, ra, 'meMo', {});
  ra.push({
    k: 'doc',
    chu: 'Địa Cung Đồng Cổ mở cửa! Mỗi lần gõ lên, xuống, trái, phải là một bước. Nhặt bảo vật, ai ra Cửa Ra trước được thưởng thêm!',
  });
}

function henRoi(pha: PhaMe, now: number, rand: () => number) {
  const conLai = Math.max(1, pha.den - pha.tong * 0.3 - now);
  pha.roiKe = now + (conLai / Math.max(1, pha.conRoi / 2)) * (0.5 + rand());
}

/** Ai cũng xuống được Địa Cung. Phàm nhân (chưa có phe) đi cửa của phe đang yếu hơn — nhặt được bảo
 *  vật là kỳ ngộ, nhập môn phe ấy. */
function vaoMe(the: The, pha: PhaMe, n: NguoiChoi, now: number) {
  if (pha.vt.has(n.user) || pha.vt.size >= ME_TOI_DA) return;
  pha.vt.set(n.user, { o: pha.vao[n.phe ?? pheCanBang(the, now)], luc: now - BUOC_CACH, tui: [], thoat: false });
}

/** Thả một CẶP bảo vật vào hai ô soi gương nhau (cùng phẩm, cùng loại, cùng chỉ số): xa cửa vào (ít
 *  nhất 4 bước), không nằm cột giữa, không đè Cửa Ra, không đè món khác — hai phe luôn bằng nhau. */
function roiDo(pha: PhaMe, rand: () => number) {
  if (pha.conRoi < 2) return;
  const me = pha.me;
  const co = new Set(pha.do.map((d) => d.o));
  const giua = Math.floor(me.cot / 2);
  for (let thu = 0; thu < 40; thu++) {
    const o = Math.floor(rand() * me.cot * me.hang);
    const g = oGuong(me, o);
    if (o % me.cot === giua || co.has(o) || co.has(g)) continue;
    if (khoang(me, o, pha.vao.son) < 4 || khoang(me, o, pha.vao.thuy) < 4) continue;
    const vat = taoDo(chon(O_TRANG_BI, rand), bocPham(rand, doGan(me, o)), rand);
    pha.do.push({ id: pha.idKe++, o, loai: 'tb', vat });
    pha.do.push({ id: pha.idKe++, o: g, loai: 'tb', vat: { ...vat } });
    pha.conRoi -= 2;
    return;
  }
}

function diMe(the: The, pha: PhaMe, now: number, rand: () => number, ra: Su[]) {
  if (now >= pha.roiKe && pha.conRoi > 0) {
    if (pha.do.filter((d) => d.loai === 'tb').length <= DO_TREN_SAN - 2) roiDo(pha, rand);
    henRoi(pha, now, rand);
  }
  if (!pha.daRuong && now >= pha.ruongLuc) {
    pha.daRuong = true;
    const g = oGiua(pha.me);
    pha.do = pha.do.filter((d) => d.o !== g);
    pha.do.push({ id: pha.idKe++, o: g, loai: 'ruong' });
    ghiSuThi(the, now, ra, 'meRuong', {});
    ra.push({ k: 'doc', chu: 'Rương Đồng hiện ở lõi Địa Cung! Ai tới trước được đồ quý!' });
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
    const ruong = d.loai === 'ruong';
    // Rương: chắc chắn Địa phẩm, một phần ba là Thiên phẩm.
    const vat = d.loai === 'ruong' ? taoDo(chon(O_TRANG_BI, rand), rand() < 0.35 ? 4 : 3, rand) : d.vat;
    v.tui.push(vat);
    if (n.phe === null) {
      // Kỳ ngộ: phàm nhân nhặt được bảo vật, bước vào tiên lộ.
      const phe = pheCanBang(the, now);
      nhapPhe(the, n, phe, now, ra, undefined, rand);
      ra.push({ k: 'ky-ngo', user: n.user, phe, vat });
      ghiSuThi(the, now, ra, 'kyNgo', { ten: n.ten, vat: tenDo(vat), phe: PHE[phe].tenNgan }, phe);
    }
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
        ? `Địa Cung đóng cửa! ${thoat[0]!.ten} thoát ra đầu tiên.`
        : 'Địa Cung đóng cửa! Ai nhặt được gì cũng mang về được.',
  });
}

const THUONG_NHANH = [6, 4, 2];

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
  const lienKet = (p: Phe | null) => (p === null ? 0 : Math.min(5, Math.round(dungPhe[p] - 1 + 0.5 * npc[p])));
  for (const p of ['son', 'thuy'] as const) {
    if (dungPhe[p] === 0) continue;
    ra.push({ k: 'cong-huong', phe: p, so: dungPhe[p] });
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
    // Tu luyện bồi đắp Linh Mạch phe (Phá Quân +2).
    if (n.phe !== null) {
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

function ketKiep(the: The, pha: Extract<Pha, { k: 'kiep' }>, now: number, ra: Su[]) {
  const n = the.nguoi.get(pha.user);
  const dung = pha.chon === pha.cau.dung;
  const can = hoPhapCan(the, pha.canh, now);
  const nhoHo = !dung && soHoPhap(the, pha.ho) >= can;
  const qua = dung || nhoHo;
  if (n !== undefined) {
    n.choKiep = false;
    if (qua) {
      n.canh = pha.canh;
      the.ban = true;
      ra.push({ k: 'dot-pha', user: n.user, canh: n.canh });
      if (dung) {
        ghiSuThi(the, now, ra, 'quaKiep', { ten: n.ten, canh: tenCanh(n.canh) }, n.phe ?? undefined);
        the.phucLoc = 2;
        the.phucLocTu = n.ten;
      } else {
        ghiSuThi(the, now, ra, 'quaKiepNhoHo', { ten: n.ten, canh: tenCanh(n.canh), so: pha.ho.size }, n.phe ?? undefined);
      }
      for (const u of pha.ho) {
        const h = the.nguoi.get(u);
        if (h !== undefined) congLk(the, h, 3, now, ra);
      }
    } else {
      const a = CANH_GIOI[n.canh]!.can;
      const b = CANH_GIOI[n.canh + 1]?.can ?? a;
      n.lk = Math.max(a, n.lk - Math.round(0.15 * (b - a)));
      n.kiepLai = now + KIEP_LAI;
      the.ban = true;
      ghiSuThi(the, now, ra, 'ngaKiep', { ten: n.ten }, n.phe ?? undefined);
    }
    ra.push({ k: 'set', user: n.user, qua });
  }
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
        ? `${pha.ten} vượt kiếp, thành ${tenCanh(pha.canh)}! Cả phòng nhân đôi linh khí hai câu!`
        : `${pha.ten} trả lời trật, nhưng ${pha.ho.size} đồng đạo đã che sét. Qua kiếp!`
      : `${pha.ten} ngã kiếp rồi. Ba phút nữa thử lại nhé!`,
  });
}

function ketLu(the: The, pha: Extract<Pha, { k: 'lu' }>, now: number, ra: Su[]) {
  const thang: Phe | null = pha.son > pha.thuy ? 'son' : pha.thuy > pha.son ? 'thuy' : null;
  for (const [user, phe] of pha.nguoi) {
    const n = the.nguoi.get(user);
    if (n !== undefined) congLk(the, n, thang === null ? 8 : phe === thang ? 15 : 5, now, ra);
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
  sang(
    the,
    { k: 'lu-ket', thang, son: pha.son, thuy: pha.thuy, den: now + the.nhip.luKet, tong: the.nhip.luKet, dai: pha.dai, cong: pha.cong },
    ra,
  );
  ra.push({
    k: 'doc',
    chu: thang === null ? 'Hòa! Nước và núi giằng co.' : `${PHE[thang].ten} thắng trận lũ này!`,
  });
}

/** Nhận một món đồ (Địa Cung hoặc yêu tinh rơi): mặc nếu tốt hơn và đủ cảnh giới, không thì luyện hoá. */
function nhanDo(the: The, n: NguoiChoi, vat: TrangBi, now: number, ra: Su[]): { mac: boolean; lk: number } {
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
    const doThem = (n.canCo === null ? 0 : CO_DO[n.canCo]) + (n.phe !== null && pha.tran.hl[n.phe].thu > now ? 0.3 : 0);
    if (rand() < Math.max(0, Math.min(PHAN_DO_TOI_DA + Math.max(0, doThem), congThu(n).thu / 250 + doThem))) doDuoc.push(n.user);
    else {
      trung.push(n.user);
      // Phòng vắng (1–2 người ra tay): choáng ngắn một nửa, kẻo cả trận chỉ đứng nhìn.
      pha.choang.set(n.user, now + (ds.length <= 2 ? PHAN_CHOANG / 2 : PHAN_CHOANG));
    }
  }
  pha.phanCuoi = { luc: now, trung, doDuoc };
  ra.push({ k: 'phan-don', trung, doDuoc });
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
  const vat = taoDo(chon(O_TRANG_BI, rand), bocPham(rand, Math.min(1, gan + (pha.dai ? 0.4 : 0))), rand);
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
) {
  const thang = pha.mau <= 0;
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
  } else {
    ghiSuThi(the, now, ra, 'yeuChay', { yeu: y.ten });
  }
  sang(
    the,
    {
      k: 'yeu-ket',
      yeu: pha.yeu,
      thang,
      ketLieu: nKet?.ten ?? null,
      top: nTop?.ten ?? null,
      den: now + the.nhip.yeuKet,
      tong: the.nhip.yeuKet,
    },
    ra,
  );
  ra.push({
    k: 'doc',
    chu: thang
      ? `${y.ten} đã gục! ${nKet ? `${nKet.ten} kết liễu.` : ''}`
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
  const lich = sapToi(the.lich, now, the.lechPhut);
  if (lich !== null && lich.luc - now <= BAO_TRUOC_LICH) {
    return { ten: DAC_BIET[lich.d.loai].ten, con: lich.luc - now, dacBiet: true };
  }
  const ds = [
    { ten: 'Mùa Lũ', luc: the.luKe },
    { ten: 'Yêu Tinh', luc: the.yeuKe },
    { ten: 'Tổng kết năm', luc: the.muaKe },
    { ten: 'Địa Cung', luc: the.meKe },
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
  me: 'Hồi Xuống Địa Cung: nước rút, lò đúc đồng vua Hùng lộ ra. Đồ nhặt được tăng công thủ, dùng khi đánh yêu tinh và Đại Chiến.',
  'me-ket': 'Địa Cung vừa đóng. Ai nhặt được đồ thì lực chiến đã tăng — sắp có chỗ dùng.',
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
  if (pha.k === 'me-ket') v['ketDiaCung'] = { thoatRa: pha.thoat.map((t) => t.ten), ketLai: pha.mat };
  if (pha.k === 'lu-ket') v['ketLu'] = { thang: pha.thang === null ? 'hòa' : PHE[pha.thang].tenNgan };
  if (pha.k === 'yeu') v['yeuTinh'] = { ten: YEU[pha.yeu].ten, mau: Math.round((100 * pha.mau) / pha.mauMax) };
  if (pha.k === 'yeu-ket') v['ketYeu'] = { ten: YEU[pha.yeu].ten, ha: pha.thang, ketLieu: pha.ketLieu };
  if (the.phucLoc > 0) v['phucLoc'] = { nho: the.phucLocTu, conCau: the.phucLoc };
  if ((pha.k === 'hoi' || pha.k === 'dap') && pha.thi > 0) v['hoiThi'] = { cau: pha.thi, tren: HOI_THI_SO_CAU };
  if ((pha.k === 'lu' || pha.k === 'yeu') && pha.dai) v['suKienLon'] = pha.k === 'lu' ? 'Đại Hồng Thủy' : 'Đại Yêu Dạ';
  return v;
}
