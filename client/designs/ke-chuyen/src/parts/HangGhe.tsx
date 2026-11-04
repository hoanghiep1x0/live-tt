/** Rạp ghế và khán giả ngồi trên đó.
 *
 *  Ghế là **đồ đạc của phòng** (docs/04 §6: "nền sân khấu, khung cảnh, ghế" thuộc
 *  thiết kế), nên thiết kế tự vẽ; ai ngồi ghế nào thì đọc từ phiên, mà phiên nằm
 *  ở backend.
 *
 *  Vì sao ảnh khán giả cũng nằm trong assets của THIẾT KẾ, dù docs/04 §6 xếp
 *  "sprite nhân vật" về phía module: lý do của luật đó là "cùng tính năng phải
 *  chạy ở mọi phòng" — sprite của một module phải đi theo module. Ở đây không có
 *  module nào vẽ người ngồi ghế, và cũng chưa thể có: slot `seats` không mang
 *  theo toạ độ ghế, mà toạ độ ghế là của riêng thiết kế. Người ngồi ghế là một
 *  phần của khung cảnh rạp, không phải của một tính năng. Ngày nào hợp đồng cho
 *  module biết chỗ ngồi thì tách ra, và ảnh đi theo module.
 */

import { useEffect, useRef, useState } from 'react';
import type { Seat } from '@live/contracts';
import { rowName, seatLayout, seatsInRow, tierOf } from '../seats';

export interface ChoNgoi {
  key: string;
  r: number;
  /** Chỉ số phẳng, đếm từ ghế đầu hàng A. Backend xếp chỗ theo đúng thứ tự này,
   *  nên `Seat.i` khớp thẳng vào đây mà không cần bảng quy đổi. */
  flat: number;
  x: number;
  y: number;
  scale: number;
}

export function dungGhe(rows: number): ChoNgoi[] {
  const ra: ChoNgoi[] = [];
  let flat = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let i = 0; i < seatsInRow(r); i += 1) {
      ra.push({ key: `${r}-${i}`, r, flat, ...seatLayout(r, i) });
      flat += 1;
    }
  }
  return ra;
}

/** Sáu kiểu khán giả, mỗi kiểu hai dáng. Đây là CHÍNH sáu nhân vật của bản cũ:
 *  chạy lại `buildChibi(0..5)` trong `chibi3d.ts` với đúng bộ đèn rồi chụp ra
 *  PNG nền trong — xem `assets/CREDITS.md`. */
const SO_KIEU = 6;
export const ANH_NGOI: readonly string[] = Array.from(
  { length: SO_KIEU },
  (_, i) => `chibi/khan-${i + 1}.png`,
);
export const ANH_DUNG: readonly string[] = Array.from(
  { length: SO_KIEU },
  (_, i) => `chibi/dung-${i + 1}.png`,
);

/** Lấy ảnh theo kiểu. Mảng dựng đủ `SO_KIEU` phần tử và `kieuChibi` luôn trả số
 *  trong khoảng đó, nhưng `noUncheckedIndexedAccess` không biết điều ấy. */
function anhCua(ds: readonly string[], kieu: number): string {
  return ds[kieu] ?? ds[0] ?? '';
}

/** Mỗi người xem giữ đúng một kiểu suốt buổi: băm từ nick chứ không bốc ngẫu
 *  nhiên, nên hai cửa sổ xem cùng một phòng thấy giống hệt nhau và người đó đổi
 *  ghế vẫn là người đó. Chuyển nguyên ý `chibiVariantOf` của bản cũ. */
export function kieuChibi(user: string): number {
  let h = 0;
  for (let i = 0; i < user.length; i += 1) h = (h * 31 + user.charCodeAt(i)) % 100_003;
  return h % SO_KIEU;
}

/** Đi từ cuối lối giữa lên tới ghế mất ngần này. Phải khớp `ghe-di` trong
 *  stage.css. Bản cũ cho một lượt đi ở lối giữa 5,2 giây cho cả quãng rạp; ở
 *  đây quãng ngắn hơn vì đi thẳng từ lối vào tới ghế. */
const DI_MS = 1_500;
/** Người rời ghế được giữ lại ngần này để đi ra. Khớp `ghe-ra` trong stage.css. */
const RA_MS = 1_500;

/** Một khán giả: đi vào bằng dáng ĐỨNG, tới nơi mới đổi sang dáng NGỒI.
 *
 *  Bản cũ dựng hai dáng khác nhau từ cùng một nhân vật (`buildChibi(v, {
 *  standing })`) chứ không trượt cái dáng ngồi vào chỗ — người ngồi mà trôi
 *  ngang qua rạp thì nhìn ra ngay là ảnh dán. */
function Khan({ user, asset }: { user: string; asset: (p: string) => string }) {
  const kieu = kieuChibi(user);
  const [dangDi, setDangDi] = useState(true);
  return (
    <img
      className={dangDi ? 'seat-chibi dang-di' : 'seat-chibi'}
      src={asset(anhCua(dangDi ? ANH_DUNG : ANH_NGOI, kieu))}
      alt=""
      onAnimationEnd={() => setDangDi(false)}
    />
  );
}

