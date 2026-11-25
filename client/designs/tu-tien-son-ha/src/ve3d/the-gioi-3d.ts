/** Thế giới Sơn Hà dựng bằng three.js: trời, sao, trăng, biển mây, núi Ba Vì ba đỉnh, rừng, hoa đào,
 *  đảo đá trôi, nhà sàn mái thuyền (Long Cung, Sơn Tông), đàn tế mặt trống đồng, mặt nước, mây xoáy
 *  lôi kiếp, đạo cụ ba bãi yêu tinh. Phong cách theo Kinh Thư §5: Đông Sơn tiên hiệp. */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLSL_NHIEU, texMay, texQuang, texTrongDong } from './tien-ich';

// ---------- Địa hình ----------

const DINH = [
  { x: -30, z: -26, h: 44, r: 34 },
  { x: -54, z: -16, h: 31, r: 25 },
  { x: -8, z: -18, h: 34, r: 26 },
];

/** Độ cao gốc của núi tại (x, z), chưa nhân hệ số thế trận. Đáy núi chìm dưới mặt nước. */
export function caoNui(x: number, z: number): number {
  let h = 0;
  for (const p of DINH) {
    const d = Math.hypot(x - p.x, z - p.z) / p.r;
    if (d < 1) h = Math.max(h, p.h * Math.pow(Math.cos((d * Math.PI) / 2), 1.5));
  }
  const d0 = Math.hypot((x + 30) / 64, (z + 20) / 44);
  if (d0 < 1) h = Math.max(h, 11 * Math.pow(Math.cos((d0 * Math.PI) / 2), 1.1));
  h += (Math.sin(x * 0.35) * Math.cos(z * 0.29) * 1.6 + Math.sin(x * 0.9 + z * 0.7) * 0.6) * Math.min(1, h / 6);
  return h - 2.5;
}

export const DINH_CHINH = DINH[0]!;

export const LONG_CUNG = new THREE.Vector3(24, 0, -16);
export const SON_MON = new THREE.Vector3(-50, 0, 2);

function bamSo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- Trời ----------

