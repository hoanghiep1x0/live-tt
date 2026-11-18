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

/** Chỉ số gốc từng phẩm: binh khí cho công, giáp y cho thủ, bảo vật cho cả hai (nửa mức). */
const GOC = [6, 14, 26, 42, 64];

export interface TrangBi {
  o: OTrangBi;
  pham: number;
  cong: number;
  thu: number;
}

export type TuiDo = Partial<Record<OTrangBi, TrangBi>>;

export const tenDo = (t: TrangBi) => TEN_DO[t.o][t.pham]!;

/** Mỗi món một chút khác nhau (±15%) để nhặt món cùng phẩm vẫn có thể là món tốt hơn. */
export function taoDo(o: OTrangBi, pham: number, rand: () => number): TrangBi {
  const p = Math.max(0, Math.min(PHAM.length - 1, Math.round(pham)));
  const g = GOC[p]! * (0.85 + 0.3 * rand());
  if (o === 'vu') return { o, pham: p, cong: Math.round(g), thu: 0 };
  if (o === 'ao') return { o, pham: p, cong: 0, thu: Math.round(g) };
  return { o, pham: p, cong: Math.round(g / 2), thu: Math.round(g / 2) };
}

export const giaTri = (t: TrangBi) => t.cong + t.thu;

export const macDuoc = (canh: number, t: TrangBi) => canh >= PHAM[t.pham]!.can;

/** Công thủ trần (chưa đồ) theo cảnh giới — công gốc bằng sát thương gốc đánh yêu tinh xưa nay. */
export const congGoc = (canh: number) => 10 + 6 * canh;
export const thuGoc = (canh: number) => 8 + 5 * canh;

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
