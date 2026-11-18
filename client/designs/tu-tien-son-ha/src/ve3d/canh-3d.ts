/** Cảnh 3D Sơn Hà: renderer + bloom, các MÀN (góc máy, bầu trời, sương, ánh sáng, đạo cụ) đổi theo
 *  pha của lõi, người chơi, yêu tinh, và mọi hiệu ứng. Chỉ ĐỌC trạng thái lõi.
 *
 *  Ảnh đại diện khách là lớp HTML bám theo vị trí 3D, không dán vào WebGL: ảnh TikTok không có CORS,
 *  dán vào texture là trình duyệt chặn. Hào quang, kiếm khí, cột sáng thì vẽ trong 3D để bloom bắt. */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { dangChoi, lucChien, npcCua, pheTuLuyen, soNpc, type NguoiChoi, type Pha, type Su, type The } from '../loi/core';
import { PHAM, tenDo } from '../loi/trang-bi';
import { TAY_SON as TAY_SON_X, TAY_THUY as TAY_THUY_X, TAY_Y, diemVa } from '../DaiChien';
import { CAN_CO, CANH_GIOI, danhHieu, danhHieuChien, LINH_VAT, PHE, bacChuc, chieuCua, duongTranh, type Gioi, type Phe, type YeuId } from '../loi/the-gioi';
import type { Canh } from '../ve/canh';
import { banCo, type KhuManHinh } from './doi-hinh';
import { HeHat, taoHieuUng } from './hieu-ung-3d';
/** Mỗi cảnh giới một bộ trang phục (`nhan-vat/<phe>-c<cảnh giới>.webp`). Cảnh giới chưa có tranh
 *  thì mặc bộ của cảnh giới gần nhất bên dưới — thêm tranh nào là dùng ngay tranh đó. */
function tranhCanh(nv: ReadonlyMap<string, string>, phe: Phe | null, gioi: Gioi | null, canh: number): string | undefined {
  for (const p of duongTranh(phe, gioi, canh)) {
    const url = nv.get(p);
    if (url !== undefined) return url;
  }
  return undefined;
}
import {
  caoNui,
  LONG_CUNG,
  taoBienMay,
  taoDanTe,
  taoDaoCuYeu,
  taoDaoTroi,
  taoLongCung,
  taoMayXoay,
  taoNui,
  taoNuoc,
  taoSonMon,
  taoTroi,
} from './the-gioi-3d';
import { texQuang } from './tien-ich';

const W = 1080;
const H = 1920;
/** Chữ trên màn che nửa trên khung dọc: đẩy tâm hình xuống 20% để cảnh chính nằm ở nửa dưới. */
const DAY_XUONG = 0.2;

type ManId = 'sanh' | 'lu' | 'kiep' | 'yeu-ngu' | 'yeu-ho' | 'yeu-moc' | 'yeu-tam' | 'ket' | 'me';

interface Man {
  tren: string;
  giua: string;
  chan: string;
  suong: string;
  matDo: number;
  sau: string;
  nong: string;
  song: number;
  den: string;
  denI: number;
  troiDen: string;
  datDen: string;
  sao: number;
  may: string;
  mua: number;
}