export function taoTroi() {
  const u = {
    uTren: { value: new THREE.Color('#0e0a2e') },
    uGiua: { value: new THREE.Color('#3b2a6e') },
    uChan: { value: new THREE.Color('#f19a6b') },
  };
  const troi = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: u,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vHuong;
        void main(){ vHuong = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTren, uGiua, uChan;
        varying vec3 vHuong;
        void main(){
          float h = vHuong.y;
          vec3 c = mix(uChan, uGiua, smoothstep(0.0, 0.22, h));
          c = mix(c, uTren, smoothstep(0.22, 0.75, h));
          if (h < 0.0) c = uChan * 0.55;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  troi.renderOrder = -10;

  // Sao: nhấp nháy bằng shader, tắt dần khi trời bão.
  const n = 1400;
  const pos = new Float32Array(n * 3);
  const pha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = bamSo(i) * Math.PI * 2;
    const y = 0.12 + bamSo(i + 9999) * 0.88;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 800, y * 800, Math.sin(a) * r * 800], i * 3);
    pha[i] = bamSo(i + 5555) * 6.28;
  }
  const gSao = new THREE.BufferGeometry();
  gSao.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gSao.setAttribute('aPha', new THREE.BufferAttribute(pha, 1));
  const uSao = { uT: { value: 0 }, uSang: { value: 1 } };
  const sao = new THREE.Points(
    gSao,
    new THREE.ShaderMaterial({
      uniforms: uSao,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aPha; uniform float uT; varying float vA;
        void main(){
          vA = 0.45 + 0.55 * sin(uT * 1.7 + aPha);
          gl_PointSize = 1.5 + 2.0 * fract(aPha * 3.1);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uSang; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.95, 0.85), smoothstep(0.5, 0.0, d) * vA * uSang); }`,
    }),
  );

  const quang = texQuang();
  const trang = new THREE.Group();
  const vang = new THREE.Sprite(new THREE.SpriteMaterial({ map: quang, color: '#ffe2b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  vang.scale.setScalar(420);
  const loi = new THREE.Sprite(new THREE.SpriteMaterial({ map: quang, color: '#fff6e6', transparent: true, depthWrite: false, fog: false }));
  loi.scale.setScalar(120);
  trang.add(vang, loi);
  trang.position.set(260, 190, -640);

  return { troi, u, sao, uSao, trang, vang, loi };
}

// ---------- Núi ----------

export function taoNui() {
  const g = new THREE.PlaneGeometry(150, 100, 190, 128);
  g.rotateX(-Math.PI / 2);
  g.translate(-30, 0, -18);
  const p = g.attributes['position']!;
  const mau = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const thap = new THREE.Color('#173d30');
  const giua = new THREE.Color('#3d8a58');
  const cao = new THREE.Color('#9fdcaa');
  const dinh = new THREE.Color('#e6f6d8');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const h = caoNui(x, z);
    p.setY(i, h);
    const k = Math.max(0, h) / 44;
    if (k < 0.35) c.lerpColors(thap, giua, k / 0.35);
    else if (k < 0.8) c.lerpColors(giua, cao, (k - 0.35) / 0.45);
    else c.lerpColors(cao, dinh, (k - 0.8) / 0.2);
    // Vệt sáng tối ngẫu nhiên cho mặt núi có chất vẽ tay.
    c.multiplyScalar(0.88 + 0.24 * bamSo(i * 0.37));
    mau.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(mau, 3));
  g.computeVertexNormals();
  const nui = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));

  // Rừng thông và hoa đào trên sườn.
  const hinhCay = (() => {
    const duoi = new THREE.ConeGeometry(1, 2.2, 6);
    duoi.translate(0, -0.4, 0);
    const tren = new THREE.ConeGeometry(0.7, 1.8, 6);
    tren.translate(0, 0.9, 0);
    const g = mergeGeometries([duoi, tren])!;
    return g;
  })();
  const cay = new THREE.InstancedMesh(hinhCay, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), 650);
  // Hoa đào: tán mềm như nét vẽ màu nước, không phải khối hình học.
  const texDao = texMay(7);
  const matDao = [
    new THREE.SpriteMaterial({ map: texDao, color: '#ffc4d6', transparent: true, depthWrite: false }),
    new THREE.SpriteMaterial({ map: texDao, color: '#ff9ec0', transparent: true, depthWrite: false }),
  ];
  const dao = new THREE.Group();
  const thanDao = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.2, 2, 5),
    new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 1 }),
    140,
  );
  const m = new THREE.Matrix4();
  const mauCay = new THREE.Color();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const v = new THREE.Vector3();
  let iCay = 0;
  let iDao = 0;
  for (let i = 0; i < 6000 && (iCay < 650 || iDao < 140); i++) {
    const x = -95 + bamSo(i * 3.1) * 130;
    const z = -60 + bamSo(i * 7.7) * 75;
    const h = caoNui(x, z);
    if (h < 1.2 || h > 33) continue;
    if (iDao < 140 && h < 16 && bamSo(i * 1.3) < 0.2) {
      const k = 0.8 + bamSo(i) * 0.8;
      m.compose(v.set(x, h + k, z), q, s.set(k, k, k));
      thanDao.setMatrixAt(iDao, m);
      const tan = new THREE.Sprite(matDao[iDao % 2]!);
      tan.position.set(x, h + 2.4 * k, z);
      tan.scale.set(5.5 * k, 3.6 * k, 1);
      dao.add(tan);
      iDao++;
    } else if (iCay < 650) {
      // Thông hai tầng, đậm nhạt khác nhau: rừng có chiều sâu thay vì một mảng nón giống hệt.
      const k = 0.6 + bamSo(i * 2.2) * 0.9;
      m.compose(v.set(x, h + 1.3 * k, z), q, s.set(k, k * (1 + bamSo(i * 4.1) * 0.5), k));
      cay.setMatrixAt(iCay, m);
      mauCay.setHSL(0.36 + bamSo(i * 6.3) * 0.08, 0.35 + bamSo(i * 1.7) * 0.2, 0.13 + bamSo(i * 9.1) * 0.12);
      cay.setColorAt(iCay, mauCay);
      iCay++;
    }
  }
  cay.count = iCay;
  thanDao.count = iDao;
  dao.add(thanDao);
  const nhom = new THREE.Group();
  nhom.add(nui, cay, dao);
  return nhom;
}

// ---------- Nhà sàn mái thuyền ----------

/** Mái võng hình thuyền như nhà trên trống đồng: nóc cong, hai đầu vút lên. */
function maiThuyen(dai: number, rong: number): THREE.BufferGeometry {
  const NU = 28;
  const NV = 6;
  const vi: number[] = [];
  const chi: number[] = [];
  for (const ben of [-1, 1]) {
    const goc = vi.length / 3;
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 2 - 1;
      const cong = Math.pow(Math.abs(u), 4);
      const yNoc = 4 + 4.2 * cong;
      const yHien = 0.6 + 3.2 * cong;
      const w = rong * (1 - 0.12 * u * u);
      for (let j = 0; j <= NV; j++) {
        const t = j / NV;
        vi.push((u * dai) / 2, yNoc + (yHien - yNoc) * t - Math.sin(t * Math.PI) * 0.35, ben * w * t);
      }
    }
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = goc + i * (NV + 1) + j;
        const b = a + NV + 1;
        chi.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vi, 3));
  g.setIndex(chi);
  g.computeVertexNormals();
  return g;
}

export function taoNhaSan(mauGo: string, mauMai: string, mauDen: string): THREE.Group {
  const nha = new THREE.Group();
  const go = new THREE.MeshStandardMaterial({ color: mauGo, roughness: 0.85 });
  const cot = new THREE.CylinderGeometry(0.28, 0.32, 5, 6);
  for (let i = 0; i < 5; i++) {
    for (const z of [-3.2, 3.2]) {
      const c = new THREE.Mesh(cot, go);
      c.position.set(-8 + i * 4, 2.5, z);
      nha.add(c);
    }
  }
  const san = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 8), go);
  san.position.y = 5.1;
  const vach = new THREE.Mesh(new THREE.BoxGeometry(15, 3.4, 6.2), go);
  vach.position.y = 7;
  nha.add(san, vach);
  const den = new THREE.MeshStandardMaterial({ color: '#000', emissive: mauDen, emissiveIntensity: 2.2 });
  for (let i = 0; i < 5; i++) {
    for (const z of [-3.12, 3.12]) {
      const o = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), den);
      o.position.set(-6 + i * 3, 7.1, z);
      if (z < 0) o.rotation.y = Math.PI;
      nha.add(o);
    }
  }
  const mai = new THREE.Mesh(
    maiThuyen(24, 6.2),
    new THREE.MeshStandardMaterial({ color: mauMai, roughness: 0.7, side: THREE.DoubleSide, flatShading: true }),
  );
  mai.position.y = 6.2;
  nha.add(mai);
  // Hai đầu mái gắn chim Lạc bằng đồng phát sáng.
  const dong = new THREE.MeshStandardMaterial({ color: '#d9a441', emissive: '#ffb347', emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.3 });
  for (const x of [-12, 12]) {
    const chim = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 5), dong);
    chim.position.set(x, 14.6, 0);
    chim.rotation.z = x > 0 ? -0.9 : 0.9;
    nha.add(chim);
  }
  return nha;
}

export function taoLongCung() {
  const nhom = new THREE.Group();
  const be = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 18.5, 1.6, 40),
    new THREE.MeshStandardMaterial({ color: '#2a5a6a', roughness: 0.6, metalness: 0.2 }),
  );
  be.position.y = 0.4;
  nhom.add(be);
  const chinh = taoNhaSan('#203c4a', '#14394a', '#5ee0e6');
  nhom.add(chinh);
  for (const [x, z, r] of [
    [-13, 6, 0.6],
    [13, 6, -0.6],
  ] as const) {
    const phu = taoNhaSan('#203c4a', '#14394a', '#5ee0e6');
    phu.scale.setScalar(0.5);
    phu.position.set(x, 0, z);
    phu.rotation.y = r;
    nhom.add(phu);
  }
  // Ngọc trai thủy phủ trôi trên nóc.
  const ngoc = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 24, 16),
    new THREE.MeshStandardMaterial({ color: '#bffcff', emissive: '#7ef3ff', emissiveIntensity: 3 }),
  );
  ngoc.position.y = 20;
  const den = new THREE.PointLight('#6ff0ff', 60, 60, 1.6);
  den.position.y = 20;
  nhom.add(ngoc, den);
  nhom.position.copy(LONG_CUNG);
  return { nhom, ngoc };
}

export function taoSonMon() {
  const nha = taoNhaSan('#4a3322', '#5a3a1e', '#ffc46b');
  nha.scale.setScalar(0.55);
  const y = caoNui(SON_MON.x, SON_MON.z);
  nha.position.set(SON_MON.x, y - 0.5, SON_MON.z);
  nha.rotation.y = 0.35;
  return nha;
}

// ---------- Đàn tế trống đồng trên đỉnh Tản ----------

export function taoDanTe() {
  const nhom = new THREE.Group();
  const than = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.8, 2.2, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: '#8a6530', metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }),
  );
  const tex = texTrongDong();
  const uMat = { uMap: { value: tex }, uSang: { value: 0.6 }, uT: { value: 0 } };
  const mat = new THREE.Mesh(
    new THREE.CircleGeometry(6.2, 64),
    new THREE.ShaderMaterial({
      uniforms: uMat,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uSang, uT; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5; float a = uT * 0.15; mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
          float v = texture2D(uMap, r * p + 0.5).r;
          vec3 dong = vec3(0.42, 0.29, 0.13);
          // Chỉ hoa văn sáng, mặt đồng vẫn tối: bloom bắt nét hoa văn chứ không loá cả đàn tế.
          vec3 sang = vec3(1.0, 0.72, 0.3) * (0.7 + 1.1 * uSang);
          gl_FragColor = vec4(mix(dong, sang, v), 1.0);
        }`,
    }),
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 1.1;
  nhom.add(than, mat);
  const y = caoNui(DINH_CHINH.x, DINH_CHINH.z);
  nhom.position.set(DINH_CHINH.x, y + 0.6, DINH_CHINH.z);
  return { nhom, uMat, matTren: new THREE.Vector3(DINH_CHINH.x, y + 2, DINH_CHINH.z) };
}

