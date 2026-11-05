import type { FeedItem } from '@live/contracts';
import { tenNgan } from './di-lai';
import { nguoiMoiVao } from './vao-phong';

export { HIEN_MS, nguoiMoiVao, TOI_DA } from './vao-phong';

/** "👋 An vừa vào phòng" ở góc trái dưới, như `stage-joins` của bản cũ: nền
 *  tối, tên chữ vàng. Bóng chat nằm bên phải nên lời báo ở bên trái, hai thứ
 *  không chen nhau. */
export function VaoPhong({ feed, now }: { feed: readonly FeedItem[]; now: number }) {
  const { hien, them } = nguoiMoiVao(feed, now);
  if (hien.length === 0) return null;
  return (
    <div className="stage-joins" aria-live="polite">
      {hien.map((f) => (
        <p key={f.id} className="join-toast">
          <span aria-hidden="true">👋</span> <b>{tenNgan(f.name)}</b> vừa vào phòng
        </p>
      ))}
      {them === 0 ? null : <p className="join-toast more">và {them} người khác vừa vào phòng</p>}
    </div>
  );
}
