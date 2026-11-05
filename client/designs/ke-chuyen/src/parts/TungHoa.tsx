import type { Seat } from '@live/contracts';
import type { ChoNgoi } from './ghe';
import { tiengHo } from './tung-hoa';

export { NHIP_MS, tiengHo } from './tung-hoa';

/** "🌸 Tung hoa! 🌸" trên đầu khán giả đang ngồi, suốt lúc sàn đang nhảy —
 *  như `stage-dance-shout` của bản cũ. Chữ bật lên rồi bay lên mờ dần; hoạt ảnh
 *  là của CSS, ở đây chỉ quyết ghế nào hô và lúc nào.
 *
 *  Nằm trong thiết kế chứ không trong module sàn nhảy: chữ neo vào GHẾ, mà toạ
 *  độ ghế là đồ đạc của phòng này. Module chỉ báo "đang nhảy" qua slot `floor`
 *  xin sáng (`useSlotSang`). */
export function TungHoa({
  dangNhay,
  ngoi,
  ghe,
  now,
}: {
  dangNhay: boolean;
  ngoi: Map<number, Seat>;
  ghe: readonly ChoNgoi[];
  now: number;
}) {
  if (!dangNhay) return null;
  const ho = tiengHo(ngoi, ghe, now);
  if (ho.length === 0) return null;
  return (
    <div className="lop-tung-hoa" aria-hidden>
      {ho.map((h) => (
        <span
          key={h.k}
          className="tung-hoa"
          style={{ left: `${h.x}%`, top: `calc(var(--hall-top) + ${h.y - 3.5}cqw)` }}
        >
          🌸 Tung hoa! 🌸
        </span>
      ))}
    </div>
  );
}
