/** Trang bị nhặt trong Địa Cung — THUẦN. Ba ô đồ, năm phẩm; phẩm cao phải đủ cảnh giới mới mặc.
 *  Công thủ là chỉ số riêng từng người: công làm đòn đánh yêu tinh mạnh hơn và cú đẩy Đại Chiến
 *  nặng hơn; thủ của cả phe chặn bớt lực đẩy của phe kia. Tác động có trần — một cao thủ bằng
 *  hai, ba người mới, không bằng cả phòng: Đại Chiến vẫn là trận đông người.
 *  Kinh Thư §2.7: đồ chỉ nhặt được, không quà nào đổi ra đồ. */

export type OTrangBi = 'vu' | 'ao' | 'bao';

export const O_TRANG_BI: readonly OTrangBi[] = ['vu', 'ao', 'bao'];

export const TEN_O: Record<OTrangBi, string> = { vu: 'Binh khí', ao: 'Giáp y', bao: 'Bảo vật' };

export interface Pham {
  ten: string;
  mau: string;
  /** Cảnh giới tối thiểu để mặc. */
  can: number;
}

export const PHAM: readonly Pham[] = [
  { ten: 'Phàm phẩm', mau: '#d8cfc0', can: 0 },
  { ten: 'Linh phẩm', mau: '#7fe07a', can: 1 },
  { ten: 'Huyền phẩm', mau: '#5fb0ff', can: 3 },
  { ten: 'Địa phẩm', mau: '#c77dff', can: 5 },
  { ten: 'Thiên phẩm', mau: '#ffd24c', can: 7 },
];

/** Đồ đồng Đông Sơn thật (rìu xéo, dao găm cán tượng người, giáp đồng che ngực, lục lạc, trống
 *  đồng) xếp theo phẩm. Không có nỏ thần — đó là đời An Dương Vương, sau Hùng Vương. */
export const TEN_DO: Record<OTrangBi, readonly string[]> = {
  vu: ['Giáo Tre Vót', 'Mũi Lao Đồng', 'Rìu Xéo Đồng', 'Dao Găm Tượng Người', 'Giáo Thần Chim Lạc'],
  ao: ['Áo Vải Gai', 'Áo Lông Trĩ', 'Giáp Da Tê Giác', 'Giáp Đồng Che Ngực', 'Thiên Y Lông Lạc'],
  bao: ['Vòng Vỏ Sò', 'Khuyên Tai Ngọc', 'Lục Lạc Đồng', 'Vòng Tay Khảm Ngọc', 'Mặt Trống Hộ Mệnh'],
};

/** Chỉ số gốc từng phẩm: binh khí cho công, giáp y cho thủ, bảo vật cho cả hai (nửa mức).
 *  Bảng hệ số lực chiến: docs/phong/tu-tien/ban-do.md §3c — sửa ở đây thì sửa bảng ở đó. */
export const GOC_PHAM = [8, 20, 45, 120, 250] as const;
const GOC = GOC_PHAM;

/** Biến thể của một món trong kho trang bị (cùng ô, cùng phẩm, cùng chỉ số — chỉ khác tên và hình). */
export type BienThe = 'a' | 'b' | 'c';
export const BIEN_THE_DS: readonly BienThe[] = ['a', 'b', 'c'];
export type TongDo = 'son' | 'thuy';
export type GioiDo = 'nam' | 'nu';

/** Tên trang bị theo tông × phẩm × ô × biến thể — CHÉP TỪ `web/son-ha-tien-lo/js/tang-bao.js` (`BIEN_THE`), sửa một
 *  bên thì sửa cả bên kia. Ảnh: `assets/do/kho/<B|G|V><phẩm 1–5><''|b|c>-<son|thuy>[-<nam|nu> cho giáp y].webp`
 *  (bản gốc: `web/son-ha-tien-lo/tranh-goc/`). */
