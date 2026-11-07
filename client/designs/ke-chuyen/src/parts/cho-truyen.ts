/** Giờ nghỉ giữa hai truyện — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Màn chờ vẽ ở `Stage.tsx`.
 */

/** Giờ nghỉ đổi truyện ngắn nhất, PHẢI khớp `GIAI_LAO_TOI_THIEU_MS` ở
 *  `backend/src/truyen_sau.rs`.
 *
 *  Máy chủ nghỉ ít nhất ngần này rồi mới mở truyện mới; phòng đang sôi động
 *  (còn người chờ được chào hay được đáp) thì nghỉ thêm, nhiều nhất 90 giây.
 *  Đếm ngược theo mốc NGẮN NHẤT: đếm theo mốc dài thì gần như lần nào truyện
 *  cũng vào sớm hơn số đang đếm, người xem nhìn con số nhảy cóc. Đếm theo mốc
 *  ngắn thì tới 0 là thôi đếm, truyện vào ngay sau đó. */
export const GIAI_LAO_TOI_THIEU_MS = 40_000;

export interface GiaiLao {
  /** Tên truyện sắp kể. */
  truyenSau: string;
  /** "chuyen" — nghỉ giữa hai truyện; "anh" / "ket-noi" — nghỉ vì sự cố. */
  lyDo: string;
  /** Lúc mở giờ nghỉ (ms). */
  tu: number;
}

/** Ô `giaiLao` trong cấu hình module Kể truyện; sai kiểu thì coi như không có. */
export function giaiLaoCua(cfg: unknown): GiaiLao | null {
  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) return null;
  const g = (cfg as Record<string, unknown>)['giaiLao'];
  if (typeof g !== 'object' || g === null || Array.isArray(g)) return null;
  const o = g as Record<string, unknown>;
  const tu = typeof o['tu'] === 'number' ? o['tu'] : 0;
  if (tu <= 0) return null;
  return {
    truyenSau: typeof o['truyenSau'] === 'string' ? o['truyenSau'] : '',
    lyDo: typeof o['lyDo'] === 'string' ? o['lyDo'] : 'chuyen',
    tu,
  };
}

/** Còn mấy giây nữa tới truyện kế. `null` là đừng đếm: không trong giờ nghỉ,
 *  nghỉ vì sự cố (không biết bao giờ xong — đếm ngược rồi đứng ở 0 thì nhìn
 *  như hỏng), hay đã hết giờ tối thiểu mà truyện chưa vào.
 *
 *  Hàm thuần: hai cửa sổ cùng xem một phòng đếm giống nhau. */
export function giayConLai(g: GiaiLao | null, now: number): number | null {
  if (g === null || g.lyDo !== 'chuyen') return null;
  const con = g.tu + GIAI_LAO_TOI_THIEU_MS - now;
  if (con <= 0) return null;
  return Math.ceil(con / 1000);
}
