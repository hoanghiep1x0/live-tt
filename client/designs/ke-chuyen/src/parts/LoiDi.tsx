/** Người đi vào và đi ra ở LỐI ĐI.
 *
 *  Bản cũ không cho ai đi băng qua ghế. Khách vào phòng thì một người đi dọc
 *  một trong ba lối (`AISLES_X = [3.2, 50, 96.8]`) từ cuối rạp lên trên, khách
 *  rời phòng thì đi ngược xuống — chỉ đổi `y`, `x` đứng yên (xem `walkFrom` /
 *  `walkTo` trong StageView của bản cũ). Ghế có người hay không là chuyện
 *  riêng, không dính tới lượt đi này.
 *
 *  Thuần theo feed và đồng hồ: hai cửa sổ xem cùng một phòng thấy cùng một
 *  người đi cùng một lối. Độ trễ hoạt ảnh chốt MỘT LẦN lúc gắn — sửa
 *  `animation-delay` của hoạt ảnh đang chạy là nó giật về đầu.
 */

import { useState } from 'react';
import type { FeedItem } from '@live/contracts';
import { AISLES_X } from '../seats';
import { ANH_DUNG, anhCua, kieuChibi } from './HangGhe';

/** Một lượt đi hết ngần này. Lấy đúng `WALK_MS` của bản cũ. */
export const DI_MS = 5_200;
/** Trên cùng một lối, người sau xuất phát cách người trước ngần này — không dồn cục. */
const CACH_MS = 1_400;
/** Chờ lượt quá lâu thì bỏ: phòng quá đông thì không xếp hàng vô tận. */
const CHO_TOI_DA_MS = 6_000;
/** Nhiều hơn ngần này người cùng đi là rối mắt. */
const TOI_DA = 6;

export interface LuotDi {
  key: string;
  loi: number;
  vao: boolean;
  tu: number;
  kieu: number;
}

/** Các lượt đang đi, tính thuần từ feed. Chuyển nguyên cách xếp lượt của bản
 *  cũ: mỗi lối một hàng chờ, người sau cách người trước `CACH_MS`. */
export function cacLuot(feed: readonly FeedItem[], now: number): LuotDi[] {
  const ranh = AISLES_X.map(() => 0);
  const ra: LuotDi[] = [];
  // Feed của phiên xếp cũ → mới, mà hàng chờ phải tính theo thứ tự thời gian.
  for (const f of feed) {
    if (f.kind !== 'join' && f.kind !== 'leave') continue;
    const loi = f.id % AISLES_X.length;
    const tu = Math.max(f.at, ranh[loi] ?? 0);
    if (tu - f.at > CHO_TOI_DA_MS) continue;
    ranh[loi] = tu + CACH_MS;
    if (now >= tu && now < tu + DI_MS) {
      ra.push({
        key: `${f.kind}:${f.id}`,
        loi,
        vao: f.kind === 'join',
        tu,
        kieu: kieuChibi(f.user ?? f.name),
      });
    }
  }
  return ra.slice(-TOI_DA);
}

function MotNguoi({
  luot,
  now,
  asset,
}: {
  luot: LuotDi;
  now: number;
  asset: (p: string) => string;
}) {
  const [tre] = useState(() => -Math.max(0, now - luot.tu));
  return (
    <img
      className={luot.vao ? 'loi-di vao' : 'loi-di ra'}
      src={asset(anhCua(ANH_DUNG, luot.kieu))}
      alt=""
      style={{
        left: `${AISLES_X[luot.loi] ?? 50}%`,
        animationDelay: `${tre}ms, ${tre}ms`,
      }}
    />
  );
}

export function LoiDi({
  feed,
  now,
  asset,
}: {
  feed: readonly FeedItem[];
  now: number;
  asset: (p: string) => string;
}) {
  const luot = cacLuot(feed, now);
  if (luot.length === 0) return null;
  return (
    <div className="lop-loi-di" aria-hidden>
      {luot.map((l) => (
        <MotNguoi key={l.key} luot={l} now={now} asset={asset} />
      ))}
    </div>
  );
}
