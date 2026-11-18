/** Hình ba yêu tinh vẽ bằng canvas 2D, tâm ở (0,0), cao chừng 500px. Dùng chung cho cảnh 2D
 *  và làm tấm hình động trong cảnh 3D. */

import type { YeuId } from '../loi/the-gioi';

type Ctx = CanvasRenderingContext2D;

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function veHinhYeu(ctx: Ctx, yeu: YeuId, t: number) {
  function mat(x: number, y: number, r: number, mau: string, t: number) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 3);
    g.addColorStop(0, rgba(mau, 0.9));
    g.addColorStop(1, rgba(mau, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mau;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.55 + 0.1 * Math.sin(t * 5)), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#100';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function veNguTinh(t: number) {
    const vay = Math.sin(t * 3) * 0.25;
    // Đuôi.
    ctx.save();
    ctx.translate(170, 0);
    ctx.rotate(vay);
    ctx.fillStyle = '#0d4f57';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(130, -110);
    ctx.quadraticCurveTo(100, 0, 130, 110);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Vây lưng gai.
    ctx.fillStyle = '#0a3a40';
    for (let i = 0; i < 7; i++) {
      const x = -120 + i * 40;
      ctx.beginPath();
      ctx.moveTo(x - 18, -90 + Math.abs(x) * 0.12);
      ctx.lineTo(x + 4, -170 + Math.sin(t * 4 + i) * 10 + Math.abs(x) * 0.25);
      ctx.lineTo(x + 22, -90 + Math.abs(x) * 0.12);
      ctx.fill();
    }
    // Thân.
    const g = ctx.createLinearGradient(0, -110, 0, 110);
    g.addColorStop(0, '#11606b');
    g.addColorStop(0.6, '#0b3c44');
    g.addColorStop(1, '#7fb9a8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 210, 112, 0, 0, Math.PI * 2);
    ctx.fill();
    // Vảy.
    ctx.strokeStyle = 'rgba(160,255,240,.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(-60 + i * 36, -40 + j * 34, 16, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    }
    // Miệng răng cưa.
    ctx.fillStyle = '#1a0606';
    ctx.beginPath();
    ctx.moveTo(-210, 6);
    ctx.lineTo(-120, -10 + Math.sin(t * 6) * 8);
    ctx.lineTo(-120, 34 + Math.sin(t * 6) * 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4efe0';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-200 + i * 22, 6);
      ctx.lineTo(-190 + i * 22, 20);
      ctx.lineTo(-180 + i * 22, 6);
      ctx.fill();
    }
    mat(-120, -42, 20, '#ff4a3a', t);
  }

  function veHoTinh(t: number) {
    // Chín đuôi xoè sau lưng.
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9 + Math.sin(t * 1.6 + i * 0.7) * 0.12;
      const dai = 250 + (i % 2) * 30;
      const x1 = Math.cos(a) * dai;
      const y1 = Math.sin(a) * dai;
      const g = ctx.createLinearGradient(0, 0, x1, y1);
      g.addColorStop(0, '#6d2b8f');
      g.addColorStop(0.7, '#e7c9ff');
      g.addColorStop(1, '#ffffff');
      ctx.strokeStyle = g;
      ctx.lineCap = 'round';
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.quadraticCurveTo(x1 * 0.5 + Math.sin(t * 2 + i) * 40, y1 * 0.5 + 40, x1, y1);
      ctx.stroke();
    }
    // Thân và đầu cáo.
    ctx.fillStyle = '#f1e4ff';
    ctx.beginPath();
    ctx.ellipse(0, 70, 110, 130, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-120, -60);
    ctx.lineTo(-100, -190);
    ctx.lineTo(-30, -100);
    ctx.lineTo(30, -100);
    ctx.lineTo(100, -190);
    ctx.lineTo(120, -60);
    ctx.quadraticCurveTo(110, 30, 0, 90);
    ctx.quadraticCurveTo(-110, 30, -120, -60);
    ctx.fill();
    ctx.fillStyle = '#ff9bd6';
    ctx.beginPath();
    ctx.moveTo(-96, -150);
    ctx.lineTo(-60, -100);
    ctx.lineTo(-100, -90);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(96, -150);
    ctx.lineTo(60, -100);
    ctx.lineTo(100, -90);
    ctx.fill();
    // Hoa văn đỏ giữa trán.
    ctx.fillStyle = '#d9185f';
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(-10, -50);
    ctx.lineTo(0, -30);
    ctx.lineTo(10, -50);
    ctx.fill();
    ctx.fillStyle = '#2a1030';
    ctx.beginPath();
    ctx.ellipse(0, 70, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-52, -20);
    ctx.rotate(0.3);
    mat(0, 0, 18, '#c84bff', t);
    ctx.restore();
    ctx.save();
    ctx.translate(52, -20);
    ctx.rotate(-0.3);
    mat(0, 0, 18, '#c84bff', t);
    ctx.restore();
  }

  function veMocTinh(t: number) {
    // Rễ.
    ctx.strokeStyle = '#3b2716';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.lineWidth = 18 - i;
      ctx.beginPath();
      ctx.moveTo(-40 + i * 16, 180);
      ctx.quadraticCurveTo(-160 + i * 64, 210, -230 + i * 92, 240 + Math.sin(t + i) * 8);
      ctx.stroke();
    }
    // Cành vươn như tay.
    const canh = (x: number, y: number, a: number, dai: number, day: number, sau: number) => {
      if (sau === 0) return;
      const x2 = x + Math.cos(a) * dai;
      const y2 = y + Math.sin(a) * dai;
      ctx.lineWidth = day;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const lac = Math.sin(t * 1.7 + sau) * 0.18;
      canh(x2, y2, a - 0.45 + lac, dai * 0.7, day * 0.65, sau - 1);
      canh(x2, y2, a + 0.4 + lac, dai * 0.68, day * 0.65, sau - 1);
      if (sau === 1) {
        ctx.fillStyle = 'rgba(70,140,60,.75)';
        ctx.beginPath();
        ctx.arc(x2, y2, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    ctx.strokeStyle = '#4a311c';
    canh(-60, -90, -2.4, 120, 26, 4);
    canh(60, -90, -0.75, 120, 26, 4);
    canh(0, -150, -1.57, 90, 22, 4);
    // Thân xoắn.
    const g = ctx.createLinearGradient(-110, 0, 110, 0);
    g.addColorStop(0, '#2b1c10');
    g.addColorStop(0.5, '#5d3d22');
    g.addColorStop(1, '#2b1c10');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-90, 190);
    ctx.bezierCurveTo(-130, 60, -60, -60, -80, -170);
    ctx.lineTo(80, -170);
    ctx.bezierCurveTo(60, -60, 130, 60, 90, 190);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-60 + i * 28, 170);
      ctx.bezierCurveTo(-80 + i * 30, 60, -30 + i * 20, -40, -50 + i * 25, -160);
      ctx.stroke();
    }
    // Miệng hốc cây.
    ctx.fillStyle = '#0c0603';
    ctx.beginPath();
    ctx.moveTo(-50, 40);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-50 + i * 16.6, 40 + (i % 2 ? 22 : 0) + Math.sin(t * 5) * 4);
    ctx.lineTo(50, 90);
    ctx.quadraticCurveTo(0, 120, -50, 90);
    ctx.closePath();
    ctx.fill();
    mat(-40, -40, 16, '#d6ff4a', t);
    mat(40, -40, 16, '#d6ff4a', t);
  }

  if (yeu === 'ngu') veNguTinh(t);
  else if (yeu === 'ho') veHoTinh(t);
  else if (yeu === 'moc') veMocTinh(t);
  else {
    // Tam Yêu Hợp Thể: Mộc Tinh làm thân, chín đuôi cáo xoè sau lưng, Ngư Tinh quấn dưới chân.
    ctx.save();
    ctx.scale(1.05, 1.05);
    veHoTinh(t);
    ctx.restore();
    ctx.save();
    ctx.translate(0, 40);
    ctx.scale(0.75, 0.75);
    veMocTinh(t);
    ctx.restore();
    ctx.save();
    ctx.translate(0, 230);
    ctx.scale(0.6, 0.45);
    veNguTinh(t);
    ctx.restore();
  }
}
