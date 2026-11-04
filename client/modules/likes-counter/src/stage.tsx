import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import './stage.css';

/** Thanh tiến độ tim. Đọc thẳng tổng của phiên — backend đã lấy tổng của TikTok,
 *  module không cộng lại. */
export function Stage({ config, state }: StagePartProps<Config>) {
  const tim = state.session.totals.likes;
  const pct = Math.min(100, Math.floor((tim / config.goal) * 100));

  const moc: number[] = [];
  for (let m = config.stepPercent; m < 100; m += config.stepPercent) moc.push(m);

  return (
    <div className="mod-tim">
      <div className="mod-tim-thanh">
        <span className="mod-tim-day" style={{ width: `${pct}%` }} />
        {moc.map((m) => (
          <span
            key={m}
            className={m <= pct ? 'mod-tim-moc da-qua' : 'mod-tim-moc'}
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
      <p className="mod-tim-chu">
        ❤ {tim.toLocaleString('vi-VN')} / {config.goal.toLocaleString('vi-VN')} · {pct}%
      </p>
    </div>
  );
}
