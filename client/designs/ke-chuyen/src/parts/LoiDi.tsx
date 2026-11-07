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
import { ANH_DUNG, anhCua } from './ghe';
import type { ChoNgoi } from './ghe';
import { cacLuot, choDen } from './di-lai';
import type { Diem, LuotDi } from './di-lai';

export { cacLuot, CAO_NGUOI, choDen, DI_MS, loiGan, tenNgan } from './di-lai';
export type { Diem, LuotDi } from './di-lai';

function MotNguoi({
  luot,
  now,
  cao,
  asset,
}: {
  luot: LuotDi;
  now: number;
  /** Chiều cao lòng rạp, để biết đáy rạp ở đâu. */
  cao: number;
  asset: (p: string) => string;
}) {
  const [tre] = useState(() => -Math.max(0, now - luot.tu));
  // Chốt điểm đến VÀ lối đi MỘT LẦN lúc gắn, trong cùng một lần chụp.
  //
  // Backend có thể xếp ghế cho người này giữa chừng, và lúc ấy cả `cho` lẫn
  // `loi` đều đổi. Chốt mỗi `cho` thì người đứng ở chỗ cũ mà quãng rẽ `--ra-loi`
  // lại tính theo lối mới — họ rẽ hụt qua cả màn hình.
  const [neo] = useState(() => ({ cho: luot.cho, loi: luot.loi }));
  const loiX = AISLES_X[neo.loi] ?? 50;
  const goc: Diem = neo.cho;
  // Nhãn tên nằm TRONG cùng thẻ với người, nên nó đi theo trên đầu — bản cũ
  // cũng vậy (`stage-walk-labels`). Lối sát mép thì nhãn lệch vào trong cho
  // khỏi bị cắt chữ.
  const lechNhan = neo.loi === 0 ? '-12%' : neo.loi === AISLES_X.length - 1 ? '-88%' : '-50%';
  return (
    <span
      className={luot.vao ? 'loi-di vao' : 'loi-di ra'}
      style={
        {
          left: `${goc.x}%`,
          top: `${goc.y}cqw`,
          // Quãng ngang ra lối, và quãng dọc xuống đáy rạp.
          '--ra-loi': `${(loiX - goc.x).toFixed(1)}cqw`,
          '--xuong': `${Math.max(3, cao + 3 - goc.y).toFixed(1)}cqw`,
          '--lech-nhan': lechNhan,
          animationDelay: `${tre}ms`,
        } as CSSProperties
      }
    >
      <img className="loi-anh" src={asset(anhCua(ANH_DUNG, luot.kieu))} alt="" />
      <span className="loi-ten">
        <b>{luot.ten}</b> {luot.vao ? 'vào phòng' : 'rời phòng 👋'}
      </span>
    </span>
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

  const luot = cacLuot(feed, now, (ai) => choDen(ai, choCu.current.get(ai), ghe));
  if (luot.length === 0) return null;
  return (
    <div className="lop-loi-di" aria-hidden>
      {luot.map((l) => (
        <MotNguoi key={l.key} luot={l} now={now} cao={cao} asset={asset} />
      ))}
    </div>
  );
}
