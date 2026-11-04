import { useEffect, useMemo, useRef, useState } from 'react';
import type { Seat } from '@live/contracts';
import { Slot, useAsset, useLoiMc, useStage } from '@live/stage-sdk';
import { bienCss } from './geometry';
import type { Huong } from './geometry';
import {
  GHE_MAC_DINH,
  hallContentH,
  hallRowsFor,
  rowName,
  seatLayout,
  seatsInRow,
  tierOf,
} from './seats';

const NEN = 'bg/amitabha-stage.png';
const HOA_SEN = 'fx/lotus.png';

interface ChoNgoi {
  key: string;
  r: number;
  /** Chỉ số phẳng, đếm từ ghế đầu hàng A. Backend xếp chỗ theo đúng thứ tự này,
   *  nên `Seat.i` khớp thẳng vào đây mà không cần bảng quy đổi. */
  flat: number;
  x: number;
  y: number;
  scale: number;
}

function dungGhe(rows: number): ChoNgoi[] {
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

/** Hàng ghế. Ghế là đồ đạc của phòng nên thiết kế tự vẽ; ai ngồi đâu thì đọc
 *  từ phiên, và phiên nằm ở backend. */
function HangGhe({ ghe, rows, ngoi }: { ghe: ChoNgoi[]; rows: number; ngoi: Map<number, Seat> }) {
  return (
    <>
      {ghe.map((g) => (
        <div
          key={g.key}
          className={[
            'seat',
            `tier-${tierOf(g.r)}`,
            g.r === 6 ? 'row-g' : '',
            ngoi.has(g.flat) ? 'taken' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            left: `${g.x}%`,
            top: `${g.y}cqw`,
            // @ts-expect-error biến CSS tuỳ chỉnh
            '--seat-scale': g.scale,
          }}
          aria-hidden
        />
      ))}
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
function TenKhan({ ghe, ngoi }: { ghe: ChoNgoi[]; ngoi: Map<number, Seat> }) {
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

export function Stage() {
  const s = useStage();
  const asset = useAsset();
  const loiMc = useLoiMc();
  const [huong] = useState<Huong>('portrait');
  const khung = useRef<HTMLDivElement>(null);

  const rows = hallRowsFor(GHE_MAC_DINH);
  const bien = bienCss(huong, rows);
  const ghe = useMemo(() => dungGhe(rows), [rows]);
  const ngoi = useMemo(
    () => new Map(s.session.seats.map((x) => [x.i, x])),
    [s.session.seats],
  );

  // Chưa có nguồn sự kiện TikTok nên phiên rỗng. Sân khấu vẫn phải lên hình đầy
  // đủ khi tắt hết module (quy ước 04 §1) — đây là trạng thái đó.
  const t = s.session.totals;

  return (
    <div
      className="stage"
      id="stage-frame"
      ref={khung}
      data-orientation={huong}
      style={{ ...bien, '--stage-backdrop': `url(${asset(NEN)})` } as React.CSSProperties}
    >
      <div className="stage-shade" />
      <div className="stage-halo" />

      <header className="stage-topbar">
        <span className="chip chip-live">
          <span className="dot" />
          LIVE
        </span>
        <span className="stage-title">Phòng kể chuyện</span>
        <span className="chip">
          👥 {t.viewers} · ❤ {t.likes} · 🎁 {t.xu}
        </span>
        <Slot name="top-bar" />
      </header>

      {!s.noiDuoc ? <div className="stage-offline">mất kết nối máy chủ</div> : null}

      <section className="stage-screen">
        <span className="stage-ai-label">Nội dung do AI</span>
        <div className="stage-screen-inner">
          {/* Chưa bật module kể chuyện thì khung vẫn phải có gì đó, và vẫn phải
              động — TikTok soi khung hình đứng yên lâu. */}
          <div className="stage-waiting">
            <span className="stage-waiting-sen" />
            <b>Phòng kể chuyện</b>
            Bật tính năng Kể chuyện để chiếu truyện lên đây
          </div>
          <Slot name="screen" />
          <div className="slot-screen-overlay">
            <Slot name="screen-overlay" />
          </div>
        </div>
      </section>

      <div className="stage-heading">
        <div className="stage-honor">
          <img className="stage-lotus" src={asset(HOA_SEN)} alt="" />
        </div>
        <Slot name="ticker" />
      </div>

      <section className="stage-tops">
        <Slot name="tops" />
      </section>

      <section className="stage-target">
        <Slot name="target" />
      </section>

      <section className="stage-hall">
        <div className="hall-content" style={{ height: `${hallContentH(rows)}cqw` }}>
          <HangGhe ghe={ghe} rows={rows} ngoi={ngoi} />
        </div>
      </section>

      <div className="stage-seat-names">
        <div className="hall-content" style={{ height: `${hallContentH(rows)}cqw` }}>
          <TenKhan ghe={ghe} ngoi={ngoi} />
        </div>
        <Slot name="seats" />
      </div>

      <div className="slot-stage-3d">
        <Slot name="stage-3d" />
      </div>
      <div className="slot-floor">
        <Slot name="floor" />
      </div>
      <div className="slot-chat">
        <Slot name="chat" />
      </div>
      {/* Lời MC: chào hỏi, cảm ơn quà. KHÔNG nằm trong khung chiếu — khung đó
          dành cho nội dung truyện. */}
      {loiMc === null ? null : (
        <div className="stage-host" role="status">
          <span className="stage-host-ai">MC</span>
          <p>{loiMc.text}</p>
        </div>
      )}

      <div className="slot-center">
        <Slot name="center" />
      </div>
      <div className="slot-corner-left">
        <Slot name="corner-left" />
      </div>
      <div className="slot-corner-right">
        <Slot name="corner-right" />
      </div>
      <div className="slot-full">
        <Slot name="full" />
      </div>

      <footer className="stage-hints">
        <span>Gõ số mã để chọn hoàn cảnh · gõ “ôm” để lên ôm · gõ “nhảy” để lên sàn</span>
        <span className="stage-honest">Phòng có nhân vật minh hoạ do máy tạo</span>
        <Slot name="bottom-bar" />
      </footer>
    </div>
  );
}
