/** Tàng Bảo Các — cửa hàng của phòng, gõ mã để mua hoặc dùng (THUẦN, chỉ dữ liệu).
 *
 *  T1–T9 trang phục · D1–D9 đan dược · C1–C9 công pháp · P1–P9 pet. Gõ mã món chưa có thì mua (trừ linh
 *  thạch) và dùng luôn; món đã có thì chỉ đổi sang dùng. Giá quy về bảng linh thạch, sức mạnh quy về bảng
 *  lực chiến — docs/phong/tu-tien/ban-do.md §3b, §3c, §3d. Sửa ở đây thì sửa bảng ở đó. */

import { CANH_GIOI, type CanCo, type Phe } from './the-gioi';

export type LoaiMa = 't' | 'd' | 'c' | 'p';

export const TEN_LOAI: Record<LoaiMa, { ten: string; viec: string; hinh: string }> = {
  t: { ten: 'Trang phục', viec: 'Đổi trang phục', hinh: '👘' },
  d: { ten: 'Đan dược', viec: 'Đan dược · điểm đột phá', hinh: '💊' },
  c: { ten: 'Công pháp', viec: 'Công pháp · chiêu thức', hinh: '📜' },
  p: { ten: 'Pet', viec: 'Linh thú (pet)', hinh: '🐾' },
};

/** Trang phục. T1–T5 là năm bộ cơ bản (tranh `<nhân vật>-tp<n>`), T6–T9 là pháp y cảnh giới (tranh
 *  `<nhân vật>-c<n>`), phải đủ cảnh giới mới mặc. Chỉ đổi hình, không cộng lực chiến. */
export interface MonAo {
  ten: Record<Phe, string>;
  gia: number;
  /** Cảnh giới tối thiểu. */
  can: number;
  /** Đuôi tên tranh. */
  tranh: string;
}

export const AO: readonly MonAo[] = [
  { ten: { son: 'Sơn Dã Y', thuy: 'Ngư Gia Y' }, gia: 50, can: 0, tranh: 'tp1' },
  { ten: { son: 'Hộ Sơn Giáp', thuy: 'Ngân Lân Giáp' }, gia: 50, can: 0, tranh: 'tp2' },
  { ten: { son: 'Bạch Vân Bào', thuy: 'Bạch Châu Bào' }, gia: 50, can: 0, tranh: 'tp3' },
  { ten: { son: 'Hồng Hội Bào', thuy: 'San Hô Bào' }, gia: 50, can: 0, tranh: 'tp4' },
  { ten: { son: 'Dạ Hành Y', thuy: 'Nguyệt Dạ Y' }, gia: 50, can: 0, tranh: 'tp5' },
  { ten: { son: 'Lạc Vũ Pháp Y', thuy: 'Lam Thủy Pháp Y' }, gia: 100, can: 1, tranh: 'c1' },
  { ten: { son: 'Nguyên Anh Sơn Bào', thuy: 'Nguyên Anh Long Bào' }, gia: 300, can: 4, tranh: 'c4' },
  { ten: { son: 'Hư Không Sơn Giáp', thuy: 'Hư Không Hải Giáp' }, gia: 600, can: 6, tranh: 'c6' },
  { ten: { son: 'Bất Tử Thần Y', thuy: 'Bất Tử Long Y' }, gia: 1000, can: 8, tranh: 'c9' },
];

/** Đan dược. D1–D5 bồi linh khí (điểm đột phá); D6–D9 là thuốc cho trận kế, cất trong túi, tự dùng khi
 *  vào trận / độ kiếp. Linh khí đã đầy (chờ đột phá) thì không uống được đan linh khí. */
export type CongDung = { lk: number } | { day: true } | { tran: 'cong' | 'thu' | 'hon' | 'kiep' };

export interface MonDan {
  ten: string;
  gia: number;
  dung: CongDung;
  mo: string;
  /** Cảnh giới tối thiểu để mua / uống. Đan linh khí: linh khí của viên không vượt khoảng cách tới cảnh giới kế
   *  của cảnh giới này (mới vào cảnh giới mà uống là không phí giọt nào) — `nhat-quan.test.ts` giữ luật này. */
  can: number;
}

/** Tên đan riêng của từng tông (cùng công dụng, cùng giá; tranh `vp/D<n>-<tông>.webp`): Sơn luyện bằng sản vật núi,
 *  Thủy bằng sản vật biển. Ghép trước tên gốc: "Sâm Núi Tụ Khí Đan". */
export const DAN_TONG: Record<Phe, readonly string[]> = {
  son: ['Sâm Núi', 'Linh Chi', 'Đá Ong', 'Kim Đồng', 'Tản Viên', 'Hỏa Sơn', 'Thạch Bích', 'Mộc Linh', 'Lôi Sơn'],
  thuy: ['Rong Biển', 'San Hô', 'Vỏ Sò', 'Long Châu', 'Long Cung', 'Nộ Triều', 'Long Lân', 'Bạng Châu', 'Hải Long'],
};