export const TEN_BIEN_THE: Record<TongDo, readonly Record<OTrangBi, readonly [string, string, string]>[]> = {
  son: [
    { vu: ['Cung Tre Vót', 'Cung Mây Đan', 'Cung Trúc Buộc Thừng'], ao: ['Sơn Dã Bào', 'Mộc Diệp Bào', 'Thạch Văn Bào'], bao: ['Vòng Đá Suối', 'Chuỗi Hạt Gỗ Trầm', 'Vòng Nanh Lợn Rừng'] },
    { vu: ['Cung Gỗ Tên Đồng', 'Cung Sừng Trâu', 'Cung Gỗ Lim Lông Trĩ'], ao: ['Lông Trĩ Linh Y', 'Bích Ngọc Linh Y', 'Trúc Phong Linh Y'], bao: ['Khuyên Tai Ngọc Bích', 'Chuỗi Hạt Ngọc Bích', 'Vòng Cổ Nanh Hổ'] },
    { vu: ['Rìu Xéo Đồng', 'Rìu Lưỡi Hia Khắc Hươu', 'Rìu Đôi Đồng Núi'], ao: ['Tê Giác Huyền Giáp', 'Đá Ong Huyền Giáp', 'Lạc Vũ Huyền Bào'], bao: ['Lục Lạc Đồng', 'Chuông Đồng Cán Hươu', 'Lục Lạc Ngọc Bích'] },
    { vu: ['Dao Găm Tượng Người Ngọc Bích', 'Dao Găm Cán Tượng Voi', 'Dao Găm Chuôi Rắn Quấn'], ao: ['Hộ Tâm Đồng Giáp', 'Hươu Thần Chiến Bào', 'Tản Viên Chiến Bào'], bao: ['Vòng Tay Khảm Ngọc Bích', 'Vòng Tay Đồng Chuông Nhỏ', 'Vòng Cổ Đồng Mã Não'] },
    { vu: ['Cung Thần Chim Lạc', 'Cung Thần Sấm Núi', 'Cung Thần Voi Chín Ngà'], ao: ['Thiên Y Lông Lạc', 'Thiên Y Mây Tản Viên', 'Thiên Giáp Sơn Thần'], bao: ['Mặt Trống Hộ Sơn', 'Mặt Ngọc Chim Lạc', 'Vòng Đồng Voi Chín Ngà'] },
  ],
  thuy: [
    { vu: ['Lao Tre Vót', 'Xiên Cá Tre', 'Lao Tre Mũi Ốc'], ao: ['Ngư Gia Bào', 'Rong Biển Bào', 'Bạch Sa Bào'], bao: ['Vòng Vỏ Sò', 'Chuỗi Vỏ Ốc Suối', 'Vòng Xương Cá'] },
    { vu: ['Mũi Lao Đồng', 'Lao Đồng Ngạnh Cá', 'Lao Đồng Tua Rong'], ao: ['Ngân Lân Linh Y', 'Kim Lý Linh Y', 'Bạch Lộ Linh Y'], bao: ['Khuyên Tai Ngọc Trai', 'Chuỗi Ngọc Trai', 'Vòng Cổ Răng Cá Mập'] },
    { vu: ['Đinh Ba Đồng', 'Đinh Ba Sóng Bạc', 'Chĩa Đồng Hai Ngạnh'], ao: ['Mai Rùa Huyền Giáp', 'Cua Đá Huyền Giáp', 'Cá Sấu Huyền Giáp'], bao: ['Lục Lạc Đồng Hình Ốc', 'Tù Và Ốc Biển', 'Chuông Đồng Hình Sò'] },
    { vu: ['Dao Găm Tượng Người San Hô', 'Dao Găm Cán Cá Sấu', 'Dao Găm Lưỡi Sóng'], ao: ['Châu Ngọc Đồng Giáp', 'Sóng Bạc Chiến Bào', 'Rùa Thần Chiến Bào'], bao: ['Vòng Tay Khảm San Hô', 'Vòng Tay Ngọc Trai Đen', 'Vòng Cổ San Hô Đỏ'] },
    { vu: ['Lao Thần Chim Lạc', 'Lao Thần Sóng Dữ', 'Lao Thần Rùa Vàng'], ao: ['Thiên Y Lạc Thủy', 'Thiên Y Sóng Bạc', 'Thiên Giáp Mai Rùa Thần'], bao: ['Mặt Trống Hộ Thủy', 'Ngọc Trai Rùa Vàng', 'Vòng Đồng Sóng Biển'] },
  ],
};

export interface TrangBi {
  o: OTrangBi;
  pham: number;
  cong: number;
  thu: number;
  /** Biến thể a / b / c trong kho trang bị (thiếu: món cũ trước khi có kho — tên bảng gốc, hình chung). */
  bt?: BienThe;
  /** Tông và giới của người cầm — đóng lên món khi nhận (`hopNguoi`), quyết định tên và hình. */
  tg?: TongDo;
  gi?: GioiDo;
  /** Tên riêng khi món lấy từ kho người vận hành đã sửa (khác tên gốc). */
  ten?: string;
  /** Ảnh riêng người vận hành tải lên (URL). */
  anh?: string;
}

