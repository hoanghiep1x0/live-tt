import type { FeedItem } from '@live/contracts';
import { tenNgan } from './di-lai';
import { nguoiMoiVao } from './vao-phong';

export { HIEN_MS, nguoiMoiVao, TOI_DA } from './vao-phong';

/** "👋 An vào phòng" ở góc trái dưới, như `stage-joins` của bản cũ: nền
 *  tối, tên chữ vàng. Bóng chat nằm bên phải nên lời báo ở bên trái, hai thứ
 *  không chen nhau.
 *
 *  Phòng đông thì một dòng gọi hai tên, và đuôi chỉ còn "vào phòng" — gọn hết
 *  mức. Hai tên dài cộng một đuôi dài là tràn mép, mà tràn thì tên người sau
 *  bị cắt — hiện tên người ta mà cắt mất thì thà đừng gọi. */
export function VaoPhong({ feed, now }: { feed: readonly FeedItem[]; now: number }) {
  const { dong, them } = nguoiMoiVao(feed, now);
  if (dong.length === 0) return null;
  return (
    <div className="stage-joins" aria-live="polite">
      {dong.map((nhom) => (
        <p key={nhom[0]?.id} className="join-toast">
          <span aria-hidden="true">👋</span> <b>{nhom.map((f) => tenNgan(f.name)).join(', ')}</b> vào phòng
        </p>
      ))}
      {them === 0 ? null : <p className="join-toast more">và {them} người khác</p>}
    </div>
  );
}
