import { useEffect, useMemo, useRef, useState } from 'react';
import type { DesignCard, FeedItem } from '@live/contracts';
import { useAsset, useDesignId, useLoiMc, useNoi, useSession, useStage, useThietKe } from '@live/stage-sdk';
import { locFeedMoi } from './loc-feed';
import { THU } from './TheSanDau';

/** Thẻ riêng của phòng trong bảng xem. Đổi một trong hai ô là bắt đầu phiên mới. */
export const LUA_CHON: readonly DesignCard[] = [
  {
    id: 'nhan-vat-may',
    name: 'Nhân vật máy',
    icon: '🤖',
    summary: 'Chơi cùng khách, không tính vào dữ liệu thật',
    toggle: {
      key: 'coNhanVatMay',
      label: 'Thêm nhân vật máy',
      type: 'toggle',
      value: true,
    },
    fields: [
      {
        key: 'soNhanVatMay',
        label: 'Số nhân vật máy tối đa',
        short: 'Tối đa',
        type: 'number',
        min: 0,
        max: 56,
        value: 56,
      },
    ],
  },
];

const NGO = 'dai-chien';
const RONG_GAME = 360;

type TinGame = { ngo: string; t: string; v?: unknown; text?: string };

function goiFeed(f: FeedItem) {
  return {
    kind: f.kind,
    name: f.name,
    user: f.user,
    text: f.text,
    count: f.count,
    xu: f.xu,
    coins: f.coins,
    virtual: f.virtual,
  };
}

/** Đưa sự kiện phòng vào game, đưa lời MC lên hình, và báo tình hình trận cho backend
 *  để MC nói đúng chuyện đang diễn ra trên sân. */
