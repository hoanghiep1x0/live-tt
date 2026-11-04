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
import { ANH_DUNG, anhCua, kieuChibi } from './HangGhe';
import type { ChoNgoi } from './HangGhe';

/** Mỗi chu kỳ một lượt an ủi. Bản cũ chờ ngẫu nhiên 40–90 giây; ở đây chốt một
 *  con số để nhịp là hàm thuần của đồng hồ. */
const CHU_KY_MS = 60_000;
const CHAY_MS = 1_600;
const OM_MS = 5_000;
export const TONG_MS = CHAY_MS * 2 + OM_MS;

export type NhanVat = 'be' | 'cau-be';

/** Chỗ đứng ôm quanh từng nhân vật, lấy nguyên `HUG_SPOTS` của bản cũ (x %,
 *  đáy chân y cqw). Bé ở sát mép trái nên cả hai người đứng bên phải; cậu bé
 *  thì một người trước mặt, một người lùi sau mép phải. */
const CHO_OM: Record<NhanVat, readonly { x: number; y: number }[]> = {
  be: [
    { x: 15.4, y: 114 },
    { x: 19, y: 113.6 },
  ],
  'cau-be': [
    { x: 84.9, y: 124 },
    { x: 97.2, y: 116.8 },
  ],
};

/** Nhân vật được ôm đứng ở đâu, để đặt tim. */
const CHO_NHAN_VAT: Record<NhanVat, { x: number; y: number }> = {
  be: { x: 11, y: 117 },
  'cau-be': { x: 91.5, y: 118 },
};

export interface Canh {
  /** Số thứ tự lượt — dùng làm hạt bốc người, nên cùng lượt là cùng người. */
  k: number;
  nhanVat: NhanVat;
  /** Đã trôi bao lâu kể từ đầu lượt. */
  t: number;
}

/** Lượt an ủi đang diễn ra, hoặc `null`. Hàm thuần. */
export function canhAnUi(now: number): Canh | null {
  const k = Math.floor(now / CHU_KY_MS);
  const t = now % CHU_KY_MS;
  if (t >= TONG_MS) return null;
  return { k, nhanVat: k % 2 === 0 ? 'be' : 'cau-be', t };
}

/** Chọn người ôm từ những ai đang ngồi. Thuần theo `k` nên hai cửa sổ chọn
 *  đúng một nhóm. Rạp trống thì không có lượt nào — không dựng người từ hư
 *  không để làm phòng có vẻ đông. */
export function chonNguoiOm(
  ngoi: Map<number, Seat>,
  ghe: readonly ChoNgoi[],
  k: number,
  soNguoi: number,
): { user: string; x: number; y: number }[] {
  const co = [...ngoi.entries()]
    .map(([i, ai]) => {
      const g = ghe.find((x) => x.flat === i);
      return g === undefined ? null : { user: ai.user, x: g.x, y: g.y };
    })
    .filter((x): x is { user: string; x: number; y: number } => x !== null)
    // Hàng gần sân khấu (y nhỏ) được ưu tiên, như bản cũ.
    .sort((a, b) => a.y - b.y);
  if (co.length === 0) return [];

  const ra: { user: string; x: number; y: number }[] = [];
  for (let i = 0; i < soNguoi; i += 1) {
    const j = (k * 7 + i * 13) % co.length;
    const nguoi = co[j];
    if (nguoi !== undefined && !ra.some((x) => x.user === nguoi.user)) ra.push(nguoi);
  }
  return ra;
}

function NguoiOm({
  tu,
  den,
  user,
  t,
  asset,
}: {
  tu: { x: number; y: number };
  den: { x: number; y: number };
  user: string;
  t: number;
  asset: (p: string) => string;
}) {
  // Độ trễ chốt một lần lúc gắn: sửa `animation-delay` của hoạt ảnh đang chạy
  // là nó giật về đầu.
  const [tre] = useState(() => -t);
  return (
    <img
      className="om-nguoi"
      src={asset(anhCua(ANH_DUNG, kieuChibi(user)))}
      alt=""
      style={
        {
          left: `${tu.x}%`,
          top: `${HALL_TOP + tu.y}cqw`,
          '--om-x': `${(den.x - tu.x).toFixed(1)}cqw`,
          '--om-y': `${(den.y - (HALL_TOP + tu.y)).toFixed(1)}cqw`,
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
  const nguoi = chonNguoiOm(ngoi, ghe, canh.k, cho.length);
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
