/** Camera bấm tay — phần THUẦN, test chạy được ở Node. */

/** Một nhân vật trong danh sách game báo lên bảng ⚙. */
export interface CamNv {
  /** Tài khoản của khách, tên của nhân vật máy. Mỗi cửa sổ chạy một sân riêng nên không dùng id. */
  khoa: string;
  ten: string;
  that: boolean;
  cap: number;
  trung: boolean;
}

/** Nhân vật kế tiếp khi bấm Trước / Sau, vòng lại ở hai đầu.
 *  Chưa giữ ai thì Sau lấy người đầu, Trước lấy người cuối. */
export function khoaKeTiep(ds: readonly CamNv[], dang: string, buoc: 1 | -1): string | null {
  const n = ds.length;
  if (n === 0) return null;
  const i = ds.findIndex((x) => x.khoa === dang);
  const toi = i < 0 ? (buoc > 0 ? 0 : n - 1) : (i + buoc + n) % n;
  return ds[toi]!.khoa;
}

/** Tên một dòng trong ô chọn nhân vật. */
export function tenCamNv(x: CamNv): string {
  return `${x.that ? '' : '🤖 '}${x.ten} · ${x.trung ? 'trứng' : `cấp ${x.cap}`}`;
}
