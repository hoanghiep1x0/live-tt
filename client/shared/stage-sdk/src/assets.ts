/** Đường dẫn tới assets.
 *
 *  Backend phục vụ assets ở route riêng, KHÔNG nằm trong bản build:
 *  - `/a/<designId>/…`  assets của thiết kế
 *  - `/m/<moduleId>/…`  assets của module, dùng được ở mọi bối cảnh
 *
 *  Nhờ vậy sửa một tấm nền không phải build lại thiết kế, và 19 MB ảnh không bị
 *  chép vào `dist` mỗi lần build.
 */

function sach(path: string): string {
  return path.replace(/^\/+/, '');
}

export function designAssetUrl(designId: string, path: string): string {
  return `/a/${designId}/${sach(path)}`;
}

/** Assets mặc định của module.
 *
 *  Chưa có phần thiết kế phủ lên bản riêng của bối cảnh (xem docs/04 §6) —
 *  khi làm sẽ thêm ở đây, chứ không rải `if` ra từng module. */
export function moduleAssetUrl(moduleId: string, path: string): string {
  return `/m/${moduleId}/${sach(path)}`;
}
