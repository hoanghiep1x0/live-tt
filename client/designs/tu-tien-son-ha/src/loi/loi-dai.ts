/** LÔI ĐÀI ĐỒNG MÔN — tỉ thí giữa đệ tử cùng tông trên sân thí luyện.
 *
 *  - **Bảng Top Lôi Đài** mỗi tông: xếp theo cảnh giới (cao đứng trên), rồi điểm Lôi Đài, rồi lực chiến. Đột phá là
 *    tự lên hạng; cùng cảnh giới thì thắng khiêu chiến mới vượt lên.
 *  - **Khiêu chiến bằng quà**: mỗi hạng trên Top ứng với một món quà (`QUA_THACH`: #1 Hand Heart … #8 You're awesome).
 *    Đệ tử tặng đúng món đó là khiêu chiến đúng người ở hạng đó (phải đứng dưới người đó). Nhiều người khiêu chiến
 *    thì xếp hàng chờ; tới lượt tông mình tu luyện thì lần lượt lên đài.
 *  - Người bị khiêu chiến **không online** thì nhân vật của họ **tự đấu** (tự công, thủ, tung tuyệt kỹ như người thật).
 *  - Một trận tối đa 45 giây: hai bên tự ra đòn theo lực chiến; đấu thủ online gõ **1** công · **2** thủ · **3** tuyệt kỹ.
 *    Tim của đấu thủ hồi chút máu; quà của đấu thủ giữa trận: dưới 10 xu Bạo Kích, 10–49 xu hồi 30% máu, từ 50 xu
 *    tuyệt kỹ ngay.
 *  - Người khiêu chiến thắng: điểm Lôi Đài vượt người bị khiêu chiến (cùng cảnh giới thì lên hạng). Người thắng được
 *    linh thạch, linh khí. Thua không mất gì.
 *  - Gõ **8**: xem bảng Top Lôi Đài của tông mình (hạng, tên, quà để khiêu chiến). */

import type { NguoiChoi, Su, The } from './core';
import { congLk, dangChoi, lucChien, npcCua, pheTuLuyen, voCua } from './core';
import { CONG_PHAP, HE_CP } from './tang-bao';
import { SO_NPC, type Phe } from './the-gioi';

export const LD_SO = '8';
export const LD_TRAN_LAU = 45_000;
/** Mỗi bên tự ra một đòn mỗi `LD_DON_CACH`. */
export const LD_DON_CACH = 1_500;
export const LD_MAU = 1_000;
/** Đòn tự động khi hai bên ngang sức (máu 1000 → hết trong ~25 giây nếu không ai làm gì). */
export const LD_DON_GOC = 60;
export const LD_HOI = { cong: 3_000, thu: 6_000 } as const;
export const LD_THU_LAU = 3_000;
export const LD_NO_DAY = 100;
export const LD_TIM_HOI = 0.01;
export const LD_TIM_TOI_DA = 0.2;
/** Thưởng người thắng một trận. Mỗi người tối đa `LD_THUONG_TOI_DA` trận thắng có thưởng mỗi phiên. */
export const LD_THANG = { thach: 8, lk: 5 } as const;
export const LD_THUONG_TOI_DA = 10;
/** Nghỉ giữa hai trận (cho người xem kịp thấy kết quả). */
export const LD_NGHI = 4_000;
/** Hàng chờ khiêu chiến tối đa, và một lời khiêu chiến chờ tối đa bao lâu. */
export const LD_HANG_TOI_DA = 12;
export const LD_HANG_LAU = 60 * 60_000;
/** Giờ Lôi Đài mặc định (mục lịch `loi-dai` không ghi số phút). */
export const LD_GIO_LAU = 5 * 60_000;
/** Giờ Lôi Đài còn ít hơn chừng này thì không mở trận mới (trận nào cũng đánh xong trong giờ). */
export const LD_GIO_CUOI = 20_000;
/** Gõ 8: bảng Top hiện bao lâu. */
export const LD_XEM_LAU = 12_000;

/** Quà khiêu chiến theo hạng: phần tử i là quà để khiêu chiến người hạng i + 1 (hạng cao quà đắt). */
export const QUA_THACH: readonly { ten: string; xu: number }[] = [
  { ten: 'Hand Heart', xu: 100 },
  { ten: 'Doughnut', xu: 30 },
  { ten: 'Perfume', xu: 20 },
  { ten: 'Rosa', xu: 10 },
  { ten: 'Finger Heart', xu: 5 },
  { ten: 'Rose', xu: 1 },
  { ten: 'GG', xu: 1 },
  { ten: "You're awesome", xu: 1 },
];

