import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleDanceFloor: LiveModule<Config, State> = { manifest, core };

export { core, dangCua, xepSan, CHO_DUNG, TOI_DA } from './core';
export { manifest, schema } from './manifest';
// Phần vẽ lấy qua `@live/mod-dance-floor/stage` — xem ghi chú ở top-givers.
export type { Dang, NguoiSan, State } from './core';
export type { Config } from './manifest';
