/** Nhờ hộp Trình duyệt mở một địa chỉ.
 *
 *  Thẻ thiết kế nằm cách hộp Trình duyệt vài tầng component, mà hộp thì tự giữ
 *  danh sách tab của nó. Thay vì luồn `onMoTrang` qua từng tầng, bắn một tin
 *  trên `window`: hộp nghe tin, mở tab và bật lên. Phần thuần (tên tin, hàm
 *  đọc) để riêng ở đây cho test chạy được ở Node.
 */

export const TIN_MO_TRANG = 'live:mo-trang';

export interface YeuCauMoTrang {
  /** Id tab trong vỏ app. Mở lần hai cùng id là về đúng tab đang có. */
  id: string;
  url: string;
}

/** Bắn yêu cầu mở một trang trong trình duyệt của app. */
export function moTrangTrongApp(yc: YeuCauMoTrang): void {
  window.dispatchEvent(new CustomEvent<YeuCauMoTrang>(TIN_MO_TRANG, { detail: yc }));
}

/** Nghe yêu cầu mở trang. Trả hàm gỡ. */
export function ngheMoTrang(nhan: (yc: YeuCauMoTrang) => void): () => void {
  const f = (e: Event) => {
    const d = (e as CustomEvent<YeuCauMoTrang>).detail;
    if (d !== undefined && typeof d.url === 'string' && d.url !== '') nhan(d);
  };
  window.addEventListener(TIN_MO_TRANG, f);
  return () => window.removeEventListener(TIN_MO_TRANG, f);
}
