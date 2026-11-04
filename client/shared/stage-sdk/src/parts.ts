/** Sổ phần vẽ của module.
 *
 *  Thiết kế KHÔNG được import từ `client/modules/*` (quy ước 04 §1) — nó chỉ đặt
 *  `<Slot name="…" />`. Nên sổ này nằm ở shared: module nào có `stage.tsx` thì
 *  thêm một dòng vào đây, mọi thiết kế có slot tương ứng đều vẽ được nó.
 */

import type { Json, SlotName } from '@live/contracts';
import type { ComponentType } from 'react';
import type { StageState } from './state';

export interface StagePartProps<C = Json> {
  config: C;
  state: StageState;
}

export interface StagePart {
  moduleId: string;
  slot: SlotName;
  Part: ComponentType<StagePartProps>;
}

/** Chưa có module nào có phần vẽ: bốn module đầu (`gift-thanks`, `welcome`,
 *  `likes-counter`, `follow-thanks`) đều chỉ trả `Effect`, không tự vẽ.
 *  Thêm vào đây khi module đầu tiên có `stage.tsx`. */
export const PARTS: readonly StagePart[] = [];

export function partsCho(slot: SlotName, enabled: readonly string[]): readonly StagePart[] {
  return PARTS.filter((p) => p.slot === slot && enabled.includes(p.moduleId));
}
