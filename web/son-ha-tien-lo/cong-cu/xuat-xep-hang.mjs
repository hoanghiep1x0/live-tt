// Xuất bảng xếp hạng cho trang web từ sổ hồ sơ của game Sơn Hà Tiên Lộ.
// Chạy:  node web/son-ha-tien-lo/cong-cu/xuat-xep-hang.mjs [đường dẫn sổ]
// Mặc định đọc database/designs/tu-tien-son-ha/so/ho-so.json, ghi web/son-ha-tien-lo/du-lieu/xep-hang.js.
// Chỉ ĐỌC sổ, không sửa. Chỉ xuất tên hiển thị TikTok (trường `t`), không xuất mã người dùng.
// Lực chiến tính đúng công thức game (client/designs/tu-tien-son-ha/src/loi/core.ts lucChienCua):
//   công + thủ (cảnh giới + đồ đang mặc) + lực chiến gốc × (6% × bậc công pháp + phần pet).
// Đổi công thức trong game thì sửa ở đây theo.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SO = resolve(process.argv[2] ?? resolve(GOC, '../../database/designs/tu-tien-son-ha/so/ho-so.json'));
const RA = resolve(GOC, 'du-lieu/xep-hang.js');

const CONG_CANH = [12, 28, 50, 77, 165, 275, 413, 578, 770, 990];
const THU_CANH = [8, 22, 40, 63, 135, 225, 337, 472, 630, 810];
const VO_LUC = 0.06;
const BAC_CONG_PHAP = [1, 1, 1, 2, 2, 3, 3, 4, 5]; // C1..C9
const PHAN_PET = [0.05, 0.05, 0.06, 0.08, 0.1, 0.1, 0.12, 0.15, 0.18]; // P1..P9

function lucChien(h) {
  const c = Math.max(0, Math.min(9, h.c ?? 0));
  let cong = CONG_CANH[c];
  let thu = THU_CANH[c];
  for (const o of Object.values(h.g ?? {})) {
    cong += o?.[1] ?? 0;
    thu += o?.[2] ?? 0;
  }
  const bac = (h.cp ?? 0) > 0 ? BAC_CONG_PHAP[h.cp - 1] ?? 0 : (h.w ?? 0);
  const pet = (h.pt ?? 0) > 0 ? PHAN_PET[h.pt - 1] ?? 0 : 0;
  return cong + thu + Math.round((CONG_CANH[c] + THU_CANH[c]) * (VO_LUC * bac + pet));
}

let so = null;
if (existsSync(SO)) so = JSON.parse(readFileSync(SO, 'utf8'));
else console.warn('Chưa có sổ ở', SO, '— ghi bảng rỗng (trang sẽ hiện trưởng lão NPC làm mẫu).');

const nguoi = Object.values(so?.nguoi ?? {})
  .filter((h) => h.p === 'son' || h.p === 'thuy')
  .map((h) => ({
    ten: String(h.t ?? '').slice(0, 40),
    phe: h.p,
    canh: h.c ?? 0,
    gioi: h.x ?? (h.p === 'son' ? 'nam' : 'nu'),
    canCo: h.r ?? null,
    luc: lucChien(h),
    ld: h.ld ?? 0,
    linhVat: (h.v ?? []).length,
    ao: h.a ?? 0,
  }))
  .filter((n) => n.ten !== '')
  .sort((a, b) => b.luc - a.luc || b.canh - a.canh);

const du = {
  capNhat: new Date().toISOString(),
  nguoi,
  mua: so?.mua ?? {},
  linhMach: so?.lm ?? {},
};
mkdirSync(dirname(RA), { recursive: true });
writeFileSync(RA, `/* Tự sinh bởi cong-cu/xuat-xep-hang.mjs — đừng sửa tay. */\nwindow.SHTL_XEP_HANG = ${JSON.stringify(du)};\n`);
console.log(`Đã ghi ${nguoi.length} đệ tử vào ${RA}`);