// ---------- Đảo đá trôi ----------

export function taoDaoTroi() {
  const nhom = new THREE.Group();
  const da = new THREE.MeshStandardMaterial({ color: '#5d5470', roughness: 1, flatShading: true });
  const co = new THREE.MeshStandardMaterial({ color: '#4f9a63', roughness: 1, flatShading: true });
  const cayM = new THREE.MeshStandardMaterial({ color: '#21543a', flatShading: true });
  const daoM = new THREE.MeshStandardMaterial({ color: '#ffb7cc', emissive: '#ff6f9a', emissiveIntensity: 0.5, flatShading: true });
  const VI = [
    [-78, 34, -55, 6],
    [14, 44, -62, 5],
    [58, 31, -46, 7],
    [-62, 54, -86, 8],
    [30, 60, -95, 6],
    [-100, 25, -28, 5],
    [80, 50, -84, 6],
    [-10, 70, -120, 9],
  ] as const;
  const dao: { g: THREE.Group; y: number; pha: number }[] = [];
  VI.forEach(([x, y, z, r], i) => {
    const g = new THREE.Group();
    const geo = new THREE.ConeGeometry(r, r * 2.3, 7, 3);
    const p = geo.attributes['position']!;
    for (let k = 0; k < p.count; k++) {
      p.setX(k, p.getX(k) * (0.85 + bamSo(k + i * 50) * 0.3));
      p.setZ(k, p.getZ(k) * (0.85 + bamSo(k * 3 + i) * 0.3));
    }
    geo.computeVertexNormals();
    const khoi = new THREE.Mesh(geo, da);
    khoi.rotation.x = Math.PI;
    khoi.position.y = -r * 1.15;
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 0.95, r * 0.35, 7), co);
    g.add(khoi, mat);
    for (let k = 0; k < 3; k++) {
      const a = bamSo(i * 9 + k) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.16, r * 0.6, 5), k === 1 && i % 2 ? daoM : cayM);
      c.position.set(Math.cos(a) * r * 0.5, r * 0.45, Math.sin(a) * r * 0.5);
      g.add(c);
    }
    g.position.set(x, y, z);
    nhom.add(g);
    dao.push({ g, y, pha: i * 1.7 });
  });
  return {
    nhom,
    chay(t: number) {
      for (const d of dao) {
        d.g.position.y = d.y + Math.sin(t * 0.4 + d.pha) * 1.6;
        d.g.rotation.y = t * 0.02 + d.pha;
      }
    },
  };
}

