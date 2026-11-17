/** Thẻ riêng tách từ cấu hình module — phần THUẦN (`TheTach` ở hợp đồng). */

import type { ModuleUi, TheTach } from '@live/contracts';

/** Các khoá đã có thẻ riêng lo: hộp cấu hình của module không hiện lại. */
export function oDaTach(ui: Pick<ModuleUi, 'theTach'>): ReadonlySet<string> {
  return new Set((ui.theTach ?? []).flatMap((t) => [t.congTac, ...t.fields]));
}

/** Dòng trạng thái của thẻ: "Truyện kế tiếp: Tấm Cám · cổ tích". Thẻ không
 *  khai `trangThai` thì rỗng. */
export function dongTrangThai(the: Pick<TheTach, 'trangThai'>, cfg: Record<string, unknown>): string {
  const tt = the.trangThai;
  if (tt === undefined) return '';
  const o = cfg[tt.o];
  const nguon = typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {};
  const cac = tt.khoa
    .map((k) => nguon[k])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map((v) => v.trim());
  return `${tt.nhan}: ${cac.length === 0 ? tt.khiTrong : cac.join(' · ')}`;
}

/** Đường POST của nút áp dụng, đã điền id thiết kế. */
export function duongApDung(mau: string, thietKe: string): string {
  return mau.replace('{id}', encodeURIComponent(thietKe));
}
