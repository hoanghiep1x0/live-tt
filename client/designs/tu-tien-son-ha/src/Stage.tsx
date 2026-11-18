import { useEffect, useRef, useState } from 'react';
import type { DesignCard, FeedItem } from '@live/contracts';
import { useAsset, useDesignId, useNoi, useSession, useStage, useThietKe } from '@live/stage-sdk';
import { phat, type Tieng } from './am-thanh';
import { DOT_PHA_MS, DOT_PHA_NGAN_MS } from './DotPha';
import { Hud, type ThongBao } from './Hud';
import { MeCung } from './MeCung';
import { TUYET_KY_MS, VINH_DANH_MS, type NoiBat } from './NoiBat';
import { locFeedMoi } from './loc-feed';
import { docLich } from './loi/lich';
import {
  buoc,
  datLich,
  datLuotPhe,
  napHoSo,
  nhanTin,
  NHIP_LIVE,
  NHIP_THU,
  phienMoi,
  taoThe,
  tinhHinh,
  xuatHoSo,
  type SoHoSo,
  type Pha,
  type Su,
  type The,
  type TinVao,
} from './loi/core';
import { taoKhachGia } from './thu';
import { H, taoCanh, W, type Canh } from './ve/canh';
import { taoCanh3D } from './ve3d/canh-3d';

/** `?2d=1`: ép dùng cảnh 2D (máy phát không có card đồ hoạ, hoặc để so sánh). */
const EP_2D = new URLSearchParams(location.search).has('2d');

/** `/d/<phòng>/?thu=1`: khách giả chơi, không nhận dữ liệu thật, không ghi sổ. */
export const THU = new URLSearchParams(location.search).has('thu');

export const LUA_CHON: readonly DesignCard[] = [
  {
    id: 'son-ha',
    name: 'Sơn Hà Tiên Lộ',
    icon: '⛰️',
    summary: 'Câu đố, độ kiếp, kéo co nước – núi, yêu tinh',
    toggle: {
      key: 'docTo',
      label: 'Đọc to câu hỏi và sự kiện',
      type: 'toggle',
      value: true,
      hint: 'Dùng giọng đọc của phòng. Tắt nếu MC AI đã dẫn đủ.',
    },
    fields: [
      {
        key: 'lich',
        label: 'Lịch sự kiện theo giờ',
        short: 'Lịch sự kiện',
        type: 'textarea',
        value: '20:00 cn dai-yeu\n21:00 hang-ngay hoi-thi\n12:00 t7,cn phuc-loc',
        hint: 'Mỗi dòng: giờ · ngày (hang-ngay, cn, t2…t7, nhiều ngày cách dấu phẩy) · loại: dai-yeu (Đại Yêu Dạ), dai-lu (Đại Hồng Thủy), hoi-thi (Hội thi Ngọc Phả), phuc-loc (Giờ Linh Khí). Báo trước 15 phút trên màn.',
      },
      {
        key: 'doiPhe',
        label: 'Đổi môn phái ở màn tu luyện sau mỗi',
        short: 'Lượt môn phái',
        type: 'number',
        value: 3,
        min: 1,
        max: 30,
        step: 1,
        unit: 'phút',
        hint: 'Lúc tu luyện (câu hỏi) chỉ hiện một môn phái kèm tổng lực chiến, hết lượt thì đổi phe kia. Đại Chiến mới chia đôi hai phe.',
      },
      {
        key: 'tiengHieuUng',
        label: 'Tiếng chuông, sấm, đòn đánh',
        short: 'Tiếng hiệu ứng',
        type: 'toggle',
        value: true,
      },
    ],
  },
];

const SO = (id: string) => `/s/so/${id}/ho-so`;
const GHI_MOI = 20_000;
const TINH_HINH_MOI = 6_000;

function tuFeed(f: FeedItem): TinVao | null {
  if (f.virtual === true) return null;
  if (f.kind !== 'comment' && f.kind !== 'like' && f.kind !== 'gift') return null;
  return {
    kind: f.kind,
    user: f.user,
    ten: f.name,
    text: f.kind === 'gift' ? f.gift ?? '' : f.text,
    count: f.count,
    xu: f.xu,
  };
}

/** Màn tu luyện (câu hỏi, độ kiếp, tổng kết): chỉ ở đây mới hiện màn đột phá — đột phá giữa
 *  Đại Chiến, đánh yêu, Địa Cung thì giữ lại, về tu luyện mới hiện. */
const laTuLuyen = (p: Pha) => ['cho', 'hoi', 'dap', 'kiep', 'kiep-ket', 'mua-ket'].includes(p.k);

