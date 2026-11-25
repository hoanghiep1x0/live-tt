/** Cảnh 3D Sơn Hà: renderer + bloom, các MÀN (góc máy, bầu trời, sương, ánh sáng, đạo cụ) đổi theo
 *  pha của lõi, người chơi, yêu tinh, và mọi hiệu ứng. Chỉ ĐỌC trạng thái lõi.
 *
 *  Ảnh đại diện khách là lớp HTML bám theo vị trí 3D, không dán vào WebGL: ảnh TikTok không có CORS,
 *  dán vào texture là trình duyệt chặn. Hào quang, kiếm khí, cột sáng thì vẽ trong 3D để bloom bắt. */

import { taoYeuDong } from './yeu-dong';
import { taoYeuKhung } from './yeu-khung';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AO, CONG_PHAP, DAN, PET } from '../loi/tang-bao';
import { buffCua, capNhanh, dangChoi, kieuMe, duLinhKhi, lucChien, MAU_YEU_NGUOI, npcCua, pheTuLuyen, soNpc, voCua, type NguoiChoi, type Pha, type Su, type The } from '../loi/core';
import { PHAM, tenDo } from '../loi/trang-bi';
import { TAY_SON as TAY_SON_X, TAY_THUY as TAY_THUY_X, TAY_Y, THAN_THU_SAU, diemVa } from '../DaiChien';
import { anhQua } from '../QuaBien';
import { CAN_CO, CANH_GIOI, danhHieu, danhHieuChien, LINH_VAT, PHE, bacChuc, chieuCua, duongChienAo, duongTranh, type Gioi, type Phe, type YeuId } from '../loi/the-gioi';
import type { Canh } from '../ve/canh';
import { banCo, chonHien, soDoLuc, type KhuManHinh } from './doi-hinh';
import { truongMonCua } from '../loi/truong-mon';
import { hangCua, nguoiDai, tiThiMo } from '../loi/loi-dai';
import { HeHat, taoHieuUng } from './hieu-ung-3d';
import { loaiChieu, taoChieuCp } from './chieu-cp';
import { taoSanThu } from './san-thu';
/** Mỗi cảnh giới một bộ trang phục (`nhan-vat/<phe>-c<cảnh giới>.webp`). Cảnh giới chưa có tranh
 *  thì mặc bộ của cảnh giới gần nhất bên dưới — thêm tranh nào là dùng ngay tranh đó. */
