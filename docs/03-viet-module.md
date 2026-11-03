# 03 — Viết một module

Thêm một tính năng = thêm một thư mục trong `client/modules/`.
Không sửa file nào ở nơi khác. Nếu bạn thấy mình phải sửa chỗ khác, kiến trúc đã sai — báo lại.

## 1. Bốn bước

```bash
mkdir -p client/modules/vi-du/src client/modules/vi-du/test
```

1. `src/manifest.ts` — khai báo và schema cấu hình
2. `src/core.ts` — lõi thuần
3. `src/stage.tsx` — lớp hiển thị, chỉ khi cần vẽ
4. `test/core.test.ts` — test cho lõi

Rồi thêm `"@live/mod-vi-du"` vào `dependencies` của `client/shared/runtime`. Registry tự nạp.

## 2. Ví dụ đầy đủ — module Cảm ơn quà

### `src/manifest.ts`

```ts
import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  minCoins: z.number().int().min(0).default(1),
  template: z.string().min(1).default('Cảm ơn {ten} đã tặng {qua}!'),
  combo: z.boolean().default(true),
  comboMs: z.number().int().min(0).max(30_000).default(5_000),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'gift-thanks',
  name: 'Cảm ơn quà',
  icon: '🎁',
  summary: 'Đọc tên & tạo hiệu ứng khi có quà',
  group: 'quick',
  configVersion: 1,
  schema,
  quick: [
    { key: 'minCoins', label: 'Từ (xu)' },
    { key: 'combo', label: 'Combo' },
  ],
  needs: ['tts'],
};
```

Khai báo `quick` là xong — thẻ trên trang Tính năng tự có ô chỉnh nhanh, modal tự có đủ trường.
Không viết một dòng JSX nào cho phần cấu hình.

### `src/core.ts`

```ts
import type { Effect, FeedItem, ModuleCore, Ctx } from '@live/contracts';
import type { Config } from './manifest';

interface State {
  /** Quà đang gom theo nick, để gộp combo. */
  pending: Map<string, { gift: string; count: number; since: number }>;
  lastSaidAt: number;
}

export function fill(template: string, v: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
}

export const core: ModuleCore<Config, State> = {
  init: () => ({ pending: new Map(), lastSaidAt: 0 }),

  onFeed(state, item, ctx) {
    if (item.kind !== 'gift' || item.virtual) return [];
    if ((item.coins ?? 0) < ctx.config.minCoins) return [];

    const who = item.user ?? item.name;

    if (!ctx.config.combo) return [sayFor(ctx.config, item.name, item, 1)];

    // Gom quà dồn: người tặng liên tiếp chỉ được cảm ơn một lần.
    const cur = state.pending.get(who);
    if (cur) { cur.count += 1; return []; }
    state.pending.set(who, { gift: item.text, count: 1, since: ctx.now });
    return [];
  },

  onTick(state, now, ctx) {
    const out: Effect[] = [];
    for (const [who, p] of state.pending) {
      if (now - p.since < ctx.config.comboMs) continue;
      state.pending.delete(who);
      out.push(sayFor(ctx.config, who, { text: p.gift } as FeedItem, p.count));
    }
    return out;
  },

  onConfig(state, config) {
    // Tắt gộp combo giữa chừng: xả hết hàng chờ, không giữ lại trạng thái cũ.
    if (!config.combo) state.pending.clear();
    return state;
  },

  dispose(state) { state.pending.clear(); },
};

function sayFor(cfg: Config, name: string, item: FeedItem, count: number): Effect {
  return {
    kind: 'say',
    priority: 'high',
    text: fill(cfg.template, {
      ten: name,
      qua: item.text,
      soluong: String(count),
    }),
  };
}
```

Chú ý: không `Date.now()`, không `Math.random()`, không `dispatch`. Mọi thứ đi qua `ctx` và giá trị trả về.

### `test/core.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { core, fill } from '../src/core';
import { schema } from '../src/manifest';

const cfg = schema.parse({});
const ctx = (now: number) => ({ config: cfg, now, rand: () => 0.5, session: {} as never });
const gift = (user: string, coins: number, at: number) =>
  ({ id: 1, at, kind: 'gift', name: user, user, text: 'Hoa sen', coins } as never);

