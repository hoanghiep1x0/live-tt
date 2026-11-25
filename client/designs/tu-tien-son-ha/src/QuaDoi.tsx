/** Bảng "Quà tặng quy đổi" lúc tu luyện, ghi theo **quà TikTok thật** (ảnh + giá xu) thay vì "mỗi 1 xu":
 *  người xem nhìn đúng món trên bảng quà của mình và biết tặng món đó được gì. Số tính từ hằng trong lõi
 *  (`QUA_LK`, `QUA_XU_MOI_LK`, `QUA_DUOI_TOI_DA`, `bacQua`) nên đổi luật là bảng tự đổi theo. */

import { bacQua, QUA_DUOI_TOI_DA, QUA_LK, QUA_XU_MOI_LK } from './loi/core';
import { anhQua } from './QuaBien';

/** Các quà đầu bảng quà TikTok (giá tăng dần, mỗi món một nấc). */
export const QUA_DOI: readonly { ten: string; xu: number }[] = [
  { ten: 'Rose', xu: 1 },
  { ten: 'Finger Heart', xu: 5 },
  { ten: 'Rosa', xu: 10 },
  { ten: 'Doughnut', xu: 30 },
  { ten: 'Hand Heart', xu: 100 },
  { ten: 'Money Gun', xu: 500 },
];

/** Tặng một món `xu` lúc tu luyện được gì: linh thạch, linh khí bản thân, linh khí mỗi đệ tử ngồi dưới. */
export function duocGi(xu: number): { thach: number; lk: number; duoi: number; mua: boolean } {
  return { thach: xu, lk: QUA_LK * xu, duoi: Math.min(QUA_DUOI_TOI_DA, Math.ceil(xu / QUA_XU_MOI_LK)), mua: bacQua(xu) >= 4 };
}

export function BangQuaDoi() {
  return (
    <>
      <ul className="sh-qd-ds">
        {QUA_DOI.map((q) => {
          const u = anhQua(q.ten);
          const d = duocGi(q.xu);
          return (
            <li key={q.ten}>
              <span className="anh">
                {u !== null ? <img src={u} alt="" width={46} height={46} /> : <i>🎁</i>}
                <span className="xu">{q.xu}</span>
              </span>
              <span className="duoc">
                <b>
                  +{d.thach}💎 +{d.lk}⚡
                </b>
                <small>{d.mua ? '🌧 mưa thạch cả phòng' : `đệ tử dưới +${d.duoi}⚡`}</small>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="sh-qd-vd">🔯 mỗi xu +1 trận lực tông · ⚡ đầy thì gõ 5 đột phá</p>
    </>
  );
}
