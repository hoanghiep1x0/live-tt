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
import { rowName, seatLayout, tierOf } from '../seats';
import { ANH_NGOI, anhCua, kieuChibi } from './ghe';
import type { ChoNgoi } from './ghe';

/** Người rời ghế được giữ lại ngần này để mờ dần. Khớp `ghe-an` trong stage.css. */
const RA_MS = 500;
/** Người mới vào phải ĐI HẾT quãng đường rồi mới hiện ra trên ghế. Khớp `DI_MS`
 *  của `LoiDi`: ngồi sẵn trên ghế rồi mới thấy mình đi vào là ngược đời. */
const VAO_MS = 5_200;

/** Ghế KHÔNG có màn đi: người đi vào / đi ra là một lượt riêng ở lối đi (xem
 *  `LoiDi.tsx`), đúng như bản cũ — không ai băng qua ghế để tới chỗ của mình.
 *  Ở đây chỉ là ngồi xuống và đứng lên, mờ nhẹ cho khỏi lộp bộp. */

export type { ChoNgoi } from './ghe';
export { ANH_DUNG, ANH_NGOI, anhCua, dungGhe, kieuChibi } from './ghe';

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
  /** Người vừa vào, đang trên đường tới ghế. Mốc là lúc mình thấy họ. */
  const dangToi = useRef<Map<string, number>>(new Map());
  /** Lượt dựng đầu tiên: ai đang ngồi là đã ngồi từ trước, không phải vừa vào.
   *  Mở trang giữa buổi mà cả rạp cùng đứng dậy đi lại là sai. */
  const lanDau = useRef(true);

  useEffect(() => {
    const nay = new Map<number, string>();
    for (const [i, ai] of ngoi) nay.set(i, ai.user);

    const ra: [number, string][] = [];
    for (const [i, u] of truoc.current) {
      if (nay.get(i) !== u) ra.push([i, u]);
    }
    const gioVao = Date.now();
    if (!lanDau.current) {
      const cu = new Set(truoc.current.values());
      for (const u of nay.values()) {
        if (!cu.has(u) && !dangToi.current.has(u)) dangToi.current.set(u, gioVao);
      }
    }
    lanDau.current = false;
    for (const [u, t] of dangToi.current) {
      if (gioVao - t >= VAO_MS) dangToi.current.delete(u);
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
        // Còn đang trên đường thì chưa vẽ người ngồi: họ phải đi tới nơi đã.
        const chuaToi = ai !== undefined && dangToi.current.has(ai.user);
        const cu = ai === undefined ? diRa.get(g.flat) : undefined;
        return (
          <div
            key={g.key}
            className={[
              'seat',
              `tier-${tierOf(g.r)}`,
              g.r === 6 ? 'row-g' : '',
              ai === undefined || chuaToi ? '' : 'taken',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${g.x}%`,
              top: `${g.y}cqw`,
              // @ts-expect-error biến CSS tuỳ chỉnh
              '--seat-scale': g.scale,
              // Lệch pha nhịp thở, kẻo cả rạp phập phồng cùng lúc.
              '--tho-tre': `${(-(g.flat % 17) * 0.2).toFixed(1)}s`,
            }}
            aria-hidden
          >
            {ai !== undefined && !chuaToi ? (
              // `key` theo nick: người này đứng lên người kia ngồi xuống thì
              // React dựng lại, màn ngồi xuống chạy lại.
              <img
                key={ai.user}
                className="seat-chibi"
                src={asset(anhCua(ANH_NGOI, kieuChibi(ai.user)))}
                alt=""
              />
            ) : cu === undefined ? null : (
              <img
                key={`ra:${cu.user}:${cu.at}`}
                className="seat-chibi di-ra"
                src={asset(anhCua(ANH_NGOI, kieuChibi(cu.user)))}
                alt=""
              />
            )}
          </div>
        );
      })}
      {/* Chữ hàng ghế bám theo GHẾ ĐẦU HÀNG, lùi ra ngoài một chút — hàng ghế
          hình quạt nên mỗi hàng lùi một kiểu, xếp thành một đường cong theo mép
          rạp. Bản cũ đặt đúng vậy (`first.x - 4,2 - min(r,5) × 0,2`); dồn hết
          vào một cột sát mép trái thì nó thành một dãy chữ dựng đứng, chẳng
          dính gì tới hàng nào. */}
      {Array.from({ length: rows }, (_, r) => {
        const dau = seatLayout(r, 0);
        return (
          <span
            key={`nhan-${r}`}
            className="row-label"
            // Hàng cuối rộng gần hết màn, lùi thêm nữa là chữ rơi ra ngoài
            // khung — kẹp lại ở mép trong.
            style={{
              top: `${dau.y}cqw`,
              left: `${Math.max(1.8, dau.x - 4.2 - Math.min(r, 5) * 0.2)}%`,
            }}
          >
            {rowName(r)}
          </span>
        );
      })}
    </>
  );
}

/** Ghế sát nhau nên tên hai ghế cạnh nhau sẽ chồng lên. Cho tên chẵn và tên lẻ
 *  thay phiên hiện, mỗi lượt chừng này — đọc được mà không phải thu nhỏ chữ. */
const DOI_TEN_MS = 4_000;

/** Nhãn dưới ghế: ảnh đại diện (nếu có) và tên ĐẦY ĐỦ — như `SeatLabel` của
 *  bản cũ. Ảnh hỏng thì bỏ ảnh, giữ tên, không để lại khung vỡ. */
function TenGhe({ ten, anh }: { ten: string; anh: string | undefined }) {
  const [hong, setHong] = useState(false);
  return (
    <span className="seat-label" title={ten}>
      {anh === undefined || hong ? null : (
        <img src={anh} alt="" referrerPolicy="no-referrer" onError={() => setHong(true)} />
      )}
      {ten}
    </span>
  );
}

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
        // So le như bản cũ: ghế thứ lẻ trong hàng hạ nhãn xuống một nấc, tên hai
        // ghế cạnh nhau không đè chữ lên nhau.
        const le = Number(g.key.split('-')[1] ?? 0) % 2 === 1;
        const lop = ['seat-tag'];
        if (le) lop.push('alt');
        if (g.flat % 2 === luot) lop.push('name-off');
        return (
          <span
            key={g.key}
            className={lop.join(' ')}
            style={{
              left: `${g.x}%`,
              top: `${g.y}cqw`,
              // Hàng trước đè hàng sau, như bản cũ.
              zIndex: g.r + 1,
              // @ts-expect-error biến CSS tuỳ chỉnh
              '--seat-scale': g.scale,
            }}
          >
            <TenGhe ten={ai.name} anh={ai.avatar} />
          </span>
        );
      })}
    </>
  );
}

