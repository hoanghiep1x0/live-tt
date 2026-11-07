/** Lệnh khách gõ liên quan tới ghế — phần THUẦN, không React, không DOM.
 *
 *  Máy chủ đã đọc lệnh và tra ra ghế (`FeedItem.lenh`, `backend/src/lenh.rs`);
 *  ở đây chỉ quyết lúc này trên rạp đang có gì để vẽ:
 *  - "chỗ của tôi" / "chỗ K12": ghế đó sáng lên kèm mã ghế và tên người hỏi.
 *  - "ghế B4": ghế mới sáng "đã ngồi B4"; xin không được thì báo vì sao.
 *  - "đánh Lan" / "ghét B4": người gõ bay từ ghế mình tới ghế kia "đánh yêu"
 *    rồi bay về, như trò vui của bản cũ.
 *
 *  Thuần theo feed và đồng hồ: hai cửa sổ cùng phòng thấy cùng một cảnh.
 */

import type { FeedItem } from '@live/contracts';
import type { ChoNgoi } from './ghe';

/** Ghế sáng bao lâu sau lệnh "chỗ…" / "ghế…". */
export const SANG_MS = 6_000;
/** Một lượt đánh yêu: bay tới, đánh, bay về. Phải khớp `stage.css`. */
export const TREU_MS = 4_200;

export interface SangGhe {
  /** Id mục feed — key lúc vẽ. */
  k: number;
  x: number;
  y: number;
  chu: string;
  /** Xin ghế không được: vẽ màu khác. */
  loi: boolean;
}

export interface TreuGhe {
  k: number;
  ten: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Đã chạy được bao lâu, ms — phần vẽ lùi hoạt ảnh về đúng chỗ. */
  da: number;
}

function ghe(ds: readonly ChoNgoi[], i: number | undefined): ChoNgoi | undefined {
  return i === undefined ? undefined : ds.find((g) => g.flat === i);
}

/** Ghế đang sáng lúc `now`. Mỗi ghế chỉ một nhãn — lệnh mới nhất thắng. */
export function gheSang(feed: readonly FeedItem[], ds: readonly ChoNgoi[], now: number): SangGhe[] {
  const ra = new Map<number, SangGhe>();
  for (const f of feed) {
    const l = f.lenh;
    if (l === undefined || now - f.at > SANG_MS || now < f.at) continue;
    if (l.loai === 'cho') {
      const g = ghe(ds, l.i);
      if (g !== undefined) ra.set(g.flat, { k: f.id, x: g.x, y: g.y, chu: `📍 ${l.ma} · ${f.name}`, loi: false });
    } else if (l.loai === 'ghe') {
      const g = ghe(ds, l.i);
      if (g === undefined) continue;
      const chu = l.ok ? `${f.name} đã ngồi ${l.ma}` : `${l.ma} đã có người`;
      ra.set(g.flat, { k: f.id, x: g.x, y: g.y, chu, loi: !l.ok });
    }
  }
  return [...ra.values()];
}

/** Các lượt đánh yêu đang chạy lúc `now`. Thiếu một trong hai ghế (người gõ
 *  chưa có chỗ, hay không tìm ra người bị trêu) thì thôi — không bay từ hư không. */
export function treuDangChay(feed: readonly FeedItem[], ds: readonly ChoNgoi[], now: number): TreuGhe[] {
  const ra: TreuGhe[] = [];
  for (const f of feed) {
    const l = f.lenh;
    if (l?.loai !== 'treu' || now < f.at || now - f.at > TREU_MS) continue;
    const a = ghe(ds, l.tu);
    const b = ghe(ds, l.den);
    if (a === undefined || b === undefined || a.flat === b.flat) continue;
    ra.push({ k: f.id, ten: f.name, x0: a.x, y0: a.y, x1: b.x, y1: b.y, da: now - f.at });
  }
  return ra.slice(-3);
}
