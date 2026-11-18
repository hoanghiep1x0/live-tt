/** Màn Đại Chiến hai thần (pha Mùa Lũ): Sơn Tinh trái, Thủy Tinh phải, chưởng lực va nhau giữa màn.
 *  Điểm va lấn về phía phe đang thua; hết trận hiện phe thắng, thần thua tối đi.
 *  `BangDaiChien` nằm trong khối chữ trên đầu (điểm, đồng hồ); `SanDaiChien` là sân giữa màn. */

import { useState } from 'react';
import { quyetChien, theTran, type Pha, type The } from './loi/core';
import { ThanhTranPhap } from './TranPhap';
import { PHE, type Phe } from './loi/the-gioi';
import { ChuVang } from './ChuVang';

type PhaLu = Extract<Pha, { k: 'lu' } | { k: 'lu-ket' }>;

/** Toạ độ (khung 1080×1920) lòng bàn tay hai thần trong tranh: tranh 480×720 đặt ở top 460, tay ở
 *  ~90% ngang, ~22% dọc. Đổi tranh thần thì chỉnh ba số này. */
export const TAY_SON = 392;
export const TAY_THUY = 688;
export const TAY_Y = 618;

/** Điểm va: giữa hai bàn tay; phe nào đông tay hơn thì đẩy điểm va sang phía bên kia. */
export function diemVa(son: number, thuy: number): number {
  const tong = son + thuy;
  const giua = (TAY_SON + TAY_THUY) / 2;
  if (tong === 0) return giua;
  return giua + Math.max(-1, Math.min(1, (son - thuy) / tong)) * ((TAY_THUY - TAY_SON) / 2 - 24);
}

export function BangDaiChien({ the, p, now }: { the: The; p: PhaLu; now: number }) {
  const xong = p.k === 'lu-ket';
  const giay = Math.max(0, Math.ceil((p.den - now) / 1000));
  const tong = Math.max(1, p.son + p.thuy);
  const qc = p.k === 'lu' && quyetChien(p, now);
  // Đang đánh: số to là TRẬN KHÍ còn lại của mỗi phe (cạn là bị phá trận); hết trận: tổng lực đã đánh.
  const lu = p.k === 'lu' ? p : null;
  const khiSon = lu ? Math.max(0, lu.H - lu.thuy) : 0;
  const khiThuy = lu ? Math.max(0, lu.H - lu.son) : 0;
  return (
    <section className={`sh-dc-bang${qc ? ' quyet' : ''}`}>
      <h2>{qc ? '🔥 QUYẾT CHIẾN · điểm ×1,5 🔥' : `⚔ ${p.dai ? 'Đại Hồng Thủy' : 'Đại Chiến Sơn – Thủy'}`}</h2>
      <div className="sh-dc-diem">
        <div className="son">
          <small>
            ⛰️ {PHE.son.tenNgan}
            {lu ? ` · ${lu.chu.son ? (the.nguoi.get(lu.chu.son)?.ten ?? '') : 'Thạch tướng'}` : ''}
          </small>
          <b>{Math.round(lu ? khiSon : p.son)}</b>
        </div>
        <div className={`sh-dc-gio${!xong && giay <= 5 ? ' gap' : ''}`}>{xong ? 'Hết' : giay}</div>
        <div className="thuy">
          <small>
            {lu ? `${lu.chu.thuy ? (the.nguoi.get(lu.chu.thuy)?.ten ?? '') : 'Thủy tướng'} · ` : ''}
            {PHE.thuy.tenNgan} 🌊
          </small>
          <b>{Math.round(lu ? khiThuy : p.thuy)}</b>
        </div>
      </div>
      {lu ? (
        <div className="sh-dc-khi">
          <div className="son">
            <i style={{ width: `${(100 * khiSon) / lu.H}%` }} />
          </div>
          <div className="thuy">
            <i style={{ width: `${(100 * khiThuy) / lu.H}%` }} />
          </div>
        </div>
      ) : (
        <div className="sh-dc-keo">
          <i className="son" style={{ width: `${(100 * p.son) / tong}%` }} />
          <i className="thuy" />
        </div>
      )}
      {lu ? <LucPhe p={lu} /> : null}
      {lu ? <ThanhTranPhap the={the} p={lu} now={now} /> : null}
      <p>Hai Chủ Tướng quyết đấu (đòn ×3) · cả phe truyền công và cùng hô trận pháp · 🎁 quà kết trận ngay · ❤ tim cũng tính</p>
    </section>
  );
}

/** Thế trận mỗi phe: số người ra tay, tim, quà; phe đang thua xa thì hiện hệ số bứt phá. */
function LucPhe({ p }: { p: Extract<Pha, { k: 'lu' }> }) {
  const t = theTran(p);
  const dong = (x: (typeof t)['son']) => (
    <>
      ⚔ {x.so} · ❤ {x.tim} · 🎁 {x.xu}
      {x.butPha > 1.001 ? <b> · ⚡ ×{x.butPha.toFixed(2)}</b> : null}
    </>
  );
  // Thần binh đang đánh bù cho phe ít người.
  const binh = (phe: Phe) => (p.binh[phe] > 0.5 ? <b> · 🗡 thần binh</b> : null);
  return (
    <div className="sh-dc-luc">
      <span className="son">
        {dong(t.son)}
        {binh('son')}
      </span>
      <span className="thuy">
        {dong(t.thuy)}
        {binh('thuy')}
      </span>
    </div>
  );
}

