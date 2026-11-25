/** Điểm nhấn riêng của từng màn, cùng kiểu với màn đột phá của tu luyện:
 *  - Đại Chiến: TUYỆT KỸ — cao thủ tung chiêu, tranh nhân vật lướt vào, tên chiêu to giữa màn.
 *  - Yêu tinh, Địa Cung: VINH DANH — tôn người chơi chứ không tôn món đồ: tranh nhân vật to, lực
 *    chiến tăng từ bao nhiêu lên bao nhiêu; đồ chỉ là hình nhỏ bên dưới.
 *  Modal nền trong suốt, nổi trên mọi lớp, tự tắt. */

import { useState, type CSSProperties } from 'react';
import { ChuVang } from './ChuVang';
import { VongHao } from './VongHao';
import { TranhCanh } from './DotPha';
import type { NguoiChoi } from './loi/core';
import { CANH_GIOI, PHE, type Phe } from './loi/the-gioi';
import { hinhDo, PHAM, tenDo, type OTrangBi, type TrangBi } from './loi/trang-bi';

export const TUYET_KY_MS = 2600;
export const VINH_DANH_MS = 3400;

export type NoiBat =
  | { loai: 'tuyet-ky'; user: string; phe: Phe; chieu: string; den: number }
  | {
      loai: 'vinh-danh';
      user: string;
      /** Dòng nhỏ trên tên: "Thoát Địa Cung · hạng 1", "Chiến lợi phẩm yêu tinh". */
      tieuDe: string;
      vat: TrangBi[];
      lucTruoc: number;
      lucSau: number;
      lk: number;
      den: number;
    };

const HINH: Record<OTrangBi | 'ruong', string> = { vu: '⚔️', ao: '🛡️', bao: '📿', ruong: '🧰' };

/** Hình món đồ: ảnh riêng của kho người vận hành → tranh biến thể theo tông + giới người cầm (`hinhDo`, khi có `vat`)
 *  → tranh chung `do/<ô>.webp` → biểu tượng tạm. Hỏng bậc nào thì lùi bậc sau. */
export function HinhDo({ o, asset, lop, anh, vat }: { o: OTrangBi | 'ruong'; asset: (p: string) => string; lop?: string; anh?: string | undefined; vat?: TrangBi | undefined }) {
  const ds: string[] = [];
  if (anh !== undefined && anh !== '') ds.push(anh);
  if (vat !== undefined && vat.bt !== undefined) ds.push(asset(hinhDo(vat)));
  ds.push(asset(`do/${o}.webp`));
  const khoa = ds.join('|');
  const [loi, setLoi] = useState<{ khoa: string; bac: number }>({ khoa, bac: 0 });
  const bac = loi.khoa === khoa ? loi.bac : 0;
  if (bac >= ds.length) return <span className={`sh-hinh-do tam${lop ? ` ${lop}` : ''}`}>{HINH[o]}</span>;
  return <img className={`sh-hinh-do${lop ? ` ${lop}` : ''}`} src={ds[bac]} alt="" onError={() => setLoi({ khoa, bac: bac + 1 })} />;
}

export function TuyetKy({ n, nb, asset }: { n: NguoiChoi; nb: Extract<NoiBat, { loai: 'tuyet-ky' }>; asset: (p: string) => string }) {
  const mau = PHE[nb.phe].mauSang;
  return (
    <div className={`sh-tk ${nb.phe}`} style={{ '--mau': mau } as CSSProperties}>
      <div className="sh-tk-dai" />
      <div className="sh-tk-nv">
        {n.canh >= 4 ? <VongHao asset={asset} mau={mau} /> : null}
        <TranhCanh phe={nb.phe} gioi={n.gioi} canh={n.canh} asset={asset} lop="sh-tk-tranh" />
      </div>
      <div className="sh-tk-chu">
        <small>Tuyệt kỹ</small>
        <h3>
          <ChuVang
            chu={nb.chieu}
            to={nb.phe === 'son' ? 'linear-gradient(180deg, #fffbe6 10%, #ffe08a 45%, #8fe0a5 78%, #3f8f5a 96%)' : 'linear-gradient(180deg, #ffffff 10%, #c8fbff 45%, #5ee0e6 78%, #2a6fb2 96%)'}
            sang={mau}
          />
        </h3>
        <b>{n.ten}</b>
      </div>
    </div>
  );
}

export function VinhDanh({
  n,
  nb,
  asset,
  goc = false,
}: {
  n: NguoiChoi;
  nb: Extract<NoiBat, { loai: 'vinh-danh' }>;
  asset: (p: string) => string;
  /** Đang đánh yêu tinh / Đại Chiến: thu nhỏ xuống góc dưới bên phải, không che trận. */
  goc?: boolean;
}) {
  const mau = n.phe === null ? '#ffd24c' : PHE[n.phe].mauSang;
  const tang = nb.lucSau - nb.lucTruoc;
  return (
    <div className={`sh-vd${goc ? ' goc' : ''}`} style={{ '--mau': mau } as CSSProperties}>
      <div className="sh-vd-hao" />
      <div className="sh-vd-nv">
        {n.canh >= 4 ? <VongHao asset={asset} mau={CANH_GIOI[n.canh]?.hao ?? mau} /> : null}
        <TranhCanh phe={n.phe} gioi={n.gioi} canh={n.canh} ao={n.ao} asset={asset} lop="sh-vd-tranh" />
      </div>
      <div className="sh-vd-chu">
        <small>{nb.tieuDe}</small>
        <h3>
          <ChuVang chu={n.ten} />
        </h3>
        {nb.lucSau > 0 ? (
          <div className="sh-vd-luc">
            <span>Lực chiến</span>
            <em>{nb.lucTruoc.toLocaleString('vi-VN')}</em>
            <b>»</b>
            <strong>{nb.lucSau.toLocaleString('vi-VN')}</strong>
            {tang > 0 ? <i>+{tang}</i> : null}
          </div>
        ) : n.phe !== null ? (
          <div className="sh-vd-luc">
            <span>nhập môn {PHE[n.phe].ten}</span>
          </div>
        ) : null}
        {nb.vat.length > 0 ? (
          <ul>
            {nb.vat.map((v, i) => (
              <li key={i} style={{ '--pham': PHAM[v.pham]!.mau } as CSSProperties}>
                <HinhDo o={v.o} asset={asset} anh={v.anh} vat={v} />
                <span>{tenDo(v)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {nb.lk > 0 ? <footer>+{nb.lk} linh khí</footer> : null}
      </div>
    </div>
  );
}