// ---------- Nước ----------

export function taoNuoc() {
  const u = {
    uT: { value: 0 },
    uSong: { value: 1 },
    uSau: { value: new THREE.Color('#0b2a4a') },
    uNong: { value: new THREE.Color('#1f6fb2') },
    uTroi: { value: new THREE.Color('#f19a6b') },
    uTrang: { value: new THREE.Vector3(0.36, 0.26, -0.89).normalize() },
    uSuong: { value: new THREE.Color('#6a4a7a') },
    uMatDo: { value: 0.004 },
  };
  const g = new THREE.PlaneGeometry(1400, 1400, 220, 220);
  g.rotateX(-Math.PI / 2);
  const nuoc = new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: /* glsl */ `
        uniform float uT, uSong;
        varying vec3 vTg;
        float song(vec2 p){
          return uSong * (0.55 * sin(p.x * 0.09 + uT * 1.1) + 0.35 * sin(p.y * 0.13 - uT * 0.9 + p.x * 0.05)
                 + 0.18 * sin((p.x + p.y) * 0.31 + uT * 2.3));
        }
        void main(){
          vec4 tg = modelMatrix * vec4(position, 1.0);
          tg.y += song(tg.xz);
          vTg = tg.xyz;
          gl_Position = projectionMatrix * viewMatrix * tg;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSau, uNong, uTroi, uTrang, uSuong; uniform float uMatDo, uT;
        varying vec3 vTg;
        ${GLSL_NHIEU}
        void main(){
          vec3 n = normalize(cross(dFdx(vTg), dFdy(vTg)));
          if (n.y < 0.0) n = -n;
          vec3 v = normalize(cameraPosition - vTg);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          vec3 c = mix(uSau, uNong, 0.35 + 0.35 * fbm(vTg.xz * 0.03 + uT * 0.05));
          c = mix(c, uTroi * 0.7, fres * 0.3);
          // Vệt trăng hẹp: mũ cao để chỉ lấp lánh trên ngọn sóng, không loá cả mặt nước dưới bloom.
          float lap = pow(max(dot(reflect(-v, n), uTrang), 0.0), 900.0);
          c += vec3(1.0, 0.92, 0.75) * lap * 1.4;
          float bot = smoothstep(0.62, 0.85, fbm(vTg.xz * 0.12 + vec2(uT * 0.2, 0.0)));
          c += vec3(0.6, 0.85, 1.0) * bot * 0.18;
          float d = length(cameraPosition - vTg);
          float f = 1.0 - exp(-pow(d * uMatDo * 0.7, 2.0));
          gl_FragColor = vec4(mix(c, uSuong, f), 1.0);
        }`,
    }),
  );
  return { nuoc, u };
}

