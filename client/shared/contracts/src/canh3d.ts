/** Slot `stage-3d` — module nói với cảnh 3D của thiết kế. Xem docs/02-hop-dong.md §5b.
 *
 *  Cảnh 3D (renderer, đèn, camera, chỗ đứng) là của thiết kế; nhân vật và lựa chọn của
 *  nó (bộ đồ, điệu) là của module. Phần vẽ của module không đụng WebGL: nó đặt một
 *  phần tử trong slot với thuộc tính `data-canh3d` = JSON của `VuCong3D`, thiết kế
 *  khai `provides: ['stage-3d']` thì đọc thuộc tính đó và dựng. Nhờ vậy module không
 *  kéo three.js theo, và thiết kế không phải import module nào (quy ước 04 §1). */

export const CANH3D_ATTR = 'data-canh3d';

/** Khu vực đứng của đám đông. Mỗi thiết kế tự đo khu vực trong phòng của nó. */
export const KHU_VUC = [
  { id: 'quanh-san', ten: 'Quanh sàn — hai bên' },
  { id: 'phia-truoc', ten: 'Phía trước — quay về sân khấu' },
] as const;

/** Một nhóm đám đông: thiết kế rải `so` người vào `khuVuc`, mỗi người mặc một bộ bốc
 *  trong `bo`. `theoNhom`: nhảy cùng điệu chung với vai chính; không thì mỗi người tự đổi. */
export interface NhomDamDong {
  id: string;
  so: number;
  khuVuc: string;
  bo: readonly string[];
  theoNhom: boolean;
  /** Món tủ đồ cả nhóm này mặc (URL thư mục món, như `VuCong3D.mon`). Có thì thay cho `bo`. */
  mon?: readonly string[];
  /** Nhiều bộ tủ đồ (mỗi bộ là danh sách URL thư mục món, đã kèm lót): mỗi người trong nhóm bốc một bộ — đám đông
   *  không ai giống ai. Có thì thay cho `mon` và `bo`. */
  monBo?: readonly (readonly string[])[];
  /** Nhân vật ảnh động trong nhóm: đứng trên sàn thành tấm ảnh quay về camera, chạy khung của ảnh, đổi ảnh theo góc
   *  camera nếu có ảnh nhiều góc. Người trong nhóm chia nhau cả `monBo` lẫn `anh`. */
  anh?: readonly (string | AnhGoc)[];
}

/** Một nhân vật ảnh động nhiều góc (URL ảnh động mỗi góc). Thiếu góc nào thì lấy góc gần nhất có ảnh; góc bên kia lấy
 *  bằng lật gương. Ảnh chéo / nghiêng vẽ người quay sang trái màn hình. */
export interface AnhGoc {
  truoc: string;
  cheo?: string;
  nghieng?: string;
  cheoSau?: string;
  sau?: string;
}

function laAnh(x: unknown): x is string | AnhGoc {
  if (typeof x === 'string') return true;
  const a = x as Partial<AnhGoc> | null;
  return (
    typeof a === 'object' &&
    a !== null &&
    typeof a.truoc === 'string' &&
    [a.cheo, a.nghieng, a.cheoSau, a.sau].every((v) => v === undefined || typeof v === 'string')
  );
}

const laChuoi = (x: unknown): boolean => Array.isArray(x) && x.every((m) => typeof m === 'string');

function laNhom(x: unknown): x is NhomDamDong {
  const n = x as Partial<NhomDamDong> | null;
  return (
    typeof n === 'object' &&
    n !== null &&
    typeof n.id === 'string' &&
    typeof n.so === 'number' &&
    typeof n.khuVuc === 'string' &&
    Array.isArray(n.bo) &&
    n.bo.every((b) => typeof b === 'string') &&
    typeof n.theoNhom === 'boolean' &&
    (n.mon === undefined || laChuoi(n.mon)) &&
    (n.monBo === undefined || (Array.isArray(n.monBo) && n.monBo.every(laChuoi))) &&
    (n.anh === undefined || (Array.isArray(n.anh) && n.anh.every(laAnh)))
  );
}

