import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import './stage.css';

const HANG = ['🥇', '🥈', '🥉', '4', '5'];

/** Bảng vinh danh. Chỉ đọc từ phiên — backend đã cộng xong, module không cộng lại.
 *
 *  Màu và cỡ chữ lấy từ biến CSS của thiết kế, nên cùng một bảng này trông hợp
 *  ở phòng kể chuyện, phòng đám cưới hay quán bar mà không phải sửa gì. */
export function Stage({ config, state }: StagePartProps<Config>) {
  const top = state.session.topGivers.slice(0, config.size);
  if (top.length === 0) return null;

  return (
    <ol className="mod-tops">
      {top.map((g, i) => (
        <li className="mod-tops-o" key={g.user} data-hang={i + 1}>
          <span className="mod-tops-anh">
            {g.avatar === undefined ? HANG[i] : <img src={g.avatar} alt="" />}
          </span>
          <span className="mod-tops-ten" title={g.name}>
            {g.name}
          </span>
          <span className="mod-tops-xu">{g.xu.toLocaleString('vi-VN')}</span>
        </li>
      ))}
    </ol>
  );
}
