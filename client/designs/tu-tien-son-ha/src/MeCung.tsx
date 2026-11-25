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
/** Khung vẽ cố định 1039,5 × 1313; ô tự co giãn theo số cột, số hàng (Địa Cung 11×13, Ải Nhập Môn 9×11). */
const RONG = 1039.5;
const CAO = 1313;
/** Ải Nhập Môn thấp hơn một chút: dải dưới cùng là hàng người đứng chờ trước lối vào. */
const CAO_NM = 1190;
/** Hàng chờ: hai dãy avatar dưới bản đồ Ải (toạ độ trong khung vẽ). */
const HANG_CHO_Y = [CAO_NM + 62, CAO_NM + 120];
const R_CHO = 26;
let OX = 94.5;
let OY = 101;
const coO = (me: Me) => {
  OX = RONG / me.cot;
  OY = (me.cot === 11 ? CAO : CAO_NM) / me.hang;
};

/** Một cửa trên bản đồ: ô, chữ trên biển, màu, biển nằm mép trên hay mép dưới. */
interface CuaVe {
  o: number;
  chu: string;
  mau: string;
  nen: string;
  tren: boolean;
}

const HINH: Record<string, string> = { vu: '⚔️', ao: '🛡️', bao: '📿', ruong: '🧰', bk: '📜', thach: '💎' };
const MAU_THACH = '#7fd8ff';

interface Bay {
  x: number;
  y: number;
  chu: string;
  mau: string;
  luc: number;
  to: number;
}

