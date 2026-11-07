import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleTopGivers: LiveModule<Config, State> = { manifest, core };

export { core, DOI_KIEU_MS, dongDua, hangDangSoi, hienDua, kieuDua } from './core';
export { manifest, schema } from './manifest';
// Phần vẽ KHÔNG xuất ở đây: `index.ts` phải nạp được ở Node (test, trang quản
// lý) mà không kéo theo React và CSS. Lấy qua `@live/mod-top-givers/stage`.
export type { Dua, State } from './core';
export type { Config } from './manifest';
