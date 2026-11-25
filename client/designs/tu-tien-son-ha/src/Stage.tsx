import { DieuKhien } from './DieuKhien';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FeedItem } from '@live/contracts';
import { useAsset, useDesignId, useNoi, useSession, useStage, useThietKe } from '@live/stage-sdk';
import { phat, type Tieng } from './am-thanh';
import { DOT_PHA_MS, DOT_PHA_NGAN_MS } from './DotPha';
import { Hud, type ThongBao } from './Hud';
import { MeCung } from './MeCung';
import { TUYET_KY_MS, VINH_DANH_MS, type NoiBat } from './NoiBat';
import { locFeedMoi } from './loc-feed';
import { docLich } from './loi/lich';
import { TEN_AO } from './loi/the-gioi';
import { docCaiDat, docKho, LUA_CHON, taoLich } from './cai-dat';
import {
  buoc,
  datLich,
  datLuotPhe,
  datNhip,
  datTheoLich,
  datChuoi,
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
  giuMan,
  nhayKe,
  nhayMuc,
  nhayTongKet,
  nhayMe,
  nhayNm,
  nhayTiThi,
  nhayTt,
  moSuKienTl,
  datKho,
  nhayTuLuyen,
  thaGiu,
} from './loi/core';
import { taoKhachGia } from './thu';
import { H, taoCanh, W, type Canh } from './ve/canh';
import { taoCanh3D } from './ve3d/canh-3d';

/** Màn Đột Phá to (chiếm cả khung) chỉ là điểm nhấn hiếm: từ cảnh giới DP_TO_TU (Hóa Thần) trở lên, và cách màn to
 *  trước ít nhất DP_TO_CACH. Còn lại chỉ có cột sáng + chữ nhỏ trên đầu nhân vật (lớp 3D, Su "dot-pha"). */
const DP_TO_TU = 5;
const DP_TO_CACH = 3 * 60_000;

/** `?2d=1`: ép dùng cảnh 2D (máy phát không có card đồ hoạ, hoặc để so sánh). */
const EP_2D = new URLSearchParams(location.search).has('2d');

/** `/d/<phòng>/?thu=1`: khách giả chơi, không nhận dữ liệu thật, không ghi sổ. */
export const THU = new URLSearchParams(location.search).has('thu');

export { LUA_CHON };

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
  'cuong-bao': 'trong-lon',
  'dien-rong': 'trong-lon',
  'than-chieu': 'trong',
  'canh-bao': 'trung',
  'tp-ha': 'trong-lon',
  'tp-thuong': 'trung',
  'cuong-don': 'trung',
  'bao-chieu': 'trong-lon',
  'chieu-lon': 'trung',
  'do-chieu': 'trong',
  'ky-nang': 'trong',
  'ky-ngo': 'dot-pha',
  'nm-qua': 'dot-pha',
  'bi-kip': 'qua',
  'pha-tran': 'trong-lon',
};
/** Việc làm rung cả khung: liên kích qua mốc, đảo chiều, đấu tướng, quyết chiến. */
const RUNG = new Set<Su['k']>(['lien-kich', 'dao-chieu', 'dau-tuong', 'dau-tuong-ket', 'quyet-chien', 'ky-nang', 'pha-tran']);
const TIENG_PHA: Partial<Record<string, Tieng>> = { hoi: 'cau', dap: 'dap', lu: 'lu', yeu: 'yeu', kiep: 'set' };