export const TEN_DON: Record<Phe, string> = { son: 'Sơn Băng Chưởng', thuy: 'Thủy Long Chưởng' };
export const TEN_TUYET: Record<Phe, string> = { son: 'Vạn Sơn Áp Đỉnh', thuy: 'Hồng Thủy Ngập Trời' };

export interface DauThu {
  user: string;
  ten: string;
  npc: boolean;
  /** Không online: nhân vật tự đấu. */
  tuDong: boolean;
  mau: number;
  no: number;
  luc: number;
  thuDen: number;
  hoiCong: number;
  hoiThu: number;
  timHoi: number;
  /** Sĩ khí: khán giả tặng quà cổ vũ (cộng theo xu); chạm mốc `SI_KHI_MOC` thì nhân vật ra hành động. */
  siKhi: number;
  /** Đang thủ: đòn trúng còn bấy nhiêu phần (mặc định 0,5; công pháp hộ thể giảm thêm). */
  giam?: number;
}

export interface TranLd {
  /** `a` là người bị khiêu chiến (đứng bên trái), `b` người khiêu chiến (bên phải). */
  a: DauThu;
  b: DauThu;
  batDau: number;
  den: number;
  donKe: number;
  /** Hạng của người bị khiêu chiến lúc vào trận. */
  hang: number;
}

export interface LoiDai {
  phe: Phe;
  tran: TranLd | null;
  /** Lúc trận trước kết thúc (để nghỉ `LD_NGHI`). */
  ranhTu: number;
  /** Đòn / chiêu vừa ra (chữ bay trên đầu). */
  don: { tu: string; toi: string; dmg: number; chieu: string | null; luc: number } | null;
  /** Kết trận gần nhất. */
  ket: { thang: string; thua: string; ten: string; luc: number; lenHang: number | null } | null;
}

/** Một lời khiêu chiến đang chờ. */
export interface KhieuChien {
  user: string;
  dich: string;
  phe: Phe;
  luc: number;
}

export type SuLd =
  | { k: 'ld-don'; tu: string; toi: string; dmg: number; chieu: string | null }
  | { k: 'ld-ket'; thang: string; thua: string; lenHang: number | null }
  /** Sĩ khí của đấu thủ `user` chạm mốc `ten` nhờ quà cổ vũ của `tu`. */
  | { k: 'ld-si-khi'; user: string; tu: string; ten: string; siKhi: number };

const laTuLuyen = (the: The) => the.pha.k === 'cho' || the.pha.k === 'hoi' || the.pha.k === 'dap';

/** Đang ở màn Tỉ Thí Lôi Đài: có trận trên đài, hoặc đang trong giờ Lôi Đài (kể cả lúc nghỉ giữa hai trận) —
 *  để màn không nháy về sân tu luyện giữa các trận. Lớp vẽ, HUD, thanh điều khiển cùng đọc hàm này. */
export function tiThiMo(the: The): boolean {
  const ld = the.loiDai;
  if (ld === null) return false;
  return ld.tran !== null || ((the.ldGio !== null || (the.giu && the.ldGiu)) && laTuLuyen(the));
}

/** Đang trong giờ Lôi Đài (lịch) hoặc người vận hành giữ màn tỉ thí: được mở trận. */
// Đang giữ màn thì chỉ theo `ldGiu` (giữ tu luyện → không mở trận; giữ tỉ thí → mở trận liên tục).
const moDai = (the: The, now: number) => (the.giu ? the.ldGiu : the.ldGio !== null && now < the.ldGio.den - LD_GIO_CUOI);

// ---------- Bảng Top ----------

/** Bảng Top Lôi Đài của một tông: mọi đệ tử của tông (online hay không), cảnh giới → điểm → lực chiến. */
export function bangTop(the: The, phe: Phe): NguoiChoi[] {
  const d = (u: string) => the.ldDiem.get(u) ?? 0;
  return [...the.nguoi.values()]
    .filter((n) => n.phe === phe)
    .sort((x, y) => y.canh - x.canh || d(y.user) - d(x.user) || lucChien(y) - lucChien(x) || (x.user < y.user ? -1 : 1));
}

