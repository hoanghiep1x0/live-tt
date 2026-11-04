/** Người đi vào và đi ra ở LỐI ĐI.
 *
 *  Bản cũ không cho ai đi băng qua ghế: khách đi dọc một trong ba lối
 *  (`AISLES_X = [3.2, 50, 96.8]`), vào thì từ cuối rạp lên, ra thì ngược xuống
 *  (xem `walkFrom` / `walkTo` trong StageView của bản cũ).
 *
 *  Ở đây thêm một đoạn bản cũ không có: lượt đi nối với ĐÚNG GHẾ của người đó.
 *  Rời phòng thì đứng dậy, đi ngang ra lối gần nhất **trong hàng của mình** rồi
 *  mới xuống; vào phòng thì ngược lại. Bản cũ cho người rời phòng hiện ra ở
 *  đỉnh lối rồi đi xuống, trông như họ nhảy từ ghế lên đầu rạp.
 *
 *  Thuần theo feed và đồng hồ: hai cửa sổ xem cùng một phòng thấy cùng một
 *  người đi cùng một lối. Độ trễ hoạt ảnh chốt MỘT LẦN lúc gắn — sửa
 *  `animation-delay` của hoạt ảnh đang chạy là nó giật về đầu.
 */

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FeedItem, Seat } from '@live/contracts';
import { AISLES_X } from '../seats';
import { ANH_DUNG, anhCua, kieuChibi } from './HangGhe';
import type { ChoNgoi } from './HangGhe';

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
  /** Nick, để tra chỗ ngồi. */
  ai: string;
}

/** Lối gần ghế này nhất. Người rời ghế đi ngang ra lối gần nhất rồi mới xuống,
 *  chứ không bước xuyên qua cả rạp. */
export function loiGan(x: number): number {
  let tot = 0;
  for (let i = 1; i < AISLES_X.length; i += 1) {
    if (Math.abs((AISLES_X[i] ?? 50) - x) < Math.abs((AISLES_X[tot] ?? 50) - x)) tot = i;
  }
  return tot;
}

/** Các lượt đang đi, tính thuần từ feed. Chuyển nguyên cách xếp lượt của bản
 *  cũ: mỗi lối một hàng chờ, người sau cách người trước `CACH_MS`. */
export function cacLuot(
  feed: readonly FeedItem[],
  now: number,
  choCua: (ai: string) => { x: number } | undefined,
): LuotDi[] {
  const ranh = AISLES_X.map(() => 0);
  const ra: LuotDi[] = [];
  // Feed của phiên xếp cũ → mới, mà hàng chờ phải tính theo thứ tự thời gian.
  for (const f of feed) {
    if (f.kind !== 'join' && f.kind !== 'leave') continue;
    const ai = f.user ?? f.name;
    const cho = choCua(ai);
    const loi = cho === undefined ? f.id % AISLES_X.length : loiGan(cho.x);
    const tu = Math.max(f.at, ranh[loi] ?? 0);
    if (tu - f.at > CHO_TOI_DA_MS) continue;
    ranh[loi] = tu + CACH_MS;
    if (now >= tu && now < tu + DI_MS) {
      ra.push({ key: `${f.kind}:${f.id}`, loi, vao: f.kind === 'join', tu, kieu: kieuChibi(ai), ai });
    }
  }
  return ra.slice(-TOI_DA);
}

function MotNguoi({
  luot,
  now,
  cho,
  cao,
  asset,
}: {
  luot: LuotDi;
  now: number;
  /** Ghế của người này, nếu biết. Không biết thì chỉ đi dọc lối. */
  cho: { x: number; y: number } | undefined;
  /** Chiều cao lòng rạp, để biết đáy rạp ở đâu. */
  cao: number;
  asset: (p: string) => string;
}) {
  const [tre] = useState(() => -Math.max(0, now - luot.tu));
  const loiX = AISLES_X[luot.loi] ?? 50;
  // Không biết ghế thì đứng ngay ở lối, đi mỗi chiều dọc.
  const goc = cho ?? { x: loiX, y: 6 };
  return (
    <img
      className={luot.vao ? 'loi-di vao' : 'loi-di ra'}
      src={asset(anhCua(ANH_DUNG, luot.kieu))}
      alt=""
      style={{
        left: `${goc.x}%`,
        top: `${goc.y}cqw`,
        // Quãng ngang ra lối, và quãng dọc xuống đáy rạp.
        '--ra-loi': `${(loiX - goc.x).toFixed(1)}cqw`,
        '--xuong': `${Math.max(3, cao + 3 - goc.y).toFixed(1)}cqw`,
        animationDelay: `${tre}ms, ${tre}ms`,
      } as CSSProperties}
    />
  );
}

export function LoiDi({
  feed,
  now,
  ghe,
  ngoi,
  cao,
  asset,
}: {
  feed: readonly FeedItem[];
  now: number;
  ghe: readonly ChoNgoi[];
  ngoi: Map<number, Seat>;
  cao: number;
  asset: (p: string) => string;
}) {
  // Người RỜI phòng thì ghế đã trả rồi, tra `ngoi` không ra nữa. Giữ chỗ ngồi
  // gần nhất của từng người để họ còn biết đường đứng dậy mà đi ra.
  const choCu = useRef<Map<string, { x: number; y: number }>>(new Map());
  for (const [i, ai] of ngoi) {
    const g = ghe.find((x) => x.flat === i);
    if (g !== undefined) choCu.current.set(ai.user, { x: g.x, y: g.y });
  }

  const luot = cacLuot(feed, now, (ai) => choCu.current.get(ai));
  if (luot.length === 0) return null;
  return (
    <div className="lop-loi-di" aria-hidden>
      {luot.map((l) => (
        <MotNguoi
          key={l.key}
          luot={l}
          now={now}
          cho={choCu.current.get(l.ai)}
          cao={cao}
          asset={asset}
        />
      ))}
    </div>
  );
}