/** Một món trong KHO ĐỒ người vận hành sửa được (thẻ "Trang bị & vũ khí", cai-dat.ts): món nào `bat` mới rơi.
 *  Cùng ô, cùng phẩm có nhiều món thì bốc theo tỉ trọng `roi`. `goc` là chỉ số gốc (±15% mỗi lần rơi). */
export interface MonDo {
  id: string;
  o: OTrangBi;
  pham: number;
  ten: string;
  goc: number;
  roi: number;
  anh: string;
  bat: boolean;
}

export type TuiDo = Partial<Record<OTrangBi, TrangBi>>;

export const tenDo = (t: TrangBi) =>
  t.ten ?? (t.bt !== undefined && t.tg !== undefined ? TEN_BIEN_THE[t.tg][t.pham]?.[t.o][BIEN_THE_DS.indexOf(t.bt)] : undefined) ?? TEN_DO[t.o][t.pham]!;

const CHU_O: Record<OTrangBi, string> = { vu: 'B', ao: 'G', bao: 'V' };

/** Mã kho của món, như trang Tàng Bảo Các: `B1`, `G2c`, `V5b`. */
export const maDo = (t: Pick<TrangBi, 'o' | 'pham' | 'bt'>) => `${CHU_O[t.o]}${t.pham + 1}${t.bt === undefined || t.bt === 'a' ? '' : t.bt}`;

/** Đường ảnh (trong assets) của món theo biến thể + tông + giới; món cũ chưa có biến thể thì hình chung của ô. */
export function hinhDo(t: TrangBi): string {
  if (t.bt === undefined || t.tg === undefined) return `do/${t.o}.webp`;
  return `do/kho/${maDo(t)}-${t.tg}${t.o === 'ao' ? `-${t.gi ?? 'nam'}` : ''}.webp`;
}

export const bocBienThe = (rand: () => number): BienThe => BIEN_THE_DS[Math.min(2, Math.floor(rand() * 3))]!;

/** Đóng tông, giới của người cầm lên món (giữ biến thể). Người chưa có tông thì giữ nguyên. */
export function hopNguoi(t: TrangBi, tong: TongDo | null | undefined, gioi: GioiDo | null | undefined): TrangBi {
  const ra: TrangBi = { ...t };
  if (tong != null) ra.tg = tong;
  if (gioi != null) ra.gi = gioi;
  return ra;
}

/** Kho gốc: 3 ô × 5 phẩm, đúng bảng TEN_DO / GOC_PHAM. */
export const KHO_DO_GOC: readonly MonDo[] = O_TRANG_BI.flatMap((o) =>
  PHAM.map((_, p) => ({ id: `${o}${p}`, o, pham: p, ten: TEN_DO[o][p]!, goc: GOC[p]!, roi: 1, anh: '', bat: true })),
);

/** Chọn món trong kho cho ô `o`, phẩm `p`: đúng phẩm trước; kho không còn món phẩm đó thì lấy phẩm gần nhất
 *  (ưu tiên thấp hơn). Kho không còn món nào của ô này thì trả null (dùng bảng gốc). */
function chonMon(kho: readonly MonDo[], o: OTrangBi, p: number, rand: () => number): MonDo | null {
  const cua = kho.filter((m) => m.bat && m.o === o);
  if (cua.length === 0) return null;
  let ds = cua.filter((m) => m.pham === p);
  for (let d = 1; ds.length === 0 && d < PHAM.length; d++) {
    ds = cua.filter((m) => m.pham === p - d);
    if (ds.length === 0) ds = cua.filter((m) => m.pham === p + d);
  }
  if (ds.length <= 1) return ds[0] ?? null;
  let r = rand() * ds.reduce((a, m) => a + Math.max(0, m.roi), 0);
  for (const m of ds) {
    r -= Math.max(0, m.roi);
    if (r < 0) return m;
  }
  return ds[0]!;
}

/** Mỗi món một chút khác nhau (±15%) để nhặt món cùng phẩm vẫn có thể là món tốt hơn. `kho`: kho đồ người vận
 *  hành đã sửa (thiếu là bảng gốc). */
