import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleGiftThanks: LiveModule<Config, State> = { manifest, core };

export { core } from './core';
export { manifest, schema } from './manifest';
export type { State } from './core';
export type { Config } from './manifest';