// ---------- Biển mây ----------

export function taoBienMay() {
  const nhom = new THREE.Group();
  const tex = [texMay(1), texMay(2), texMay(3)];
  const may: { s: THREE.Sprite; goc: THREE.Vector3; toc: number }[] = [];
  const mat = tex.map(
    (t) => new THREE.SpriteMaterial({ map: t, color: '#ffd2c8', transparent: true, depthWrite: false, opacity: 0.42 }),
  );
  for (let i = 0; i < 110; i++) {
    const cao = i < 70;
    // Biển mây thấp quây sau lưng và hai bên núi; mây cao ở xa phía chân trời. Không đám nào
    // nằm giữa máy quay và sân chơi (z > 0), kẻo che người chơi.
    const x = cao ? -150 + bamSo(i * 2.3) * 260 : -400 + bamSo(i * 5.1) * 800;
    const z = cao ? -110 + bamSo(i * 1.9) * 100 : -260 - bamSo(i * 3.7) * 300;
    const y = cao ? 4 + bamSo(i * 4.4) * 10 : 30 + bamSo(i * 6.6) * 90;
    const s = new THREE.Sprite(mat[i % 3]!);
    const k = cao ? 30 + bamSo(i) * 40 : 90 + bamSo(i) * 120;
    s.scale.set(k, k * 0.6, 1);
    s.position.set(x, y, z);
    nhom.add(s);
    may.push({ s, goc: s.position.clone(), toc: 0.6 + bamSo(i * 8) * 1.2 });
  }
  return {
    nhom,
    mat,
    chay(t: number) {
      for (const m of may) m.s.position.x = m.goc.x + Math.sin(t * 0.03 * m.toc + m.goc.z) * 12;
    },
  };
}

