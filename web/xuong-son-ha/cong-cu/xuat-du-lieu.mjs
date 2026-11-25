// Xuất dữ liệu cho trang Xưởng Sơn Hà: đọc THẲNG dữ liệu game (TS) + quét thư mục tài nguyên → js/du-lieu.js.
// Chạy ở gốc repo:  node web/xuong-son-ha/cong-cu/xuat-du-lieu.mjs
// Game đổi tên món, thêm trang phục / công pháp / đan, hay vừa làm thêm ảnh động, video nền → chạy lại là trang cập nhật.
import { build } from 'rolldown';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const GOC = resolve(import.meta.dirname, '../../..');
const GAME = join(GOC, 'client/designs/tu-tien-son-ha');
const ASSET = join(GAME, 'assets');
const TRANH = join(GOC, 'web/son-ha-tien-lo/tranh-goc');

async function napTs(tep) {
  const r = await build({ input: { m: join(GAME, 'src/loi', tep) }, write: false, output: { format: 'esm' }, logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(r.output[0].code).toString('base64'));
}
const tb = await napTs('tang-bao.ts');
const tg = await napTs('the-gioi.ts');
const tbi = await napTs('trang-bi.ts');

const co = (p) => existsSync(join(ASSET, p));
const kb = (p) => (co(p) ? Math.round(statSync(join(ASSET, p)).size / 1024) : 0);
const ds = (thu) => (existsSync(join(ASSET, thu)) ? readdirSync(join(ASSET, thu)) : []);

// ---------- Nhân vật × trang phục ----------
// Tên trong file: giới gốc của tông là `son` (nam) / `thuy` (nữ); giới kia `son-nu` / `thuy-nam` (the-gioi.ts tenNv).
const NHAN_VAT = [
  { id: 'son', phe: 'son', gioi: 'nam', ten: 'Đệ tử Sơn Tông · nam' },
  { id: 'son-nu', phe: 'son', gioi: 'nu', ten: 'Đệ tử Sơn Tông · nữ' },
  { id: 'thuy', phe: 'thuy', gioi: 'nu', ten: 'Đệ tử Thủy Tông · nữ' },
  { id: 'thuy-nam', phe: 'thuy', gioi: 'nam', ten: 'Đệ tử Thủy Tông · nam' },
];
const nhanVat = NHAN_VAT.map((nv) => ({
  ...nv,
  chienChung: `nhan-vat/chien-${nv.phe}-${nv.gioi}.webp`,
  ao: tb.AO.map((a, i) => {
    const goc = `nhan-vat/${nv.id}-${a.tranh}`;
    const chien = `nhan-vat/chien-${nv.id}-${a.tranh}`;
    // Chuyển động nhân vật = VIDEO nền trong suốt (WebM VP9 alpha) — người vận hành chốt 2026-11-23: video đẹp hơn ảnh
    // động nhiều. Ảnh động WebP cũ (`-dong-<động tác>.webp`) chỉ còn là bản tạm khi chưa có video.
    const tep = {
      thien: `${goc}.webp`,
      chien: `${chien}.webp`,
      vThien: `${goc}-thien.webm`,
      vCong: `${chien}-cong.webm`,
      vThu: `${chien}-thu.webm`,
      vHoi: `${chien}-hoi.webm`,
      tamCong: `${chien}-dong-cong.webp`,
      tamThu: `${chien}-dong-thu.webp`,
      tamHoi: `${chien}-dong-hoi.webp`,
    };
    return { ma: `T${i + 1}`, ten: a.ten[nv.phe], gia: a.gia, can: a.can, duoi: a.tranh, tep, co: Object.fromEntries(Object.entries(tep).map(([k, p]) => [k, co(p)])) };
  }),
}));

// ---------- Công pháp ----------
const chieuJson = JSON.parse(readFileSync(join(TRANH, 'chieu-cp/chieu.json'), 'utf8'));
const HE = { tuong: { ten: 'Công', dong: 'cong' }, quan: { ten: 'Phá', dong: 'cong' }, ve: { ten: 'Thủ', dong: 'thu' }, y: { ten: 'Máu', dong: 'hoi' } };
const congPhap = tb.CONG_PHAP.map((c, i) => {
  const n = i + 1;
  const tong = Object.fromEntries(
    ['son', 'thuy'].map((phe) => {
      const j = chieuJson[`${phe}-c${n}`] ?? {};
      return [phe, { ten: c.ten[phe], chieu: `chieu/${phe}-c${n}.webp`, icon: `vp/C${n}-${phe}.webp`, coChieu: co(`chieu/${phe}-c${n}.webp`), kbChieu: kb(`chieu/${phe}-c${n}.webp`), loai: j.loai ?? '', chuyenDong: j.chuyen_dong ?? '', neo: j.neo_dau ?? null }];
    }),
  );
  return { ma: `C${n}`, he: c.he, heTen: HE[c.he].ten, dongTac: HE[c.he].dong, bac: c.bac, gia: c.gia, mo: c.mo, tong };
});

// ---------- Đan dược ----------
const KIEU_DAN = {
  khi: 'khí xanh xoáy từ chân lên đầu',
  pha: 'cột sáng vàng bùng',
  bao: 'lửa đỏ bốc quanh thân',
  kim: 'khiên cầu lam vàng',
  hon: 'hồn hỏa tím lượn',
  kiep: 'vầng hào quang vàng trên đầu',
};
const danDuoc = tb.DAN.map((d, i) => {
  const u = d.dung;
  const kieu = 'lk' in u ? 'khi' : 'day' in u ? 'pha' : u.tran === 'cong' ? 'bao' : u.tran === 'thu' ? 'kim' : u.tran === 'hon' ? 'hon' : 'kiep';
  return {
    ma: `D${i + 1}`,
    ten: d.ten,
    gia: d.gia,
    mo: d.mo,
    can: d.can,
    kieu,
    hieuUng: KIEU_DAN[kieu],
    tong: Object.fromEntries(['son', 'thuy'].map((phe, k) => [phe, { ten: `${tb.DAN_TONG[phe][i]} ${d.ten}`, icon: `vp/D${i + 1}-${phe}.webp`, coIcon: co(`vp/D${i + 1}-${phe}.webp`) }])),
  };
});


// ---------- Trang bị Địa Cung: binh khí (vũ khí), giáp y, bảo vật — 5 phẩm × 3 biến thể × 2 tông ----------
const CHU_O = { vu: 'B', ao: 'G', bao: 'V' };
const trangBi = tbi.O_TRANG_BI.map((o) => ({
  o,
  ten: tbi.TEN_O[o],
  pham: tbi.PHAM.map((ph, p) => ({
    so: p + 1,
    ten: ph.ten,
    mau: ph.mau,
    can: ph.can,
    canTen: tg.CANH_GIOI[ph.can]?.ten ?? '',
    goc: tbi.GOC_PHAM[p],
    // Chiêu binh khí trên màn PK: một hình mỗi tông × phẩm (cùng phẩm cùng loại vũ khí nên dùng chung).
    chieuVk: o === 'vu' ? Object.fromEntries(['son', 'thuy'].map((t) => [t, { p: `chieu/vk/${t}-b${p + 1}.webp`, co: co(`chieu/vk/${t}-b${p + 1}.webp`) }])) : null,
    mon: tbi.BIEN_THE_DS.map((bt, k) => {
      const ma = `${CHU_O[o]}${p + 1}${bt === 'a' ? '' : bt}`;
      return {
        ma,
        bt,
        tong: Object.fromEntries(
          ['son', 'thuy'].map((t) => {
            const icon = o === 'ao' ? { nam: `do/kho/${ma}-${t}-nam.webp`, nu: `do/kho/${ma}-${t}-nu.webp` } : { chung: `do/kho/${ma}-${t}.webp` };
            return [t, { ten: tbi.TEN_BIEN_THE[t][p][o][k], icon, co: Object.values(icon).every(co) }];
          }),
        ),
      };
    }),
  })),
}));

// ---------- Video hiệu ứng dùng chung (WebM alpha, nền đen → alpha theo độ sáng, cong-cu/fx-video.py) ----------
const FX = [
  { id: 'bien-trang-son', nhom: 'Thay trang phục', ten: 'Biến trang Sơn Tông', mo: 'lá trúc vàng + đá quý xoáy quanh người thành kén sáng, loé trắng, bung lá vàng rơi', dung: 'đổi áo bất kỳ bộ nào (Sơn)' },
  { id: 'bien-trang-thuy', nhom: 'Thay trang phục', ten: 'Biến trang Thủy Tông', mo: 'lụa nước xanh ngọc + ngọc trai xoáy lên thành kén, loé trắng, bung giọt nước lấp lánh', dung: 'đổi áo bất kỳ bộ nào (Thủy)' },
  { id: 'binh-khi-son', nhom: 'Thay vũ khí', ten: 'Binh khí hiện hình Sơn', mo: 'cột sáng vàng hạ xuống, vòng hoa văn trống đồng xoay, vũ khí hiện ra giữa luồng sáng', dung: 'nhận / đổi binh khí (Sơn)' },
  { id: 'binh-khi-thuy', nhom: 'Thay vũ khí', ten: 'Binh khí hiện hình Thủy', mo: 'xoáy nước bạc dựng đứng, sóng vòng tròn, vũ khí hiện ra giữa xoáy', dung: 'nhận / đổi binh khí (Thủy)' },
  { id: 'dan-khi', nhom: 'Đan dược', ten: 'Khí xanh xoáy', mo: 'khí lục lam xoáy từ chân lên đỉnh đầu, hạt sáng nhỏ bay theo', dung: 'D1–D4 linh khí' },
  { id: 'dan-pha', nhom: 'Đan dược', ten: 'Cột sáng phá cảnh', mo: 'cột sáng vàng bùng từ dưới lên, sóng sáng vòng tròn lan ra', dung: 'D5 Phá Cảnh' },
  { id: 'dan-bao', nhom: 'Đan dược', ten: 'Lửa bạo khí', mo: 'lửa đỏ cam bốc quanh thân, tàn lửa bay lên', dung: 'D6 Bạo Khí' },
  { id: 'dan-kim', nhom: 'Đan dược', ten: 'Khiên kim cương', mo: 'khiên cầu lam vàng hiện lên, gợn sáng chạy trên mặt khiên', dung: 'D7 Kim Cương' },
  { id: 'dan-hon', nhom: 'Đan dược', ten: 'Hồn hỏa', mo: 'ba đốm hồn hỏa tím lượn vòng quanh người rồi nhập vào ngực', dung: 'D8 Hồi Hồn' },
  { id: 'dan-kiep', nhom: 'Đan dược', ten: 'Hào quang hộ kiếp', mo: 'vầng hào quang vàng mở ra trên đầu, tia sáng mảnh toả xuống', dung: 'D9 Hộ Kiếp' },
].map((f) => ({ ...f, tep: `fx/${f.id}.webm`, co: co(`fx/${f.id}.webm`) }));

// ---------- Nền từng màn ----------
const TEN_NEN = {
  son: 'Đạo trường Sơn Tông (thiền 1)', 'son-2': 'Sơn Tông · đỉnh núi lúc bình minh (thiền 2)', 'son-3': 'Sơn Tông · rừng trúc thác ngọc (thiền 3)', 'son-4': 'Sơn Tông · hang pha lê (thiền 4)',
  thuy: 'Đạo trường Thủy Tông · Long Cung (thiền 1)', 'thuy-2': 'Thủy Tông · hồ sen trăng rằm (thiền 2)', 'thuy-3': 'Thủy Tông · vườn san hô (thiền 3)', 'thuy-4': 'Thủy Tông · bờ biển bình minh (thiền 4)',
  'vo-son': 'Võ Trường Sơn Tông (thử công pháp)', 'vo-thuy': 'Võ Trường Thủy Tông (thử công pháp)', 'ao-son': 'Phòng Thử Đồ Sơn Tông', 'ao-thuy': 'Phòng Thử Đồ Thủy Tông',
  'thi-son': 'Lôi Đài Sơn Tông', 'thi-thuy': 'Lôi Đài Thủy Tông', sanh: 'Sảnh Sơn Hà', lu: 'Nước Dâng (Đại Chiến)', kiep: 'Độ Kiếp', cho: 'Thành Trì Tự Do',
  me: 'Mê cung chung · lò lửa', 'me-son-1': 'Mê cung Sơn 1 · Hang Đá Tản Viên', 'me-son-2': 'Mê cung Sơn 2 · Rừng Tre Cổ Thụ', 'me-son-3': 'Mê cung Sơn 3 · Lò Đúc Đồng',
  'me-thuy-1': 'Mê cung Thủy 1', 'me-thuy-2': 'Mê cung Thủy 2', 'me-thuy-3': 'Mê cung Thủy 3',
};
const muse = existsSync(join(TRANH, 'nen-dong/muse')) ? readdirSync(join(TRANH, 'nen-dong/muse')) : [];
const nen = ds('nen')
  .filter((f) => /^[a-z0-9-]+\.webp$/.test(f) && !f.endsWith('-truoc.webp'))
  .map((f) => f.replace('.webp', ''))
  .sort((a, b) => Object.keys(TEN_NEN).indexOf(a) - Object.keys(TEN_NEN).indexOf(b))
  .map((id) => ({
    id,
    ten: TEN_NEN[id] ?? id,
    tranh: `nen/${id}.webp`,
    video: co(`nen/${id}-dong.mp4`) ? `nen/${id}-dong.mp4` : null,
    kbVideo: kb(`nen/${id}-dong.mp4`),
    nguon: muse.includes(`${id}.mp4`) ? 'muse' : co(`nen/${id}-dong.mp4`) ? 'chatgpt' : null,
    truoc: co(`nen/${id}-truoc.webp`) ? `nen/${id}-truoc.webp` : null,
  }));

const yeu = ds('yeu').filter((f) => f.endsWith('.webp')).map((f) => ({ id: f.replace('.webp', ''), tranh: `yeu/${f}`, dong: ds('yeu/dong').filter((g) => g.startsWith(f.replace('.webp', ''))).map((g) => `yeu/dong/${g}`) }));
const pet = tb.PET.map((p, i) => ({ ma: `P${i + 1}`, ten: p.ten, hinh: p.hinh, gia: p.gia, icon: `vp/P${i + 1}.webp`, coIcon: co(`vp/P${i + 1}.webp`) }));

const ra = {
  luc: new Date().toISOString(),
  canhGioi: tg.CANH_GIOI.map((c) => c.ten),
  phe: { son: { ten: tg.PHE.son.ten }, thuy: { ten: tg.PHE.thuy.ten } },
  nhanVat,
  congPhap,
  danDuoc,
  trangBi,
  fx: FX,
  nen,
  yeu,
  pet,
};
const dich = join(GOC, 'web/xuong-son-ha/js/du-lieu.js');
writeFileSync(dich, `// TỰ SINH bởi cong-cu/xuat-du-lieu.mjs — đừng sửa tay.\nwindow.XUONG = ${JSON.stringify(ra, null, 1)};\n`);
const dem = (f) => nhanVat.reduce((s, nv) => s + nv.ao.filter((a) => a.co[f]).length, 0);
console.log('xong →', dich);
console.log(`trang phục: tranh thiền ${dem('thien')}/36 · dáng chiến ${dem('chien')}/36 · video thiền ${dem('vThien')} · video công ${dem('vCong')} · thủ ${dem('vThu')} · hồi ${dem('vHoi')} · ảnh động tạm ${dem('tamCong') + dem('tamThu') + dem('tamHoi')}`);
console.log(`video hiệu ứng: ${FX.filter((f) => f.co).length}/${FX.length} · trang bị: ${trangBi.reduce((s, o) => s + o.pham.reduce((t, p) => t + p.mon.length * 2, 0), 0)} món`);
console.log(`nền: ${nen.length} tranh · ${nen.filter((n) => n.video).length} video (${nen.filter((n) => n.nguon === 'muse').length} Muse) · ${nen.filter((n) => n.truoc).length} tiền cảnh`);
