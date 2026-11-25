/** CHIẾN TRƯỜNG ĐẠI CHIẾN — ba cơ chế để quà quyết định từng điểm (ban-do.md §3r):
 *
 *  1. **Cứ điểm tranh chấp**: ba cứ điểm dọc giữa sân (Sơn Môn · Mê Cung Bí Bảo · Lôi Đài). Mỗi món quà của đệ tử tự dồn vào cứ điểm
 *     phe mình đang cần nhất. Cứ điểm thuộc phe có nhiều xu hơn trong `CU_CUA_SO` gần nhất; giữ cứ điểm thì mỗi giây
 *     được `CU_DIEM` điểm. Bị cướp thì báo to — bên kia phải tặng giành lại.
 *  2. **Phút chót**: `PHUT_CHOT` cuối trận, điểm của quà nhân đôi; bảng ghi phe đang thua còn thiếu khoảng bao nhiêu xu
 *     để lật kèo.
 *  3. **Viện binh**: quà từ `VIEN_XU.quan` xu gọi một toán quân mang tên người tặng, từ `VIEN_XU.tuong` xu gọi một
 *     tướng — sống `VIEN_LAU`, mỗi giây đánh thật vào điểm; từ `VIEN_XU.than` xu thì thần của tông ra tay một đòn. */

import type { Su } from './core';
import type { Phe } from './the-gioi';

export const CU_TEN = ['Sơn Môn', 'Mê Cung Bí Bảo', 'Lôi Đài'] as const;
export const CU_CUA_SO = 20_000;
export const CU_DIEM = 0.5;
export const PHUT_CHOT = 30_000;
export const VIEN_XU = { quan: 10, tuong: 100, than: 500 } as const;
export const VIEN_LAU = 15_000;
/** Điểm mỗi giây của một toán quân / một tướng; điểm một đòn của thần. */
export const VIEN_DIEM = { 1: 0.6, 2: 2.5 } as const;
export const THAN_DON = 30;
const VIEN_TOI_DA = 8;

export interface CuDiem {
  chu: Phe | null;
  /** Quà dồn vào cứ điểm này trong cửa sổ gần nhất. */
  qua: { phe: Phe; xu: number; luc: number }[];
}

export interface VienBinh {
  id: number;
  user: string;
  ten: string;
  phe: Phe;
  /** 1 toán quân · 2 tướng. */
  bac: 1 | 2;
  den: number;
}

export interface ChienTruong {
  cu: [CuDiem, CuDiem, CuDiem];
  vien: VienBinh[];
  idKe: number;
  /** Nhịp cộng điểm kế (mỗi giây). */
  nhipKe: number;
  /** Lần báo cướp cứ điểm gần nhất (khỏi đọc dồn). */
  baoLuc: number;
}

export type SuCt =
  /** Cứ điểm `i` đổi chủ nhờ quà của `user`. */
  | { k: 'cu-diem'; i: number; phe: Phe; user: string }
  | { k: 'vien-binh'; user: string; phe: Phe; bac: 1 | 2 }
  | { k: 'vien-don'; phe: Phe; bac: 1 | 2 }
  | { k: 'than-don'; user: string; phe: Phe };

/** Phần của pha Đại Chiến mà mô-đun này cần. */
export interface PhaCt {
  den: number;
  son: number;
  thuy: number;
  ct?: ChienTruong;
}

export function taoCt(now: number): ChienTruong {
  const cu = (): CuDiem => ({ chu: null, qua: [] });
  return { cu: [cu(), cu(), cu()], vien: [], idKe: 1, nhipKe: now + 1_000, baoLuc: 0 };
}

const kia = (p: Phe): Phe => (p === 'son' ? 'thuy' : 'son');

/** Xu mỗi phe ở một cứ điểm trong cửa sổ. */
export function xuCu(c: CuDiem, now: number): Record<Phe, number> {
  const r = { son: 0, thuy: 0 };
  for (const q of c.qua) if (now - q.luc < CU_CUA_SO) r[q.phe] += q.xu;
  return r;
}

export const phutChot = (pha: PhaCt, now: number) => pha.den - now <= PHUT_CHOT;

