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
  /** Kim tự tháp nhỏ dần (tu luyện): hàng r có r+1 ghế, ô và người nhỏ dần từ đỉnh xuống đáy — càng xuống
   *  càng nhiều hàng, nhiều người. Giá trị là bề rộng ô ở đỉnh (trước khi co cho vừa khung). */
  thapDan?: number;
  /** Xếp kiểu sân bóng theo sơ đồ `SO_DO[soDo]` (chỉ khi có `thapDan`); bỏ trống là kim tự tháp. */
  soDo?: number;
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

/** Hàng dưới cùng của tháp nhỏ dần còn bao nhiêu so với đỉnh (tháp càng cao càng nhỏ, không dưới TI_DAY). */
const TI_DAY = 0.45;
/** Khoảng cách hai hàng so với bề rộng ô (người ngồi chồng nhẹ lên nhau như bậc thềm). */
const CAO_HANG = 0.78;

/** Kim tự tháp nhỏ dần: 1, 2, 3, 4… ghế mỗi hàng, căn giữa; ghế hàng cuối vẽ đủ (ô trống là chỗ còn). */
function thapNhoDan(n: number, k: KhuManHinh, oDinh: number): { nguoi: OCo[]; ban: OCo[]; rongO: number; caoO: number; co: number } {
  let hang = 1;
  while ((hang * (hang + 1)) / 2 < n) hang++;
  const tiDay = Math.max(TI_DAY, 1 - 0.09 * (hang - 1));
  const ti = (r: number) => (hang === 1 ? 1 : 1 - ((1 - tiDay) * r) / (hang - 1));
  // Co cả tháp cho vừa khung: chiều cao (đỉnh → đáy) và bề ngang hàng dài nhất.
  let cao = 0;
  for (let r = 1; r < hang; r++) cao += (CAO_HANG * oDinh * (ti(r - 1) + ti(r))) / 2;
  let rongMax = 0;
  for (let r = 0; r < hang; r++) rongMax = Math.max(rongMax, (r + 1) * oDinh * ti(r));
  const s = Math.min(1, cao > 0 ? (k.day - k.tren) / cao : 1, (k.phai - k.trai) / rongMax);
  const rongO = oDinh * s;
  const giua = (k.trai + k.phai) / 2;
  const nguoi: OCo[] = [];
  const ban: OCo[] = [];
  let y = k.tren;
  let con = n;
  for (let r = 0; r < hang; r++) {
    if (r > 0) y += (CAO_HANG * rongO * (ti(r - 1) + ti(r))) / 2;
    const soGhe = r + 1;
    const t = ti(r);
    const o = (j: number): OCo => ({ x: giua + (j - r / 2) * rongO * t, y, cot: j, hang: hang - 1 - r, ti: t });
    for (let j = 0; j < soGhe; j++) ban.push(o(j));
    const thuTu = giuaRa(soGhe);
    for (let i = 0; i < Math.min(soGhe, con); i++) nguoi.push(o(thuTu[i]!));
    con -= soGhe;
  }
  return { nguoi, ban, rongO, caoO: rongO * CAO_HANG * 1.3, co: Math.min((k.coToiDa ?? 120) * s, rongO * 0.72) };
}

/** ĐỘI HÌNH KIỂU SÂN BÓNG lúc tu luyện (thay kim tự tháp cố định): người đứng đầu danh sách — trưởng môn — luôn ngồi
 *  vị trí THỦ MÔN (trên cùng, chính giữa, to nhất); đồng môn chia các tuyến hậu vệ – tiền vệ – tiền đạo theo một sơ
 *  đồ (4-4-2, 4-3-3…). Sơ đồ đổi ngẫu nhiên mỗi `DOI_HINH_DOI`. Tông không đủ / nhiều hơn 11 người thì chia người
 *  vào các tuyến theo đúng tỉ lệ của sơ đồ. */
export const SO_DO: readonly (readonly number[])[] = [
  [4, 4, 2],
  [4, 3, 3],
  [3, 5, 2],
  [4, 2, 3, 1],
  [3, 4, 3],
  [5, 3, 2],
  [4, 1, 4, 1],
  [3, 4, 1, 2],
];
/** Bao lâu đổi sơ đồ một lần. */
export const DOI_HINH_DOI = 60_000;

/** Sơ đồ lúc `now` — ngẫu nhiên nhưng ổn định trong một nhịp; `lech` (0 Sơn · 1 Thủy) để hai tông khác nhau. */
export function soDoLuc(now: number, lech = 0): number {
  const nhip = Math.floor(now / DOI_HINH_DOI);
  let h = (nhip * 2654435761 + lech * 40503 + 12345) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) % SO_DO.length;
}