describe('cảm ơn quà', () => {
  it('điền đúng mẫu câu', () => {
    expect(fill('Cảm ơn {ten} tặng {qua}', { ten: 'An', qua: 'Hoa sen' }))
      .toBe('Cảm ơn An tặng Hoa sen');
  });

  it('bỏ qua quà dưới ngưỡng', () => {
    const s = core.init({ ...cfg, minCoins: 10 });
    expect(core.onFeed!(s, gift('an', 1, 0), { ...ctx(0), config: { ...cfg, minCoins: 10 } })).toEqual([]);
  });

  it('bỏ qua nhân vật ảo', () => {
    const s = core.init(cfg);
    const ao = { ...gift('bot', 99, 0), virtual: true } as never;
    expect(core.onFeed!(s, ao, ctx(0))).toEqual([]);
  });

  it('gộp quà dồn thành một lời cảm ơn', () => {
    const s = core.init(cfg);
    core.onFeed!(s, gift('an', 5, 0), ctx(0));
    core.onFeed!(s, gift('an', 5, 100), ctx(100));
    expect(core.onTick!(s, 1_000, ctx(1_000))).toEqual([]);      // chưa tới hạn
    const out = core.onTick!(s, 6_000, ctx(6_000));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'say' });
  });

  it('tắt combo giữa chừng thì xả hàng chờ', () => {
    const s = core.init(cfg);
    core.onFeed!(s, gift('an', 5, 0), ctx(0));
    core.onConfig!(s, { ...cfg, combo: false });
    expect(core.onTick!(s, 9_000, ctx(9_000))).toEqual([]);
  });
});
```

### `src/index.ts`

```ts
export { manifest, schema, type Config } from './manifest';
export { core } from './core';
// export { Stage } from './stage';   // chỉ khi module có phần vẽ
```

## 3. Khi nào cần `stage.tsx`

Chỉ khi module phải **vẽ** thứ gì đó. Cảm ơn quà không cần — nó trả `say`, thiết kế lo phát tiếng.

Cần `stage.tsx`: Top người tặng (bảng xếp hạng), Bộ đếm tim (thanh tiến độ), Thông báo ghim (chữ chạy),
Nhân vật chibi, Nhân vật hip hop.

```tsx
import type { StageProps } from '@live/stage-sdk';
import type { Config } from './manifest';

export function Stage({ config, session }: StageProps<Config>) {
  const top = session.topGivers.slice(0, config.size);
  return (
    <ol className="…">
      {top.map((g, i) => <li key={g.user}>{i + 1}. {g.name} — {g.xu}</li>)}
    </ol>
  );
}
```

`Stage` được gắn vào slot mà manifest khai báo. Nó nhận cấu hình mới qua props,
nên đổi cấu hình là vẽ lại ngay, không cần tải lại.

## 4. Module có nút bấm

Khai báo `action` trong manifest, xử lý trong `onAction`:

```ts
// manifest.ts
action: { label: 'Quay', op: 'draw' },

// core.ts
onAction(state, op, ctx) {
  if (op !== 'draw') return [];
  const pool = ctx.session.recentUsers;
  if (!pool.length) return [{ kind: 'say', text: 'Chưa có ai để quay.' }];
  const winner = pool[Math.floor(ctx.rand() * pool.length)];
  return [
    { kind: 'say', text: `Chúc mừng ${winner.name}!`, priority: 'high' },
    { kind: 'sfx', sound: 'fanfare' },
    { kind: 'record', table: 'raffle', row: { user: winner.user, at: ctx.now } },
  ];
}
```

## 5. Bảng kiểm trước khi gửi review

- [ ] `core.ts` không import `react`, `three`, không dùng `window`, `Date.now`, `Math.random`
- [ ] Có `onConfig` nếu module có cấu hình, và nó xử lý được cả trường hợp tắt giữa chừng
- [ ] `onFeed` bỏ qua mục `virtual`
- [ ] Mọi trường trong schema có `.default(...)`
- [ ] `quick` có tối đa 3 mục, nhãn ngắn gọn vừa thẻ
- [ ] Có test cho: giá trị mặc định, một trường hợp bị bỏ qua, một trường hợp sinh effect, đổi cấu hình giữa chừng
- [ ] Không sửa file nào ngoài thư mục module (trừ một dòng dependency trong `client/shared/runtime`)
