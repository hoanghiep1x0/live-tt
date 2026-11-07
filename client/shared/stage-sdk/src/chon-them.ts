/** Ô "chọn nhiều, tìm được, thêm được" — phần THUẦN, không React, không DOM.
 *
 *  Giá trị đi qua máy chủ là MỘT CHUỖI, các mục ngăn bằng dấu phẩy. Cố ý:
 *  máy chủ đọc nó như một ô chữ bình thường (`truyen_sau::the_loai_dat`),
 *  không phải biết gì về danh sách hay thứ tự.
 */

/** Tách chuỗi thành các mục, bỏ khoảng trắng thừa và mục rỗng. Hàm thuần. */
export function tach(v: unknown): string[] {
  if (typeof v !== 'string') return [];
  return v
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '');
}

/** Ghép các mục lại thành chuỗi để lưu. Hàm thuần. */
export function ghep(ds: readonly string[]): string {
  return ds.join(', ');
}

/** So khớp bỏ hoa thường và khoảng trắng thừa — "Truyện Cười" và "truyện cười"
 *  là một mục, đừng để người vận hành thêm hai lần. Hàm thuần. */
export function chuan(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Thêm một mục, bỏ qua nếu đã có (không phân biệt hoa thường). Hàm thuần. */
export function them(ds: readonly string[], moi: string): string[] {
  const t = moi.trim();
  if (t === '' || ds.some((x) => chuan(x) === chuan(t))) return [...ds];
  return [...ds, t];
}

/** Bỏ một mục. Hàm thuần. */
export function bo(ds: readonly string[], x: string): string[] {
  return ds.filter((y) => chuan(y) !== chuan(x));
}

/** Gợi ý còn lại: mục trong `nguon` khớp chữ đang gõ và CHƯA được chọn.
 *  Gõ rỗng thì gợi ý tất cả những cái chưa chọn. Hàm thuần. */
export function goiY(nguon: readonly string[], daChon: readonly string[], go: string): string[] {
  const t = chuan(go);
  return nguon.filter((x) => !daChon.some((y) => chuan(y) === chuan(x))).filter((x) => t === '' || chuan(x).includes(t));
}

/** Chữ đang gõ có phải một mục MỚI (chưa có trong gợi ý lẫn trong danh sách
 *  đã chọn) không — để hiện dòng "thêm …". Hàm thuần. */
export function laMoi(nguon: readonly string[], daChon: readonly string[], go: string): boolean {
  const t = chuan(go);
  if (t === '') return false;
  return ![...nguon, ...daChon].some((x) => chuan(x) === t);
}