/** Hạng (1 là đầu) của một người trong tông mình; 0 nếu không có. */
export function hangCua(the: The, u: string): number {
  const n = the.nguoi.get(u);
  if (n?.phe == null) return 0;
  return bangTop(the, n.phe).findIndex((x) => x.user === u) + 1;
}

/** Quà ứng với hạng `h` (1-based), hoặc undefined nếu hạng đó không khiêu chiến bằng quà được. */
export const quaHang = (h: number) => QUA_THACH[h - 1];

// ---------- Trận ----------

const online = (the: The, u: string, now: number) => dangChoi(the, now).some((n) => n.user === u);

function dauThu(n: NguoiChoi, npc: boolean, tuDong: boolean): DauThu {
  return { user: n.user, ten: n.ten, npc, tuDong, mau: LD_MAU, no: 0, luc: Math.max(1, lucChien(n)), thuDen: 0, hoiCong: 0, hoiThu: 0, timHoi: 0, siKhi: 0 };
}

const dangDau = (ld: LoiDai | null, u: string) => ld?.tran != null && (ld.tran.a.user === u || ld.tran.b.user === u);

/** Người này có đang đứng trên đài không — lớp vẽ dùng để tách khỏi đám khán giả. */
export function trenDai(the: The, u: string): boolean {
  return dangDau(the.loiDai, u);
}

function batTran(the: The, phe: Phe, dich: NguoiChoi, thach: NguoiChoi, now: number, ra: Su[], npc = false) {
  if (the.loiDai === null || the.loiDai.phe !== phe) the.loiDai = { phe, tran: null, ranhTu: now, don: null, ket: null };
  const ld = the.loiDai;
  const hang = hangCua(the, dich.user);
  ld.tran = {
    a: dauThu(dich, npc, npc || !online(the, dich.user, now)),
    b: dauThu(thach, false, false),
    batDau: now,
    den: now + LD_TRAN_LAU,
    donKe: now + 1_200,
    hang,
  };
  ld.ket = null;
  ra.push({ k: 'doc', chu: `${thach.ten} khiêu chiến ${hang > 0 ? `hạng ${hang} ` : ''}${dich.ten}!` });
}

function danh(ld: LoiDai, tu: DauThu, toi: DauThu, heSo: number, chieu: string | null, now: number, rand: () => number, ra: Su[]) {
  const r = tu.luc / (tu.luc + toi.luc);
  let dmg = LD_DON_GOC * Math.pow(2 * r, 1.5) * heSo * (0.8 + 0.4 * rand());
  if (toi.thuDen > now) dmg *= toi.giam ?? 0.5;
  dmg = Math.max(1, Math.round(dmg));
  toi.mau = Math.max(0, toi.mau - dmg);
  if (chieu === null) tu.no = Math.min(LD_NO_DAY, tu.no + 8);
  toi.no = Math.min(LD_NO_DAY, toi.no + 6);
  ld.don = { tu: tu.user, toi: toi.user, dmg, chieu, luc: now };
  ra.push({ k: 'ld-don', tu: tu.user, toi: toi.user, dmg, chieu });
}

/** Một ô chiêu trên đài: tên, dòng tác dụng ngắn, và hệ số / bậc lấy từ công pháp người đó ĐÃ MUA lúc tu luyện. */
export interface ChieuLd {
  ten: string;
  mo: string;
  /** Hệ số đòn (công, tuyệt kỹ). */
  heSo: number;
  /** Ô thủ: đòn trúng còn bấy nhiêu phần trong lúc thủ. */
  giam: number;
  /** Ô thủ: hồi bấy nhiêu phần máu khi bấm (công pháp hệ y). */
  hoi: number;
  /** Có lấy từ công pháp đã mua không (false = chiêu mặc định của tông). */
  mua: boolean;
}

const pt = (x: number) => `${Math.round(x * 100)}%`;

/** Bộ ba chiêu trên đài của một đấu thủ, theo các công pháp người đó đã mua (Tàng Kinh Các, mã C1–C9):
 *  - **1 công**: môn đánh (hệ tướng / quân) đang dùng, không thì môn đánh bậc thấp nhất đã có; đòn ×(1 + đòn·bậc).
 *  - **2 thủ**: môn hộ thể (hệ vệ) bậc cao nhất → đỡ thêm; không có thì môn hồi (hệ y) → thủ kèm hồi máu.
 *  - **3 tuyệt kỹ**: môn đánh bậc CAO NHẤT đã có (khác ô 1 nếu có hai môn trở lên); ×4 nhân thêm sức môn đó.
 *  Chưa mua gì thì là chiêu mặc định của tông (chưởng, Hộ Thể, tuyệt kỹ tông) như cũ. */
