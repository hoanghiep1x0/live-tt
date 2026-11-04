import { useState } from 'react';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { Loi, State } from './core';
import { chuHien, thoiLuongMs } from './core';
import './stage.css';

/** Một dòng đang trôi.
 *
 *  Độ trễ chốt đúng một lần, lúc gắn: cửa sổ mở giữa chừng thì lùi animation
 *  lại đúng quãng dòng đã trôi, nên hai cửa sổ cùng xem một phòng thấy chữ ở
 *  cùng một chỗ. Đổi `animation-delay` của animation đang chạy là nó giật về
 *  đầu, nên tuyệt đối không cập nhật lại mỗi nhịp. */
function Dong({ loi, hang, giay, daTroi }: { loi: Loi; hang: number; giay: number; daTroi: number }) {
  const [tre] = useState(() => -Math.max(0, Math.min(daTroi, giay)));

  return (
    <p
      className="mod-loi-chay"
      style={{ animationDuration: `${giay.toFixed(1)}s`, animationDelay: `${tre.toFixed(1)}s` }}
    >
      {hang > 0 ? <span className="mod-loi-hang">Top {hang}</span> : null}
      {loi.name === undefined ? null : <b>{loi.name}:</b>}{' '}
      {loi.text}
    </p>
  );
}

/** Dải chữ chạy ngang: lời nhắn mới nhất của người xem trôi từ phải sang trái,
 *  chưa ai nhắn thì chạy lời mời. Một lúc chỉ một dòng — dải cao có 5cqw. */
export function Stage({ config, state, modState, now }: StagePartProps<Config, State>) {
  const loi = modState.dang;
  if (loi === null) return null;

  const hang =
    loi.user === undefined
      ? 0
      : state.session.topGivers.findIndex((g) => g.user === loi.user) + 1;
  const giay = thoiLuongMs(chuHien(loi), config.speed) / 1000;

  return (
    <div className="mod-loi">
      <Dong
        key={loi.id}
        loi={loi}
        hang={hang}
        giay={giay}
        daTroi={(now - modState.batDau) / 1000}
      />
    </div>
  );
}