function veTuong(me: Me, cua: CuaVe[]): HTMLCanvasElement {
  coO(me);
  const cv = document.createElement('canvas');
  cv.width = me.cot * OX + 40;
  cv.height = me.hang * OY + 40;
  const g = cv.getContext('2d')!;
  g.translate(20, 20);
  // Mỏng để thấy tranh nền riêng của từng mê cung (nen/me-*.webp); tường vàng vẫn nổi.
  g.fillStyle = 'rgba(14, 10, 6, 0.3)';
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
  for (const c of cua) nenO(c.o, c.nen);

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
    g.font = '900 24px "Noto Serif", Georgia, serif';
    const rong = g.measureText(chu).width + 26;
    const x = Math.max(rong / 2 - 14, Math.min(me.cot * OX - rong / 2 + 14, ((o % me.cot) + 0.5) * OX));
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
  for (const c of cua) bien(c.o, c.chu, c.mau, c.tren);
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
    /** Lúc (giây) thấy từng món lần đầu — để làm nổi đồ mới rơi. */
    const thayLuc = new Map<number, number>();
    const veDo = (d: DoRoi, x: number, y: number, t: number) => {
      const ten = d.loai === 'tb' ? d.vat.o : d.loai;
      const pham = d.loai === 'tb' ? d.vat.pham : d.loai === 'thach' ? 0 : 4;
      const mau = d.loai === 'thach' ? MAU_THACH : PHAM[pham]!.mau;
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
      const co = d.loai === 'tb' ? 28 : d.loai === 'thach' ? 24 : 38;
      // Linh thạch vẽ bằng biểu tượng 💎 (chưa có tranh riêng).
      const im = d.loai === 'thach' ? null : layIcon(ten);
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
      if (pha.k !== 'me' && pha.k !== 'nm') {
        vi.clear();
        return;
      }
      const nm = pha.k === 'nm';
      const me = pha.me;
      if (me !== meDang) {
        meDang = me;
        tuong = veTuong(
          me,
          pha.k === 'nm'
            ? [
                { o: pha.vao, chu: 'LỐI VÀO', mau: '#ffd77a', nen: 'rgba(255, 210, 90, 0.4)', tren: false },
                ...(pha.phe === 'son' || pha.phe === null
                  ? [{ o: pha.cua.son, chu: '⛰️ CỬA SƠN TÔNG', mau: '#9fe8b8', nen: 'rgba(111, 207, 143, 0.55)', tren: true }]
                  : []),
                ...(pha.phe === 'thuy' || pha.phe === null
                  ? [{ o: pha.cua.thuy, chu: 'CỬA THỦY TÔNG 🌊', mau: '#9ff3ff', nen: 'rgba(94, 224, 230, 0.55)', tren: true }]
                  : []),
              ]
            : [
                { o: pha.ra, chu: 'CỬA RA', mau: '#ffd77a', nen: 'rgba(255, 210, 90, 0.55)', tren: true },
                ...(pha.phe !== null
                  ? [{ o: pha.vao.son, chu: 'LỐI VÀO', mau: '#ffd77a', nen: 'rgba(255, 210, 90, 0.4)', tren: false }]
                  : [
                      { o: pha.vao.son, chu: 'CỬA NÚI', mau: '#9fe8b8', nen: 'rgba(111, 207, 143, 0.4)', tren: false },
                      { o: pha.vao.thuy, chu: 'CỬA NƯỚC', mau: '#9ff3ff', nen: 'rgba(94, 224, 230, 0.4)', tren: false },
                    ]),
              ],
        );
        vi.clear();
      }
      coO(me);
      g.save();
      g.translate(20, 20);
      if (tuong !== null) g.drawImage(tuong, -20, -20);

      // Cửa đích nhấp nháy: Cửa Ra của Địa Cung, hai cửa tông của Ải Nhập Môn.
      const dich =
        pha.k === 'nm'
          ? pha.phe !== null
            ? [{ o: pha.cua.son, mau: pha.phe === 'son' ? '#9fe8b8' : '#9ff3ff' }]
            : [{ o: pha.cua.son, mau: '#9fe8b8' }, { o: pha.cua.thuy, mau: '#9ff3ff' }]
          : [{ o: pha.ra, mau: '#ffd77a' }];
      for (const d of dich) {
        const q = tam(d.o, me);
        g.strokeStyle = d.mau;
        g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5);
        g.lineWidth = 4;
        g.beginPath();
        g.arc(q.x, q.y, Math.min(OX, OY) * 0.38 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      const pr = tam(dich[0]!.o, me);

      {
        for (const d of pha.do) {
          const p = tam(d.o, me);
          // Đồ mới rơi: 6 giây đầu có vòng sáng nhấp nháy và tên món phía trên — cho cả phòng tranh nhau.
          if (!thayLuc.has(d.id)) thayLuc.set(d.id, t);
          const moi = t - thayLuc.get(d.id)!;
          // Túi linh thạch nhỏ, rơi đều: không vòng sáng, không biển tên — khỏi rối màn.
          if (moi < 6 && d.loai !== 'thach') {
            const mau = d.loai === 'tb' ? PHAM[d.vat.pham]!.mau : '#ffd77a';
            const nhip = 0.5 + 0.5 * Math.sin(t * 9);
            g.strokeStyle = mau;
            g.lineWidth = 4;
            g.globalAlpha = 0.45 + 0.5 * nhip;
            g.beginPath();
            g.arc(p.x, p.y, 26 + nhip * 10, 0, Math.PI * 2);
            g.stroke();
            g.globalAlpha = 0.25 * (1 - (moi % 1));
            g.beginPath();
            g.arc(p.x, p.y, 26 + (moi % 1) * 40, 0, Math.PI * 2);
            g.stroke();
            g.globalAlpha = 1;
            const ten = d.loai === 'tb' ? tenDo(d.vat) : d.loai === 'bk' ? '📜 Bí kíp' : '🧰 Rương';
            g.font = '800 22px system-ui, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'bottom';
            const w = g.measureText(ten).width + 18;
            g.fillStyle = 'rgba(10, 6, 20, 0.82)';
            g.beginPath();
            g.roundRect(p.x - w / 2, p.y - 62, w, 30, 10);
            g.fill();
            g.fillStyle = mau;
            g.fillText(ten, p.x, p.y - 36);
          }
          veDo(d, p.x, p.y, t);
        }
      }
      const daXong = (user: string) => {
        if (pha.k === 'nm') return pha.vt.get(user)?.qua ?? true;
        return pha.vt.get(user)?.thoat ?? true;
      };

      // Người: trượt tới ô mới. Nhiều người chung một ô thì toả nhẹ ra cho khỏi chồng khít.
      const theoO = new Map<number, string[]>();
      for (const [user, v] of pha.vt) {
        if (daXong(user)) continue;
        const ds = theoO.get(v.o) ?? [];
        ds.push(user);
        theoO.set(v.o, ds);
      }
      // Ải Nhập Môn, 30 giây bước vào: ai đã chọn nhân vật thì xếp hàng dưới bản đồ, trước lối vào;
      // hết giờ chờ thì cả hàng trượt vào mê cung.
      const choVao = pha.k === 'nm' && Date.now() < pha.moLuc;
      if (choVao) {
        const ds = [...pha.vt.keys()];
        const moiDay = Math.max(1, Math.ceil(ds.length / 2));
        const motDay = ds.length <= 14;
        const buoc = Math.min(R_CHO * 2.5, (RONG - 60) / Math.max(1, (motDay ? ds.length : moiDay) - 1));
        ds.forEach((user, i) => {
          const day = motDay ? 0 : Math.floor(i / moiDay);
          const j = motDay ? i : i % moiDay;
          const soTrongDay = motDay ? ds.length : day === 0 ? moiDay : ds.length - moiDay;
          const dich = { x: RONG / 2 + (j - (soTrongDay - 1) / 2) * buoc, y: HANG_CHO_Y[motDay ? 1 : day]! - (motDay ? 28 : 0) };
          let p = vi.get(user);
          if (p === undefined) vi.set(user, (p = { x: dich.x, y: dich.y + 60 }));
          const k = Math.min(1, dt * 8);
          p.x += (dich.x - p.x) * k;
          p.y += (dich.y - p.y) * k;
        });
        theoO.clear();
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
        if (daXong(user)) continue;
        const n = the.nguoi.get(user);
        const p = vi.get(user);
        if (n === undefined || p === undefined) continue;
        const r = choVao ? R_CHO : nm ? 34 : 30;
        // Ải Nhập Môn: viền theo tông đã chọn. Địa Cung: viền theo phe.
        const pheVe = 'phe' in v ? v.phe : n.phe;
        const mau = pheVe === null ? '#d8d0c0' : PHE[pheVe].mauSang;
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
        if ('tui' in v && v.tui.length > 0) {
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
        if (s.k === 'bi-kip') {
          const p = tam(s.o, me);
          bay.push({ x: p.x, y: p.y, chu: '📜 bí kíp võ công!', mau: '#ffd24c', luc: t, to: 24 });
        } else if (s.k === 'nhat-thach') {
          const p = tam(s.o, me);
          bay.push({ x: p.x, y: p.y, chu: `+${s.so} 💎`, mau: MAU_THACH, luc: t, to: 24 });
        } else if (s.k === 'nhat' && (s.nguon === 'me' || s.nguon === 'nm')) {
          const p = tam(s.o, me);
          bay.push({ x: p.x, y: p.y, chu: `nhặt ${tenDo(s.vat)}`, mau: PHAM[s.vat.pham]!.mau, luc: t, to: 19 });
        } else if (s.k === 'nm-qua' && pha.k === 'nm') {
          const q = tam(pha.cua[s.phe], me);
          const ten = the.nguoi.get(s.user)?.ten ?? '';
          bay.push({ x: q.x, y: q.y + 60, chu: `${ten} nhập ${PHE[s.phe].tenNgan}!`, mau: PHE[s.phe].mauSang, luc: t, to: 28 });
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

  return <canvas ref={vai} className="sh-me" width={RONG + 40} height={CAO + 40} style={{ left: ME_X - 20, top: ME_Y - 20 }} />;
}
