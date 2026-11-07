import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleStory: LiveModule<Config, State> = { manifest, core };

export { CHAO_KHUNG, core, catDoan, chuPhuDe, CHO_MC_MS, doanHienTai, dongHo, loiChaoKhung } from './core';
export { coHinhNao, manifest, schema, trongSuot } from './manifest';
// Phần vẽ lấy qua `@live/mod-story/stage` — xem ghi chú ở top-givers.
export type { State } from './core';
export type { Config } from './manifest';
