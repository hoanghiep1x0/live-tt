/** Sổ module của sân khấu.
 *
 *  Thiết kế KHÔNG được import từ `client/modules/*` (quy ước 04 §1) — nó chỉ đặt
 *  `<Slot name="…" />`. Nên sổ này nằm ở shared: thêm một module là thêm một
 *  dòng ở đây, mọi thiết kế có slot tương ứng đều chạy và vẽ được nó.
 */

import type { ComponentType } from 'react';
import type {
  Effect,
  FeedItem,
  Json,
  LiveModule,
  ModuleUi,
  SessionView,
  SlotName,
  TrangThaiNut,
} from '@live/contracts';
import { ganGiong, khoaGiong, phuCauHinh } from '@live/contracts';
import { runAction, runFeed, runTick } from '@live/runtime';

import { moduleChatBubbles } from '@live/mod-chat-bubbles';
import { Stage as ChatBubblesStage } from '@live/mod-chat-bubbles/stage';
import { moduleLikesCounter } from '@live/mod-likes-counter';
import { Stage as LikesCounterStage } from '@live/mod-likes-counter/stage';
import { moduleTopGivers } from '@live/mod-top-givers';
import { Stage as TopGiversStage } from '@live/mod-top-givers/stage';
import { moduleTicker } from '@live/mod-ticker';
import { Stage as TickerStage } from '@live/mod-ticker/stage';
import { moduleDanceFloor } from '@live/mod-dance-floor';
import { moduleHostVideo } from '@live/mod-host-video';
import { Stage as HostVideoStage } from '@live/mod-host-video/stage';
import { Stage as DanceFloorStage } from '@live/mod-dance-floor/stage';
import { moduleStory, trongSuot as storyTrongSuot } from '@live/mod-story';
import { Stage as StoryStage } from '@live/mod-story/stage';
import { moduleVuCong3d } from '@live/mod-vu-cong-3d';
import { Stage as VuCong3dStage } from '@live/mod-vu-cong-3d/stage';
import { moduleDoChu } from '@live/mod-do-chu';
import { Stage as DoChuStage } from '@live/mod-do-chu/stage';

import { DANH_SACH_MODULE } from './danh-sach';
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
  /** Hàng đọc đang bận — xem `Ctx.dangNoi`. */
  dangNoi?: boolean;
}

/** Một thể đang sống của module: giữ state bên trong, lộ ra đúng bốn cửa.
 *  Nhờ đóng kín thế này mà sổ module xếp chung được nhiều module khác kiểu mà
 *  không phải xoá kiểu bằng `any` ở chỗ nào. */
export interface TheSong {
  feed(item: FeedItem, ctx: CtxChung): Effect[];
  tick(now: number, ctx: CtxChung): Effect[];
  /** Người vận hành bấm một nút của module (`ModuleUi.actions`). */
  action(op: string, ctx: CtxChung): Effect[];
  doiCauHinh(c: Json): void;
  dispose(): void;
  state(): unknown;
}

export interface DangKy {
  id: string;
  /** Phần khai cho người: tên, icon, và các ô cấu hình. Bảng xem thử dựng form
   *  từ đây, y như trang quản lý — không chỗ nào biết tên module cụ thể. */
  ui: ModuleUi;
  slot?: SlotName;
  Part?: ComponentType<StagePartProps>;
  /** Module đang xin thiết kế bỏ nền của slot — màn chờ, nền khung — để lộ
   *  phòng phía sau. Đọc theo cấu hình đầy đủ, vì thường là một công tắc. */
  trongSuot?: (config: Json) => boolean;
  /** Cấu hình đầy đủ: mặc định của schema, phủ bằng thứ đã lưu.
   *
   *  Backend chỉ lưu những khoá người vận hành đã đổi, nên cấu hình thô luôn
   *  thiếu khoá. Gộp ở đây — một chỗ duy nhất — thay vì để mỗi lõi và mỗi phần
   *  vẽ tự phòng thân bằng `?? mặc định`, kiểu nào rồi cũng sót một chỗ. */
  hopCauHinh(luu: Json): Json;
  mo(config: Json): TheSong;
  /** Hàng nút của module đang ở thế nào (`core.trangThaiNut`), đọc từ state lõi. */
  trangThaiNut?: (state: unknown, now: number) => TrangThaiNut;
}

/** Phần vẽ của một module, đã xoá kiểu để xếp chung. */
interface PhanVe {
  slot: SlotName;
  Part: ComponentType<StagePartProps>;
  trongSuot?: (config: Json) => boolean;
}

/** Ghép phần vẽ với module của nó. Nhận chính module object nên kiểu cấu hình
 *  của Part được kiểm tra khớp với module; chỗ ép kiểu ở đây là ranh giới xoá
 *  kiểu duy nhất, và nó an toàn vì `mo()` dựng đúng cặp config/state đó. */
