/** Sổ module của sân khấu.
 *
 *  Thiết kế KHÔNG được import từ `client/modules/*` (quy ước 04 §1) — nó chỉ đặt
 *  `<Slot name="…" />`. Nên sổ này nằm ở shared: thêm một module là thêm một
 *  dòng ở đây, mọi thiết kế có slot tương ứng đều chạy và vẽ được nó.
 */

import type { ComponentType } from 'react';
import type { Effect, FeedItem, Json, LiveModule, SessionView, SlotName } from '@live/contracts';
import { runFeed, runTick } from '@live/runtime';

import { moduleChatBubbles } from '@live/mod-chat-bubbles';
import { Stage as ChatBubblesStage } from '@live/mod-chat-bubbles/stage';
import { moduleLikesCounter } from '@live/mod-likes-counter';
import { Stage as LikesCounterStage } from '@live/mod-likes-counter/stage';
import { moduleTopGivers } from '@live/mod-top-givers';
import { Stage as TopGiversStage } from '@live/mod-top-givers/stage';
import { moduleFollowThanks } from '@live/mod-follow-thanks';
import { moduleGiftThanks } from '@live/mod-gift-thanks';
import { moduleWelcome } from '@live/mod-welcome';

import type { StageState } from './state';

export interface StagePartProps<C = Json, S = unknown> {
  config: C;
  /** Phiên và danh sách module đang bật. */
  state: StageState;
  /** Trạng thái lõi của chính module này. */
  modState: S;
  /** Giờ hiện tại. Tiêm vào để phần vẽ theo thời gian cũng chạy lại được. */
  now: number;
}

/** Ngữ cảnh chung, thiếu đúng phần cấu hình — cấu hình là của từng module. */
export interface CtxChung {
  now: number;
  rand: () => number;
  session: SessionView;
}

/** Một thể đang sống của module: giữ state bên trong, lộ ra đúng bốn cửa.
 *  Nhờ đóng kín thế này mà sổ module xếp chung được nhiều module khác kiểu mà
 *  không phải xoá kiểu bằng `any` ở chỗ nào. */
export interface TheSong {
  feed(item: FeedItem, ctx: CtxChung): Effect[];
  tick(now: number, ctx: CtxChung): Effect[];
  doiCauHinh(c: Json): void;
  dispose(): void;
  state(): unknown;
}

export interface DangKy {
  id: string;
  slot?: SlotName;
  Part?: ComponentType<StagePartProps>;
  /** Cấu hình đầy đủ: mặc định của schema, phủ bằng thứ đã lưu.
   *
   *  Backend chỉ lưu những khoá người vận hành đã đổi, nên cấu hình thô luôn
   *  thiếu khoá. Gộp ở đây — một chỗ duy nhất — thay vì để mỗi lõi và mỗi phần
   *  vẽ tự phòng thân bằng `?? mặc định`, kiểu nào rồi cũng sót một chỗ. */
  hopCauHinh(luu: Json): Json;
  mo(config: Json): TheSong;
}

function dangKy<C, S>(
  mod: LiveModule<C, S>,
  part?: { slot: SlotName; Part: ComponentType<StagePartProps<C, S>> },
): DangKy {
  // `schema.parse({})` cho đúng bộ mặc định mà module đã khai (quy ước 01 §7).
  const macDinh = mod.manifest.schema.parse({}) as object;
  const hopCauHinh = (luu: Json): Json =>
    ({ ...macDinh, ...(typeof luu === 'object' && luu !== null ? luu : {}) }) as Json;

  return {
    id: mod.manifest.id,
    hopCauHinh,
    ...(part === undefined
      ? {}
      : {
          slot: part.slot,
          // Component nhận props hẹp hơn; chỗ này là ranh giới xoá kiểu duy nhất,
          // và nó an toàn vì `mo()` ở ngay dưới dựng đúng cặp config/state đó.
          Part: part.Part as unknown as ComponentType<StagePartProps>,
        }),
    mo(config) {
      let cfg = hopCauHinh(config) as C;
      let st = mod.core.init(cfg);
      return {
        feed: (item, ctx) => runFeed(mod, st, item, { ...ctx, config: cfg }),
        tick: (now, ctx) => runTick(mod, st, now, { ...ctx, config: cfg }),
        doiCauHinh(x) {
          cfg = hopCauHinh(x) as C;
          if (mod.core.onConfig !== undefined) st = mod.core.onConfig(st, cfg);
        },
        dispose() {
          mod.core.dispose?.(st);
        },
        state: () => st,
      };
    },
  };
}

export const SO_MODULE: readonly DangKy[] = [
  dangKy(moduleGiftThanks),
  dangKy(moduleWelcome),
  dangKy(moduleFollowThanks),
  dangKy(moduleTopGivers, { slot: 'tops', Part: TopGiversStage }),
  dangKy(moduleChatBubbles, { slot: 'chat', Part: ChatBubblesStage }),
  dangKy(moduleLikesCounter, { slot: 'target', Part: LikesCounterStage }),
];

export function timDangKy(id: string): DangKy | undefined {
  return SO_MODULE.find((x) => x.id === id);
}

export function partsCho(slot: SlotName, enabled: readonly string[]): readonly DangKy[] {
  return SO_MODULE.filter((p) => p.slot === slot && enabled.includes(p.id));
}
