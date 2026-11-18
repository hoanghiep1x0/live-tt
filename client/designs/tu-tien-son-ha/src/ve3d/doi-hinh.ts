/** Đội hình bàn cờ trên màn hình — THUẦN, test được ở Node.
 *
 *  Kiểu game 2D: hai phe chia đôi vùng dưới khung — phe Núi bàn bên trái, phe Nước bàn bên phải —
 *  cố định ở mọi màn, không theo máy quay. Mỗi bàn là một lưới ô đều nhau, thẳng hàng thẳng cột;
 *  hàng dưới cùng ở đáy khung, các hàng xếp lên trên. Ngồi như điện của môn phái: người đầu danh
 *  sách ngồi đỉnh kim tự tháp (hàng trên cùng, một mình), hai hàng sau 2 rồi 3 người, rồi mới tới
 *  lưới — càng lên cao cảnh giới càng cao, chức càng lớn. Hàng thiếu người là hàng dưới cùng.
 *  Mọi ô của bàn (kể cả ô trống) đều trả về để vẽ nền bàn cờ. */

export interface KhuManHinh {
  trai: number;
  phai: number;
  /** y thấp nhất hàng cuối được xuống tới. */
  day: number;
  /** y của hàng trên cùng (đỉnh tháp) — mốc neo. */
  tren: number;
  toiDaCot: number;
  /** Bề rộng ô tối đa: ít người thì bàn thu gọn vào giữa, không kéo giãn ô cho đầy khung. */
  oToiDa?: number;
  /** Cỡ người tối đa (mặc định 120). */
  coToiDa?: number;
  /** Số người mỗi hàng lưới (dưới ba hàng tháp) cố định, không tự tính theo số người. */
  cotLuoi?: number;
}

export interface OCo {
  x: number;
  y: number;
  cot: number;
  hang: number;
  /** Hệ số cỡ của ô — lưới đều nên luôn là 1; để sẵn nếu sau muốn hàng sau nhỏ dần. */
  ti: number;
}

export function soCot(n: number, toiDa: number): number {
  // Bàn hơi dẹt (ít cột hơn số hàng): mỗi người có ô rộng, không chen vai.
  return Math.min(toiDa, Math.max(1, Math.ceil(Math.sqrt(n * 0.9))));
}

/** Thứ tự cột từ giữa ra hai bên: 5 cột → 2, 1, 3, 0, 4. */
export function giuaRa(n: number): number[] {
  const giua = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - giua) - Math.abs(b - giua) || a - b);
}

/** Ba hàng đầu xếp hình kim tự tháp: 1 người đứng đầu phe, 2 Hộ Pháp, 4 Trưởng Lão trụ cột. Từ hàng
 *  thứ tư trở xuống là lưới đủ cột. */
export const THAP = [1, 2, 4] as const;
/** Hai hàng đầu xếp từ giữa ra; từ hàng thứ ba xếp từ trái sang để hai bên không bị trống. */
const HANG_GIUA = 2;
/** Ba hàng tháp ngồi to hơn: chức càng lớn càng nổi. */
const TI_THAP = [1.28, 1.14, 1.04];

/** Số người từng hàng, từ trên xuống. */
export function soHang(n: number, cot: number): number[] {
  const ra: number[] = [];
  let con = n;
  for (const k of THAP) {
    if (con <= 0) break;
    const x = Math.min(k, cot, con);
    ra.push(x);
    con -= x;
  }
  while (con > 0) {
    const x = Math.min(cot, con);
    ra.push(x);
    con -= x;
  }
  return ra;
}

export function banCo(
  n: number,
  k: KhuManHinh,
  thap = true,
): { nguoi: OCo[]; ban: OCo[]; rongO: number; caoO: number; co: number } {
  // Có tháp thì bàn rộng ít nhất bằng hàng tháp dài nhất (4 ghế Trưởng Lão), để hàng ba luôn trải
  // đủ bề ngang dù mới có một người.
  const cot =
    k.cotLuoi !== undefined
      ? Math.min(k.toiDaCot, k.cotLuoi)
      : thap
        ? Math.min(k.toiDaCot, Math.max(THAP[THAP.length - 1]!, soCot(Math.max(1, n), k.toiDaCot)))
        : soCot(Math.max(1, n), k.toiDaCot);
  const hangDs = n <= 0 ? [1] : thap ? soHang(n, cot) : Array.from({ length: Math.ceil(n / cot) }, (_, i) => Math.min(cot, n - i * cot));
  const hang = hangDs.length;
  const rongO = Math.min(k.oToiDa ?? Infinity, (k.phai - k.trai) / cot);
  const caoO = hang > 1 ? Math.min(rongO * 1.05, (k.day - k.tren) / (hang - 1)) : rongO;
  const giua = (k.trai + k.phai) / 2;
  const nguoi: OCo[] = [];
  const ban: OCo[] = [];
  // Hàng 0 là hàng trên cùng, neo ở mép trên: có thêm người thì hàng mới mọc phía dưới, đỉnh tháp
  // đứng yên — không đẩy cả tháp lên.
  hangDs.forEach((soNg, r) => {
    const h = hang - 1 - r;
    const laThap = thap && r < THAP.length && soNg <= THAP[r]!;
    // Hàng tháp chỉ có ghế cho người ngồi; hàng lưới vẽ đủ cột (kể cả ô trống) để thấy còn chỗ.
    // Hai hàng đầu chỉ có ghế cho người ngồi (xếp từ giữa); hàng ba đủ 4 ghế, hàng lưới đủ cột —
    // người ngồi lần lượt từ ghế trái nhất.
    const soGhe = laThap ? (r < HANG_GIUA ? soNg : Math.min(THAP[r]!, cot)) : cot;
    const ti = laThap ? TI_THAP[r]! : 1;
    const o = (j: number): OCo => {
      const c = (cot - 1) / 2 + (j - (soGhe - 1) / 2);
      return { x: giua + (j - (soGhe - 1) / 2) * rongO, y: k.tren + r * caoO, cot: c, hang: h, ti };
    };
    for (let j = 0; j < soGhe; j++) ban.push(o(j));
    const thuTu = r < HANG_GIUA ? giuaRa(soGhe) : Array.from({ length: soGhe }, (_, j) => j);
    for (let i = 0; i < soNg; i++) nguoi.push(o(thuTu[i]!));
  });
  // Người chiếm ~65% ô: chừa khoảng thở giữa các tu sĩ.
  return { nguoi, ban, rongO, caoO, co: Math.min(k.coToiDa ?? 120, Math.min(rongO, caoO) * 0.65) };
}
