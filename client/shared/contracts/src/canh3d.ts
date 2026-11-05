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
}

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
    typeof n.theoNhom === 'boolean'
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
    };
  } catch {
    return null;
  }
}