export function boChieu(the: The, d: Pick<DauThu, 'user'>, phe: Phe): { cong: ChieuLd; thu: ChieuLd; tuyet: ChieuLd } {
  const n = the.nguoi.get(d.user);
  const co = n === undefined ? [] : CONG_PHAP.map((m, j) => ({ m, so: j + 1 })).filter((x) => (n.cpCo & (1 << x.so)) !== 0 || n.cp === x.so);
  const danhDs = co.filter((x) => x.m.he === 'tuong' || x.m.he === 'quan').sort((a, b) => a.m.bac - b.m.bac);
  const sucDanh = (x: (typeof co)[number]) => 1 + HE_CP[x.m.he].don * x.m.bac;
  const monCong = danhDs.find((x) => x.so === n?.cp) ?? danhDs[0];
  const monTuyet = danhDs.length > 1 ? [...danhDs].reverse().find((x) => x !== monCong) : monCong;
  const ve = co.filter((x) => x.m.he === 've').sort((a, b) => b.m.bac - a.m.bac)[0];
  const y = co.filter((x) => x.m.he === 'y').sort((a, b) => b.m.bac - a.m.bac)[0];
  // Chưa có môn đánh: võ công cũ theo căn cơ (chỉ khi chưa chọn công pháp nào), không thì chưởng của tông.
  const congMd = (n !== undefined && n.cp === 0 ? voCua(n).ten : null) ?? TEN_DON[phe];
  const cong: ChieuLd =
    monCong !== undefined
      ? { ten: monCong.m.ten[phe], mo: `C${monCong.so} · đòn +${pt(sucDanh(monCong) - 1)}`, heSo: sucDanh(monCong), giam: 0.5, hoi: 0, mua: true }
      : { ten: congMd, mo: 'công', heSo: 1, giam: 0.5, hoi: 0, mua: false };
  const thu: ChieuLd =
    ve !== undefined
      ? (() => {
          const giam = Math.max(0.2, 0.5 - HE_CP.ve.do * ve.m.bac);
          return { ten: ve.m.ten[phe], mo: `C${ve.so} · đỡ ${pt(1 - giam)} đòn 3 giây`, heSo: 1, giam, hoi: 0, mua: true };
        })()
      : y !== undefined
        ? { ten: y.m.ten[phe], mo: `C${y.so} · hồi ${pt(HE_CP.y.hoi * y.m.bac)} máu + đỡ nửa đòn`, heSo: 1, giam: 0.5, hoi: HE_CP.y.hoi * y.m.bac, mua: true }
        : { ten: 'Hộ Thể', mo: 'đỡ nửa đòn 3 giây', heSo: 1, giam: 0.5, hoi: 0, mua: false };
  const tuyet: ChieuLd =
    monTuyet !== undefined
      ? { ten: monTuyet.m.ten[phe], mo: `C${monTuyet.so} · ×4 +${pt(sucDanh(monTuyet) - 1)}`, heSo: 4 * sucDanh(monTuyet), giam: 0.5, hoi: 0, mua: true }
      : { ten: TEN_TUYET[phe], mo: 'tuyệt kỹ tông', heSo: 4, giam: 0.5, hoi: 0, mua: false };
  return { cong, thu, tuyet };
}

/** Tên đòn công (gõ 1) của đấu thủ: theo bộ chiêu đã mua (`boChieu`). */
export const tenDon = (the: The, d: Pick<DauThu, 'user'>, phe: Phe): string => boChieu(the, d, phe).cong.ten;

function tuyetKy(the: The, ld: LoiDai, tu: DauThu, toi: DauThu, now: number, rand: () => number, ra: Su[]) {
  tu.no = 0;
  const c = boChieu(the, tu, ld.phe).tuyet;
  const ten = c.ten;
  danh(ld, tu, toi, c.heSo, ten, now, rand, ra);
  the.hdMoi = { user: tu.user, ten: tu.ten, viec: 'Tuyệt kỹ', chu: `${ten} · −${ld.don?.dmg ?? 0}`, luc: now, hiem: true };
}

