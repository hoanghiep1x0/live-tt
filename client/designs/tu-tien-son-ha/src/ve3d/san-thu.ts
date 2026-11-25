/** CẢNH THỬ ĐỒ / THỬ CHIÊU lúc tu luyện (người vận hành 2026-11-23: "khi ai mua công pháp thì chuyển cảnh, thử xong quay
 *  về màn thiền; mua trang phục cũng vậy, có màn thử trang phục riêng cho mỗi tông").
 *
 *  - **Võ Trường** (mua / đổi công pháp): nền `nen/vo-<tông>`; người mua đứng dáng chiến đúng bộ áo đang mặc bên trái,
 *    cọc tập của tông bên phải (`fx/coc-<tông>`); cứ ~1,6 giây tung chiêu của môn vừa học vào cọc (tranh chiêu công
 *    pháp — `chieu-cp.ts`), cọc rung, nảy số; môn Thủ / Máu thì chiêu bùng quanh người. Bảng "Lĩnh ngộ: tên chiêu".
 *  - **Phòng Thử Đồ** (mua / đổi trang phục): nền `nen/ao-<tông>`; trên bục giữa, bộ cũ loé sáng rồi thành bộ mới,
 *    xoay một vòng khoe áo; bên cạnh hiện dáng chiến của bộ mới (nếu đã vẽ). Bảng "Thử trang phục: tên bộ".
 *  Mỗi lượt vài giây, rồi về sân thiền; nhiều người mua liền thì nối tiếp (hàng chờ tối đa HANG_TOI_DA). Chỉ chạy lúc
 *  tu luyện (không tỉ thí, không độ kiếp). Lớp người (`.sh-av`) mờ đi trong lúc chiếu (`san-thu` trên lớp người).
 *  Chỉ là hình — luật mua bán không đổi. */
import type { Phe } from '../loi/the-gioi';
import { loaiChieu, type ChieuCp } from './chieu-cp';

export type LoaiThu = 'vo' | 'ao';
export interface LuotThu {
  loai: LoaiThu;
  user: string;
  ten: string;
  phe: Phe;
  /** Số công pháp (vo) hoặc số trang phục (ao). */
  so: number;
  tenMon: string;
  moTa: string;
  /** Tranh: dáng chiến (vo, ao), dáng ngồi bộ mới và bộ cũ (ao). */
  anhChien: string | undefined;
  anhNgoi: string | undefined;
  anhNgoiCu: string | undefined;
}

const LAU: Record<LoaiThu, number> = { vo: 9_000, ao: 7_500 };
const HANG_TOI_DA = 3;
/** Nhịp tung chiêu ở Võ Trường: tranh tĩnh (nhún tới) · video dáng chiến `-dong.webp` (FramePack, 2 giây: lấy đà →
 *  vung binh khí → về thế; chiêu rời tay ở `RA_TAY` sau khi video chạy lại từ đầu). */
const NHIP_CHIEU = 1_600;
const NHIP_VIDEO = 2_300;
const RA_TAY = 800;

export interface SanThu {
  them(l: LuotThu): void;
  /** Mỗi khung. `duoc`: đang tu luyện, được chiếu cảnh thử. */
  buoc(now: number, duoc: boolean): void;
  /** Cảnh đang chiếu (để đổi tranh nền), null là đang ở sân thiền. */
  dang(): { loai: LoaiThu; phe: Phe } | null;
}