export function HangGhe({
  ghe,
  rows,
  ngoi,
  asset,
}: {
  ghe: ChoNgoi[];
  rows: number;
  ngoi: Map<number, Seat>;
  asset: (p: string) => string;
}) {
  // Backend báo "ghế này trống" là React bỏ thẻ ảnh ngay, người biến mất giữa
  // rạp. Giữ người vừa đứng dậy thêm `RA_MS` để họ đi ra, rồi mới bỏ thật.
  const [diRa, setDiRa] = useState<ReadonlyMap<number, { user: string; at: number }>>(new Map());
  const truoc = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const nay = new Map<number, string>();
    for (const [i, ai] of ngoi) nay.set(i, ai.user);

    const ra: [number, string][] = [];
    for (const [i, u] of truoc.current) {
      if (nay.get(i) !== u) ra.push([i, u]);
    }
    truoc.current = nay;

    // Dọn theo MỐC THỜI GIAN, không hẹn giờ rồi huỷ: `ngoi` đổi mỗi nửa giây
    // nên effect chạy lại liên tục, hẹn giờ nào cũng bị huỷ trước khi kêu —
    // người đi ra sẽ đứng chết ở mép ghế mãi mãi.
    const gio = Date.now();
    setDiRa((m) => {
      if (ra.length === 0 && [...m.values()].every((v) => gio - v.at < RA_MS)) return m;
      const x = new Map<number, { user: string; at: number }>();
      for (const [i, v] of m) {
        if (gio - v.at < RA_MS) x.set(i, v);
      }
      for (const [i, u] of ra) x.set(i, { user: u, at: gio });
      return x;
    });
  }, [ngoi]);

  return (
    <>
      {ghe.map((g) => {
        const ai = ngoi.get(g.flat);
        const cu = ai === undefined ? diRa.get(g.flat) : undefined;
        return (
          <div
            key={g.key}
            className={[
              'seat',
              `tier-${tierOf(g.r)}`,
              g.r === 6 ? 'row-g' : '',
              ai === undefined ? '' : 'taken',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${g.x}%`,
              top: `${g.y}cqw`,
              // @ts-expect-error biến CSS tuỳ chỉnh
              '--seat-scale': g.scale,
              // Quãng đường từ cuối lối giữa lên ghế này. `x` tính bằng % bề
              // rộng màn, `y` bằng cqw — cùng một thước, vì 1% = 1cqw.
              '--di-x': `${(50 - g.x).toFixed(1)}cqw`,
              '--di-y': `${Math.max(0, 54 - g.y).toFixed(1)}cqw`,
              // Lệch pha nhịp thở, kẻo cả rạp phập phồng cùng lúc.
              '--tho-tre': `${(-(g.flat % 17) * 0.2).toFixed(1)}s`,
            }}
            aria-hidden
          >
            {ai !== undefined ? (
              // `key` theo nick: người này đứng lên người kia ngồi xuống thì
              // React dựng lại, màn đi vào chạy lại từ đầu.
              <Khan key={ai.user} user={ai.user} asset={asset} />
            ) : cu === undefined ? null : (
              // Ghế vừa trống: người cũ đứng dậy đi ngược đường lúc vào.
              <img
                key={`ra:${cu.user}:${cu.at}`}
                className="seat-chibi di-ra"
                src={asset(anhCua(ANH_DUNG, kieuChibi(cu.user)))}
                alt=""
              />
            )}
          </div>
        );
      })}
      {Array.from({ length: rows }, (_, r) => (
        <span key={`nhan-${r}`} className="row-label" style={{ top: `${seatLayout(r, 0).y}cqw` }}>
          {rowName(r)}
        </span>
      ))}
    </>
  );
}

/** Ghế sát nhau nên tên hai ghế cạnh nhau sẽ chồng lên. Cho tên chẵn và tên lẻ
 *  thay phiên hiện, mỗi lượt chừng này — đọc được mà không phải thu nhỏ chữ. */
const DOI_TEN_MS = 4_000;

/** Tên khán giả, nằm trên lớp riêng để không bị cuộn lệch khỏi ghế. */
export function TenKhan({ ghe, ngoi }: { ghe: ChoNgoi[]; ngoi: Map<number, Seat> }) {
  const [luot, setLuot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLuot((x) => 1 - x), DOI_TEN_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {ghe.map((g) => {
        const ai = ngoi.get(g.flat);
        if (ai === undefined) return null;
        return (
          <span
            key={g.key}
            className={g.flat % 2 === luot ? 'seat-tag name-off' : 'seat-tag'}
            style={{
              left: `${g.x}%`,
              top: `${g.y}cqw`,
              // @ts-expect-error biến CSS tuỳ chỉnh
              '--seat-scale': g.scale,
            }}
          >
            <span className="seat-label" title={ai.name}>
              {ai.name}
            </span>
          </span>
        );
      })}
    </>
  );
}

export { DI_MS, RA_MS };
