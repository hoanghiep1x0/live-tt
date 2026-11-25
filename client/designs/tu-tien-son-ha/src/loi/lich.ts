/** Lịch trình hằng ngày — THUẦN. Người vận hành gõ mỗi dòng một việc: giờ · ngày · loại · (phe):
 *
 *    xx:05 moi-gio ai              Ải Nhập Môn phút 05 mỗi giờ
 *    20:00 hang-ngay yeu-ngu son   20:00 mỗi ngày, Sơn Tông đánh Ngư Tinh
 *    20:30 hang-ngay pk            Đại Chiến
 *    21:00 cn dai-yeu              Chủ nhật: Đại Yêu Dạ
 *
 *  Loại: ai, dia-cung, pk, yeu-ngu, yeu-ho, yeu-moc (kèm son / thuy / ca), dai-yeu, dai-lu, hoi-thi,
 *  phuc-loc. Ngày: hang-ngay, moi-gio (giờ viết xx), cn, t2…t7 (nhiều ngày cách dấu phẩy).
 *
 *  Giờ là giờ địa phương của máy phát. Lõi không đọc đồng hồ hệ thống: độ lệch múi giờ
 *  được tiêm vào (`lechPhut`, đúng nghĩa `Date.prototype.getTimezoneOffset`). */

import { DAC_BIET, PHE, YEU, type LoaiDacBiet, type Phe, type YeuId } from './the-gioi';

export interface DongLich {
  gio: number;
  phut: number;
  /** 0 = Chủ nhật … 6 = thứ Bảy. Rỗng là mỗi ngày. */
  thu: number[];
  loai: LoaiDacBiet;
  /** Đánh yêu tinh: phe nào đánh (null là cả hai tông). */
  phe: Phe | null;
  /** Lặp mỗi giờ ở phút `phut`. */
  moiGio: boolean;
  /** Dòng gốc, để báo lỗi và làm khoá chống chạy lặp. */
  goc: string;
}

const PHE_LICH: Record<string, Phe | null> = { son: 'son', nui: 'son', s: 'son', thuy: 'thuy', nuoc: 'thuy', t: 'thuy', ca: null, hai: null };

/** Tên một dòng lịch trình cho màn và MC: "Ngư Tinh Biển Đông · Sơn Tông". */
export function tenLich(d: Pick<DongLich, 'loai' | 'phe'>): string {
  const ten = DAC_BIET[d.loai].ten;
  if (!d.loai.startsWith('yeu-')) return ten;
  return `${ten} · ${d.phe === null ? 'hai tông' : PHE[d.phe].tenNgan}`;
}

/** Yêu tinh của một dòng `yeu-…`. */
export const yeuCuaLich = (loai: LoaiDacBiet): YeuId | null =>
  loai.startsWith('yeu-') && (loai.slice(4) as YeuId) in YEU ? (loai.slice(4) as YeuId) : null;

/** Tới giờ mà phòng chưa mở thì còn bắt kịp trong khoảng này; quá thì bỏ, chờ lần sau. */
export const CUA_SO_BAT_KIP = 10 * 60_000;
/** Báo trước trên đầu màn. */
export const BAO_TRUOC = 5 * 60_000;

const NGAY: Record<string, number> = { cn: 0, t2: 1, t3: 2, t4: 3, t5: 4, t6: 5, t7: 6 };
const MOI_NGAY = new Set(['hang-ngay', 'moi-ngay', '*', 'hangngay']);
const MOI_GIO = new Set(['moi-gio', 'hang-gio', 'moigio']);

function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function docLich(chu: string): { ds: DongLich[]; loi: string[] } {
  const ds: DongLich[] = [];
  const loi: string[] = [];
  for (const dong of chu.split(/\r?\n/)) {
    const goc = dong.trim();
    if (goc === '' || goc.startsWith('#')) continue;
    const phan = boDau(goc).split(/\s+/);
    const m = /^(\d{1,2}|xx|\*\*)?[:h](\d{2})?$/.exec(phan[0] ?? '');
    if (m === null || phan.length < 3) {
      loi.push(`"${goc}": cần dạng "20:00 hang-ngay pk" hoặc "xx:05 moi-gio ai"`);
      continue;
    }
    const moiGio = MOI_GIO.has(phan[1]!);
    if (!moiGio && (m[1] === undefined || m[1] === 'xx' || m[1] === '**')) {
      loi.push(`"${goc}": giờ "xx" chỉ dùng với moi-gio`);
      continue;
    }
    const gio = moiGio ? 0 : Number(m[1]);
    const phut = Number(m[2] ?? 0);
    if (gio > 23 || phut > 59) {
      loi.push(`"${goc}": giờ không hợp lệ`);
      continue;
    }
    const ngay = phan[1]!;
    let thu: number[] = [];
    if (!MOI_NGAY.has(ngay) && !moiGio) {
      const tach = ngay.split(',').map((x) => NGAY[x]);
      if (tach.some((x) => x === undefined)) {
        loi.push(`"${goc}": ngày phải là hang-ngay, cn, t2…t7`);
        continue;
      }
      thu = [...new Set(tach as number[])].sort();
    }
    const loai = phan[2] as LoaiDacBiet;
    if (!(loai in DAC_BIET)) {
      loi.push(`"${goc}": loại phải là ${Object.keys(DAC_BIET).join(', ')}`);
      continue;
    }
    const pheChu = phan[3];
    if (pheChu !== undefined && !(pheChu in PHE_LICH)) {
      loi.push(`"${goc}": phe phải là son, thuy hoặc ca`);
      continue;
    }
    ds.push({ gio, phut, thu, loai, phe: pheChu === undefined ? null : PHE_LICH[pheChu]!, moiGio, goc });
  }
  return { ds, loi };
}

