/** Đường chuyển tin "quyền nói" (`quyen-noi.ts`) qua máy chủ.
 *
 *  `BroadcastChannel` chỉ nối các cửa sổ CÙNG một trình duyệt. Mở sân khấu ở
 *  hai trình duyệt khác nhau — cửa sổ phòng của app (WebView2) và một ô trình
 *  duyệt khác (Chrome, app Claude…) — là hai cửa sổ không nghe thấy nhau, cả
 *  hai cùng đọc, lệch nhau nửa giây: nghe như lặp giọng. Mọi sân khấu đều nối
 *  `/ws` của máy chủ, nên máy chủ chuyển tin quyền nói tới tất cả.
 *
 *  Tách thành mô-đun riêng để `audio.ts` (giữ quyền nói) và `state.ts` (giữ
 *  WebSocket) dùng chung mà không import vòng vào nhau.
 */

type Nghe = (tin: unknown) => void;

let gui: ((tin: unknown) => void) | null = null;
const cacNghe = new Set<Nghe>();

/** `state.ts` đặt hàm gửi khi có WebSocket. */
export function datGuiQuyen(f: ((tin: unknown) => void) | null): void {
  gui = f;
}

/** Gửi một tin quyền nói lên máy chủ (chưa nối thì thôi: nhịp sau gửi lại). */
export function guiQuyen(tin: unknown): void {
  gui?.(tin);
}

/** Máy chủ chuyển xuống một tin quyền nói của cửa sổ khác. */
export function nhanQuyen(tin: unknown): void {
  cacNghe.forEach((f) => f(tin));
}

/** Đăng ký nghe tin quyền nói qua máy chủ. */
export function ngheQuyen(f: Nghe): void {
  cacNghe.add(f);
}
