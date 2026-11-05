import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleVuCong3d: LiveModule<Config, State> = { manifest, core };

export {
  core,
  boBat,
  boHopLe,
  boKe,
  DIEU,
  DIEU_LUAN_PHIEN,
  KHO_DIEU,
  DIEU_NGHI,
  MODEL,
  NGAU_NHIEN,
  NHAN_VAT,
  THEO_NHOM,
  NUT,
  TRANG_PHUC,
} from './core';
export { BO_NGAU_NHIEN, DIEU_NHOM, manifest, schema, TOI_DA_DAM_DONG } from './manifest';
// Phần vẽ lấy qua `@live/mod-vu-cong-3d/stage` — xem ghi chú ở top-givers.
export type { State, TrangPhucId } from './core';
export type { Config } from './manifest';
