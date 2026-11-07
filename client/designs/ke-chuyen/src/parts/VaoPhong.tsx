import type { FeedItem } from '@live/contracts';
import { tenNgan } from './di-lai';
import { nguoiMoiVao } from './vao-phong';

export { HIEN_MS, nguoiMoiVao, TOI_DA } from './vao-phong';

/** "👋 An vừa vào phòng" ở góc trái dưới, như `stage-joins` của bản cũ: nền
 *  tối, tên chữ vàng. Bóng chat nằm bên phải nên lời báo ở bên trái, hai thứ
 *  không chen nhau.
 *
 *  Phòng đông thì một dòng gọi hai tên. Dòng hai tên nói gọn "vừa vào" thay vì
 *  "vừa vào phòng": hai tên dài cộng đuôi đầy đủ là tràn mép, mà tràn thì tên
 *  người sau bị cắt — hiện tên người ta mà cắt mất thì thà đừng gọi. */
export function VaoPhong({ feed, now }: { feed: readonly FeedItem[]; now: number }) {
  const { dong, them } = nguoiMoiVao(feed, now);
  if (dong.length === 0) return null;
  return (
    <div className="stage-joins" aria-live="polite">
      {dong.map((nhom) => (
        <p key={nhom[0]?.id} className="join-toast">
          <span aria-hidden="true">👋</span> <b>{nhom.map((f) => tenNgan(f.name)).join(', ')}</b>{' '}
          {nhom.length > 1 ? 'vừa vào' : 'vừa vào phòng'}
        </p>
      ))}
      {them === 0 ? null : <p className="join-toast more">và {them} người khác vừa vào phòng</p>}
    </div>
  );
}
