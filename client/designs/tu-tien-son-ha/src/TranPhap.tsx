/** Thanh Trận Pháp của một trận (Đại Chiến hoặc đánh yêu tinh): mỗi phe bốn ô (hồi, thủ, công, phá),
 *  mỗi ô hiện "sẵn", số giây hồi chiêu, hoặc sáng lên khi hiệu lực đang chạy. Trận pháp tự kết bằng
 *  Linh Mạch của phe; quà tặng thì kết ngay. Dưới là Linh Mạch của phe.
 *  `BannerTran` là dòng chữ lớn hiện ~2 giây khi một phe vừa kết trận. */

import type { CSSProperties } from 'react';
import { hoiChieu, type Pha, type The } from './loi/core';
import { KY_DS, KY_HINH, KY_LENH, KY_PK, KY_YEU, PHE, TRAN_PHAP, type Ky, type Phe } from './loi/the-gioi';

type PhaTran = Extract<Pha, { k: 'lu' } | { k: 'yeu' }>;

function dangChay(p: PhaTran, phe: Phe, ky: Ky, now: number): boolean {
  const hl = p.tran.hl;
  const dich: Phe = phe === 'son' ? 'thuy' : 'son';
  if (ky === 'cong') return hl[phe].cong > now;
  if (ky === 'thu') return hl[phe].thu > now;
  if (ky === 'hoi') return hl[phe].ho > now;
  return p.k === 'lu' ? hl[dich].vo > now : p.yeuVo > now;
}

function MotPhe({ the, p, phe, now }: { the: The; p: PhaTran; phe: Phe; now: number }) {
  const mien = p.tran.mien[phe];
  return (
    <div className={`sh-tp-phe ${phe}`} style={{ '--mau': PHE[phe].mauSang } as CSSProperties}>
      <div className="sh-tp-hang">
        {KY_DS.map((ky) => {
          const cho = hoiChieu(p, phe, ky, now);
          const chay = dangChay(p, phe, ky, now);
          return (
            <span key={ky} className={`sh-tp-o${chay ? ' chay' : cho > 0 ? ' cho' : ''}`} title={TRAN_PHAP[phe][ky]}>
              <i>{KY_HINH[ky]}</i>
              <b>{KY_LENH[ky]}</b>
              <em>{chay ? '✦' : cho > 0 ? `${Math.ceil(cho / 1000)}s` : 'sẵn'}</em>
            </span>
          );
        })}
      </div>
      <small>
        💠 Linh Mạch {the.linhMach[phe]} · tự kết trận
        {mien > 0 ? ' (lượt đầu thần ban)' : ' (tốn 10)'}
      </small>
    </div>
  );
}

export function ThanhTranPhap({ the, p, now }: { the: The; p: PhaTran; now: number }) {
  return (
    <div className="sh-tp">
      <MotPhe the={the} p={p} phe="son" now={now} />
      <MotPhe the={the} p={p} phe="thuy" now={now} />
    </div>
  );
}

export function BannerTran({ p, now }: { p: PhaTran; now: number }) {
  const c = p.tran.cuoi;
  if (c === null || now - c.luc > 2_200) return null;
  return (
    <div key={c.luc} className={`sh-tp-banner ${c.phe}`} style={{ '--mau': PHE[c.phe].mauSang } as CSSProperties}>
      <i>{KY_HINH[c.ky]}</i>
      <div>
        <small>{PHE[c.phe].tenNgan} kết trận</small>
        <b>{TRAN_PHAP[c.phe][c.ky]}</b>
        <em>{p.k === 'lu' ? KY_PK[c.ky] : KY_YEU[c.ky]}</em>
      </div>
    </div>
  );
}