export function taoSanThu(lop: HTMLElement, chieuCp: ChieuCp, asset: (p: string) => string): SanThu {
  const hang: LuotThu[] = [];
  let hien: { l: LuotThu; bd: number; el: HTMLElement; hen: number[] } | null = null;
  const coc: Record<Phe, HTMLImageElement> = { son: new Image(), thuy: new Image() };
  coc.son.src = asset('fx/coc-son.webp');
  coc.thuy.src = asset('fx/coc-thuy.webp');

  const anh = (src: string | undefined, lopCss: string) => {
    const im = document.createElement('img');
    im.className = lopCss;
    im.alt = '';
    if (src !== undefined) im.src = src;
    else im.style.display = 'none';
    return im;
  };
  const chu = (x: number, y: number, noi: string, lopCss: string, el: HTMLElement) => {
    const c = document.createElement('i');
    c.className = lopCss;
    c.textContent = noi;
    c.style.cssText = `left:${x}px;top:${y}px`;
    el.append(c);
    setTimeout(() => c.remove(), 1_200);
  };

  function bat(l: LuotThu, now: number) {
    const el = document.createElement('div');
    el.className = `sh-st ${l.loai} ${l.phe}`;
    const bang = document.createElement('div');
    bang.className = 'sh-st-bang';
    bang.innerHTML =
      l.loai === 'vo'
        ? `<small>📜 Lĩnh ngộ công pháp</small><b></b><span></span><em></em>`
        : `<small>👘 Thử trang phục</small><b></b><span></span>`;
    bang.querySelector('b')!.textContent = l.tenMon;
    bang.querySelector('span')!.textContent = l.ten;
    const em = bang.querySelector('em');
    if (em !== null) em.textContent = l.moTa;
    const hen: number[] = [];
    if (l.loai === 'vo') {
      const nguoi = anh(l.anhChien ?? l.anhNgoi, 'sh-st-nguoi');
      const c = coc[l.phe];
      const cocEl = anh(c.complete && c.naturalWidth > 0 ? c.src : undefined, 'sh-st-coc');
      // Chiều sâu: bóng đổ dưới chân người và cọc (cọc đứng lùi về sau, nhỏ hơn), tia sáng chéo trôi phía trước.
      const bong = (lopCss: string) => {
        const b = document.createElement('i');
        b.className = lopCss;
        return b;
      };
      el.append(bong('sh-st-tia'), bong('sh-st-bong-coc'), cocEl, bong('sh-st-bong-nguoi'), nguoi, bang);
      // Tung chiêu vào cọc: lần đầu sau 1,1 giây (đợi cảnh hiện), cứ NHIP_CHIEU một lần tới gần hết lượt.
      const bay = loaiChieu(l.so) === 'bay';
      // Có video dáng chiến: mỗi lượt cho video chạy lại từ đầu (đổi đuôi #), tung chiêu đúng lúc vung binh khí.
      const video = l.anhChien?.includes('-dong-') === true;
      if (video) nguoi.classList.add('video');
      let lan = 0;
      for (let t = video ? RA_TAY + 300 : 1_100; t < LAU.vo - 1_200; t += video ? NHIP_VIDEO : NHIP_CHIEU) {
        if (video) hen.push(window.setTimeout(() => (nguoi.src = `${l.anhChien}#${++lan}`), t - RA_TAY));
        hen.push(
          window.setTimeout(() => {
            if (!video) {
              nguoi.classList.remove('ra');
              void nguoi.offsetWidth;
              nguoi.classList.add('ra');
            }
            // Tranh dáng chiến Sơn Tông quay sang phải, Thủy Tông quay sang trái (đối mặt nhau ở PK): cảnh Thủy đối xứng
            // — người bên phải, cọc bên trái (CSS `.sh-st.vo.thuy`), chiêu bay từ phải sang trái.
            const lat = (x: number) => (l.phe === 'thuy' ? 1080 - x : x);
            if (bay) {
              // Ảnh động: chiêu rời đúng cây cung / mũi lao (đầu tay vươn ra, ~88% bề ngang, 40% chiều cao khung người).
              chieuCp.bay(l.phe, l.so, video ? lat(600) : lat(470), video ? 1090 : 1240, lat(830), 1220, 1.7, () => {
                cocEl.classList.remove('trung');
                void cocEl.offsetWidth;
                cocEl.classList.add('trung');
                chu(lat(800), 1150, `−${Math.round(80 + Math.random() * 60 * l.so)}`, 'sh-st-so', el);
              }, true);
            } else {
              chieuCp.quanh(l.phe, l.so, lat(330), 1300, 1.6, true);
              chu(lat(330), 1020, loaiChieu(l.so) === 'thu' ? '🛡 Hộ thể' : '💚 Hồi phục', 'sh-st-so lanh', el);
            }
          }, t),
        );
      }
    } else {
      const buc = document.createElement('i');
      buc.className = 'sh-st-buc';
      const cu = anh(l.anhNgoiCu, 'sh-st-cu');
      const moi = anh(l.anhNgoi, 'sh-st-moi');
      const chien = anh(l.anhChien, 'sh-st-chien');
      const tia = document.createElement('i');
      tia.className = 'sh-st-tia';
      el.append(tia, buc, cu, moi, chien, bang);
      // Lúc đổi áo (0,9 giây): chớp sáng + tia ✦ quanh người.
      hen.push(window.setTimeout(() => chieuCp.vaCham(540, 960, '#fff3c8', 2.2), 900));
    }
    lop.append(el);
    lop.classList.add('san-thu');
    hien = { l, bd: now, el, hen };
  }

  function tat() {
    if (hien === null) return;
    const { el, hen } = hien;
    hen.forEach((h) => clearTimeout(h));
    el.classList.add('tan');
    setTimeout(() => el.remove(), 700);
    hien = null;
    lop.classList.remove('san-thu');
  }

  return {
    them(l) {
      if (hang.length >= HANG_TOI_DA) return;
      if (hang.some((x) => x.user === l.user && x.loai === l.loai)) return;
      hang.push(l);
    },
    buoc(now, duoc) {
      if (!duoc) {
        tat();
        hang.length = 0;
        return;
      }
      if (hien !== null && now - hien.bd >= LAU[hien.l.loai]) tat();
      if (hien === null && hang.length > 0) bat(hang.shift()!, now);
    },
    dang: () => (hien === null ? null : { loai: hien.l.loai, phe: hien.l.phe }),
  };
}