export function Stage() {
  const asset = useAsset();
  const designId = useDesignId();
  const session = useSession();
  const loiMc = useLoiMc();
  const cauHinh = useThietKe();
  const phong = useStage();
  const dangPhat = phong.live === designId;
  const aiBat = phong.ai.enabled;
  const noi = useNoi();
  const doc = useRef({ noi, giong: phong.ai.voiceId });
  doc.current = { noi, giong: phong.ai.voiceId };
  const khung = useRef<HTMLDivElement>(null);
  const game = useRef<HTMLIFrameElement>(null);
  const idCuoi = useRef<number | null>(null);
  const phienCuoi = useRef<number | null>(null);
  const [sanSang, setSanSang] = useState(false);
  const [tile, setTile] = useState(1);

  const chonGiay = String(phong.design['giayPhien'] ?? '600');
  const giay =
    chonGiay === 'tu-nhap'
      ? String(Math.min(720, Math.max(1, Math.round(Number(phong.design['phutTuy'])) || 20)) * 60)
      : chonGiay;
  const coMay = cauHinh['coNhanVatMay'] !== false;
  const nguon = useMemo(
    () => `${asset('game/index.html')}?nhung=1&giay=${encodeURIComponent(giay)}&gia=1${THU ? '&thu=1' : ''}`,
    [asset, giay],
  );

  const gui = (m: Record<string, unknown>) =>
    game.current?.contentWindow?.postMessage({ ngo: NGO, ...m }, location.origin);

  // Đổi cấu hình là iframe tải lại: chờ game báo sẵn sàng rồi mới gửi tiếp.
  useEffect(() => {
    setSanSang(false);
    idCuoi.current = null;
  }, [nguon]);

  useEffect(() => {
    const el = khung.current;
    if (el === null) return;
    const do_ = () => setTile(el.clientWidth / RONG_GAME);
    do_();
    const ro = new ResizeObserver(do_);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const nhan = (ev: MessageEvent<TinGame>) => {
      if (ev.source !== game.current?.contentWindow || ev.origin !== location.origin) return;
      const m = ev.data;
      if (m?.ngo !== NGO) return;
      if (m.t === 'san-sang') setSanSang(true);
      else if (THU) return;
      else if (m.t === 'noi' && typeof m.text === 'string') doc.current.noi(m.text, doc.current.giong);
      else if (m.t === 'tinh-hinh') {
        // Mất một nhịp cũng không sao: nhịp sau gửi lại toàn bộ tình hình.
        void fetch(`/s/boi-canh/${designId}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(m.v),
        }).catch(() => undefined);
      }
    };
    window.addEventListener('message', nhan);
    return () => window.removeEventListener('message', nhan);
  }, [designId]);

  useEffect(() => {
    if (sanSang) gui({ t: 'net', k: tile * (window.devicePixelRatio || 1) });
  }, [sanSang, tile]);

  // Chỉ gửi sự kiện mới. Lần đầu mở khung thì bỏ lịch sử; số id về thấp là phiên mới.
  useEffect(() => {
    if (!sanSang || THU) return;
    // Game có thể sẵn sàng trước khi máy chủ gửi phiên về. Chưa có phiên của phòng này
    // mà đã mốc lịch sử bằng 0 thì quà cũ bị tính lại như quà mới.
    if (session.designId !== designId) return;
    const ds = session.recentFeed;
    const cuoi = ds.length > 0 ? ds[ds.length - 1]!.id : 0;
    if (idCuoi.current === null) {
      idCuoi.current = cuoi;
      phienCuoi.current = session.startedAt;
      // Game vừa mở lại giữa phiên: lấy lại top quà từ sổ của máy chủ, đúng một lần.
      // Vừa Reset tất cả trong buổi này thì top quà cũ không được quay lại khi tải lại game.
      if (session.topGivers.length > 0) {
        const ds = session.topGivers;
        const batDau = session.startedAt ?? 0;
        void fetch('/s/so/dai-chien-thap-den/san')
          .then((r) => (r.ok ? (r.json() as Promise<{ lenhReset?: { id: number; kieu: string } }>) : {}))
          .catch(() => ({}) as { lenhReset?: { id: number; kieu: string } })
          .then((d) => {
            const r = (d as { lenhReset?: { id: number; kieu: string } }).lenhReset;
            if (!(r?.kieu === 'all' && r.id > batDau)) gui({ t: 'top-qua', ds });
          });
      }
      return;
    }
    const kq = locFeedMoi({ phien: phienCuoi.current, id: idCuoi.current }, session.startedAt, ds);
    phienCuoi.current = kq.moc.phien;
    idCuoi.current = kq.moc.id;
    // Máy chủ mở phiên trắng (bấm Kết nối): game cũng phải xoá nhân vật cũ.
    if (kq.phienMoi) gui({ t: 'reset' });
    for (const f of kq.moi) gui({ t: 'feed', f: goiFeed(f) });
  }, [sanSang, session.designId, session.startedAt, session.recentFeed]);

  // Feed không kèm ảnh: ảnh khách nằm ở danh sách người của phiên.
  const { recentUsers, seats, topGivers, topTuongTac } = session;
  useEffect(() => {
    if (!sanSang || THU) return;
    const ds = [...recentUsers, ...seats, ...topGivers, ...topTuongTac]
      .filter((u) => u.avatar !== undefined)
      .map((u) => ({ user: u.user, avatar: u.avatar }));
    if (ds.length > 0) gui({ t: 'anh', ds });
  }, [sanSang, recentUsers, seats, topGivers, topTuongTac]);

  const soMay = Math.min(56, Math.max(0, Math.round(Number(cauHinh['soNhanVatMay'])) || 0));
  useEffect(() => {
    if (sanSang) gui({ t: 'may', on: coMay, n: soMay });
  }, [sanSang, coMay, soMay]);

  const sanDau = String(phong.design['sanDau'] ?? 'tu-dong');
  useEffect(() => {
    if (sanSang) gui({ t: 'san-dau', i: sanDau === 'tu-dong' ? -1 : Number(sanDau) });
  }, [sanSang, sanDau]);

  useEffect(() => {
    if (sanSang) gui({ t: 'ai-bat', on: aiBat && !THU });
  }, [sanSang, aiBat]);

  // Camera bấm tay đi qua cấu hình phòng để tới được mọi cửa sổ, kể cả OBS đang phát.
  // Gắn với phiên: buổi sau không bị khoá camera vào người của buổi trước.
  const camKhoa = phong.design['camTayPhien'] === session.startedAt ? String(phong.design['camTay'] ?? '') : '';
  useEffect(() => {
    if (sanSang && !THU) gui({ t: 'cam-tay', khoa: camKhoa });
  }, [sanSang, camKhoa]);

  const { viewers, views, likes, xu } = session.totals;
  useEffect(() => {
    if (sanSang) gui(THU ? { t: 'thu-song', on: dangPhat } : { t: 'so-live', live: dangPhat, viewers, views, likes, xu });
  }, [sanSang, dangPhat, viewers, views, likes, xu]);

  useEffect(() => {
    if (sanSang && !THU && loiMc !== null) gui({ t: 'mc', text: loiMc.text, ms: loiMc.ms });
  }, [sanSang, loiMc?.at, loiMc?.text]);

  return (
    <div className="stage" ref={khung}>
      <iframe
        ref={game}
        className="dai-chien-game"
        src={nguon}
        title="Live Đại Chiến"
        allow="autoplay"
        style={{ transform: `scale(${tile})` }}
      />
    </div>
  );
}