export function taoDo(
  o: OTrangBi,
  pham: number,
  rand: () => number,
  kho?: readonly MonDo[] | null,
  ai?: { phe: TongDo | null; gioi: GioiDo | null } | null,
): TrangBi {
  let p = Math.max(0, Math.min(PHAM.length - 1, Math.round(pham)));
  const mon = kho == null ? null : chonMon(kho, o, p, rand);
  if (mon !== null) p = Math.max(0, Math.min(PHAM.length - 1, Math.round(mon.pham)));
  const g = (mon !== null ? Math.max(1, mon.goc) : GOC[p]!) * (0.85 + 0.3 * rand());
  const them: Pick<TrangBi, 'bt' | 'tg' | 'gi' | 'ten' | 'anh'> = { bt: bocBienThe(rand) };
  if (ai?.phe != null) them.tg = ai.phe;
  if (ai?.gioi != null) them.gi = ai.gioi;
  if (mon !== null && mon.ten !== '' && mon.ten !== TEN_DO[o][p]) them.ten = mon.ten;
  if (mon !== null && mon.anh !== '') them.anh = mon.anh;
  if (o === 'vu') return { o, pham: p, cong: Math.round(g), thu: 0, ...them };
  if (o === 'ao') return { o, pham: p, cong: 0, thu: Math.round(g), ...them };
  return { o, pham: p, cong: Math.round(g / 2), thu: Math.round(g / 2), ...them };
}

export const giaTri = (t: TrangBi) => t.cong + t.thu;

export const macDuoc = (canh: number, t: TrangBi) => canh >= PHAM[t.pham]!.can;

/** Công, thủ gốc (chưa đồ) theo cảnh giới. Lực chiến gốc = công + thủ: dưới Nguyên Anh mỗi cảnh giới
 *  tăng vài chục (20 → 50 → 90 → 140), từ Nguyên Anh tăng hàng trăm (300 → 500 → 750 → 1050 → 1400 →
 *  1800). Công : thủ ≈ 55 : 45. Bảng: ban-do.md §3c. */
export const CONG_CANH = [12, 28, 50, 77, 165, 275, 413, 578, 770, 990] as const;
export const THU_CANH = [8, 22, 40, 63, 135, 225, 337, 472, 630, 810] as const;
const kep = (canh: number) => Math.max(0, Math.min(CONG_CANH.length - 1, Math.round(canh)));
export const congGoc = (canh: number) => CONG_CANH[kep(canh)]!;
export const thuGoc = (canh: number) => THU_CANH[kep(canh)]!;
/** Lực chiến gốc của cảnh giới (công + thủ, chưa đồ). */
export const lucGoc = (canh: number) => congGoc(canh) + thuGoc(canh);
/** Mỗi tầng công pháp (võ công) cộng thêm chừng này phần lực chiến gốc của cảnh giới. */
export const VO_LUC = 0.06;

export function chiSo(canh: number, tui: TuiDo): { cong: number; thu: number } {
  let cong = congGoc(canh);
  let thu = thuGoc(canh);
  for (const o of O_TRANG_BI) {
    const t = tui[o];
    if (t === undefined) continue;
    cong += t.cong;
    thu += t.thu;
  }
  return { cong, thu };
}

/** Bốc phẩm đồ rơi. `gan` 0..1: càng gần lõi Địa Cung càng dễ ra đồ quý. */
export function bocPham(rand: () => number, gan: number): number {
  const g = Math.max(0, Math.min(1, gan));
  const w = [55, 27, 12, 5, 1].map((x, i) => x * (1 + g * i * 1.3));
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) {
    r -= w[i]!;
    if (r < 0) return i;
  }
  return 0;
}

/** Đại Chiến: mỗi cú đẩy nặng 1 + công/150, trần ×2,5. */
export const lucDay = (cong: number) => 1 + Math.min(1.5, Math.max(0, cong) / 150);

/** Đại Chiến: thủ trung bình của một phe chặn bớt lực đẩy của phe kia, trần 20%. */
export const chanDay = (thuTrungBinh: number) => Math.min(0.2, Math.max(0, thuTrungBinh) / 800);

/** Nhặt món này thì có mặc vào không: mặc được và tốt hơn món đang mặc. */
export function nenMac(canh: number, tui: TuiDo, t: TrangBi): boolean {
  if (!macDuoc(canh, t)) return false;
  const cu = tui[t.o];
  return cu === undefined || giaTri(t) > giaTri(cu);
}

/** Món không mặc thì luyện hoá thành linh khí. */
export const lkLuyenHoa = (t: TrangBi) => 4 + 6 * t.pham;