const NGAY_MS = 86_400_000;

/** Lần diễn ra gần nhất của `d` mà đã bắt đầu tới lúc `now` (mốc ms thật), hoặc lần kế tiếp nếu
 *  `keTiep`. Tính trên trục giờ địa phương rồi đổi về mốc thật. */
function lanCua(d: DongLich, now: number, lechPhut: number, keTiep: boolean): number {
  const dia = now - lechPhut * 60_000;
  if (d.moiGio) {
    const GIO = 3_600_000;
    const dauGio = Math.floor(dia / GIO) * GIO + d.phut * 60_000;
    const luc = keTiep ? (dauGio > dia ? dauGio : dauGio + GIO) : dauGio <= dia ? dauGio : dauGio - GIO;
    return luc + lechPhut * 60_000;
  }
  const dauNgay = Math.floor(dia / NGAY_MS) * NGAY_MS;
  const trongNgay = (d.gio * 60 + d.phut) * 60_000;
  for (let k = 0; k <= 7; k++) {
    const ngay = keTiep ? dauNgay + k * NGAY_MS : dauNgay - k * NGAY_MS;
    const luc = ngay + trongNgay;
    if (keTiep ? luc <= dia : luc > dia) continue;
    const thu = new Date(ngay).getUTCDay();
    if (d.thu.length === 0 || d.thu.includes(thu)) return luc + lechPhut * 60_000;
  }
  return Number.NaN;
}

/** Sự kiện vừa tới giờ (trong cửa sổ bắt kịp) và chưa chạy. Trả về khoá để lõi ghi nhớ. */
export function denGio(
  ds: readonly DongLich[],
  now: number,
  lechPhut: number,
  daChay: ReadonlySet<string>,
): { d: DongLich; khoa: string; luc: number }[] {
  const ra: { d: DongLich; khoa: string; luc: number }[] = [];
  for (const d of ds) {
    const luc = lanCua(d, now, lechPhut, false);
    if (Number.isNaN(luc) || now - luc >= CUA_SO_BAT_KIP) continue;
    const khoa = `${d.goc}@${luc}`;
    if (!daChay.has(khoa)) ra.push({ d, khoa, luc });
  }
  return ra;
}

/** Sự kiện theo lịch gần nhất sắp tới. */
export function sapToi(ds: readonly DongLich[], now: number, lechPhut: number): { d: DongLich; luc: number } | null {
  let tot: { d: DongLich; luc: number } | null = null;
  for (const d of ds) {
    const luc = lanCua(d, now, lechPhut, true);
    if (!Number.isNaN(luc) && (tot === null || luc < tot.luc)) tot = { d, luc };
  }
  return tot;
}

/** Các lần sắp tới trong `trong` ms tới (mặc định 3 giờ), xếp theo giờ — cho bảng Lịch trình trên màn. */
export function sapToiDs(
  ds: readonly DongLich[],
  now: number,
  lechPhut: number,
  so = 6,
  trong = 3 * 3_600_000,
): { d: DongLich; luc: number }[] {
  const ra: { d: DongLich; luc: number }[] = [];
  for (const d of ds) {
    let t = now;
    for (let k = 0; k < so; k++) {
      const luc = lanCua(d, t, lechPhut, true);
      if (Number.isNaN(luc) || luc - now > trong) break;
      ra.push({ d, luc });
      t = luc + 1;
    }
  }
  return ra.sort((a, b) => a.luc - b.luc).slice(0, so);
}

/** Mốc giờ tròn kế tiếp ở phút `phut` (giờ địa phương) — tổng kết năm khớp đồng hồ khi chạy theo lịch. */
export function phutKe(now: number, lechPhut: number, phut: number): number {
  const GIO = 3_600_000;
  const dia = now - lechPhut * 60_000;
  let luc = Math.floor(dia / GIO) * GIO + phut * 60_000;
  if (luc <= dia) luc += GIO;
  return luc + lechPhut * 60_000;
}
