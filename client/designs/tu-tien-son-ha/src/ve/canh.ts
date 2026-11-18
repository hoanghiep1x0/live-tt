/** Vẽ cảnh Sơn Hà trên canvas 1080×1920: trời, núi Ba Vì ba đỉnh, Long Cung, sóng nước,
 *  người chơi, yêu tinh và hiệu ứng. Chỉ ĐỌC trạng thái lõi; hiệu ứng tự giữ trong file này. */

import { dangChoi, type NguoiChoi, type Su, type The } from '../loi/core';
import { CANH_GIOI, LINH_VAT, PHE, type Phe, type YeuId } from '../loi/the-gioi';
import { rgba, veHinhYeu } from './yeu-2d';

export const W = 1080;
export const H = 1920;

type Ctx = CanvasRenderingContext2D;

interface Hat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tuoi: number;
  song: number;
  r: number;
  mau: string;
  kieu: 'cham' | 'den' | 'tim' | 'canh-hoa' | 'khien';
  /** Bay thẳng tới điểm này thay vì theo vận tốc. */
  toi?: { x0: number; y0: number; x: number; y: number };
}

interface ChuBay {
  x: number;
  y: number;
  chu: string;
  mau: string;
  co: number;
  tuoi: number;
  song: number;
}

interface Tia {
  diem: { x: number; y: number }[];
  nhanh: { x: number; y: number }[][];
  tuoi: number;
  song: number;
}

interface Vong {
  x: number;
  y: number;
  mau: string;
  tuoi: number;
  song: number;
  r: number;
}

export interface Canh {
  ve(the: The, now: number, anh: ReadonlyMap<string, string>): void;
  su(su: Su, the: The, now: number): void;
  /** Giải phóng tài nguyên (WebGL) khi gỡ phòng. */
  don?(): void;
}

