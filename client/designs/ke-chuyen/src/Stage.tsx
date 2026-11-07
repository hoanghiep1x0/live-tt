import { useEffect, useMemo, useRef, useState } from 'react';
import type { Seat } from '@live/contracts';
import {
  giongChoViec,
  LOI_MC_MS,
  Slot,
  tachTenTrongCau,
  useAsset,
  useLoiMc,
  useNoi,
  useSlotSang,
  useSlotTrongSuot,
  duocNoi,
  useStage,
  useThietKe,
} from '@live/stage-sdk';
import type { DesignCard } from '@live/contracts';
import { bienCss, LANDSCAPE_GROUP_LIFT } from './geometry';
import type { Huong } from './geometry';
import { GHE_MAC_DINH, hallContentH, hallRowsFor } from './seats';
import { dungGhe, HangGhe, nguoiNong, TenKhan } from './parts/HangGhe';
import { CHO_OM } from './parts/an-ui';
import { cauCho, giaiLaoCua, loiChao, tenTruyenSau, thuTuCho } from './parts/cho-truyen';
import { LoiDi } from './parts/LoiDi';
import {
  AN_UI_MAC_DINH,
  AnUi,
  CHAY_MS,
  camOnLuotNay,
  canhAnUi,
  chonNguoiOm,
  docCauHinhAnUi,
  khachXinOm,
  loiCamOn,
} from './parts/AnUi';
import { GoiYLenh } from './parts/GoiYLenh';
import { VaoPhong } from './parts/VaoPhong';
import { aiCanChao, CACH_MAC_DINH_GIAY, cauChao, soChaoMoi } from './parts/chao-vao';
import { TungHoa } from './parts/TungHoa';
import { LenhGhe } from './parts/LenhGhe';

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
    id: 'chao-vao',
    name: 'Chào khách vào phòng',
    icon: '👋',
    summary: 'Giọng chào ngay lúc khách bước vào, đọc song song với lời kể',
    toggle: {
      key: 'chaoVao',
      label: 'Bật chào khách',
      type: 'toggle',
      value: true,
    },
    fields: [
      {
        key: 'chaoVaoGiay',
        label: 'Hai lời chào cách nhau',
        short: 'Cách (giây)',
        type: 'number',
        unit: 'giây',
        min: 0,
        max: 60,
        value: CACH_MAC_DINH_GIAY,
        hint: 'Phòng đông thì mỗi 4 giây có năm sáu người vào; chào liên tục sẽ thành tiếng ồn và đè mất lời kể. Để 0 là chào mọi người, không giãn cách.',
      },
    ],
  },
  {
    id: 'an-ui',
    name: 'Cảnh an ủi',
    icon: '🫂',
    summary: 'Khán giả chạy lên ôm bé và cậu bé; chỉ chạy khi Nhân vật ảo đang bật',
    toggle: {
      key: 'anUi',
      label: 'Bật cảnh an ủi',
      type: 'toggle',
      value: true,
    },
    fields: [
      {
        key: 'anUiGiay',
        label: 'Mỗi lượt tự động cách nhau',
        short: 'Cách (giây)',
        type: 'number',
        unit: 'giây',
        min: 20,
        max: 900,
        value: AN_UI_MAC_DINH.chuKyGiay,
        hint: 'Một lượt kéo dài chừng 13 giây (chạy lên, ôm, chạy về), nên dưới 20 giây là các lượt dính liền nhau',
      },
      {
        key: 'anUiSoNguoi',
        label: 'Mỗi lượt mấy người lên ôm',
        short: 'Số người',
        type: 'select',
        options: [
          { value: 'xen', label: 'Lúc một, lúc hai' },
          { value: 'don', label: 'Một người' },
          { value: 'doi', label: 'Hai người' },
        ],
        value: AN_UI_MAC_DINH.soNguoi,
      },
      {
        key: 'anUiAi',
        label: 'Ai được ôm',
        short: 'Ôm ai',
        type: 'select',
        options: [
          { value: 'luan-phien', label: 'Luân phiên bé và cậu bé' },
          { value: 'be', label: 'Chỉ bé' },
          { value: 'cau-be', label: 'Chỉ cậu bé' },
        ],
        value: AN_UI_MAC_DINH.ai,
      },
      {
        key: 'anUiKhach',
        label: 'Khách gõ “ôm” thì chính họ chạy lên',
        short: 'Khách gõ ôm',
        type: 'toggle',
        value: AN_UI_MAC_DINH.khachGoi,
        hint: 'Một mình khách đó lên ôm, đè lên lượt tự động. Tắt thì lời mời gõ “ôm” trên màn cũng tắt',
      },
    ],
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
  /** Câu MC tách thành đoạn để tô vàng tên người xem trong đó. Tên lấy từ
   *  những ai đang có mặt trong phiên: ghế, top quà, feed gần đây. */
  const doanMc = useMemo(() => {
    if (loiMc === null) return [];
    const p = s.session;
    const ten = [
      ...p.seats.map((x) => x.name),
      ...p.topGivers.map((x) => x.name),
      ...p.recentUsers.map((x) => x.name),
      ...p.recentFeed.filter((f) => f.kind !== 'host').map((f) => f.name),
    ];
    return tachTenTrongCau(loiMc.text, ten);
    // Chỉ tách lại khi câu đổi: phiên đổi mỗi nửa giây, câu thì không.
  }, [loiMc]);
  /** Module sàn nhảy xin sáng slot `floor` suốt màn nhảy. */
  const sanSang = useSlotSang('floor');
  /** Dải chữ chạy có đang có gì để nói không. Module xin sáng slot suốt lúc
   *  chữ còn trôi, và thôi xin lúc nó nghỉ — nên dải tự ẩn đi giữa hai lượt,
   *  không nằm chình ình giữa màn cả buổi. */
  const tickerSang = useSlotSang('ticker');
  /** Module trong khung xin bỏ nền: thôi vẽ màn chờ và nền khung, để lộ sảnh. */
  const khungTrong = useSlotTrongSuot('screen');
  const truyen = s.config['story'];
  const gio = useDongHo();
  // Màn chờ KHÔNG đếm ngược tới truyện kế. Chủ phòng chốt: "khách ghét đếm
  // giây" — con số tụt dần biến quãng nghỉ thành quãng phải chịu đựng, và lúc
  // máy chủ soạn truyện lâu hơn dự tính thì nó đứng ở 0, nhìn như treo. Đồng hồ
  // treo tường thì chỉ là khung cảnh, không hứa hẹn gì.
  const nghiCho = giaiLaoCua(truyen);
  // Màn chờ đổi cách gọi người nghe mỗi lượt chờ — khi thì gọi cả phòng, khi
  // thì gọi riêng người đang ngồi xem. Một buổi mấy tiếng mà câu nào cũng y
  // hệt là người xem nghe ra máy ngay.
  const thuTu = thuTuCho(truyen, nghiCho);
  // Tên truyện sắp kể, đặt dưới màn chờ: chờ mà biết sắp được nghe truyện gì
  // thì người xem có cớ ở lại, chứ đồng hồ trống không giữ được ai.
  const tenSau = tenTruyenSau(truyen);
  // Đồng hồ cho lượt người ra vào ở lối đi: chỉ cần đủ mịn để bắt đầu và kết
  // thúc một lượt, phần chạy là của CSS.
  const nhip = useNhip();
  // Lượt an ủi đang diễn ra. Thuần theo đồng hồ nên hai cửa sổ xem cùng phòng
  // thấy cùng một lượt.
  const thietKe = useThietKe();

  // CHÀO KHÁCH VÀO PHÒNG bằng làn giọng RIÊNG, song song với lời kể: khách
  // vừa bấm vào đã nghe có người chào mình. Lời chào của MC vẫn còn đó, nhưng
  // nó đi theo lượt MC nên luôn muộn — cái này là tức thì.
  const soChao = useRef(soChaoMoi());
  /** Giọng người vận hành đã giao cho việc "chào" (`ai.vaiGiong.chao`). */
  const chaoGiongDs = (): string[] => {
    const ai = s.ai as unknown as { vaiGiong?: { chao?: unknown } } | undefined;
    const ds = ai?.vaiGiong?.chao;
    return Array.isArray(ds) ? ds.filter((x): x is string => typeof x === 'string') : [];
  };
  const chaoBat = thietKe['chaoVao'] !== false;
  const chaoGiay = typeof thietKe['chaoVaoGiay'] === 'number' ? thietKe['chaoVaoGiay'] : CACH_MAC_DINH_GIAY;
  const noi = useNoi();
  useEffect(() => {
    if (!chaoBat || !duocNoi()) return;
    const nhom = aiCanChao(s.session.recentFeed, Date.now(), soChao.current, chaoGiay);
    const cau = cauChao(nhom.map((f) => f.name));
    if (cau === '') return;
    // Giọng chào xoay vòng theo danh sách người vận hành giao cho việc "chào"
    // (`vaiGiong.chao`); chưa giao thì để trống cho dàn tự chọn.
    const ds = chaoGiongDs();
    const giong = ds.length === 0 ? '' : (ds[soChao.current.dem % ds.length] ?? '');
    // Vào HÀNG ĐỌC CHÍNH: lời chào đọc SAU câu kể đang dở, không chồng lên nó.
    // Trước đây nó có làn riêng chạy song song — chủ phòng nghe thử rồi chốt
    // bỏ, hai giọng cùng lúc nghe ra cái máy chứ không ra người dẫn truyện.
    noi(cau, giong);
  }, [s.session.recentFeed, chaoBat, chaoGiay, noi]);
  // Cảnh an ủi đi cùng nhân vật ảo: tắt nhân vật ảo là tắt luôn cảnh này,
  // kể cả lượt khách gõ "ôm".
  const batAnUi = thietKe['anUi'] !== false && s.bot.enabled;
  const cfgAnUi = docCauHinhAnUi(thietKe);
  // Khách gõ "ôm" thì chính họ chạy lên, và lượt đó đè lên lượt định kỳ.
  const canh = batAnUi
    ? canhAnUi(nhip, khachXinOm(s.session.recentFeed, nhip), cfgAnUi)
    : null;
  const beDuocOm = canh !== null && canh.nhanVat === 'be';
  const camOn = useRef<{ luot: string; luc: number }>({ luot: '', luc: -Infinity });
  // Khung dọc là mặc định; người vận hành gạt công tắc ở bảng xem thì đổi ngay,
  // không tải lại trang.
  const huong: Huong = useThietKe()['khungNgang'] === true ? 'landscape' : 'portrait';
  const khung = useRef<HTMLDivElement>(null);

  const rows = hallRowsFor(GHE_MAC_DINH);
  const bien = bienCss(huong, rows);
  const ghe = useMemo(() => dungGhe(rows), [rows]);
  // Người ảo do máy dựng có nick `mh…` (backend `bot.rs`).
  const coNguoiAo = s.session.seats.some((x) => x.user.startsWith('mh'));
  const ngoi = useMemo(
    () => new Map(s.session.seats.map((x) => [x.i, x])),
    [s.session.seats],
  );
  // Người đang chạy lên an ủi bé — đúng nhóm `AnUi` vẽ (cùng hàm, cùng tham
  // số): ghế của họ để trống trong lúc họ ở trên sân khấu.
  const vangAnUi = useMemo(
    () =>
      canh === null
        ? new Set<string>()
        : new Set(
            chonNguoiOm(ngoi, ghe, canh.k, Math.min(canh.soNguoi, CHO_OM[canh.nhanVat].length), canh.nguoiXin).map(
              (n) => n.user,
            ),
          ),
    [canh?.k, canh?.nhanVat, canh?.soNguoi, canh?.nguoiXin, ngoi, ghe],
  );

  // MC cảm ơn người lên ôm, đúng lúc họ chạy tới nơi — như bản cũ. Không phải
  // lượt nào cũng đọc (`camOnLuotNay`): khách tự gõ "ôm" thì cảm ơn mỗi phút,
  // lượt tự động thì thỉnh thoảng thôi, không thì phòng thành cái loa. Mở cửa
  // sổ giữa chừng lượt (đã quá lúc tới nơi) thì không đọc muộn.
  const toiNoi = canh !== null && canh.t >= CHAY_MS && canh.t < CHAY_MS + 2_000;
  const luot = canh === null ? '' : `${canh.k}:${canh.nguoiXin ?? ''}`;
  useEffect(() => {
    if (canh === null || !toiNoi || camOn.current.luot === luot) return;
    camOn.current.luot = luot;
    if (!camOnLuotNay(canh, camOn.current.luc, nhip)) return;
    camOn.current.luc = nhip;
    // Gọi tên khách THẬT; nhân vật ảo (nick `mh…`, xem `bot.rs`) thì cảm ơn chung.
    const ten =
      canh.tenXin !== undefined
        ? [canh.tenXin]
        : chonNguoiOm(ngoi, ghe, canh.k, canh.soNguoi)
            .filter((n) => !n.user.startsWith('mh'))
            .map((n) => [...ngoi.values()].find((x) => x.user === n.user)?.name ?? '');
    // "Ai đọc gì" → an ủi bé (thay phiên); chưa giao thì giọng chào khách của
    // dàn, như `thankVoice` của bản cũ; không có nữa thì giọng mặc định.
    const giao = giongChoViec(s.ai?.vaiGiong?.anUi, '', Math.random);
    const giong = giao !== '' ? giao : (s.voice.cast.find((g) => /chào|đáp|khách/i.test(g.role))?.id ?? '');
    noi(loiCamOn(canh.k, ten, canh.nhanVat), giong);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luot, toiNoi]);

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
        <span className="stage-title">Phòng kể truyện</span>
        <span className="chip">
          👥 {t.viewers} · ❤ {t.likes} · 🎁 {t.xu}
        </span>
        <Slot name="top-bar" />
      </header>

      {/* Mất kết nối máy chủ: KHÔNG hiện lên khung — khung này đang phát ra
          ngoài, người xem đọc được. Người vận hành thấy ở bảng xem thử. */}

      <section className="stage-screen" data-trong-suot={khungTrong}>
        {/* Nhãn minh bạch kiểu bản cũ: ngồi ngoài khung, sát mép trên góc trái
            — không che hình. Lời minh bạch về cả phòng là dòng mờ ở chân màn
            (`stage-honest`).

            Nhãn "Có ảnh minh hoạ cốt truyện" ở mép phải đã BỎ: chủ phòng chốt
            là người xem nhìn thấy ảnh rồi, ghi thêm chỉ tổ chật mép khung. */}
        <span className="stage-ai-label">Truyện hay do AI đề xuất</span>
        <div className="stage-screen-inner">
          {/* Màn chờ của bản cũ: lời chào, đồng hồ lớn, một câu giữ chân. Không
              có câu nào nhắc người vận hành bật module — màn này đang phát ra
              ngoài, người xem đọc được. Người vận hành thấy module tắt ở bảng
              xem. Và màn chờ phải động: khung đứng im là TikTok soi. */}
          {khungTrong ? null : (
            <div className="stage-waiting">
              <span className="stage-waiting-sen" />
              <p className="waiting-welcome">{loiChao(thuTu)}</p>
              <p className="waiting-clock">{gio}</p>
              <p className="waiting-note">{cauCho(thuTu)}</p>
              {tenSau === '' ? null : (
                <p className="waiting-next">
                  <span className="waiting-next-nhan">Truyện tiếp theo</span>
                  <b className="waiting-next-ten">{tenSau}</b>
                </p>
              )}
            </div>
          )}
          <Slot name="screen" />
          <div className="slot-screen-overlay">
            <Slot name="screen-overlay" />
          </div>
        </div>
      </section>

      {/* Dải chữ chạy: bồ đoàn bên trái, chữ chạy ở phần còn lại. Bồ đoàn là
          đồ đạc của phòng nên thiết kế tự vẽ — ai đang ngồi trên đó thì đọc từ
          phiên, y như hàng ghế. */}
      {/* Dải chữ chạy chỉ hiện khi đang có chữ trôi. Giữa hai lượt nó biến
          mất hẳn — treo một dải kèm đài sen suốt buổi thì người xem thôi nhìn
          nó, mà nó vẫn chiếm chỗ giữa màn. */}
      {!tickerSang ? null : (
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
          <HangGhe ghe={ghe} rows={rows} ngoi={ngoi} asset={asset} vang={vangAnUi} />
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
          <TenKhan ghe={ghe} ngoi={ngoi} nong={nguoiNong(s.session.recentFeed, nhip)} />
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
      <AnUi
        canh={canh}
        ngoi={ngoi}
        ghe={ghe}
        asset={asset}
        lift={huong === 'landscape' ? LANDSCAPE_GROUP_LIFT : 0}
      />
      {/* Sàn đang nhảy thì khán giả trong rạp hô "Tung hoa!", như bản cũ. */}
      <TungHoa dangNhay={sanSang} ngoi={ngoi} ghe={ghe} now={nhip} />
      {/* Lệnh gõ về ghế: "chỗ của tôi", "ghế B4", "đánh Lan" (máy chủ đã đọc lệnh). */}
      <LenhGhe feed={s.session.recentFeed} ghe={ghe} now={nhip} />
      <div className="slot-chat">
        <Slot name="chat" />
      </div>
      <VaoPhong feed={s.session.recentFeed} now={nhip} />
      {/* Lời MC: chào hỏi, cảm ơn quà. KHÔNG nằm trong khung chiếu — khung đó
          dành cho nội dung truyện.

          Sàn đang nhảy thì giấu thẻ đi: thẻ rộng 62cqw nằm đè đúng chỗ ba
          người đứng giữa sàn. Bản cũ cũng giấu (`hostSay && !dancing`). */}
      {loiMc === null || sanSang ? null : (
        <div className="stage-host" role="status" key={loiMc.at}>
          <p>
            {doanMc.map((d, i) =>
              d.ten ? (
                <b key={i} className="stage-host-ten">
                  {d.chu}
                </b>
              ) : (
                d.chu
              ),
            )}
          </p>
          <span className="stage-host-bar" style={{ animationDuration: `${loiMc.ms ?? LOI_MC_MS}ms` }} />
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

      {/* Lời mời gõ "ôm" chỉ hiện khi gõ "ôm" thật sự gọi được một lượt. */}
      <GoiYLenh nhip={nhip} batAnUi={batAnUi && cfgAnUi.khachGoi} />

      <footer className="stage-hints">
        {/* Dòng đầu KHÔNG chép nguyên bản cũ ("Gõ ghế B4 · chỗ của tôi · #mã ·
            gửi: … · ôm"): bản mới chưa có module nào đọc lệnh gõ từ bình luận,
            nên in mấy câu đó lên sóng là bảo người xem làm một việc không chạy.
            Giữ đúng những thứ phòng này thật sự làm được hôm nay; có module
            nhận lệnh gõ thì trả lại đúng danh sách của bản cũ.

            Lời minh bạch KHÔNG còn ở đây nữa mà nằm trên dải trên, cạnh chữ
            LIVE: hai dòng chữ chen nhau ở đáy màn vừa chật vừa khó đọc. Phần
            "có nhân vật minh hoạ" vẫn chỉ hiện khi đám đông ảo đang bật — ghi
            lúc không có ai ảo là nói sai về chính phòng mình. */}
        {/* Dòng lệnh theo đúng lối bản cũ: "Gõ" rồi tới tên lệnh in đậm. Chỉ
            liệt kê lệnh THẬT SỰ chạy được — bản cũ còn `ghế B4`, `chỗ của
            tôi`, `#mã`, `gửi: …`, nhưng bản mới chưa module nào đọc lệnh gõ,
            in lên sóng là bảo người xem làm một việc không chạy. Tắt cảnh an
            ủi thì không còn lệnh nào, dòng này biến mất luôn. */}
        <Slot name="bottom-bar" />
        {/* Dòng minh bạch của bản cũ, nguyên chữ. "Có nhân vật minh họa" chỉ
            khi đang có người ảo ngồi trong rạp — ghi lúc không có ai ảo là nói
            sai về chính phòng mình. */}
        <p className="stage-honest">
          Phòng kể truyện & xem video{coNguoiAo ? ' · có nhân vật minh họa' : ''} · người dẫn &
          giọng đọc dùng AI
        </p>
      </footer>
    </div>
  );
}
