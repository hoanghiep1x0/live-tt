/** Tủ đồ chia món của module (docs/phong/san-bar/nhan-vat/09-tu-do.md).
 *
 *  Món nằm ở `assets/tu-do/<thân>/<nguồn>/<ô>/<món>/` của module; máy chủ quét thư mục và trả danh sách ở `/s/tu-do/<module>`.
 *  Luật ô và luật che ở đây — bảng xem, sân khấu và test cùng dùng, không chép ở chỗ nào khác. */

/** Vùng bắt buộc phải che khi lên sóng (chính sách TikTok LIVE). */
export const VUNG_CHE = ['nguc', 'hang'] as const;
export type VungChe = (typeof VUNG_CHE)[number];

/** Các ô theo thứ tự hiện trên bảng. `lien` (đầm, suit liền) chiếm cả `ao` và `duoi`; `lot` là đồ lót an toàn, sân
 *  khấu tự mặc kèm khi bộ chưa che đủ. */
export const O_TU_DO = [
  { id: 'lien', ten: 'Đầm / liền' },
  { id: 'ao', ten: 'Áo' },
  { id: 'duoi', ten: 'Quần / váy' },
  { id: 'lot', ten: 'Lót' },
  { id: 'giay', ten: 'Giày' },
  { id: 'toc', ten: 'Tóc' },
  { id: 'mu', ten: 'Mũ' },
  { id: 'kinh', ten: 'Kính' },
  { id: 'gang-tay', ten: 'Găng tay' },
  { id: 'phu-kien', ten: 'Phụ kiện' },
] as const;

const CHIEM: Readonly<Record<string, readonly string[]>> = { lien: ['lien', 'ao', 'duoi'], ao: ['ao', 'lien'], duoi: ['duoi', 'lien'] };
/** Ô có thể che vùng nhạy cảm. Tóc xoã ngực, giày, phụ kiện không tính dù `che` khai gì: tóc là sợi alpha, nhìn xuyên. */
const O_CHE = ['lien', 'ao', 'duoi', 'lot'];
const cheVung = (m: MonTuDo, v: string): boolean => O_CHE.includes(m.o) && m.che.includes(v);

/** Tuổi duy nhất phòng sàn bar nhận (chính sách TikTok về trẻ vị thành niên). */
export const TUOI_NGUOI_LON = 'nguoi-lon';

/** Một món như máy chủ trả về (nội dung `mon.json` + `duong`). */
export interface MonTuDo {
  id: string;
  /** Nhân vật mà món được ôm theo (vd `model-1`): đồ của thân này không mặc vừa thân khác. */
  than: string;
  /** `nu`, `nam`, `chung` — để lọc. */
  gioi?: string;
  /** Thiếu là coi như KHÔNG phải người lớn: món không khai tuổi không lọt vào phòng sàn bar. */
  tuoi?: string;
  nguon: string;
  o: string;
  ten: string;
  che: readonly string[];
  /** Đường trong assets của module, kết thúc bằng `/`: `tu-do/<thân>/<nguồn>/<ô>/<món>/`. */
  duong: string;
  giayPhep?: string;
  tacGia?: string;
}

export function khoaMon(m: Pick<MonTuDo, 'than' | 'nguon' | 'o' | 'id'>): string {
  return `${m.than}/${m.nguon}/${m.o}/${m.id}`;
}

/** Phần tủ dùng được cho một nhân vật: đúng thân của nó, và chỉ đồ người lớn — luật của phòng sàn bar, đặt ở đây để
 *  bảng xem và sân khấu không chỗ nào quên lọc. */
export function locTuDo(ds: readonly MonTuDo[], than: string): MonTuDo[] {
  return ds.filter((m) => m.than === than && m.tuoi === TUOI_NGUOI_LON);
}

/** Đọc danh sách máy chủ trả: bỏ mục sai dạng thay vì làm hỏng cả tủ. */
export function docTuDo(x: unknown): MonTuDo[] {
  if (!Array.isArray(x)) return [];
  return x.filter(
    (m): m is MonTuDo =>
      typeof m === 'object' &&
      m !== null &&
      typeof m.id === 'string' &&
      typeof m.than === 'string' &&
      typeof m.nguon === 'string' &&
      typeof m.o === 'string' &&
      typeof m.duong === 'string' &&
      Array.isArray(m.che),
  ).map((m) => ({ ...m, ten: typeof m.ten === 'string' ? m.ten : m.id }));
}

/** Bấm một món trong lưới: đang mặc thì cởi; chưa thì mặc, và cởi mọi món cùng chiếm ô đó (đầm thay áo + quần…). */
export function bamMon(ds: readonly MonTuDo[], dangMac: readonly string[], khoa: string): string[] {
  if (dangMac.includes(khoa)) return dangMac.filter((k) => k !== khoa);
  const m = ds.find((x) => khoaMon(x) === khoa);
  if (m === undefined) return [...dangMac];
  const chiem = CHIEM[m.o] ?? [m.o];
  const giu = dangMac.filter((k) => {
    const x = ds.find((y) => khoaMon(y) === k);
    return x === undefined ? false : !chiem.includes(x.o);
  });
  return [...giu, khoa];
}

/** Bộ sẽ lên sóng: các món đang chọn còn trong tủ, cộng đồ lót — LUÔN có lót che ngực và vùng kín bên trong, kể cả
 *  khi áo / quần đã che (ưu tiên lót đã chọn, rồi lót đầu tiên của tủ). Tủ không có lót che một vùng thì `null`: không
 *  cho mặc bộ này. Không chọn món nào là mảng rỗng (dùng bộ dựng sẵn trong GLB). */
export function boLenSong(ds: readonly MonTuDo[], dangMac: readonly string[]): MonTuDo[] | null {
  const chon = dangMac.map((k) => ds.find((m) => khoaMon(m) === k)).filter((m): m is MonTuDo => m !== undefined);
  if (chon.length === 0) return [];
  const bo = [...chon];
  for (const v of VUNG_CHE) {
    // luôn có đồ lót bên trong, kể cả khi áo / quần đã che: nhảy mạnh vải ngoài xô lệch vẫn không lộ
    if (bo.some((m) => m.o === 'lot' && cheVung(m, v))) continue;
    const lot = ds.find((m) => m.o === 'lot' && cheVung(m, v));
    if (lot === undefined) return null;
    if (!bo.includes(lot)) bo.push(lot);
  }
  return bo;
}

/** Số giả ngẫu nhiên có hạt giống từ chuỗi (mulberry32 trên băm chuỗi): cùng chuỗi, cùng dãy số. */
export function rngChuoi(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
