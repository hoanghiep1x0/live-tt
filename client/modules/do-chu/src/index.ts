import type { LiveModule } from '@live/contracts';
import { core } from './core';
import { manifest } from './manifest';
import type { State } from './core';
import type { Config } from './manifest';

export const moduleDoChu: LiveModule<Config, State> = { manifest, core };

export { core, apCauHinh, chuMieng, laySoDeCat, napDuLieu, noiTen, xep, DUNG_CUA, tenCo, khauHieu } from './core';
export { manifest, schema, NUT } from './manifest';
// Phần vẽ lấy qua `@live/mod-do-chu/stage` — nạp lười, chỉ phòng lớp học mới tải.
export type { DuLieuNap, QuaGanNhat, State } from './core';
export type { Config } from './manifest';
