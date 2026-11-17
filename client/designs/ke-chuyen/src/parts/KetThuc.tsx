/** Màn hình chào kết thúc buổi live: lời cảm ơn, đồng hồ đếm ngược, những
 *  người đã đồng hành (top tặng quà), lời mời lưu kênh. Đếm về 0 thì đổi sang
 *  lời hẹn gặp lại và đứng đó tới khi người vận hành tắt live.
 *
 *  Mốc bắt đầu đếm là lúc cửa sổ này thấy công tắc bật — các cửa sổ cùng mở
 *  (OBS, bảng xem) lệch nhau chỉ vài phần giây. */

import { useEffect, useRef, useState } from 'react';
import { conLaiGiay, dongHoDem } from './ket-thuc';

export interface NguoiDongHanh {
  name: string;
  avatar?: string | undefined;
}

export function KetThuc({
  bat,
  giay,
  loi,
  hen,
  top,
}: {
  bat: boolean;
  giay: number;
  loi: string;
  hen: string;
  top: readonly NguoiDongHanh[];
}) {
  const batDau = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  if (bat && batDau.current === null) batDau.current = Date.now();
  if (!bat) batDau.current = null;

  useEffect(() => {
    if (!bat) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [bat]);

  if (!bat || batDau.current === null) return null;
  const con = conLaiGiay(batDau.current, giay, now);

  return (
    <div className="ket-thuc" aria-live="polite">
      <div className="ket-thuc-the">
        <span className="ket-thuc-sen" />
        <p className="ket-thuc-nhan">Kết thúc buổi live</p>
        <h2 className="ket-thuc-loi">{loi}</h2>
        {con > 0 ? (
          <>
            <p className="ket-thuc-dem-nhan">Live kết thúc sau</p>
            <p className="ket-thuc-dem">{dongHoDem(con)}</p>
            <p className="ket-thuc-hen">{hen}</p>
          </>
        ) : (
          <p className="ket-thuc-het">{hen}</p>
        )}
        {top.length === 0 ? null : (
          <div className="ket-thuc-top">
            <p className="ket-thuc-top-nhan">Cảm ơn những người bạn đã đồng hành</p>
            <div className="ket-thuc-top-ds">
              {top.slice(0, 3).map((n, i) => (
                <span className="ket-thuc-ban" key={`${n.name}-${i}`}>
                  {n.avatar === undefined ? (
                    <i>{n.name.slice(0, 1)}</i>
                  ) : (
                    <img src={n.avatar} alt="" referrerPolicy="no-referrer" />
                  )}
                  <b>{n.name}</b>
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="ket-thuc-luu">Lưu kênh để buổi sau nghe truyện tiếp nha 🌙</p>
      </div>
    </div>
  );
}