/** Đan linh khí theo đúng tên cảnh giới: Tụ Khí (Phàm Nhân tụ khí) → Bồi Nguyên (Luyện Khí bồi nguyên khí) → Trúc
 *  Cơ Đan (người Trúc Cơ củng cố nền) → Kết Kim Đan (người Kết Đan nuôi kim đan) → Phá Cảnh Đan (từ Nguyên Anh, lấp
 *  đầy tới ngưỡng). Đan bậc cao đắt hơn nhưng lời hơn (linh khí mỗi viên linh thạch tăng dần: 1,25 → 1,39 → 1,5 →
 *  1,59). Đan trận D6–D9 không cộng linh khí; Hộ Kiếp Đan chỉ bán từ Kết Đan (sắp độ kiếp mới cần). */
export const DAN: readonly MonDan[] = [
  { ten: 'Tụ Khí Đan', gia: 20, dung: { lk: 25 }, mo: '+25 linh khí', can: 0 },
  { ten: 'Bồi Nguyên Đan', gia: 36, dung: { lk: 50 }, mo: '+50 linh khí · từ Luyện Khí', can: 1 },
  { ten: 'Trúc Cơ Đan', gia: 60, dung: { lk: 90 }, mo: '+90 linh khí · từ Trúc Cơ', can: 2 },
  { ten: 'Kết Kim Đan', gia: 88, dung: { lk: 140 }, mo: '+140 linh khí · từ Kết Đan', can: 3 },
  { ten: 'Phá Cảnh Đan', gia: 560, dung: { day: true }, mo: 'đầy tới ngưỡng · từ Nguyên Anh', can: 4 },
  { ten: 'Bạo Khí Đan', gia: 60, dung: { tran: 'cong' }, mo: 'trận kế: công +20%', can: 0 },
  { ten: 'Kim Cương Đan', gia: 60, dung: { tran: 'thu' }, mo: 'trận kế: thủ +20%', can: 0 },
  { ten: 'Hồi Hồn Đan', gia: 40, dung: { tran: 'hon' }, mo: 'đỡ trọn 1 lần choáng', can: 0 },
  { ten: 'Hộ Kiếp Đan', gia: 80, dung: { tran: 'kiep' }, mo: 'độ kiếp kế: +2 hộ pháp · từ Kết Đan', can: 3 },
];

/** Công pháp: mỗi môn thuộc một hệ (cùng hệ với căn cơ: Chiến Tướng đòn, Hộ Vệ đỡ, Y Sư hồi, Phá Quân
 *  bạo kích) và một bậc 1–5. Đang dùng môn nào thì Đại Chiến, đánh yêu tinh ra đúng chiêu đó. */
export interface MonCong {
  /** Mỗi tông một tên chiêu (Sơn Tông dùng cung, Thủy Tông dùng lao) — cùng hệ, bậc, giá, công dụng. */
  ten: Record<Phe, string>;
  he: CanCo;
  bac: number;
  gia: number;
  mo: string;
}

/** Tác dụng mỗi bậc công pháp theo hệ — MỘT CHỖ DUY NHẤT: lõi trận (core.ts `heSoVo`, bạo kích yêu tinh, đỡ phản
 *  đòn, hồi trận khí Đại Chiến) và dòng công dụng trên bảng (`moCong`) đều đọc từ đây, nên chữ không bao giờ lệch
 *  số. `don` đòn ×(1 + don·bậc) · `bao` bạo kích khi đánh yêu tinh · `do` đỡ phản đòn yêu tinh · `hoi` trận khí bên
 *  kia bớt mỗi đòn tiếp sức (Đại Chiến). */
export const HE_CP: Record<CanCo, { don: number; bao: number; do: number; hoi: number }> = {
  tuong: { don: 0.08, bao: 0, do: 0, hoi: 0 },
  quan: { don: 0.05, bao: 0.03, do: 0, hoi: 0 },
  ve: { don: 0.03, bao: 0, do: 0.05, hoi: 0 },
  y: { don: 0.03, bao: 0, do: 0, hoi: 0.06 },
};
/** Bậc công pháp → cảnh giới tối thiểu để học: bậc 1 Phàm Nhân, 2 Luyện Khí, 3 Trúc Cơ, 4 Kết Đan, 5 Nguyên Anh.
 *  Giá gấp đôi mỗi bậc (30 · 60 · 120 · 240 · 480). */
export const CANH_CP = [0, 0, 1, 2, 3, 4] as const;
export const GIA_CP = [0, 30, 60, 120, 240, 480] as const;

