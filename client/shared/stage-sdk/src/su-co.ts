/** Luật của toast sự cố: từ trạng thái phòng ra danh sách việc cần báo.
 *  Tách khỏi component để test được không cần dựng React. */

import type { ConfigField, Json } from '@live/contracts';

export interface SuCo {
  /** Mỗi loại sự cố một id: bấm ✕ là ẩn loại đó tới khi nó hết rồi tái phát. */
  id: string;
  tieuDe: string;
  chu: string;
}

/** Tên các loại sự cố máy chủ báo (`backend/src/su_co.rs`). */
const TIEU_DE: Readonly<Record<string, string>> = {
  'viet-truyen': 'AI chưa viết được truyện',
  'chuan-bi': 'Chưa có truyện kế tiếp',
  nguon: 'Mất dữ liệu TikTok',
  giong: 'Giọng đọc đang lỗi',
  'o-cung': 'Ổ cứng sắp đầy',
};

const DUOI_DU_PHONG = /\s*\(đang dùng lượt dự phòng\)\s*$/;

/** Lỗi thô của nhà cung cấp ra câu người vận hành hiểu và biết phải làm gì.
 *  Lỗi chưa biết thì giữ nguyên: thà thô còn hơn đoán sai. */
export function dienGiaiLoiAi(loi: string): string {
  const goc = loi.replace(DUOI_DU_PHONG, '');
  let chu = goc;
  if (/trả mã 401|invalid x-api-key/i.test(goc)) {
    chu = 'Khoá API bị từ chối (sai hoặc đã hết hạn). Kiểm tra lại ở Kết nối AI.';
  } else if (/trả mã 429|rate.?limit|usage limits?/i.test(goc)) {
    chu = 'Nhà cung cấp AI báo đã chạm giới hạn lượt dùng.';
  }
  return DUOI_DU_PHONG.test(loi) ? `${chu} Truyện vẫn chạy bằng lượt dự phòng.` : chu;
}

/** Lỗi vẽ ảnh của các tính năng đang bật, đọc theo ô khai `truyen.loi` trong
 *  manifest nên không phải biết tên tính năng. Rỗng là không có lỗi. */
export function loiAnhCua(
  modules: readonly { id: string; ui: { fields: readonly ConfigField[] } }[],
  enabled: readonly string[],
  config: Readonly<Record<string, Json>>,
): string {
  for (const m of modules) {
    if (!enabled.includes(m.id)) continue;
    const cfg = config[m.id];
    if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) continue;
    for (const f of m.ui.fields) {
      if (f.truyen === undefined) continue;
      const loi = cfg[f.truyen.loi];
      if (typeof loi === 'string' && loi.trim() !== '') return loi.trim();
    }
  }
  return '';
}

export interface DauVaoSuCo {
  /** Mất nối máy chủ đủ lâu (không tính nhịp nối lúc mới mở trang). */
  matNoi: boolean;
  aiBat: boolean;
  aiLoi: string | null;
  loiAnh: string;
  /** Sự cố máy chủ báo, khoá là loại. */
  mayChu: Readonly<Record<string, string>>;
}

/** Những việc đang cần báo, việc làm phòng dừng hẳn đứng trước. */
export function dsSuCo(v: DauVaoSuCo): SuCo[] {
  const ds: SuCo[] = [];
  if (v.matNoi) {
    ds.push({
      id: 'may-chu',
      tieuDe: 'Mất nối máy chủ',
      chu: 'Ứng dụng có thể đã tắt. Sân khấu đang tự nối lại.',
    });
  }
  if (v.aiBat && v.aiLoi !== null) {
    ds.push({ id: 'ai', tieuDe: 'MC đang lỗi', chu: dienGiaiLoiAi(v.aiLoi) });
  }
  if (v.loiAnh !== '') {
    ds.push({ id: 'anh', tieuDe: 'Chưa vẽ được ảnh truyện', chu: v.loiAnh });
  }
  for (const [khoa, chu] of Object.entries(v.mayChu)) {
    ds.push({ id: khoa, tieuDe: TIEU_DE[khoa] ?? 'Phòng gặp sự cố', chu });
  }
  return ds;
}