/** Mở trong OBS: không vẽ thanh điều khiển (chỉ người vận hành xem trên trình duyệt mới thấy). */
const LA_OBS = typeof window !== 'undefined' && ('obsstudio' in window || new URLSearchParams(location.search).get('obs') === '1');

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
  const dpToLuc = useRef(0);
  const hangDp = useRef<{ user: string; canh: number; thach: number; phong: number }[]>([]);
  const dpHet = useRef(0);
  /** Điểm nhấn Đại Chiến (tuyệt kỹ) và đồ quý (bảo vật) — cũng xếp hàng, mỗi lần một cái. */
  const [noiBat, setNoiBat] = useState<NoiBat | null>(null);
  const hangNb = useRef<NoiBat[]>([]);
  const nbHet = useRef(0);
  /** Việc nhặt đồ trong Địa Cung cho lớp vẽ mê cung. */
  const hangMe = useRef<Su[]>([]);
  const [sanSang, setSanSang] = useState(THU);

  // Lịch theo giờ: đọc lại mỗi khi người vận hành sửa, áp nóng vào lõi.
  // Lịch trình ghép từ các ô của thẻ 📅 (phút mỗi giờ, khung boss, sự kiện lớn).
  const lichChu = taoLich(cauHinh);
  useEffect(() => {
    datLich(theRef.current, docLich(lichChu).ds, new Date().getTimezoneOffset());
  }, [lichChu]);

  const doiPhe = typeof cauHinh['doiPhe'] === 'number' ? cauHinh['doiPhe'] : 2;
  useEffect(() => {
    if (!THU) datLuotPhe(theRef.current, doiPhe);
  }, [doiPhe]);
  // Nhịp từ các thẻ cài đặt bên phải (cai-dat.ts). Bản thử giữ nhịp nhanh để xem trọn một vòng.
  const caiDat = docCaiDat(cauHinh);
  // Kho vật phẩm / cơ duyên / sự kiện sửa trên thẻ: áp ngay vào phiên đang chạy (cả bản thử).
  const kho = docKho(cauHinh);
  const khoaKho = JSON.stringify(kho);
  useEffect(() => {
    datKho(theRef.current, kho);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoaKho]);
  const khoaCaiDat = JSON.stringify(caiDat);
  useEffect(() => {
    if (!THU) {
      datNhip(theRef.current, caiDat.nhip, caiDat.tat, Date.now());
      datChuoi(theRef.current, caiDat.chuoi, Date.now());
      datTheoLich(theRef.current, caiDat.theoLich, Date.now());
    } else {
      // Bản thử cũng chạy lịch mỗi giờ (nhịp nhanh) để soát từng màn bằng thanh điều khiển bên phải khung.
      datChuoi(theRef.current, caiDat.chuoi, Date.now());
      datTheoLich(theRef.current, true, Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoaCaiDat]);

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
      // Thẻ tu vi (gõ "tôi", "7", hoặc mua thiếu linh thạch): chỉ hiện ở tu luyện và Thành Trì — màn mê cung, đánh
      // boss, Đại Chiến cần chỗ cho trận, hiện thẻ sẽ che bản đồ / đội quân.
      if (s.k === 'the' && ['cho', 'hoi', 'dap', 'tt'].includes(theRef.current.pha.k)) {
        setThongBao({ loai: 'the', user: s.user, den: now + 6000 });
      }
      // Màn Đột Phá chiếm cả khung chỉ dành cho điểm nhấn: từ Kết Đan trở lên, hoặc ngẫu nhiên (DP_TO_HIEM) khi đã lâu
      // chưa có màn to (DP_TO_CACH). Đột phá thường chỉ có hoạt ảnh nhỏ trên đầu nhân vật (lớp 3D, Su "dot-pha").
      // Đang tỉ thí Lôi Đài: không chen màn Đột Phá to (người đột phá vẫn có cột sáng + chữ nhỏ trên đầu).
      if (s.k === 'dot-pha' && theRef.current.loiDai?.tran == null && s.canh >= DP_TO_TU && now - dpToLuc.current >= DP_TO_CACH) {
        dpToLuc.current = now;
        hangDp.current.push({ user: s.user, canh: s.canh, thach: s.thach, phong: s.phong });
        // Phòng đông, nhiều người cùng lên: giữ 4 người mới nhất, khỏi xếp hàng cả phút.
        if (hangDp.current.length > 4) hangDp.current.splice(0, hangDp.current.length - 4);
      }
      if ((s.k === 'nhat' && (s.nguon === 'me' || s.nguon === 'nm')) || s.k === 'nhat-thach' || s.k === 'thoat' || s.k === 'nm-qua' || s.k === 'bi-kip') {
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
          tieuDe: `Tranh Đoạt Bảo Vật · ra cửa hạng ${s.thu}`,
          vat: s.vat,
          lucTruoc: s.lucTruoc,
          lucSau: s.lucSau,
          lk: s.lk,
          den: 0,
        });
      }
      if (s.k === 'nhat' && (s.nguon === 'yeu' || s.nguon === 'pk') && (s.nguon === 'pk' || s.lucSau > s.lucTruoc || s.vat.pham >= 3)) {
        hangNb.current.push({
          loai: 'vinh-danh',
          user: s.user,
          tieuDe: s.nguon === 'pk' ? 'Chiến lợi phẩm Đại Chiến' : 'Chiến lợi phẩm yêu tinh',
          vat: [s.vat],
          lucTruoc: s.lucTruoc,
          lucSau: s.lucSau,
          lk: s.lk,
          den: 0,
        });
      }
      // Vượt Ải Nhập Môn: vinh danh người mới, khoe bộ trang phục vừa được ban.
      if (s.k === 'nm-qua') {
        hangNb.current.push({
          loai: 'vinh-danh',
          user: s.user,
          tieuDe: `Vượt Ải Nhập Môn${s.thu <= 3 ? ` · thứ ${s.thu}` : ''} · ${TEN_AO[s.phe][s.ao - 1] ?? 'đệ tử mới'}${s.bk > 0 ? ' · 📜 lĩnh ngộ võ công' : ''}`,
          vat: s.vat,
          lucTruoc: s.lucTruoc,
          lucSau: s.lucSau,
          lk: 0,
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

  // Khung 1080×1920 phóng vừa cửa sổ — tính TRƯỚC lần vẽ đầu (useLayoutEffect), không thì khung hiện cỡ
  // gốc một lúc rồi mới co lại, trông như vỡ màn.
  useLayoutEffect(() => {
    const el = khung.current;
    if (el === null) return;
    const do_ = () => setTile(el.clientWidth / W);
    do_();
    const ro = new ResizeObserver(do_);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ẩn sân khấu tới khi tranh nền đã hiện (tối đa 3 giây), rồi hiện mờ dần — khỏi lộ khung trống lúc mới vào.
  const [nenRa, datNenRa] = useState(false);
  useEffect(() => {
    const bat = Date.now();
    const id = setInterval(() => {
      if (document.querySelector('.sh-nen img.hien') !== null || Date.now() - bat > 3_000) {
        datNenRa(true);
        clearInterval(id);
      }
    }, 80);
    return () => clearInterval(id);
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
    if (THU) (window as unknown as { __theThu?: () => The }).__theThu = () => theRef.current;
    // Bản chơi thử: cho người thử (hoặc công cụ kiểm tra) gõ lệnh thay một khách — window.__goThu({ kind: 'comment', user, ten, text }).
    if (THU) (window as unknown as { __goThu?: (tin: Parameters<typeof nhanTin>[1]) => void }).__goThu = (tin) => xuLy.current(nhanTin(theRef.current, tin, Date.now(), Math.random), Date.now());
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
      // Ải Nhập Môn đang chạy: modal không che bản đồ — vinh danh người vượt ải chờ tới lúc ải đóng.
      const dangDau = (the.pha.k === 'lu' && the.pha.dau !== null) || the.pha.k === 'nm';
      if (now >= nbHet.current && hangNb.current.length > 0 && !dangDau) {
        const nb = hangNb.current.shift()!;
        const dai = nb.loai === 'tuyet-ky' ? TUYET_KY_MS : VINH_DANH_MS;
        nbHet.current = now + dai + 200;
        setNoiBat({ ...nb, den: now + dai });
      }
      // Lượt đột phá kế tiếp khi lượt trước đã xong — chỉ trong màn tu luyện.
      if (now >= dpHet.current && hangDp.current.length > 0 && laTuLuyen(the.pha) && the.loiDai?.tran == null) {
        const dp = hangDp.current.shift()!;
        const ngan = dp.canh < 3;
        dpHet.current = now + (ngan ? DOT_PHA_NGAN_MS : DOT_PHA_MS) + 300;
        setDotPha({
          loai: 'dot-pha',
          user: dp.user,
          canh: dp.canh,
          den: now + (ngan ? DOT_PHA_NGAN_MS : DOT_PHA_MS),
          ngan,
          thach: dp.thach,
          phong: dp.phong,
        });
      }
      setNhip((x) => x + 1);
    }, 250);
    let raf = 0;
    let lanVe = 0;
    // Vẽ đủ nhịp màn hình (60 hình/giây) cho chuyển động mượt; máy yếu (một khung vẽ lâu quá 13 ms, tính
    // trung bình trượt) thì tự lùi về 30 hình/giây, khoẻ lại thì lên lại.
    let tbVe = 6;
    let cham = false;
    const ve = () => {
      raf = requestAnimationFrame(ve);
      const now = Date.now();
      if (cham && now - lanVe < 31) return;
      lanVe = now;
      const t0 = performance.now();
      canh.current?.ve(theRef.current, now, anh.current);
      tbVe += (performance.now() - t0 - tbVe) * 0.05;
      if (!cham && tbVe > 13) cham = true;
      else if (cham && tbVe < 7) cham = false;
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
    let hen = 0;
    // Chỉ chạy lõi khi đã ĐỌC ĐƯỢC sổ (máy chủ trả {} nếu sổ mới). Lỗi mạng / máy chủ chưa lên thì thử lại sau
    // 3 giây — tuyệt đối không coi là sổ trống: nếu không, đệ tử cũ bị xem như khách mới (bắt vượt Ải lại) và lần
    // ghi kế tiếp sẽ đè mất sổ cũ.
    const nap = () => {
      void fetch(SO(designId))
        .then((r) => {
          if (!r.ok) throw new Error(`sổ ${r.status}`);
          return r.json() as Promise<SoHoSo>;
        })
        .then((d) => {
          if (huy) return;
          napHoSo(theRef.current, d);
          daNap.current = true;
          setSanSang(true);
        })
        .catch(() => {
          if (!huy) hen = window.setTimeout(nap, 3_000);
        });
    };
    nap();
    return () => {
      huy = true;
      window.clearTimeout(hen);
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
    <>
    <div className={`stage${LA_OBS ? "" : " lech"}`} ref={khung}>
      <div className={`sh-khung${nenRa ? ' san-sang' : ''}`} style={{ transform: `scale(${tile})` }}>
        <canvas ref={vai} width={W} height={H} className="sh-canh" />
        <div ref={lop} className="sh-lop-nguoi" />
        {theRef.current.pha.k === 'me' || theRef.current.pha.k === 'nm' ? <MeCung the={theRef.current} anh={anh.current} asset={asset} hang={hangMe} /> : null}
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
    {LA_OBS ? null : (
      <DieuKhien
        the={theRef.current}
        now={now}
        ben={khung.current?.getBoundingClientRect() ?? null}
        batDung={() => {
          const t = Date.now();
          if (theRef.current.giu) xuLy.current(thaGiu(theRef.current, t, Math.random), t);
          else giuMan(theRef.current);
          setNhip((x) => x + 1);
        }}
        ke={() => {
          // Đang giữ màn mà bấm Màn kế: sang màn kế rồi giữ tiếp ở đó.
          const dangGiu = theRef.current.giu;
          xuLy.current(nhayKe(theRef.current, Date.now(), Math.random), Date.now());
          if (dangGiu) giuMan(theRef.current);
        }}
        toi={(i) => {
          xuLy.current(
            i === -10 || i === -11
              ? nhayTt(theRef.current, i === -10 ? 'son' : 'thuy', Date.now())
              : i <= -101 && i >= -299
              ? nhayMe(theRef.current, i > -200 ? 'son' : 'thuy', -i % 100, Date.now(), Math.random)
              : i === -4 || i === -5
              ? nhayNm(theRef.current, i === -4 ? 'son' : 'thuy', Date.now(), Math.random)
              : i === -6 || i === -7
              ? nhayTuLuyen(theRef.current, Date.now(), Math.random, i === -6 ? 'son' : 'thuy')
              : i === -8 || i === -9
              ? nhayTiThi(theRef.current, Date.now(), Math.random, i === -8 ? 'son' : 'thuy')
              : i === -3
              ? nhayTiThi(theRef.current, Date.now(), Math.random)
              : i === -2
              ? nhayTuLuyen(theRef.current, Date.now(), Math.random)
              : i < 0
                ? nhayTongKet(theRef.current, Date.now())
                : nhayMuc(theRef.current, i, Date.now(), Math.random),
            Date.now(),
          );
          // Nhảy tới màn nào thì GIỮ màn đó (không tự chuyển) tới khi bấm ▶ Chạy tiếp.
          giuMan(theRef.current, i === -3 || i === -8 || i === -9);
          setNhip((x) => x + 1);
        }}
        coDuyen={(id) => {
          const t = Date.now();
          const p = theRef.current.pha.k;
          const m = theRef.current.khoSuKien.find((x) => x.id === id);
          if ((p !== 'cho' && p !== 'hoi' && p !== 'dap') || m === undefined) return;
          const ra: Su[] = [];
          moSuKienTl(theRef.current, m.loai, t, ra, m);
          xuLy.current(ra, t);
        }}
      />
    )}
    </>
  );
}
