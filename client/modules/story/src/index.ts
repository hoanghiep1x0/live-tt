import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleStory: LiveModule<Config, State> = { manifest, core };

export { core, catDoan, doanHienTai } from './core';
export { manifest, schema } from './manifest';
// Phần vẽ lấy qua `@live/mod-story/stage` — xem ghi chú ở top-givers.
export type { State } from './core';
export type { Config } from './manifest';