function Than({ phe, asset, trangThai }: { phe: Phe; asset: (p: string) => string; trangThai: string }) {
  const [co, setCo] = useState(true);
  if (!co) return null;
  return (
    <img
      className={`sh-dc-than ${phe} ${trangThai}`}
      src={asset(`than/${phe === 'son' ? 'son-tinh' : 'thuy-tinh'}.webp`)}
      alt=""
      onError={() => setCo(false)}
    />
  );
}

/** Bộ đếm liên kích một phe: hiện khi đang nối từ 5 đòn trở lên. */
function LienKich({ p, phe, now }: { p: Extract<Pha, { k: 'lu' }>; phe: Phe; now: number }) {
  const cb = p.combo[phe];
  if (cb.so < 5 || now - cb.luc > 2_500) return null;
  return (
    <div key={Math.floor(cb.so / 20)} className={`sh-dc-combo ${phe}${cb.so >= 20 ? ' lon' : ''}`}>
      <small>Liên kích</small>
      <b>×{cb.so}</b>
    </div>
  );
}

/** Đấu tướng: hai Tiên Phong, VS ở giữa, điểm từng người và thanh thời gian; xong thì báo người thắng. */
function DauTuong({ p, now, ten, anh }: { p: Extract<Pha, { k: 'lu' }>; now: number; ten: (u: string) => string; anh: (u: string) => string | undefined }) {
  const Mat = ({ u, phe }: { u: string; phe: Phe }) => {
    const url = anh(u);
    return (
      <div className={`sh-dt-tuong ${phe}`}>
        <span className="sh-dt-anh">{url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : <b>{(ten(u).trim()[0] ?? '?').toUpperCase()}</b>}</span>
        <strong>{ten(u)}</strong>
      </div>
    );
  };
  if (p.dau !== null && now < p.dau.den) {
    const d = p.dau;
    return (
      <div className="sh-dt">
        <h4>⚔ Đấu tướng ⚔</h4>
        <div className="sh-dt-hang">
          <Mat u={d.son} phe="son" />
          <div className="sh-dt-vs">
            <em>{Math.round(d.diem.son)}</em>
            <b>VS</b>
            <em>{Math.round(d.diem.thuy)}</em>
          </div>
          <Mat u={d.thuy} phe="thuy" />
        </div>
        <div className="sh-dt-gio">
          <i style={{ width: `${Math.max(0, Math.min(100, ((d.den - now) / 6000) * 100))}%` }} />
        </div>
      </div>
    );
  }
  if (p.dauKet !== null && now - p.dauKet.luc < 2_200) {
    const k = p.dauKet;
    return (
      <div key={k.luc} className={`sh-dt ket ${k.thang ?? 'hoa'}`}>
        <h4>{k.thang === null ? 'Đấu tướng · bất phân thắng bại' : `${ten(k[k.thang])} thắng đấu tướng!`}</h4>
        {k.thang !== null ? <small>{PHE[k.thang].tenNgan} +12 điểm</small> : null}
      </div>
    );
  }
  return null;
}

export function SanDaiChien({
  p,
  asset,
  now,
  ten,
  anh,
}: {
  p: PhaLu;
  asset: (p: string) => string;
  now: number;
  ten: (u: string) => string;
  anh: (u: string) => string | undefined;
}) {
  const xong = p.k === 'lu-ket';
  const x = diemVa(p.son, p.thuy);
  const tt = (phe: Phe) => (!xong ? '' : p.thang === null ? '' : p.thang === phe ? 'thang' : 'thua');
  return (
    <div className={`sh-dc-san${xong ? ' xong' : ''}`}>
      <Than phe="son" asset={asset} trangThai={tt('son')} />
      <Than phe="thuy" asset={asset} trangThai={tt('thuy')} />
      {xong ? null : (
        <>
          <div className="sh-dc-chuong son" style={{ left: `${TAY_SON}px`, width: `${x - TAY_SON}px`, top: `${TAY_Y}px` }} />
          <div className="sh-dc-chuong thuy" style={{ left: `${x}px`, width: `${TAY_THUY - x}px`, top: `${TAY_Y}px` }} />
          <div className="sh-dc-va" style={{ left: `${x}px`, top: `${TAY_Y}px` }}>
            <i />
            <i />
            <i />
          </div>
          {p.k === 'lu' ? (
            <>
              <LienKich p={p} phe="son" now={now} />
              <LienKich p={p} phe="thuy" now={now} />
              <DauTuong p={p} now={now} ten={ten} anh={anh} />
              {p.dao !== null && now - p.dao.luc < 1_800 ? (
                <div key={p.dao.luc} className={`sh-dc-dao ${p.dao.phe}`}>
                  <ChuVang chu="Đảo chiều!" />
                  <small>{PHE[p.dao.phe].tenNgan} vượt lên</small>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
      {xong ? (
        <div className={`sh-dc-ket ${p.thang ?? 'hoa'}`}>
          <b>
            <ChuVang
              chu={p.thang === null ? 'Bất phân thắng bại' : `${PHE[p.thang].tenNgan} thắng`}
              to={
                p.thang === 'son'
                  ? 'linear-gradient(180deg, #fffbe6 10%, #ffe08a 45%, #8fe0a5 75%, #3f8f5a 95%)'
                  : p.thang === 'thuy'
                    ? 'linear-gradient(180deg, #ffffff 10%, #c8fbff 45%, #5ee0e6 75%, #2a6fb2 95%)'
                    : undefined
              }
              sang={p.thang === 'son' ? 'rgba(111,207,143,.9)' : p.thang === 'thuy' ? 'rgba(94,224,230,.9)' : undefined}
            />
          </b>
          <small>
            {Math.round(p.son)} lực đắp núi · {Math.round(p.thuy)} lực dâng nước
          </small>
        </div>
      ) : null}
    </div>
  );
}
