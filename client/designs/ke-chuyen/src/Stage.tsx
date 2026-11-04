import { useEffect, useMemo, useRef, useState } from 'react';
import type { Seat } from '@live/contracts';
import {
  LOI_MC_MS,
  Slot,
  useAsset,
  useLoiMc,
  useSlotCo,
  useSlotSang,
  useStage,
  useThietKe,
} from '@live/stage-sdk';
import type { DesignCard } from '@live/contracts';
import { bienCss } from './geometry';
import type { Huong } from './geometry';
import { GHE_MAC_DINH, hallContentH, hallRowsFor } from './seats';
import { dungGhe, HangGhe, TenKhan } from './parts/HangGhe';
import { LoiDi } from './parts/LoiDi';
import { AnUi, canhAnUi, khachXinOm } from './parts/AnUi';

/** Lựa chọn của riêng phòng này, hiện thành thẻ "Khung phòng" ở bảng xem.
 *
 *  Bản cũ để khung dọc / ngang trong Cài đặt chung ("Khung mặc định khi mở
 *  trang"). Ở đây nó thuộc về thiết kế, vì chỉ thiết kế mới biết khung ngang
 *  trông ra sao — `screenGeometry('landscape')` trong `geometry.ts`. */
export const LUA_CHON: readonly DesignCard[] = [
  {
    id: 'khung',
    name: 'Khung phòng',
    icon: '🖼',
    summary: 'Bố cục của riêng phòng này, không phải tính năng',
    fields: [
      {
        key: 'khungNgang',
        label: 'Xoay ngang khung chiếu',
        short: 'Khung ngang',
        type: 'toggle',
        value: false,
        hint: 'Tắt là khung dọc 9:16 như mặc định; bật thì khung nằm ngang 16:9 và cụm top nâng lên theo',
      },
    ],
  },
  {
    id: 'an-ui',
    name: 'Cảnh an ủi',
    icon: '🫂',
    summary: 'Khán giả chạy lên ôm bé và cậu bé; khách gõ “ôm” cũng gọi được một lượt',
    toggle: {
      key: 'anUi',
      label: 'Bật cảnh an ủi',
      type: 'toggle',
      value: true,
    },
    fields: [],
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
/** Bé lúc được ôm. Cũng chụp từ rig cũ, chỉ khác `mood = 1`. */
const BE_VUI = 'nguoi/be-vui.png';

/** Nhịp thô cho những thứ bắt đầu / kết thúc theo thời gian. Nửa giây là đủ:
 *  phần chạy mượt nằm ở CSS, đây chỉ quyết định lúc nào dựng và lúc nào bỏ. */
function useNhip(): number {
  const [t, datT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => datT(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  return t;
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

export function Stage() {
  const s = useStage();
  const asset = useAsset();
  const loiMc = useLoiMc();
  /** Module sàn nhảy xin sáng slot `floor` suốt màn nhảy. */
  const sanSang = useSlotSang('floor');
  /** Có tính năng nào đang vẽ chữ chạy không. Hỏi "có module nào ở slot này"
   *  chứ không hỏi "slot có đang sáng": dải chữ chạy suốt buổi, nó không xin
   *  nhấn sáng bao giờ, nên hỏi nhầm là giấu luôn cả tính năng. */
  const tickerSang = useSlotCo('ticker');
  const gio = useDongHo();
  // Đồng hồ cho lượt người ra vào ở lối đi: chỉ cần đủ mịn để bắt đầu và kết
  // thúc một lượt, phần chạy là của CSS.
  const nhip = useNhip();
  // Lượt an ủi đang diễn ra. Thuần theo đồng hồ nên hai cửa sổ xem cùng phòng
  // thấy cùng một lượt.
  const batAnUi = useThietKe()['anUi'] !== false;
  // Khách gõ "ôm" thì chính họ chạy lên, và lượt đó đè lên lượt định kỳ.
  const canh = batAnUi ? canhAnUi(nhip, khachXinOm(s.session.recentFeed, nhip)) : null;
  const beDuocOm = canh !== null && canh.nhanVat === 'be';
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
        {/* Lời minh bạch nằm ở DẢI TRÊN, không nằm trong khung chiếu: nó nói về
            cả phòng chứ không riêng cái đang chiếu, và để trong khung thì nó
            che mất hình. */}
        <span className="chip stage-ai-label">Nội dung do AI đề xuất</span>
        <span className="stage-title">Phòng kể chuyện</span>
        <span className="chip">
          👥 {t.viewers} · ❤ {t.likes} · 🎁 {t.xu}
        </span>
        <Slot name="top-bar" />
      </header>

      {!s.noiDuoc ? <div className="stage-offline">mất kết nối máy chủ</div> : null}

      <section className="stage-screen">
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
      {/* Dải chữ chạy chỉ hiện khi có gì để nói: có người đứng đầu bảng, hoặc
          một tính năng đang chạy chữ ở slot `ticker`. Phòng im mà vẫn treo một
          dải trống kèm đài sen thì nó chỉ là vết bẩn giữa màn. */}
      {nhat === undefined && !tickerSang ? null : (
        <div className="stage-heading">
          <div
            className={nhat === undefined ? 'stage-honor' : 'stage-honor has-top'}
            title={tenNhat}
          >
            {nhat === undefined ? null : (
              <span className="stage-honor-avatar" key={nhat.user}>
                {nhat.avatar === undefined ? <i>?</i> : <img src={nhat.avatar} alt="" />}
              </span>
            )}
            <img className="stage-lotus" src={asset(HOA_SEN)} alt="" />
          </div>
          <Slot name="ticker" />
        </div>
      )}

      <section className="stage-tops">
        <Slot name="tops" />
      </section>

      <section className="stage-target">
        <Slot name="target" />
      </section>

      <section className="stage-hall">
        <div className="hall-content" style={{ height: `${hallContentH(rows)}cqw` }}>
          <HangGhe ghe={ghe} rows={rows} ngoi={ngoi} asset={asset} />
          <LoiDi
            feed={s.session.recentFeed}
            now={nhip}
            ghe={ghe}
            ngoi={ngoi}
            cao={hallContentH(rows)}
            asset={asset}
          />
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
        <img
          className={beDuocOm ? 'stage-be dang-vui' : 'stage-be'}
          src={asset(beDuocOm ? BE_VUI : BE_CHIBI)}
          alt=""
          draggable={false}
        />
        <img
          className={canh === null ? 'stage-kid kid-girl' : 'stage-kid kid-girl cui-chao'}
          src={asset(CO_BE)}
          alt=""
          draggable={false}
        />
        <img className="stage-kid kid-boy" src={asset(CAU_BE)} alt="" draggable={false} />
      </div>
      <AnUi canh={canh} ngoi={ngoi} ghe={ghe} asset={asset} />
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
        {/* Dòng lệnh theo đúng lối bản cũ: "Gõ" rồi tới tên lệnh in đậm. Chỉ
            liệt kê lệnh THẬT SỰ chạy được — bản cũ còn `ghế B4`, `chỗ của
            tôi`, `#mã`, `gửi: …`, nhưng bản mới chưa module nào đọc lệnh gõ,
            in lên sóng là bảo người xem làm một việc không chạy. Tắt cảnh an
            ủi thì không còn lệnh nào, dòng này biến mất luôn. */}
        {!batAnUi ? null : (
          <span>
            Gõ <b>ôm</b> · <b>an ủi</b> · <b>thương bé</b> để chạy lên ôm bé
          </span>
        )}
        <span className="stage-honest">
          Phòng kể chuyện &amp; xem video{s.bot.enabled ? ' · có nhân vật minh họa' : ''} · MC &amp;
          giọng đọc dùng AI
        </span>
        <Slot name="bottom-bar" />
      </footer>
    </div>
  );
}
