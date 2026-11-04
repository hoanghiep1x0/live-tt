import { useState } from 'react';
import { SO_MODULE } from './registry';
import { guiLenh } from './state';
import { useStage } from './Stage';
import './bang-xem.css';

/** Trong OBS thì KHÔNG hiện.
 *
 *  OBS Browser Source gắn `window.obsstudio` vào trang. Bảng này là chỗ người
 *  vận hành bật tắt tính năng để xem thử — nó mà lọt lên sóng thì khán giả thấy
 *  một đống nút. Thêm một đường chặn nữa: `?obs=1` cũng ẩn.
 */
function trongObs(): boolean {
  if (typeof window === 'undefined') return true;
  if ('obsstudio' in window) return true;
  try {
    return new URLSearchParams(location.search).get('obs') === '1';
  } catch {
    return false;
  }
}

/** Bảng xem thử: bật tắt tính năng ngay trên sân khấu để thấy nó chạy thế nào
 *  trong một phiên thật.
 *
 *  Lệnh đi lên bằng kênh `RoomCommand` của hợp đồng, không phải một cửa REST
 *  riêng — cùng đường mà luật tự động và AI sẽ dùng sau này. */
export function BangXem() {
  const s = useStage();
  const [mo, setMo] = useState(false);
  const [an] = useState(trongObs);

  if (an) return null;

  const bat = (id: string, on: boolean): void => {
    const duoc = guiLenh({
      t: 'command',
      command: { op: 'set-module', moduleId: id, on },
      by: 'nguoi',
      reason: 'bật tắt từ bảng xem thử',
    });
    if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
  };

  return (
    <div className="bang-xem" data-mo={mo}>
      <button
        type="button"
        className="bang-xem-nut"
        title={mo ? 'Đóng bảng xem thử' : 'Bật tắt tính năng để xem thử'}
        aria-expanded={mo}
        onClick={() => setMo(!mo)}
      >
        {mo ? '✕' : '⚙'}
      </button>

      {!mo ? null : (
        <div className="bang-xem-khung">
          <p className="bang-xem-dau">
            Xem thử — bảng này không lên sóng
            <small>{s.live === null ? 'chưa phát phòng nào' : `đang phát ${s.live}`}</small>
          </p>
          <ul className="bang-xem-ds">
            {SO_MODULE.map((m) => {
              const on = s.enabled.includes(m.id);
              return (
                <li key={m.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={s.live === null}
                      onChange={(e) => bat(m.id, e.target.checked)}
                    />
                    <span>{m.id}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="bang-xem-chan">
            Bật tắt ở đây đổi luôn cấu hình của phòng đang phát, y như bấm trong trang quản lý.
          </p>
        </div>
      )}
    </div>
  );
}
