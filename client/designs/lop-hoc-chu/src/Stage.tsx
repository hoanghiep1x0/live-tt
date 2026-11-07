import { useEffect, useRef, useState } from 'react';
import { Slot, useAsset, useLoiMc, useSlotTrongSuot, useStage } from '@live/stage-sdk';

/** Khung vẽ theo pixel của bản lop-hoc-chu: mọi toạ độ (bàn, bảng đen, bục) đo
 *  trên nền 1080×1920. Khung co giãn bằng `transform: scale` — chủ kênh cũ đã thử
 *  CSS `zoom` và thấy mờ hơn hẳn trên live, đừng đổi sang cách đó. */
const RONG = 1080;
const CAO = 1920;

/** Lớp học · Đố chữ: nền lớp, bảng đen, bục, 4 dãy bàn dài.
 *
 *  Chạy được khi không có module nào (quy ước 04 §1): lớp trống, bảng đen ghi
 *  màn chờ. Cô giáo, học sinh, câu đố là việc của module cắm vào slot `full`;
 *  module đó xin bỏ màn chờ (`useSlotTrongSuot`) vì nó tự vẽ cả bảng đen. */
export function Stage() {
  const asset = useAsset();
  const khung = useRef<HTMLDivElement>(null);
  const [tiLe, setTiLe] = useState(1);
  const coLop = useSlotTrongSuot('full');
  // Nhân vật ảo ngồi chung lớp với người xem thật: phải nói rõ trên màn (docs/04 §6b).
  const coNguoiAo = useStage().bot.enabled;
  // Câu MC do AI dẫn (cô giáo trò chuyện với lớp, lời dặn ở `mc-dan.md`). Lời đố
  // chữ của module không hiện ở đây: module tự vẽ lên bảng đen (caption tắt).
  const loiMc = useLoiMc();

  useEffect(() => {
    const el = khung.current;
    if (el === null) return;
    const ro = new ResizeObserver(() => setTiLe(el.clientWidth / RONG));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="stage" ref={khung}>
      <div
        className="lop"
        style={{
          width: RONG,
          height: CAO,
          transform: `scale(${tiLe})`,
          backgroundImage: `url(${asset('bg/lop.webp')})`,
        }}
      >
        {coLop ? null : (
          <div className="lop-cho">
            <div className="lop-cho-to">Lớp Học Chữ</div>
            <div className="lop-cho-nho">
              Lớp sắp vào giờ…
              <br />
              Bật tính năng <b>Lớp học đố chữ</b> để cô giáo lên lớp
            </div>
          </div>
        )}
        <div className="lop-full">
          <Slot name="full" />
        </div>
        <div className="lop-ticker">
          <Slot name="ticker" />
        </div>
        {loiMc === null ? null : (
          // Bong bóng thoại trên đầu cô giáo — đè tạm bảng "Học sinh xuất sắc" vài
          // giây, không bao giờ che bảng đen.
          <div className="lop-mc" role="status" key={loiMc.at}>
            <p>{loiMc.text}</p>
          </div>
        )}
        {coNguoiAo ? <div className="lop-minh-bach">Lớp có nhân vật minh họa</div> : null}
      </div>
    </div>
  );
}