const pt = (x: number) => `${Math.round(x * 100)}%`;
/** Dòng công dụng của một môn, sinh từ HE_CP (không gõ tay). */
export function moCong(he: CanCo, bac: number): string {
  const h = HE_CP[he];
  const ds: string[] = [];
  if (h.do > 0) ds.push(`đỡ +${pt(h.do * bac)}`);
  if (h.bao > 0) ds.push(`bạo kích +${pt(h.bao * bac)}`);
  if (h.hoi > 0) ds.push(`hồi trận khí ${bac === 1 ? '' : `×${bac} `}`.trim());
  ds.push(`đòn +${pt(h.don * bac)}`);
  return ds.join(', ');
}

const cp = (son: string, thuy: string, he: CanCo, bac: number): MonCong => ({ ten: { son, thuy }, he, bac, gia: GIA_CP[bac]!, mo: moCong(he, bac) });

export const CONG_PHAP: readonly MonCong[] = [
  cp('Sơn Ưng Tiễn', 'Thủy Xà Thương', 'tuong', 1),
  cp('Thạch Bích Công', 'Thủy Mạc Công', 've', 1),
  cp('Linh Chi Quyết', 'Ngọc Châu Quyết', 'y', 1),
  cp('Xuyên Vân Tiễn', 'Xuyên Lãng Thương', 'quan', 2),
  cp('Phá Sơn Liên Tiễn', 'Phá Lãng Thương Pháp', 'tuong', 2),
  cp('Tản Viên Hộ Thể', 'Long Lân Hộ Thể', 've', 3),
  cp('Mộc Linh Hồi Xuân', 'Hồi Xuân Thủy Pháp', 'y', 3),
  cp('Đồng Cổ Lôi Tiễn', 'Hải Long Lôi Thương', 'quan', 4),
  cp('Sơn Thần Vạn Tiễn', 'Thủy Thần Cuồng Lan', 'tuong', 5),
];

/** Pet (linh thú): công và thủ cộng thêm một phần công thủ gốc của cảnh giới (bảng §3c). */
export interface MonPet {
  ten: string;
  hinh: string;
  gia: number;
  phan: number;
}

export const PET: readonly MonPet[] = [
  { ten: 'Gà Chín Cựa', hinh: '🐓', gia: 100, phan: 0.05 },
  { ten: 'Cá Chép Vàng', hinh: '🐟', gia: 100, phan: 0.05 },
  { ten: 'Chim Lạc', hinh: '🕊️', gia: 150, phan: 0.06 },
  { ten: 'Rùa Thần Kim Quy', hinh: '🐢', gia: 200, phan: 0.08 },
  { ten: 'Ngựa Chín Hồng Mao', hinh: '🐎', gia: 300, phan: 0.1 },
  { ten: 'Voi Chín Ngà', hinh: '🐘', gia: 300, phan: 0.1 },
  { ten: 'Thuồng Luồng', hinh: '🐍', gia: 400, phan: 0.12 },
  { ten: 'Giao Long', hinh: '🐉', gia: 600, phan: 0.15 },
  { ten: 'Kỳ Lân', hinh: '🦄', gia: 1000, phan: 0.18 },
];

export const SO_MON: Record<LoaiMa, number> = { t: AO.length, d: DAN.length, c: CONG_PHAP.length, p: PET.length };

/** Một dòng trên bảng Tàng Bảo Các: tên, giá, công dụng ngắn. */
export function dongMon(loai: LoaiMa, i: number, phe: Phe): { ten: string; gia: number; mo: string } {
  if (loai === 't') {
    const m = AO[i]!;
    return { ten: m.ten[phe], gia: m.gia, mo: m.can > 0 ? `từ ${CANH_GIOI[m.can]?.ten ?? m.can}` : 'cơ bản' };
  }
  if (loai === 'd') return { ten: DAN[i]!.ten, gia: DAN[i]!.gia, mo: DAN[i]!.mo };
  // Công pháp: dòng công dụng kèm cảnh giới cần (bậc 2 trở lên).
  if (loai === 'c') return { ten: CONG_PHAP[i]!.ten[phe], gia: CONG_PHAP[i]!.gia, mo: CONG_PHAP[i]!.mo };
  const p = PET[i]!;
  return { ten: `${p.hinh} ${p.ten}`, gia: p.gia, mo: `công thủ +${Math.round(p.phan * 100)}%` };
}

/** Nhãn nhỏ theo hệ công pháp (đọc nhanh khi mua): Công (đánh) · Thủ (hộ thể) · Máu (hồi) · Phá (phá trận), kèm màu. */
export const NHAN_HE: Record<CanCo, { chu: string; mau: string }> = {
  tuong: { chu: 'Công', mau: '#ff7a5c' },
  ve: { chu: 'Thủ', mau: '#6fb8ff' },
  y: { chu: 'Máu', mau: '#6fe39a' },
  quan: { chu: 'Phá', mau: '#c58bff' },
};
