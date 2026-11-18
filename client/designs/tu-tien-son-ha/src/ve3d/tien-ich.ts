/** Kết cấu vẽ bằng canvas cho cảnh 3D: quầng sáng, mây, đèn trời, chữ bay. Không tải file nào. */

import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function texture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Quầng sáng tròn mềm — hào quang, trăng, tia linh khí. Màu trắng, tô màu bằng `material.color`. */
export function texQuang(): THREE.CanvasTexture {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return texture(c);
}

/** Cụm mây bông — vài vòng tròn mờ chồng lên nhau. */
export function texMay(hat: number): THREE.CanvasTexture {
  const [c, x] = canvas(256, 160);
  let s = hat * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 14; i++) {
    const cx = 50 + r() * 156;
    const cy = 70 + (r() - 0.5) * 50;
    const rr = 26 + r() * 40;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 160);
  }
  return texture(c);
}

/** Đèn trời: thân giấy cam, lõi lửa sáng. */
export function texDenTroi(): THREE.CanvasTexture {
  const [c, x] = canvas(64, 96);
  const g = x.createRadialGradient(32, 50, 2, 32, 50, 46);
  g.addColorStop(0, 'rgba(255,200,110,.9)');
  g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 96);
  x.fillStyle = '#ffb44a';
  x.beginPath();
  x.roundRect(18, 26, 28, 40, 8);
  x.fill();
  x.fillStyle = '#fff3c8';
  x.fillRect(27, 52, 10, 9);
  return texture(c);
}

/** Một dòng chữ có viền — số sát thương, "+16", "trượt!". */
export function texChu(chu: string, mau: string, co = 64): { tex: THREE.CanvasTexture; ti: number } {
  const [c, x] = canvas(512, 128);
  x.font = `800 ${co}px "Be Vietnam Pro", system-ui, sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = co / 7;
  x.strokeStyle = 'rgba(10,6,20,.9)';
  x.strokeText(chu, 256, 64);
  x.fillStyle = mau;
  x.fillText(chu, 256, 64);
  return { tex: texture(c), ti: 4 };
}

/** Mặt trống đồng: mặt trời nhiều cánh, vòng hoa văn, chim Lạc bay vòng — đàn tế trên đỉnh Tản. */
export function texTrongDong(): THREE.CanvasTexture {
  const [c, x] = canvas(512, 512);
  x.translate(256, 256);
  x.fillStyle = '#000';
  x.fillRect(-256, -256, 512, 512);
  const vang = 'rgba(255,214,120,1)';
  x.strokeStyle = vang;
  x.fillStyle = vang;
  // Mặt trời 14 cánh ở giữa.
  x.beginPath();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 === 0 ? 70 : 26;
    x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  x.closePath();
  x.fill();
  // Các vòng đồng tâm với hoa văn răng cưa và vòng tròn tiếp tuyến.
  for (const [r, kieu] of [
    [92, 'rang'],
    [118, 'vong'],
    [150, 'rang'],
    [214, 'vong'],
    [240, 'rang'],
  ] as const) {
    x.lineWidth = 3;
    x.beginPath();
    x.arc(0, 0, r, 0, Math.PI * 2);
    x.stroke();
    if (kieu === 'rang') {
      for (let i = 0; i < r / 4; i++) {
        const a = (i / (r / 4)) * Math.PI * 2;
        x.beginPath();
        x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        x.lineTo(Math.cos(a + 0.03) * (r - 9), Math.sin(a + 0.03) * (r - 9));
        x.stroke();
      }
    } else {
      for (let i = 0; i < r / 9; i++) {
        const a = (i / (r / 9)) * Math.PI * 2;
        x.beginPath();
        x.arc(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12), 6, 0, Math.PI * 2);
        x.stroke();
      }
    }
  }
  // Chim Lạc bay vòng giữa hai vòng hoa văn.
  for (let i = 0; i < 6; i++) {
    x.save();
    x.rotate((i / 6) * Math.PI * 2);
    x.translate(0, -182);
    x.rotate(Math.PI / 2);
    x.beginPath();
    x.moveTo(-26, 0);
    x.quadraticCurveTo(-4, -16, 22, -4);
    x.lineTo(34, -10);
    x.lineTo(24, 2);
    x.quadraticCurveTo(0, 10, -26, 0);
    x.fill();
    x.beginPath();
    x.moveTo(-6, -4);
    x.lineTo(-16, -22);
    x.lineTo(6, -8);
    x.fill();
    x.restore();
  }
  return texture(c);
}

/** Đoạn GLSL nhiễu dùng chung cho mây xoáy và nước. */
export const GLSL_NHIEU = /* glsl */ `
float bam2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nhieu(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(bam2(i), bam2(i + vec2(1,0)), u.x), mix(bam2(i + vec2(0,1)), bam2(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * nhieu(p); p *= 2.03; a *= 0.5; }
  return v;
}
`;
