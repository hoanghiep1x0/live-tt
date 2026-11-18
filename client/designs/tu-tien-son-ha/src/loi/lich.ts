/** Lịch sự kiện theo khung giờ — THUẦN. Người vận hành gõ mỗi dòng một sự kiện:
 *
 *    20:00 cn dai-yeu
 *    21:00 hang-ngay hoi-thi
 *    12:00 t7,cn phuc-loc
 *
 *  Giờ là giờ địa phương của máy phát. Lõi không đọc đồng hồ hệ thống: độ lệch múi giờ
 *  được tiêm vào (`lechPhut`, đúng nghĩa `Date.prototype.getTimezoneOffset`). */

import { DAC_BIET, type LoaiDacBiet } from './the-gioi';

export interface DongLich {
  gio: number;
  phut: number;
  /** 0 = Chủ nhật … 6 = thứ Bảy. Rỗng là mỗi ngày. */
  thu: number[];
  loai: LoaiDacBiet;
  /** Dòng gốc, để báo lỗi và làm khoá chống chạy lặp. */
  goc: string;
}

/** Tới giờ mà phòng chưa mở thì còn bắt kịp trong khoảng này; quá thì bỏ, chờ lần sau. */
export const CUA_SO_BAT_KIP = 10 * 60_000;
/** Báo trước trên đầu màn. */
export const BAO_TRUOC = 5 * 60_000;

const NGAY: Record<string, number> = { cn: 0, t2: 1, t3: 2, t4: 3, t5: 4, t6: 5, t7: 6 };
const MOI_NGAY = new Set(['hang-ngay', 'moi-ngay', '*', 'hangngay']);

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
    const m = /^(\d{1,2})[:h](\d{2})?$/.exec(phan[0] ?? '');
    if (m === null || phan.length < 3) {
      loi.push(`"${goc}": cần dạng "20:00 cn dai-yeu"`);
      continue;
    }
    const gio = Number(m[1]);
    const phut = Number(m[2] ?? 0);
    if (gio > 23 || phut > 59) {
      loi.push(`"${goc}": giờ không hợp lệ`);
      continue;
    }
    const ngay = phan[1]!;
    let thu: number[] = [];
    if (!MOI_NGAY.has(ngay)) {
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
    ds.push({ gio, phut, thu, loai, goc });
  }
  return { ds, loi };
}

const NGAY_MS = 86_400_000;

/** Lần diễn ra gần nhất của `d` mà đã bắt đầu tới lúc `now` (mốc ms thật), hoặc lần kế tiếp nếu
 *  `keTiep`. Tính trên trục giờ địa phương rồi đổi về mốc thật. */
function lanCua(d: DongLich, now: number, lechPhut: number, keTiep: boolean): number {
  const dia = now - lechPhut * 60_000;
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
): { d: DongLich; khoa: string }[] {
  const ra: { d: DongLich; khoa: string }[] = [];
  for (const d of ds) {
    const luc = lanCua(d, now, lechPhut, false);
    if (Number.isNaN(luc) || now - luc >= CUA_SO_BAT_KIP) continue;
    const khoa = `${d.goc}@${luc}`;
    if (!daChay.has(khoa)) ra.push({ d, khoa });
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
