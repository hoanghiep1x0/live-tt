import { useEffect, useMemo, useRef, useState } from 'react';
import type { Seat } from '@live/contracts';
import {
  LOI_MC_MS,
  Slot,
  useAsset,
  useLoiMc,
  useSlotSang,
  useStage,
  useThietKe,
} from '@live/stage-sdk';
import type { DesignOption } from '@live/contracts';
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

/** Lựa chọn của riêng phòng này, hiện thành thẻ "Khung phòng" ở bảng xem.
 *
 *  Bản cũ để khung dọc / ngang trong Cài đặt chung ("Khung mặc định khi mở
 *  trang"). Ở đây nó thuộc về thiết kế, vì chỉ thiết kế mới biết khung ngang
 *  trông ra sao — `screenGeometry('landscape')` trong `geometry.ts`. */
export const LUA_CHON: readonly DesignOption[] = [
  {
    key: 'khungNgang',
    label: 'Xoay ngang khung chiếu',
    short: 'Khung ngang',
    type: 'toggle',
    value: false,
    hint: 'Tắt là khung dọc 9:16 như mặc định; bật thì khung nằm ngang 16:9 và cụm top nâng lên theo',
  },
];

const NEN = 'bg/amitabha-stage.png';
const HOA_SEN = 'fx/lotus.png';
const CO_BE = 'nguoi/co-be.png';
const CAU_BE = 'nguoi/cau-be.png';
/** Bé chibi ngồi sau lưng bé gái — nhân vật chính của cảnh an ủi bản cũ.
 *  KHÔNG dùng `chibi/chibi-2-sit.svg`: ảnh đó là khán giả chibi ngồi ghế, bản
 *  cũ chỉ lấy nó khi máy không chạy được WebGL. Bé thật của bản cũ là rig 3D
 *  (`buildHero` trong `chibi3d.ts`), nên ảnh này là CHÍNH bé đó: chạy lại
 *  `buildHero` + `animateHero(t=0, cry=0, mood=0)` với đúng đèn của bản cũ,
 *  máy quay trực diện, rồi chụp ra PNG nền trong. Xem `assets/CREDITS.md`. */
const BE_CHIBI = 'nguoi/be-chibi.png';

/** Sáu kiểu khán giả chibi. Đây là CHÍNH sáu nhân vật của bản cũ: chạy lại
 *  `buildChibi(0..5)` trong `chibi3d.ts` với đúng bộ đèn cũ rồi chụp ra PNG nền
 *  trong — xem `assets/CREDITS.md`. Không dùng `chibi/chibi-{n}-sit.svg`: bộ đó
 *  là ảnh dự phòng phẳng, bản cũ chỉ lấy khi máy không chạy được WebGL, và nhìn
 *  khác hẳn người ngồi trong rạp. */
const CHIBI = Array.from({ length: 6 }, (_, i) => `chibi/khan-${i + 1}.png`);

/** Mỗi người xem giữ đúng một kiểu chibi suốt buổi: băm từ nick chứ không bốc
 *  ngẫu nhiên, nên hai cửa sổ xem cùng một phòng thấy giống hệt nhau và người
 *  đó đổi ghế vẫn là người đó. Chuyển nguyên ý `chibiVariantOf` của bản cũ. */
function kieuChibi(user: string): number {
  let h = 0;
  for (let i = 0; i < user.length; i += 1) h = (h * 31 + user.charCodeAt(i)) % 100_003;
  return h % CHIBI.length;
}

/** Đồng hồ cho màn chờ. Nhịp 250ms của sân khấu không tới thiết kế, mà màn chờ
 *  chỉ cần tới giây, nên một nhịp một giây là đủ. Giờ máy chứ không phải giờ
 *  phiên: người xem đọc nó như đồng hồ treo tường. */