/** Phe đang thua còn thiếu khoảng bao nhiêu xu để lật kèo (ước lượng: một người mới tặng một lần, lúc phút chót ×2). */
export function xuLatKeo(pha: PhaCt, now: number, diemQua: number): { phe: Phe; xu: number } | null {
  const gap = Math.abs(pha.son - pha.thuy);
  if (gap < 0.5) return null;
  const phe: Phe = pha.son < pha.thuy ? 'son' : 'thuy';
  const he = phutChot(pha, now) ? 2 : 1;
  return { phe, xu: Math.max(1, Math.ceil(Math.pow(gap / (diemQua * he), 2))) };
}

/** Một món quà của đệ tử `phe` lúc Đại Chiến: dồn vào cứ điểm cần nhất, gọi viện binh / thần theo số xu. */
export function quaChienTruong(pha: PhaCt, user: string, ten: string, phe: Phe, xu: number, now: number, ra: Su[]): void {
  const ct = (pha.ct ??= taoCt(now));
  // 1. Cứ điểm: ưu tiên cứ chưa thuộc phe mình mà thiếu ít xu nhất; đã giữ cả ba thì đắp cứ mỏng nhất.
  let chon = 0;
  let tot = Infinity;
  ct.cu.forEach((c, i) => {
    const x = xuCu(c, now);
    const diem = c.chu === phe ? 10_000 + (x[phe] - x[kia(phe)]) : x[kia(phe)] - x[phe];
    if (diem < tot) {
      tot = diem;
      chon = i;
    }
  });
  const c = ct.cu[chon]!;
  c.qua = c.qua.filter((q) => now - q.luc < CU_CUA_SO);
  c.qua.push({ phe, xu, luc: now });
  const x = xuCu(c, now);
  if (c.chu !== phe && x[phe] > x[kia(phe)]) {
    const cuop = c.chu !== null;
    c.chu = phe;
    ra.push({ k: 'cu-diem', i: chon, phe, user });
    if (now - ct.baoLuc > 3_000) {
      ct.baoLuc = now;
      ra.push({ k: 'doc', chu: `${ten} ${cuop ? 'cướp' : 'chiếm'} cứ điểm ${CU_TEN[chon]}!` });
    }
  }
  // 3. Viện binh / thần ra tay.
  if (xu >= VIEN_XU.than) {
    pha[phe] += THAN_DON;
    ra.push({ k: 'than-don', user, phe });
    ra.push({ k: 'doc', chu: `${ten} thỉnh thần ra tay!` });
  }
  if (xu >= VIEN_XU.quan) {
    const bac: 1 | 2 = xu >= VIEN_XU.tuong ? 2 : 1;
    ct.vien.push({ id: ct.idKe++, user, ten, phe, bac, den: now + VIEN_LAU });
    // Đông quá thì toán cũ nhất của phe đó rút trước.
    const cuaPhe = ct.vien.filter((v) => v.phe === phe);
    if (cuaPhe.length > VIEN_TOI_DA) ct.vien.splice(ct.vien.indexOf(cuaPhe[0]!), 1);
    ra.push({ k: 'vien-binh', user, phe, bac });
  }
}

/** Mỗi giây: cứ điểm đang giữ và viện binh còn sống cộng điểm cho phe mình. */
export function buocChienTruong(pha: PhaCt, now: number, ra: Su[]): void {
  const ct = pha.ct;
  if (ct === undefined) return;
  ct.vien = ct.vien.filter((v) => v.den > now);
  while (now >= ct.nhipKe) {
    ct.nhipKe += 1_000;
    for (const c of ct.cu) {
      if (c.chu === null) continue;
      // Hết quà trong cửa sổ thì vẫn giữ (tới khi bên kia tặng vượt) nhưng chỉ còn nửa điểm.
      const x = xuCu(c, now);
      pha[c.chu] += x[c.chu] > 0 ? CU_DIEM : CU_DIEM / 2;
    }
    for (const v of ct.vien) {
      pha[v.phe] += VIEN_DIEM[v.bac];
      ra.push({ k: 'vien-don', phe: v.phe, bac: v.bac });
    }
  }
}