export interface VuCong3D {
  /** GLB nhân vật có xương + điệu, thường là asset của module (`/m/<id>/…`). */
  model: string;
  /** Id bộ trang phục trong GLB (`extras.outfits` của xương). `null` = bộ đầu tiên. */
  trangPhuc: string | null;
  /** Tên điệu (tên animation trong GLB) mọi vũ công cùng nhảy. `null` = thiết kế tự đổi điệu. */
  dieu: string | null;
  /** Các điệu thiết kế được tự chọn khi vũ công nhảy tự do (`dieu` null). Thiếu là mọi điệu
   *  trong GLB. Module dùng để loại đoạn nối, điệu cần đạo cụ… — thiết kế không phải biết. */
  tuDo?: readonly string[];
  /** Vũ công đang nghỉ: phát `dieu` thật chậm tại chỗ, thành nhún nhẹ thay vì nhảy. */
  nghi?: boolean;
  /** Người không có mặt: `vu-cong-<n>` (chỗ đứng thứ n trên sàn, đếm từ 1), `dj`,
   *  `man-chieu`. Thiết kế ẩn đúng người đó; id thiết kế không có thì bỏ qua. */
  an?: readonly string[];
  /** Người mặc bộ riêng, không theo `trangPhuc` của cả nhóm: id người (như `an`) → id bộ. */
  boRieng?: Readonly<Record<string, string>>;
  /** Đám đông quanh vai chính, theo nhóm. */
  damDong?: readonly NhomDamDong[];
  /** Món đồ rời từ tủ đồ cả nhóm đang mặc: URL thư mục món (kết thúc bằng `/`, có `mon.glb` + `mat-na.png`).
   *  Có món thì thiết kế ẩn bộ đồ dựng sẵn trong GLB (`trangPhuc`), gắn món vào xương từng vũ công và ẩn da dưới
   *  món theo ảnh mặt nạ. Danh sách đã đủ che (module tự thêm đồ lót) — thiết kế không phải kiểm. */
  mon?: readonly string[];
  /** Món tủ đồ riêng của từng người: id người (như `an`) → URL thư mục món. Có thì người đó mặc các món này, bỏ qua
   *  `boRieng`, `trangPhuc` và `mon` của cả nhóm. Đã đủ che như `mon`. */
  monRieng?: Readonly<Record<string, readonly string[]>>;
  /** Màn thay đồ VIP (quà lớn): thiết kế dựng cánh cửa quanh `nguoi`, đóng lại, bùng nổ, mở ra trong bộ `mon`
   *  (URL thư mục món, đã kèm lót) rồi mặc tới `den`. Id mới là diễn lại từ đầu. */
  thayDo?: ThayDo3D;
}

export interface ThayDo3D {
  id: number;
  nguoi: string;
  /** Tên khách tặng quà — thiết kế hiện lời cảm ơn; rỗng thì không. */
  khach: string;
  mon: readonly string[];
  /** Lúc bắt đầu màn và lúc hết mặc đồ VIP (ms, cùng đồng hồ với `Date.now()`). */
  tu: number;
  den: number;
  /** Các mốc trong màn (ms tính từ `tu`): cửa đóng kín, đổi đồ (sau cửa), cửa mở, hết màn. */
  moc: { dongCua: number; doiDo: number; moCua: number; het: number };
}

function laThayDo(x: unknown): x is ThayDo3D {
  const t = x as Partial<ThayDo3D> | null;
  const m = t?.moc as Partial<ThayDo3D['moc']> | undefined;
  return (
    typeof t === 'object' &&
    t !== null &&
    typeof t.id === 'number' &&
    typeof t.nguoi === 'string' &&
    typeof t.khach === 'string' &&
    laChuoi(t.mon) &&
    typeof t.tu === 'number' &&
    typeof t.den === 'number' &&
    m !== undefined &&
    [m.dongCua, m.doiDo, m.moCua, m.het].every((v) => typeof v === 'number')
  );
}

/** Đọc thuộc tính `data-canh3d`. Sai dạng thì `null` — thiết kế coi như không có module. */
export function docVuCong3D(raw: string | null | undefined): VuCong3D | null {
  if (raw === null || raw === undefined || raw === '') return null;
  try {
    const v = JSON.parse(raw) as Partial<VuCong3D>;
    if (typeof v.model !== 'string' || v.model === '') return null;
    return {
      model: v.model,
      trangPhuc: typeof v.trangPhuc === 'string' ? v.trangPhuc : null,
      dieu: typeof v.dieu === 'string' ? v.dieu : null,
      ...(Array.isArray(v.tuDo) && v.tuDo.every((x) => typeof x === 'string')
        ? { tuDo: v.tuDo }
        : {}),
      ...(v.nghi === true ? { nghi: true } : {}),
      ...(Array.isArray(v.an) && v.an.every((x) => typeof x === 'string') ? { an: v.an } : {}),
      ...(typeof v.boRieng === 'object' &&
      v.boRieng !== null &&
      Object.values(v.boRieng).every((x) => typeof x === 'string')
        ? { boRieng: v.boRieng }
        : {}),
      ...(Array.isArray(v.damDong) && v.damDong.every(laNhom) ? { damDong: v.damDong } : {}),
      ...(Array.isArray(v.mon) && v.mon.every((x) => typeof x === 'string') ? { mon: v.mon } : {}),
      ...(typeof v.monRieng === 'object' &&
      v.monRieng !== null &&
      Object.values(v.monRieng).every((ds) => Array.isArray(ds) && ds.every((x) => typeof x === 'string'))
        ? { monRieng: v.monRieng }
        : {}),
      ...(laThayDo(v.thayDo) ? { thayDo: v.thayDo } : {}),
    };
  } catch {
    return null;
  }
}
