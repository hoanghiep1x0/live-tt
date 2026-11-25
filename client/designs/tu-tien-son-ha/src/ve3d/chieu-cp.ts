/** Tranh chiêu thức trên màn Đại Chiến: chiêu công pháp (C1–C9 mỗi tông) và chiêu binh khí nhỏ (quần chiến).
 *
 *  Tranh công pháp: `assets/chieu/<phe>-c<n>.webp` (ChatGPT, gốc ở `web/son-ha-tien-lo/tranh-goc/chieu-cp-<tông>/`).
 *  - Chiêu **bay** (hệ Công, Phá: C1 C4 C5 C8 C9): dải dài, đầu chiêu bên PHẢI tại `NEO_X`, giữa chiều cao.
 *  - Chiêu **quanh người** (hệ Thủ, Máu: C2 C3 C6 C7): ảnh vuông, hiện trên người tung — bật lên, sáng nhịp, tan.
 *  Tranh binh khí: `assets/chieu/vk/<phe>-b<phẩm>.webp` (cắt từ vệt chiêu binh khí, `cong-cu/vk-chieu.py`) — NHỎ,
 *  theo binh khí người đó đang đeo: cung / lao / đinh ba / chim thần bay thẳng chúc mũi; rìu, dao găm XOAY TRÒN.
 *
 *  Mỗi đường bay có đủ ba nhịp (người vận hành 2026-11-22: "xem kỹ từ lúc đánh ra đến điểm đến"):
 *  1. **Rời tay**: chớp sao sáng nhỏ ở tay người tung, chiêu bung từ nhỏ ra.
 *  2. **Đường bay**: vòng cung, chúc đầu theo hướng bay (bay sang trái lật dọc cho khỏi lộn ngược), tranh chớp sáng;
 *     tia lấp lánh ✦ rơi lại dọc đường; chiêu công pháp to kéo 2 bóng mờ nối đuôi.
 *  3. **Trúng đích**: chiêu lao sâu thêm một chút rồi tan, chớp sáng + tia ✦ bung ra quanh điểm trúng.
 *  Ảnh có thể thay bằng WebP **động** cùng tên, cùng tỉ lệ, cùng điểm neo — xem `docs/phong/tu-tien/chieu-thuc.md`. */
import { CONG_PHAP } from '../loi/tang-bao';
import type { Phe } from '../loi/the-gioi';

export type LoaiChieu = 'bay' | 'thu' | 'hoi';
/** Đầu chiêu nằm ở bao nhiêu phần bề ngang ảnh bay (đo bằng `cong-cu/chieu-cp.py`, 0,86–0,9). */
const NEO_X = 0.88;
/** Tranh binh khí: đầu mũi sát mép phải (cắt sát, lề nhỏ). */
const NEO_VK = 0.94;
/** Nhiều nhất bấy nhiêu tranh chiêu cùng lúc (không kể chiêu ưu tiên); quá thì nơi gọi bỏ đường bay. */
const TOI_DA = 18;
/** Rìu (Sơn phẩm 3), dao găm (phẩm 4): xoay tròn khi bay. */
const XOAY = new Set(['son-3', 'son-4', 'thuy-4']);
/** Màu tia sáng theo phẩm binh khí (Phàm → Thiên) và màu chiêu công pháp theo tông. */
const MAU_PHAM = ['#fff1b8', '#9dffb4', '#9ad8ff', '#e0a8ff', '#ffd75a'];
const MAU_TONG: Record<Phe, string> = { son: '#ffd77a', thuy: '#a8f0ff' };

export function loaiChieu(so: number): LoaiChieu | null {
  const m = CONG_PHAP[so - 1];
  if (m === undefined) return null;
  return m.he === 've' ? 'thu' : m.he === 'y' ? 'hoi' : 'bay';
}

export interface ChieuCp {
  /** Tranh chiêu công pháp bay từ (x0, y0) tới (x1, y1) (khung 1080 × 1920); `trung` gọi lúc chạm đích. `uu`: chiêu
   *  ưu tiên (thần, Chủ Tướng, tiên phong, quà, Tuyệt Kỹ) — không bị giới hạn số tranh. */
  bay(phe: Phe, so: number, x0: number, y0: number, x1: number, y1: number, to: number, trung: () => void, uu?: boolean): boolean;
  /** Binh khí nhỏ (phẩm 1–5) bay sang đích — chiêu thường của quần chiến / tiếp sức. */
  binhKhi(phe: Phe, pham: number, x0: number, y0: number, x1: number, y1: number, to: number, trung: () => void): boolean;
  /** Tranh chiêu quanh người tại (x, y) — tâm thân người tung. */
  quanh(phe: Phe, so: number, x: number, y: number, to: number, uu?: boolean): boolean;
  /** Va chạm cận chiến tại (x, y): chớp sao + tia ✦ bung (đơn đấu). */
  vaCham(x: number, y: number, mau: string, to: number): void;
}

