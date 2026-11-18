/** Màn Địa Cung Đồng Cổ: bản đồ mê cung nhìn từ trên xuống, đối xứng gương hai nửa. Hai cửa vào (Núi
 *  góc trái, Nước góc phải), một Cửa Ra giữa mép trên. Bảo vật nhỏ, lấp lánh theo phẩm — nhân vật mới là chính: ảnh
 *  khách to, viền phe, số đồ đang mang. Mỗi lệnh lên/xuống/trái/phải là một bước; lớp này chỉ vẽ
 *  cho bước đó trượt mượt, không giữ luật chơi nào. */

import { useEffect, useRef } from 'react';
import type { DoRoi, Su, The } from './loi/core';
import { BIT, type MeCung as Me } from './loi/me-cung';
import { CANH_GIOI, PHE } from './loi/the-gioi';
import { PHAM, tenDo } from './loi/trang-bi';

/** Vùng mê cung trong khung 1080×1920: ngay dưới thẻ chữ trên đầu, xuống tới đáy khung. Ô chữ nhật
 *  (cao hơn rộng) để dùng hết chiều dọc của khung. */
export const ME_X = 20;
export const ME_Y = 560;
const OX = 94.5;
const OY = 101;

const HINH: Record<string, string> = { vu: '⚔️', ao: '🛡️', bao: '📿', ruong: '🧰' };

interface Bay {
  x: number;
  y: number;
  chu: string;
  mau: string;
  luc: number;
  to: number;
}

function veTuong(me: Me, vao: { son: number; thuy: number }, ra: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = me.cot * OX + 40;
  cv.height = me.hang * OY + 40;
  const g = cv.getContext('2d')!;
  g.translate(20, 20);
  g.fillStyle = 'rgba(14, 10, 6, 0.6)';
  g.beginPath();
  g.roundRect(-14, -14, me.cot * OX + 28, me.hang * OY + 28, 26);
  g.fill();
  g.strokeStyle = 'rgba(214, 170, 96, 0.07)';
  g.lineWidth = 2;
  for (let c = 1; c < me.cot; c++) {
    g.beginPath();
    g.moveTo(c * OX, 0);
    g.lineTo(c * OX, me.hang * OY);
    g.stroke();
  }
  for (let h = 1; h < me.hang; h++) {
    g.beginPath();
    g.moveTo(0, h * OY);
    g.lineTo(me.cot * OX, h * OY);
    g.stroke();
  }
  // Nền ba cửa: Cửa Ra vàng, cửa vào theo màu phe.
  const nenO = (o: number, mau: string) => {
    const x = (o % me.cot) * OX;
    const y = Math.floor(o / me.cot) * OY;
    const q = g.createRadialGradient(x + OX / 2, y + OY / 2, 4, x + OX / 2, y + OY / 2, OX * 0.75);
    q.addColorStop(0, mau);
    q.addColorStop(1, 'transparent');
    g.fillStyle = q;
    g.fillRect(x - OX * 0.25, y - OY * 0.25, OX * 1.5, OY * 1.5);
  };
  nenO(ra, 'rgba(255, 210, 90, 0.55)');
  nenO(vao.son, 'rgba(111, 207, 143, 0.4)');
  nenO(vao.thuy, 'rgba(94, 224, 230, 0.4)');

  const doan: [number, number, number, number][] = [];
  for (let o = 0; o < me.tuong.length; o++) {
    const c = o % me.cot;
    const h = Math.floor(o / me.cot);
    const x = c * OX;
    const y = h * OY;
    const t = me.tuong[o]!;
    if (t & BIT.len) doan.push([x, y, x + OX, y]);
    if (t & BIT.trai) doan.push([x, y, x, y + OY]);
    if (h === me.hang - 1 && t & BIT.xuong) doan.push([x, y + OY, x + OX, y + OY]);
    if (c === me.cot - 1 && t & BIT.phai) doan.push([x + OX, y, x + OX, y + OY]);
  }
  const net = (w: number, mau: string, dy = 0) => {
    g.strokeStyle = mau;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.beginPath();
    for (const [a, b, c, d] of doan) {
      g.moveTo(a, b + dy);
      g.lineTo(c, d + dy);
    }
    g.stroke();
  };
  // Tường đá ong viền đồng: bóng đổ, thân đá, gờ đồng sáng phía trên.
  net(20, 'rgba(0, 0, 0, 0.55)', 6);
  net(16, '#5a4630');
  net(10, '#8a6a42');
  net(3, '#f0c97a', -3);
  // Vòng mặt trời trống đồng ở sảnh lõi (chỗ Rương Đồng).
  const gx = (Math.floor(me.cot / 2) + 0.5) * OX;
  const gy = (Math.floor(me.hang / 2) + 0.5) * OY;
  g.strokeStyle = 'rgba(255, 210, 120, 0.3)';
  g.lineWidth = 3;
  for (const r of [OX * 1.25, OX * 0.9]) {
    g.beginPath();
    g.arc(gx, gy, r, 0, Math.PI * 2);
    g.stroke();
  }
  // Biển tên ba cửa.
  const bien = (o: number, chu: string, mau: string, tren: boolean) => {
    const x = ((o % me.cot) + 0.5) * OX;
    const y = tren ? -2 : me.hang * OY + 2;
    g.font = '900 24px "Noto Serif", Georgia, serif';
    const w = g.measureText(chu).width + 26;
    g.fillStyle = 'rgba(30, 16, 4, 0.92)';
    g.strokeStyle = mau;
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(x - w / 2, y - 17, w, 34, 8);
    g.fill();
    g.stroke();
    g.fillStyle = mau;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(chu, x, y + 1);
  };
  bien(ra, 'CỬA RA', '#ffd77a', true);
  bien(vao.son, 'CỬA NÚI', '#9fe8b8', false);
  bien(vao.thuy, 'CỬA NƯỚC', '#9ff3ff', false);
  return cv;
}

