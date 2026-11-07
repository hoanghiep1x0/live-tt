/** Cầu nối tới vỏ desktop (`desktop/`, Tauri) — chỉ có khi trang quản lý chạy
 *  trong app. Mở bằng trình duyệt thường thì `laApp()` sai và mọi lệnh báo lỗi.
 *
 *  Gọi thẳng `__TAURI_INTERNALS__.invoke` (đúng thứ `@tauri-apps/api` gọi bên
 *  trong) thay vì kéo thêm cả gói chỉ để dùng một hàm.
 */

interface TauriNoiBo {
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

export function laApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function goi<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const t = (window as unknown as { __TAURI_INTERNALS__?: TauriNoiBo }).__TAURI_INTERNALS__;
  if (t === undefined) return Promise.reject(new Error('Chỉ chạy được trong app desktop'));
  return t.invoke<T>(cmd, args);
}

export type { TabWeb } from './trang-web';
import type { TabWeb } from './trang-web';

export interface KhungWeb {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Lệnh trình duyệt của vỏ (`desktop/src/trinh_duyet.rs`). */
export const tabWeb = {
  mo: (id: string, url: string) => goi<void>('tab_mo', { id, url }),
  dong: (id: string) => goi<void>('tab_dong', { id }),
  di: (id: string, url: string) => goi<void>('tab_di', { id, url }),
  lichSu: (id: string, viec: 'lui' | 'toi' | 'tai-lai') => goi<void>('tab_lich_su', { id, viec }),
  hien: (id: string, khung: KhungWeb) => goi<void>('tab_hien', { id, khung }),
  an: () => goi<void>('tab_an'),
  ds: () => goi<TabWeb[]>('tab_ds'),
};

/** Mở cửa sổ phòng riêng (sân khấu + bảng cài đặt) — chỉ có trong app desktop. */
export const phongCuaSo = {
  mo: (id: string) => goi<void>('phong_mo', { id }),
};

export { docOThemTab, idTabMoi, nhanTab, nickTuLink, TRANG_CO_SAN } from './trang-web';
export type { TrangCoSan } from './trang-web';
