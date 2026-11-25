/** Màn đột phá: một đoạn hoạt hình ~6 giây phủ gần kín khung, nền trong suốt.
 *
 *  1. Tụ khí: màn tối dần, linh khí hút về giữa, nhân vật trong trang phục cảnh giới CŨ rung, sáng.
 *  2. Bùng nổ: chớp trắng, cột sáng, ba vòng sóng.
 *  3. Hiện thân: nhân vật trong trang phục cảnh giới MỚI hiện to, tia sáng xoay, linh khí bay lên.
 *  4. Chữ: "ĐỘT PHÁ", tên người chơi, "cảnh cũ ➜ cảnh mới".
 *
 *  Toàn bộ là CSS animation theo mốc thời gian; thiết kế không giữ trạng thái nào. */

import { useState, type CSSProperties } from 'react';
import { lucChienCua, tenCanh, type NguoiChoi } from './loi/core';
import { CANH_GIOI, PHE, chucVu, duongTranh, type Gioi, type Phe } from './loi/the-gioi';
import { ChuVang } from './ChuVang';
import { VongHao } from './VongHao';

export const DOT_PHA_MS = 6200;
/** Bản ngắn cho cảnh giới thấp: người mới đột phá liên tục, bản dài sẽ chiếm cả buổi live. */
export const DOT_PHA_NGAN_MS = 4200;

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Linh khí: vị trí cố định theo chỉ số để mỗi lần hiện giống nhau, không nhảy khi vẽ lại. */
const HUT = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  return { x: Math.cos(a) * 520, y: Math.sin(a) * 620, tre: (i % 6) * 0.08 };
});
const BAY = Array.from({ length: 22 }, (_, i) => ({ trai: 8 + ((i * 41) % 84), tre: 1.3 + ((i * 0.23) % 2.2), co: 8 + (i % 4) * 4 }));

/** Tranh nhân vật của một cảnh giới; tấm nào thiếu thì lùi dần xuống cảnh giới dưới. */
/** Tranh nhân vật theo phe, giới, cảnh giới; thiếu tấm nào thì lùi dần (xem `duongTranh`). Khách
 *  (phe null) là phàm nhân. */
export function TranhCanh({
  phe,
  gioi,
  canh,
  asset,
  lop,
  ao = 0,
}: {
  phe: Phe | null;
  gioi: Gioi | null;
  canh: number;
  asset: (p: string) => string;
  lop: string;
  /** Bộ trang phục cơ bản (0 là áo theo cảnh giới). */
  ao?: number;
}) {
  const ds = duongTranh(phe, gioi, canh, ao);
  const [thu, setThu] = useState(0);
  const p = ds[thu];
  if (p === undefined) return null;
  return <img className={lop} src={asset(p)} alt="" onError={() => setThu((x) => x + 1)} />;
}

export function DotPha({
  n,
  canh,
  anh,
  asset,
  ngan,
  thach,
  phong,
}: {
  n: NguoiChoi;
  canh: number;
  anh: string | undefined;
  asset: (p: string) => string;
  ngan: boolean;
  thach: number;
  phong: number;
}) {
  const hao = CANH_GIOI[canh]?.hao ?? '#ffffff';
  const haoCu = CANH_GIOI[Math.max(0, canh - 1)]?.hao ?? '#cccccc';
  const phe = n.phe ?? 'son';
  const tong = (c: number) => lucChienCua(Math.max(0, c), n.tb, n.vo);
  const lucCu = tong(canh - 1);
  const lucMoi = tong(canh);
  const kieu = {
    '--hao': hao,
    '--hao-dam': rgba(hao, 0.6),
    '--hao-nhat': rgba(hao, 0.25),
    '--hao-mo': rgba(hao, 0),
    '--hao-cu': haoCu,
    '--phe': PHE[phe].mauSang,
  } as CSSProperties;

  return (
    <div className={`sh-dp${ngan ? ' ngan' : ''}`} style={kieu}>
      <div className="sh-dp-toi" />
      <div className="sh-dp-tam">
        <div className="sh-dp-quang" />
        <div className="sh-dp-tia" />
        <div className="sh-dp-cot" />
        <div className="sh-dp-vong" />
        <div className="sh-dp-vong v2" />
        <div className="sh-dp-vong v3" />
        {HUT.map((h, i) => (
          <i
            key={`h${i}`}
            className="sh-dp-hut"
            style={{ '--tx': `${h.x}px`, '--ty': `${h.y}px`, animationDelay: `${h.tre}s` } as CSSProperties}
          />
        ))}
        <div className="sh-dp-nv">
          {/* Vòng hào quang hiện cùng trang phục mới, sau chớp sáng. */}
          {canh >= 4 ? <VongHao asset={asset} mau={hao} tre={1.15} /> : null}
          <TranhCanh phe={phe} gioi={n.gioi} canh={canh - 1} asset={asset} lop="cu" />
          <TranhCanh phe={phe} gioi={n.gioi} canh={canh} asset={asset} lop="moi" />
          {anh ? <img className="sh-dp-huy" src={anh} alt="" referrerPolicy="no-referrer" /> : null}
        </div>
      </div>
      {BAY.map((h, i) => (
        <i
          key={`b${i}`}
          className="sh-dp-bay"
          style={{ left: `${h.trai}%`, width: h.co, height: h.co, animationDelay: `${h.tre}s` }}
        />
      ))}
      <div className="sh-dp-chop" />
      <div className="sh-dp-chu">
        {/* Tên người đột phá là chữ chính (vàng, to, vắt qua mép khung); "Đột phá" chỉ là dòng nhỏ. */}
        <h3>
          <ChuVang chu={n.ten} />
        </h3>
        <div className="sh-dp-ten">
          <small>Đột phá</small>
          <i>{PHE[phe].tenNgan}</i>
          {/* Lực chiến trước và sau: cảnh giới mới cộng công thủ gốc, đồ đang mặc giữ nguyên. */}
          <span className="sh-dp-luc">
            Lực chiến {lucCu.toLocaleString('vi-VN')} <span className="mui">»</span> <b>{lucMoi.toLocaleString('vi-VN')}</b>
          </span>
        </div>
        <div className="sh-dp-ke" />
        <p>
          <em>{tenCanh(canh - 1)}</em>
          <b>»</b>
          <span>
            <ChuVang chu={tenCanh(canh)} to={`linear-gradient(180deg, #ffffff 15%, ${hao} 78%)`} sang={hao} />
          </span>
        </p>
        {/* Lên cảnh giới là lên chức: ghế mới cao hơn trong điện. */}
        {chucVu(phe, canh) !== chucVu(phe, canh - 1) ? (
          <div className="sh-dp-cv">
            Thăng <b>{chucVu(phe, canh)}</b>
          </div>
        ) : null}
        {/* Hàng cuối: lộc linh thạch — người đột phá và cả phòng đang online. */}
        {thach > 0 ? (
          <div className="sh-dp-thach">
            💎 <b>+{thach}</b> linh thạch · đang có <b>{n.tinChi.toLocaleString('vi-VN')}</b> · cả phòng mỗi người{' '}
            <b>+{phong}</b>
          </div>
        ) : null}
      </div>
    </div>
  );
}