function phan<C, S>(
  mod: LiveModule<C, S>,
  p: {
    slot: SlotName;
    Part: ComponentType<StagePartProps<C, S>>;
    trongSuot?: (config: C) => boolean;
  },
): [string, PhanVe] {
  return [
    mod.manifest.id,
    {
      slot: p.slot,
      Part: p.Part as unknown as ComponentType<StagePartProps>,
      ...(p.trongSuot === undefined
        ? {}
        : { trongSuot: p.trongSuot as unknown as (config: Json) => boolean }),
    },
  ];
}

/** Module nào có phần vẽ trên sân khấu, vẽ ở slot nào. Module không có ở đây
 *  vẫn chạy (cảm ơn quà, chào người vào…), chỉ là không chiếm slot. Danh sách
 *  module thì KHÔNG khai ở đây — xem `./danh-sach`. */
const PHAN_VE = new Map<string, PhanVe>([
  phan(moduleStory, { slot: 'screen', Part: StoryStage, trongSuot: storyTrongSuot }),
  phan(moduleTopGivers, { slot: 'tops', Part: TopGiversStage }),
  phan(moduleChatBubbles, { slot: 'chat', Part: ChatBubblesStage }),
  phan(moduleLikesCounter, { slot: 'target', Part: LikesCounterStage }),
  phan(moduleTicker, { slot: 'ticker', Part: TickerStage }),
  phan(moduleDanceFloor, { slot: 'floor', Part: DanceFloorStage }),
  phan(moduleHostVideo, { slot: 'corner-right', Part: HostVideoStage }),
  phan(moduleVuCong3d, { slot: 'stage-3d', Part: VuCong3dStage }),
  // Lớp học tự vẽ cả bảng đen: xin thiết kế cất màn chờ của nó đi.
  phan(moduleDoChu, { slot: 'full', Part: DoChuStage, trongSuot: () => true }),
]);

function dangKy(mod: LiveModule, part: PhanVe | undefined): DangKy {
  // `schema.parse({})` cho đúng bộ mặc định mà module đã khai (quy ước 01 §7).
  const macDinh = mod.manifest.schema.parse({}) as { [k: string]: Json };
  // Ô chọn giọng của module, nếu có: câu nào module đọc mà không tự nói giọng
  // nào thì runtime gắn giọng này vào — lõi module không phải biết gì về giọng.
  const khoa = khoaGiong(mod.manifest.fields);
  const giongCua = (c: Json): unknown =>
    khoa === undefined ? undefined : (c as Record<string, unknown>)[khoa];
  const hopCauHinh = (luu: Json): Json => phuCauHinh(mod.manifest.fields, macDinh, luu);

  return {
    id: mod.manifest.id,
    ui: mod.manifest,
    hopCauHinh,
    ...(part ?? {}),
    ...(mod.core.trangThaiNut === undefined
      ? {}
      : { trangThaiNut: mod.core.trangThaiNut.bind(mod.core) }),
    mo(config) {
      let cfg = hopCauHinh(config);
      let st = mod.core.init(cfg);
      return {
        feed: (item, ctx) =>
          ganGiong(runFeed(mod, st, item, { ...ctx, config: cfg }), giongCua(cfg)),
        tick: (now, ctx) => ganGiong(runTick(mod, st, now, { ...ctx, config: cfg }), giongCua(cfg)),
        action: (op, ctx) =>
          ganGiong(runAction(mod, st, op, { ...ctx, config: cfg }), giongCua(cfg)),
        doiCauHinh(x) {
          cfg = hopCauHinh(x);
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

// Phần vẽ cho một module chưa có trong danh sách là phần vẽ không bao giờ hiện:
// báo ngay lúc nạp thay vì để người dùng đi tìm vì sao slot trống.
for (const id of PHAN_VE.keys()) {
  if (!DANH_SACH_MODULE.some((m) => m.manifest.id === id)) {
    throw new Error(`Phần vẽ của "${id}" không có module trong danh-sach.ts`);
  }
}

export const SO_MODULE: readonly DangKy[] = DANH_SACH_MODULE.map((m) =>
  dangKy(m, PHAN_VE.get(m.manifest.id)),
);

export function timDangKy(id: string): DangKy | undefined {
  return SO_MODULE.find((x) => x.id === id);
}

export function partsCho(slot: SlotName, enabled: readonly string[]): readonly DangKy[] {
  return SO_MODULE.filter((p) => p.slot === slot && enabled.includes(p.id));
}

/** Có module nào đang bật ở slot này xin khung trong suốt không. Thuần, để
 *  test được mà không dựng React. */
export function slotTrongSuot(
  slot: SlotName,
  enabled: readonly string[],
  config: Readonly<Record<string, Json>>,
): boolean {
  return partsCho(slot, enabled).some(
    (p) => p.trongSuot !== undefined && p.trongSuot(p.hopCauHinh(config[p.id] ?? {})),
  );
}