function cong(the: The, ld: LoiDai, tu: DauThu, toi: DauThu, now: number, rand: () => number, ra: Su[]) {
  if (now < tu.hoiCong) return;
  tu.hoiCong = now + LD_HOI.cong;
  tu.no = Math.min(LD_NO_DAY, tu.no + 10);
  const c = boChieu(the, tu, ld.phe).cong;
  danh(ld, tu, toi, c.heSo, c.ten, now, rand, ra);
}

function thu(the: The, ld: LoiDai, tu: DauThu, now: number) {
  if (now < tu.hoiThu) return;
  const c = boChieu(the, tu, ld.phe).thu;
  tu.hoiThu = now + LD_HOI.thu;
  tu.thuDen = now + LD_THU_LAU;
  tu.giam = c.giam;
  if (c.hoi > 0) tu.mau = Math.min(LD_MAU, tu.mau + c.hoi * LD_MAU);
}

const cuaToi = (tran: TranLd, u: string): [DauThu, DauThu] | null =>
  tran.a.user === u ? [tran.a, tran.b] : tran.b.user === u ? [tran.b, tran.a] : null;

/** Đấu thủ gõ 1 / 2 / 3 trong trận. Trả về true nếu tin này là lệnh đấu (đã dùng). */
export function chieuDai(the: The, n: NguoiChoi, so: string, now: number, rand: () => number, ra: Su[]): boolean {
  const ld = the.loiDai;
  const tran = ld?.tran;
  if (ld == null || tran == null) return false;
  const c = cuaToi(tran, n.user);
  if (c === null) return false;
  const [tu, toi] = c;
  // Người tự đấu (vắng) vừa quay lại và gõ lệnh: tự cầm lấy nhân vật.
  tu.tuDong = false;
  if (so === '1') cong(the, ld, tu, toi, now, rand, ra);
  else if (so === '2') thu(the, ld, tu, now);
  else if (tu.no >= LD_NO_DAY) tuyetKy(the, ld, tu, toi, now, rand, ra);
  ketNeuXong(the, ld, now, ra);
  return true;
}

/** Nhân vật tự đấu (người vắng, trưởng lão): nộ đầy thì tung tuyệt kỹ, hồi chiêu xong thì công, thỉnh thoảng thủ. */
function tuDau(the: The, ld: LoiDai, tu: DauThu, toi: DauThu, now: number, rand: () => number, ra: Su[]) {
  if (tu.mau <= 0 || toi.mau <= 0) return;
  if (tu.no >= LD_NO_DAY) tuyetKy(the, ld, tu, toi, now, rand, ra);
  else if (now >= tu.hoiCong && rand() < 0.6) cong(the, ld, tu, toi, now, rand, ra);
  else if (now >= tu.hoiThu && tu.mau < LD_MAU * 0.5 && rand() < 0.3) thu(the, ld, tu, now);
}

/** Tim của đấu thủ: hồi 1% máu mỗi tim, tối đa 20% mỗi trận. */
export function timDai(the: The, n: NguoiChoi, so: number): void {
  const tran = the.loiDai?.tran;
  if (tran == null) return;
  const c = cuaToi(tran, n.user);
  if (c === null) return;
  const [tu] = c;
  const con = LD_TIM_TOI_DA * LD_MAU - tu.timHoi;
  const hoi = Math.min(con, so * LD_TIM_HOI * LD_MAU, LD_MAU - tu.mau);
  if (hoi <= 0) return;
  tu.mau += hoi;
  tu.timHoi += hoi;
}

/** Mốc sĩ khí (tổng xu quà cổ vũ trong trận) và hành động khi chạm mốc — mỗi mốc một lần mỗi trận. */
export const SI_KHI_MOC: readonly { moc: number; ten: string; chu: string }[] = [
  { moc: 5, ten: 'Hăng Hái', chu: '+30 nộ' },
  { moc: 20, ten: 'Bạo Kích', chu: 'đòn ×2' },
  { moc: 50, ten: 'Hồi Sức', chu: '+20% máu' },
  { moc: 100, ten: 'Ngút Trời', chu: 'tuyệt kỹ ngay' },
];

/** Khán giả (không phải đấu thủ) tặng quà lúc đang đấu: cổ vũ một đấu thủ ngẫu nhiên, cộng sĩ khí theo xu; chạm
 *  mốc nào thì nhân vật ra hành động của mốc đó. */