/** Chia `m` người vào các tuyến theo tỉ lệ sơ đồ (phần dư lớn nhất được trước); tuyến không có ai thì bỏ. */
export function chiaTuyen(m: number, soDo: readonly number[]): number[] {
  const tong = soDo.reduce((a, b) => a + b, 0);
  const le = soDo.map((x) => (m * x) / tong);
  const ra = le.map((x) => Math.floor(x));
  let con = m - ra.reduce((a, b) => a + b, 0);
  const thuTu = le.map((x, i) => ({ i, du: x - Math.floor(x) })).sort((a, b) => b.du - a.du || a.i - b.i);
  for (let j = 0; con > 0; j++, con--) ra[thuTu[j % thuTu.length]!.i]!++;
  return ra.filter((x) => x > 0);
}

/** Xếp `n` người theo sơ đồ sân bóng trong khu `k` (neo mép trên, căn giữa, tự co cho vừa khung). */
function sanBong(n: number, k: KhuManHinh, oDinh: number, soDo: readonly number[]): { nguoi: OCo[]; ban: OCo[]; rongO: number; caoO: number; co: number } {
  // Toạ độ theo đơn vị "ô": x giữa = 0, y xuống dưới. Ghế 0 là thủ môn.
  const ghe: { x: number; y: number; ti: number }[] = [{ x: 0, y: 0, ti: 1.25 }];
  const tuyen = chiaTuyen(n - 1, soDo);
  tuyen.forEach((so, r) => {
    const ti = Math.max(0.62, 1 - 0.07 * r);
    // Tuyến đông thì ngồi sát hơn; tuyến chỉ 1–2 người vẫn dàn rộng như trên sân.
    const cach = so <= 2 ? 1.9 : so <= 4 ? 1.35 : 1.08;
    for (let j = 0; j < so; j++) {
      const dx = (j - (so - 1) / 2) * cach * ti;
      // Hai biên dâng nhẹ về phía trước (xuống dưới) cho ra dáng sơ đồ, không thẳng đuột.
      const bien = so > 1 ? Math.abs(j - (so - 1) / 2) / ((so - 1) / 2) : 0;
      ghe.push({ x: dx, y: 1.05 + r * 0.95 + 0.14 * bien * bien, ti });
    }
  });
  const yMax = Math.max(...ghe.map((g) => g.y));
  const xMax = Math.max(...ghe.map((g) => Math.abs(g.x) + g.ti / 2));
  const s = Math.min(1, yMax > 0 ? (k.day - k.tren) / (yMax * oDinh) : 1, (k.phai - k.trai) / (xMax * 2 * oDinh));
  const rongO = oDinh * s;
  const giua = (k.trai + k.phai) / 2;
  const nguoi = ghe.map((g, i): OCo => ({ x: giua + g.x * rongO, y: k.tren + g.y * rongO, cot: i, hang: 0, ti: g.ti }));
  return { nguoi, ban: nguoi.slice(), rongO, caoO: rongO * CAO_HANG * 1.3, co: Math.min((k.coToiDa ?? 120) * s, rongO * 0.72) };
}

export function banCo(
  n: number,
  k: KhuManHinh,
  thap = true,
): { nguoi: OCo[]; ban: OCo[]; rongO: number; caoO: number; co: number } {
  if (k.thapDan !== undefined && k.soDo !== undefined) return sanBong(Math.max(1, n), k, k.thapDan, SO_DO[k.soDo % SO_DO.length]!);
  if (k.thapDan !== undefined) return thapNhoDan(Math.max(1, n), k, k.thapDan);
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

/** Phòng đông hơn sức chứa của tháp tu luyện: chọn ai được bày lên màn lúc này.
 *  - Ưu tiên người **vừa hoạt động** trong `gan` ms gần đây; người im lâu chỉ được lấp chỗ còn trống (ai mới im xếp trước).
 *  - Vẫn còn đông hơn sức chứa: `co` ghế đầu (hạng cao nhất) ngồi cố định, các hàng dưới **lật trang** mỗi `trang` ms —
 *    lần lượt ai cũng được hiện (và thấy linh thạch của mình).
 *  `ds` đã xếp hạng sẵn; kết quả giữ nguyên thứ tự hạng. */
export function chonHien<T extends { lanCuoi: number }>(ds: readonly T[], now: number, suc = 21, co = 6, gan = 120_000, trang = 8_000): T[] {
  if (ds.length <= suc) return ds.slice();
  const hd = ds.filter((n) => now - n.lanCuoi <= gan);
  let nguon = hd;
  if (hd.length < suc) {
    const them = ds
      .filter((n) => now - n.lanCuoi > gan)
      .sort((a, b) => b.lanCuoi - a.lanCuoi)
      .slice(0, suc - hd.length);
    const chon = new Set<T>([...hd, ...them]);
    nguon = ds.filter((n) => chon.has(n));
  }
  if (nguon.length <= suc) return nguon;
  const moi = suc - co;
  const sau = nguon.slice(co);
  const i = Math.floor(now / trang) % Math.ceil(sau.length / moi);
  return [...nguon.slice(0, co), ...sau.slice(i * moi, i * moi + moi)];
}