// ---------- Mây xoáy lôi kiếp ----------

export function taoMayXoay() {
  const u = { uT: { value: 0 }, uHien: { value: 0 } };
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(90, 96),
    new THREE.ShaderMaterial({
      uniforms: u,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uT, uHien; varying vec2 vUv;
        ${GLSL_NHIEU}
        void main(){
          vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
          float xoay = a + r * 4.0 - uT * 0.6;
          float n = fbm(vec2(cos(xoay), sin(xoay)) * 2.5 + r * 3.0 + uT * 0.1);
          float gan = smoothstep(0.55, 0.75, fbm(vec2(xoay * 1.5, r * 6.0 - uT)));
          vec3 c = mix(vec3(0.05, 0.03, 0.1), vec3(0.25, 0.15, 0.45), n);
          c += vec3(0.6, 0.5, 1.2) * gan * (1.0 - r) * 1.6;
          c += vec3(0.9, 0.85, 1.4) * smoothstep(0.18, 0.0, r) * 1.5;
          float al = smoothstep(1.0, 0.55, r) * uHien * (0.6 + 0.4 * n);
          gl_FragColor = vec4(c, al);
        }`,
    }),
  );
  m.rotation.x = Math.PI / 2;
  return { m, u };
}

// ---------- Đạo cụ bãi yêu tinh ----------

/** Sen trên mặt hồ (Hồ Tây) và cây khô (rừng Phong Châu). Hiện dần khi vào màn tương ứng. */
export function taoDaoCuYeu() {
  const sen = new THREE.Group();
  const la = new THREE.MeshStandardMaterial({ color: '#2f7a4a', roughness: 0.9, transparent: true, opacity: 0 });
  const hoa = new THREE.MeshStandardMaterial({ color: '#ffc2dc', emissive: '#ff6fb0', emissiveIntensity: 1.2, transparent: true, opacity: 0 });
  for (let i = 0; i < 46; i++) {
    const x = -48 + bamSo(i * 2.7) * 70;
    const z = 6 + bamSo(i * 3.9) * 40;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(1.4 + bamSo(i) * 0.8, 1.4, 0.12, 10), la);
    l.position.set(x, 0.25, z);
    sen.add(l);
    if (i % 3 === 0) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 6), hoa);
      h.position.set(x + 0.4, 0.95, z);
      sen.add(h);
    }
  }
  const rung = new THREE.Group();
  const kho = new THREE.MeshStandardMaterial({ color: '#2b2016', roughness: 1, flatShading: true, transparent: true, opacity: 0 });
  for (let i = 0; i < 26; i++) {
    const x = -70 + bamSo(i * 5.5) * 60;
    const z = -6 + bamSo(i * 1.1) * 26;
    const h = Math.max(0, caoNui(x, z));
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.9, 9 + bamSo(i) * 6, 5), kho);
    c.position.set(x, h + 4, z);
    c.rotation.z = (bamSo(i * 2) - 0.5) * 0.5;
    rung.add(c);
  }
  return { sen, rung, la, hoa, kho };
}