/** Bảng màu từng màn — Kinh Thư §7. */
const MAN: Record<ManId, Man> = {
  sanh: { tren: '#0e0a2e', giua: '#3b2a6e', chan: '#f19a6b', suong: '#6a4a7a', matDo: 0.0042, sau: '#0b2a4a', nong: '#1f6fb2', song: 1, den: '#ffd9a8', denI: 2.2, troiDen: '#b9a6ff', datDen: '#20301f', sao: 1, may: '#ffd2c8', mua: 0 },
  lu: { tren: '#04060d', giua: '#141d30', chan: '#2f4865', suong: '#1c2636', matDo: 0.0075, sau: '#08131f', nong: '#1e3a55', song: 2.8, den: '#9fb8ff', denI: 0.9, troiDen: '#5a6a90', datDen: '#0a1410', sao: 0, may: '#56607a', mua: 1 },
  kiep: { tren: '#030208', giua: '#1c1236', chan: '#40306e', suong: '#1a1230', matDo: 0.005, sau: '#0a0a1e', nong: '#2a2a55', song: 1.4, den: '#c8b8ff', denI: 1, troiDen: '#6a5aa8', datDen: '#100a18', sao: 0.25, may: '#3e3460', mua: 0.35 },
  'yeu-ngu': { tren: '#03101a', giua: '#0b3440', chan: '#2b8a86', suong: '#0f3a40', matDo: 0.006, sau: '#04222a', nong: '#127a7a', song: 2.2, den: '#9ff3e6', denI: 1.2, troiDen: '#5ad0c8', datDen: '#06140f', sao: 0.4, may: '#3a6a70', mua: 0.2 },
  'yeu-ho': { tren: '#0a0518', giua: '#341449', chan: '#bd6aa6', suong: '#3a1d4a', matDo: 0.0055, sau: '#1a0a2a', nong: '#5a2a6a', song: 0.4, den: '#ffc8f0', denI: 1.4, troiDen: '#c48aff', datDen: '#140a14', sao: 1, may: '#a07ab8', mua: 0 },
  'yeu-moc': { tren: '#040a05', giua: '#16301a', chan: '#62843a', suong: '#1a2e18', matDo: 0.008, sau: '#0a1a10', nong: '#2a4a2a', song: 0.6, den: '#d6ff9a', denI: 1, troiDen: '#8ad06a', datDen: '#0a120a', sao: 0.2, may: '#4a6a40', mua: 0 },
  'yeu-tam': { tren: '#0d0306', giua: '#3a0d18', chan: '#c2453a', suong: '#3a1014', matDo: 0.0065, sau: '#200808', nong: '#5a1a1a', song: 2, den: '#ffb0a0', denI: 1.2, troiDen: '#ff6a6a', datDen: '#140606', sao: 0.2, may: '#7a3a3a', mua: 0.3 },
  me: { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  ket: { tren: '#120a30', giua: '#5a2a70', chan: '#ffbf6a', suong: '#7a4a6a', matDo: 0.0032, sau: '#0b2a4a', nong: '#2a6fb2', song: 1, den: '#ffe0a8', denI: 2.4, troiDen: '#ffc8a8', datDen: '#2a2a1f', sao: 1, may: '#ffd8b8', mua: 0 },
};

/** Màu nhuộm tranh Sảnh khi màn chưa có tranh riêng. */
const NHUOM_GOC = new THREE.Color(1, 1, 1);
const NHUOM: Partial<Record<ManId, THREE.Color>> = {
  lu: new THREE.Color(0.38, 0.46, 0.62),
  kiep: new THREE.Color(0.42, 0.36, 0.62),
  'yeu-ngu': new THREE.Color(0.45, 0.75, 0.72),
  'yeu-ho': new THREE.Color(0.78, 0.55, 0.85),
  'yeu-moc': new THREE.Color(0.5, 0.68, 0.42),
  'yeu-tam': new THREE.Color(0.85, 0.42, 0.4),
  ket: new THREE.Color(1.08, 0.98, 0.85),
  me: new THREE.Color(0.62, 0.42, 0.22),
};

const VI_YEU: Record<YeuId, THREE.Vector3> = {
  // Lơ lửng phía trên sân, sau lưng người chơi: kiếm khí bay lên trúng yêu, không che ảnh khách.
  ngu: new THREE.Vector3(14, 22, -2),
  ho: new THREE.Vector3(-10, 22, 2),
  moc: new THREE.Vector3(-30, 26, -6),
  tam: new THREE.Vector3(-8, 28, -2),
};

/** Hai bàn cờ chia đôi vùng dưới khung (toạ độ khung 1080×1920): phe Núi trái, phe Nước phải.
 *  Cố định ở mọi màn — nền là tranh vẽ, người đứng theo màn hình chứ không theo máy quay. */
const KHU: Record<Phe, KhuManHinh> = {
  // Nửa dưới khung (từ ~y=1000) là của người chơi; nửa trên là chữ.
  son: { trai: 28, phai: 524, day: 1800, tren: 1060, toiDaCot: 4 },
  thuy: { trai: 556, phai: 1052, day: 1800, tren: 1060, toiDaCot: 4 },
};
/** Đại Chiến và đánh yêu tinh: hai kim tự tháp hai bên dưới chân hai thần / yêu tinh — phe Núi
 *  trái, phe Nước phải, đỉnh tháp là người đứng đầu phe; chiêu thức bay từ đó lên. */
const KHU_TRAN: Record<Phe, KhuManHinh> = {
  son: { trai: 28, phai: 524, day: 1820, tren: 1290, toiDaCot: 4, oToiDa: 125 },
  thuy: { trai: 556, phai: 1052, day: 1820, tren: 1290, toiDaCot: 4, oToiDa: 125 },
};

/** Tu luyện chỉ hiện một môn phái (lượt đổi mỗi N phút): một bàn kim tự tháp rộng cả khung.
 *  Độ kiếp thì bàn lùi xuống chừa chỗ cho người độ kiếp ngồi trên đỉnh tháp. */
// Tu luyện: tháp 1 – 2 – 4, từ hàng bốn trở đi mỗi hàng đủ 5 người.
const KHU_MOT: KhuManHinh = { trai: 30, phai: 1050, day: 1740, tren: 930, toiDaCot: 6, oToiDa: 200, coToiDa: 140, cotLuoi: 5 };
/** Khách (chưa nhập môn) đứng một hàng phàm nhân ở đáy khung, chỉ ở màn tu luyện. */
const HANG_KHACH = { trai: 70, phai: 1010, y: 1860, toiDa: 10, co: 62 };
const KHU_MOT_KIEP: KhuManHinh = { ...KHU_MOT, tren: 1200 };

type LoaiMan = 'tu' | 'chien' | 'yeu' | 'me';
/** Mỗi màn một kiểu sân: tu luyện ngồi bàn cờ kim tự tháp; Đại Chiến, yêu tinh đứng đội hình
 *  xung trận; Địa Cung vẽ riêng (MeCung.tsx) nên lớp này không vẽ người. */
function loaiMan(p: Pha): LoaiMan {
  if (p.k === 'lu' || p.k === 'lu-ket') return 'chien';
  if (p.k === 'yeu' || p.k === 'yeu-ket') return 'yeu';
  if (p.k === 'me' || p.k === 'me-ket') return 'me';
  return 'tu';
}

interface Bien {
  chu: string;
  /** 1 đứng đầu phe, 2 Hộ Pháp, 3 Trưởng Lão trụ cột. */
  hang: 1 | 2 | 3;
  /** Người đứng đầu cả phòng. */
  deNhat: boolean;
}

/** Người độ kiếp ngồi giữa khung, ngay trên mép trên bàn cờ, to hơn mọi người và nổi trên cả hai
 *  phe (phòng đông thì bàn cờ lấp kín nửa dưới — đặt giữa bàn cờ sẽ bị người khác che). */
const CHO_KIEP = { x: 540, y: 1000, co: 250 };
/** Yêu tinh lơ lửng giữa màn, trên lưới tu sĩ. */
const CHO_YEU = { x: 540, y: 760, co: 720 };
/** Khoảng cách từ máy quay tới mặt phẳng tưởng tượng chứa người chơi, để kiếm khí, linh khí bay
 *  ra từ đúng chỗ ảnh trên màn. */
const SAU_NGUOI = 46;

const MAU_KHI: Record<YeuId, string> = { ngu: '#1fd1c1', ho: '#d14bff', moc: '#8bd14b', tam: '#ff4a6a' };

function manCua(p: Pha): ManId {
  switch (p.k) {
    case 'lu':
    case 'lu-ket':
      return 'lu';
    case 'kiep':
    case 'kiep-ket':
      return 'kiep';
    case 'yeu':
    case 'yeu-ket':
      return `yeu-${p.yeu}`;
    case 'mua-ket':
      return 'ket';
    case 'me':
    case 'me-ket':
      return 'me';
    default:
      return 'sanh';
  }
}

function bam01(s: string, muoi: number): number {
  let h = 2166136261;
  const chu = `${s}#${muoi}`;
  for (let i = 0; i < chu.length; i++) {
    h ^= chu.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const LV_HINH = new Map(LINH_VAT.map((l) => [l.id, l.hinh]));

interface The3D {
  dom: HTMLDivElement;
  than: HTMLElement;
  dau: HTMLElement;
  mu: HTMLElement;
  anh: HTMLImageElement | null;
  chu: HTMLElement;
  ten: HTMLElement;
  /** Biển chức vụ trên đầu (chỉ người từ Chấp sự trở lên). */
  cv: HTMLElement;
  khoa: string;
  khoaAo: string;
}

/** Tranh vẽ tay (ChatGPT) nằm trong assets của phòng. Thiếu tấm nào thì phần đó dùng hình dự phòng:
 *  người chơi là ảnh tròn có hào quang, yêu tinh là hình vẽ canvas. Xem docs/phong/tu-tien/nhan-vat/. */
function napTranh(asset: (p: string) => string) {
  const nv = new Map<string, string>();
  const yeu = new Map<YeuId, HTMLImageElement>();
  // Nạp sẵn mọi tranh có thể dùng (phe × giới × cảnh, và khách); tấm nào chưa vẽ thì bỏ qua.
  const can = new Set<string>();
  for (const phe of ['son', 'thuy', null] as const) {
    for (const gioi of ['nam', 'nu'] as const) for (let c = 0; c < 10; c++) for (const p of duongTranh(phe, gioi, c)) can.add(p);
  }
  for (const p of can) {
    const url = asset(p);
    const im = new Image();
    im.onload = () => nv.set(p, url);
    im.src = url;
  }
  for (const id of ['ngu', 'ho', 'moc', 'tam'] as const) {
    const im = new Image();
    im.onload = () => yeu.set(id, im);
    im.src = asset(`yeu/${id}.webp`);
  }
  const nen = new Map<ManId, THREE.Texture>();
  const tai = new THREE.TextureLoader();
  for (const id of Object.keys(MAN) as ManId[]) {
    tai.load(asset(`nen/${id}.webp`), (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      nen.set(id, tex);
    }, undefined, () => undefined);
  }
  return { nv, yeu, nen };
}

export function taoCanh3D(goc: HTMLCanvasElement, lop: HTMLElement, asset: (p: string) => string): Canh {
  const tranh = napTranh(asset);
  lop.style.setProperty('--anh-hao', `url("${asset('fx/halo.png')}")`);
  const vai = document.createElement('canvas');
  vai.className = goc.className;
  goc.after(vai);
  // Nền trong suốt: tranh nền là lớp ảnh HTML nằm dưới (nét đúng độ phân giải gốc, không qua bloom
  // và không bị hạ độ phân giải khi máy yếu); lớp 3D chỉ vẽ hiệu ứng phát sáng đè lên.
  const renderer = new THREE.WebGLRenderer({ canvas: vai, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // Hiệu ứng vẽ trên nền đen; bước cuối (passTrong) đổi độ sáng thành độ trong suốt nên chỗ đen
  // thành trong, chỗ sáng hiện lên tranh. Không dùng mix-blend-mode: Chrome tính sai hoà trộn khi
  // có phần tử chuyển động đè lên, lộ thành khung chữ nhật.
  renderer.setClearColor(0x000000, 1);
  const nenDom = document.createElement('div');
  nenDom.className = 'sh-nen';
  const nenA = document.createElement('img');
  const nenB = document.createElement('img');
  const nenNhuom = document.createElement('div');
  nenNhuom.className = 'sh-nen-nhuom';
  for (const im of [nenA, nenB]) im.alt = '';
  nenDom.append(nenA, nenB, nenNhuom);
  vai.before(nenDom);
  let nenTren = nenA;
  goc.style.display = 'none';
  let tiLe = 1;
  renderer.setPixelRatio(tiLe);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const canh = new THREE.Scene();
  canh.fog = new THREE.FogExp2('#6a4a7a', 0.0042);
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.5, 2000);
  cam.setViewOffset(W, H, 0, -DAY_XUONG * H, W, H);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(canh, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.9, 0.55, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const passTrong = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uBat: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uBat; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        // Canvas dùng alpha nhân sẵn: rgb giữ nguyên, alpha = độ sáng → giống ghép kiểu screen.
        float a = uBat > 0.5 ? clamp(max(c.r, max(c.g, c.b)) * 1.25, 0.0, 1.0) : 1.0;
        gl_FragColor = vec4(c.rgb, a);
      }`,
  });
  composer.addPass(passTrong);
  composer.setSize(W, H);

  // ---------- Dựng thế giới ----------
  // Phông tranh vẽ tay của màn (nếu có): một tấm phủ kín khung, vẽ trước mọi thứ, chuyển màn thì
  // hoà dần từ tranh cũ sang tranh mới. Có phông thì ẩn trời, núi, nước dựng hình — chỉ còn hiệu ứng
  // phát sáng, người chơi, yêu tinh chạy đè lên tranh.
  const uNen = {
    uA: { value: null as THREE.Texture | null },
    uB: { value: null as THREE.Texture | null },
    uHoa: { value: 1 },
    uCat: { value: new THREE.Vector2(1, 0) },
    uNhuom: { value: new THREE.Color(1, 1, 1) },
  };
  const phong = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: uNen,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uA, uB; uniform float uHoa; uniform vec2 uCat; uniform vec3 uNhuom; varying vec2 vUv;
        void main(){
          // Tranh 2:3, khung 9:16: cắt bớt hai bên, giữ trọn chiều cao.
          vec2 uv = vec2(vUv.x * uCat.x + uCat.y, vUv.y);
          vec4 c = mix(texture2D(uA, uv), texture2D(uB, uv), uHoa);
          gl_FragColor = vec4(c.rgb * uNhuom, 1.0);
        }`,
    }),
  );
  phong.frustumCulled = false;
  phong.renderOrder = -100;
  phong.visible = false;
  let nenDang: THREE.Texture | null = null;

  const troi = taoTroi();
  canh.add(troi.troi, troi.sao, troi.trang);
  const hemi = new THREE.HemisphereLight('#b9a6ff', '#20301f', 0.9);
  const den = new THREE.DirectionalLight('#ffd9a8', 2.2);
  den.position.set(160, 120, -260);
  const nen = new THREE.AmbientLight('#ffffff', 0.18);
  canh.add(hemi, den, nen);

  const khoiNui = new THREE.Group();
  khoiNui.add(taoNui(), taoSonMon());
  const danTe = taoDanTe();
  khoiNui.add(danTe.nhom);
  canh.add(khoiNui);

  const longCung = taoLongCung();
  const dao = taoDaoTroi();
  const nuoc = taoNuoc();
  const may = taoBienMay();
  const xoay = taoMayXoay();
  xoay.m.position.set(danTe.matTren.x, danTe.matTren.y + 46, danTe.matTren.z);
  const daoCu = taoDaoCuYeu();
  khoiNui.add(daoCu.rung);
  canh.add(longCung.nhom, dao.nhom, nuoc.nuoc, may.nhom, xoay.m, daoCu.sen, phong);
  const dungHinh = [troi.troi, troi.sao, troi.trang, khoiNui, longCung.nhom, dao.nhom, nuoc.nuoc, may.nhom, xoay.m, daoCu.sen];

  const hat = new HeHat();
  canh.add(hat.points);
  const hu = taoHieuUng(canh, hat, cam);

  // Mưa: những vệt thẳng quanh tâm máy quay.
  const SO_MUA = 1600;
  const muaPos = new Float32Array(SO_MUA * 6);
  const muaGeo = new THREE.BufferGeometry();
  muaGeo.setAttribute('position', new THREE.BufferAttribute(muaPos, 3).setUsage(THREE.DynamicDrawUsage));
  const muaMat = new THREE.LineBasicMaterial({ color: '#b4c8ff', transparent: true, opacity: 0, depthWrite: false });
  const mua = new THREE.LineSegments(muaGeo, muaMat);
  mua.frustumCulled = false;
  canh.add(mua);
  for (let i = 0; i < SO_MUA; i++) muaPos.set([Math.random() * 160 - 80, Math.random() * 70, Math.random() * 120 - 60], i * 6);

  // Khiên hộ pháp quanh người độ kiếp.
  const khien = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: { uAn: { value: 0 }, uT: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform float uAn, uT; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
          float luoi = 0.5 + 0.5 * sin(vUv.x * 60.0 + uT * 2.0) * sin(vUv.y * 40.0 - uT);
          gl_FragColor = vec4(vec3(0.55, 0.9, 1.3) * (f * 1.6 + luoi * 0.15), (f + luoi * 0.08) * uAn); }`,
    }),
  );
  canh.add(khien);

  // Yêu tinh: tranh vẽ tay đặt giữa màn như người chơi (2D), phía trên lưới tu sĩ.
  // Chưa có tranh thì không vẽ gì — hình dựng bằng mã trông rẻ tiền.
  const yeuDom = document.createElement('div');
  yeuDom.className = 'sh-yeu';
  const yeuAnh = document.createElement('img');
  yeuAnh.alt = '';
  yeuDom.append(yeuAnh);
  // Nằm DƯỚI lớp hiệu ứng 3D: lớp đó hoà trộn kiểu screen, phần tử có transform đè lên nó khiến
  // Chrome tính hoà trộn trong khung phần tử với nền trống và lộ khung đen. Đặt dưới thì kiếm khí,
  // tia sáng còn cộng sáng lên yêu tinh.
  vai.before(yeuDom);

  // Chỉ bản dev: soi cảnh từ console để chỉnh màu, ánh sáng.
  if (import.meta.env.DEV) Object.assign(window, { __sh3d: { canh, cam, nuoc, may, bloom, renderer, troi, danTe } });

  // ---------- Trạng thái vẽ ----------
  const nguoi = new Map<string, The3D>();
  const man = { ...MAN.sanh };
  const mauTam = { tren: new THREE.Color(), giua: new THREE.Color(), chan: new THREE.Color(), suong: new THREE.Color() };
  const camViTri = new THREE.Vector3(-10, 30, 150);
  const camNhin = new THREE.Vector3(-10, 13, 0);
  let mucHien = 0;
  let lanTruoc = 0;
  let trungLuc = -10;
  let yeuDangHien: YeuId | null = null;
  let setKe = 0;
  let phaoKe = 0;
  let yeuTan = 0;
  const doVe: number[] = [];

  const heSoNui = () => 1 - mucHien * 0.035;
  const mucNuoc = () => mucHien * 0.9;

  function viTriNguoi(n: NguoiChoi, t: number, ra: THREE.Vector3): THREE.Vector3 {
    const a = bam01(n.user, 1);
    const b = bam01(n.user, 2);
    if (n.phe === 'thuy') {
      const x = -2 + a * 24;
      const z = 14 + b * 34;
      return ra.set(x, mucNuoc() + 1.6 + Math.sin(t * 1.4 + a * 9) * 0.4, z);
    }
    const x = -42 + a * 34;
    let z = 16 - b * 20;
    let y = caoNui(x, z) * heSoNui();
    // Chân núi bị nước ngập thì lùi lên sườn.
    for (let i = 0; i < 12 && y < mucNuoc() + 1; i++) {
      z -= 2;
      y = caoNui(x, z) * heSoNui();
    }
    return ra.set(x, y + 1.8, z);
  }

  function viTriTheo(the: The, user: string, t: number): THREE.Vector3 {
    const p = the.pha;
    if ((p.k === 'kiep' || p.k === 'kiep-ket') && p.user === user) return thanKiep();
    void t;
    const dang = hien.get(user);
    // Neo ô là chỗ ngồi; thân người ở trên đó chừng 40px.
    return tuManHinh(dang?.x ?? W / 2, (dang?.y ?? 1600) - 40, new THREE.Vector3());
  }

  /** Điểm 3D nằm ngay sau một điểm trên màn hình — nơi kiếm khí, linh khí xuất phát. */
  function tuManHinh(sx: number, sy: number, ra: THREE.Vector3): THREE.Vector3 {
    ra.set((sx / W) * 2 - 1, -((sy / H) * 2 - 1), 0.5).unproject(cam);
    return ra.sub(cam.position).normalize().multiplyScalar(SAU_NGUOI).add(cam.position);
  }

  const tamKiep = () => new THREE.Vector3(danTe.matTren.x, danTe.matTren.y * heSoNui() + 4.5, danTe.matTren.z);
  /** Giữa thân người độ kiếp trên màn (tranh ngồi: thân ở trên điểm neo ~0,35 cỡ). */
  const thanKiep = () => tuManHinh(CHO_KIEP.x, CHO_KIEP.y - CHO_KIEP.co * 0.42, new THREE.Vector3());
  const thanYeu = () => tuManHinh(CHO_YEU.x + (Math.random() - 0.5) * 160, CHO_YEU.y + (Math.random() - 0.5) * 140, new THREE.Vector3());

  function theNguoi(n: NguoiChoi): The3D {
    let x = nguoi.get(n.user);
    if (x !== undefined) return x;
    // Nhân vật: thân SVG dưới, ảnh đầu giữa, mũ SVG trên; cả khối thở nhẹ lên xuống.
    const dom = document.createElement('div');
    dom.className = 'sh-av';
    const trong = document.createElement('div');
    trong.className = 'sh-nv';
    // Vòng hào quang sau lưng (ngang vai): ảnh vòng tô màu cảnh giới xoay chậm, tia sáng xoay ngược.
    const hao = document.createElement('div');
    hao.className = 'sh-nv-hao';
    hao.append(document.createElement('i'), document.createElement('b'));
    trong.append(hao);
    trong.style.animationDelay = `${-bam01(n.user, 3) * 3}s`;
    // Lệch nhịp ẩn hiện tên / chức của từng người, để cả bàn không nháy cùng lúc.
    dom.style.setProperty('--tre', `${-bam01(n.user, 7) * 12}s`);
    const than = document.createElement('div');
    than.className = 'sh-nv-than';
    const dau = document.createElement('div');
    dau.className = 'sh-nv-dau';
    const chu = document.createElement('b');
    dau.append(chu);
    const mu = document.createElement('div');
    trong.append(than, dau);
    const ten = document.createElement('span');
    ten.className = 'sh-av-ten';
    const cv = document.createElement('span');
    cv.className = 'sh-av-cv';
    // Dòng tên dưới chân: [nhãn chức] [tên] — nhãn nhỏ khác màu nằm ngay cạnh tên.
    const nhan = document.createElement('div');
    nhan.className = 'sh-av-nhan';
    nhan.append(cv, ten);
    dom.append(trong, nhan);
    lop.append(dom);
    x = { dom, than, dau, mu, anh: null, chu, ten, cv, khoa: '', khoaAo: '-' };
    nguoi.set(n.user, x);
    return x;
  }

  function boNguoi(user: string) {
    const x = nguoi.get(user);
    if (x === undefined) return;
    x.dom.remove();
    nguoi.delete(user);
  }

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  /** Vị trí trên màn của từng người — trượt dần tới ô mới khi đội hình đổi. */
  const hien = new Map<string, { x: number; y: number }>();
  /** Ô bàn cờ vẽ bằng HTML dưới lớp người. */
  const lopO = document.createElement('div');
  lopO.className = 'sh-ban-co';
  lop.before(lopO);
  const oDom: HTMLDivElement[] = [];
  const thuTuVao = new Map<string, number>();
  let demVao = 0;

  const chieu = new THREE.Vector3();

  function datNguoi(
    n: NguoiChoi,
    sx: number,
    sy: number,
    co: number,
    hienTen: boolean,
    bien: Bien | null,
    url: string | undefined,
    t: number,
    tron = false,
  ) {
    const x = theNguoi(n);
    const cg = CANH_GIOI[n.canh]!;
    const phe = n.phe === null ? '#cccccc' : PHE[n.phe].mauSang;
    if (n.canh >= 4 && Math.random() < 0.4) {
      // Từ Nguyên Anh: linh quang bay quanh người.
      const a = t * 2 + Math.random() * 6.28;
      const q = tuManHinh(sx + Math.cos(a) * co * 0.6, sy + Math.sin(a) * co * 0.4, chieu);
      hat.phat(q.x, q.y, q.z, 0, 1.2, 0, cg.hao, 0.22, 0.9);
    }
    // Có tranh thì là tu sĩ ngồi xếp bằng (khung vuông), ảnh khách thành huy hiệu trên đầu;
    // chưa có tranh thì chỉ ảnh tròn có hào quang.
    // Khách chưa chọn giới: chia đều nam nữ theo tên để đám khách không toàn một dáng.
    const gioi = n.gioi ?? (n.phe === null ? (bam01(n.user, 5) < 0.5 ? 'nam' : 'nu') : null);
    const tranhNv = tron ? undefined : tranhCanh(tranh.nv, n.phe, gioi, n.canh);
    const rong = tranhNv ? co * 1.18 : co * (0.82 + Math.min(9, n.canh) * 0.02);
    const cao = rong;
    const khoa = `${url ?? ''}|${n.ten}|${phe}|${cg.hao}|${n.linhVat.join(',')}|${n.canh}|${n.phe ?? 'khach'}|${n.canCo ?? ''}`;
    if (x.khoa !== khoa) {
      x.khoa = khoa;
      x.dom.dataset['bac'] = String(bacChuc(n.canh));
      x.dom.style.setProperty('--phe', phe);
      x.dom.style.setProperty('--hao', cg.hao);
      if (url) {
        if (x.anh === null) {
          x.anh = document.createElement('img');
          x.anh.referrerPolicy = 'no-referrer';
          x.dau.prepend(x.anh);
        }
        if (x.anh.src !== url) x.anh.src = url;
        x.chu.textContent = '';
      } else {
        x.chu.textContent = (n.ten.trim()[0] ?? '?').toUpperCase();
      }
      const lv = n.linhVat[n.linhVat.length - 1];
      // Căn cơ là biểu tượng nhỏ trước tên.
      const co = n.canCo === null ? '' : CAN_CO[n.canCo].hinh + ' ';
      x.ten.textContent = `${co}${n.ten.length > 12 ? n.ten.slice(0, 11) + '…' : n.ten}${lv ? ' ' + (LV_HINH.get(lv) ?? '') : ''}`;
    }
    const khoaAo = tranhNv ?? '';
    if (x.khoaAo !== khoaAo) {
      x.khoaAo = khoaAo;
      x.than.innerHTML = '';
      if (tranhNv) {
        const im = document.createElement('img');
        im.src = tranhNv;
        im.alt = '';
        x.than.append(im);
      }
      x.dom.classList.toggle('co-tranh', tranhNv !== undefined);
    }
    x.dom.style.display = '';
    // Điểm 3D là ngang ngực: có tranh thì ngực ở 55% chiều cao, ảnh tròn thì ở giữa.
    // Có tranh: người ngồi đè lên ô, đáy tranh hơi dưới tâm ô. Ảnh tròn: tâm ảnh hơi trên tâm ô.
    x.dom.style.transform = `translate(${sx - rong / 2}px, ${sy - (tranhNv ? cao * 0.82 : cao * 0.75)}px)`;
    x.dom.style.width = `${rong}px`;
    x.dom.style.height = `${cao}px`;
    x.dom.style.zIndex = String(Math.round(sy));
    // Ba ghế đỉnh tháp luôn hiện tên kèm nhãn chức.
    x.dom.classList.toggle('hien-ten', hienTen || bien !== null);
    // Biển danh hiệu: chỉ ba ghế đỉnh tháp mỗi phe (và người độ kiếp).
    const chuBien = bien === null ? '' : `${bien.deNhat ? '♛' : ''}${bien.chu}`;
    if (x.cv.textContent !== chuBien) x.cv.textContent = chuBien;
    x.dom.dataset['hang'] = bien === null ? '' : String(bien.hang);
    x.dom.classList.toggle('co-cv', bien !== null);
    x.dom.classList.toggle('de-nhat', bien?.deNhat === true);
    x.dom.classList.toggle('tron', tron);
    x.dom.classList.toggle('npc', n.user.startsWith('npc_'));
    x.dom.classList.remove('kiep');
  }

  function tronMau(dt: number, dich: Man) {
    const k = Math.min(1, dt * 1.3);
    const c = new THREE.Color();
    const lerp = (a: string, b: string) => '#' + c.set(a).lerp(new THREE.Color(b), k).getHexString();
    for (const ten of ['tren', 'giua', 'chan', 'suong', 'sau', 'nong', 'den', 'troiDen', 'datDen', 'may'] as const) {
      man[ten] = lerp(man[ten], dich[ten]);
    }
    for (const ten of ['matDo', 'song', 'denI', 'sao', 'mua'] as const) man[ten] += (dich[ten] - man[ten]) * k;
    troi.u.uTren.value.set(man.tren);
    troi.u.uGiua.value.set(man.giua);
    troi.u.uChan.value.set(man.chan);
    mauTam.suong.set(man.suong);
    (canh.fog as THREE.FogExp2).color.copy(mauTam.suong);
    nuoc.u.uSau.value.set(man.sau);
    nuoc.u.uNong.value.set(man.nong);
    nuoc.u.uTroi.value.set(man.chan);
    nuoc.u.uSuong.value.copy(mauTam.suong);
    nuoc.u.uSong.value = man.song;
    den.color.set(man.den);
    den.intensity = man.denI;
    hemi.color.set(man.troiDen);
    hemi.groundColor.set(man.datDen);
    troi.uSao.uSang.value = man.sao;
    troi.trang.visible = man.sao > 0.15;
    for (const m of may.mat) m.color.set(man.may);
    muaMat.opacity = man.mua * 0.45;
    mua.visible = man.mua > 0.02;
  }

  function gocMay(id: ManId, the: The, t: number): { vi: THREE.Vector3; nhin: THREE.Vector3 } {
    const lac = new THREE.Vector3(Math.sin(t * 0.13) * 3, Math.sin(t * 0.17) * 1.2, Math.cos(t * 0.11) * 2);
    if (id === 'lu') return { vi: new THREE.Vector3(-8, 11 + mucNuoc(), 135).add(lac), nhin: new THREE.Vector3(-8, 9 + mucNuoc() * 0.5, 4) };
    if (id === 'kiep') {
      const a = tamKiep();
      const vong = t * 0.08;
      // Nhìn chếch từ trên xuống: thấy cả mặt trống đồng sáng dưới chân người độ kiếp.
      return { vi: new THREE.Vector3(a.x + Math.sin(vong) * 40, a.y + 17, a.z + Math.cos(vong) * 40), nhin: a.clone().add(new THREE.Vector3(0, 1, 0)) };
    }
    if (id.startsWith('yeu-')) {
      const b = VI_YEU[id.slice(4) as YeuId];
      return { vi: new THREE.Vector3(-8 + (b.x + 8) * 0.35, b.y + 6, b.z + 115).add(lac), nhin: new THREE.Vector3(-8 + (b.x + 8) * 0.6, b.y - 2, b.z) };
    }
    if (id === 'ket') {
      const a = t * 0.05;
      return { vi: new THREE.Vector3(Math.sin(a) * 140 - 10, 78, Math.cos(a) * 140), nhin: new THREE.Vector3(-10, 14, -12) };
    }
    void the;
    return { vi: new THREE.Vector3(-10, 30, 150).add(lac), nhin: new THREE.Vector3(-10, 13, 0) };
  }

  // ---------- Vòng vẽ ----------

  function ve(the: The, now: number, anhCua: ReadonlyMap<string, string>) {
    const t = now / 1000;
    const dt = lanTruoc === 0 ? 0.016 : Math.min(0.1, t - lanTruoc);
    lanTruoc = t;
    const pha = the.pha;
    const id = manCua(pha);

    tronMau(dt, MAN[id]);

    // Phông tranh của màn.
    // Màn chưa có tranh riêng thì mượn tranh Sảnh nhuộm màu của màn — không lộ lại cảnh dựng hình.
    const rieng = tranh.nen.get(id);
    const nenMoi = rieng ?? tranh.nen.get('sanh') ?? null;
    const nhuom = rieng !== undefined ? NHUOM_GOC : (NHUOM[id] ?? NHUOM_GOC);
    uNen.uNhuom.value.lerp(nhuom, Math.min(1, dt * 1.5));
    // Nhuộm màu màn bằng lớp phủ thường (không multiply): màu sẫm đi một nửa, phủ mỏng.
    const m = uNen.uNhuom.value.clone().multiplyScalar(0.45);
    nenNhuom.style.background = `#${m.getHexString()}`;
    nenNhuom.style.opacity = rieng !== undefined ? '0' : '0.32';
    if (nenMoi !== nenDang) {
      if (nenMoi !== null) {
        // Hoà tranh: tấm mới hiện lên trên tấm cũ rồi đổi vai.
        const duoi = nenTren === nenA ? nenB : nenA;
        duoi.src = (nenMoi.image as HTMLImageElement).src;
        duoi.classList.add('hien');
        nenTren.classList.remove('hien');
        nenTren = duoi;
      }
      nenDang = nenMoi;
    }
    nenDom.style.display = nenDang === null ? 'none' : '';
    passTrong.uniforms['uBat']!.value = nenDang === null ? 0 : 1;
    phong.visible = false;
    for (const o of dungHinh) o.visible = nenDang === null;
    // Tranh đã có màu cuối: không cho tone mapping làm bạc màu; bloom chỉ bắt chỗ thật sáng.
    renderer.toneMapping = nenDang === null ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    bloom.threshold = nenDang === null ? 0.78 : 0.92;

    // Thế trận: nước dâng, núi thấp; trong trận lũ thì dao động theo số lần đẩy.
    let mucDich = the.muc;
    if (pha.k === 'lu') {
      const tong = pha.son + pha.thuy;
      if (tong > 0) mucDich += ((pha.thuy - pha.son) / tong) * 3;
    }
    mucHien += (mucDich - mucHien) * Math.min(1, dt * 1.2);
    khoiNui.scale.y = heSoNui();
    nuoc.nuoc.position.y = mucNuoc();
    nuoc.u.uT.value = t;
    nuoc.u.uMatDo.value = man.matDo;
    troi.uSao.uT.value = t;
    dao.chay(t);
    may.chay(t);
    longCung.ngoc.position.y = 20 + Math.sin(t * 1.2) * 0.8;
    longCung.nhom.position.y = LONG_CUNG.y + Math.max(0, mucNuoc() * 0.5);

    // Máy quay bay sang màn mới; đang bay xa thì sương dày lên như xuyên qua mây.
    const goc = gocMay(id, the, t);
    const xa = camViTri.distanceTo(goc.vi);
    camViTri.lerp(goc.vi, Math.min(1, dt * 1.1));
    camNhin.lerp(goc.nhin, Math.min(1, dt * 1.4));
    cam.position.copy(camViTri);
    cam.lookAt(camNhin);
    (canh.fog as THREE.FogExp2).density = man.matDo + Math.min(0.02, xa * 0.00022);

    // Linh khí trôi lên khắp núi và biển — nhịp thở của thế giới tiên hiệp.
    for (let i = 0; i < 4; i++) {
      hat.phat(-90 + Math.random() * 160, mucNuoc() + Math.random() * 30, -70 + Math.random() * 100, 0, 1 + Math.random() * 2, 0, Math.random() < 0.6 ? '#ffd98a' : '#7ff0ff', 0.28 + Math.random() * 0.3, 5);
    }
    if (the.phucLoc > 0 && Math.random() < 0.7) {
      hat.phat(camNhin.x + (Math.random() - 0.5) * 80, camNhin.y + 30, camNhin.z + (Math.random() - 0.5) * 40, 2, -4, 0, Math.random() < 0.5 ? '#ffd24c' : '#ff9bb5', 0.6, 8);
    }

    // Mưa.
    if (mua.visible) {
      for (let i = 0; i < SO_MUA; i++) {
        const k = i * 6;
        let y = muaPos[k + 1]! - dt * 60;
        if (y < mucNuoc()) y += 70;
        const x = muaPos[k]!;
        const z = muaPos[k + 2]!;
        muaPos.set([x, y, z, x - 0.4, y + 2.2, z], k);
      }
      mua.position.set(camNhin.x, 0, camNhin.z);
      muaGeo.attributes['position']!.needsUpdate = true;
    }

    // Lôi kiếp: mây xoáy, mặt trống sáng, sét đánh xuống đàn tế, khiên hộ pháp.
    const coKiep = pha.k === 'kiep';
    xoay.u.uT.value = t;
    xoay.u.uHien.value += ((coKiep ? 1 : 0) - xoay.u.uHien.value) * Math.min(1, dt * 1.5);
    xoay.m.position.y = danTe.matTren.y * heSoNui() + 46;
    danTe.uMat.uT.value = t;
    danTe.uMat.uSang.value += ((coKiep ? 1 : pha.k === 'kiep-ket' && pha.qua ? 1.6 : 0.25) - danTe.uMat.uSang.value) * Math.min(1, dt * 2);
    const kMat = khien.material as THREE.ShaderMaterial;
    kMat.uniforms['uT']!.value = t;
    const soHo = coKiep ? pha.ho.size : 0;
    kMat.uniforms['uAn']!.value += ((coKiep ? Math.min(1, 0.15 + soHo * 0.12) : 0) - kMat.uniforms['uAn']!.value) * Math.min(1, dt * 3);
    khien.position.copy(thanKiep());
    khien.scale.setScalar(1 + Math.min(0.8, soHo * 0.05));
    if (coKiep && t > setKe) {
      setKe = t + 0.8 + Math.random() * 1.3;
      const a = thanKiep();
      hu.set(a.clone().add(new THREE.Vector3((Math.random() - 0.5) * 16, 34, 0)), a.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 3.5, 0)));
      bloom.strength = 1.6;
    }
    bloom.strength += (0.9 - bloom.strength) * Math.min(1, dt * 3);

    // Đạo cụ bãi yêu tinh hiện dần.
    const hienSen = id === 'yeu-ho' ? 1 : 0;
    const hienRung = id === 'yeu-moc' ? 1 : 0;
    for (const m of [daoCu.la, daoCu.hoa]) m.opacity += (hienSen - m.opacity) * Math.min(1, dt * 1.5);
    daoCu.kho.opacity += (hienRung - daoCu.kho.opacity) * Math.min(1, dt * 1.5);
    daoCu.sen.position.y = mucNuoc();
    daoCu.sen.visible = daoCu.la.opacity > 0.01;
    daoCu.rung.visible = daoCu.kho.opacity > 0.01;

    // Yêu tinh (tranh HTML 2D).
    const coYeu = pha.k === 'yeu' || (pha.k === 'yeu-ket' && !pha.thang && now < pha.den);
    if ((pha.k === 'yeu' || pha.k === 'yeu-ket') && tranh.yeu.has(pha.yeu)) {
      const loai = pha.yeu;
      if (yeuDangHien !== loai) {
        yeuDangHien = loai;
        yeuAnh.src = tranh.yeu.get(loai)!.src;
        yeuDom.style.setProperty('--khi', MAU_KHI[loai]);
      }
      const phanMau = pha.k === 'yeu' ? pha.mau / pha.mauMax : 0.3;
      const co = (loai === 'tam' ? 1.15 : 1) * CHO_YEU.co * (0.85 + 0.15 * phanMau);
      const rung = t - trungLuc < 0.15 ? (Math.random() - 0.5) * 18 : 0;
      const chay = pha.k === 'yeu-ket' ? Math.min(1, (pha.tong - (pha.den - now)) / 1800) : 0;
      yeuDom.style.width = yeuDom.style.height = `${co}px`;
      yeuDom.style.transform = `translate(${CHO_YEU.x - co / 2 + rung}px, ${CHO_YEU.y - co / 2 + Math.sin(t * 1.1) * 10 + chay * 500}px)`;
      yeuDom.style.opacity = String(coYeu ? 1 - chay : 0);
      yeuDom.classList.toggle('trung', t - trungLuc < 0.1);
      yeuDom.classList.toggle('phan', now - phanLuc < 700);
      yeuDom.style.display = '';
      if (coYeu && Math.random() < 0.6) {
        const q = tuManHinh(CHO_YEU.x + (Math.random() - 0.5) * co * 0.7, CHO_YEU.y + co * 0.3, chieu);
        hat.phat(q.x, q.y, q.z, 0, 2 + Math.random() * 2, 0, MAU_KHI[loai], 0.35, 1.6);
      }
    } else {
      yeuDom.style.display = 'none';
      yeuDangHien = null;
    }

    // Tổng kết năm: pháo hoa màu phe thắng.
    if (pha.k === 'mua-ket' && t > phaoKe) {
      phaoKe = t + 0.35;
      const mau = pha.thang === null ? '#ffd24c' : Math.random() < 0.6 ? PHE[pha.thang].mauSang : '#ffffff';
      hat.no(new THREE.Vector3(-60 + Math.random() * 110, 40 + Math.random() * 30, -40 + Math.random() * 40), mau, 90, 22, 0.9, 1.8, 9);
    }

    // Người chơi. Tu luyện: mỗi phe một bàn cờ như điện môn phái — đỉnh kim tự tháp là người đứng
    // đầu phe, hai người kế là Trấn Phái, rồi tới lưới; cảnh giới cao ngồi trên, ngang cảnh giới thì
    // lực chiến (công + thủ) cao ngồi trên, ngang nữa thì ai tới trước ngồi trên.
    const lm = loaiMan(pha);
    const ds =
      lm === 'me'
        ? []
        : dangChoi(the, now)
            .filter((n) => n.phe !== null)
            .sort((a, b) => b.canh - a.canh || lucChien(b) - lucChien(a) || b.lk - a.lk)
            .slice(0, 80);
    const deNhat = ds[0]?.user ?? null;
    const top = new Set(ds.slice(0, 5).map((n) => n.user));
    const con = new Set<string>();
    const kiepUser = pha.k === 'kiep' || pha.k === 'kiep-ket' ? pha.user : null;
    for (const n of ds) if (!thuTuVao.has(n.user)) thuTuVao.set(n.user, demVao++);
    let iO = 0;
    let soMach = 0;
    dinhTran = null;
    const pheMot = lm === 'tu' ? pheTuLuyen(the, now).phe : null;
    for (const phe of ['son', 'thuy'] as const) {
      const tran = lm !== 'tu';
      // Tu luyện: chỉ môn phái đang tới lượt.
      if (pheMot !== null && phe !== pheMot) continue;
      // Địa Cung vẽ riêng: không bày ghế bàn cờ.
      if (lm === 'me') continue;
      // PK, đánh yêu: công trạng trong trận xếp trước (đỉnh tháp là người góp nhiều nhất); tu luyện:
      // cảnh giới, rồi lực chiến.
      const cong: ReadonlyMap<string, number> | null =
        pha.k === 'lu' || pha.k === 'lu-ket' ? pha.cong : pha.k === 'yeu' ? pha.dmg : null;
      // PK: Chủ Tướng luôn đứng đỉnh tháp.
      const chu = pha.k === 'lu' ? pha.chu[phe] : null;
      const doiThat = ds
        .filter((n) => n.phe === phe && n.user !== kiepUser)
        .sort(
          (a, b) =>
            (b.user === chu ? 1 : 0) - (a.user === chu ? 1 : 0) ||
            (cong === null ? 0 : (cong.get(b.user) ?? 0) - (cong.get(a.user) ?? 0)) ||
            b.canh - a.canh ||
            lucChien(b) - lucChien(a) ||
            thuTuVao.get(a.user)! - thuTuVao.get(b.user)!,
        )
        .slice(0, tran ? 24 : 80);
      // Tu luyện: trưởng lão NPC ngồi trận cùng khi phe chưa đủ 6 đệ tử thật. Cảnh giới cao ngồi trên;
      // ngang cảnh giới thì đệ tử thật ngồi trên NPC.
      const soNpcPhe = tran ? 0 : soNpc(the, phe, now);
      const laNpc = (n: NguoiChoi) => n.user.startsWith('npc_');
      const doi = tran
        ? doiThat
        : [...doiThat, ...npcCua(phe, soNpcPhe)].sort((a, b) => b.canh - a.canh || (laNpc(a) ? 1 : 0) - (laNpc(b) ? 1 : 0));
      const bc = banCo(doi.length, tran ? KHU_TRAN[phe] : kiepUser !== null ? KHU_MOT_KIEP : KHU_MOT);
      // Ghế theo chức người ngồi: trưởng lão viền vàng, tôn giả hào quang.
      {
        const bacO = new Map<string, number>();
        doi.forEach((n, i) => bacO.set(`${bc.nguoi[i]!.cot},${bc.nguoi[i]!.hang}`, bacChuc(n.canh)));
        for (const o of bc.ban) {
          let d = oDom[iO];
          if (d === undefined) {
            d = document.createElement('div');
            lopO.append(d);
            oDom.push(d);
          }
          const w = bc.rongO * 0.9 * o.ti;
          const h = bc.caoO * 0.5 * o.ti;
          const bac = bacO.get(`${o.cot},${o.hang}`) ?? 0;
          const le = Math.round(o.cot + o.hang) % 2 !== 0;
          d.className = `sh-o-co ${phe} ${le ? 'le' : 'chan'}${bac > 0 ? ` bac-${bac}` : ''}`;
          d.style.cssText = `width:${w}px;height:${h}px;transform:translate(${o.x - w / 2}px,${o.y - h / 2}px)`;
          iO++;
        }
      }
      doi.forEach((n, i) => {
        const o = bc.nguoi[i]!;
        let p = hien.get(n.user);
        if (p === undefined) hien.set(n.user, (p = { x: o.x, y: o.y }));
        else {
          const k = Math.min(1, dt * 3);
          p.x += (o.x - p.x) * k;
          p.y += (o.y - p.y) * k;
        }
        con.add(n.user);
        const nhun = phe === 'thuy' && !tran ? Math.sin(t * 1.4 + o.cot + o.hang) * 4 : 0;
        // Danh hiệu: PK theo thứ tự trong trận. Tu luyện: NPC là "Trưởng lão"; đệ tử thật nhận danh hiệu
        // theo ghế khi ngồi ba ghế đầu, hoặc khi phe đã đủ người (không còn NPC).
        const dh = tran
          ? danhHieuChien(i, pha.k === 'lu' || pha.k === 'lu-ket')
          : laNpc(n)
            ? { chu: 'Trưởng lão', bac: 3 as const }
            : i <= 2 || soNpcPhe === 0
              ? danhHieu(phe, i)
              : null;
        const bien: Bien | null = dh === null ? null : { chu: dh.chu, hang: dh.bac, deNhat: n.user === deNhat };
        // Chức càng lớn ngồi càng to một chút; Chủ Tướng lúc PK to hẳn lên.
        const to = (1 + bacChuc(n.canh) * 0.05) * (pha.k === 'lu' && i === 0 && n.user === chu ? 1.45 : 1);
        datNguoi(
          n,
          p.x,
          p.y + nhun,
          bc.co * o.ti * to,
          top.has(n.user) || now - (vuaLam.get(n.user) ?? 0) < 5000,
          bien,
          anhCua.get(n.user),
          t,
        );
      });
      // Tụ Linh Trận (chỉ lúc tu luyện): mỗi ghế nối mạch sáng lên ghế gần nhất ở hàng trên.
      if (!tran && bc.nguoi.length > 0) {
        machSvg.style.setProperty('--mau', PHE[phe].mauSang);
        dinhTran = { x: bc.nguoi[0]!.x, y: bc.nguoi[0]!.y };
        const soNg = Math.min(doi.length, bc.nguoi.length);
        for (let i = 1; i < soNg; i++) {
          const o = bc.nguoi[i]!;
          let cha: (typeof o) | null = null;
          for (let j = 0; j < i; j++) {
            const c = bc.nguoi[j]!;
            if (c.y >= o.y - 1) continue;
            if (cha === null || c.y > cha.y + 1 || (Math.abs(c.y - cha.y) <= 1 && Math.abs(c.x - o.x) < Math.abs(cha.x - o.x))) cha = c;
          }
          if (cha === null) continue;
          let ln = machDs[soMach];
          if (ln === undefined) {
            ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            machSvg.append(ln);
            machDs.push(ln);
          }
          ln.setAttribute('x1', String(o.x));
          ln.setAttribute('y1', String(o.y - 70));
          ln.setAttribute('x2', String(cha.x));
          ln.setAttribute('y2', String(cha.y - 30));
          ln.style.display = '';
          soMach++;
        }
      }
    }
    for (let i = soMach; i < machDs.length; i++) machDs[i]!.style.display = 'none';
    machSvg.classList.toggle('sang', now < machSang);
    // Khách: hàng phàm nhân ở đáy, người mới tương tác đứng giữa.
    if (lm === 'tu') {
      const khach = dangChoi(the, now)
        .filter((n) => n.phe === null)
        .sort((a, b) => b.lanCuoi - a.lanCuoi)
        .slice(0, HANG_KHACH.toiDa);
      const buoc = (HANG_KHACH.phai - HANG_KHACH.trai) / Math.max(1, HANG_KHACH.toiDa - 1);
      const giua = (HANG_KHACH.trai + HANG_KHACH.phai) / 2;
      khach.forEach((n, i) => {
        const lech = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? -1 : 1);
        const x = giua + lech * buoc;
        let p = hien.get(n.user);
        if (p === undefined) hien.set(n.user, (p = { x, y: HANG_KHACH.y }));
        else {
          const k = Math.min(1, dt * 3);
          p.x += (x - p.x) * k;
          p.y += (HANG_KHACH.y - p.y) * k;
        }
        con.add(n.user);
        datNguoi(n, p.x, p.y, HANG_KHACH.co, now - (vuaLam.get(n.user) ?? 0) < 4000, null, anhCua.get(n.user), t);
      });
    }
    // Người đang choáng vì yêu tinh phản đòn: tranh xám lại.
    for (const u of con) nguoi.get(u)?.dom.classList.toggle('choang', pha.k === 'yeu' && (pha.choang.get(u) ?? 0) > now);
    for (let i = iO; i < oDom.length; i++) oDom[i]!.style.display = 'none';
    for (let i = 0; i < iO; i++) oDom[i]!.style.display = '';
    if (kiepUser !== null) {
      const n = the.nguoi.get(kiepUser);
      if (n !== undefined) {
        con.add(kiepUser);
        hien.set(kiepUser, { x: CHO_KIEP.x, y: CHO_KIEP.y });
        datNguoi(n, CHO_KIEP.x, CHO_KIEP.y, CHO_KIEP.co, true, null, anhCua.get(kiepUser), t);
        const x = nguoi.get(kiepUser);
        if (x !== undefined) {
          // Nhân vật chính của màn: trên mọi người, cả phòng mờ đi một chút.
          x.dom.style.zIndex = '5000';
          x.dom.classList.add('kiep');
        }
      }
    }
    lop.classList.toggle('co-kiep', kiepUser !== null);
    for (const u of [...hien.keys()]) if (!con.has(u)) hien.delete(u);
    for (const u of [...nguoi.keys()]) if (!con.has(u)) boNguoi(u);

    hu.chay(dt, t);
    hat.chay(dt);

    const bd = performance.now();
    composer.render(dt);
    canhChatLuong(performance.now() - bd);
  }

  /** Máy yếu không giữ nổi 30 hình/giây ở 1080×1920: hạ độ phân giải vẽ, chữ HTML vẫn nét. */
  function canhChatLuong(ms: number) {
    doVe.push(ms);
    if (doVe.length < 90) return;
    const tb = doVe.reduce((a, b) => a + b, 0) / doVe.length;
    doVe.length = 0;
    if (tb > 26 && tiLe > 0.75) {
      tiLe = Math.max(0.75, tiLe - 0.125);
      renderer.setPixelRatio(tiLe);
      composer.setPixelRatio(tiLe);
    }
  }

  // ---------- Sự kiện → hiệu ứng ----------

  const vuaLam = new Map<string, number>();

  /** Tên chiêu Đại Chiến: nhãn bóng nổi nhỏ có nền, chữ màu phe, bay lên rồi tan — dễ đọc mà
   *  không chiếm chỗ. Giữ tối đa 8 nhãn cùng lúc. */
  let soNoi = 0;
  /** Tụ Linh Trận: mạch sáng nối các ghế tu luyện (SVG dưới lớp người), đỉnh trận, lúc mạch bừng sáng. */
  const machSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  machSvg.setAttribute('class', 'sh-mach');
  machSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // Nằm trên lớp người (z-index cao) để mạch nối ngực tới ngực không bị tranh nhân vật che.
  lop.append(machSvg);
  const machDs: SVGLineElement[] = [];
  let dinhTran: { x: number; y: number } | null = null;
  let machSang = 0;
  /** Lúc yêu tinh phản đòn gần nhất — tranh yêu tinh phồng lên, rực sáng. */
  let phanLuc = 0;
  function boNoiChieu(x: number, y: number, chieu: string, mau: string) {
    if (soNoi >= 8) return;
    soNoi++;
    const el = document.createElement('div');
    el.className = 'sh-chieu';
    el.textContent = chieu;
    el.style.setProperty('--mau', mau);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    lop.append(el);
    setTimeout(() => {
      el.remove();
      soNoi--;
    }, 1500);
  }

  function su(s: Su, the: The, now: number) {
    const t = now / 1000;
    if ('user' in s) vuaLam.set(s.user, now);
    // Người không có mặt trên màn (khách ngoài hàng, phe đang không tới lượt): không vẽ hiệu ứng —
    // nếu vẽ thì nó rơi về một điểm mặc định giữa đáy khung, thành vòng sáng vô nghĩa.
    const kiepU = the.pha.k === 'kiep' || the.pha.k === 'kiep-ket' ? the.pha.user : null;
    if ('user' in s && s.user !== kiepU && !hien.has(s.user)) return;
    const p = 'user' in s ? viTriTheo(the, s.user, t) : null;
    switch (s.k) {
      case 'cong-huong': {
        // Tụ Linh Trận cộng hưởng: mạch bừng sáng, vòng sáng nở ở đỉnh trận.
        machSang = now + 1_600;
        if (dinhTran !== null) {
          const d = tuManHinh(dinhTran.x, dinhTran.y - 60, new THREE.Vector3());
          hu.vongSong(d, PHE[s.phe].mauSang, 8 + Math.min(18, s.so * 3));
        }
        break;
      }
      case 'dung':
        // Linh khí của người đáp đúng chảy về đỉnh trận — cả trận cùng hưởng.
        if (dinhTran !== null) hu.phong(p!, tuManHinh(dinhTran.x, dinhTran.y - 60, new THREE.Vector3()), '#ffe9a0', 0.5, 0.9);
        hu.phong(p!, p!.clone().add(new THREE.Vector3(0, 14, 0)), '#ffe9a0', 0.9, 1.1);
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 3.5, 0)), `+${s.lk}`, '#ffe9a0', 0.8);
        break;
      case 'dot-pha': {
        const mau = CANH_GIOI[s.canh]?.hao ?? '#ffffff';
        hu.cotSang(p!.clone().add(new THREE.Vector3(0, -2, 0)), mau, 1 + s.canh * 0.1);
        hu.vongSong(p!, mau, 10 + s.canh * 2);
        hat.no(p!, mau, 70, 14, 0.7, 1.4);
        break;
      }
      case 'trung': {
        const n = the.nguoi.get(s.user);
        const phe: Phe = n?.phe ?? 'son';
        const pha = the.pha;
        if (pha.k !== 'yeu') break;
        const dich = thanYeu();
        const dmg = s.dmg;
        const bao = s.bao;
        const truot = s.truot;
        hu.phong(p!, dich, PHE[phe].mauSang, 0.45, bao ? 2 : 1.3, () => {
          if (truot) {
            hu.chuBay(dich, 'trượt!', '#d6b8ff', 0.9);
            return;
          }
          trungLuc = Date.now() / 1000;
          hat.no(dich, bao ? '#ff8a5a' : PHE[phe].mauSang, bao ? 40 : 16, bao ? 20 : 10, 0.6, 0.7);
          hu.chuBay(dich, bao ? `BẠO KÍCH ${dmg}` : `−${dmg}`, bao ? '#ff6a3a' : '#fff2c4', bao ? 1.4 : 1);
        });
        break;
      }
      case 'day': {
        // Chiêu thức bay từ đội hình lên điểm va giữa hai thần; cú nặng (công cao) to và sáng hơn.
        const mau = PHE[s.phe].mauSang;
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const dich = tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3());
        hu.phong(p!, dich, mau, 0.35 + (s.luc - 1) * 0.4, 0.9 + (s.luc - 1) * 0.8);
        const n = the.nguoi.get(s.user);
        const o = hien.get(s.user);
        if (n !== undefined && o !== undefined && (s.luc >= 1.3 || Math.random() < 0.12)) {
          boNoiChieu(o.x, o.y - 120, chieuCua(s.phe, n.canh), mau);
        }
        break;
      }
      case 'ky-nang': {
        // Kết trận pháp: vòng sáng màu phe nổ ở điểm va (Đại Chiến) hoặc quanh yêu tinh.
        const pha = the.pha;
        const mau = PHE[s.phe].mauSang;
        const tam = pha.k === 'lu' ? tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3()) : thanYeu();
        hu.vongSong(tam, mau, 28);
        hu.cotSang(tam.clone().add(new THREE.Vector3(0, -4, 0)), s.ky === 'hoi' ? '#9fffb8' : mau, 1.4);
        hat.no(tam, s.ky === 'hoi' ? '#9fffb8' : mau, 110, 22, 0.9, 1.3);
        bloom.strength = 2.3;
        break;
      }
      case 'pha-tran': {
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const tam = tuManHinh(s.thang === 'son' ? TAY_THUY_X : TAY_SON_X, TAY_Y, new THREE.Vector3());
        hu.vongSong(tam, '#ffffff', 44);
        hat.no(tam, PHE[s.thang].mauSang, 260, 34, 1.1, 1.8);
        bloom.strength = 3;
        break;
      }
      case 'lien-kich': {
        // Mốc liên kích: sóng xung kích nổ ở điểm va, ánh màu phe.
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const va = tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3());
        const mau = PHE[s.phe].mauSang;
        hu.vongSong(va, mau, 18 + Math.min(20, s.so / 4));
        hat.no(va, mau, 90, 24, 0.8, 1.2);
        bloom.strength = 2.4;
        break;
      }
      case 'dao-chieu': {
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const va = tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3());
        hu.vongSong(va, '#ffffff', 34);
        hat.no(va, PHE[s.phe].mauSang, 160, 30, 1, 1.6);
        bloom.strength = 2.8;
        break;
      }
      case 'phan-don': {
        // Yêu tinh phản đòn: luồng tà khí từ yêu tinh bắn vào từng người; trúng thì "Choáng!", đỡ thì "Đỡ!".
        const pha = the.pha;
        if (pha.k !== 'yeu') break;
        const goc = thanYeu();
        const mau = MAU_KHI[pha.yeu];
        phanLuc = now;
        for (const u of [...s.trung, ...s.doDuoc]) {
          const o = hien.get(u);
          if (o === undefined) continue;
          const dich = tuManHinh(o.x, o.y - 40, new THREE.Vector3());
          const trung = s.trung.includes(u);
          hu.phong(goc, dich, mau, 0.8, 1.6, () => {
            hat.no(dich, trung ? mau : '#ffffff', trung ? 40 : 18, 10, 0.6, 0.8);
            hu.chuBay(dich.clone().add(new THREE.Vector3(0, 3, 0)), trung ? 'Choáng!' : 'Đỡ!', trung ? '#ff8a8a' : '#bff3ff', 0.8);
          });
        }
        bloom.strength = 2.1;
        break;
      }
      case 'hoi-khi': {
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 3, 0)), 'Hồi khí!', '#9fffb8', 0.7);
        hat.no(p!, '#9fffb8', 20, 6, 0.5, 0.8);
        break;
      }
      case 'gop': {
        // Tim, quà góp vào Đại Chiến: hạt sáng bay từ người lên điểm va.
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const dich = tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3());
        hu.phong(p!, dich, s.diem >= 3 ? '#ffd24c' : '#ff7aa8', 0.25, 0.8);
        break;
      }
      case 'tuyet-ky': {
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const mau = PHE[s.phe].mauSang;
        const dich = tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3());
        hu.phong(p!, dich, '#ffffff', 1.4, 2.6, () => {
          hat.no(dich, mau, 120, 26, 0.8, 1.2);
          hu.vongSong(dich, mau, 22);
          bloom.strength = 2.3;
        });
        break;
      }
      case 'nhat': {
        // Đồ rơi từ yêu tinh bay xuống người nhặt. (Địa Cung tự vẽ hiệu ứng nhặt.)
        if (s.nguon !== 'yeu' || s.vat === null) break;
        const mau = PHAM[s.vat.pham]!.mau;
        const vat = s.vat;
        hu.phong(thanYeu(), p!, mau, 0.7, 1.4, () => {
          hat.no(p!, mau, 30 + vat.pham * 20, 8, 0.6, 1);
          hu.chuBay(p!.clone().add(new THREE.Vector3(0, 4, 0)), tenDo(vat), mau, 0.8 + vat.pham * 0.1);
        });
        break;
      }
      case 'ho':
        hu.phong(p!, thanKiep(), '#9fe8ff', 1.1, 1);
        break;
      case 'set': {
        const a = thanKiep();
        for (let i = 0; i < (s.qua ? 3 : 6); i++) {
          hu.set(a.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, 34, 0)), a.clone());
        }
        bloom.strength = 2.2;
        if (s.qua) {
          hu.cotSang(a.clone().add(new THREE.Vector3(0, -3, 0)), '#fff2b0', 2);
          hu.vongSong(a, '#ffe9a0', 26);
          hat.no(a, '#ffe9a0', 160, 22, 0.9, 2);
        }
        break;
      }
      case 'qua': {
        const so = Math.min(6, s.so);
        for (let i = 0; i < so; i++) hu.denTroi(p!.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 1, (Math.random() - 0.5) * 4)));
        break;
      }
      case 'tim':
        if (hat.dang < 6000) hat.phat(p!.x, p!.y + 1, p!.z, (Math.random() - 0.5) * 2, 4, 0, '#ff5a8a', 0.5, 1.2);
        break;
      case 'nhap':
        hat.no(p!, PHE[s.phe].mauSang, 20, 6, 0.5, 0.9);
        break;
      case 'pha':
        if (s.pha === 'yeu-ket' && the.pha.k === 'yeu-ket' && the.pha.thang) {
          const b = tuManHinh(CHO_YEU.x, CHO_YEU.y, new THREE.Vector3());
          hat.no(b, MAU_KHI[the.pha.yeu], 260, 30, 1, 1.8, 4);
          hat.no(b, '#ffffff', 80, 40, 0.6, 1);
          hu.vongSong(b, '#ffffff', 30);
          bloom.strength = 2.4;
        }
        break;
      case 'dac-biet': {
        const tam = camNhin.clone();
        hu.vongSong(tam, s.loai === 'dai-yeu' ? '#ff4a6a' : s.loai === 'dai-lu' ? '#5ee0e6' : '#ffd24c', 40);
        hat.no(tam, '#ffe9a0', 120, 26, 0.8, 1.6);
        break;
      }
      default:
        break;
    }
  }

  function don() {
    for (const u of [...nguoi.keys()]) boNguoi(u);
    canh.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const vl = m.material as THREE.Material | THREE.Material[] | undefined;
      for (const x of Array.isArray(vl) ? vl : vl ? [vl] : []) {
        for (const v of Object.values(x)) if (v instanceof THREE.Texture) v.dispose();
        x.dispose();
      }
    });
    composer.dispose();
    renderer.dispose();
    vai.remove();
    nenDom.remove();
    goc.style.display = '';
  }

  return { ve, su, don };
}
