/** Hiệu ứng phát sáng của cảnh 3D: hạt linh khí, kiếm khí, cột sáng đột phá, vòng sóng, sét,
 *  đèn trời, chữ bay. Tất cả cộng sáng (additive) để bloom bắt được. */

import * as THREE from 'three';
import { texChu, texDenTroi } from './tien-ich';

const TOI_DA = 7000;

/** Hệ hạt dùng chung: mảng phẳng cập nhật trên CPU, vẽ một lần bằng Points. */
export class HeHat {
  readonly points: THREE.Points;
  private n = 0;
  private readonly pos = new Float32Array(TOI_DA * 3);
  private readonly van = new Float32Array(TOI_DA * 3);
  private readonly mau = new Float32Array(TOI_DA * 3);
  private readonly co = new Float32Array(TOI_DA);
  private readonly an = new Float32Array(TOI_DA);
  private readonly tuoi = new Float32Array(TOI_DA);
  private readonly song = new Float32Array(TOI_DA);
  private readonly roi = new Float32Array(TOI_DA);
  private readonly c = new THREE.Color();

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aMau', new THREE.BufferAttribute(this.mau, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCo', new THREE.BufferAttribute(this.co, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAn', new THREE.BufferAttribute(this.an, 1).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 aMau; attribute float aCo; attribute float aAn;
          varying vec3 vMau; varying float vAn;
          void main(){
            vMau = aMau; vAn = aAn;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aCo * 900.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vMau; varying float vAn;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            float loi = smoothstep(0.18, 0.0, d);
            gl_FragColor = vec4(vMau * (1.0 + loi * 2.0), a * vAn);
          }`,
      }),
    );
    this.points.frustumCulled = false;
  }

  phat(x: number, y: number, z: number, vx: number, vy: number, vz: number, mau: string | THREE.Color, co: number, song: number, roi = 0) {
    if (this.n >= TOI_DA) return;
    const i = this.n++;
    this.pos.set([x, y, z], i * 3);
    this.van.set([vx, vy, vz], i * 3);
    if (typeof mau === 'string') this.c.set(mau);
    else this.c.copy(mau);
    this.mau.set([this.c.r, this.c.g, this.c.b], i * 3);
    this.co[i] = co;
    this.tuoi[i] = 0;
    this.song[i] = song;
    this.roi[i] = roi;
  }

  /** Nổ tung một chùm hạt. */
  no(p: THREE.Vector3, mau: string, so: number, toc: number, co: number, song: number, roi = 0) {
    for (let i = 0; i < so; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const v = toc * (0.4 + Math.random() * 0.6);
      this.phat(p.x, p.y, p.z, Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v, mau, co * (0.6 + Math.random() * 0.8), song * (0.6 + Math.random() * 0.6), roi);
    }
  }

  get dang(): number {
    return this.n;
  }

  chay(dt: number) {
    let i = 0;
    while (i < this.n) {
      this.tuoi[i]! += dt;
      if (this.tuoi[i]! >= this.song[i]!) {
        // Đổi chỗ với hạt cuối: không phải dời cả mảng.
        const j = --this.n;
        if (i !== j) {
          for (const a of [this.pos, this.van, this.mau]) a.copyWithin(i * 3, j * 3, j * 3 + 3);
          for (const a of [this.co, this.tuoi, this.song, this.roi]) a[i] = a[j]!;
        }
        continue;
      }
      const k = i * 3;
      this.van[k + 1]! -= this.roi[i]! * dt;
      this.pos[k]! += this.van[k]! * dt;
      this.pos[k + 1]! += this.van[k + 1]! * dt;
      this.pos[k + 2]! += this.van[k + 2]! * dt;
      const t = this.tuoi[i]! / this.song[i]!;
      this.an[i] = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      i++;
    }
    const g = this.points.geometry;
    for (const ten of ['position', 'aMau', 'aCo', 'aAn']) g.attributes[ten]!.needsUpdate = true;
    g.setDrawRange(0, this.n);
  }
}

interface Bay {
  dau: THREE.Vector3;
  cuoi: THREE.Vector3;
  giua: THREE.Vector3;
  t: number;
  dai: number;
  mau: string;
  co: number;
  xong?: () => void;
}

interface CotSang {
  m: THREE.Mesh;
  u: { uMau: { value: THREE.Color }; uT: { value: number }; uAn: { value: number } };
  tuoi: number;
  song: number;
}

interface VongSong {
  m: THREE.Mesh;
  tuoi: number;
  song: number;
  to: number;
}

interface Tia {
  l: THREE.LineSegments;
  tuoi: number;
  song: number;
}

interface Bong {
  s: THREE.Sprite;
  v: THREE.Vector3;
  tuoi: number;
  song: number;
  lac: number;
  coGoc: THREE.Vector2;
}

export function taoHieuUng(canh: THREE.Scene, hat: HeHat, cam: THREE.Camera) {
  const bay: Bay[] = [];
  const cot: CotSang[] = [];
  const vong: VongSong[] = [];
  const tia: Tia[] = [];
  const bong: Bong[] = [];
  const texDen = texDenTroi();

  const geoCot = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
  geoCot.translate(0, 0.5, 0);
  // Vòng nằm trong mặt phẳng màn hình: cảnh là tranh 2D, vòng dẹt dưới đất trông lệch chỗ.
  const geoVong = new THREE.RingGeometry(0.85, 1, 96);

  /** Kiếm khí / linh khí bay theo đường cong, kéo đuôi sáng. */
  function phong(dau: THREE.Vector3, cuoi: THREE.Vector3, mau: string, dai = 0.5, co = 1.4, xong?: () => void) {
    const giua = dau.clone().lerp(cuoi, 0.5);
    giua.y += dau.distanceTo(cuoi) * 0.3;
    const b: Bay = { dau: dau.clone(), cuoi: cuoi.clone(), giua, t: 0, dai, mau, co };
    if (xong !== undefined) b.xong = xong;
    bay.push(b);
  }

  /** Cột sáng đột phá: ống trụ sáng dựng từ chân người lên trời. */
  function cotSang(p: THREE.Vector3, mau: string, to = 1) {
    const u = { uMau: { value: new THREE.Color(mau) }, uT: { value: 0 }, uAn: { value: 1 } };
    const m = new THREE.Mesh(
      geoCot,
      new THREE.ShaderMaterial({
        uniforms: u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uMau; uniform float uT, uAn; varying vec2 vUv;
          void main(){
            float soc = 0.6 + 0.4 * sin(vUv.y * 40.0 - uT * 18.0);
            float vien = pow(abs(sin(vUv.x * 3.14159)), 0.5);
            // Mờ dần cả hai đầu và lõi mảnh: cột sáng chứ không phải mảng chữ nhật trắng.
            float a = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.12, vUv.y) * soc * pow(vien, 3.0) * uAn * 0.55;
            gl_FragColor = vec4(uMau * 1.1, a);
          }`,
      }),
    );
    m.position.copy(p);
    m.scale.set(1.1 * to, 42 * to, 1.1 * to);
    canh.add(m);
    cot.push({ m, u, tuoi: 0, song: 2.4 });
  }

  function vongSong(p: THREE.Vector3, mau: string, to = 14) {
    const m = new THREE.Mesh(
      geoVong,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(mau).multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    m.position.copy(p);
    m.quaternion.copy(cam.quaternion);
    canh.add(m);
    vong.push({ m, tuoi: 0, song: 1.1, to });
  }

  /** Sét: đường gấp khúc từ trời xuống, có nhánh. */
  function set(tu: THREE.Vector3, den: THREE.Vector3) {
    const diem: number[] = [];
    const doan = 18;
    let truoc = tu.clone();
    const them = (a: THREE.Vector3, b: THREE.Vector3) => diem.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (let i = 1; i <= doan; i++) {
      const k = i / doan;
      const p = tu.clone().lerp(den, k);
      if (i < doan) p.add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6));
      them(truoc, p);
      if (i > 3 && i < doan - 2 && Math.random() < 0.22) {
        let q = p.clone();
        for (let j = 0; j < 4; j++) {
          const r = q.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, -3 - Math.random() * 3, (Math.random() - 0.5) * 8));
          them(q, r);
          q = r;
        }
      }
      truoc = p;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(diem, 3));
    const l = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#d8e2ff').multiplyScalar(4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    canh.add(l);
    tia.push({ l, tuoi: 0, song: 0.35 });
    for (let i = 0; i < 18; i++) hat.phat(den.x, den.y, den.z, (Math.random() - 0.5) * 18, Math.random() * 12, (Math.random() - 0.5) * 18, '#b9c8ff', 0.5, 0.6, 20);
  }

  function chuBay(p: THREE.Vector3, chu: string, mau: string, to = 1) {
    if (bong.length > 60) return;
    const { tex } = texChu(chu, mau);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }));
    s.position.copy(p);
    s.renderOrder = 20;
    const co = new THREE.Vector2(8 * to, 2 * to);
    s.scale.set(co.x, co.y, 1);
    canh.add(s);
    bong.push({ s, v: new THREE.Vector3(0, 5, 0), tuoi: 0, song: 1.3, lac: 0, coGoc: co });
  }

  function denTroi(p: THREE.Vector3) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDen, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(p);
    s.scale.set(2.2, 3.3, 1);
    canh.add(s);
    bong.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 0.8, 2.6 + Math.random(), (Math.random() - 0.5) * 0.8), tuoi: 0, song: 14, lac: Math.random() * 6, coGoc: new THREE.Vector2(2.2, 3.3) });
  }

  const tam = new THREE.Vector3();
  function chay(dt: number, t: number) {
    for (let i = bay.length - 1; i >= 0; i--) {
      const b = bay[i]!;
      b.t += dt / b.dai;
      const k = Math.min(1, b.t);
      const u = 1 - k;
      tam.set(0, 0, 0).addScaledVector(b.dau, u * u).addScaledVector(b.giua, 2 * u * k).addScaledVector(b.cuoi, k * k);
      hat.phat(tam.x, tam.y, tam.z, 0, 0, 0, b.mau, b.co, 0.18);
      for (let j = 0; j < 3; j++) {
        hat.phat(tam.x, tam.y, tam.z, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, b.mau, b.co * 0.45, 0.4);
      }
      if (k >= 1) {
        bay.splice(i, 1);
        b.xong?.();
      }
    }
    for (let i = cot.length - 1; i >= 0; i--) {
      const c = cot[i]!;
      c.tuoi += dt;
      const k = c.tuoi / c.song;
      c.u.uT.value = t;
      c.u.uAn.value = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      if (k >= 1) {
        canh.remove(c.m);
        (c.m.material as THREE.Material).dispose();
        cot.splice(i, 1);
      }
    }
    for (let i = vong.length - 1; i >= 0; i--) {
      const v = vong[i]!;
      v.tuoi += dt;
      const k = v.tuoi / v.song;
      v.m.scale.setScalar(1 + k * v.to);
      (v.m.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      if (k >= 1) {
        canh.remove(v.m);
        (v.m.material as THREE.Material).dispose();
        vong.splice(i, 1);
      }
    }
    for (let i = tia.length - 1; i >= 0; i--) {
      const s = tia[i]!;
      s.tuoi += dt;
      (s.l.material as THREE.LineBasicMaterial).opacity = Math.random() < 0.3 ? 0.3 : 1 - s.tuoi / s.song;
      if (s.tuoi >= s.song) {
        canh.remove(s.l);
        s.l.geometry.dispose();
        (s.l.material as THREE.Material).dispose();
        tia.splice(i, 1);
      }
    }
    for (let i = bong.length - 1; i >= 0; i--) {
      const b = bong[i]!;
      b.tuoi += dt;
      b.s.position.addScaledVector(b.v, dt);
      if (b.lac > 0) b.s.position.x += Math.sin(t * 0.8 + b.lac) * dt * 0.6;
      const k = b.tuoi / b.song;
      b.s.material.opacity = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
      if (b.lac === 0) b.s.scale.set(b.coGoc.x * (1 + 0.3 * Math.min(1, k * 5)), b.coGoc.y * (1 + 0.3 * Math.min(1, k * 5)), 1);
      if (k >= 1) {
        canh.remove(b.s);
        if (b.s.material.map !== texDen) b.s.material.map?.dispose();
        b.s.material.dispose();
        bong.splice(i, 1);
      }
    }
  }

  return { phong, cotSang, vongSong, set, chuBay, denTroi, chay };
}

export type HieuUng = ReturnType<typeof taoHieuUng>;