function coVu(the: The, n: NguoiChoi, xu: number, now: number, rand: () => number, ra: Su[]) {
  const ld = the.loiDai;
  const tran = ld?.tran;
  if (ld == null || tran == null) return;
  const [tu, toi] = rand() < 0.5 ? [tran.a, tran.b] : [tran.b, tran.a];
  const truoc = tu.siKhi;
  tu.siKhi += Math.max(1, xu);
  for (const m of SI_KHI_MOC) {
    if (truoc >= m.moc || tu.siKhi < m.moc || tu.mau <= 0 || toi.mau <= 0) continue;
    if (m.moc === 5) tu.no = Math.min(LD_NO_DAY, tu.no + 30);
    else if (m.moc === 20) danh(ld, tu, toi, 2, 'Bạo Kích', now, rand, ra);
    else if (m.moc === 50) tu.mau = Math.min(LD_MAU, tu.mau + 0.2 * LD_MAU);
    else tuyetKy(the, ld, tu, toi, now, rand, ra);
    ra.push({ k: 'ld-si-khi', user: tu.user, tu: n.user, ten: m.ten, siKhi: tu.siKhi });
    if (m.moc !== 100) the.hdMoi = { user: tu.user, ten: tu.ten, viec: 'Lôi Đài', chu: `🔥 ${m.ten} · ${n.ten} cổ vũ`, luc: now, hiem: m.moc >= 50 };
  }
  ketNeuXong(the, ld, now, ra);
}

/** Quà: đấu thủ đang đấu thì ra chiêu (dưới 10 xu Bạo Kích, 10–49 hồi 30% máu, từ 50 tuyệt kỹ); không thì nếu là
 *  quà khiêu chiến (`QUA_THACH`) thì khiêu chiến người ở hạng ứng với quà đó. */
export function quaDai(the: The, n: NguoiChoi, xu: number, tenQua: string, now: number, rand: () => number, ra: Su[]): void {
  const ld = the.loiDai;
  const tran = ld?.tran;
  const c = ld != null && tran != null ? cuaToi(tran, n.user) : null;
  if (ld != null && tran != null && c !== null) {
    const [tu, toi] = c;
    if (xu >= 50) tuyetKy(the, ld, tu, toi, now, rand, ra);
    else if (xu >= 10) tu.mau = Math.min(LD_MAU, tu.mau + 0.3 * LD_MAU);
    else danh(ld, tu, toi, 2, 'Bạo Kích', now, rand, ra);
    ketNeuXong(the, ld, now, ra);
    return;
  }
  // Không phải quà khiêu chiến hợp lệ mà đang có trận: quà cổ vũ, tăng sĩ khí một đấu thủ ngẫu nhiên.
  if (!khieuChien(the, n, tenQua, now, ra)) coVu(the, n, xu, now, rand, ra);
}

/** Tặng quà khiêu chiến: tìm hạng ứng với quà, xếp vào hàng chờ nếu hợp lệ. Trả về true nếu đã nhận lời khiêu chiến. */
export function khieuChien(the: The, n: NguoiChoi, tenQua: string, now: number, ra: Su[]): boolean {
  if (n.phe === null) return false;
  const i = QUA_THACH.findIndex((q) => q.ten.toLowerCase() === tenQua.trim().toLowerCase());
  if (i < 0) return false;
  const top = bangTop(the, n.phe);
  const dich = top[i];
  const hangMinh = top.findIndex((x) => x.user === n.user);
  // Chỉ khiêu chiến người đứng trên mình.
  if (dich === undefined || dich.user === n.user || hangMinh <= i) return false;
  if (the.ldHang.some((k) => k.user === n.user) || dangDau(the.loiDai, n.user)) return false;
  if (the.ldHang.length >= LD_HANG_TOI_DA) return false;
  the.ldHang.push({ user: n.user, dich: dich.user, phe: n.phe, luc: now });
  const cho = the.ldHang.filter((k) => k.phe === n.phe).length - 1 + (the.loiDai?.tran != null ? 1 : 0);
  // Ngoài giờ Lôi Đài: lời khiêu chiến chỉ xếp hàng, tới giờ Lôi Đài trong lịch mới lên đài.
  const gio = the.ldGio !== null ? '' : ' · đấu giờ Lôi Đài';
  the.hdMoi = { user: n.user, ten: n.ten, viec: 'Khiêu chiến', chu: `hạng ${i + 1} ${dich.ten}${cho > 0 ? ` · chờ ${cho} trận` : ''}${gio}`, luc: now, hiem: i < 3 };
  the.ldXem = { phe: n.phe, den: now + LD_XEM_LAU };
  ra.push({ k: 'doc', chu: `${n.ten} khiêu chiến hạng ${i + 1} ${dich.ten}!` });
  return true;
}

