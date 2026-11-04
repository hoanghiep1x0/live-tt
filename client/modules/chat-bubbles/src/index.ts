import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleChatBubbles: LiveModule<Config, State> = { manifest, core };

export { core } from './core';
export { manifest, schema } from './manifest';
// Phần vẽ lấy qua `@live/mod-chat-bubbles/stage` — xem ghi chú ở top-givers.
export type { Bong, State } from './core';
export type { Config } from './manifest';
