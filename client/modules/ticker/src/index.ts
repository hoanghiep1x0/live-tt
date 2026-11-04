import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleTicker: LiveModule<Config, State> = { manifest, core };

export { core, chuHien, NGHI_MS, thoiLuongMs } from './core';
export { manifest, schema } from './manifest';
// Phần vẽ lấy qua `@live/mod-ticker/stage` — xem ghi chú ở top-givers.
export type { Loi, State } from './core';
export type { Config } from './manifest';