export function taoChieuCp(lop: HTMLElement, asset: (p: string) => string): ChieuCp {
  const anh = new Map<string, HTMLImageElement>();
  const nap = (khoa: string, duong: string) => {
    const im = new Image();
    im.decoding = 'async';
    im.src = asset(duong);
    anh.set(khoa, im);
  };
  for (const phe of ['son', 'thuy'] as const) {
    for (let so = 1; so <= CONG_PHAP.length; so++) nap(`${phe}-${so}`, `chieu/${phe}-c${so}.webp`);
    for (let p = 1; p <= 5; p++) nap(`vk-${phe}-${p}`, `chieu/vk/${phe}-b${p}.webp`);
  }
  let dang = 0;
  const san = (khoa: string, uu = false) => {
    const im = anh.get(khoa);
    return im !== undefined && im.complete && im.naturalWidth > 0 && (uu || dang < TOI_DA) ? im : null;
  };
  const taoAnh = (im: HTMLImageElement, lopCss: string) => {
    const el = document.createElement('img');
    el.className = lopCss;
    el.src = im.src;
    el.alt = '';
    el.decoding = 'async';
    return el;
  };
  const gan = <T extends HTMLElement>(el: T) => {
    dang++;
    lop.append(el);
    return el;
  };
  const bo = (el: HTMLElement) => {
    el.remove();
    dang--;
  };
  /** Một tia lấp lánh ✦ tại (x, y): sáng lên rồi nhỏ dần, trôi theo (dx, dy). */
  const tia = (x: number, y: number, mau: string, co: number, dx: number, dy: number, lau: number) => {
    const t = document.createElement('i');
    t.className = 'sh-cp-tia';
    t.textContent = '✦';
    t.style.cssText = `left:${x}px;top:${y}px;--mau:${mau};--co:${Math.round(co)}px;--dx:${Math.round(dx)}px;--dy:${Math.round(dy)}px;--lau:${lau}ms`;
    lop.append(t);
    setTimeout(() => t.remove(), lau + 40);
  };
  /** Chớp sáng hình sao (không phải vòng tròn) ở điểm rời tay / trúng đích. */
  const chop = (x: number, y: number, mau: string, co: number) => {
    const c = document.createElement('i');
    c.className = 'sh-cp-chop-no';
    c.style.cssText = `left:${x}px;top:${y}px;--mau:${mau};--co:${Math.round(co)}px`;
    lop.append(c);
    setTimeout(() => c.remove(), 420);
  };
  /** Tia bung tròn quanh điểm trúng. */
  const bung = (x: number, y: number, mau: string, to: number) => {
    chop(x, y, mau, 90 * to);
    const n = 6 + Math.round(2 * to);
    for (let i = 0; i < n; i++) {
      const g = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const r = (40 + Math.random() * 40) * Math.min(2, to);
      tia(x, y, mau, (14 + Math.random() * 10) * Math.min(1.8, to), Math.cos(g) * r, Math.sin(g) * r - 10, 420 + Math.random() * 200);
    }
  };

  /** Đường bay vòng cung bậc hai từ (x0,y0) qua đỉnh (mx,my) tới (x1,y1). */
  const duong = (x0: number, y0: number, x1: number, y1: number, cao: number) => {
    const mx = (x0 + x1) / 2;
    const my = Math.min(y0, y1) - cao;
    const diem = (t: number) => ({
      x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1,
      y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1,
    });
    // Tiếp tuyến tại t (độ) — để chiêu chúc mũi theo đường bay.
    const huong = (t: number) => {
      const dx = 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx);
      const dy = 2 * (1 - t) * (my - y0) + 2 * t * (y1 - my);
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };
    return { diem, huong };
  };

  /** Bay một tranh (công pháp hoặc binh khí) theo đủ ba nhịp. */
  function bayAnh(
    im: HTMLImageElement,
    o: { lopCss: string; w: number; neo: number; xoay: boolean; bong: number; mau: string; to: number; uu: boolean },
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    trung: () => void,
  ) {
    const h = Math.round((o.w * im.naturalHeight) / im.naturalWidth);
    const trai = x1 < x0;
    const lat = trai ? ' scaleY(-1)' : '';
    const kc = Math.hypot(x1 - x0, y1 - y0);
    const { diem, huong } = duong(x0, y0, x1, y1, Math.min(260, 60 + kc * 0.22) * (0.8 + Math.random() * 0.4));
    const thoi = Math.min(950, 380 + kc * 0.42) * (o.to >= 2 ? 1.2 : 1);
    // Đường bay chia 8 khung: xoay theo tiếp tuyến; cuối cùng lao sâu thêm 6% rồi tan.
    const N = 8;
    const khung = (a: number): Keyframe[] => {
      const ds: Keyframe[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const p = diem(t);
        const g = o.xoay ? 0 : huong(t);
        const s = i === 0 ? 0.35 : i === 1 ? 0.9 : 1;
        ds.push({ offset: t * 0.94, transform: `translate(${p.x}px, ${p.y}px) rotate(${g}deg)${lat} scale(${s})`, opacity: i === 0 ? 0 : a });
      }
      const sau = diem(1.06);
      ds.push({ offset: 1, transform: `translate(${sau.x}px, ${sau.y}px) rotate(${o.xoay ? 0 : huong(1)}deg)${lat} scale(0.7)`, opacity: 0 });
      return ds;
    };
    const nhip: KeyframeAnimationOptions = { duration: thoi, easing: 'cubic-bezier(0.3, 0.05, 0.7, 1)' };
    // Rìu / dao găm: lớp ngoài chạy đường bay, ảnh bên trong xoay tròn (CSS `sh-cp-xoay`).
    const lam = (lopCss: string, a: number, tre: number) => {
      let el: HTMLElement;
      if (o.xoay) {
        el = document.createElement('span');
        el.className = `${lopCss} xoay`;
        const anhXoay = taoAnh(im, '');
        anhXoay.style.cssText = `width:${o.w}px;height:${h}px;animation-duration:${Math.round(260 + 80 / o.to)}ms;animation-direction:${trai ? 'reverse' : 'normal'}`;
        el.append(anhXoay);
      } else el = taoAnh(im, lopCss);
      el.style.cssText += `;width:${o.w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-o.w * (o.xoay ? 0.5 : o.neo)}px;transform-origin:${(o.xoay ? 0.5 : o.neo) * 100}% 50%`;
      gan(el);
      // fill 'backwards': bóng mờ chờ trễ vẫn nằm ở khung đầu (ẩn, tại tay người tung) — không lộ ở góc màn.
      el.animate(khung(a), { ...nhip, delay: tre, fill: 'backwards' }).onfinish = () => bo(el);
      return el;
    };
    for (let i = 1; i <= o.bong; i++) lam(`${o.lopCss} bong`, 0.4 / i, i * 45);
    lam(o.lopCss, 1, 0);
    // 1. Rời tay: chớp sao nhỏ.
    chop(x0, y0, o.mau, 60 * o.to);
    // 2. Tia lấp lánh rơi lại dọc đường (thưa với chiêu nhỏ, dày với chiêu to).
    const soTia = o.to >= 1.6 ? 7 : 4;
    for (let i = 1; i <= soTia; i++) {
      const t = i / (soTia + 1);
      setTimeout(() => {
        const p = diem(t);
        tia(p.x + (Math.random() - 0.5) * 16, p.y + (Math.random() - 0.5) * 16, o.mau, (10 + Math.random() * 8) * Math.min(1.8, o.to), (Math.random() - 0.5) * 20, 14 + Math.random() * 18, 380 + Math.random() * 160);
      }, t * thoi * 0.94);
    }
    // 3. Trúng đích.
    setTimeout(() => {
      bung(x1, y1, o.mau, o.to);
      trung();
    }, thoi * 0.94);
  }

  return {
    bay(phe, so, x0, y0, x1, y1, to, trung, uu = false) {
      if (loaiChieu(so) !== 'bay') return false;
      const im = san(`${phe}-${so}`, uu);
      if (im === null) return false;
      bayAnh(im, { lopCss: `sh-cp-bay ${phe}`, w: Math.round(230 * to), neo: NEO_X, xoay: false, bong: to >= 1.3 ? 2 : 0, mau: MAU_TONG[phe], to, uu }, x0, y0, x1, y1, trung);
      return true;
    },
    binhKhi(phe, pham, x0, y0, x1, y1, to, trung) {
      const p = Math.max(1, Math.min(5, Math.round(pham)));
      const im = san(`vk-${phe}-${p}`);
      if (im === null) return false;
      const xoay = XOAY.has(`${phe}-${p}`);
      bayAnh(im, { lopCss: `sh-cp-bay vk ${phe}`, w: Math.round((xoay ? 84 : 155) * to), neo: NEO_VK, xoay, bong: 0, mau: MAU_PHAM[p - 1]!, to, uu: false }, x0, y0, x1, y1, trung);
      return true;
    },
    quanh(phe, so, x, y, to, uu = false) {
      const loai = loaiChieu(so);
      if (loai !== 'thu' && loai !== 'hoi') return false;
      const im = san(`${phe}-${so}`, uu);
      if (im === null) return false;
      const el = gan(taoAnh(im, `sh-cp-quanh ${loai} ${phe}`));
      const c = Math.round(220 * to);
      el.style.cssText = `width:${c}px;height:${c}px;left:${x - c / 2}px;top:${y - c / 2}px`;
      // Lúc bùng lên: vài tia lấp lánh bay lên quanh người.
      for (let i = 0; i < 5; i++) {
        setTimeout(() => tia(x + (Math.random() - 0.5) * c * 0.7, y + c * 0.2, MAU_TONG[phe], 14 + Math.random() * 8, (Math.random() - 0.5) * 30, -60 - Math.random() * 50, 700), 120 + i * 90);
      }
      setTimeout(() => bo(el), 1700);
      return true;
    },
    vaCham(x, y, mau, to) {
      bung(x, y, mau, to);
    },
  };
}