function bam(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const bam01 = (s: string, muoi: number) => (bam(s + '#' + muoi) % 10000) / 10000;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function tron(hex: string, hex2: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(hex2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return `rgb(${r},${g},${bl})`;
}


const LV_HINH = new Map(LINH_VAT.map((l) => [l.id, l.hinh]));

export function taoCanh(ctx: Ctx): Canh {
  const hat: Hat[] = [];
  const chu: ChuBay[] = [];
  const tia: Tia[] = [];
  const vong: Vong[] = [];
  const anhNap = new Map<string, HTMLImageElement>();
  /** Vị trí vẽ lần trước của từng người, để hiệu ứng bay ra đúng chỗ. */
  const viTri = new Map<string, { x: number; y: number; r: number }>();
  /** Lúc người này vừa làm gì đó — hiện tên một lúc. */
  const vuaLam = new Map<string, number>();
  /** Việc của người chưa có chỗ trên cảnh (vừa vào): chờ khung hình sau mới vẽ hiệu ứng. */
  let choVe: { s: Su; luc: number }[] = [];
  let mucHien = 0;
  let toiHien = 0;
  let loe = 0;
  let trungLuc = 0;
  let lanTruoc = 0;
  let setKe = 0;
  const mua: { x: number; y: number; v: number }[] = Array.from({ length: 140 }, (_, i) => ({
    x: bam01('m', i) * W,
    y: bam01('n', i) * H,
    v: 26 + bam01('v', i) * 20,
  }));
  const sao = Array.from({ length: 90 }, (_, i) => ({
    x: bam01('sx', i) * W,
    y: bam01('sy', i) * 900,
    r: 0.6 + bam01('sr', i) * 1.8,
    p: bam01('sp', i) * 6,
  }));

  // ---------- Địa hình ----------

  const nuocY = () => 1400 - mucHien * 30;
  const dinhY = () => 900 + mucHien * 26;

  function doiNui(x: number): number {
    const day = nuocY() + 70;
    const A = day - dinhY();
    // Đỉnh tròn, chân loe: dáng núi đất Ba Vì, không phải núi đá nhọn.
    const non = (cx: number, rong: number, cao: number) => {
      const t = Math.abs(x - cx) / rong;
      return t >= 1 ? 0 : cao * Math.pow(Math.cos((t * Math.PI) / 2), 1.7);
    };
    let h = Math.max(non(330, 460, A), non(110, 330, A * 0.8), non(580, 300, A * 0.86));
    if (h > 18) h += 9 * Math.sin(x / 31) + 5 * Math.sin(x / 11.3);
    return day - Math.max(0, h);
  }

  function choNguoi(n: NguoiChoi, t: number): { x: number; y: number } {
    const a = bam01(n.user, 1);
    const b = bam01(n.user, 2);
    if (n.phe === 'thuy') {
      const ny = nuocY();
      const x = 640 + a * 400;
      const y = Math.min(1860, ny + 40 + b * 360) + Math.sin(t * 1.6 + a * 9) * 6;
      return { x, y };
    }
    const x = 70 + a * 560;
    const doi = doiNui(x);
    const day = nuocY() - 20;
    const y = Math.max(1120, lerp(doi + 34, Math.max(doi + 34, day), b));
    return { x, y };
  }

  // ---------- Vẽ từng lớp ----------

  function veTroi(t: number, bao: number, kiep: number, yeu: number) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const tren = tron('#120b2e', '#05070f', Math.max(bao, kiep));
    const giua = tron(yeu > 0 ? '#4b1d4f' : '#3d2a63', '#16213a', Math.max(bao, kiep * 0.9));
    const chan = tron(yeu > 0 ? '#c2456b' : '#e8875c', '#2c3e5c', Math.max(bao, kiep));
    g.addColorStop(0, tren);
    g.addColorStop(0.45, giua);
    g.addColorStop(0.72, chan);
    g.addColorStop(1, tron('#f3b27a', '#33496b', Math.max(bao, kiep)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sang = 1 - Math.max(bao, kiep) * 0.85;
    for (const s of sao) {
      ctx.globalAlpha = sang * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.p)));
      ctx.fillStyle = '#fff6e0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Trăng sau đỉnh núi, mờ đi khi bão.
    const tx = 760;
    const ty = 980;
    const hg = ctx.createRadialGradient(tx, ty, 10, tx, ty, 260);
    hg.addColorStop(0, `rgba(255,236,200,${0.55 * sang})`);
    hg.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(tx - 260, ty - 260, 520, 520);
    ctx.fillStyle = `rgba(255,244,222,${0.95 * sang})`;
    ctx.beginPath();
    ctx.arc(tx, ty, 74, 0, Math.PI * 2);
    ctx.fill();

    // Mây trôi.
    for (let i = 0; i < 7; i++) {
      const x = ((bam01('may', i) * W + t * (8 + i * 3)) % (W + 500)) - 250;
      const y = 880 + bam01('mayy', i) * 260;
      ctx.fillStyle = `rgba(${bao > 0.5 ? '60,70,90' : '255,214,200'},${0.07 + bam01('maya', i) * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 220, 34, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 90, y - 18, 140, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function veDayXa(bao: number) {
    const lop = [
      { y: 1080, cao: 150, mau: tron('#5a3d78', '#1d2a40', bao), tan: 0.0071, pha: 1.3 },
      { y: 1160, cao: 130, mau: tron('#41305e', '#172133', bao), tan: 0.0093, pha: 4.1 },
    ];
    for (const l of lop) {
      ctx.fillStyle = l.mau;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) {
        const y = l.y - l.cao * (0.5 + 0.3 * Math.sin(x * l.tan + l.pha) + 0.2 * Math.sin(x * l.tan * 2.7 + l.pha * 2));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    }
  }

  function veLongCung(t: number, bao: number) {
    const ny = nuocY();
    const x = 880;
    const day = ny + 30;
    ctx.save();
    ctx.fillStyle = tron('#1d3550', '#0f1b2a', bao);
    const tang = [
      { w: 230, h: 70 },
      { w: 180, h: 62 },
      { w: 130, h: 56 },
    ];
    let y = day;
    for (const [i, tg] of tang.entries()) {
      ctx.fillRect(x - tg.w / 2 + 20, y - tg.h, tg.w - 40, tg.h);
      // Mái cong.
      const my = y - tg.h;
      ctx.beginPath();
      ctx.moveTo(x - tg.w / 2 - 22, my + 8);
      ctx.quadraticCurveTo(x - tg.w / 2 + 10, my - 4, x - tg.w / 4, my - 22);
      ctx.lineTo(x + tg.w / 4, my - 22);
      ctx.quadraticCurveTo(x + tg.w / 2 - 10, my - 4, x + tg.w / 2 + 22, my + 8);
      ctx.closePath();
      ctx.fill();
      // Cửa sổ sáng ngọc lam.
      const sang = 0.55 + 0.25 * Math.sin(t * 2 + i);
      ctx.fillStyle = `rgba(94,224,230,${sang})`;
      for (let k = -1; k <= 1; k++) ctx.fillRect(x + k * (tg.w / 4) - 7, y - tg.h + 18, 14, 22);
      ctx.fillStyle = tron('#1d3550', '#0f1b2a', bao);
      y = my - 22;
    }
    // Ngọc trên nóc.
    const g = ctx.createRadialGradient(x, y - 18, 2, x, y - 18, 60);
    g.addColorStop(0, 'rgba(160,255,250,.9)');
    g.addColorStop(1, 'rgba(160,255,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, y - 78, 120, 120);
    ctx.restore();
  }

  function veNui(bao: number) {
    const ny = nuocY();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10, H);
    for (let x = -10; x <= 900; x += 6) ctx.lineTo(x, doiNui(x));
    ctx.lineTo(900, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, dinhY(), 0, ny + 80);
    g.addColorStop(0, tron('#9fd8a8', '#4d6b5e', bao));
    g.addColorStop(0.25, tron('#3f8f5a', '#2a4b3e', bao));
    g.addColorStop(1, tron('#1e4a35', '#13261f', bao));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    // Viền nắng vàng hắt từ phía trăng.
    ctx.strokeStyle = rgba('#f2c94c', 0.45 * (1 - bao * 0.7));
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let x = 300; x <= 900; x += 6) ctx[x === 300 ? 'moveTo' : 'lineTo'](x + 3, doiNui(x) + 4);
    ctx.stroke();
    // Rừng: chấm cây tối dọc sườn.
    // Vệt đá và khe núi chạy chéo từ đỉnh xuống, cho núi có khối thay vì một mảng phẳng.
    ctx.strokeStyle = 'rgba(10,30,22,.28)';
    ctx.lineWidth = 3;
    for (const [cx, n] of [[330, 7], [120, 4], [570, 5]] as const) {
      for (let i = 0; i < n; i++) {
        const lech = (i - (n - 1) / 2) * 46;
        ctx.beginPath();
        ctx.moveTo(cx + lech * 0.2, doiNui(cx) + 30);
        ctx.quadraticCurveTo(cx + lech * 0.8, (doiNui(cx) + ny) / 2, cx + lech * 1.9, ny + 30);
        ctx.stroke();
      }
    }
    // Rừng: tán cây tròn mờ dọc sườn, thưa dần lên đỉnh.
    for (let i = 0; i < 90; i++) {
      const x = bam01('cay', i) * 880;
      const doi = doiNui(x);
      const k = bam01('cayy', i);
      const y = doi + 60 + Math.pow(k, 0.7) * Math.max(0, ny - doi - 40);
      const r = 10 + bam01('cayr', i) * 14;
      ctx.fillStyle = rgba('#163d2b', 0.35 + bam01('caya', i) * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.8, y + 3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sương lưng chừng núi.
    for (let i = 0; i < 3; i++) {
      const y = lerp(dinhY() + 120, ny - 40, (i + 0.5) / 3);
      const sg = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, `rgba(235,225,255,${0.12 - bao * 0.06})`);
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, y - 30, 920, 60);
    }
    ctx.restore();
    // Đền trên đỉnh chính.
    const dx = 330;
    const dy = doiNui(330);
    ctx.fillStyle = '#7a2f1f';
    ctx.fillRect(dx - 22, dy - 26, 44, 26);
    ctx.fillStyle = '#3a1a12';
    ctx.beginPath();
    ctx.moveTo(dx - 36, dy - 24);
    ctx.quadraticCurveTo(dx, dy - 52, dx + 36, dy - 24);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,90,.9)';
    ctx.fillRect(dx - 5, dy - 18, 10, 14);
  }

  function veSong(t: number, bao: number, truoc: boolean) {
    const ny = nuocY();
    const lop = truoc
      ? [
          { d: 26, a: 14, k: 0.011, v: 1.4, mau: tron('#1f6fb2', '#1a3150', bao), al: 0.92 },
          { d: 60, a: 10, k: 0.017, v: -1.1, mau: tron('#174f87', '#13243c', bao), al: 0.95 },
        ]
      : [{ d: 0, a: 12, k: 0.008, v: 0.9, mau: tron('#2f8fd0', '#22405f', bao), al: 0.85 }];
    for (const l of lop) {
      ctx.fillStyle = l.mau;
      ctx.globalAlpha = l.al;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) {
        const y = ny + l.d + Math.sin(x * l.k + t * l.v) * l.a + Math.sin(x * l.k * 2.3 - t * l.v * 1.3) * l.a * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.fill();
      // Bọt sóng.
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#bff3ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const y = ny + l.d + Math.sin(x * l.k + t * l.v) * l.a + Math.sin(x * l.k * 2.3 - t * l.v * 1.3) * l.a * 0.4;
        ctx[x === 0 ? 'moveTo' : 'lineTo'](x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!truoc) {
      // Ánh trăng trên mặt nước.
      for (let i = 0; i < 12; i++) {
        const y = ny + 20 + i * 18;
        const w = 120 - i * 7 + Math.sin(t * 2 + i) * 12;
        ctx.fillStyle = `rgba(255,240,210,${(0.22 - i * 0.015) * (1 - bao)})`;
        ctx.fillRect(760 - w / 2, y, w, 4);
      }
    }
  }

  function anh(url: string | undefined): HTMLImageElement | null {
    if (url === undefined || url === '') return null;
    let im = anhNap.get(url);
    if (im === undefined) {
      im = new Image();
      im.referrerPolicy = 'no-referrer';
      im.src = url;
      anhNap.set(url, im);
    }
    return im.complete && im.naturalWidth > 0 ? im : null;
  }

  function veNguoi(n: NguoiChoi, x: number, y: number, r: number, t: number, url: string | undefined, nhan: boolean) {
    const cg = CANH_GIOI[n.canh]!;
    const mauPhe = n.phe === null ? '#cccccc' : PHE[n.phe].mauSang;
    // Hào quang to dần theo cảnh giới.
    const rh = r * (1.5 + n.canh * 0.12) * (1 + 0.06 * Math.sin(t * 3 + x));
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, rh);
    g.addColorStop(0, rgba(cg.hao, 0.75));
    g.addColorStop(1, rgba(cg.hao, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rh, 0, Math.PI * 2);
    ctx.fill();
    if (n.canh >= 4) {
      // Từ Nguyên Anh: vòng linh quang quay.
      const so = 3 + (n.canh - 4);
      for (let i = 0; i < so; i++) {
        const a = t * 1.8 + (i * Math.PI * 2) / so;
        ctx.fillStyle = cg.hao;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10) * 0.55, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    const im = anh(url);
    if (im !== null) {
      ctx.clip();
      ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = n.phe === null ? '#555' : PHE[n.phe].mau;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(r * 0.95)}px "Be Vietnam Pro", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((n.ten.trim()[0] ?? '?').toUpperCase(), x, y + 1);
    }
    ctx.restore();
    ctx.strokeStyle = mauPhe;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    const lv = n.linhVat[n.linhVat.length - 1];
    if (lv !== undefined) {
      ctx.font = `${Math.round(r * 0.8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LV_HINH.get(lv) ?? '', x + r * 0.85, y + r * 0.8);
    }
    if (nhan) {
      const ten = n.ten.length > 12 ? n.ten.slice(0, 11) + '…' : n.ten;
      ctx.font = '700 19px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const w = ctx.measureText(ten).width + 16;
      ctx.fillStyle = 'rgba(10,8,20,.72)';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y + r + 5, w, 26, 13);
      ctx.fill();
      ctx.fillStyle = mauPhe;
      ctx.fillText(ten, x, y + r + 9);
    }
  }

  // ---------- Yêu tinh ----------

  function veYeu(yeu: YeuId, x: number, y: number, t: number, phanMau: number) {
    ctx.save();
    const rung = t >= trungLuc && t - trungLuc < 0.15 ? (Math.random() - 0.5) * 14 : 0;
    ctx.translate(x + rung, y + Math.sin(t * 1.2) * 14);
    // Quầng tà khí.
    const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 330);
    const mauKhi = yeu === 'ngu' ? '#1fd1c1' : yeu === 'ho' ? '#d14bff' : yeu === 'moc' ? '#8bd14b' : '#ff4a6a';
    g.addColorStop(0, rgba(mauKhi, 0.35));
    g.addColorStop(1, rgba(mauKhi, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 330, 0, Math.PI * 2);
    ctx.fill();
    // Yếu máu thì nhỏ lại một chút.
    const s = 0.8 + 0.2 * phanMau;
    ctx.scale(s, s);
    veHinhYeu(ctx, yeu, t);
    if (t >= trungLuc && t - trungLuc < 0.09) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 230, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Hiệu ứng ----------

  function taoTia(x0: number, y0: number, x1: number, y1: number): Tia {
    const diem: { x: number; y: number }[] = [];
    const buoc = 14;
    for (let i = 0; i <= buoc; i++) {
      const k = i / buoc;
      diem.push({
        x: lerp(x0, x1, k) + (i > 0 && i < buoc ? (Math.random() - 0.5) * 70 : 0),
        y: lerp(y0, y1, k),
      });
    }
    const nhanh: { x: number; y: number }[][] = [];
    for (let j = 0; j < 3; j++) {
      const goc = diem[3 + Math.floor(Math.random() * 8)]!;
      const ds = [goc];
      let p = goc;
      for (let i = 0; i < 4; i++) {
        p = { x: p.x + (Math.random() - 0.5) * 80, y: p.y + 30 + Math.random() * 30 };
        ds.push(p);
      }
      nhanh.push(ds);
    }
    return { diem, nhanh, tuoi: 0, song: 0.45 };
  }

  function veHieuUng(dt: number) {
    for (let i = hat.length - 1; i >= 0; i--) {
      const p = hat[i]!;
      p.tuoi += dt;
      if (p.tuoi >= p.song) {
        hat.splice(i, 1);
        continue;
      }
      const k = p.tuoi / p.song;
      if (p.toi !== undefined) {
        const e = 1 - Math.pow(1 - k, 2);
        p.x = lerp(p.toi.x0, p.toi.x, e);
        p.y = lerp(p.toi.y0, p.toi.y, e) - Math.sin(k * Math.PI) * 80;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kieu === 'den') p.x += Math.sin(p.tuoi * 1.5 + p.r) * 0.4;
      }
      const a = p.kieu === 'den' ? Math.min(1, (1 - k) * 2.5) : 1 - k;
      ctx.globalAlpha = Math.max(0, a);
      if (p.kieu === 'den') {
        const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 50);
        g.addColorStop(0, 'rgba(255,190,90,.8)');
        g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - 50, p.y - 50, 100, 100);
        ctx.fillStyle = '#ffb44a';
        ctx.beginPath();
        ctx.roundRect(p.x - 14, p.y - 20, 28, 36, 8);
        ctx.fill();
        ctx.fillStyle = '#fff2c4';
        ctx.fillRect(p.x - 5, p.y + 4, 10, 8);
      } else if (p.kieu === 'tim') {
        ctx.fillStyle = p.mau;
        ctx.font = `${p.r * 2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('❤', p.x, p.y);
      } else if (p.kieu === 'canh-hoa') {
        ctx.fillStyle = p.mau;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, p.tuoi * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kieu === 'khien') {
        ctx.strokeStyle = p.mau;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
        g.addColorStop(0, p.mau);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (let i = vong.length - 1; i >= 0; i--) {
      const v = vong[i]!;
      v.tuoi += dt;
      if (v.tuoi >= v.song) {
        vong.splice(i, 1);
        continue;
      }
      const k = v.tuoi / v.song;
      ctx.strokeStyle = rgba(v.mau, 1 - k);
      ctx.lineWidth = 8 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.r * (0.3 + k), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = tia.length - 1; i >= 0; i--) {
      const s = tia[i]!;
      s.tuoi += dt;
      if (s.tuoi >= s.song) {
        tia.splice(i, 1);
        continue;
      }
      const a = 1 - s.tuoi / s.song;
      for (const [w, mau] of [
        [16, `rgba(170,190,255,${0.25 * a})`],
        [5, `rgba(235,240,255,${a})`],
      ] as const) {
        ctx.strokeStyle = mau;
        ctx.lineWidth = w;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        s.diem.forEach((p, j) => ctx[j === 0 ? 'moveTo' : 'lineTo'](p.x, p.y));
        ctx.stroke();
        ctx.lineWidth = w * 0.45;
        for (const nh of s.nhanh) {
          ctx.beginPath();
          nh.forEach((p, j) => ctx[j === 0 ? 'moveTo' : 'lineTo'](p.x, p.y));
          ctx.stroke();
        }
      }
    }

    for (let i = chu.length - 1; i >= 0; i--) {
      const c = chu[i]!;
      c.tuoi += dt;
      if (c.tuoi >= c.song) {
        chu.splice(i, 1);
        continue;
      }
      const k = c.tuoi / c.song;
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      ctx.font = `800 ${c.co}px "Be Vietnam Pro", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(10,6,20,.85)';
      const y = c.y - k * 70;
      ctx.strokeText(c.chu, c.x, y);
      ctx.fillStyle = c.mau;
      ctx.fillText(c.chu, c.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function veMua(dt: number, bao: number) {
    if (bao <= 0.02) return;
    ctx.strokeStyle = `rgba(180,210,255,${0.35 * bao})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const m of mua) {
      m.y += m.v * dt * 40;
      m.x -= m.v * dt * 8;
      if (m.y > H) {
        m.y = -40;
        m.x = Math.random() * (W + 200);
      }
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - 8, m.y + 36);
    }
    ctx.stroke();
  }

  // ---------- Vòng vẽ ----------

  const tamYeu = { x: 540, y: 1330 };
  const tamKiep = { x: 540, y: 1300 };

  function ve(the: The, now: number, anhCua: ReadonlyMap<string, string>) {
    const t = now / 1000;
    const dt = lanTruoc === 0 ? 0 : Math.min(0.1, t - lanTruoc);
    lanTruoc = t;
    const pha = the.pha;

    let mucDich = the.muc;
    if (pha.k === 'lu') {
      const tong = pha.son + pha.thuy;
      if (tong > 0) mucDich += ((pha.thuy - pha.son) / tong) * 3;
    }
    mucHien += (mucDich - mucHien) * Math.min(1, dt * 1.5);
    const bao = pha.k === 'lu' ? 1 : 0;
    const kiep = pha.k === 'kiep' ? 1 : 0;
    const yeu = pha.k === 'yeu' ? 1 : 0;
    toiHien += (Math.max(bao, kiep) - toiHien) * Math.min(1, dt * 1.2);

    veTroi(t, toiHien * (1 - kiep * 0.2), kiep * toiHien, yeu);
    veDayXa(toiHien);
    veLongCung(t, toiHien);
    veSong(t, toiHien, false);
    veNui(toiHien);

    // Người chơi: chỉ người đang chơi, cảnh giới cao vẽ sau cho nổi lên trên.
    const ds = dangChoi(the, now)
      .filter((n) => n.phe !== null)
      .sort((a, b) => a.canh - b.canh || a.lk - b.lk)
      .slice(-70);
    const top = new Set(ds.slice(-5).map((n) => n.user));
    const kiepUser = pha.k === 'kiep' ? pha.user : null;
    viTri.clear();
    for (const n of ds) {
      if (n.user === kiepUser) continue;
      const p = choNguoi(n, t);
      const r = 25 + n.canh * 2.6 + (top.has(n.user) ? 6 : 0);
      viTri.set(n.user, { x: p.x, y: p.y, r });
      if (n.phe === 'son') veNguoi(n, p.x, p.y, r, t, anhCua.get(n.user), top.has(n.user) || now - (vuaLam.get(n.user) ?? 0) < 5000);
    }

    if (pha.k === 'yeu') veYeu(pha.yeu, tamYeu.x, tamYeu.y, t, pha.mau / pha.mauMax);
    if (pha.k === 'yeu-ket' && !pha.thang) {
      const k = Math.min(1, (pha.tong - (pha.den - now)) / 1500);
      ctx.globalAlpha = 1 - k;
      veYeu(pha.yeu, tamYeu.x, tamYeu.y + k * 400, t, 0.3);
      ctx.globalAlpha = 1;
    }

    veSong(t, toiHien, true);
    for (const n of ds) {
      if (n.phe !== 'thuy' || n.user === kiepUser) continue;
      const p = viTri.get(n.user);
      if (p !== undefined) veNguoi(n, p.x, p.y, p.r, t, anhCua.get(n.user), top.has(n.user) || now - (vuaLam.get(n.user) ?? 0) < 5000);
    }

    if (pha.k === 'kiep' || pha.k === 'kiep-ket') {
      const n = the.nguoi.get(pha.user);
      if (n !== undefined) {
        const r = 70;
        viTri.set(n.user, { x: tamKiep.x, y: tamKiep.y, r });
        veNguoi(n, tamKiep.x, tamKiep.y, r, t, anhCua.get(n.user), true);
        if (pha.k === 'kiep') {
          // Vòng hộ pháp: mỗi người hô một chấm sáng quây quanh.
          const so = pha.ho.size;
          for (let i = 0; i < so; i++) {
            const a = t * 1.2 + (i * Math.PI * 2) / Math.max(1, so);
            ctx.fillStyle = '#9fe8ff';
            ctx.beginPath();
            ctx.arc(tamKiep.x + Math.cos(a) * 120, tamKiep.y + Math.sin(a) * 120, 7, 0, Math.PI * 2);
            ctx.fill();
          }
          if (so > 0) {
            ctx.strokeStyle = `rgba(159,232,255,${Math.min(0.8, 0.15 + so * 0.08)})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(tamKiep.x, tamKiep.y, 120, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (t > setKe) {
            setKe = t + 0.9 + Math.random() * 1.4;
            const x = tamKiep.x + (Math.random() - 0.5) * 500;
            tia.push(taoTia(x, 0, tamKiep.x + (Math.random() - 0.5) * 160, tamKiep.y - 130));
            loe = 0.35;
          }
        }
      }
    }

    if (choVe.length > 0) {
      const ds = choVe;
      choVe = [];
      for (const c of ds) if (now - c.luc < 1500) su(c.s, the, c.luc);
    }

    veHieuUng(dt);
    veMua(dt, toiHien * (pha.k === 'lu' ? 1 : 0.4));

    if (the.phucLoc > 0 && Math.random() < 0.35) {
      hat.push({
        x: Math.random() * W,
        y: -20,
        vx: 20,
        vy: 90 + Math.random() * 60,
        tuoi: 0,
        song: 14,
        r: 7 + Math.random() * 5,
        mau: Math.random() < 0.5 ? '#ffd24c' : '#ff9bb5',
        kieu: 'canh-hoa',
      });
    }

    if (loe > 0) {
      ctx.fillStyle = `rgba(220,230,255,${loe})`;
      ctx.fillRect(0, 0, W, H);
      loe = Math.max(0, loe - dt * 1.6);
    }
  }

  function goc(user: string): { x: number; y: number; r: number } {
    return viTri.get(user) ?? { x: W / 2, y: 1500, r: 24 };
  }

  function su(s: Su, the: The, now: number) {
    const t = now / 1000;
    if ('user' in s) {
      vuaLam.set(s.user, now);
      if (!viTri.has(s.user) && s.k !== 'qua') {
        choVe.push({ s, luc: now });
        return;
      }
    }
    switch (s.k) {
      case 'dung': {
        const p = goc(s.user);
        hat.push({ x: p.x, y: p.y, vx: 0, vy: 0, tuoi: 0, song: 1.1, r: 9, mau: '#ffe9a0', kieu: 'cham', toi: { x0: p.x, y0: p.y, x: p.x, y: p.y - 260 } });
        chu.push({ x: p.x, y: p.y - p.r - 20, chu: `+${s.lk}`, mau: '#ffe9a0', co: 30, tuoi: 0, song: 1.6 });
        break;
      }
      case 'dot-pha': {
        const p = goc(s.user);
        const mau = CANH_GIOI[s.canh]?.hao ?? '#ffffff';
        vong.push({ x: p.x, y: p.y, mau, tuoi: 0, song: 1.2, r: 160 });
        vong.push({ x: p.x, y: p.y, mau: '#ffffff', tuoi: 0, song: 0.8, r: 90 });
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          hat.push({ x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, tuoi: 0, song: 0.9, r: 6, mau, kieu: 'cham' });
        }
        break;
      }
      case 'trung': {
        const p = goc(s.user);
        const n = the.nguoi.get(s.user);
        const phe: Phe = n?.phe ?? 'son';
        const dich = { x: tamYeu.x + (Math.random() - 0.5) * 160, y: tamYeu.y + (Math.random() - 0.5) * 120 };
        hat.push({ x: p.x, y: p.y, vx: 0, vy: 0, tuoi: 0, song: 0.45, r: 10, mau: PHE[phe].mauSang, kieu: 'cham', toi: { x0: p.x, y0: p.y, ...dich } });
        if (s.truot) chu.push({ x: dich.x, y: dich.y, chu: 'trượt!', mau: '#d6b8ff', co: 30, tuoi: 0, song: 1 });
        else chu.push({ x: dich.x, y: dich.y, chu: s.bao ? `BẠO KÍCH ${s.dmg}` : `−${s.dmg}`, mau: s.bao ? '#ff5a3a' : '#fff2c4', co: s.bao ? 44 : 34, tuoi: 0, song: 1.1 });
        trungLuc = t + 0.4;
        break;
      }
      case 'day': {
        const p = goc(s.user);
        hat.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: -220, tuoi: 0, song: 0.8, r: 7, mau: PHE[s.phe].mauSang, kieu: 'cham' });
        break;
      }
      case 'ho': {
        const p = goc(s.user);
        hat.push({ x: p.x, y: p.y, vx: 0, vy: 0, tuoi: 0, song: 0.9, r: 14, mau: '#9fe8ff', kieu: 'khien', toi: { x0: p.x, y0: p.y, x: tamKiep.x, y: tamKiep.y } });
        break;
      }
      case 'set': {
        const p = goc(s.user);
        for (let i = 0; i < (s.qua ? 3 : 5); i++) tia.push(taoTia(p.x + (Math.random() - 0.5) * 300, 0, p.x, p.y - 40));
        loe = 0.7;
        if (s.qua) vong.push({ x: p.x, y: p.y, mau: '#fff6c8', tuoi: 0, song: 1.5, r: 320 });
        break;
      }
      case 'qua': {
        const p = goc(s.user);
        const so = Math.min(6, s.so);
        for (let i = 0; i < so; i++) {
          hat.push({ x: p.x + (Math.random() - 0.5) * 60, y: p.y - 20, vx: (Math.random() - 0.5) * 14, vy: -70 - Math.random() * 40, tuoi: 0, song: 10, r: Math.random() * 6, mau: '#ffb44a', kieu: 'den' });
        }
        break;
      }
      case 'tim': {
        if (hat.length > 260) break;
        const p = goc(s.user);
        hat.push({ x: p.x, y: p.y - p.r, vx: (Math.random() - 0.5) * 40, vy: -120, tuoi: 0, song: 1.2, r: 12, mau: '#ff5a7a', kieu: 'tim' });
        break;
      }
      case 'nhap': {
        const p = goc(s.user);
        vong.push({ x: p.x, y: p.y, mau: PHE[s.phe].mauSang, tuoi: 0, song: 0.9, r: 80 });
        break;
      }
      case 'pha':
        if (s.pha === 'yeu-ket' && the.pha.k === 'yeu-ket' && the.pha.thang) {
          for (let i = 0; i < 60; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 150 + Math.random() * 400;
            hat.push({ x: tamYeu.x, y: tamYeu.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, tuoi: 0, song: 1.4, r: 8, mau: '#cfc6ff', kieu: 'cham' });
          }
          vong.push({ x: tamYeu.x, y: tamYeu.y, mau: '#ffffff', tuoi: 0, song: 1, r: 400 });
        }
        break;
      default:
        break;
    }
  }

  return { ve, su };
}