function useDongHo(): string {
  const gioNay = (): string => new Date().toLocaleTimeString('vi-VN', { hour12: false });
  const [gio, datGio] = useState(gioNay);
  useEffect(() => {
    const id = setInterval(() => datGio(gioNay()), 1000);
    return () => clearInterval(id);
  }, []);
  return gio;
}

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
/** Người rời ghế được giữ lại ngần này để đi ra khỏi rạp. Phải khớp `ghe-ra`
 *  trong stage.css. */
const RA_MS = 850;

function HangGhe({
  ghe,
  rows,
  ngoi,
  anh,
}: {
  ghe: ChoNgoi[];
  rows: number;
  ngoi: Map<number, Seat>;
  /** Sáu đường dẫn ảnh chibi, dựng sẵn ở `Stage` để khỏi tính lại 84 lần. */
  anh: readonly string[];
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
      const x = new Map<number, { user: string; at: number }>();
      for (const [i, v] of m) {
        if (gio - v.at < RA_MS) x.set(i, v);
      }
      for (const [i, u] of ra) x.set(i, { user: u, at: gio });
      return x.size === 0 && m.size === 0 ? m : x;
    });
  }, [ngoi]);

  return (
    <>
      {ghe.map((g) => {
        const ai = ngoi.get(g.flat);
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
              // Người mới đi từ lối đi giữa vào ghế của mình: ghế càng xa trục
              // giữa thì quãng đi càng dài. Kẹp lại cho ghế mép không bay cả màn.
              '--vao-x': `${Math.max(-16, Math.min(16, (50 - g.x) * 0.32)).toFixed(1)}cqw`,
              // Lệch pha nhịp thở, kẻo cả rạp phập phồng cùng lúc.
              '--tho-tre': `${(-(g.flat % 17) * 0.2).toFixed(1)}s`,
            }}
            aria-hidden
          >
            {ai === undefined ? (
              // Ghế vừa trống: người cũ còn đây một nhịp để đi ra. Chỉ vẽ khi
              // ghế đang trống — có người mới ngồi xuống rồi thì thôi.
              (() => {
                const cu = diRa.get(g.flat);
                return cu === undefined ? null : (
                  <img
                    key={`ra:${cu.user}:${cu.at}`}
                    className="seat-chibi di-ra"
                    src={anh[kieuChibi(cu.user)]}
                    alt=""
                  />
                );
              })()
            ) : (
              // `key` theo nick: người này đứng lên người kia ngồi xuống thì
              // React dựng lại thẻ ảnh, nhờ vậy màn đi vào chạy lại từ đầu.
              <img key={ai.user} className="seat-chibi" src={anh[kieuChibi(ai.user)]} alt="" />
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
  /** Module sàn nhảy xin sáng slot `floor` suốt màn nhảy. */
  const sanSang = useSlotSang('floor');
  const gio = useDongHo();
  const anhChibi = useMemo(() => CHIBI.map((p) => asset(p)), [asset]);
  // Khung dọc là mặc định; người vận hành gạt công tắc ở bảng xem thì đổi ngay,
  // không tải lại trang.
  const huong: Huong = useThietKe()['khungNgang'] === true ? 'landscape' : 'portrait';
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

  // Người tặng nhiều nhất ngồi trên bồ đoàn ở dải chữ chạy.
  const nhat = s.session.topGivers[0];
  const tenNhat =
    nhat === undefined
      ? undefined
      : `Top 1: ${nhat.name} · ${nhat.xu.toLocaleString('vi-VN')} điểm`;

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
          {/* Màn chờ của bản cũ: lời chào, đồng hồ lớn, một câu giữ chân. Không
              có câu nào nhắc người vận hành bật module — màn này đang phát ra
              ngoài, người xem đọc được. Người vận hành thấy module tắt ở bảng
              xem. Và màn chờ phải động: khung đứng im là TikTok soi. */}
          <div className="stage-waiting">
            <span className="stage-waiting-sen" />
            <p className="waiting-welcome">Chào cả nhà đến với Phòng kể chuyện</p>
            <p className="waiting-clock">{gio}</p>
            <p className="waiting-note">
              Chuyện sắp bắt đầu rồi, cả nhà ngồi lại nghe cùng nhau nha ❤
            </p>
          </div>
          <Slot name="screen" />
          <div className="slot-screen-overlay">
            <Slot name="screen-overlay" />
          </div>
        </div>
      </section>

      {/* Dải chữ chạy: bồ đoàn bên trái, chữ chạy ở phần còn lại. Bồ đoàn là
          đồ đạc của phòng nên thiết kế tự vẽ — ai đang ngồi trên đó thì đọc từ
          phiên, y như hàng ghế. */}
      <div className="stage-heading">
        <div className={nhat === undefined ? 'stage-honor' : 'stage-honor has-top'} title={tenNhat}>
          {nhat === undefined ? null : (
            <span className="stage-honor-avatar" key={nhat.user}>
              {nhat.avatar === undefined ? <i>?</i> : <img src={nhat.avatar} alt="" />}
            </span>
          )}
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
          <HangGhe ghe={ghe} rows={rows} ngoi={ngoi} anh={anhChibi} />
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

      {/* Hai bạn nhỏ đứng hai bên sàn, như bản cũ. Đồ đạc của phòng nên thiết
          kế tự vẽ, y như bồ đoàn: không có module nào bật cũng phải thấy các
          em. Bản cũ cho module cảnh an ủi điều khiển động tác (cúi chào, vỗ
          tay, lau nước mắt); ở đây mới chỉ thở nhẹ — làm module `comfort` thì
          nối vào sau. */}
      <div className="stage-kids" aria-hidden="true">
        {/* Vẽ TRƯỚC bé gái nên bị bé gái che một phần — đúng ý bản cũ: bé ngồi
            xa hơn, lệch phải, trong tầm nhìn của bé gái. */}
        <img className="stage-be" src={asset(BE_CHIBI)} alt="" draggable={false} />
        <img className="stage-kid kid-girl" src={asset(CO_BE)} alt="" draggable={false} />
        <img className="stage-kid kid-boy" src={asset(CAU_BE)} alt="" draggable={false} />
      </div>
      <div className="slot-chat">
        <Slot name="chat" />
      </div>
      {/* Lời MC: chào hỏi, cảm ơn quà. KHÔNG nằm trong khung chiếu — khung đó
          dành cho nội dung truyện.

          Sàn đang nhảy thì giấu thẻ đi: thẻ rộng 62cqw nằm đè đúng chỗ ba
          người đứng giữa sàn. Bản cũ cũng giấu (`hostSay && !dancing`). */}
      {loiMc === null || sanSang ? null : (
        <div className="stage-host" role="status" key={loiMc.at}>
          <p>{loiMc.text}</p>
          <span className="stage-host-bar" style={{ animationDuration: `${LOI_MC_MS}ms` }} />
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
        {/* Dòng đầu KHÔNG chép nguyên bản cũ ("Gõ ghế B4 · chỗ của tôi · #mã ·
            gửi: … · ôm"): bản mới chưa có module nào đọc lệnh gõ từ bình luận,
            nên in mấy câu đó lên sóng là bảo người xem làm một việc không chạy.
            Giữ đúng những thứ phòng này thật sự làm được hôm nay; có module
            nhận lệnh gõ thì trả lại đúng danh sách của bản cũ.

            Dòng sau là lời minh bạch, chuyển nguyên `.stage-honest` của bản cũ,
            kể cả cách nó chỉ nhắc "có nhân vật minh họa" khi đám đông ảo đang
            bật — ghi lúc không có ai ảo là nói sai về chính phòng mình. */}
        <span>Thả tim · bình luận · tặng quà để cả phòng lên sàn nhảy</span>
        <span className="stage-honest">
          Phòng kể chuyện &amp; xem video{s.bot.enabled ? ' · có nhân vật minh họa' : ''} · MC &amp;
          giọng đọc dùng AI
        </span>
        <Slot name="bottom-bar" />
      </footer>
    </div>
  );
}