export function MeCung({
  the,
  anh,
  asset,
  hang,
}: {
  the: The;
  anh: ReadonlyMap<string, string>;
  asset: (p: string) => string;
  /** Việc lõi vừa báo (nhặt đồ, thoát ra) — lớp này lấy ra để hiện chữ bay. */
  hang: { current: Su[] };
}) {
  const vai = useRef<HTMLCanvasElement>(null);
  const ref = useRef({ the, anh, asset });
  ref.current = { the, anh, asset };

  useEffect(() => {
    const cv = vai.current;
    if (cv === null) return;
    const g = cv.getContext('2d')!;
    let raf = 0;
    let truoc = 0;
    let meDang: Me | null = null;
    let tuong: HTMLCanvasElement | null = null;
    const vi = new Map<string, { x: number; y: number }>();
    const anhNap = new Map<string, HTMLImageElement>();
    const icon = new Map<string, HTMLImageElement | null>();
    const bay: Bay[] = [];
    const tam = (o: number, me: Me) => ({ x: ((o % me.cot) + 0.5) * OX, y: (Math.floor(o / me.cot) + 0.5) * OY });

    const layAnh = (url: string) => {
      let im = anhNap.get(url);
      if (im === undefined) {
        im = new Image();
        im.referrerPolicy = 'no-referrer';
        im.src = url;
        anhNap.set(url, im);
      }
      return im.complete && im.naturalWidth > 0 ? im : null;
    };
    const layIcon = (ten: string) => {
      if (!icon.has(ten)) {
        icon.set(ten, null);
        const im = new Image();
        im.onload = () => icon.set(ten, im);
        im.src = ref.current.asset(`do/${ten}.webp`);
      }
      return icon.get(ten) ?? null;
    };

    // Bảo vật vẽ nhỏ: chỉ đủ thấy và biết phẩm qua màu quầng — người chơi mới là nhân vật chính.
    const veDo = (d: DoRoi, x: number, y: number, t: number) => {
      const ten = d.loai === 'tb' ? d.vat.o : 'ruong';
      const pham = d.loai === 'tb' ? d.vat.pham : 4;
      const mau = PHAM[pham]!.mau;
      const nhun = Math.sin(t * 3 + d.id) * 3;
      const r = 16 + pham * 2;
      const q = g.createRadialGradient(x, y, 1, x, y, r);
      q.addColorStop(0, mau);
      q.addColorStop(1, 'transparent');
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4 + d.id);
      g.fillStyle = q;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      const co = d.loai === 'ruong' ? 40 : 28;
      const im = layIcon(ten);
      if (im !== null) {
        g.drawImage(im, x - co / 2, y - co / 2 + nhun, co, co);
      } else {
        g.font = `${co * 0.8}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(HINH[ten] ?? '✦', x, y + nhun);
      }
    };

    const ve = (ms: number) => {
      raf = requestAnimationFrame(ve);
      const dt = truoc === 0 ? 0.016 : Math.min(0.1, (ms - truoc) / 1000);
      truoc = ms;
      const t = ms / 1000;
      const { the, anh } = ref.current;
      const pha = the.pha;
      g.clearRect(0, 0, cv.width, cv.height);
      if (pha.k !== 'me') {
        vi.clear();
        return;
      }
      const me = pha.me;
      if (me !== meDang) {
        meDang = me;
        tuong = veTuong(me, pha.vao, pha.ra);
        vi.clear();
      }
      g.save();
      g.translate(20, 20);
      if (tuong !== null) g.drawImage(tuong, -20, -20);

      // Cửa Ra nhấp nháy.
      const pr = tam(pha.ra, me);
      g.strokeStyle = '#ffd77a';
      g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5);
      g.lineWidth = 4;
      g.beginPath();
      g.arc(pr.x, pr.y, OX * 0.38 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;

      for (const d of pha.do) {
        const p = tam(d.o, me);
        veDo(d, p.x, p.y, t);
      }

      // Người: trượt tới ô mới. Nhiều người chung một ô thì toả nhẹ ra cho khỏi chồng khít.
      const theoO = new Map<number, string[]>();
      for (const [user, v] of pha.vt) {
        if (v.thoat) continue;
        const ds = theoO.get(v.o) ?? [];
        ds.push(user);
        theoO.set(v.o, ds);
      }
      for (const [o, ds] of theoO) {
        const goc = tam(o, me);
        ds.forEach((user, i) => {
          const lech = ds.length > 1 ? 18 : 0;
          const a = (i / ds.length) * Math.PI * 2;
          const dich = { x: goc.x + Math.cos(a) * lech, y: goc.y + Math.sin(a) * lech };
          let p = vi.get(user);
          if (p === undefined) vi.set(user, (p = { ...dich }));
          const k = Math.min(1, dt * 12);
          p.x += (dich.x - p.x) * k;
          p.y += (dich.y - p.y) * k;
        });
      }
      for (const [user, v] of pha.vt) {
        if (v.thoat) continue;
        const n = the.nguoi.get(user);
        const p = vi.get(user);
        if (n === undefined || p === undefined) continue;
        const r = 30;
        // Phàm nhân (chưa có phe): viền xám — nhặt được bảo vật là đổi màu phe ngay.
        const mau = n.phe === null ? '#d8d0c0' : PHE[n.phe].mauSang;
        g.shadowColor = CANH_GIOI[n.canh]!.hao;
        g.shadowBlur = 16;
        g.fillStyle = '#1a1208';
        g.beginPath();
        g.arc(p.x, p.y, r, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;
        const url = anh.get(user);
        const im = url ? layAnh(url) : null;
        g.save();
        g.beginPath();
        g.arc(p.x, p.y, r - 3, 0, Math.PI * 2);
        g.clip();
        if (im !== null) {
          g.drawImage(im, p.x - r, p.y - r, r * 2, r * 2);
        } else {
          g.fillStyle = n.phe === null ? '#5a5248' : n.phe === 'son' ? '#2f6b45' : '#1f4f86';
          g.fillRect(p.x - r, p.y - r, r * 2, r * 2);
          g.fillStyle = '#fff';
          g.font = 'bold 28px "Be Vietnam Pro", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText((n.ten.trim()[0] ?? '?').toUpperCase(), p.x, p.y + 1);
        }
        g.restore();
        g.strokeStyle = mau;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(p.x, p.y, r - 1, 0, Math.PI * 2);
        g.stroke();
        // Số đồ đang mang: huy hiệu vàng góc trên phải.
        if (v.tui.length > 0) {
          const bx = p.x + r * 0.75;
          const by = p.y - r * 0.75;
          g.fillStyle = '#ffd24c';
          g.beginPath();
          g.arc(bx, by, 13, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#3a1a02';
          g.font = '900 17px "Be Vietnam Pro", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(v.tui.length), bx, by + 1);
        }
      }

      // Chữ bay: nhặt đồ (nhỏ, màu phẩm) và thoát ra (to, lực chiến tăng).
      for (const s of hang.current.splice(0)) {
        if (s.k === 'nhat' && s.nguon === 'me') {
          const p = tam(s.o, me);
          bay.push({ x: p.x, y: p.y, chu: `nhặt ${tenDo(s.vat)}`, mau: PHAM[s.vat.pham]!.mau, luc: t, to: 19 });
        } else if (s.k === 'thoat') {
          const ten = the.nguoi.get(s.user)?.ten ?? '';
          const tang = s.lucSau - s.lucTruoc;
          bay.push({ x: pr.x, y: pr.y + 40, chu: tang > 0 ? `${ten} +${tang} lực chiến` : `${ten} thoát!`, mau: '#ffe08a', luc: t, to: 28 });
        }
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = bay.length - 1; i >= 0; i--) {
        const b = bay[i]!;
        const k = (t - b.luc) / 1.8;
        if (k >= 1) {
          bay.splice(i, 1);
          continue;
        }
        g.globalAlpha = 1 - k * k;
        g.font = `800 ${b.to}px "Be Vietnam Pro", sans-serif`;
        g.lineWidth = 6;
        g.strokeStyle = 'rgba(20, 10, 2, 0.9)';
        g.strokeText(b.chu, b.x, b.y - 34 - k * 50);
        g.fillStyle = b.mau;
        g.fillText(b.chu, b.x, b.y - 34 - k * 50);
      }
      g.globalAlpha = 1;
      g.restore();
    };
    raf = requestAnimationFrame(ve);
    return () => cancelAnimationFrame(raf);
  }, [hang]);

  return <canvas ref={vai} className="sh-me" width={11 * OX + 40} height={13 * OY + 40} style={{ left: ME_X - 20, top: ME_Y - 20 }} />;
}
