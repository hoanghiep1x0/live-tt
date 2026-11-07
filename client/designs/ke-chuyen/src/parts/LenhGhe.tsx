import type { CSSProperties } from 'react';
import type { FeedItem } from '@live/contracts';
import type { ChoNgoi } from './ghe';
import { gheSang, treuDangChay, TREU_MS } from './lenh-ghe';

export { SANG_MS, TREU_MS, gheSang, treuDangChay } from './lenh-ghe';

/** Lệnh gõ liên quan tới ghế vẽ trên rạp: ghế sáng ("chỗ của tôi", "ghế B4")
 *  và trò đánh yêu ("đánh Lan"). Quyết vẽ gì nằm ở `lenh-ghe.ts`; ở đây chỉ
 *  đặt lên màn, cùng hệ toạ độ với `TungHoa` (x %, y cqw tính từ đầu rạp). */
export function LenhGhe({
  feed,
  ghe,
  now,
}: {
  feed: readonly FeedItem[];
  ghe: readonly ChoNgoi[];
  now: number;
}) {
  const sang = gheSang(feed, ghe, now);
  const treu = treuDangChay(feed, ghe, now);
  if (sang.length === 0 && treu.length === 0) return null;
  return (
    <div className="lop-lenh-ghe" aria-hidden>
      {sang.map((g) => (
        <span
          key={`s${g.k}`}
          className="ghe-sang"
          data-loi={g.loi}
          style={{ left: `${g.x}%`, top: `calc(var(--hall-top) + ${g.y}cqw)` }}
        >
          <i className="ghe-sang-vong" />
          <b className="ghe-sang-chu">{g.chu}</b>
        </span>
      ))}
      {treu.map((t) => (
        <span
          key={`t${t.k}`}
          className="treu"
          style={
            {
              '--x0': `${t.x0}%`,
              '--y0': `calc(var(--hall-top) + ${t.y0 - 3}cqw)`,
              '--x1': `${t.x1}%`,
              '--y1': `calc(var(--hall-top) + ${t.y1 - 3}cqw)`,
              animationDuration: `${TREU_MS}ms`,
              animationDelay: `-${t.da}ms`,
            } as CSSProperties
          }
        >
          <b className="treu-ten">👊 {t.ten}</b>
          <i className="treu-bup" style={{ animationDuration: `${TREU_MS}ms`, animationDelay: `-${t.da}ms` }}>
            bụp bụp!
          </i>
        </span>
      ))}
    </div>
  );
}
