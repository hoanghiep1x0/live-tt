/** Ảnh minh hoạ của một truyện — phần thuần, dùng chung cho bảng xem thử (nơi
 *  xem tiến độ) và khung chiếu (nơi hiện). Không React, không DOM.
 *
 *  Ảnh do máy chủ tự làm (`backend/src/anh_truyen.rs`): người vận hành chỉ bật
 *  "AI tự tạo ảnh". AI kể truyện đọc cả truyện, lập hồ sơ (phong cách + ngoại
 *  hình từng nhân vật), tự quyết đoạn nào cần ảnh (tối đa 10, đoạn cùng cảnh
 *  dùng lại ảnh trước) và tự viết lời vẽ; máy chủ vẽ
 *  lần lượt rồi ghi vào cấu hình. Ở đây chỉ còn việc đọc: đoạn nào hiện ảnh nào.
 */

/** Một mốc ảnh của truyện. Mỗi ảnh hiện từ đoạn của nó tới mốc kế tiếp. */
export interface MocAnh {
  /** Đoạn bắt đầu hiện ảnh, đếm từ 1 như người vận hành đọc. */
  tu: number;
  /** Lời vẽ AI kể truyện viết. */
  ta: string;
  /** Tên các nhân vật có mặt — khớp tên trong hồ sơ. */
  nhanVat: string[];
  /** Đường dẫn ảnh đã vẽ, rỗng là chưa vẽ. */
  anh: string;
  /** Nguyên văn đoạn truyện lúc vẽ. Đoạn đó bị sửa thì ảnh lệch, thôi hiện. */
  dau: string;
}

export interface NhanVat {
  ten: string;
  ta: string;
}

/** Số ảnh tối đa khi vẽ qua API (tính tiền mỗi ảnh): AI chọn cảnh, tối đa 10. */
export const MOC_TOI_DA = 10;
/** Số mốc tối đa cất được — vẽ bằng muse.ai (miễn phí) thì mỗi đoạn một ảnh. */
export const MOC_LUU_TOI_DA = 30;

/** Hồ sơ nhân vật: mỗi dòng `Tên: ngoại hình`. Dòng không có dấu hai chấm bỏ. */
export function docNhanVat(text: string): NhanVat[] {
  return text
    .split('\n')
    .map((d) => d.trim())
    .map((d) => {
      const i = d.indexOf(':');
      return i <= 0 ? null : { ten: d.slice(0, i).trim(), ta: d.slice(i + 1).trim() };
    })
    .filter((x): x is NhanVat => x !== null && x.ten !== '' && x.ta !== '');
}

/** Mảng mốc từ cấu hình (đã qua JSON) — mục hỏng thì bỏ chứ không làm sập khung. */
export function cacMoc(v: unknown): MocAnh[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
    .map((m) => ({
      tu: typeof m['tu'] === 'number' ? m['tu'] : 0,
      ta: typeof m['ta'] === 'string' ? m['ta'] : '',
      nhanVat: Array.isArray(m['nhanVat'])
        ? m['nhanVat'].filter((x): x is string => typeof x === 'string')
        : [],
      anh: typeof m['anh'] === 'string' ? m['anh'] : '',
      dau: typeof m['dau'] === 'string' ? m['dau'] : '',
    }))
    .filter((m) => m.tu >= 1);
}

export type TinhTrangMoc = 'chua-ve' | 'da-ve' | 'lech';

/** `doan`: các đoạn đã cắt như `catDoan` của module story (và `cat_doan` ở
 *  máy chủ) — trim, nén khoảng trắng, bỏ dòng trống. */
export function tinhTrangMoc(moc: MocAnh, doan: readonly string[]): TinhTrangMoc {
  if (moc.anh === '') return 'chua-ve';
  return moc.dau === (doan[moc.tu - 1] ?? '') ? 'da-ve' : 'lech';
}

/** Ảnh cho đoạn `i` (đếm từ 0): mốc gần nhất đứng trước hoặc tại đoạn đó mà
 *  đã vẽ và còn khớp truyện. Không có thì rỗng — khung dùng ảnh chung. */
export function anhChoDoan(moc: readonly MocAnh[], i: number, doan: readonly string[]): string {
  let ra = '';
  for (const m of [...moc].sort((a, b) => a.tu - b.tu)) {
    if (m.tu - 1 > i) break;
    if (tinhTrangMoc(m, doan) === 'da-ve') ra = m.anh;
  }
  return ra;
}