const TIENG: Partial<Record<Su['k'], Tieng>> = {
  'dot-pha': 'dot-pha',
  set: 'set',
  qua: 'qua',
  'lien-kich': 'trong',
  'dau-tuong-ket': 'trong',
  'dao-chieu': 'trong-lon',
  'dau-tuong': 'trong-lon',
  'quyet-chien': 'trong-lon',
  'phan-don': 'trung',
  'ky-nang': 'trong',
  'ky-ngo': 'dot-pha',
  'pha-tran': 'trong-lon',
};
/** Việc làm rung cả khung: liên kích qua mốc, đảo chiều, đấu tướng, quyết chiến. */
const RUNG = new Set<Su['k']>(['lien-kich', 'dao-chieu', 'dau-tuong', 'dau-tuong-ket', 'quyet-chien', 'ky-nang', 'pha-tran']);
const TIENG_PHA: Partial<Record<string, Tieng>> = { hoi: 'cau', dap: 'dap', lu: 'lu', yeu: 'yeu', kiep: 'set' };

export function Stage() {
  const designId = useDesignId();
  const asset = useAsset();
  const assetRef = useRef(asset);
  assetRef.current = asset;
  const session = useSession();
  const cauHinh = useThietKe();
  const phong = useStage();
  const noi = useNoi();
  const khung = useRef<HTMLDivElement>(null);
  const vai = useRef<HTMLCanvasElement>(null);
  const lop = useRef<HTMLDivElement>(null);
  const theRef = useRef<The>(taoThe(Date.now(), THU ? NHIP_THU : NHIP_LIVE));
  const canh = useRef<Canh | null>(null);
  const anh = useRef(new Map<string, string>());
  const daNap = useRef(THU);
  const moc = useRef<{ phien: number | null; id: number } | null>(null);
  const [, setNhip] = useState(0);
  const [tile, setTile] = useState(1);
  const [thongBao, setThongBao] = useState<ThongBao | null>(null);
  const [dotPha, setDotPha] = useState<ThongBao | null>(null);
  /** Hàng chờ đột phá: ai đột phá cũng được ra giữa màn, lần lượt từng người. */
  const hangDp = useRef<{ user: string; canh: number }[]>([]);
  const dpHet = useRef(0);
  /** Điểm nhấn Đại Chiến (tuyệt kỹ) và đồ quý (bảo vật) — cũng xếp hàng, mỗi lần một cái. */
  const [noiBat, setNoiBat] = useState<NoiBat | null>(null);
  const hangNb = useRef<NoiBat[]>([]);
  const nbHet = useRef(0);
  /** Việc nhặt đồ trong Địa Cung cho lớp vẽ mê cung. */
  const hangMe = useRef<Su[]>([]);
  const [sanSang, setSanSang] = useState(THU);

  // Lịch theo giờ: đọc lại mỗi khi người vận hành sửa, áp nóng vào lõi.
  const lichChu = typeof cauHinh['lich'] === 'string' ? cauHinh['lich'] : '';
  useEffect(() => {
    datLich(theRef.current, docLich(lichChu).ds, new Date().getTimezoneOffset());
  }, [lichChu]);

  const doiPhe = typeof cauHinh['doiPhe'] === 'number' ? cauHinh['doiPhe'] : 3;
  useEffect(() => {
    if (!THU) datLuotPhe(theRef.current, doiPhe);
  }, [doiPhe]);

  const docTo = cauHinh['docTo'] !== false;
  const coTieng = cauHinh['tiengHieuUng'] !== false;
  const doc = useRef({ noi, giong: phong.ai.voiceId, docTo, coTieng });
  doc.current = { noi, giong: phong.ai.voiceId, docTo, coTieng };

  /** Việc lõi vừa báo: hiệu ứng, tiếng, giọng đọc, thẻ nổi. */
  const xuLy = useRef((ds: Su[], now: number) => {
    const the = theRef.current;
    for (const s of ds) {
      canh.current?.su(s, the, now);
      const d = doc.current;
      if (d.coTieng) {
        const tg = s.k === 'pha' ? TIENG_PHA[s.pha] : TIENG[s.k];
        if (tg !== undefined) phat(tg);
      }
      if (s.k === 'doc' && d.docTo && !THU) d.noi(s.chu, d.giong);
      if (RUNG.has(s.k)) {
        // Rung khung: gỡ lớp rồi gắn lại để hoạt cảnh chạy lại từ đầu.
        const k = khung.current?.querySelector<HTMLElement>('.sh-khung');
        if (k) {
          k.classList.remove('rung');
          void k.offsetWidth;
          k.classList.add('rung');
        }
      }
      if (s.k === 'the') setThongBao({ loai: 'the', user: s.user, den: now + 6000 });
      if (s.k === 'dot-pha') {
        hangDp.current.push({ user: s.user, canh: s.canh });
        // Phòng đông, nhiều người cùng lên: giữ 4 người mới nhất, khỏi xếp hàng cả phút.
        if (hangDp.current.length > 4) hangDp.current.splice(0, hangDp.current.length - 4);
      }
      if ((s.k === 'nhat' && s.nguon === 'me') || s.k === 'thoat') {
        hangMe.current.push(s);
        if (hangMe.current.length > 40) hangMe.current.shift();
      }
      if (s.k === 'tuyet-ky') {
        hangNb.current.push({ loai: 'tuyet-ky', user: s.user, phe: s.phe, chieu: s.chieu, den: 0 });
      }
      // Vinh danh người chơi: thoát Địa Cung (top 3 hoặc lực chiến tăng), đồ yêu tinh làm lực chiến tăng.
      if (s.k === 'thoat' && (s.thu <= 3 || s.lucSau > s.lucTruoc)) {
        hangNb.current.push({
          loai: 'vinh-danh',
          user: s.user,
          tieuDe: `Thoát Địa Cung · hạng ${s.thu}`,
          vat: s.vat,
          lucTruoc: s.lucTruoc,
          lucSau: s.lucSau,
          lk: s.lk,
          den: 0,
        });
      }
      if (s.k === 'nhat' && s.nguon === 'yeu' && (s.lucSau > s.lucTruoc || s.vat.pham >= 3)) {
        hangNb.current.push({
          loai: 'vinh-danh',
          user: s.user,
          tieuDe: 'Chiến lợi phẩm yêu tinh',
          vat: [s.vat],
          lucTruoc: s.lucTruoc,
          lucSau: s.lucSau,
          lk: s.lk,
          den: 0,
        });
      }
      if (s.k === 'ky-ngo') {
        hangNb.current.push({
          loai: 'vinh-danh',
          user: s.user,
          tieuDe: 'Kỳ ngộ · bước vào tiên lộ',
          vat: [s.vat],
          lucTruoc: 0,
          lucSau: 0,
          lk: 0,
          den: 0,
        });
      }
      // Giữ 3 cái mới nhất, vinh danh xếp trước tuyệt kỹ.
      if (hangNb.current.length > 3) {
        hangNb.current.sort((a, b) => (a.loai === b.loai ? 0 : a.loai === 'vinh-danh' ? -1 : 1));
        hangNb.current.length = 3;
      }
    }
  });

  // Chỉ bản dev: bắn thử sự kiện từ console (vd màn đột phá) để soát hình mà không phải chờ.
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __shThu: { xuLy: (ds: Su[]) => xuLy.current(ds, Date.now()), the: theRef.current } });
  }, []);

  // Khung 1080×1920 phóng vừa cửa sổ.
  useEffect(() => {
    const el = khung.current;
    if (el === null) return;
    const do_ = () => setTile(el.clientWidth / W);
    do_();
    const ro = new ResizeObserver(do_);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Luật chơi chạy theo đồng hồ riêng, vẽ chạy theo khung hình: tab bị ẩn thì trình duyệt
  // dừng requestAnimationFrame, nhưng câu hỏi và sự kiện vẫn phải tiếp tục.
  useEffect(() => {
    const cv = vai.current;
    const lopNguoi = lop.current;
    if (!cv || !lopNguoi) return;
    // 3D là mặc định; máy không dựng được WebGL thì lùi về cảnh 2D, phòng vẫn chạy.
    let c: Canh | null = null;
    if (!EP_2D) {
      try {
        c = taoCanh3D(cv, lopNguoi, (p) => assetRef.current(p));
      } catch (e) {
        console.warn('Không dựng được cảnh 3D, dùng cảnh 2D', e);
      }
    }
    if (c === null) {
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      c = taoCanh(ctx);
    }
    canh.current = c;
    const khach = THU ? taoKhachGia() : null;
    let lanKhach = 0;
    const luat = setInterval(() => {
      const now = Date.now();
      const the = theRef.current;
      if (khach && now - lanKhach > 400) {
        lanKhach = now;
        for (const tin of khach(the, now)) xuLy.current(nhanTin(the, tin, now, Math.random), now);
      }
      if (daNap.current) xuLy.current(buoc(the, now, Math.random), now);
      // Đang đấu tướng thì để banner VS một mình giữa màn: tuyệt kỹ, vinh danh chờ đấu xong.
      const dangDau = the.pha.k === 'lu' && the.pha.dau !== null;
      if (now >= nbHet.current && hangNb.current.length > 0 && !dangDau) {
        const nb = hangNb.current.shift()!;
        const dai = nb.loai === 'tuyet-ky' ? TUYET_KY_MS : VINH_DANH_MS;
        nbHet.current = now + dai + 200;
        setNoiBat({ ...nb, den: now + dai });
      }
      // Lượt đột phá kế tiếp khi lượt trước đã xong — chỉ trong màn tu luyện.
      if (now >= dpHet.current && hangDp.current.length > 0 && laTuLuyen(the.pha)) {
        const dp = hangDp.current.shift()!;
        const ngan = dp.canh < 3;
        dpHet.current = now + (ngan ? DOT_PHA_NGAN_MS : DOT_PHA_MS) + 300;
        setDotPha({ loai: 'dot-pha', user: dp.user, canh: dp.canh, den: now + (ngan ? DOT_PHA_NGAN_MS : DOT_PHA_MS), ngan });
      }
      setNhip((x) => x + 1);
    }, 250);
    let raf = 0;
    let lanVe = 0;
    const ve = () => {
      raf = requestAnimationFrame(ve);
      const now = Date.now();
      if (now - lanVe < 33) return;
      lanVe = now;
      canh.current?.ve(theRef.current, now, anh.current);
    };
    raf = requestAnimationFrame(ve);
    return () => {
      clearInterval(luat);
      cancelAnimationFrame(raf);
      canh.current?.don?.();
      canh.current = null;
    };
  }, []);

  // Nạp sổ tu vi một lần. Chưa nạp xong thì lõi chưa chạy, để không ai bị tính như người mới.
  useEffect(() => {
    if (THU) return;
    let huy = false;
    void fetch(SO(designId))
      .then((r) => (r.ok ? (r.json() as Promise<SoHoSo>) : {}))
      .catch(() => ({}))
      .then((d) => {
        if (huy) return;
        napHoSo(theRef.current, d);
        daNap.current = true;
        setSanSang(true);
      });
    return () => {
      huy = true;
    };
  }, [designId]);

  // Ghi sổ định kỳ khi có đổi; và gửi tình hình cho MC.
  useEffect(() => {
    if (THU) return;
    const ghi = () => {
      const the = theRef.current;
      if (!daNap.current || !the.ban) return;
      the.ban = false;
      void fetch(SO(designId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(xuatHoSo(the)),
      }).catch(() => {
        the.ban = true;
      });
    };
    const a = setInterval(ghi, GHI_MOI);
    const b = setInterval(() => {
      if (!daNap.current) return;
      // Mất một nhịp cũng không sao: nhịp sau gửi lại toàn bộ tình hình.
      void fetch(`/s/boi-canh/${designId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tinhHinh(theRef.current, Date.now())),
      }).catch(() => undefined);
    }, TINH_HINH_MOI);
    addEventListener('pagehide', ghi);
    return () => {
      clearInterval(a);
      clearInterval(b);
      removeEventListener('pagehide', ghi);
      ghi();
    };
  }, [designId]);

  // Bình luận mới vào lõi. Lần đầu mở khung thì bỏ lịch sử; đổi startedAt là phiên mới.
  useEffect(() => {
    if (THU || !sanSang || session.designId !== designId) return;
    const ds = session.recentFeed;
    if (moc.current === null) {
      moc.current = { phien: session.startedAt, id: ds.length > 0 ? ds[ds.length - 1]!.id : 0 };
      return;
    }
    const kq = locFeedMoi(moc.current, session.startedAt, ds);
    moc.current = kq.moc;
    const now = Date.now();
    const the = theRef.current;
    if (kq.phienMoi) phienMoi(the, now);
    for (const f of kq.moi) {
      const tin = tuFeed(f);
      if (tin !== null) xuLy.current(nhanTin(the, tin, now, Math.random), now);
    }
  }, [sanSang, session.designId, session.startedAt, session.recentFeed]);

  // Feed không kèm ảnh: ảnh khách nằm ở các danh sách người của phiên.
  const { recentUsers, seats, topGivers, topTuongTac } = session;
  useEffect(() => {
    for (const u of [...recentUsers, ...seats, ...topGivers, ...topTuongTac]) {
      if (u.avatar !== undefined && u.avatar !== '') anh.current.set(u.user, u.avatar);
    }
  }, [recentUsers, seats, topGivers, topTuongTac]);

  const now = Date.now();
  return (
    <div className="stage" ref={khung}>
      <div className="sh-khung" style={{ transform: `scale(${tile})` }}>
        <canvas ref={vai} width={W} height={H} className="sh-canh" />
        <div ref={lop} className="sh-lop-nguoi" />
        {theRef.current.pha.k === 'me' ? <MeCung the={theRef.current} anh={anh.current} asset={asset} hang={hangMe} /> : null}
        <Hud
          the={theRef.current}
          now={now}
          anh={anh.current}
          thongBao={thongBao}
          dotPha={dotPha}
          noiBat={noiBat}
          asset={asset}
        />
        {THU ? <div className="sh-thu">BẢN CHƠI THỬ · khách giả</div> : null}
      </div>
    </div>
  );
}
