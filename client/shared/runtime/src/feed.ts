import type { Ctx, Effect, FeedItem, FeedKind, LiveModule } from '@live/contracts';

/** Gọi đúng móc sự kiện của module cho một mục trên bus.
 *
 *  Module không bắt loại này thì không bị gọi — phòng đông người thì khác biệt
 *  này là thật, mỗi bình luận không phải chạy qua hai mươi hàm chỉ để bị bỏ. */
export function runFeed<C, S>(
  m: LiveModule<C, S>,
  state: S,
  item: FeedItem,
  ctx: Ctx<C>,
): Effect[] {
  const hook = m.core.hooks?.[item.kind];
  if (!hook) return [];
  // Lọc nhân vật ảo ở một chỗ duy nhất, thay vì tin là cả hai mươi module đều nhớ.
  if (item.virtual && !hook.includeVirtual) return [];
  return hook.run(state, item, ctx);
}

export function runTick<C, S>(
  m: LiveModule<C, S>,
  state: S,
  now: number,
  ctx: Ctx<C>,
): Effect[] {
  return m.core.onTick?.(state, now, ctx) ?? [];
}

export function runAction<C, S>(
  m: LiveModule<C, S>,
  state: S,
  op: string,
  ctx: Ctx<C>,
): Effect[] {
  return m.core.onAction?.(state, op, ctx) ?? [];
}

/** Nhịp gọi `onTick`. Mặc định một giây. */
export function tickMs<C, S>(m: LiveModule<C, S>): number {
  return m.core.tickMs ?? 1000;
}

/** Các loại sự kiện module thật sự có móc. Dùng để đối chiếu với
 *  `manifest.triggers` — khai một đằng làm một nẻo là lỗi im lặng khó thấy. */
export function hookKinds<C, S>(m: LiveModule<C, S>): FeedKind[] {
  return Object.keys(m.core.hooks ?? {}) as FeedKind[];
}
