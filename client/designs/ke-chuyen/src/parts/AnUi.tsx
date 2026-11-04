/** Cảnh an ủi: khán giả chạy lên ôm bé và cậu bé.
 *
 *  Chuyển từ `comfort.ts` + `ChibiLayer` của bản cũ. Cứ một chu kỳ lại có một
 *  lượt: hai người đang ngồi trong rạp đứng dậy chạy lên đứng hai bên nhân vật,
 *  ôm một lúc, tim bay lên đầu, rồi chạy về chỗ. Bé đang buồn thì vui hẳn lên
 *  trong lúc được ôm; cô bé trên đài sen cúi đầu cảm ơn.
 *
 *  Nhịp là hàm THUẦN của đồng hồ, không giữ trạng thái: hai cửa sổ xem cùng một
 *  phòng thấy cùng một lượt, cùng người ôm, cùng lúc. Bản cũ bốc ngẫu nhiên rồi
 *  giữ trong state — làm vậy thì hai cửa sổ lệch nhau.
 *
 *  Vì sao nằm trong thiết kế chứ không phải một module: chỗ đứng ôm neo vào
 *  **đồ đạc của chính phòng này** (bé, cô bé, cậu bé, hàng ghế), mà hợp đồng
 *  slot chưa có đường nào cho module biết những toạ độ đó. Xem thêm ghi chú đầu
 *  `HangGhe.tsx`.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Seat } from '@live/contracts';
import { HALL_TOP } from '../geometry';
import { AISLES_X, HALL_FIRST_Y, HALL_ROW_H } from '../seats';
import { loiGan } from './di-lai';
import { ANH_DUNG, anhCua, kieuChibi } from './ghe';
import type { ChoNgoi } from './ghe';
import { CHAY_MS, CHO_NHAN_VAT, CHO_OM, chonNguoiOm, OM_MS } from './an-ui';
import type { Canh } from './an-ui';

export { canhAnUi, chonNguoiOm, khachXinOm, TONG_MS, xinOm } from './an-ui';
export type { Canh, NhanVat } from './an-ui';

function NguoiOm({
  tu,
  den,
  nghieng,
  user,
  t,
  asset,
}: {
  tu: { x: number; y: number };
  den: { x: number; y: number };
  /** Nghiêng về phía nhân vật lúc ôm: -1 là ngả sang trái, 1 sang phải. */
  nghieng: -1 | 1;
  user: string;
  t: number;
  asset: (p: string) => string;
}) {
  // Độ trễ chốt một lần lúc gắn: sửa `animation-delay` của hoạt ảnh đang chạy
  // là nó giật về đầu.
  const [tre] = useState(() => -t);
  // Hai hàng đầu đã ngồi ngay mép sàn: họ bước thẳng lên là tới. Bắt họ chạy
  // ngang ra lối rồi mới vòng lên thì nhìn dị, vì chẳng có hàng ghế nào chắn
  // đường cả. Từ hàng C trở vào mới phải men theo lối.
  const hangTruoc = tu.y < HALL_FIRST_Y + HALL_ROW_H * 1.5;
  return (
    <img
      className={hangTruoc ? 'om-nguoi thang' : 'om-nguoi'}
      src={asset(anhCua(ANH_DUNG, kieuChibi(user)))}
      alt=""
      style={
        {
          left: `${tu.x}%`,
          top: `${HALL_TOP + tu.y}cqw`,
          // Ba chặng, không cắt chéo qua ghế người khác: ra lối gần nhất trong
          // hàng của mình → chạy dọc lối lên đầu rạp → vòng vào chỗ đứng ôm.
          '--om-loi': `${(AISLES_X[loiGan(tu.x)] ?? 50) - tu.x}cqw`,
          '--om-len': `${(HALL_TOP + 2 - (HALL_TOP + tu.y)).toFixed(1)}cqw`,
          '--om-x': `${(den.x - tu.x).toFixed(1)}cqw`,
          '--om-y': `${(den.y - (HALL_TOP + tu.y)).toFixed(1)}cqw`,
          '--om-nghieng': `${nghieng * 7}deg`,
          animationDelay: `${tre}ms, ${tre}ms`,
        } as CSSProperties
      }
    />
  );
}

export function AnUi({
  canh,
  ngoi,
  ghe,
  asset,
}: {
  canh: Canh | null;
  ngoi: Map<number, Seat>;
  ghe: readonly ChoNgoi[];
  asset: (p: string) => string;
}) {
  if (canh === null) return null;
  const cho = CHO_OM[canh.nhanVat];
  const nguoi = chonNguoiOm(ngoi, ghe, canh.k, cho.length, canh.nguoiXin);
  if (nguoi.length === 0) return null;
  const tim = CHO_NHAN_VAT[canh.nhanVat];
  const dangOm = canh.t >= CHAY_MS && canh.t < CHAY_MS + OM_MS;

  return (
    <div className="lop-an-ui" aria-hidden>
      {nguoi.map((n, i) => (
        <NguoiOm
          key={`${canh.k}:${n.user}`}
          tu={n}
          den={cho[i] ?? cho[0] ?? { x: 50, y: 120 }}
          // Ngả người về phía nhân vật: đứng bên phải thì ngả trái và ngược lại.
          nghieng={(cho[i] ?? cho[0] ?? { x: 50 }).x >= tim.x ? -1 : 1}
          user={n.user}
          t={canh.t}
          asset={asset}
        />
      ))}
      {!dangOm ? null : (
        <div className="om-tim" style={{ left: `${tim.x}%`, top: `${tim.y - 11}cqw` }}>
          {['💗', '🤍', '💖', '🤍', '💗'].map((h, i) => (
            <span key={i} style={{ '--i': i } as CSSProperties}>
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
