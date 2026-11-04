import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { State } from './core';
import './stage.css';

/** Bóng chat nổi. Danh sách bóng do lõi chọn — phần vẽ không tự lọc lại, nếu
 *  không hai nơi sẽ hiểu khác nhau về việc bóng nào được hiện. */
export function Stage({ modState, now }: StagePartProps<Config, State>) {
  const han = modState.config.songSec * 1000;
  const bong = modState.bong.filter((b) => now - b.at < han);
  if (bong.length === 0) return null;

  return (
    <div className="mod-chat">
      {bong.map((b, i) => (
        <p
          key={b.id}
          className={b.qua ? 'mod-chat-bong la-qua' : 'mod-chat-bong'}
          // Bóng mới nhất nằm dưới cùng, cũ hơn đẩy dần lên. Đời bóng do lõi
          // quyết, nên hoạt hình mờ dần phải chạy đúng bằng ngần ấy giây.
          style={
            {
              '--nac': bong.length - 1 - i,
              animationDuration: `${modState.config.songSec}s`,
            } as React.CSSProperties
          }
        >
          <b>{b.name}</b>
          {b.text}
        </p>
      ))}
    </div>
  );
}