/** Gõ 8: hiện bảng Top Lôi Đài của tông mình. */
export function xemTop(the: The, n: NguoiChoi, now: number): void {
  if (n.phe === null) return;
  the.ldXem = { phe: n.phe, den: now + LD_XEM_LAU };
}

function thuong(the: The, u: string, now: number, ra: Su[]): boolean {
  const n = the.nguoi.get(u);
  if (n === undefined) return false;
  const da = the.ldThuong.get(u) ?? 0;
  if (da >= LD_THUONG_TOI_DA) return false;
  the.ldThuong.set(u, da + 1);
  n.tinChi += LD_THANG.thach;
  congLk(the, n, LD_THANG.lk, now, ra);
  the.ban = true;
  return true;
}

function ketTran(the: The, ld: LoiDai, now: number, ra: Su[]) {
  const tran = ld.tran;
  if (tran === null) return;
  // Bằng máu thì người bị khiêu chiến giữ hạng.
  const bThang = tran.b.mau > tran.a.mau;
  const [w, l] = bThang ? [tran.b, tran.a] : [tran.a, tran.b];
  ld.tran = null;
  ld.ranhTu = now;
  if (!w.npc) thuong(the, w.user, now, ra);
  let lenHang: number | null = null;
  if (bThang && !tran.a.npc) {
    // Người khiêu chiến thắng: điểm vượt người bị khiêu chiến (cùng cảnh giới thì đứng trên).
    const truoc = hangCua(the, w.user);
    the.ldDiem.set(w.user, Math.max(the.ldDiem.get(w.user) ?? 0, the.ldDiem.get(l.user) ?? 0) + 1);
    the.ban = true;
    const sau = hangCua(the, w.user);
    if (sau > 0 && sau < truoc) lenHang = sau;
  }
  ld.ket = { thang: w.user, thua: l.user, ten: w.ten, luc: now, lenHang };
  the.hdMoi = {
    user: w.user,
    ten: w.ten,
    viec: 'Lôi Đài',
    chu: lenHang !== null ? `thắng ${l.ten} · lên hạng ${lenHang}!` : bThang ? `thắng ${l.ten}` : `giữ hạng · thắng ${l.ten}`,
    luc: now,
    hiem: lenHang !== null && lenHang <= 3,
  };
  ra.push({ k: 'ld-ket', thang: w.user, thua: l.user, lenHang });
  ra.push({ k: 'doc', chu: lenHang !== null ? `${w.ten} thắng ${l.ten}, lên hạng ${lenHang}!` : `${w.ten} thắng ${l.ten}!` });
}

function ketNeuXong(the: The, ld: LoiDai, now: number, ra: Su[]) {
  const t = ld.tran;
  if (t !== null && (t.a.mau <= 0 || t.b.mau <= 0 || now >= t.den)) ketTran(the, ld, now, ra);
}

