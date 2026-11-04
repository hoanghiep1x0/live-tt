import { useMemo, useRef, useState } from 'react';
import { Slot, useAsset, useStage } from '@live/stage-sdk';
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
const VIDEO_MAU = 'video/mau-su-tich-cay-vu-sua.webm';

/** Một ghế và nhãn tên của nó. Ghế là đồ đạc của phòng nên thiết kế tự vẽ;
 *  ai ngồi đâu thì đọc từ phiên. */
function HangGhe({ rows }: { rows: number }) {
  const ghe = useMemo(() => {
    const ra: { key: string; r: number; i: number; x: number; y: number; scale: number }[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let i = 0; i < seatsInRow(r); i += 1) {
        const p = seatLayout(r, i);
        ra.push({ key: `${r}-${i}`, r, i, ...p });
      }
    }
    return ra;
  }, [rows]);

  return (
    <>
      {ghe.map((g) => (
        <div
          key={g.key}
          className={`seat tier-${tierOf(g.r)}${g.r === 6 ? ' row-g' : ''}`}
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

export function Stage() {
  const s = useStage();
  const asset = useAsset();
  const [huong] = useState<Huong>('portrait');
  const khung = useRef<HTMLDivElement>(null);

  const rows = hallRowsFor(GHE_MAC_DINH);
  const bien = bienCss(huong, rows);

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
          <video className="stage-video" src={asset(VIDEO_MAU)} autoPlay muted loop playsInline />
          <div className="slot-screen-overlay">
            <Slot name="screen-overlay" />
          </div>
          <Slot name="screen" />
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
          <HangGhe rows={rows} />
        </div>
      </section>

      <div className="stage-seat-names">
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
