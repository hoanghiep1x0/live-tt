/** GHẾ TRƯỞNG MÔN — ai cũng ngồi được (ban-do.md §3t). Hai đường lên ghế:
 *
 *  1. **Top 1** của tông (cảnh giới cao nhất) ngồi ghế khi chưa ai tặng quà giành ghế.
 *  2. **Tặng quà**: lúc tông đang tu luyện, một món quà từ `TM_XU` xu là lên làm trưởng môn `TM_LAU` — kể cả cảnh giới
 *     thấp. Muốn giành ghế của người đang giữ thì món quà phải LỚN HƠN tổng xu người đó đã tặng để giữ ghế. Người đang
 *     giữ tặng thêm thì cộng dồn (ghế khó bị giành hơn) và gia hạn. Hết hạn thì ghế về lại top 1.
 *
 *  Lớp vẽ (`ve3d/canh-3d.ts`) đưa người giữ ghế lên vị trí đầu đội hình — vị trí "thủ môn". */

import type { NguoiChoi, Su, The } from './core';
import { PHE, danhHieu, type Phe } from './the-gioi';

/** Món quà nhỏ nhất để lên ghế (Doughnut 30 xu). */
export const TM_XU = 30;
export const TM_LAU = 5 * 60_000;

export interface GheTruongMon {
  user: string;
  /** Tổng xu đã tặng để giữ ghế — người khác phải tặng một món lớn hơn số này mới giành được. */
  xu: number;
  den: number;
}

export type SuTm = { k: 'truong-mon'; user: string; phe: Phe; xu: number; cuop: boolean };

/** Người đang giữ ghế trưởng môn của `phe` nhờ quà (null: ghế thuộc top 1). */
export function truongMonCua(the: The, phe: Phe, now: number): GheTruongMon | null {
  const g = the.truongMon[phe];
  return g !== null && now < g.den ? g : null;
}

/** Một món quà của đệ tử lúc tông mình đang tu luyện: đủ lớn thì lên / giữ ghế trưởng môn. */
export function quaTruongMon(the: The, n: NguoiChoi, xu: number, now: number, ra: Su[]): void {
  const phe = n.phe;
  if (phe === null) return;
  const g = truongMonCua(the, phe, now);
  if (g !== null && g.user === n.user) {
    g.xu += xu;
    g.den = now + TM_LAU;
    return;
  }
  if (xu < TM_XU || (g !== null && xu <= g.xu)) return;
  the.truongMon[phe] = { user: n.user, xu, den: now + TM_LAU };
  const chuc = danhHieu(phe, 0)?.chu ?? 'Trưởng môn';
  ra.push({ k: 'truong-mon', user: n.user, phe, xu, cuop: g !== null });
  ra.push({ k: 'doc', chu: `${n.ten} tặng quà, lên làm ${chuc} ${PHE[phe].tenNgan}!` });
}
