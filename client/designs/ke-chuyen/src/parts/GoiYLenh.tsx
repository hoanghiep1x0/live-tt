import { HIEN_MS, luotGoiY } from './goi-y';

/** Popup "Cách tham gia phòng live" — chép lối của bản cũ: thẻ nổi giữa khung
 *  chiếu, hiện theo chu kỳ rồi tự tắt, có thanh chạy dưới đáy cho người xem
 *  biết nó sắp biến mất.
 *
 *  Vì sao là popup chứ không phải một dòng ở đáy màn: dòng ở đáy nằm đó mãi,
 *  người xem quen mắt rồi thôi không đọc nữa, mà nó còn chen chỗ với dải chữ
 *  chạy. Popup thì thưa, mỗi lần hiện là một lần được đọc.
 *
 *  Chỉ liệt kê lệnh phòng này THẬT SỰ chạy được. Bản cũ còn `ghế B4`, `chỗ của
 *  tôi`, `#mã`, `gửi: …`, `nhảy`, nhưng bản mới chưa module nào đọc mấy lệnh
 *  đó từ bình luận — in lên sóng là bảo người xem làm một việc không chạy. */
export function GoiYLenh({ nhip, batAnUi }: { nhip: number; batAnUi: boolean }) {
  const { hien, luot } = luotGoiY(nhip);
  if (!batAnUi || !hien) return null;

  return (
    <div className="stage-guide on-screen" role="note" key={luot}>
      <p className="stage-guide-title">Cách tham gia phòng live</p>
      <ul>
        <li>
          <b>ôm</b> · <b>an ủi</b> · <b>thương bé</b> — chibi của bạn rời ghế chạy lên ôm bé
        </li>
        <li>Thả tim và bình luận để lên bảng Top — lời nhắn của bạn chạy trên đầu màn</li>
      </ul>
      <div className="stage-guide-bar" style={{ animationDuration: `${HIEN_MS}ms` }} />
    </div>
  );
}