function tranhCanh(nv: ReadonlyMap<string, string>, phe: Phe | null, gioi: Gioi | null, canh: number, ao = 0): string | undefined {
  for (const p of duongTranh(phe, gioi, canh, ao)) {
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

/** `son` / `thuy`: đạo trường của tông đang tới lượt tu luyện (núi Tản Viên / Long Cung); `sanh` là nền chung. */
/** `son-2…4` / `thuy-2…4`: các cảnh thiền khác của tông (xoay vòng `THIEN_DOI`); `vo-<tông>` Võ Trường, `ao-<tông>`
 *  Phòng Thử Đồ (cảnh thử, `san-thu.ts`). Chưa có tranh thì giữ đạo trường gốc. */
type ManId = 'sanh' | 'son' | 'thuy' | 'son-2' | 'son-3' | 'son-4' | 'thuy-2' | 'thuy-3' | 'thuy-4' | 'vo-son' | 'vo-thuy' | 'ao-son' | 'ao-thuy' | 'thi-son' | 'thi-thuy' | 'me-son-1' | 'me-son-2' | 'me-son-3' | 'me-thuy-1' | 'me-thuy-2' | 'me-thuy-3' | 'lu' | 'kiep' | 'yeu-ngu' | 'yeu-ho' | 'yeu-moc' | 'yeu-tam' | 'yeu-chan' | 'yeu-bang' | 'yeu-cop' | 'yeu-giai' | 'ket' | 'me' | 'cho';

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
  son: { tren: '#0c1a10', giua: '#2f5a3a', chan: '#f2c27a', suong: '#4a6a4a', matDo: 0.0038, sau: '#0b2a1a', nong: '#2f8a5a', song: 0.8, den: '#ffe2a8', denI: 2.3, troiDen: '#b8e6a6', datDen: '#22301a', sao: 0.6, may: '#f4e6c8', mua: 0 },
  thuy: { tren: '#03122a', giua: '#0f3a6e', chan: '#6ad0f0', suong: '#1a4a6a', matDo: 0.0045, sau: '#04203a', nong: '#1f7ab2', song: 1.6, den: '#bdf0ff', denI: 2, troiDen: '#8ad0ff', datDen: '#0a1a2a', sao: 0.8, may: '#c8e8ff', mua: 0 },
  /** Cảnh thiền khác, Võ Trường, Phòng Thử Đồ của từng tông: màu như đạo trường tông đó (tranh riêng che hết). */
  get 'son-2'() { return MAN.son; },
  get 'son-3'() { return MAN.son; },
  get 'son-4'() { return MAN.son; },
  get 'vo-son'() { return MAN.son; },
  get 'ao-son'() { return MAN.son; },
  get 'thuy-2'() { return MAN.thuy; },
  get 'thuy-3'() { return MAN.thuy; },
  get 'thuy-4'() { return MAN.thuy; },
  get 'vo-thuy'() { return MAN.thuy; },
  get 'ao-thuy'() { return MAN.thuy; },
  /** Sân thí luyện (Lôi Đài Đồng Môn) của từng tông — màu như đạo trường, đèn dịu hơn. */
  'thi-son': { tren: '#0c1a10', giua: '#2f5a3a', chan: '#f2c27a', suong: '#4a6a4a', matDo: 0.0038, sau: '#0b2a1a', nong: '#2f8a5a', song: 0.8, den: '#ffe2a8', denI: 1.6, troiDen: '#b8e6a6', datDen: '#22301a', sao: 0.3, may: '#f4e6c8', mua: 0 },
  'thi-thuy': { tren: '#03122a', giua: '#0f3a6e', chan: '#6ad0f0', suong: '#1a4a6a', matDo: 0.0045, sau: '#04203a', nong: '#1f7ab2', song: 1.6, den: '#bdf0ff', denI: 1.6, troiDen: '#8ad0ff', datDen: '#0a1a2a', sao: 0.3, may: '#c8e8ff', mua: 0 },
  lu: { tren: '#04060d', giua: '#141d30', chan: '#2f4865', suong: '#1c2636', matDo: 0.0075, sau: '#08131f', nong: '#1e3a55', song: 2.8, den: '#9fb8ff', denI: 0.9, troiDen: '#5a6a90', datDen: '#0a1410', sao: 0, may: '#56607a', mua: 1 },
  kiep: { tren: '#030208', giua: '#1c1236', chan: '#40306e', suong: '#1a1230', matDo: 0.005, sau: '#0a0a1e', nong: '#2a2a55', song: 1.4, den: '#c8b8ff', denI: 1, troiDen: '#6a5aa8', datDen: '#100a18', sao: 0.25, may: '#3e3460', mua: 0.35 },
  'yeu-ngu': { tren: '#03101a', giua: '#0b3440', chan: '#2b8a86', suong: '#0f3a40', matDo: 0.006, sau: '#04222a', nong: '#127a7a', song: 2.2, den: '#9ff3e6', denI: 1.2, troiDen: '#5ad0c8', datDen: '#06140f', sao: 0.4, may: '#3a6a70', mua: 0.2 },
  'yeu-ho': { tren: '#0a0518', giua: '#341449', chan: '#bd6aa6', suong: '#3a1d4a', matDo: 0.0055, sau: '#1a0a2a', nong: '#5a2a6a', song: 0.4, den: '#ffc8f0', denI: 1.4, troiDen: '#c48aff', datDen: '#140a14', sao: 1, may: '#a07ab8', mua: 0 },
  'yeu-moc': { tren: '#040a05', giua: '#16301a', chan: '#62843a', suong: '#1a2e18', matDo: 0.008, sau: '#0a1a10', nong: '#2a4a2a', song: 0.6, den: '#d6ff9a', denI: 1, troiDen: '#8ad06a', datDen: '#0a120a', sao: 0.2, may: '#4a6a40', mua: 0 },
  'yeu-chan': { tren: '#070a04', giua: '#26301a', chan: '#7a7a3a', suong: '#22301a', matDo: 0.0075, sau: '#10180a', nong: '#3a5a2a', song: 0.4, den: '#e6ff9a', denI: 1, troiDen: '#a0d06a', datDen: '#0e1008', sao: 0.1, may: '#506040', mua: 0 },
  'yeu-bang': { tren: '#0a0c1a', giua: '#2a3a5a', chan: '#c8a06a', suong: '#3a4a6a', matDo: 0.0045, sau: '#101a2a', nong: '#4a5a7a', song: 0.4, den: '#ffe6b0', denI: 1.6, troiDen: '#a8c0ff', datDen: '#14141a', sao: 0.6, may: '#8a9ab8', mua: 0 },
  'yeu-cop': { tren: '#0c0704', giua: '#3a2410', chan: '#d08a3a', suong: '#3a2614', matDo: 0.0065, sau: '#1a1006', nong: '#5a3a1a', song: 0.6, den: '#ffd090', denI: 1.3, troiDen: '#ffb060', datDen: '#140c06', sao: 0.2, may: '#7a5a3a', mua: 0 },
  'yeu-giai': { tren: '#04081a', giua: '#102a4a', chan: '#3a6a9a', suong: '#122a44', matDo: 0.006, sau: '#061428', nong: '#1a4a7a', song: 2.4, den: '#b0d8ff', denI: 1.2, troiDen: '#6aa0e0', datDen: '#060c14', sao: 0.3, may: '#3a5a7a', mua: 0.2 },
  'yeu-tam': { tren: '#0d0306', giua: '#3a0d18', chan: '#c2453a', suong: '#3a1014', matDo: 0.0065, sau: '#200808', nong: '#5a1a1a', song: 2, den: '#ffb0a0', denI: 1.2, troiDen: '#ff6a6a', datDen: '#140606', sao: 0.2, may: '#7a3a3a', mua: 0.3 },
  me: { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  'me-son-1': { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  'me-son-2': { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  'me-son-3': { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  'me-thuy-1': { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  'me-thuy-2': { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  'me-thuy-3': { tren: '#0a0604', giua: '#2a1a0c', chan: '#7a4a1e', suong: '#2a1a0e', matDo: 0.006, sau: '#120a04', nong: '#3a2410', song: 0.2, den: '#ffc070', denI: 1.4, troiDen: '#c08040', datDen: '#140c06', sao: 0, may: '#5a3a1e', mua: 0 },
  cho: { tren: '#1a1030', giua: '#5a3a3a', chan: '#ffc878', suong: '#6a4a3a', matDo: 0.0034, sau: '#2a1a0a', nong: '#8a5a2a', song: 0.6, den: '#ffe0a0', denI: 2.4, troiDen: '#ffd0a0', datDen: '#2a2016', sao: 0.4, may: '#ffe0c0', mua: 0 },
  ket: { tren: '#120a30', giua: '#5a2a70', chan: '#ffbf6a', suong: '#7a4a6a', matDo: 0.0032, sau: '#0b2a4a', nong: '#2a6fb2', song: 1, den: '#ffe0a8', denI: 2.4, troiDen: '#ffc8a8', datDen: '#2a2a1f', sao: 1, may: '#ffd8b8', mua: 0 },
};

/** Màu nhuộm tranh Sảnh khi màn chưa có tranh riêng. */
const NHUOM_GOC = new THREE.Color(1, 1, 1);
const NHUOM: Partial<Record<ManId, THREE.Color>> = {
  // Sân thí luyện chưa có tranh riêng: mượn tranh đạo trường của tông, nhuộm sẫm cho khác hẳn lúc tu luyện.
  'thi-son': new THREE.Color(0.62, 0.7, 0.6),
  'thi-thuy': new THREE.Color(0.55, 0.65, 0.8),
  son: new THREE.Color(0.85, 1.02, 0.8),
  thuy: new THREE.Color(0.72, 0.88, 1.1),
  lu: new THREE.Color(0.38, 0.46, 0.62),
  kiep: new THREE.Color(0.42, 0.36, 0.62),
  'yeu-ngu': new THREE.Color(0.45, 0.75, 0.72),
  'yeu-ho': new THREE.Color(0.78, 0.55, 0.85),
  'yeu-moc': new THREE.Color(0.5, 0.68, 0.42),
  'yeu-tam': new THREE.Color(0.85, 0.42, 0.4),
  'yeu-chan': new THREE.Color(0.55, 0.62, 0.38),
  'yeu-bang': new THREE.Color(0.7, 0.75, 0.95),
  'yeu-cop': new THREE.Color(0.9, 0.62, 0.38),
  'yeu-giai': new THREE.Color(0.42, 0.58, 0.85),
  ket: new THREE.Color(1.08, 0.98, 0.85),
  me: new THREE.Color(0.62, 0.42, 0.22),
};

const VI_YEU: Record<YeuId, THREE.Vector3> = {
  // Lơ lửng phía trên sân, sau lưng người chơi: kiếm khí bay lên trúng yêu, không che ảnh khách.
  ngu: new THREE.Vector3(14, 22, -2),
  ho: new THREE.Vector3(-10, 22, 2),
  moc: new THREE.Vector3(-30, 26, -6),
  tam: new THREE.Vector3(-8, 28, -2),
  chan: new THREE.Vector3(-20, 22, -4),
  bang: new THREE.Vector3(4, 30, -2),
  cop: new THREE.Vector3(-14, 24, 0),
  giai: new THREE.Vector3(10, 20, -2),
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
  son: { trai: 28, phai: 524, day: 1870, tren: 1700, toiDaCot: 5, oToiDa: 110 },
  thuy: { trai: 556, phai: 1052, day: 1870, tren: 1700, toiDaCot: 5, oToiDa: 110 },
};

/** Đánh yêu tinh: hai đội đứng dáng chiến (cung / lao) to, cao hơn hẳn đội hình Đại Chiến — không có
 *  Chủ Tướng đứng giữa nên người ra tay chính là nhân vật của màn. */
const KHU_YEU: Record<Phe, KhuManHinh> = {
  son: { trai: 40, phai: 520, day: 1830, tren: 1400, toiDaCot: 3, oToiDa: 230 },
  thuy: { trai: 560, phai: 1040, day: 1830, tren: 1400, toiDaCot: 3, oToiDa: 230 },
};

/** Tu luyện chỉ hiện một môn phái (lượt đổi mỗi N phút): một bàn kim tự tháp rộng cả khung.
 *  Độ kiếp thì bàn lùi xuống chừa chỗ cho người độ kiếp ngồi trên đỉnh tháp. */
// Tu luyện: kim tự tháp 1 – 2 – 3 – 4 – 5…, đỉnh to nhất, càng xuống càng nhỏ để chứa nhiều hàng người hơn.
// Ghế đỉnh 185 (trước 250), người tối đa 140: gọn như hàng khán giả ở Lôi Đài. Phòng vắng thì giữ cỡ này, khoảng
// cách đều; phòng đông thì `thapNhoDan` tự co cả tháp cho vừa khung (hàng dưới nhỏ dần) — không lúc thưa lúc sát.
const KHU_MOT: KhuManHinh = { trai: 30, phai: 1050, day: 1800, tren: 1080, toiDaCot: 12, coToiDa: 130, thapDan: 170 };
/** Khách (chưa nhập môn, tán tu) đứng một hàng phàm nhân ở đáy khung — màn tu luyện và Đại Chiến. */
const HANG_KHACH = { trai: 70, phai: 1010, y: 1860, toiDa: 10, co: 62 };
// Tháp hạ thấp hơn lúc độ kiếp: chừa chỗ dải câu hỏi nhỏ dưới chân người độ kiếp (.sh-kiep, top ~940).
// Độ kiếp: người hộ pháp xếp thành hàng ngang đều nhau (không kim tự tháp), dưới chân người độ kiếp.
const KHU_MOT_KIEP: KhuManHinh = { trai: 40, phai: 1040, day: 1840, tren: 1340, toiDaCot: 6, coToiDa: 160 };
/** Đang tỉ thí Lôi Đài (sân thí luyện): đồng môn thành khán giả, hai hàng nhỏ ngồi dưới chân lôi đài (tối đa 20). */
const KHU_TI_THI: KhuManHinh = { trai: 70, phai: 1010, day: 1840, tren: 1600, toiDaCot: 10, coToiDa: 105 };
const KHAN_GIA_TOI_DA = 20;
/** Đan Các · Tàng Kinh Các riêng một tông: tông đó đứng dạo cả bề ngang quảng trường. */
const KHU_CHO_MOT: KhuManHinh = { trai: 60, phai: 1020, day: 1820, tren: 1320, toiDaCot: 8, oToiDa: 190 };
/** Thành Trì Tự Do: hai tông đứng dạo chợ trên quảng trường, dưới hai quầy (khung chợ chiếm nửa trên). */
const KHU_CHO: Record<Phe, KhuManHinh> = {
  son: { trai: 40, phai: 520, day: 1820, tren: 1320, toiDaCot: 4, oToiDa: 190 },
  thuy: { trai: 560, phai: 1040, day: 1820, tren: 1320, toiDaCot: 4, oToiDa: 190 },
};

/** Đại Chiến: hai Chủ Tướng đứng to giữa sân, đối mặt nhau (Núi trái, Nước phải); trợ chiến xếp hàng phía dưới. */
// Đặt dưới chân hai vị thần (tranh thần ở lớp chữ phía trên, kết thúc quanh y 1180) để không bị che.
// Nhỏ lại và đứng xa nhau (mỗi người một bên trận địa) cho giữa sân thoáng.
const CHO_CHU: Record<Phe, { x: number; y: number }> = { son: { x: 290, y: 1530 }, thuy: { x: 790, y: 1530 } };
const CO_CHU = 260;

type LoaiMan = 'tu' | 'chien' | 'yeu' | 'me' | 'cho';
/** Mỗi màn một kiểu sân: tu luyện ngồi bàn cờ kim tự tháp; Đại Chiến, yêu tinh đứng đội hình
 *  xung trận; Địa Cung vẽ riêng (MeCung.tsx) nên lớp này không vẽ người. */
function loaiMan(p: Pha): LoaiMan {
  if (p.k === 'lu' || p.k === 'lu-ket') return 'chien';
  if (p.k === 'yeu' || p.k === 'yeu-ket') return 'yeu';
  if (p.k === 'me' || p.k === 'me-ket' || p.k === 'nm' || p.k === 'nm-ket') return 'me';
  // Thành Trì Tự Do: hai tông cùng dạo chợ, mỗi tông một nửa sân, không ngai không chức.
  if (p.k === 'tt') return 'cho';
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
// Người độ kiếp đứng cao và to hơn cả phòng: ngồi trên đỉnh trống đồng, bễ nghễ nhìn xuống.
const CHO_KIEP = { x: 540, y: 930, co: 320 };
/** Lôi Đài Đồng Môn: người bị khiêu chiến bên trái, người khiêu chiến bên phải, đứng trên mặt lôi đài. */
// Lúc đang đấu, Hud ẩn câu hỏi và hai thẻ nổi (lớp `ti-thi`) nên hai người đứng xa nhau, to, sân giữa thoáng.
// `giua` / `coMot`: chỗ một người đứng một mình (hiện không dùng — chỉ bày đài khi có trận).
// Khớp tranh nen/thi-*.webp: mặt lôi đài trải y ~560–925 (khung 1080×1920), hai người đứng gần mép trước mặt đài.
const CHO_DAI = { trai: { x: 330, y: 890 }, phai: { x: 750, y: 890 }, giua: { x: 540, y: 890 }, co: 290, coMot: 260 };
/** Lúc tu luyện, ghế đỉnh tháp (Chưởng Môn / Long Soái) nhấc cao hơn cả hàng dưới và ngồi ngai. */
const NANG_DINH = 100;
/** Tháp tu luyện: cỡ người và ghế ở các hàng dưới ghế đỉnh (so với cỡ ô), chừa khoảng trống giữa các người. */
const DUOI_DINH = 0.8;
/** Tháp tu luyện: hệ số giãn khoảng cách các ghế dưới so với ghế đỉnh (ngang, dọc). */
const GIAN_THAP = 1.15;
const GIAN_DOC = 1;
/** Tụ Linh Trận: vẽ nét mạch chấm nối mỗi ghế lên ghế hàng trên (người dùng bỏ — trông rối). */
const VE_MACH = false;
/** Tháp tu luyện: kéo cả nhóm ghế dưới lên gần ghế đỉnh (px khung 1080×1920). */
const KEO_LEN = 60;
/** Yêu tinh lơ lửng giữa màn, trên lưới tu sĩ. */
const CHO_YEU = { x: 540, y: 760, co: 720 };
/** Khoảng cách từ máy quay tới mặt phẳng tưởng tượng chứa người chơi, để kiếm khí, linh khí bay
 *  ra từ đúng chỗ ảnh trên màn. */
const SAU_NGUOI = 46;

/** Thời lượng lớp `xong` (ra đòn) của từng kiểu — phải KHÔNG NGẮN HƠN hoạt ảnh CSS tương ứng (sh-xong 0,42s,
 *  sh-xong-chu 0,5s, sh-xong-yeu 0,62s), kẻo hoạt ảnh bị cắt giữa chừng, nhân vật nhảy về chỗ cũ. XONG_DA là
 *  quãng lấy đà trước khi tên / lao rời tay. */
const XONG_NGAN = 440;
const XONG_CHU = 520;
const XONG_YEU = 640;
const XONG_DA = 150;

const MAU_KHI: Record<YeuId, string> = {
  ngu: '#1fd1c1',
  ho: '#d14bff',
  moc: '#8bd14b',
  tam: '#ff4a6a',
  chan: '#9be04b',
  bang: '#ffd27a',
  cop: '#ff9a3a',
  giai: '#4ab0ff',
};

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
    case 'tt':
      return 'cho';
    case 'me':
      // Tranh Đoạt riêng một tông: mỗi mê cung một tranh nền (`ME_LOAI[phe][loai].nen`).
      return p.phe !== null ? (kieuMe(p.phe, p.loai).nen as ManId) : 'me';
    case 'me-ket':
    case 'nm':
    case 'nm-ket':
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
  /** Số linh thạch trên đầu (thỉnh thoảng nổi lúc tu luyện, để người chơi biết mà tiêu). */
  thach: HTMLElement;
  khoa: string;
  khoaAo: string;
}

/** Tranh vẽ tay (ChatGPT) nằm trong assets của phòng. Thiếu tấm nào thì phần đó dùng hình dự phòng:
 *  người chơi là ảnh tròn có hào quang, yêu tinh là hình vẽ canvas. Xem docs/phong/tu-tien/nhan-vat/. */
/** Các động tác có hoạt ảnh của tướng tiên phong. */
const DONG_TP = ['chuong', 'chem', 'bung'] as const;

function napTranh(asset: (p: string) => string) {
  const nv = new Map<string, string>();
  const yeu = new Map<YeuId, HTMLImageElement>();
  // Nạp sẵn mọi tranh có thể dùng (phe × giới × cảnh, và khách); tấm nào chưa vẽ thì bỏ qua.
  const can = new Set<string>();
  // Hoạt ảnh khung thật của tướng tiên phong (MimicMotion trên hpc, scripts/phong/tu-tien/than-dong): mỗi tranh
  // dáng chiến × mỗi động tác; chưa vẽ thì thôi.
  for (const k of ['son-nam', 'son-nu', 'thuy-nam', 'thuy-nu']) for (const d of DONG_TP) can.add(`nhan-vat/chien-${k}-dong-${d}.webp`);
  for (const phe of ['son', 'thuy', null] as const) {
    for (const gioi of ['nam', 'nu'] as const) {
      for (let c = 0; c < 10; c++) for (const p of duongTranh(phe, gioi, c)) can.add(p);
      // Năm bộ trang phục cơ bản của mỗi nhân vật.
      for (let a = 1; a <= AO.length; a++) for (const p of duongTranh(phe, gioi, 0, a)) can.add(p);
    }
  }
  // Dáng ra trận của Chủ Tướng lúc PK (đứng thủ thế, khiêu khích) — mỗi phe, mỗi giới một tấm.
  // Tấm `-2` là khung hình "ra đòn": đổi qua lại với dáng thủ thế thành ảnh động hai nhịp.
  for (const phe of ['son', 'thuy'] as const) {
    for (const gioi of ['nam', 'nu'] as const) {
      can.add(`nhan-vat/chien-${phe}-${gioi}.webp`);
      can.add(`nhan-vat/chien-${phe}-${gioi}-2.webp`);
      // Dáng chiến theo từng bộ trang phục T1–T9 (chưa vẽ bộ nào thì bộ đó dùng dáng chiến chung).
      for (let a = 1; a <= 9; a++) {
        const g = duongChienAo(phe, gioi, a);
        if (g !== null) for (const k of ['', '-2', '-dong-cong', '-dong-thu', '-dong-hoi']) can.add(`${g}${k}.webp`);
      }
      // Dáng đánh yêu tinh: Sơn Tông giương cung, Thủy Tông phóng lao (và khung hình buông tên / phóng lao).
      can.add(`nhan-vat/danh-${phe}-${gioi}.webp`);
      can.add(`nhan-vat/danh-${phe}-${gioi}-2.webp`);
    }
  }
  for (const p of can) {
    const url = asset(p);
    const im = new Image();
    im.onload = () => nv.set(p, url);
    im.src = url;
  }
  for (const id of ['ngu', 'ho', 'moc', 'tam', 'chan', 'bang', 'cop', 'giai'] as const) {
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
  /** Đại Chiến sau `THAN_THU_SAU`: hai thần thu về góc, chiến trường nở lên chiếm cả sân. `noChien` 0 → 1 (mượt);
   *  mọi toạ độ y của trận (Chủ Tướng, tinh binh, trợ chiến) qua `yChien` — đáy sân đứng yên, phía trên giãn ra. */
  let noChien = 0;
  const DAY_CHIEN = 1870;
  const yChien = (y: number) => DAY_CHIEN - (DAY_CHIEN - y) * (1 + 1.55 * noChien);
  const choChu = (phe: Phe) => ({ x: CHO_CHU[phe].x, y: yChien(CHO_CHU[phe].y) });
  lop.style.setProperty('--anh-hao', `url("${asset('fx/halo.png')}")`);
  lop.style.setProperty('--anh-ngai', `url("${asset('fx/ngai.webp')}")`);
  // Sân thí luyện: vòng đấu sáng dưới chân hai đấu thủ, chỉ hiện khi lớp có `ti-thi`.
  {
    const san = document.createElement('div');
    san.className = 'sh-dai-san';
    // Mặt đài (i) và bốn cột đèn ở bốn góc (b): hai cột sau ở mép trên, hai cột trước ở mép dưới.
    san.append(document.createElement('i'));
    for (const goc of ['sau-trai', 'sau-phai', 'truoc-trai', 'truoc-phai']) {
      const cot = document.createElement('b');
      cot.className = goc;
      san.append(cot);
    }
    lop.append(san);
  }
  // Huy hiệu chiêu do quà (Bạo Kích, Liên Kích, Trận Pháp, Tuyệt Kỹ): bật to ở người tặng rồi tan.
  const HUY_QUA = { bao: asset('fx/qua-bao.webp'), lien: asset('fx/qua-lien.webp'), tran: asset('fx/qua-tran.webp'), tuyet: asset('fx/qua-tuyet.webp') };
  function bopHuyQua(x: number, y: number, loai: keyof typeof HUY_QUA, to = 1) {
    const im = document.createElement('img');
    im.className = 'sh-huy-qua';
    im.src = HUY_QUA[loai];
    im.alt = '';
    const co = 170 * to;
    im.style.cssText = `width:${co}px;height:${co}px;left:${x - co / 2}px;top:${y - co / 2}px`;
    lop.append(im);
    setTimeout(() => im.remove(), 1600);
  }
  /** Bong bóng quà / tim (thay đèn trời cũ, người vận hành 2026-11-23): tặng quà thì đúng ảnh món quà TikTok, thả tim
   *  thì trái tim — icon nhỏ trong vòng mờ, nổi chậm lên từ chỗ người đó rồi mờ dần. Không dồn cục: mỗi người mỗi loại
   *  tối đa một bong bóng mỗi `BONG_CACH` ms, cả màn tối đa `BONG_TOI_DA` (tim nhường chỗ cho quà). */
  const BONG_CACH = 600;
  const BONG_TOI_DA = 16;
  const bongLuc = new Map<string, number>();
  let soBong = 0;
  function bongIcon(user: string, x: number, y: number, kieu: 'qua' | 'tim', tenQua = '', so = 1) {
    const now = Date.now();
    const khoa = `${user}|${kieu}`;
    if (now - (bongLuc.get(khoa) ?? 0) < BONG_CACH) return;
    if (soBong >= (kieu === 'tim' ? BONG_TOI_DA - 4 : BONG_TOI_DA)) return;
    bongLuc.set(khoa, now);
    if (bongLuc.size > 400) for (const [k, l] of bongLuc) if (now - l > BONG_CACH) bongLuc.delete(k);
    soBong++;
    const el = document.createElement('div');
    el.className = `sh-bong ${kieu}`;
    el.style.left = `${Math.round(x + (Math.random() - 0.5) * 24)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 50)}px`);
    const u = kieu === 'qua' ? anhQua(tenQua) : null;
    if (u !== null) {
      const im = document.createElement('img');
      im.alt = '';
      im.src = u;
      el.append(im);
    } else {
      const i = document.createElement('i');
      i.textContent = kieu === 'qua' ? '🎁' : '';
      el.append(i);
    }
    if (kieu === 'qua' && so > 1) {
      const b = document.createElement('b');
      b.textContent = `×${so}`;
      el.append(b);
    }
    lop.append(el);
    setTimeout(() => {
      el.remove();
      soBong--;
    }, 3400);
  }
  // Ảnh chiêu thức công pháp (C1–C9 mỗi tông, `assets/chieu/`): chiêu bay sang bên kia hoặc bùng quanh người tung.
  const chieuCp = taoChieuCp(lop, asset);
  // Cảnh thử chiêu (Võ Trường) / thử trang phục (Phòng Thử Đồ) lúc tu luyện — xem san-thu.ts.
  const sanThu = taoSanThu(lop, chieuCp, asset);
  /** Sân thiền đổi cảnh mỗi bấy nhiêu ms (đạo trường gốc + các cảnh `<tông>-2…4` đã có tranh). */
  const THIEN_DOI = 45_000;
  /** Chỉ bản chơi thử (`?thu=1&nen=<id>`): giữ cứng một nền để duyệt tranh / video nền động của màn đó. */
  const thamSo = new URLSearchParams(location.search);
  const NEN_EP = thamSo.has('thu') ? (thamSo.get('nen') as ManId | null) : null;
  /** Chiêu quanh người (Thủ, Máu) của mỗi người hiện lại sớm nhất sau chừng này ms — không phủ kín đội hình. */
  const CP_QUANH_CACH = 2600;
  const cpQuanhLuc = new Map<string, number>();
  /** Lượt tung chiêu (gõ 1–4) đã vẽ tới đâu (`the.tungChieu[].luc`). */
  let tungDaVe = Date.now();
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
  // NỀN ĐỘNG (nguyên tắc hình §3g-1 điểm 6): màn nào có `nen/<id>-dong.mp4` (video lặp liền — ChatGPT hay FramePack làm từ
  // chính tranh nền) thì phát video đè lên tranh tĩnh, hoà vào khi đã chạy; chưa có thì giữ tranh tĩnh. Dò sẵn lúc nạp.
  const nenVid = document.createElement('video');
  nenVid.className = 'sh-nen-dong';
  nenVid.muted = true;
  nenVid.loop = true;
  nenVid.playsInline = true;
  nenVid.setAttribute('playsinline', '');
  nenVid.preload = 'auto';
  nenVid.addEventListener('playing', () => nenVid.classList.add('hien'));
  const nenDongCo = new Set<string>();
  for (const id of Object.keys(MAN)) {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      nenDongCo.add(id);
      v.removeAttribute('src');
    };
    v.src = asset(`nen/${id}-dong.mp4`);
  }
  let nenDongDang: string | null = null;
  nenDom.append(nenA, nenB, nenVid, nenNhuom);
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
  // Yêu tinh động: tranh uốn trên lưới WebGL (yeu-dong.ts); máy không có WebGL thì giữ ảnh tĩnh.
  const yeuDong = taoYeuDong();
  if (yeuDong !== null) {
    yeuDom.append(yeuDong.el);
    yeuDom.classList.add('dong');
  }
  // Hoạt ảnh thật (FramePack, yeu-khung.ts): con nào có bộ WebP động thì dùng thay lưới WebGL.
  const yeuKhung = taoYeuKhung(asset);
  yeuDom.append(yeuKhung.el);
  // Nằm DƯỚI lớp hiệu ứng 3D: lớp đó hoà trộn kiểu screen, phần tử có transform đè lên nó khiến
  // Chrome tính hoà trộn trong khung phần tử với nền trống và lộ khung đen. Đặt dưới thì kiếm khí,
  // tia sáng còn cộng sáng lên yêu tinh.
  vai.before(yeuDom);

  // Chỉ bản dev: soi cảnh từ console để chỉnh màu, ánh sáng.
  if (import.meta.env.DEV) Object.assign(window, { __sh3d: { canh, cam, nuoc, may, bloom, renderer, troi, danTe } });

  // ---------- Trạng thái vẽ ----------
  const nguoi = new Map<string, The3D>();
  /** Tướng tiên phong đang ở động tác thứ mấy (đổi mỗi lần ra đòn). */
  const dongTp = new Map<string, { luot: number; xong: boolean }>();
  /** Lần chớp đỏ cả màn gần nhất (Cuồng Bạo); lần hiện nhãn buff gần nhất của từng người (khỏi dồn chữ). */
  let chopLuc = 0;
  const buffLuc = new Map<string, number>();
  const man = { ...MAN.sanh };
  const mauTam = { tren: new THREE.Color(), giua: new THREE.Color(), chan: new THREE.Color(), suong: new THREE.Color() };
  const camViTri = new THREE.Vector3(-10, 30, 150);
  const camNhin = new THREE.Vector3(-10, 13, 0);
  let mucHien = 0;
  let lanTruoc = 0;
  let trungLuc = -10;
  let yeuDangHien: YeuId | null = null;
  /** Lò xo vị trí yêu tinh (bị đánh thì đẩy đi rồi kéo về), đồng hồ lượn riêng, cỡ và vị trí khung trước. */
  const yeuLo = { x: 0, y: 0, vx: 0, vy: 0, trungCu: -10, pha: 0, cuong: 0, co: 0, xCu: CHO_YEU.x, yCu: CHO_YEU.y };
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
    // Ngai của người đứng đầu tháp lúc tu luyện: nằm sau nhân vật, chỉ hiện khi có lớp "ngai".
    const ngai = document.createElement('div');
    ngai.className = 'sh-nv-ngai';
    const thach = document.createElement('span');
    thach.className = 'sh-av-thach';
    dom.append(ngai, trong, nhan, thach);
    lop.append(dom);
    x = { dom, than, dau, mu, anh: null, chu, ten, cv, thach, khoa: '', khoaAo: '-' };
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
  /** Đổi trang phục: người đó mặc áo cũ tới lúc món rơi CHẠM NGƯỜI (`ROI_CHAM`) rồi mới thay — loé sáng che lúc đổi,
   *  để người xem thấy rõ nguyên nhân (áo rơi xuống) → kết quả (khoác áo mới). */
  const aoDaVe = new Map<string, number>();
  const aoCho = new Map<string, { cu: number; den: number }>();
  /** Ô bàn cờ vẽ bằng HTML dưới lớp người. */
  const lopO = document.createElement('div');
  lopO.className = 'sh-ban-co';
  lop.before(lopO);
  /** Thần thú hộ sơn của tông đang tu luyện: hai con bay lượn ở phía xa sau đạo trường (nhỏ, phủ sương),
   *  ảnh động hai khung (yên — gầm), quay đầu khi đổi hướng bay. Tranh `than-thu/<con>-1|2.webp` vẽ quay
   *  sang phải. Chuyển động ở stage.css (`sh-tt-bay`). */
  const THAN_THU: Record<Phe, readonly { con: string; ben: 'trai' | 'phai' }[]> = {
    son: [
      { con: 'voi', ben: 'trai' },
      { con: 'ngua', ben: 'phai' },
    ],
    // Giao long (`giao`) tạm cất chờ vẽ lại tranh rồng đẹp hơn; vẽ xong thì thêm lại { con: 'giao', ben: 'trai' }.
    thuy: [{ con: 'rua', ben: 'phai' }],
  };
  const lopThu = document.createElement('div');
  lopThu.className = 'sh-than-thu-lop';
  lopO.before(lopThu);
  const thuDom: Record<Phe, HTMLDivElement[]> = { son: [], thuy: [] };
  for (const phe of ['son', 'thuy'] as const) {
    THAN_THU[phe].forEach((t, i) => {
      const ngoai = document.createElement('div');
      ngoai.className = `sh-than-thu ${t.ben} ${phe}`;
      // Con thứ hai lệch nửa vòng: lúc con này bay sang phải thì con kia bay sang trái.
      // Hai con bay cùng nhịp nhưng ngược chiều (CSS); chỉ lệch nhịp nhấp nhô và nhịp gầm.
      ngoai.style.setProperty('--nhip', `${-i * 3.5}s`);
      const than = document.createElement('div');
      than.className = 'sh-tt-than';
      for (const k of [1, 2]) {
        const im = document.createElement('img');
        im.alt = '';
        im.className = k === 1 ? 'a' : 'b';
        im.src = asset(`than-thu/${t.con}-${k}.webp`);
        im.onerror = () => (im.style.display = 'none');
        than.append(im);
      }
      ngoai.append(than);
      lopThu.append(ngoai);
      thuDom[phe].push(ngoai);
    });
  }
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
    /** Dáng đứng chiến: 'lu' Đại Chiến (khiêu khích, đối mặt), 'yeu' đánh yêu tinh (Sơn giương cung, Thủy phóng lao). */
    chien: false | 'lu' | 'yeu' = false,
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
    // Chủ Tướng lúc PK: dáng ra trận thay cho dáng ngồi thiền (chưa vẽ thì vẫn dáng ngồi).
    const dangXong = (xongDen.get(n.user) ?? 0) > t * 1000;
    // Trang phục đang mặc (đổi áo thì giữ áo cũ tới lúc món rơi chạm người).
    const choAo = aoCho.get(n.user);
    const ao = choAo !== undefined && Date.now() < choAo.den ? choAo.cu : n.ao;
    if (choAo !== undefined && Date.now() >= choAo.den) aoCho.delete(n.user);
    aoDaVe.set(n.user, ao);
    // Dáng chiến ĐÚNG BỘ ÁO đang mặc (`chien-<nhân vật>-<tp1…c9>`); chưa vẽ bộ đó thì dáng chiến chung của phe.
    const gocAo = n.phe !== null ? duongChienAo(n.phe, n.gioi, ao) : null;
    const gocChien = gocAo !== null && tranh.nv.has(`${gocAo}.webp`) ? gocAo : `nhan-vat/chien-${n.phe}-${n.gioi ?? (n.phe === 'son' ? 'nam' : 'nu')}`;
    // Đánh yêu tinh: tranh "danh-" (cung / lao); chưa vẽ thì mượn dáng ra trận của Đại Chiến.
    const gocDanh = `nhan-vat/danh-${n.phe}-${n.gioi ?? (n.phe === 'son' ? 'nam' : 'nu')}`;
    // Dáng chiến có hai khung (thủ thế — ra đòn). Cả hai ảnh nằm chồng nhau sẵn trong DOM, ra đòn thì mờ
    // chuyển qua lại (lớp `ra-don`) — không gỡ ảnh ra dựng lại, nên không chớp, không khựng.
    const gocDung = chien === 'yeu' && n.phe !== null && tranh.nv.has(`${gocDanh}.webp`) ? gocDanh : gocChien;
    // Tướng tiên phong (Đại Chiến) có hoạt ảnh khung thật thì dùng: mỗi lần ra đòn đổi sang động tác kế (đổi ảnh
    // là hoạt ảnh chạy lại từ khung đầu — vừa khớp nhịp lấy đà của đòn).
    const dongDs =
      chien === 'lu' && bien?.chu === 'Chủ Tướng'
        ? DONG_TP.map((d) => tranh.nv.get(`${gocChien}-dong-${d}.webp`)).filter((u): u is string => u !== undefined)
        : [];
    if (dongDs.length > 0) {
      const tr = dongTp.get(n.user) ?? { luot: 0, xong: false };
      if (dangXong && !tr.xong) tr.luot++;
      tr.xong = dangXong;
      dongTp.set(n.user, tr);
    }
    const tranhDong = dongDs.length > 0 ? dongDs[(dongTp.get(n.user)?.luot ?? 0) % dongDs.length] : undefined;
    const tranhChien =
      tranhDong ?? (chien !== false && n.phe !== null ? (tranh.nv.get(`${gocDung}.webp`) ?? tranh.nv.get(`${gocDung}-2.webp`)) : undefined);
    const tranhDon = tranhDong === undefined && tranhChien !== undefined ? tranh.nv.get(`${gocDung}-2.webp`) : undefined;
    const tranhNv = tron ? undefined : (tranhChien ?? tranhCanh(tranh.nv, n.phe, gioi, n.canh, ao));
    const rong = tranhNv ? co * 1.18 : co * (0.82 + Math.min(9, n.canh) * 0.02);
    const cao = rong;
    const khoa = `${url ?? ''}|${ao}|${n.pet}|${n.ten}|${phe}|${cg.hao}|${n.linhVat.join(',')}|${n.canh}|${n.phe ?? 'khach'}|${n.canCo ?? ''}|${capNhanh(n)}`;
    if (x.khoa !== khoa) {
      x.khoa = khoa;
      x.dom.dataset['bac'] = String(bacChuc(n.canh));
      // Vòng hào quang sau lưng chỉ từ Nguyên Anh; càng lên cao càng rực (1: vòng, 2: thêm tia, 3: vòng kép).
      x.dom.dataset['vong'] = String(n.canh >= 8 ? 3 : n.canh >= 6 ? 2 : n.canh >= 4 ? 1 : 0);
      // Cấp nhánh trận (do quà của chính người này): số sao vàng dưới chân.
      x.dom.dataset['nhanh'] = String(capNhanh(n));
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
      // Pet đang theo hiện cạnh tên (chưa có pet thì linh vật mới nhất).
      const pet = n.pet > 0 ? PET[n.pet - 1]?.hinh : undefined;
      x.ten.textContent = `${co}${n.ten.length > 12 ? n.ten.slice(0, 11) + '…' : n.ten}${pet ? ' ' + pet : lv ? ' ' + (LV_HINH.get(lv) ?? '') : ''}`;
    }
    const haiKhung = tranhDon !== undefined && tranhDon !== tranhNv;
    const khoaAo = `${tranhNv ?? ''}|${haiKhung ? tranhDon : ''}`;
    if (x.khoaAo !== khoaAo) {
      x.khoaAo = khoaAo;
      x.than.innerHTML = '';
      if (tranhNv) {
        const im = document.createElement('img');
        im.src = tranhNv;
        im.alt = '';
        im.className = 'a';
        x.than.append(im);
        if (haiKhung) {
          const im2 = document.createElement('img');
          im2.src = tranhDon!;
          im2.alt = '';
          im2.className = 'b';
          x.than.append(im2);
        }
      }
      x.dom.classList.toggle('co-tranh', tranhNv !== undefined);
      // Mỗi người một nhịp thở / đổi chân riêng (theo tên), cả đội không nhún đều tăm tắp.
      x.dom.style.setProperty('--lau', `${(2.3 + bam01(n.user, 11) * 1.5).toFixed(2)}s`);
    }
    x.than.classList.toggle('ra-don', haiKhung && dangXong);
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
    // Linh thạch đang có: chỉ đệ tử thật; CSS cho nổi vài giây mỗi chu kỳ ở màn tu luyện (lớp `man-tu`).
    const coThach = n.phe !== null && !n.user.startsWith('npc_');
    x.dom.classList.toggle('co-thach', coThach);
    if (coThach) {
      const chuThach = `💎 ${Math.floor(n.tinChi)}`;
      if (x.thach.textContent !== chuThach) x.thach.textContent = chuThach;
    }
    x.dom.classList.toggle('chien', tranhChien !== undefined);
    // Bước lên về phía đối thủ rồi lui: Núi tiến sang phải, Nước tiến sang trái.
    x.dom.classList.toggle('xong', dangXong);
    x.dom.classList.toggle('bi-danh', (trungDen.get(n.user) ?? 0) > t * 1000);
    x.dom.style.setProperty('--huong', n.phe === 'thuy' ? '-1' : '1');
    // Đủ linh khí, đang chờ gõ "đột phá": mũi tên nhấp nháy trên đầu.
    x.dom.classList.toggle('du-lk', n.phe !== null && !n.choKiep && duLinhKhi(n) && !n.user.startsWith('npc_'));
    x.dom.classList.remove('kiep', 'ngai', 'tien-phong', 'tren-dai', 'lat');
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
    // Tu luyện: nền là đạo trường của tông đang tới lượt — nhìn là biết đang ở Sơn Tông hay Thủy Tông.
    const manGoc = manCua(pha);
    // Đang tỉ thí Lôi Đài: chuyển sang sân thí luyện riêng của tông (không tháp đệ tử, chỉ hai đấu thủ).
    const pheNen = pheTuLuyen(the, now).phe;
    // Tu luyện: đang chiếu cảnh thử (mua công pháp / trang phục) thì Võ Trường / Phòng Thử Đồ của tông người mua;
    // không thì sân thiền xoay vòng các cảnh của tông (chỉ những cảnh đã có tranh).
    const duocThu = manGoc === 'sanh' && !tiThiMo(the) && pha.k !== 'kiep' && pha.k !== 'kiep-ket';
    sanThu.buoc(now, duocThu);
    const thu = duocThu ? sanThu.dang() : null;
    const thienDs = ([pheNen, `${pheNen}-2`, `${pheNen}-3`, `${pheNen}-4`] as const).filter((x) => x === pheNen || tranh.nen.has(x));
    const thien: ManId = thienDs[Math.floor(now / THIEN_DOI) % thienDs.length]!;
    const idThu = thu === null ? null : (`${thu.loai}-${thu.phe}` as const);
    const id: ManId =
      NEN_EP !== null && NEN_EP in MAN ? NEN_EP : manGoc === 'sanh' ? (tiThiMo(the) ? (`thi-${pheNen}` as const) : idThu !== null && tranh.nen.has(idThu) ? idThu : thien) : manGoc;
    // Để CSS hạ màu nền đạo trường cho nhân vật nổi lên (stage.css `.sh-nen[data-man]`).
    if (nenDom.dataset['man'] !== id) nenDom.dataset['man'] = id;
    // Cảnh thử đang chiếu: nền lùi xa (mờ nhẹ, máy quay đẩy chậm vào) cho người thử nổi khối — `.sh-nen.san-thu`.
    const nenThu = idThu !== null && id === idThu;
    if (nenDom.classList.contains('san-thu') !== nenThu) nenDom.classList.toggle('san-thu', nenThu);

    tronMau(dt, MAN[id]);

    // Phông tranh của màn.
    // Màn chưa có tranh riêng thì mượn tranh Sảnh nhuộm màu của màn — không lộ lại cảnh dựng hình.
    const rieng = tranh.nen.get(id);
    const muon = id === 'thi-son' || id === 'thi-thuy' ? tranh.nen.get(pheNen) : id.startsWith('me-') ? tranh.nen.get('me') : undefined;
    // Sân thí luyện đã có tranh lôi đài riêng: bỏ khối đài CSS và lớp phủ tối (stage.css `[data-tranh]`).
    const coTranhThi = (id === 'thi-son' || id === 'thi-thuy') && rieng !== undefined;
    if ((nenDom.dataset['tranh'] === '1') !== coTranhThi) nenDom.dataset['tranh'] = coTranhThi ? '1' : '';
    lop.classList.toggle('co-tranh-thi', coTranhThi);
    const nenMoi = rieng ?? muon ?? tranh.nen.get('sanh') ?? null;
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
    // Nền động của màn (chỉ khi màn có tranh riêng và đã có video `-dong`): đổi màn thì video cũ mờ đi, video mới chạy.
    const dongMoi = rieng !== undefined && nenDongCo.has(id) ? id : null;
    if (dongMoi !== nenDongDang) {
      nenDongDang = dongMoi;
      nenVid.classList.remove('hien');
      if (dongMoi !== null) {
        nenVid.src = asset(`nen/${dongMoi}-dong.mp4`);
        void nenVid.play().catch(() => undefined);
      } else {
        setTimeout(() => {
          if (nenDongDang === null) nenVid.pause();
        }, 1300);
      }
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
        yeuDong?.dat(tranh.yeu.get(loai)!);
        yeuKhung.dat(loai);
        yeuDom.style.setProperty('--khi', MAU_KHI[loai]);
      }
      const phanMau = pha.k === 'yeu' ? pha.mau / pha.mauMax : 0.3;
      const cuong = pha.k === 'yeu' && pha.cuong;
      // Cuồng Bạo: to hẳn lên, rung giật liên hồi.
      const co = (loai === 'tam' ? 1.15 : 1) * (cuong ? 1.18 : 1) * CHO_YEU.co * (0.85 + 0.15 * phanMau);
      // Trúng đòn: không rung bằng số ngẫu nhiên từng khung hình (giật cục) mà bị ĐẨY một cái rồi lò xo kéo về
      // — lùi ra, nảy lại, lắng dần như vật có khối lượng.
      if (trungLuc !== yeuLo.trungCu) {
        yeuLo.trungCu = trungLuc;
        yeuLo.vx += (Math.random() - 0.5) * 420;
        yeuLo.vy -= 300 + Math.random() * 120;
      }
      {
        const K = 170;
        const C = 15;
        const buocLo = Math.min(0.033, dt);
        yeuLo.vx += (-K * yeuLo.x - C * yeuLo.vx) * buocLo;
        yeuLo.vy += (-K * yeuLo.y - C * yeuLo.vy) * buocLo;
        yeuLo.x += yeuLo.vx * buocLo;
        yeuLo.y += yeuLo.vy * buocLo;
      }
      // Yêu tinh không đứng im: lượn qua lại, chao lên xuống theo vài nhịp chồng nhau (không lặp đều như máy);
      // Cuồng Bạo thì lượn rộng và gấp hơn. Sắp phản đòn thì tụ lực (lưới co mình, run — yeu-dong.ts).
      yeuLo.cuong += ((cuong ? 1 : 0) - yeuLo.cuong) * Math.min(1, dt * 1.6);
      yeuLo.pha += dt * (1 + 0.6 * yeuLo.cuong);
      const tl = yeuLo.pha;
      const bien = 1 + 0.5 * yeuLo.cuong;
      const luon = (Math.sin(tl * 0.55) * 46 + Math.sin(tl * 1.27 + 1.1) * 14 + Math.sin(tl * 2.1) * 5) * bien;
      const chao = (Math.sin(tl * 1.1) * 18 + Math.sin(tl * 0.43 + 2.0) * 10) * bien;
      // Tụ lực: sắp phản đòn, hoặc đang báo chiêu lớn (cả 4 giây báo).
      const tuLuc = pha.k === 'yeu' && pha.mau > 0 && ((pha.phanKe - now < 1300 && pha.phanKe > now) || pha.bao !== null);
      const chay = pha.k === 'yeu-ket' ? Math.min(1, (pha.tong - (pha.den - now)) / 1800) : 0;
      // Cỡ đổi theo máu cũng tiến dần, không nhảy bậc mỗi lần mất máu.
      yeuLo.co = yeuLo.co === 0 ? co : yeuLo.co + (co - yeuLo.co) * Math.min(1, dt * 4);
      const coM = yeuLo.co;
      const yx = CHO_YEU.x + luon + yeuLo.x;
      const yy = CHO_YEU.y + chao + yeuLo.y + chay * chay * 500;
      const yvx = dt > 0 ? (yx - yeuLo.xCu) / dt / coM : 0;
      const yvy = dt > 0 ? (yy - yeuLo.yCu) / dt / coM : 0;
      yeuLo.xCu = yx;
      yeuLo.yCu = yy;
      yeuDom.style.width = yeuDom.style.height = `${coM}px`;
      yeuDom.style.transform = `translate(${yx - coM / 2}px, ${yy - coM / 2}px)`;
      yeuDom.classList.toggle('tu', tuLuc);
      yeuDom.style.opacity = String(coYeu ? 1 - chay : 0);
      yeuDom.classList.toggle('trung', t - trungLuc < 0.14);
      yeuDom.classList.toggle('phan', now - phanLuc < 700);
      yeuDom.classList.toggle('cuong', cuong);
      yeuDom.classList.toggle('giap', pha.k === 'yeu' && pha.giapDen > now);
      const coKhung = yeuKhung.co();
      yeuDom.classList.toggle('khung', coKhung);
      if (coKhung && coYeu) yeuKhung.ve(now, { cuong, chieu: phanLuc, trung: trungLuc });
      if (yeuDong !== null && coYeu && !coKhung) {
        const xLao = (now - phanLuc) / 700;
        yeuDong.ve(t, {
          tu: tuLuc ? Math.min(1, Math.max(0, 1 - (pha.k === 'yeu' ? pha.phanKe - now : 0) / 1300)) : 0,
          lao: xLao >= 0 && xLao < 1 ? Math.sin(xLao * Math.PI) : 0,
          trung: t - trungLuc < 0.12 ? 1 : 0,
          cuong: cuong ? 1 : 0,
          vx: yvx,
          vy: yvy,
        });
      }
      yeuDom.style.display = '';
      if (coYeu && Math.random() < 0.6) {
        const q = tuManHinh(yx + (Math.random() - 0.5) * coM * 0.7, yy + coM * 0.3, chieu);
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
    the0 = the;
    if (pha.k !== 'lu') {
      doiPk.son = [];
      doiPk.thuy = [];
    }
    // Người xem gõ 1–4 (hô trận pháp) mà có công pháp đúng hệ: tranh chiêu của môn đó tung từ chính người ấy.
    if (pha.k === 'lu') {
      for (const c of the.tungChieu ?? []) {
        if (c.luc <= tungDaVe) continue;
        tungDaVe = c.luc;
        if (c.so > 0) tungChieuCp(c.user, c.phe, c.so, 1.35);
      }
    } else tungDaVe = now;
    if (pha.k === 'lu') capNhatDau(now, dt);
    else capDau.length = 0;
    // Quần chiến: quần hùng và đội quân hai bên liên tục tung chiêu cơ bản sang phía bên kia.
    if (pha.k === 'lu' && now >= quanKe) {
      quanKe = now + 600 + Math.random() * 700;
      const phe: Phe = Math.random() < 0.5 ? 'son' : 'thuy';
      // Người đang đơn đấu không bắn tầm xa (đang đánh tay đôi).
      const ban = doiPk[phe].filter((u) => !dangDau(u));
      const tuUser = ban.length > 0 && Math.random() < 0.75 ? ban[Math.floor(Math.random() * ban.length)]! : null;
      bayCheo(tuUser, phe, 0.8);
    }
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
    // Lôi Đài Đồng Môn: đang có trận thì hai đấu thủ đứng trên lôi đài của sân thí luyện, đồng môn thành khán giả.
    const dai = lm === 'tu' && kiepUser === null ? the.loiDai : null;
    const trenDai: string[] = dai === null ? [] : dai.tran !== null ? [dai.tran.a.user, dai.tran.b.user] : [];
    const coDai = trenDai.length > 0;
    // Đại Chiến: sau 30 giây chiến trường nở ra cả sân (hai thần đã thu về góc — DaiChien.tsx lớp `thu`).
    {
      const dich = pha.k === 'lu' && now - (pha.den - pha.tong) > THAN_THU_SAU ? 1 : 0;
      noChien += (dich - noChien) * Math.min(1, dt * 1.2);
    }
    /** Đang có trận: sân thí luyện riêng — không bày tháp, ghế, khách, thần thú; chỉ hai đấu thủ trên vòng đấu. */
    const tiThi = dai !== null && tiThiMo(the);
    for (const n of ds) if (!thuTuVao.has(n.user)) thuTuVao.set(n.user, demVao++);
    let iO = 0;
    let soMach = 0;
    dinhTran = null;
    const pheMot = lm === 'tu' ? pheTuLuyen(the, now).phe : null;
    // Thần thú hộ sơn: chỉ ở đạo trường lúc tu luyện (độ kiếp có đài riêng), theo tông đang tới lượt.
    for (const phe of ['son', 'thuy'] as const) {
      const hien = pheMot === phe && kiepUser === null && !tiThi;
      for (const d of thuDom[phe]) d.classList.toggle('hien', hien);
    }
    for (const phe of ['son', 'thuy'] as const) {
      const tran = lm !== 'tu' && lm !== 'cho';
      const cho = lm === 'cho';
      // Đan Các · Tàng Kinh Các riêng một tông: chỉ đệ tử tông đó dạo chợ.
      if (cho && pha.k === 'tt' && pha.phe !== null && phe !== pha.phe) continue;
      // Tu luyện: chỉ môn phái đang tới lượt.
      if (pheMot !== null && phe !== pheMot) continue;
      // Địa Cung vẽ riêng: không bày ghế bàn cờ.
      if (lm === 'me') continue;
      // Lịch trình giao yêu tinh cho một tông: chỉ tông đó đứng ra đánh.
      if (pha.k === 'yeu' && pha.phe !== null && phe !== pha.phe) continue;
      // PK, đánh yêu: công trạng trong trận xếp trước (đỉnh tháp là người góp nhiều nhất); tu luyện:
      // cảnh giới, rồi lực chiến.
      const cong: ReadonlyMap<string, number> | null =
        pha.k === 'lu' || pha.k === 'lu-ket' ? pha.cong : pha.k === 'yeu' ? pha.dmg : null;
      // PK: Chủ Tướng luôn đứng đỉnh tháp.
      const chu = pha.k === 'lu' ? pha.chu[phe] : null;
      const doiThat = ds
        .filter((n) => n.phe === phe && n.user !== kiepUser && !trenDai.includes(n.user))
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
      // Tu luyện đông hơn sức chứa của tháp: ưu tiên người vừa hoạt động, hàng dưới lật trang (doi-hinh.ts `chonHien`).
      if (!tran && !cho && !tiThi && kiepUser === null && doiThat.length > 21) doiThat.splice(0, doiThat.length, ...chonHien(doiThat, now));
      const soNpcPhe = tran || cho || tiThi ? 0 : soNpc(the, phe, now);
      const laNpc = (n: NguoiChoi) => n.user.startsWith('npc_');
      // Đại Chiến: tiên phong đã bị hạ (hết máu, `tpRoi`) rời màn tới hết trận — không đứng lại trong hàng.
      const doi = tran
        ? pha.k === 'lu'
          ? doiThat.filter((n) => !pha.tpRoi.has(n.user))
          : doiThat
        : [...doiThat, ...npcCua(phe, soNpcPhe).filter((m) => !trenDai.includes(m.user))].sort((a, b) => b.canh - a.canh || (laNpc(a) ? 1 : 0) - (laNpc(b) ? 1 : 0));
      // Đại Chiến: Chủ Tướng tách khỏi hàng, vẽ riêng thật to.
      let chuN: NguoiChoi | null = null;
      if (pha.k === 'lu' && chu !== null && doi[0]?.user === chu) chuN = doi.shift()!;
      // Người đang ngã (hết máu, chờ vào lại) không tung chiêu, không làm đích.
      if (pha.k === 'lu') doiPk[phe] = doi.filter((n) => (nguoiNga.get(n.user) ?? 0) <= now).map((n) => n.user);
      if (tiThi) doi.splice(KHAN_GIA_TOI_DA);
      // Ghế trưởng môn (vị trí thủ môn): ai tặng quà giành ghế thì lên đầu đội hình, dù cảnh giới thấp (loi/truong-mon.ts).
      if (!tran && !cho && !tiThi) {
        const tm = truongMonCua(the, phe, now);
        const iTm = tm === null ? -1 : doi.findIndex((n) => n.user === tm.user);
        if (iTm > 0) doi.unshift(doi.splice(iTm, 1)[0]!);
      }
      const bc = banCo(doi.length, tran ? (lm === 'yeu' ? KHU_YEU[phe] : { ...KHU_TRAN[phe], tren: yChien(KHU_TRAN[phe].tren), oToiDa: 110 + 45 * noChien }) : cho ? (pha.k === 'tt' && pha.phe !== null ? KHU_CHO_MOT : KHU_CHO[phe]) : dai?.tran != null ? KHU_TI_THI : kiepUser !== null || coDai ? KHU_MOT_KIEP : { ...KHU_MOT, soDo: soDoLuc(now, phe === 'son' ? 0 : 1) });
      // Lúc tu luyện người đứng đầu tháp (hàng trên cùng, chỉ một ghế) ngồi ngai, cao hơn hẳn hàng dưới.
      const yDinh = bc.nguoi[0]?.y ?? -1;
      // Lúc có người độ kiếp thì chỉ người độ kiếp ngồi trên cao: đỉnh tháp hạ về chỗ cũ, cất ngai.
      const thapTu = !tran && !cho && kiepUser === null && !coDai;
      const nangO = (o: { y: number }) => (thapTu && Math.abs(o.y - yDinh) < 1 ? NANG_DINH : 0);
      // Tháp tu luyện: các hàng dưới ghế đỉnh thu nhỏ theo tỉ lệ (vị trí ghế giữ nguyên) để giữa các người có khoảng trống.
      const nhoO = (o: { y: number }) => (thapTu && Math.abs(o.y - yDinh) >= 1 ? DUOI_DINH : 1);
      // Tháp tu luyện: giãn đều các ghế dưới ra xa ghế đỉnh (cả ngang lẫn dọc) cho thoáng.
      if (thapTu && bc.nguoi.length > 1) {
        const d = bc.nguoi[0]!;
        bc.nguoi = bc.nguoi.map((o, i) => (i === 0 ? o : { ...o, x: d.x + (o.x - d.x) * GIAN_THAP, y: d.y + (o.y - d.y) * GIAN_DOC - KEO_LEN }));
      }
      // Không vẽ ô ghế dưới chân ở bất kỳ màn nào: người ngồi thẳng trên nền (người dùng bỏ các ô chữ nhật, 2026-11-19).
      doi.forEach((n, i) => {
        const o = bc.nguoi[i]!;
        // Đại Chiến: đang đơn đấu thì bước ra chỗ đấu giữa sân rồi lui về (`choDau`).
        const dd = pha.k === 'lu' ? choDau(n.user, now) : null;
        const ox = dd === null ? o.x : o.x + (dd.x - o.x) * dd.e;
        const oy = dd === null ? o.y - nangO(o) : o.y - nangO(o) + (dd.y - (o.y - nangO(o))) * dd.e;
        let p = hien.get(n.user);
        if (p === undefined) hien.set(n.user, (p = { x: ox, y: oy }));
        else {
          const k = Math.min(1, dt * 3);
          p.x += (ox - p.x) * k;
          p.y += (oy - p.y) * k;
        }
        con.add(n.user);
        const nhun = phe === 'thuy' && !tran ? Math.sin(t * 1.4 + o.cot + o.hang) * 4 : 0;
        // Danh hiệu: PK theo thứ tự trong trận. Tu luyện: NPC là "Trưởng lão"; đệ tử thật nhận danh hiệu
        // theo ghế khi ngồi ba ghế đầu, hoặc khi phe đã đủ người (không còn NPC).
        const dh = tiThi
          ? null
          : tran
          ? danhHieuChien(chuN !== null ? i + 1 : i, pha.k === 'lu' || pha.k === 'lu-ket')
          : cho
            ? null
            : laNpc(n)
            ? { chu: 'Trưởng lão', bac: 3 as const }
            : i <= 2 || soNpcPhe === 0
              ? danhHieu(phe, i)
              : null;
        const bien: Bien | null = dh === null ? null : { chu: dh.chu, hang: dh.bac, deNhat: n.user === deNhat };
        // Chức càng lớn ngồi càng to một chút; Chủ Tướng lúc PK to hẳn lên.
        const to = 1 + bacChuc(n.canh) * 0.05;
        datNguoi(
          n,
          p.x,
          p.y + nhun,
          bc.co * o.ti * to * nhoO(o),
          top.has(n.user) || now - (vuaLam.get(n.user) ?? 0) < 5000,
          bien,
          anhCua.get(n.user),
          t,
          false,
          // Đại Chiến: người trợ chiến cũng đứng dáng ra trận, hai phe đối mặt nhau (không ngồi thiền).
          pha.k === 'lu' || cho ? 'lu' : pha.k === 'yeu' ? 'yeu' : false,
        );
        // Ngai chỉ dành cho Chưởng Môn / Long Soái thật (trưởng lão NPC ngồi đỉnh thì không có ngai).
        if (nangO(o) > 0 && !laNpc(n)) nguoi.get(n.user)?.dom.classList.add('ngai');
        if (pha.k === 'lu') {
          // Thành viên tham chiến: thanh máu nhỏ trên đầu.
          const d = nguoi.get(n.user)?.dom;
          if (d !== undefined) {
            let b = d.querySelector<HTMLElement>(':scope > .sh-tv-hp');
            if (b === null) {
              b = document.createElement('i');
              b.className = 'sh-tv-hp';
              b.append(document.createElement('i'));
              d.append(b);
            }
            // Hết máu: ngã, mờ hẳn khỏi màn (`nga-pk`), BO_SUNG sau mới vào lại với máu đầy.
            const nga0 = (nguoiNga.get(n.user) ?? 0) > now;
            const m = mauVe(n.user, 0.06, nga0, dt, now);
            if (m <= 0 && !nga0) nguoiNga.set(n.user, now + BO_SUNG);
            const nga = (nguoiNga.get(n.user) ?? 0) > now;
            if (d.classList.contains('nga-pk') !== nga) d.classList.toggle('nga-pk', nga);
            (b.firstChild as HTMLElement).style.width = `${Math.round(m * 100)}%`;
          }
        } else nguoi.get(n.user)?.dom.classList.remove('nga-pk');
        if (pha.k === 'yeu') datMau(n.user, pha, now);
      });
      if (chuN !== null) {
        const c = choChu(phe);
        let p = hien.get(chuN.user);
        if (p === undefined) hien.set(chuN.user, (p = { x: c.x, y: c.y }));
        else {
          const k = Math.min(1, dt * 3);
          p.x += (c.x - p.x) * k;
          p.y += (c.y - p.y) * k;
        }
        con.add(chuN.user);
        datNguoi(chuN, p.x, p.y, CO_CHU, true, { chu: 'Chủ Tướng', hang: 1, deNhat: chuN.user === deNhat }, anhCua.get(chuN.user), t, false, 'lu');
      }
      // Tụ Linh Trận (chỉ lúc tu luyện): mỗi ghế nối mạch sáng lên ghế gần nhất ở hàng trên.
      if (!tran && !tiThi && bc.nguoi.length > 0) {
        machSvg.style.setProperty('--mau', PHE[phe].mauSang);
        dinhTran = { x: bc.nguoi[0]!.x, y: bc.nguoi[0]!.y - nangO(bc.nguoi[0]!) };
        // Đã tắt nét mạch nối các ghế (trông rối); bật lại bằng VE_MACH = true.
        const soNg = VE_MACH ? Math.min(doi.length, bc.nguoi.length) : 0;
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
          ln.setAttribute('y1', String(o.y - nangO(o) - 70));
          ln.setAttribute('x2', String(cha.x));
          ln.setAttribute('y2', String(cha.y - nangO(cha) - 30));
          ln.style.display = '';
          soMach++;
        }
      }
    }
    for (let i = soMach; i < machDs.length; i++) machDs[i]!.style.display = 'none';
    machSvg.classList.toggle('sang', now < machSang);
    for (const phe of ['son', 'thuy'] as const) {
      // Lá chắn ảo (chỉ để nhìn): chủ soái phe còn nhiều trận khí hơn (hơn ≥ 8%) cứ ~7 giây hiện lá chắn 2,4 giây.
      if (pha.k === 'lu') {
        const dich: Phe = phe === 'son' ? 'thuy' : 'son';
        const con = (x: Phe) => Math.max(0, pha.H - pha[x === 'son' ? 'thuy' : 'son']) / pha.H;
        const hon = con(phe) - con(dich) >= 0.08;
        const nhip = (now + (phe === 'son' ? 0 : 3_500)) % 7_000 < 2_400;
        document.querySelector(`.sh-dc-than.${phe}`)?.classList.toggle('la-chan', hon && nhip);
      }
      // Thế trận đám đông: phe đông người hơn có quân tăng viện và lấn dần sang (tối đa 60% nửa sân bên kia);
      // tiên phong vừa ngã, quân bị tiêu hao còn dưới 60% hay điểm tụt xa thì lui về thủ (lui nhanh hơn tiến).
      let soThem = 0;
      if (pha.k === 'lu') {
        const dich: Phe = phe === 'son' ? 'thuy' : 'son';
        const a = doiPk[phe].length + 1;
        const b = doiPk[dich].length + 1;
        const hon = Math.max(0, (a - b) / (a + b));
        soThem = Math.min(CHO_BINH_THEM, Math.ceil(hon * 2 * CHO_BINH_THEM));
        const lui = pha.chu[phe] === null || pha.qs[phe] < 0.6 || pha[phe] < pha[dich] * 0.8;
        // Không còn cả đội dồn lên / lui xuống cùng lúc — giao tranh là các cặp đơn đấu (`capNhatDau`).
        const dich_ = 0;
        tienQuan[phe] += (dich_ - tienQuan[phe]) * Math.min(1, dt * (dich_ < tienQuan[phe] ? 1.2 : 0.25));
      } else tienQuan[phe] = 0;
      const huong = phe === 'son' ? 1 : -1;
      let thu = 0;
      for (const b of binhDom[phe]) {
        const hien = pha.k === 'lu' && b.el.dataset['co'] === '1' && (!b.them || thu++ < soThem);
        b.el.style.display = hien ? '' : 'none';
        // Người đứng càng gần giữa sân càng xông xa (mũi nhọn tới 60% nửa sân bên kia).
        const xa = (tienQuan[phe] / TIEN_TOI_DA) * (540 + TIEN_TOI_DA * 540 - 340) * (0.55 + 0.45 * (Math.abs(b.hx - (phe === 'son' ? 0 : W)) / 340));
        // Đang đơn đấu thì bước ra chỗ đấu rồi lui về (`choDau`); đi mượt, không nhảy chỗ.
        const dd = choDau(b.id, now);
        const nhaX = b.hx + huong * xa;
        const nhaY = yChien(b.hy);
        const kb = Math.min(1, dt * 5);
        b.x += ((dd === null ? nhaX : nhaX + (dd.x - nhaX) * dd.e) - b.x) * kb;
        b.y += ((dd === null ? nhaY : nhaY + (dd.y - nhaY) * dd.e) - b.y) * kb;
        if (!hien) {
          b.x = nhaX;
          b.y = nhaY;
        }
        b.el.style.translate = `${Math.round(b.x - b.hx)}px ${Math.round(b.y - b.hy)}px`;
        // Thanh máu trên đầu lính: trúng đòn tụt, hồi chậm; bị hạ về 0, quân mới vào thì đầy lại.
        const m = mauVe(b.id, 0.22, (binhNga.get(b.id) ?? 0) > now, dt, now);
        // Hết máu thì ngã, vắng chỗ BO_SUNG rồi quân mới vào — không đứng trên màn với thanh máu cạn.
        if (m <= 0 && (binhNga.get(b.id) ?? 0) <= now) binhNga.set(b.id, now + BO_SUNG);
        b.hp.style.display = hien && m < 0.999 ? '' : 'none';
        b.hp.style.transform = `translate(${Math.round(b.x - 40)}px, ${Math.round(b.y - b.co - 6)}px)`;
        (b.hp.firstChild as HTMLElement).style.width = `${Math.round(m * 100)}%`;
        b.el.classList.toggle('bi-danh', (trungDen.get(b.id) ?? 0) > now);
        // Bị thiên thạch hạ: ngã, mờ hẳn; hết hạn thì quân mới tiến vào thay chỗ.
        const nga = binhNga.get(b.id) ?? 0;
        const dangNga = nga > now;
        if (b.el.classList.contains('nga') && !dangNga) {
          b.el.classList.remove('nga');
          b.el.classList.add('bo-sung');
          setTimeout(() => b.el.classList.remove('bo-sung'), 900);
        } else if (dangNga) b.el.classList.add('nga');
      }
    }
    // Kết trận Đại Chiến: linh thạch và sao nhỏ rơi liên tục từ trời xuống ĐÚNG ĐẦU NGƯỜI NHẬN (đệ tử đang hiện trên
    // màn) rồi tan vào người — như phân phát thưởng (người vận hành 2026-11-20). Tối đa MUA_THUONG_TOI_DA hạt cùng lúc.
    // Nhận ĐỦ phần (THUONG_LAN hạt) thì loé vàng rồi rời màn (`sh-ra-ve`), lần lượt từng người; nhịp rơi chia theo số
    // người để người cuối rời màn ngay trước khi hết màn kết — rồi lịch tự chuyển màn (người vận hành 2026-11-22: "ông
    // nào nhận đủ linh thạch thì out, xong chuyển map").
    if (pha.k === 'lu-ket' && thuongKet.den !== pha.den) {
      for (const u of thuongKet.xong) nguoi.get(u)?.dom.classList.remove('sh-ra-ve');
      thuongKet = { den: pha.den, bd: now, thu: [], da: new Map(), cham: new Map(), xong: new Set() };
      thuongKet.thu = [...hien.keys()].filter((u) => the.nguoi.get(u)?.phe != null).sort(() => Math.random() - 0.5);
    } else if (pha.k !== 'lu-ket' && thuongKet.den !== 0) {
      for (const u of thuongKet.xong) nguoi.get(u)?.dom.classList.remove('sh-ra-ve');
      thuongKet.den = 0;
    }
    const cuaThuong = Math.max(800, (pha.k === 'lu-ket' ? pha.den - thuongKet.bd : 0) - 3_000);
    const cachThuong = Math.max(70, cuaThuong / Math.max(1, thuongKet.thu.length * THUONG_LAN));
    if (pha.k === 'lu-ket' && now - muaThuongLuc > cachThuong && soMuaThuong < MUA_THUONG_TOI_DA && hien.size > 0) {
      muaThuongLuc = now;
      // Ba người đầu hàng chờ còn thiếu phần được rơi trước — người nhận xong rời màn, người sau vào lượt.
      const cho = thuongKet.thu.filter((u) => hien.has(u) && (thuongKet.da.get(u) ?? 0) < THUONG_LAN).slice(0, 3);
      const uChon = cho.length > 0 ? cho[Math.floor(Math.random() * cho.length)]! : null;
      const chon = uChon === null ? null : ([uChon, hien.get(uChon)!] as const);
      if (chon !== null) {
        const [u, o] = chon;
        thuongKet.da.set(u, (thuongKet.da.get(u) ?? 0) + 1);
        soMuaThuong++;
        const h = document.createElement('i');
        const kim = Math.random() < 0.45;
        h.className = `sh-mua-thuong ${kim ? 'kim' : 'sao'}`;
        h.textContent = kim ? '💎' : '✦';
        const x = o.x + (Math.random() - 0.5) * 40;
        const yDen = o.y - 60;
        const lau = 1.1 + (yDen / 1920) * 1.2;
        h.style.cssText = `left:${Math.round(x)}px;--co:${Math.round(kim ? 28 + Math.random() * 12 : 20 + Math.random() * 14)}px;--mau:${['#ffe08a', '#c9a8ff', '#8ff0ff', '#fff6d0'][Math.floor(Math.random() * 4)]}`;
        lop.append(h);
        h.animate(
          [
            { transform: 'translate(-50%, 0) scale(0.8) rotate(0deg)', opacity: 0 },
            { transform: 'translate(-50%, 80px) scale(1)', opacity: 1, offset: 0.08 },
            { transform: `translate(-50%, ${Math.round(yDen + 60)}px) scale(1) rotate(200deg)`, opacity: 1, offset: 0.85 },
            { transform: `translate(-50%, ${Math.round(yDen + 70)}px) scale(0.2) rotate(260deg)`, opacity: 0 },
          ],
          { duration: lau * 1000, easing: 'cubic-bezier(0.45, 0, 0.9, 0.7)', fill: 'forwards' },
        );
        setTimeout(() => {
          h.remove();
          soMuaThuong--;
          // Chạm người: nhân vật loé nhẹ màu thưởng.
          const d = nguoi.get(u)?.dom;
          if (d !== undefined && !d.classList.contains('sh-nhan-thuong')) {
            d.classList.add('sh-nhan-thuong');
            setTimeout(() => d.classList.remove('sh-nhan-thuong'), 500);
          }
          // Đủ phần: loé sao vàng rồi mờ khỏi màn.
          const cham = (thuongKet.cham.get(u) ?? 0) + 1;
          thuongKet.cham.set(u, cham);
          const pk = the0?.pha;
          if (cham >= THUONG_LAN && d !== undefined && pk?.k === 'lu-ket') {
            thuongKet.xong.add(u);
            const p = hien.get(u);
            const n = the0?.nguoi.get(u);
            if (p !== undefined && n?.phe != null) {
              // Bong bóng báo đủ phần nổi lên trên đầu (số linh thạch phe đó, kèm vật phẩm hiếm nếu có), rồi mới rời màn.
              chieuCp.vaCham(p.x, p.y - 80, '#ffe08a', 1.1);
              const hiem = pk.hiem.find((h) => h.ten === n.ten);
              const b = document.createElement('div');
              b.className = `sh-bong-thuong ${n.phe}`;
              b.innerHTML = `<b>✔ Đủ phần</b><span>+${pk.thuong[n.phe]} 💎</span>${hiem !== undefined ? `<em>🎁 ${hiem.vat}</em>` : ''}`;
              b.style.cssText = `left:${Math.round(p.x)}px;top:${Math.round(p.y - 230)}px`;
              lop.append(b);
              setTimeout(() => b.remove(), 1_700);
            }
            setTimeout(() => d.classList.add('sh-ra-ve'), 950);
          }
        }, lau * 1000);
      }
    }
    // Đại Chiến: núi bên trái dậy đá, mưa bên phải trút xuống — khí thế hai phe.
    if (pha.k === 'lu' && hat.dang < 5000) {
      for (let i = 0; i < 2; i++) {
        const q = tuManHinh(30 + Math.random() * 470, 1100 + Math.random() * 700, chieu);
        hat.phat(q.x, q.y, q.z, (Math.random() - 0.3) * 2.5, 4 + Math.random() * 6, 0, Math.random() < 0.6 ? '#c9a36a' : '#8fd19a', 0.3 + Math.random() * 0.35, 1.3);
      }
      for (let i = 0; i < 5; i++) {
        const q = tuManHinh(570 + Math.random() * 490, 200 + Math.random() * 1100, chieu);
        hat.phat(q.x, q.y, q.z, -2, -26 - Math.random() * 10, 0, '#a8e0ff', 0.14, 0.6);
      }
    }
    // Khách (tán tu): hàng phàm nhân ở đáy, người mới tương tác đứng giữa — ở tu luyện và cả Đại Chiến (người vận
    // hành 2026-11-20: tán tu ở Đại Chiến cũng ngồi một hàng cuối map, tặng quà / tim thì khích lệ sĩ khí).
    if ((lm === 'tu' && !tiThi) || pha.k === 'lu') {
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
    if (dai !== null && coDai) {
      const chiMot = trenDai.length === 1;
      trenDai.forEach((u, i) => {
        const n = nguoiDai(the, u, dai.phe);
        if (n === undefined) return;
        const c = chiMot ? CHO_DAI.giua : i === 0 ? CHO_DAI.trai : CHO_DAI.phai;
        let p = hien.get(u);
        if (p === undefined) hien.set(u, (p = { x: c.x, y: c.y }));
        else {
          const k = Math.min(1, dt * 3);
          p.x += (c.x - p.x) * k;
          p.y += (c.y - p.y) * k;
        }
        con.add(u);
        // Biển hạng Top Lôi Đài trên đầu đấu thủ (trưởng lão NPC không có hạng).
        const hg = hangCua(the, u);
        const bien: Bien | null = hg > 0 ? { chu: `Hạng ${hg}`, hang: hg <= 3 ? 1 : 2, deNhat: false } : null;
        datNguoi(n, p.x, p.y, chiMot ? CHO_DAI.coMot : CHO_DAI.co, true, bien, anhCua.get(u), t, false, 'lu');
        const x = nguoi.get(u);
        if (x === undefined) return;
        // Hai người cùng tông đối mặt: bên trái tiến sang phải, bên phải tiến sang trái; tranh quay mặt
        // ngược thì lật (tranh Sơn nhìn sang phải, tranh Thủy nhìn sang trái).
        const benPhai = !chiMot && i === 1;
        x.dom.style.setProperty('--huong', benPhai ? '-1' : '1');
        x.dom.classList.add('tren-dai');
        x.dom.classList.toggle('lat', !chiMot && (dai.phe === 'son') === benPhai);
        x.dom.style.zIndex = '4000';
      });
    }
    lop.classList.toggle('co-dai', coDai);
    lop.classList.toggle('ti-thi', tiThi);
    lop.classList.toggle('man-tu', lm === 'tu' && kiepUser === null && !tiThi);
    lop.classList.toggle('co-kiep', kiepUser !== null);
    lop.classList.toggle('danh-yeu', pha.k === 'yeu');
    lop.classList.toggle('pk', pha.k === 'lu');
    for (const phe of ['son', 'thuy'] as const) {
      // Khiên Thủ đang dựng (chưa bị phá) → vòm sáng màu phe; vừa kết trận Hồi → vòm xanh lục vài giây.
      const khien = pha.k === 'lu' && pha.tran.hl[phe].thu > now && pha.tran.hl[phe].vo <= now;
      vomDom[phe].classList.toggle('khien', khien);
      vomDom[phe].classList.toggle('hoi', pha.k === 'lu' && hoiDen[phe] > now);
      // Tướng tiên phong: thanh máu, bị thương thì ám đỏ.
      if (pha.k === 'lu') {
        const u = pha.chu[phe];
        const d = u === null ? undefined : nguoi.get(u)?.dom;
        if (d !== undefined) {
          let b = d.querySelector<HTMLDivElement>(':scope > .sh-hp');
          if (b === null) {
            b = document.createElement('div');
            b.className = 'sh-hp';
            b.append(document.createElement('i'), document.createElement('b'));
            d.append(b);
          }
          b.style.setProperty('--hp', String(pha.tp[phe].mau / 100));
          d.classList.toggle('tp-thuong', pha.tp[phe].thuong);
          d.classList.add('tien-phong');
        }
      }
    }
    lop.classList.toggle('chop-do', now - chopLuc < 450);
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
  /** Mưa thưởng lúc kết trận Đại Chiến: lần thả gần nhất, số hạt đang rơi. */
  let muaThuongLuc = 0;
  let soMuaThuong = 0;
  const MUA_THUONG_TOI_DA = 40;
  /** Mỗi người nhận bấy nhiêu hạt thưởng thì đủ phần, rời màn. */
  const THUONG_LAN = 3;
  /** Phân phát thưởng màn kết Đại Chiến: hàng chờ (`thu`), số hạt đã thả / đã chạm mỗi người, ai đã nhận đủ. */
  let thuongKet: { den: number; bd: number; thu: string[]; da: Map<string, number>; cham: Map<string, number>; xong: Set<string> } = {
    den: 0,
    bd: 0,
    thu: [],
    da: new Map(),
    cham: new Map(),
    xong: new Set(),
  };
  /** PK có ra có vào: ai vừa ra đòn / tiếp sức thì bước lên rồi lui về (user → lúc hết). */
  const xongDen = new Map<string, number>();
  /** Đội tinh binh và thú chiến mỗi phe (tranh `quan/<phe>.webp`), đứng sau Chủ Tướng lúc Đại Chiến. */
  /** Tinh binh: mỗi phe 5 chiến binh đơn lẻ (tranh `binh/<phe>-<1..4>.webp`, lặp lại kiểu) đứng so le hai
   *  hàng ở hai cánh, sau Chủ Tướng. Mỗi người thở lệch nhịp, tự tung chiêu, trúng chiêu thì rung riêng. */
  interface Binh {
    id: string;
    el: HTMLImageElement;
    x: number;
    y: number;
    co: number;
    /** Quân tăng viện (chỉ hiện ở phe đông hơn). */
    them: boolean;
    /** Chỗ đứng gốc (x là chỗ đứng hiện tại, đã cộng phần xông lên). */
    hx: number;
    /** y gốc (y hiện tại đã qua `yChien`). */
    hy: number;
    /** Thanh máu trên đầu. */
    hp: HTMLElement;
  }
  const CHO_BINH: readonly { x: number; y: number; co: number }[] = [
    // Hạ thấp 120px so với bản đầu: đội quân đứng hẳn dưới Chủ Tướng tiên phong, sát mép dưới khung.
    { x: 70, y: 1680, co: 190 },
    { x: 190, y: 1650, co: 175 },
    { x: 120, y: 1810, co: 200 },
    { x: 250, y: 1780, co: 185 },
    { x: 35, y: 1560, co: 165 },
    // Quân tăng viện: chỉ hiện ở phe đông người hơn (đông càng nhiều càng thêm).
    { x: 300, y: 1700, co: 170 },
    { x: 150, y: 1745, co: 180 },
    { x: 340, y: 1845, co: 190 },
    { x: 10, y: 1720, co: 175 },
  ];
  const CHO_BINH_THEM = 4;
  /** Phe đông lấn sang tối đa chừng này phần nửa sân bên kia. */
  const TIEN_TOI_DA = 0.6;
  const binhDom: Record<Phe, Binh[]> = { son: [], thuy: [] };
  for (const phe of ['son', 'thuy'] as const) {
    CHO_BINH.forEach((c, i) => {
      const el = document.createElement('img');
      el.className = `sh-binh ${phe}`;
      el.alt = '';
      el.style.display = 'none';
      el.dataset['co'] = '0';
      el.onload = () => (el.dataset['co'] = '1');
      el.src = asset(`binh/${phe}-${(i % 4) + 1}.webp`);
      const x = phe === 'son' ? c.x : W - c.x;
      el.style.cssText += `;left:${x - c.co / 2}px;top:${c.y - c.co}px;width:${c.co}px;height:${c.co}px;z-index:${Math.round(c.y)};animation-delay:${-i * 0.7}s`;
      lop.append(el);
      const hp = document.createElement('i');
      hp.className = `sh-binh-hp ${phe}`;
      hp.append(document.createElement('i'));
      lop.append(hp);
      binhDom[phe].push({ id: `binh:${phe}:${i}`, el, hp, x, hx: x, hy: c.y, y: c.y, co: c.co, them: i >= CHO_BINH.length - CHO_BINH_THEM });
    });
  }
  /** Thế trận đám đông mỗi phe (0..TIEN_TOI_DA): phe đông hơn lấn dần sang trận địa bên kia; bị dồn thì lui về. */
  const tienQuan: Record<Phe, number> = { son: 0, thuy: 0 };
  /** Người (hoặc đội quân) đang đứng hàng mỗi phe trong Đại Chiến. */
  const doiPk: Record<Phe, string[]> = { son: [], thuy: [] };
  /** Thế giới mới nhất (để chiêu bay tra tên công pháp). */
  let the0: The | null = null;
  let quanKe = 0;
  /** Người vừa trúng chiêu: rung và loé tới lúc nào. */
  const trungDen = new Map<string, number>();
  /** Chỗ đứng của đội tinh binh mỗi phe (khớp `.sh-quan` trong stage.css). */
  const CHO_QUAN: Record<Phe, { x: number; y: number }> = { son: { x: 170, y: 1590 }, thuy: { x: 910, y: 1590 } };
  const VUN: Record<Phe, string> = { son: '#c9a36a', thuy: '#d8f6ff' };
  /** Chiêu cơ bản bay chéo sang đội bên kia: từ người tung (hoặc đội quân) tới một người bên kia (hoặc đội
   *  quân bên kia). Trúng thì bung đá vụn / bọt nước, người trúng rung lên. Chỉ là hình — điểm trận do lõi tính. */
  function bayCheo(tuUser: string | null, phe: Phe, to = 1) {
    const dich: Phe = phe === 'son' ? 'thuy' : 'son';
    const o = tuUser === null ? undefined : hien.get(tuUser);
    const binhBan = o === undefined ? binhNgauNhien(phe) : null;
    if (binhBan !== null) {
      binhBan.el.classList.remove('tien');
      void binhBan.el.offsetWidth;
      binhBan.el.classList.add('tien');
    }
    const goc = o ?? (binhBan !== null ? { x: binhBan.x, y: binhBan.y - binhBan.co * 0.35 } : { x: CHO_QUAN[phe].x, y: CHO_QUAN[phe].y - 40 });
    const benKia = doiPk[dich];
    const nhamUser = benKia.length > 0 && Math.random() < 0.7 ? benKia[Math.floor(Math.random() * benKia.length)]! : null;
    const oDich = nhamUser === null ? undefined : hien.get(nhamUser);
    const binhDich = oDich === undefined ? binhNgauNhien(dich) : null;
    const toi = oDich ?? (binhDich !== null ? { x: binhDich.x, y: binhDich.y - binhDich.co * 0.3 } : { x: CHO_QUAN[dich].x, y: CHO_QUAN[dich].y - 40 });
    const mau = PHE[phe].mauSang;
    if (tuUser !== null) {
      xongDen.set(tuUser, Date.now() + XONG_NGAN);
      // Thỉnh thoảng hiện tên chiêu (công pháp người đó đang dùng, chưa có thì chiêu theo cảnh giới).
      const n = the0?.nguoi.get(tuUser);
      if (n !== undefined && o !== undefined && Math.random() < 0.18) {
        const ten = voCua(n).ten ?? chieuCua(phe, n.canh);
        boNoiChieu(o.x, o.y - 120, ten, mau);
        chieuRieng(ten, phe);
      }
    }
    // Chiêu bay sang bên kia: LUÔN là tranh chiêu thức (bỏ hẳn viên cầu sáng tròn — người vận hành 2026-11-22: "xấu").
    // Người đã học công pháp hệ Công / Phá tung tranh của môn đó; chưa học (hay tinh binh) tung chiêu nhập môn C1 của
    // tông. Công pháp Thủ / Máu: bùng tranh quanh người tung (thưa) rồi vẫn tung chiêu C1. Hết chỗ (TOI_DA) thì không
    // vẽ đường bay, chỉ để người bên kia trúng đòn.
    const x0 = goc.x;
    const y0 = goc.y - 70;
    const x1 = toi.x;
    const y1 = toi.y - 60;
    // Trúng: tia ✦ bung do chieu-cp.ts vẽ; không bung hạt tròn 3D nữa (dồn lại thành mảng sương trắng, chấm tròn).
    const trungDan = () => {
      if (nhamUser !== null) trungDen.set(nhamUser, Date.now() + 340);
      else if (binhDich !== null) trungDen.set(binhDich.id, Date.now() + 340);
    };
    const nTung = tuUser === null || o === undefined ? undefined : the0?.nguoi.get(tuUser);
    const soCp = nTung?.cp ?? 0;
    if (soCp > 0 && tuUser !== null && o !== undefined && loaiChieu(soCp) !== 'bay' && Date.now() - (cpQuanhLuc.get(tuUser) ?? 0) > CP_QUANH_CACH) {
      if (chieuCp.quanh(phe, soCp, o.x, o.y - 70, 0.7 + 0.25 * to)) cpQuanhLuc.set(tuUser, Date.now());
    }
    // Chiêu thường là BINH KHÍ NHỎ đúng món người đó đang đeo (phẩm 1–5; chưa đeo thì phẩm 1); tinh binh theo binh
    // khí trong tranh của mình. Thỉnh thoảng (25%) người có công pháp Công / Phá tung tranh công pháp thay vì binh khí.
    const cpBay = soCp > 0 && loaiChieu(soCp) === 'bay' && Math.random() < 0.25;
    const pham = nTung !== undefined ? (nTung.tb.vu?.pham ?? 0) + 1 : binhBan !== null ? VK_BINH[phe][Number(binhBan.id.split(':')[2]) % 4]! : 1;
    const ok = cpBay ? chieuCp.bay(phe, soCp, x0, y0, x1, y1, to * 0.85, trungDan) : chieuCp.binhKhi(phe, pham, x0, y0, x1, y1, to, trungDan);
    if (!ok) setTimeout(trungDan, 600);
  }
  /** Binh khí trong tranh tinh binh `binh/<phe>-1..4` → tranh binh khí nhỏ (phẩm): Sơn giáo · cung · rìu · nữ binh
   *  (cung) → dao găm 4 · cung 1 · rìu 3 · cung 2; Thủy đinh ba · lao · đao · song kiếm → 3 · 1 · 4 · 4. */
  const VK_BINH: Record<Phe, readonly number[]> = { son: [4, 1, 3, 2], thuy: [3, 1, 4, 4] };

  /** ĐƠN ĐẤU (người vận hành 2026-11-22: "không phải hai bên cùng tiến cùng lùi, phải đơn thể PK; kẻ đánh kẻ thủ,
   *  người đánh người lùi, đa dạng"): cùng lúc tối đa DAU_TOI_DA cặp, mỗi cặp một người / tinh binh Sơn và một bên
   *  Thủy bước ra giữa sân (`choDau`), đấu 4–6 giây rồi lui về hàng; cặp khác ra thay. Mỗi lượt có một bên giữ thế
   *  công (`ben`); kết quả bốc: trúng đòn (bên thủ bị đẩy lùi, loé đỏ), đỡ được (chớp sáng, đứng vững), né lùi, phản
   *  đòn (đổi thế công, bên công dính). Đường giao tranh (`mx`) xô qua lại theo thế trận. Chỉ là hình. */
  interface CapDau {
    son: string;
    thuy: string;
    bd: number;
    kt: number;
    mx0: number;
    mx: number;
    my: number;
    ke: number;
    ben: Phe;
    lui: Record<Phe, number>;
  }
  const capDau: CapDau[] = [];
  const DAU_TOI_DA = 3;
  const DAU_RA = 650;
  let dauKe = 0;
  const dangDau = (id: string) => capDau.some((c) => c.son === id || c.thuy === id);
  const binhTheoId = (id: string) => (id.startsWith('binh:') ? (binhDom.son.find((b) => b.id === id) ?? binhDom.thuy.find((b) => b.id === id)) : undefined);
  /** Còn đứng đánh được không (chưa ngã, còn trên màn). */
  const conDung = (id: string, now: number) => {
    const b = binhTheoId(id);
    if (b !== undefined) return b.el.style.display !== 'none' && (binhNga.get(id) ?? 0) <= now;
    return hien.has(id) && (nguoiNga.get(id) ?? 0) <= now;
  };
  const viTriId = (id: string): { x: number; y: number } | undefined => {
    const b = binhTheoId(id);
    return b !== undefined ? { x: b.x, y: b.y } : hien.get(id);
  };
  /** Chỗ đứng khi đang đấu (x, y chân) và mức đã bước ra (0 trong hàng … 1 tới chỗ đấu). */
  function choDau(id: string, now: number): { x: number; y: number; e: number } | null {
    const c = capDau.find((x) => x.son === id || x.thuy === id);
    if (c === undefined) return null;
    const v = Math.max(0, Math.min(1, (now - c.bd) / DAU_RA, (c.kt - now) / DAU_RA));
    const e = v * v * (3 - 2 * v);
    const phe: Phe = c.son === id ? 'son' : 'thuy';
    return { x: c.mx + (phe === 'son' ? -1 : 1) * (64 + c.lui[phe]), y: c.my, e };
  }
  /** Ứng viên ra đấu của một phe: người trợ chiến (ưu tiên) hoặc tinh binh đang đứng, chưa đấu. */
  function ungVien(phe: Phe, now: number): string | null {
    const nguoiDs = doiPk[phe].filter((u) => !dangDau(u) && conDung(u, now));
    const binhDs = binhDom[phe].filter((b) => !dangDau(b.id) && conDung(b.id, now)).map((b) => b.id);
    const ds = nguoiDs.length > 0 && (binhDs.length === 0 || Math.random() < 0.65) ? nguoiDs : binhDs;
    return ds.length === 0 ? null : ds[Math.floor(Math.random() * ds.length)]!;
  }
  /** Bên `id` ra đòn: người thì bước lên (`xongDen`), tinh binh thì dấn tới (`tien`). */
  function raDon(id: string, now: number) {
    const b = binhTheoId(id);
    if (b === undefined) {
      xongDen.set(id, now + XONG_NGAN);
      return;
    }
    b.el.classList.remove('tien');
    void b.el.offsetWidth;
    b.el.classList.add('tien');
  }
  function phamCua(id: string, phe: Phe): number {
    const b = binhTheoId(id);
    if (b !== undefined) return VK_BINH[phe][Number(b.id.split(':')[2]) % 4]!;
    return (the0?.nguoi.get(id)?.tb.vu?.pham ?? 0) + 1;
  }
  function luotDau(c: CapDau, now: number) {
    const cong = c.ben;
    const thu: Phe = cong === 'son' ? 'thuy' : 'son';
    const idCong = c[cong];
    const idThu = c[thu];
    const pc = viTriId(idCong);
    const pt = viTriId(idThu);
    if (pc === undefined || pt === undefined) return;
    const huong = cong === 'son' ? 1 : -1;
    const r = Math.random();
    const giua = { x: (pc.x + pt.x) / 2, y: (pc.y + pt.y) / 2 - 80 };
    raDon(idCong, now);
    if (r < 0.42) {
      // Trúng: bên thủ loé đỏ, bị đẩy lùi; đường giao tranh dồn về phía bên thủ.
      trungDen.set(idThu, now + 360);
      c.lui[thu] = Math.min(90, c.lui[thu] + 34);
      c.mx += huong * 26;
      if (Math.random() < 0.5) chieuCp.binhKhi(cong, phamCua(idCong, cong), pc.x, pc.y - 90, pt.x, pt.y - 80, 0.7, () => {});
      else chieuCp.vaCham(giua.x + huong * 20, giua.y, PHE[cong].mauSang, 0.9);
    } else if (r < 0.68) {
      // Đỡ: chớp sáng trắng lam ở giữa, bên thủ đứng vững.
      chieuCp.vaCham(giua.x, giua.y, '#e8f6ff', 1.1);
      c.mx += huong * 8;
      if (Math.random() < 0.3) boNoiChieu(pt.x, pt.y - 210, '🛡 Đỡ!', '#cfe9ff');
    } else if (r < 0.84) {
      // Né: bên thủ nhảy lùi, đòn trượt.
      c.lui[thu] = Math.min(110, c.lui[thu] + 70);
      chieuCp.vaCham(giua.x + huong * 30, giua.y + 10, '#ffffff', 0.6);
      if (Math.random() < 0.3) boNoiChieu(pt.x, pt.y - 210, '💨 Né!', '#ffffff');
    } else {
      // Phản đòn: bên thủ đánh trả ngay, giành thế công.
      setTimeout(() => {
        raDon(idThu, Date.now());
        trungDen.set(idCong, Date.now() + 360);
        c.lui[cong] = Math.min(90, c.lui[cong] + 30);
        c.mx -= huong * 22;
        chieuCp.vaCham(giua.x - huong * 20, giua.y, PHE[thu].mauSang, 1);
        if (Math.random() < 0.35) boNoiChieu(pt.x, pt.y - 210, '⚡ Phản đòn!', PHE[thu].mauSang);
      }, 220);
      c.ben = thu;
    }
    if (r < 0.84 && Math.random() < 0.3) c.ben = thu;
    c.mx = Math.max(c.mx0 - 120, Math.min(c.mx0 + 120, c.mx));
  }
  /** Mỗi khung (chỉ lúc Đại Chiến): kết thúc cặp hết giờ / có người ngã, đánh lượt, mở cặp mới. */
  function capNhatDau(now: number, dt: number) {
    for (let i = capDau.length - 1; i >= 0; i--) {
      const c = capDau[i]!;
      if (now >= c.kt) {
        capDau.splice(i, 1);
        continue;
      }
      // Có bên ngã giữa chừng: cặp tan, bên còn lại lui về.
      if ((!conDung(c.son, now) || !conDung(c.thuy, now)) && c.kt - now > DAU_RA) c.kt = now + DAU_RA;
      c.lui.son *= Math.max(0, 1 - dt * 1.6);
      c.lui.thuy *= Math.max(0, 1 - dt * 1.6);
      const daRa = now - c.bd > DAU_RA && c.kt - now > DAU_RA;
      if (daRa && now >= c.ke) {
        luotDau(c, now);
        c.ke = now + 480 + Math.random() * 460;
      }
    }
    if (capDau.length < DAU_TOI_DA && now >= dauKe) {
      dauKe = now + 700 + Math.random() * 900;
      const a = ungVien('son', now);
      const b = ungVien('thuy', now);
      if (a === null || b === null) return;
      const pa = viTriId(a);
      const pb = viTriId(b);
      if (pa === undefined || pb === undefined) return;
      // Chỗ đấu: giữa sân, cao độ trung bình hai người, không sát cặp khác.
      let my = Math.max(1400, Math.min(1720, (pa.y + pb.y) / 2));
      for (let k = 0; k < 6 && capDau.some((c) => Math.abs(c.my - my) < 120); k++) my = 1400 + Math.random() * 320;
      const mx0 = 540 + (Math.random() - 0.5) * 180;
      const lau = 4_000 + Math.random() * 2_000;
      capDau.push({ son: a, thuy: b, bd: now, kt: now + lau, mx0, mx: mx0, my, ke: now + DAU_RA + 150, ben: Math.random() < 0.5 ? 'son' : 'thuy', lui: { son: 0, thuy: 0 } });
    }
  }
  /** Tranh chiêu công pháp `so` của `user` tung sang chủ tướng bên kia (chiêu bay) hoặc bùng quanh người (Thủ, Máu).
   *  Dùng cho đòn Chủ Tướng, tiên phong, lượt gõ 1–4, quà ra chiêu và Tuyệt Kỹ (`uu`: không bị giới hạn số tranh). */
  function tungChieuCp(user: string, phe: Phe, so: number, to: number, uu = false): boolean {
    const o = hien.get(user);
    const pha = the0?.pha;
    if (o === undefined || pha?.k !== 'lu') return false;
    const loai = loaiChieu(so);
    if (loai === null) return false;
    if (loai !== 'bay') return chieuCp.quanh(phe, so, o.x, o.y - 90, to * 0.8, uu);
    const kia: Phe = phe === 'son' ? 'thuy' : 'son';
    const cu = pha.chu[kia];
    const ds = doiPk[kia];
    // Đích: chủ tướng bên kia (đòn to), không có thì một người bên kia, không nữa thì đội quân.
    const dichU = cu ?? (ds.length > 0 ? ds[Math.floor(Math.random() * ds.length)]! : null);
    const od = dichU === null ? undefined : hien.get(dichU);
    const tx = od?.x ?? CHO_QUAN[kia].x;
    const ty = (od?.y ?? CHO_QUAN[kia].y) - 90;
    xongDen.set(user, Date.now() + XONG_CHU);
    return chieuCp.bay(
      phe,
      so,
      o.x,
      o.y - 110,
      tx,
      ty,
      to,
      () => {
        if (dichU !== null) trungDen.set(dichU, Date.now() + 420);
        if (to >= 2) bloom.strength = Math.max(bloom.strength, 1.8);
      },
      uu,
    );
  }
  /** Phe ra đòn: các chiến binh dấn lên, lệch nhịp nhau một chút. */
  function quanTien(phe: Phe) {
    binhDom[phe].forEach((b, i) => {
      setTimeout(() => {
        b.el.classList.remove('tien');
        void b.el.offsetWidth;
        b.el.classList.add('tien');
      }, i * 60);
    });
  }
  /** Một chiến binh đang hiện của phe (để tung chiêu hoặc làm đích), hoặc null nếu chưa có tranh. */
  /** Chiêu diện rộng SƠN BĂNG ĐỊA LIỆT: mưa thiên thạch. Đá lửa kéo đuôi rơi chéo từ phía núi xuống khắp trận
   *  địa bên kia, chạm đất nổ tung, đá vụn bắn lên, đất rung; người, quân bên kia trúng thì loé đỏ. Mỗi 4,5 giây
   *  tối đa một trận mưa (chiêu ra liên tục thì các lần sau chỉ hiện tên). */
  /** Bốc ngẫu nhiên vài quân (đang đứng) của một phe làm nạn nhân của chiêu diện rộng. */
  function bocNanNhan(phe: Phe, it = 1, nhieu = 3): Set<string> {
    const ds = binhDom[phe].filter((b) => b.el.style.display !== 'none' && (binhNga.get(b.id) ?? 0) <= Date.now());
    for (let i = ds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ds[i], ds[j]] = [ds[j]!, ds[i]!];
    }
    return new Set(ds.slice(0, it + Math.floor(Math.random() * (nhieu - it + 1))).map((b) => b.id));
  }
  /** Máu hiển thị của từng thành viên tham chiến (chỉ để nhìn): trúng đòn (trungDen mới) thì trừ `tru`, hồi
   *  MAU_HOI mỗi giây; đang ngã thì 0. */
  const mauHien = new Map<string, { m: number; trung: number; cho: boolean }>();
  /** Người trợ chiến Đại Chiến hết máu: ngã, rời màn tới lúc nào (sau đó vào lại, máu đầy). */
  const nguoiNga = new Map<string, number>();
  const MAU_HOI = 0.05;
  /** Thanh máu hiển thị: trúng đòn tụt `tru`, hồi chậm. Về 0 thì trả 0 để nơi gọi cho ngã (rời màn); đang ngã giữ 0;
   *  hết ngã (quân mới / người vào lại) thì đầy lại. */
  function mauVe(id: string, tru: number, nga: boolean, dt: number, now: number): number {
    const x = mauHien.get(id) ?? { m: 1, trung: 0, cho: false };
    if (nga) {
      x.m = 0;
      x.cho = true;
      mauHien.set(id, x);
      return 0;
    }
    if (x.cho) {
      x.cho = false;
      x.m = 1;
    }
    const td = trungDen.get(id) ?? 0;
    if (td > now && td !== x.trung) {
      x.trung = td;
      x.m = Math.max(0, x.m - tru);
    }
    if (x.m > 0) x.m = Math.min(1, x.m + MAU_HOI * dt);
    mauHien.set(id, x);
    return x.m;
  }
  let lanThienThach = 0;
  /** Quân bị hạ tới lúc nào (sau đó bổ sung quân mới). */
  const binhNga = new Map<string, number>();
  const BO_SUNG = 5_000;
  function thienThach(phe: Phe, ep = false) {
    const bay = Date.now();
    if (!ep && bay - lanThienThach < 4_500) return;
    lanThienThach = bay;
    const dich: Phe = phe === 'son' ? 'thuy' : 'son';
    const huong = phe === 'son' ? 1 : -1;
    const [xMin, xMax] = dich === 'thuy' ? [560, 1040] : [40, 520];
    boNoiChieu(540, 940, '☄️ SƠN BĂNG ĐỊA LIỆT', '#ffb070');
    lop.classList.remove('dong-dat');
    void lop.offsetWidth;
    lop.classList.add('dong-dat');
    setTimeout(() => lop.classList.remove('dong-dat'), 1_700);
    // Đích: ưu tiên người, quân bên kia; còn lại rải đều trận địa.
    const ds: { x: number; y: number }[] = [];
    for (const u of doiPk[dich]) {
      const o = hien.get(u);
      if (o !== undefined) ds.push({ x: o.x, y: o.y - 40 });
    }
    for (const b of binhDom[dich]) if (b.el.style.display !== 'none' && !b.el.classList.contains('nga')) ds.push({ x: b.x, y: b.y - b.co * 0.3 });
    // Không phải cả đội ngã: mỗi trận mưa chỉ 1–3 quân (bốc ngẫu nhiên) dính đòn, số còn lại né được.
    const nanNhan = bocNanNhan(dich);
    const SO = 14;
    for (let i = 0; i < SO; i++) {
      const toi =
        i < ds.length && Math.random() < 0.8
          ? ds[i]!
          : { x: xMin + Math.random() * (xMax - xMin), y: 1380 + Math.random() * 420 };
      const co = 60 + Math.random() * 55;
      const x0 = toi.x - huong * (520 + Math.random() * 260);
      const y0 = toi.y - 1150 - Math.random() * 200;
      const goc = (Math.atan2(toi.y - y0, toi.x - x0) * 180) / Math.PI;
      const tre = i * 85 + Math.random() * 90;
      setTimeout(() => {
        const da = document.createElement('i');
        da.className = 'sh-tt-da';
        da.style.setProperty('--co', `${Math.round(co)}px`);
        lop.append(da);
        const lau = 560 + Math.random() * 160;
        da.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) rotate(${goc}deg) scale(0.7)` },
            { transform: `translate(${toi.x}px, ${toi.y}px) rotate(${goc}deg) scale(1.1)` },
          ],
          { duration: lau, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' },
        ).onfinish = () => {
          da.remove();
          const no = document.createElement('i');
          no.className = 'sh-dan-no son tt';
          no.style.cssText = `--co:${Math.round(co * 2.6)}px;left:${toi.x}px;top:${toi.y}px`;
          lop.append(no);
          setTimeout(() => no.remove(), 700);
          const ho = document.createElement('i');
          ho.className = 'sh-tt-ho';
          ho.style.cssText = `--co:${Math.round(co * 2.2)}px;left:${toi.x}px;top:${toi.y + co * 0.25}px`;
          lop.append(ho);
          setTimeout(() => ho.remove(), 900);
          hat.no(tuManHinh(toi.x, toi.y, new THREE.Vector3()), '#c9a36a', 26, 14, 0.7, 0.9);
          // Ai đứng gần chỗ đá rơi thì trúng.
          for (const u of doiPk[dich]) {
            const o = hien.get(u);
            if (o !== undefined && Math.hypot(o.x - toi.x, o.y - 40 - toi.y) < 140) trungDen.set(u, Date.now() + 340);
          }
          // Quân trúng đá: ngã xuống (tiêu hao), BO_SUNG sau bên đó bổ sung quân mới.
          for (const b of binhDom[dich]) {
            if (!nanNhan.has(b.id) || Math.hypot(b.x - toi.x, b.y - b.co * 0.3 - toi.y) > 170 || (binhNga.get(b.id) ?? 0) > Date.now()) continue;
            binhNga.set(b.id, Date.now() + BO_SUNG);
          }
        };
      }, tre);
    }
    bloom.strength = 2.4;
  }

  /** Chiêu diện rộng BĂNG PHONG VẠN LÝ (Thủy Tông): hàn khí phủ trận địa bên kia thành lớp băng giá, quân trúng hoá băng xanh trắng rồi vỡ vụn ngã xuống (BO_SUNG sau
   *  bổ sung); người bên kia trúng thì loé lạnh. */
  function dongBang(phe: Phe, ep = false) {
    const bay = Date.now();
    if (!ep && bay - lanThienThach < 4_500) return;
    lanThienThach = bay;
    const dich: Phe = phe === 'son' ? 'thuy' : 'son';
    const [xMin, xMax] = dich === 'son' ? [20, 540] : [540, 1060];
    boNoiChieu(540, 940, '❄️ BĂNG PHONG VẠN LÝ', '#bff3ff');
    // Lớp băng giá phủ cả trận địa bên kia.
    const bang = document.createElement('i');
    bang.className = `sh-bang ${dich}`;
    lop.append(bang);
    setTimeout(() => bang.remove(), 2_400);
    const nanNhan = bocNanNhan(dich);
    const cho: { x: number; y: number; id: string | null }[] = [];
    for (const b of binhDom[dich]) if (nanNhan.has(b.id)) cho.push({ x: b.x, y: b.y, id: b.id });
    while (cho.length < 9) cho.push({ x: xMin + 30 + Math.random() * (xMax - xMin - 60), y: 1420 + Math.random() * 400, id: null });
    cho.forEach((c, i) => {
      setTimeout(() => {
        // (Đã bỏ cụm gai băng trồi lên — người vận hành 2026-11-22: "xấu"; chỉ còn hàn khí và quân hoá băng.)
        hat.no(tuManHinh(c.x, c.y - 40, new THREE.Vector3()), '#dff8ff', 22, 10, 0.6, 0.9);
        if (c.id !== null) {
          const b = binhDom[dich].find((x) => x.id === c.id);
          if (b !== undefined) {
            b.el.classList.add('dong-bang');
            setTimeout(() => {
              b.el.classList.remove('dong-bang');
              if ((binhNga.get(b.id) ?? 0) <= Date.now()) binhNga.set(b.id, Date.now() + BO_SUNG);
            }, 800);
          }
        }
      }, 250 + i * 70);
    });
    for (const u of doiPk[dich]) setTimeout(() => trungDen.set(u, Date.now() + 400), 400);
    bloom.strength = 2.2;
  }

  /** Gọi thần thú hộ tông hiện SAU LƯNG chủ soái của phe (trong lớp sân Đại Chiến, chèn trước tranh thần nên bị
   *  thần che phía trước), ló ra phía ngoài vai, nghiêng 10° về phía địch. `kieu`: 'dap' chồm lên dậm xuống hai
   *  lần, 'ho' ngẩng đầu hô. */
  function goiThu(phe: Phe, cons: readonly string[], lau: number, kieu: 'dap' | 'ho') {
    const san = document.querySelector<HTMLElement>('.sh-dc-san');
    if (san === null) return;
    cons.forEach((con, i) => {
      const el = document.createElement('img');
      el.className = `sh-thu-sau ${phe} ${kieu}`;
      el.alt = '';
      el.src = asset(`than-thu/${con}-2.webp`);
      el.style.setProperty('--lau', `${lau}ms`);
      el.style.setProperty('--lech', `${i * 150}px`);
      el.style.setProperty('--tre', `${i * 160}ms`);
      san.prepend(el);
      setTimeout(() => el.remove(), lau + i * 160 + 100);
    });
  }

  /** Đòn riêng của tướng tiên phong: tranh chiêu công pháp người đó đang dùng; chưa học môn nào thì chiêu nhập môn
   *  theo CĂN CƠ (Chiến Tướng C1 · Hộ Vệ C2 · Y Sư C3 · Phá Quân C4 của tông). Y Sư: phe mình loé hồi xanh lục. */
  function tpChieu(user: string, phe: Phe, cc: keyof typeof CAN_CO | null, bao: boolean) {
    if (!hien.has(user)) return;
    const cp = the0?.nguoi.get(user)?.cp ?? 0;
    const loai = cc ?? 'tuong';
    const so = cp > 0 ? cp : loai === 've' ? 2 : loai === 'y' ? 3 : loai === 'quan' ? 4 : 1;
    tungChieuCp(user, phe, so, bao ? 1.9 : 1.5, true);
    if (loai === 'y') {
      for (const b of binhDom[phe].slice(0, 5)) hat.no(tuManHinh(b.x, b.y - b.co * 0.4, new THREE.Vector3()), '#9fffb8', 8, 6, 0.5, 0.7);
    }
  }

  /** THẦN THÚ ĐẠP TRẬN (Sơn Tinh gọi thần thú hộ sơn): Voi Chín Ngà và Ngựa Chín Hồng Mao phi ngang qua trận
   *  địa bên kia, giày xéo — bụi tung, đất rung, quân nằm trên đường chạy bị hất ngã. */
  function thuDap(phe: Phe) {
    const dich: Phe = phe === 'son' ? 'thuy' : 'son';
    boNoiChieu(540, 940, '🐘 THẦN THÚ ĐẠP TRẬN', '#ffd77a');
    lop.classList.remove('dong-dat');
    void lop.offsetWidth;
    lop.classList.add('dong-dat');
    setTimeout(() => lop.classList.remove('dong-dat'), 1_700);
    const nan = bocNanNhan(dich);
    // Thần thú hiện SAU LƯNG chủ soái phe mình (không chạy ra trước mặt), chồm nghiêng 10° về phía địch rồi dậm
    // xuống hai lần; mỗi lần dậm một đợt sóng chấn động lan khắp trận địa bên kia.
    goiThu(phe, ['voi'], 2_400, 'dap');
    const [xMin, xMax] = dich === 'thuy' ? [560, 1040] : [40, 520];
    for (const lan of [700, 1_350]) {
      setTimeout(() => {
        lop.classList.remove('dong-dat');
        void lop.offsetWidth;
        lop.classList.add('dong-dat');
        for (let i = 0; i < 5; i++) {
          const x = xMin + 40 + Math.random() * (xMax - xMin - 80);
          const y = 1420 + Math.random() * 380;
          const no = document.createElement('i');
          no.className = 'sh-tt-ho';
          no.style.cssText = `--co:260px;left:${x}px;top:${y}px`;
          lop.append(no);
          setTimeout(() => no.remove(), 900);
          hat.no(tuManHinh(x, y - 20, new THREE.Vector3()), '#c9a36a', 20, 14, 0.7, 0.9);
        }
      }, lan);
    }
    setTimeout(() => lop.classList.remove('dong-dat'), 3_000);
    for (const id of nan) setTimeout(() => ((binhNga.get(id) ?? 0) <= Date.now() ? binhNga.set(id, Date.now() + BO_SUNG) : null), 750 + Math.random() * 700);
    for (const u of doiPk[dich]) setTimeout(() => trungDen.set(u, Date.now() + 400), 800);
    bloom.strength = 2.3;
  }

  /** HÔ PHONG HOÁN VŨ (Thủy Tinh gọi thần thú hộ cung): Kim Quy hiện trên trận địa bên kia, mây đen kéo tới, mưa
   *  trút, sấm chớp giáng liên hồi xuống; quân trúng sét thì ngã. */
  function phongVu(phe: Phe) {
    const dich: Phe = phe === 'son' ? 'thuy' : 'son';
    const [xMin, xMax] = dich === 'son' ? [20, 540] : [540, 1060];
    boNoiChieu(540, 940, '⛈️ HÔ PHONG HOÁN VŨ', '#bfe9ff');
    const may = document.createElement('i');
    may.className = `sh-phong-vu ${dich}`;
    lop.append(may);
    setTimeout(() => may.remove(), 2_800);
    // Kim Quy hiện SAU LƯNG chủ soái phe mình, nghiêng 10° về phía địch mà hô mưa gọi gió.
    goiThu(phe, ['rua'], 2_800, 'ho');
    const nan = [...bocNanNhan(dich)];
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const b = i < nan.length ? binhDom[dich].find((x) => x.id === nan[i]) : undefined;
        const x = b?.x ?? xMin + 40 + Math.random() * (xMax - xMin - 80);
        const yDat = b !== undefined ? b.y - b.co * 0.3 : 1450 + Math.random() * 380;
        let d = `M ${x + (Math.random() - 0.5) * 100} 1230`;
        for (let y = 1290; y < yDat; y += 60) d += ` L ${x + (Math.random() - 0.5) * 70} ${y}`;
        d += ` L ${x} ${yDat}`;
        const el = document.createElement('i');
        el.className = 'sh-ct-set tran';
        el.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920"><path d="${d}" fill="none" stroke="#c9b6ff" stroke-width="8" stroke-linejoin="round" opacity="0.5"/><path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
        lop.append(el);
        setTimeout(() => el.remove(), 520);
        const no = document.createElement('i');
        no.className = 'sh-dan-no thuy tt';
        no.style.cssText = `--co:120px;left:${x}px;top:${yDat}px`;
        lop.append(no);
        setTimeout(() => no.remove(), 700);
        if (b !== undefined && (binhNga.get(b.id) ?? 0) <= Date.now()) binhNga.set(b.id, Date.now() + BO_SUNG);
      }, 500 + i * 230);
    }
    for (const u of doiPk[dich]) setTimeout(() => trungDen.set(u, Date.now() + 400), 900);
    bloom.strength = 2.3;
  }

  /** CHIÊU CỦA HAI CHỦ SOÁI: mỗi đòn thường một chiêu, luân phiên ba chiêu — tranh chiêu thức công pháp tối thượng
   *  của tông (`assets/chieu/`), bay từ tay thần sang ngực thần bên kia. [số công pháp, kiểu dính chiêu, trễ ms].
   *  (Bản cũ vẽ sét, giọt nước, mũi băng, đá, cầu lửa bằng DOM — người vận hành 2026-11-22 chê xấu, đã bỏ.) */
  const CHIEU_THAN: Record<Phe, readonly (readonly [number, string, number])[]> = {
    son: [[9, 'da', 700], [8, 'set', 650], [5, 'da', 650]],
    thuy: [[9, 'nuoc', 700], [8, 'set', 650], [4, 'nuoc', 650]],
  };
  const luotThan: Record<Phe, number> = { son: 0, thuy: 0 };
  const tenThanLuc: Record<Phe, number> = { son: 0, thuy: 0 };
  /** Ngực vị thần mỗi phe trên khung (đích của chiêu bên kia) và mặt đất dưới chân. */
  const NGUC_THAN: Record<Phe, { x: number; y: number }> = { son: { x: 215, y: 800 }, thuy: { x: 865, y: 800 } };
  const CHAN_THAN_Y = 1130;
  function chieuThan(phe: Phe, bao: boolean) {
    const san = document.querySelector<HTMLElement>('.sh-dc-san') ?? lop;
    const dich: Phe = phe === 'son' ? 'thuy' : 'son';
    const tu = { x: phe === 'son' ? TAY_SON_X : TAY_THUY_X, y: TAY_Y };
    const toi = NGUC_THAN[dich];
    const k = luotThan[phe]++ % 3;
    // Chiêu của chủ soái phải LỚN: tranh chiêu thức tối thượng của tông, bạo kích còn to hơn.
    const to = bao ? 2.7 : 2.1;
    const [so, loai, tre] = CHIEU_THAN[phe][k]!;
    // Vị thần bên kia DÍNH CHIÊU: phản ứng theo loại chiêu (sét giật, nước xô, đá chấn động).
    setTimeout(() => {
      const than = document.querySelector<HTMLElement>(`.sh-dc-than.${dich}`);
      if (than === null) return;
      for (const c of [...than.classList]) if (c.startsWith('trung-')) than.classList.remove(c);
      void than.offsetWidth;
      than.classList.add(`trung-${loai}`);
      setTimeout(() => than.classList.remove(`trung-${loai}`), 600);
    }, tre);
    // Tên chiêu chữ lớn phía trên vị thần ra chiêu (mỗi phe cách nhau ít nhất 2,2 giây cho khỏi dồn chữ).
    if (Date.now() - tenThanLuc[phe] > 2_200) {
      tenThanLuc[phe] = Date.now();
      const ten = document.createElement('i');
      ten.className = `sh-ct-ten ${phe}`;
      ten.textContent = CONG_PHAP[so - 1]!.ten[phe];
      san.append(ten);
      setTimeout(() => ten.remove(), 2_000);
    }
    chieuCp.bay(
      phe,
      so,
      tu.x,
      tu.y,
      toi.x,
      toi.y,
      to,
      () => {
        if (loai === 'da') {
          lop.classList.remove('dong-dat');
          void lop.offsetWidth;
          lop.classList.add('dong-dat');
        }
      },
      true,
    );
  }

  /** Chiêu có hiệu ứng riêng (theo tên chiêu hiện trên màn). */
  function chieuRieng(_ten: string, _phe: Phe) {
    // Chiêu diện rộng giờ do lõi quyết theo nhịp trận (sự kiện `dien-rong`) để có tiêu hao thật; tên chiêu hiện
    // trên đầu người chơi chỉ là nhãn.
  }

  /** Lớp bóng trên trận địa một phe: khiên Thủ (vòm sáng cản bớt sát thương) và vòm Hồi (xanh lục). */
  const vomDom: Record<Phe, HTMLElement> = { son: document.createElement('i'), thuy: document.createElement('i') };
  for (const phe of ['son', 'thuy'] as const) {
    vomDom[phe].className = `sh-vom ${phe}`;
    lop.append(vomDom[phe]);
  }
  const hoiDen: Record<Phe, number> = { son: 0, thuy: 0 };
  /** Chữ lớn giữa chiến trường cho biến cố của trận (tiên phong bị hạ, hi sinh…). */
  function bienCo(chu: string, phu: string, mau: string) {
    const el = document.createElement('div');
    el.className = 'sh-bien-co';
    el.style.setProperty('--mau', mau);
    const b = document.createElement('b');
    b.textContent = chu;
    const sm = document.createElement('small');
    sm.textContent = phu;
    el.append(b, sm);
    lop.append(el);
    setTimeout(() => el.remove(), 2_600);
  }

  function binhNgauNhien(phe: Phe): Binh | null {
    const ds = binhDom[phe].filter((b) => b.el.dataset['co'] === '1');
    return ds.length === 0 ? null : ds[Math.floor(Math.random() * ds.length)]!;
  }
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
  /** Thanh máu dưới chân người chơi lúc đánh yêu tinh (máu ×3), dấu ngã / trọng thương, nhãn buff. */
  function datMau(u: string, pha: Extract<Pha, { k: 'yeu' }>, now: number) {
    const d = nguoi.get(u)?.dom;
    if (d === undefined) return;
    let b = d.querySelector<HTMLDivElement>(':scope > .sh-hp');
    if (b === null) {
      b = document.createElement('div');
      b.className = 'sh-hp';
      b.append(document.createElement('i'), document.createElement('b'));
      d.append(b);
    }
    const hp = pha.hp.get(u) ?? MAU_YEU_NGUOI;
    b.style.setProperty('--hp', String(hp / MAU_YEU_NGUOI));
    const bf = buffCua(pha, u, now);
    const nhan = b.lastElementChild as HTMLElement;
    const chu = bf > 0 ? `💪+${bf}%` : '';
    if (nhan.textContent !== chu) nhan.textContent = chu;
    d.classList.toggle('nga', pha.nga.has(u));
    d.classList.toggle('roi-tran', pha.roi.has(u));
    d.classList.toggle('buff', bf > 0);
  }

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

  /** Mua / đổi món (đan dược, công pháp, linh thú, trang phục): món đó rơi từ trên xuống đầu người mua như một pháp
   *  bảo nhỏ — vệt sáng, xoay nhẹ, chạm người thì loé một vòng sáng. `anh` thiếu thì hiện `hinh` (emoji). */
  /** Món rơi chạm người sau bấy nhiêu ms (khớp keyframes `sh-roi-vat2`: 32% của 2,5 giây). */
  const ROI_CHAM = 800;
  /** Lúc món chạm người: nhân vật loé sáng màu món (`sh-hap`), đổi áo thì loé trắng mạnh (`doi-ao`). */
  function hapMon(n: NguoiChoi, mau: string, doiAo: boolean) {
    setTimeout(() => {
      const d = theNguoi(n).dom;
      d.classList.remove('sh-hap', 'doi-ao');
      void d.offsetWidth;
      d.style.setProperty('--mau-hap', mau);
      d.classList.add('sh-hap');
      if (doiAo) d.classList.add('doi-ao');
      setTimeout(() => d.classList.remove('sh-hap', 'doi-ao'), 1300);
    }, ROI_CHAM);
  }

  /** Dùng đan dược: lúc viên đan chạm người, trên nhân vật hiện hiệu ứng hợp công dụng viên đan (~2,6 giây):
   *  linh khí đan → khí xanh xoáy từ chân lên đầu · Phá Cảnh → cột sáng vàng bùng · Bạo Khí → lửa đỏ bốc quanh thân ·
   *  Kim Cương → khiên cầu lam vàng · Hồi Hồn → hồn hỏa tím lượn · Hộ Kiếp → vầng hào quang vàng trên đầu. */
  function hieuUngDan(n: NguoiChoi, so: number) {
    const m = DAN[so - 1];
    if (m === undefined) return;
    const d = m.dung;
    const kieu = 'lk' in d ? 'khi' : 'day' in d ? 'pha' : d.tran === 'cong' ? 'bao' : d.tran === 'thu' ? 'kim' : d.tran === 'hon' ? 'hon' : 'kiep';
    setTimeout(() => {
      const dom = theNguoi(n).dom;
      dom.querySelector(':scope > .sh-dan-hq')?.remove();
      const el = document.createElement('div');
      el.className = `sh-dan-hq dan-${kieu}`;
      for (let i = 0; i < 8; i++) {
        const h = document.createElement('i');
        h.style.setProperty('--x', `${Math.round(-38 + ((i * 37) % 76))}%`);
        h.style.setProperty('--tre', `${(i * 0.17).toFixed(2)}s`);
        el.append(h);
      }
      dom.append(el);
      setTimeout(() => el.remove(), 2700);
    }, ROI_CHAM);
  }

  function roiMon(x: number, y: number, anh: string | null, hinh: string, mau: string, ketQua: string) {
    if (soNoi >= 8) return;
    soNoi++;
    const el = document.createElement('div');
    el.className = 'sh-roi';
    el.style.setProperty('--mau', mau);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--cao', `${Math.max(260, y - 620)}px`);
    const vat = document.createElement('i');
    vat.textContent = hinh;
    if (anh !== null) {
      const im = document.createElement('img');
      im.alt = '';
      im.onload = () => vat.classList.add('co-anh');
      im.onerror = () => im.remove();
      im.src = anh;
      vat.append(im);
    }
    const vong = document.createElement('b');
    // Kết quả dùng món ("+25 linh khí", "đòn +8%"…) bật ra khi món tan vào người.
    const kq = document.createElement('em');
    kq.textContent = ketQua;
    // Cột sáng nhỏ từ trên rọi xuống đúng lúc chạm người.
    const cot = document.createElement('s');
    el.append(cot, vat, vong, kq);
    lop.append(el);
    setTimeout(() => {
      el.remove();
      soNoi--;
    }, 2600);
  }

  /** Dựng một lượt cảnh thử: tranh dáng chiến (đúng bộ áo), dáng ngồi bộ mới / bộ cũ, tên món, công dụng. */
  function xepCanhThu(user: string, loai: 'c' | 't', so: number, tenMon: string, the: The) {
    const n = the.nguoi.get(user);
    if (n === undefined || n.phe === null) return;
    if (loaiMan(the.pha) !== 'tu' || tiThiMo(the) || the.pha.k === 'kiep' || the.pha.k === 'kiep-ket') return;
    const phe = n.phe;
    const aoMoi = loai === 't' ? so : n.ao;
    const aoCu = aoDaVe.get(user) ?? n.ao;
    const chienAo = duongChienAo(phe, n.gioi, aoMoi);
    // Võ Trường: ảnh động ĐÚNG ĐỘNG TÁC của công pháp và ĐÚNG BỘ ÁO đang mặc — `-dong-cong` (Công / Phá: Sơn giương cung
    // bắn, Thủy phóng lao), `-dong-thu` (Thủ: dựng khiên), `-dong-hoi` (Máu: vận khí hồi) — khung ChatGPT ghép bằng
    // `cong-cu/khung-dong.py`. Bộ chưa có ảnh động đúng động tác thì đứng tranh tĩnh (không mượn động tác khác).
    // Phòng Thử Đồ: tranh dáng chiến tĩnh của bộ mới.
    const he = loai === 'c' ? CONG_PHAP[so - 1]?.he : undefined;
    const dongTac = he === 've' ? 'thu' : he === 'y' ? 'hoi' : 'cong';
    const anhChien =
      (chienAo !== null ? ((loai === 'c' ? tranh.nv.get(`${chienAo}-dong-${dongTac}.webp`) : undefined) ?? tranh.nv.get(`${chienAo}.webp`)) : undefined) ??
      tranh.nv.get(`nhan-vat/chien-${phe}-${n.gioi ?? (phe === 'son' ? 'nam' : 'nu')}.webp`);
    sanThu.them({
      loai: loai === 'c' ? 'vo' : 'ao',
      user,
      ten: n.ten,
      phe,
      so,
      tenMon,
      moTa: loai === 'c' ? (CONG_PHAP[so - 1]?.mo ?? '') : '',
      anhChien,
      anhNgoi: tranhCanh(tranh.nv, phe, n.gioi, n.canh, aoMoi),
      anhNgoiCu: tranhCanh(tranh.nv, phe, n.gioi, n.canh, aoCu),
    });
  }

  function su(s: Su, the: The, now: number) {
    const t = now / 1000;
    if ('user' in s) vuaLam.set(s.user, now);
    // Mua / đổi công pháp hay trang phục lúc tu luyện: xếp lượt cảnh thử (cả người tông không tới lượt cũng được thử).
    if (s.k === 'mua' && (s.loai === 'c' || s.loai === 't')) xepCanhThu(s.user, s.loai, s.so, s.ten, the);
    // Người không có mặt trên màn (khách ngoài hàng, phe đang không tới lượt): không vẽ hiệu ứng —
    // nếu vẽ thì nó rơi về một điểm mặc định giữa đáy khung, thành vòng sáng vô nghĩa.
    const kiepU = the.pha.k === 'kiep' || the.pha.k === 'kiep-ket' ? the.pha.user : null;
    if ('user' in s && s.user !== kiepU && !hien.has(s.user)) return;
    const p = 'user' in s ? viTriTheo(the, s.user, t) : null;
    switch (s.k) {
      case 'tran-len': {
        // Trận phe lên cấp: mạch bừng sáng lâu, cột sáng và vòng lớn ở đỉnh trận.
        machSang = now + 3_000;
        if (dinhTran !== null) {
          const d = tuManHinh(dinhTran.x, dinhTran.y - 60, new THREE.Vector3());
          hu.cotSang(d.clone().add(new THREE.Vector3(0, -4, 0)), '#ffe9a0', 2);
          hu.vongSong(d, PHE[s.phe].mauSang, 40);
          hat.no(d, '#ffe9a0', 200, 26, 1, 1.8);
        }
        bloom.strength = 2.6;
        break;
      }
      case 'ld-don': {
        // Lôi Đài: người ra đòn bước lên, người trúng rung đỏ, số máu bay; chiêu (tuyệt kỹ, bạo kích) hiện tên.
        const a = hien.get(s.tu);
        const b = hien.get(s.toi);
        if (a === undefined || b === undefined) break;
        xongDen.set(s.tu, now + XONG_NGAN);
        trungDen.set(s.toi, now + 340);
        const to = s.chieu !== null;
        const dich = tuManHinh(b.x, b.y - 130, new THREE.Vector3());
        hat.no(dich, to ? '#ffd27a' : '#fff2c4', to ? 70 : 12, to ? 20 : 7, 0.6, to ? 1.4 : 0.7);
        hu.chuBay(dich.clone().add(new THREE.Vector3(0, 3, 0)), `−${s.dmg}`, to ? '#ffb36a' : '#fff2c4', to ? 1.3 : 0.85);
        if (s.chieu !== null) boNoiChieu(a.x, a.y - 300, s.chieu, '#ffe08a');
        break;
      }
      case 'cu-diem': {
        // Cứ điểm đổi chủ: cột sáng màu phe ở cứ điểm (dọc giữa sân), tên người chiếm.
        const y = [920, 1290, 1660][s.i] ?? 1290;
        const d = tuManHinh(540, y - 40, new THREE.Vector3());
        hu.cotSang(d, PHE[s.phe].mauSang, 1);
        hat.no(d, PHE[s.phe].mauSang, 90, 18, 0.9, 1.3);
        const n = the.nguoi.get(s.user);
        boNoiChieu(540, y - 110, `🚩 ${n?.ten ?? ''} chiếm cứ điểm`, PHE[s.phe].mauSang);
        break;
      }
      case 'vien-binh': {
        const c = choChu(s.phe);
        const n = the.nguoi.get(s.user);
        // Bỏ cột sáng dọc (người vận hành 2026-11-20: "bỏ bớt cột sáng dọc ở Đại Chiến").
        boNoiChieu(c.x, c.y - 330, `${s.bac === 2 ? '⚔️ Tướng' : '🛡 Viện binh'} ${n?.ten ?? ''}`, '#ffe08a');
        for (let i = 0; i < (s.bac === 2 ? 5 : 3); i++) setTimeout(() => bayCheo(null, s.phe, s.bac === 2 ? 1.5 : 1), i * 140);
        break;
      }
      case 'vien-don': {
        if (the.pha.k === 'lu') bayCheo(null, s.phe, s.bac === 2 ? 1.5 : 0.9);
        break;
      }
      case 'than-don': {
        // Thần của tông ra tay: mưa chiêu lớn toàn sân, loé sáng.
        const n = the.nguoi.get(s.user);
        boNoiChieu(540, yChien(1450) - 200, `⚡ THẦN RA TAY · ${n?.ten ?? ''}`, PHE[s.phe].mauSang);
        for (let i = 0; i < 9; i++) setTimeout(() => bayCheo(null, s.phe, 2.4), i * 110);
        bloom.strength = 2.8;
        break;
      }
      case 'truong-mon': {
        // Có người tặng quà lên ghế trưởng môn: cột sáng ở ghế thủ môn, chữ báo.
        const n = the.nguoi.get(s.user);
        const d = tuManHinh(540, KHU_MOT.tren - 40, new THREE.Vector3());
        hu.cotSang(d, PHE[s.phe].mauSang, 2);
        hat.no(d, '#ffd77a', 120, 20, 1, 1.4);
        boNoiChieu(540, KHU_MOT.tren - 260, `👑 ${n?.ten ?? ''} ${s.cuop ? 'giành ghế' : 'lên ghế'} ${danhHieu(s.phe, 0)?.chu ?? 'Trưởng môn'}`, '#ffe08a');
        break;
      }
      case 'tan-tu': {
        // Tán tu đánh thuê: một viên chiêu bay từ phía phe được giúp sang bên kia, kèm tên tán tu.
        if (the.pha.k !== 'lu') break;
        bayCheo(null, s.phe, 0.9);
        const c = choChu(s.phe);
        if (Math.random() < 0.5) boNoiChieu(c.x + (Math.random() - 0.5) * 300, c.y - 200 - Math.random() * 200, `⚔ Tán tu ${s.ten}`, '#e8e0d0');
        break;
      }
      case 'ld-si-khi': {
        // Sĩ khí chạm mốc: đấu thủ bước lên gầm, lửa khí thế bùng quanh người, tên mốc bay lên.
        const a = hien.get(s.user);
        if (a === undefined) break;
        xongDen.set(s.user, now + XONG_NGAN);
        const d = tuManHinh(a.x, a.y - 150, new THREE.Vector3());
        hu.cotSang(d.clone().add(new THREE.Vector3(0, -2, 0)), '#ff9a3a', 1);
        hat.no(d, '#ffb347', 70, 16, 0.8, 1.3);
        boNoiChieu(a.x, a.y - 330, `🔥 ${s.ten}`, '#ffb347');
        break;
      }
      case 'ld-ket': {
        const w = hien.get(s.thang);
        if (w === undefined) break;
        const d = tuManHinh(w.x, w.y - 150, new THREE.Vector3());
        hu.cotSang(d, '#ffe9a0', s.lenHang !== null ? 2 : 1);
        hat.no(d, '#ffe9a0', s.lenHang !== null ? 160 : 60, 20, 1, 1.4);
        break;
      }
      case 'tim-moc': {
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 4, 0)), `${s.moc} tim · +${s.thach} linh thạch`, '#ff9ac0', 0.8);
        hat.no(p!, '#ff7aa8', 26, 8, 0.6, 1);
        break;
      }
      case 'hoc-vo': {
        hu.cotSang(p!.clone().add(new THREE.Vector3(0, -2, 0)), '#c8a0ff', 1);
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 4, 0)), `${s.ten} tầng ${s.tang}`, '#e0c8ff', 0.8);
        break;
      }
      case 'mua': {
        // Món vừa mua / vừa đổi rơi từ trên xuống đầu người đó (tranh vp/<mã>-<tông>.webp; linh thú vp/P<n>.webp).
        {
          const o = hien.get(s.user);
          const nm = the.nguoi.get(s.user);
          if (o !== undefined && nm !== undefined) {
            const anhMon =
              s.loai === 'p' ? asset(`vp/P${s.so}.webp`) : (s.loai === 'd' || s.loai === 'c') && nm.phe !== null ? asset(`vp/${s.loai.toUpperCase()}${s.so}-${nm.phe}.webp`) : null;
            const mauMon = s.loai === 'd' ? '#9fffb8' : s.loai === 'c' ? '#e0c8ff' : s.loai === 'p' ? '#9fd8ff' : '#ffe9a0';
            const ketQua =
              s.loai === 'd'
                ? (DAN[s.so - 1]?.mo.split(' · từ')[0] ?? '')
                : s.loai === 'c'
                  ? `📜 ${CONG_PHAP[s.so - 1]?.mo ?? ''}`
                  : s.loai === 'p'
                    ? `🐾 công thủ +${Math.round((PET[s.so - 1]?.phan ?? 0) * 100)}%`
                    : `👘 ${s.ten}`;
            if (s.loai === 't') aoCho.set(s.user, { cu: aoDaVe.get(s.user) ?? 0, den: Date.now() + ROI_CHAM });
            roiMon(o.x, o.y - 120, anhMon, s.loai === 'd' ? '💊' : s.loai === 'c' ? '📜' : s.loai === 'p' ? '🐾' : '👘', mauMon, ketQua);
            hapMon(nm, mauMon, s.loai === 't');
            if (s.loai === 'd') hieuUngDan(nm, s.so);
          }
        }
        // Mua ở Tàng Bảo Các / Thành Trì: tên món bay lên trên đầu người mua.
        if (!s.moi) break;
        const mau = s.loai === 'd' ? '#9fffb8' : s.loai === 'c' ? '#e0c8ff' : '#ffe9a0';
        // Không vẽ cột sáng 3D (người vận hành 2026-11-20: chỉ giữ món rơi xuống + nhân vật loé sáng).
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 4, 0)), `${s.loai === 'd' ? '💊' : s.loai === 'c' ? '📜' : '✨'} ${s.ten}`, mau, 0.85);
        break;
      }
      case 'hd': {
        // Hoạt động tu luyện: hạt sáng quanh người và chữ kết quả bay lên.
        if (p === undefined || p === null) break;
        const mau = s.loai === 'hai' ? '#9fffb8' : s.loai === 'co-duyen' ? '#ffe08a' : '#9fd8ff';
        hat.no(p, mau, s.hiem ? 60 : 18, s.hiem ? 14 : 6, 0.6, s.hiem ? 1.6 : 0.9);
        hu.chuBay(p.clone().add(new THREE.Vector3(0, 4, 0)), s.chu, mau, s.hiem ? 1 : 0.7);
        break;
      }
      case 'luyen-dan': {
        hat.no(p!, '#9fffb8', 30, 8, 0.6, 1);
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 4, 0)), `Tụ Khí Đan +${s.lk}`, '#9fffb8', 0.8);
        break;
      }
      case 'truyen-cong': {
        // Quà truyền công: linh khí bay từ người tặng xuống từng đệ tử phía dưới, mỗi người "+N ⚡".
        const o = hien.get(s.user);
        if (o !== undefined) boNoiChieu(o.x, o.y - 150, `🎁 Truyền công · ${s.nhan.length} đệ tử +${s.lk} ⚡`, '#9fffb8');
        for (const u of s.nhan) {
          const d = hien.get(u);
          if (d === undefined) continue;
          const dich = tuManHinh(d.x, d.y - 40, new THREE.Vector3());
          hu.phong(p!, dich, '#9fffb8', 0.5, 1, () => hu.chuBay(dich.clone().add(new THREE.Vector3(0, 3, 0)), `+${s.lk} ⚡`, '#9fffb8', 0.7));
        }
        break;
      }
      case 'nhanh-len': {
        hu.cotSang(p!.clone().add(new THREE.Vector3(0, -2, 0)), '#ffd24c', 1);
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 4, 0)), `Nhánh trận cấp ${s.cap}`, '#ffd24c', 0.8);
        break;
      }
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
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 5, 0)), `⚡ ${CANH_GIOI[s.canh]?.ten ?? 'Đột phá'}`, mau, 1);
        break;
      }
      case 'trung': {
        const n = the.nguoi.get(s.user);
        const phe: Phe = n?.phe ?? 'son';
        const pha = the.pha;
        if (pha.k !== 'yeu') break;
        const dmg = s.dmg;
        const bao = s.bao;
        const truot = s.truot;
        const user = s.user;
        const tu = p!;
        // Nhiều người ra tay cùng một nhịp luật (250 ms) thì trễ lệch nhau một chút — cả đội không vung tay
        // đều tăm tắp như máy. Lấy đà xong (XONG_DA) tên / lao mới rời tay.
        const tre = Math.random() * 220;
        setTimeout(() => {
          xongDen.set(user, Date.now() + (bao ? 720 : XONG_YEU));
          setTimeout(() => {
            const dich = thanYeu();
            hu.phong(tu, dich, PHE[phe].mauSang, 0.45, bao ? 2 : 1.3, () => {
              if (truot) {
                hu.chuBay(dich, 'trượt!', '#d6b8ff', 0.9);
                return;
              }
              trungLuc = Date.now() / 1000;
              hat.no(dich, bao ? '#ff8a5a' : PHE[phe].mauSang, bao ? 40 : 16, bao ? 20 : 10, 0.6, 0.7);
              hu.chuBay(dich, bao ? `BẠO KÍCH ${dmg}` : `−${dmg}`, bao ? '#ff6a3a' : '#fff2c4', bao ? 1.4 : 1);
            });
          }, XONG_DA);
        }, tre);
        break;
      }
      case 'day': {
        // Chiêu thức bay từ đội hình lên điểm va giữa hai thần; cú nặng (công cao) to và sáng hơn.
        const mau = PHE[s.phe].mauSang;
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        // Người tiếp sức tung chiêu thẳng vào đội hình bên kia; cú nặng (công cao) to và sáng hơn.
        xongDen.set(s.user, now + XONG_NGAN);
        bayCheo(s.user, s.phe, 1 + (s.luc - 1) * 0.8);
        const n = the.nguoi.get(s.user);
        const o = hien.get(s.user);
        if (n !== undefined && o !== undefined && (s.luc >= 1.3 || Math.random() < 0.12)) {
          boNoiChieu(o.x, o.y - 120, voCua(n).ten ?? chieuCua(s.phe, n.canh), mau);
        }
        break;
      }
      case 'dien-rong': {
        // Chiêu diện rộng của một phe (lõi quyết theo nhịp trận): mưa thiên thạch / sóng thần xuống trận địa bên
        // kia; bên kia có khiên thì khiên loé lên đỡ.
        if (s.chieu.includes('Thần Thú')) thuDap(s.phe);
        else if (s.chieu.includes('Hô Phong')) phongVu(s.phe);
        else if (s.phe === 'son') thienThach('son', true);
        else dongBang('thuy', true);
        {
          // Bảng nhỏ trên trận địa bên trúng: trận khí mất và bốn căn cơ đã góp (công / phá / thủ / hồi).
          const dich: Phe = s.phe === 'son' ? 'thuy' : 'son';
          // Dòng đầu: trận khí mất. Sau đó: trận pháp CẢ PHE HÔ (viền vàng), rồi căn cơ BỊ ĐỘNG (viền mờ).
          const tran = s.tran;
          const hô: string[] = [];
          if (tran?.cong === true) hô.push('⚔ Trận Công ×1,3');
          if (tran?.pha === true) hô.push('💥 Trận Phá vỡ khiên');
          if (tran?.thu === true) hô.push('🛡 Trận Thủ đỡ 60%');
          if (tran?.hoi === true) hô.push('💚 Trận Hồi hồi 50%');
          const bd: string[] = [];
          if ((s.cong ?? 0) > 0) bd.push(`Chiến Tướng +${s.cong}%`);
          if (s.xuyen === true) bd.push('Phá Quân xuyên khiên');
          if ((s.do ?? 0) > 0) bd.push(`Hộ Vệ đỡ ${s.do}%`);
          if ((s.hoi ?? 0) > 0) bd.push(`Y Sư hồi ${s.hoi}%`);
          const el = document.createElement('div');
          el.className = `sh-dr-so ${dich}`;
          el.innerHTML =
            ((s.tru ?? 0) > 0 ? `<b>−${s.tru}% trận khí</b>` : '<b class="tron">Đỡ trọn!</b>') +
            hô.map((x) => `<span class="ho">${x}</span>`).join('') +
            bd.map((x) => `<span>${x}</span>`).join('');
          lop.append(el);
          setTimeout(() => el.remove(), 2_600);
        }
        if (s.quy === true) {
          // Kim Quy hiện sau lưng Thủy Tinh, dựng khiên mai rùa trên trận địa Thủy Tông hấp thụ sát thương.
          goiThu('thuy', ['rua'], 2_200, 'ho');
          vomDom.thuy.classList.remove('quy');
          void vomDom.thuy.offsetWidth;
          vomDom.thuy.classList.add('quy');
          setTimeout(() => vomDom.thuy.classList.remove('quy'), 2_200);
          boNoiChieu(800, 1300, '🐢 Kim Quy Thần Thuẫn — hấp thụ!', '#ffe08a');
        }
        if (s.chan) {
          const dich: Phe = s.phe === 'son' ? 'thuy' : 'son';
          vomDom[dich].classList.remove('do');
          void vomDom[dich].offsetWidth;
          vomDom[dich].classList.add('do');
          boNoiChieu(dich === 'son' ? 280 : 800, 1300, '🛡 Khiên đỡ!', '#bff3ff');
        }
        break;
      }
      case 'than-chieu': {
        // Chủ soái phòng ngự / hồi phục: tên chiêu chữ lớn trên đầu, khiên lục giác quanh thân hoặc quầng hồi phục
        // bốc lên; trận địa phía dưới có vòm tương ứng.
        const san = document.querySelector<HTMLElement>('.sh-dc-san') ?? lop;
        const ten = document.createElement('i');
        ten.className = `sh-ct-ten ${s.phe} ${s.loai}`;
        ten.textContent = s.ten;
        san.append(ten);
        setTimeout(() => ten.remove(), 2_000);
        // Phòng ngự: không vẽ vòm — chính vị thần sáng viền ôm sát thân trong 5 giây.
        if (s.loai === 'thu') {
          const than = document.querySelector<HTMLElement>(`.sh-dc-than.${s.phe}`);
          than?.classList.add('khien');
          setTimeout(() => than?.classList.remove('khien'), 5_000);
        }
        const fx = document.createElement('i');
        fx.className = `sh-than-${s.loai} ${s.phe}`;
        if (s.loai === 'hoi' && s.so > 0) fx.dataset['so'] = `+${s.so}`;
        san.append(fx);
        setTimeout(() => fx.remove(), s.loai === 'thu' ? 5_000 : 2_200);
        if (s.loai === 'hoi') hoiDen[s.phe] = now + 2_600;
        break;
      }
      case 'canh-bao': {
        // Nhắc phe sắp dính chiêu diện rộng: biển đỏ trên trận địa phe đó, đếm ngược, "gõ thủ".
        const el = document.createElement('div');
        el.className = `sh-canh-bao ${s.phe}`;
        const giay = Math.max(1, Math.round(s.con / 1000));
        el.innerHTML = `<b>⚠ Sắp dính chiêu lớn!</b><span>Gõ <kbd>2</kbd> để thủ</span><i style="--giay:${giay}s"></i>`;
        lop.append(el);
        setTimeout(() => el.remove(), s.con + 200);
        break;
      }
      case 'tp-thuong': {
        const o = hien.get(s.user);
        if (o !== undefined) boNoiChieu(o.x, o.y - 260, '🩸 Tiên phong bị thương!', '#ff8a8a');
        break;
      }
      case 'tp-ha': {
        const o = hien.get(s.user);
        const ten = the.nguoi.get(s.user)?.ten ?? 'Tiên phong';
        const dich: Phe = s.phe === 'son' ? 'thuy' : 'son';
        if (s.hiSinh) {
          bienCo('ĐÒN HI SINH!', `${ten} liều mình vì ${PHE[s.phe].tenNgan}`, '#ffd24c');
          // Luồng sáng vàng từ tiên phong lao sang giữa trận địa bên kia, nổ lớn.
          const tu = tuManHinh(o?.x ?? choChu(s.phe).x, (o?.y ?? choChu(s.phe).y) - 120, new THREE.Vector3());
          const toi = tuManHinh(choChu(dich).x + (dich === 'thuy' ? 120 : -120), choChu(dich).y - 60, new THREE.Vector3());
          hu.phong(tu, toi, '#fff2c4', 1.6, 3, () => {
            hat.no(toi, '#ffd24c', 260, 34, 1, 1.8);
            hu.vongSong(toi, '#ffd24c', 44);
            // Đòn hi sinh nặng hơn chiêu thường: 3–4 quân ngã.
            for (const id of bocNanNhan(dich, 3, 4)) binhNga.set(id, Date.now() + BO_SUNG);
          });
          bloom.strength = 3;
        } else {
          bienCo('TIÊN PHONG BỊ HẠ!', `${ten} · ${s.phe === 'son' ? 'Sơn Tinh' : 'Thủy Tinh'} nổi giận`, PHE[s.phe].mauSang);
          if (o !== undefined) hat.no(tuManHinh(o.x, o.y - 100, new THREE.Vector3()), '#ff6a5a', 90, 18, 0.8, 1.2);
          bloom.strength = 2.4;
        }
        lop.classList.remove('dong-dat');
        void lop.offsetWidth;
        lop.classList.add('dong-dat');
        setTimeout(() => lop.classList.remove('dong-dat'), 1_700);
        break;
      }
      case 'tp-thay': {
        if (s.ai === null) {
          bienCo(`${s.phe === 'son' ? 'SƠN TINH' : 'THỦY TINH'} XUẤT TRẬN`, `${PHE[s.phe].tenNgan} hết tướng — chủ soái tự chiến`, PHE[s.phe].mauSang);
          break;
        }
        const ten = the.nguoi.get(s.ai)?.ten ?? '';
        {
          // Thẻ ra trận của tiên phong mới: tên, căn cơ, chiêu (công pháp đang dùng, chưa có thì theo cảnh giới).
          const n = the.nguoi.get(s.ai);
          if (n !== undefined) {
            const cc = n.canCo ?? 'tuong';
            const the_ = document.createElement('div');
            the_.className = `sh-tp-the ${s.phe} ${cc}`;
            the_.innerHTML = `<small>⚔ Tiên phong ${PHE[s.phe].tenNgan}</small><b></b><span></span>`;
            the_.querySelector('b')!.textContent = n.ten;
            the_.querySelector('span')!.textContent = `${CAN_CO[cc].hinh} ${CAN_CO[cc].ten} · ${voCua(n).ten ?? chieuCua(s.phe, n.canh)}`;
            lop.append(the_);
            setTimeout(() => the_.remove(), 3_200);
          }
        }
        boNoiChieu(choChu(s.phe).x, choChu(s.phe).y - 300, `⚔ ${ten} lên thay tiên phong!`, PHE[s.phe].mauSang);
        // Bỏ cột sáng dọc (người vận hành 2026-11-20: "bỏ bớt cột sáng dọc ở Đại Chiến").
        break;
      }
      case 'ky-nang': {
        if (s.ky === 'hoi') hoiDen[s.phe] = now + 2_600;
        if (s.nguon === 'qua' && s.ai !== null) {
          const o = hien.get(s.ai);
          if (o !== undefined) bopHuyQua(o.x, o.y - 230, 'tran');
        }
        // Kết trận pháp: vòng sáng màu phe nổ ở điểm va (Đại Chiến) hoặc quanh yêu tinh.
        const pha = the.pha;
        const mau = PHE[s.phe].mauSang;
        const tam = pha.k === 'lu' ? tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3()) : thanYeu();
        hu.vongSong(tam, mau, 28);
        // Bỏ cột sáng dọc (người vận hành 2026-11-20: "bỏ bớt cột sáng dọc ở Đại Chiến").
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
        // Tên chiêu của yêu tinh nổi to ngay trên đầu nó.
        boNoiChieu(CHO_YEU.x, CHO_YEU.y + CHO_YEU.co * 0.3, `👹 ${s.chieu}`, mau);
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
      case 'bao-chieu': {
        // Yêu tinh tụ chiêu lớn: vòng tà khí co về thân, tên chiêu nổi trên đầu (chữ to giữa màn ở Hud).
        const pha = the.pha;
        if (pha.k !== 'yeu') break;
        const goc = thanYeu();
        hu.vongSong(goc, MAU_KHI[pha.yeu], 30);
        hat.no(goc, MAU_KHI[pha.yeu], 80, 22, 1, 1.4);
        bloom.strength = Math.max(bloom.strength, 1.8);
        break;
      }
      case 'do-chieu': {
        // Một phe gõ đủ số đỡ: vòng sáng màu phe dưới chân vài người đầu phe (đông người thì không loá cả màn).
        let soVong = 0;
        for (const [u, o] of hien) {
          if (the.nguoi.get(u)?.phe !== s.phe || soVong++ >= 6) continue;
          const d = tuManHinh(o.x, o.y - 30, new THREE.Vector3());
          hu.vongSong(d, PHE[s.phe].mauSang, 6);
        }
        break;
      }
      case 'chieu-lon': {
        // Chiêu lớn ra đòn: trúng thì tà khí trút vào từng người (số máu bay lên); đỡ được thì "Đỡ!" màu phe.
        const pha = the.pha;
        if (pha.k !== 'yeu') break;
        const mau = MAU_KHI[pha.yeu];
        phanLuc = now;
        if (s.trung.length > 0) chopLuc = now;
        const goc = thanYeu();
        boNoiChieu(CHO_YEU.x, CHO_YEU.y + CHO_YEU.co * 0.34, `👹 ${s.chieu.ten}`, mau);
        // Tia tà khí chỉ vẽ cho tối đa 10 người (đông người thì loá trắng); người khác chỉ hiện số máu.
        s.trung.forEach((x, i) => {
          const o = hien.get(x.user);
          if (o === undefined) return;
          const dich = tuManHinh(o.x, o.y - 40, new THREE.Vector3());
          const chu = s.chieu.loai === 'choang' ? 'Choáng!' : `-${x.dmg}`;
          if (i >= 10) {
            hu.chuBay(dich.clone().add(new THREE.Vector3(0, 3, 0)), chu, '#ff6a5a', 0.8);
            return;
          }
          hu.phong(goc, dich, mau, 1, 1.3, () => {
            hat.no(dich, mau, 18, 8, 0.5, 0.7);
            hu.chuBay(dich.clone().add(new THREE.Vector3(0, 3, 0)), chu, '#ff6a5a', 0.95);
          });
        });
        for (const phe of s.doPhe) {
          let so = 0;
          for (const [u, o] of hien) {
            if (the.nguoi.get(u)?.phe !== phe || so++ >= 10) continue;
            hu.chuBay(tuManHinh(o.x, o.y - 70, new THREE.Vector3()), 'Đỡ!', PHE[phe].mauSang, 0.75);
          }
        }
        if (s.hoi > 0) hat.no(goc, '#9fffb8', 100, 26, 1, 1.4);
        bloom.strength = Math.max(bloom.strength, 1.8);
        break;
      }
      case 'cuong-bao': {
        // Yêu tinh sống lại Cuồng Bạo: chớp đỏ cả màn, vòng sóng lớn, chữ to.
        chopLuc = now;
        const goc = thanYeu();
        hu.vongSong(goc, '#ff3a2a', 46);
        hat.no(goc, '#ff5a3a', 260, 34, 1, 2);
        boNoiChieu(CHO_YEU.x, CHO_YEU.y + CHO_YEU.co * 0.42, '🔥 CUỒNG BẠO!', '#ff4a3a');
        bloom.strength = 3;
        break;
      }
      case 'cuong-don': {
        // Đồ sát diện rộng: chớp đỏ, tà khí trút xuống từng người, số máu mất nổi trên đầu.
        chopLuc = now;
        phanLuc = now;
        const goc = thanYeu();
        boNoiChieu(CHO_YEU.x, CHO_YEU.y + CHO_YEU.co * 0.36, `🔥 ${s.chieu}`, '#ff4a3a');
        for (const x of s.trung) {
          const o = hien.get(x.user);
          if (o === undefined) continue;
          const dich = tuManHinh(o.x, o.y - 40, new THREE.Vector3());
          hu.phong(goc, dich, '#ff3a2a', 1, 1.2, () => {
            hat.no(dich, '#ff5a3a', 36, 10, 0.6, 0.8);
            hu.chuBay(dich.clone().add(new THREE.Vector3(0, 3, 0)), `-${x.dmg}`, '#ff6a5a', 0.95);
          });
        }
        for (const u of s.doDuoc) {
          const o = hien.get(u);
          if (o !== undefined) hu.chuBay(tuManHinh(o.x, o.y - 70, new THREE.Vector3()), 'Đỡ!', '#bff3ff', 0.75);
        }
        bloom.strength = 2.6;
        break;
      }
      case 'mat-mau':
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 1.5, 0)), `-${s.dmg}`, '#ff6a5a', 0.8);
        break;
      case 'hoi-mau': {
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 3, 0)), s.day ? `Gượng dậy! +${s.mau}` : `❤ +${s.mau}`, '#9fffb8', s.day ? 0.95 : 0.8);
        hat.no(p!, '#9fffb8', s.day ? 40 : 16, 6, 0.5, 0.8);
        if (s.tu !== null) {
          const o = hien.get(s.tu);
          if (o !== undefined) hu.phong(tuManHinh(o.x, o.y - 40, new THREE.Vector3()), p!, '#ff8ab8', 0.5, 0.9);
        }
        break;
      }
      case 'nga':
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 3, 0)), 'Ngã! ❤ thả tim', '#ff8a8a', 0.95);
        break;
      case 'trong-thuong':
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 3, 0)), 'Trọng thương', '#c8c8c8', 0.85);
        break;
      case 'buff': {
        // Tim dư tiếp sức người mạnh nhất phe: tim bay từ người thả sang, nhãn "+N% · tên" trên đầu.
        const o = hien.get(s.tu);
        const dich = hien.get(s.toi);
        if (dich === undefined) break;
        const d3 = tuManHinh(dich.x, dich.y - 60, new THREE.Vector3());
        if (o !== undefined && s.tu !== s.toi) hu.phong(tuManHinh(o.x, o.y - 40, new THREE.Vector3()), d3, '#ff8ab8', 0.55, 1);
        if (now - (buffLuc.get(s.toi) ?? 0) > 700) {
          buffLuc.set(s.toi, now);
          const tu = the.nguoi.get(s.tu)?.ten ?? '';
          const toi = the.nguoi.get(s.toi)?.ten ?? '';
          boNoiChieu(dich.x, dich.y - 170, `💪 ${toi} +${s.so}% · ❤ ${tu}`, '#ff8ab8');
        }
        break;
      }
      case 'hoi-khi': {
        hu.chuBay(p!.clone().add(new THREE.Vector3(0, 3, 0)), 'Hồi khí!', '#9fffb8', 0.7);
        hat.no(p!, '#9fffb8', 20, 6, 0.5, 0.8);
        break;
      }
      case 'don': {
        // Đòn thường tự động: chưởng lực từ tay thần của phe bay ra điểm va — vừa phải, không lấn màn.
        // Bạo kích thì to, sáng, có nhãn. Núi đánh ra đá vụn, Nước đánh ra bọt nước.
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const tu = tuManHinh(s.phe === 'son' ? TAY_SON_X : TAY_THUY_X, TAY_Y, new THREE.Vector3());
        const dich = tuManHinh(diemVa(pha.son, pha.thuy), TAY_Y, new THREE.Vector3());
        const mau = PHE[s.phe].mauSang;
        const vun = s.phe === 'son' ? '#c9a36a' : '#9fdcff';
        const bao = s.bao;
        void tu;
        void dich;
        void vun;
        // Chiêu của chủ soái (hệ thổ / hệ thủy – lôi) thay cho luồng chưởng thẳng.
        chieuThan(s.phe, bao);
        // Tiên phong ra đòn riêng theo căn cơ (mỗi người một bộ chiêu).
        {
          const tp = pha.chu[s.phe];
          const nTp = tp === null ? undefined : the.nguoi.get(tp);
          if (tp !== null && nTp !== undefined && (bao || Math.random() < 0.6)) tpChieu(tp, s.phe, nTp.canCo, bao);
        }
        const c0 = pha.chu[s.phe];
        // Chủ Tướng bước lên ra đòn; đội quân phía sau dấn lên theo.
        if (c0 !== null) xongDen.set(c0, now + (bao ? 700 : XONG_CHU));
        quanTien(s.phe);
        const o = c0 === null ? undefined : hien.get(c0);
        if (o !== undefined && (bao || Math.random() < 0.3)) {
          boNoiChieu(o.x, o.y - 190, bao ? `Bạo kích · ${s.chieu}` : s.chieu, bao ? '#ffd24c' : mau);
        }
        // Chủ Tướng đã học công pháp: tranh chiêu của môn đó, to — bay thẳng vào chủ tướng bên kia.
        {
          const so = c0 === null ? 0 : (the.nguoi.get(c0)?.cp ?? 0);
          if (c0 !== null && so > 0 && (bao || Math.random() < 0.5)) tungChieuCp(c0, s.phe, so, bao ? 2.4 : 1.8, true);
        }
        // Chủ Tướng ra chiêu diện rộng thì cả trận địa bên kia hứng (mỗi 4,5 giây tối đa một lần).
        if (bao || Math.random() < 0.25) chieuRieng(s.chieu, s.phe);
        if (bao) bloom.strength = 2;
        break;
      }
      case 'qua-chieu': {
        // Chiêu do quà: nhãn vàng nơi người tặng, luồng sáng vàng dày bay ra điểm va.
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        const o = hien.get(s.user);
        xongDen.set(s.user, now + 700);
        quanTien(s.phe);
        if (o !== undefined) {
          boNoiChieu(o.x, o.y - 130, `🎁 ${s.ten}`, '#ffd24c');
          bopHuyQua(o.x, o.y - 230, s.ten.startsWith('Liên') ? 'lien' : 'bao');
        }
        // Quà ra chiêu: tranh chiêu thức cỡ lớn bay vào chủ tướng bên kia (Liên Kích: Phá Sơn Liên Tiễn / Phá Lãng
        // Thương Pháp; Bạo Kích: Đồng Cổ Lôi Tiễn / Hải Long Lôi Thương) — không còn luồng cầu sáng vàng.
        tungChieuCp(s.user, s.phe, s.ten.startsWith('Liên') ? 5 : 8, 1.8, true);
        bloom.strength = 2;
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
        {
          const o = hien.get(s.user);
          bopHuyQua(o?.x ?? 540, (o?.y ?? 1300) - 260, 'tuyet', 1.4);
        }
        const pha = the.pha;
        if (pha.k !== 'lu') break;
        // Tuyệt Kỹ: tranh chiêu tối thượng của tông (C9 — Sơn Thần Vạn Tiễn / Thủy Thần Cuồng Lan), cỡ lớn nhất.
        tungChieuCp(s.user, s.phe, 9, 2.8, true);
        bloom.strength = 2.3;
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
      case 'qua':
      case 'tim': {
        // Đèn trời cũ đã bỏ: bong bóng icon quà / tim nổi lên từ chỗ người đó (khách hàng dưới, đệ tử trên màn).
        const o = s.user === kiepU ? { x: CHO_KIEP.x, y: CHO_KIEP.y - CHO_KIEP.co * 0.5 } : hien.get(s.user);
        if (o === undefined) break;
        if (s.k === 'qua') bongIcon(s.user, o.x, o.y - 90, 'qua', s.ten, s.so);
        else bongIcon(s.user, o.x, o.y - 90, 'tim');
        break;
      }
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