/** Nhịp đồng hồ: ra đòn tự động, nhân vật vắng tự đấu, kết trận, gọi lời khiêu chiến kế tiếp, đóng đài khi đổi lượt. */
export function buocLoiDai(the: The, now: number, rand: () => number, ra: Su[]): void {
  the.ldHang = the.ldHang.filter((k) => now - k.luc < LD_HANG_LAU);
  if (the.ldXem !== null && now >= the.ldXem.den) the.ldXem = null;
  if (the.ldGio !== null && (now >= the.ldGio.den || !laTuLuyen(the))) the.ldGio = null;
  const ld = the.loiDai;
  if (ld !== null && (!laTuLuyen(the) || pheTuLuyen(the, now).phe !== ld.phe)) {
    if (ld.tran !== null) ketTran(the, ld, now, ra);
    the.loiDai = null;
    return;
  }
  const tran = ld?.tran;
  if (ld != null && tran != null) {
    while (now >= tran.donKe && ld.tran === tran) {
      tran.donKe += LD_DON_CACH;
      danh(ld, tran.a, tran.b, 1, null, now, rand, ra);
      if (tran.b.mau > 0) danh(ld, tran.b, tran.a, 1, null, now, rand, ra);
      if (tran.a.tuDong) tuDau(the, ld, tran.a, tran.b, now, rand, ra);
      if (tran.b.tuDong) tuDau(the, ld, tran.b, tran.a, now, rand, ra);
      ketNeuXong(the, ld, now, ra);
    }
    if (ld.tran !== null) ketNeuXong(the, ld, now, ra);
    return;
  }
  // Không có trận: chỉ trong giờ Lôi Đài (hoặc đang giữ màn tỉ thí) mới gọi lời khiêu chiến đầu tiên của tông
  // đang tới lượt; ngoài giờ, quà khiêu chiến chỉ xếp hàng.
  if (!laTuLuyen(the) || !moDai(the, now)) return;
  if (ld != null && now - ld.ranhTu < LD_NGHI) return;
  const phe = pheTuLuyen(the, now).phe;
  for (let i = 0; i < the.ldHang.length; i++) {
    const k = the.ldHang[i]!;
    if (k.phe !== phe) continue;
    const thach = the.nguoi.get(k.user);
    const dich = the.nguoi.get(k.dich);
    const hong = thach === undefined || dich === undefined || thach.phe !== phe || dich.phe !== phe;
    if (hong) {
      the.ldHang.splice(i--, 1);
      continue;
    }
    // Người khiêu chiến tạm vắng: giữ chỗ, gọi người sau.
    if (!online(the, k.user, now)) continue;
    the.ldHang.splice(i, 1);
    batTran(the, phe, dich, thach, now, ra);
    return;
  }
  // Hết lời khiêu chiến mà còn giờ Lôi Đài (hoặc đang giữ màn tỉ thí): hai đồng môn liền hạng đang online lên
  // đấu giao hữu, để màn Tỉ Thí chạy liên tục, không rơi về tu luyện giữa giờ.
  tranTuDo(the, phe, now, rand, ra);
}

/** Đấu giao hữu trong giờ Lôi Đài: bốc ngẫu nhiên hai người liền hạng (người dưới thách người trên) trong 8 người
 *  online đứng đầu tông; tông chưa đủ hai người online thì như "Nhảy tới tỉ thí" (`moTiThi`, có thể đấu trưởng lão). */
function tranTuDo(the: The, phe: Phe, now: number, rand: () => number, ra: Su[]): boolean {
  const top = bangTop(the, phe)
    .filter((n) => online(the, n.user, now))
    .slice(0, 8);
  if (top.length < 2) return moTiThi(the, now, ra);
  const i = Math.floor(rand() * (top.length - 1));
  batTran(the, phe, top[i]!, top[i + 1]!, now, ra);
  return true;
}

/** Người vận hành bấm "Nhảy tới… → Tỉ thí tông môn": hạng 2 khiêu chiến hạng 1 của tông đang tu luyện ngay.
 *  Tông chỉ có một đệ tử thì trưởng lão NPC lên đấu (để xem thử màn). */
export function moTiThi(the: The, now: number, ra: Su[]): boolean {
  if (!laTuLuyen(the)) return false;
  const phe = pheTuLuyen(the, now).phe;
  const top = bangTop(the, phe);
  const [mot, hai] = top;
  if (mot === undefined) return false;
  if (hai !== undefined) {
    batTran(the, phe, mot, hai, now, ra);
    return true;
  }
  const npc = npcCua(phe, SO_NPC).reduce<NguoiChoi | undefined>((x, y) => (x === undefined || Math.abs(y.canh - mot.canh) < Math.abs(x.canh - mot.canh) ? y : x), undefined);
  if (npc === undefined) return false;
  batTran(the, phe, npc, mot, now, ra, true);
  the.loiDai!.tran!.a.luc = Math.max(1, Math.round(the.loiDai!.tran!.b.luc * 0.9));
  return true;
}

/** Tìm nhân vật đấu thủ (cả trưởng lão NPC) để lớp vẽ bày lên đài. */
export function nguoiDai(the: The, u: string, phe: Phe): NguoiChoi | undefined {
  return the.nguoi.get(u) ?? npcCua(phe, SO_NPC).find((n) => n.user === u);
}
