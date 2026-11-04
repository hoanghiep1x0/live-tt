/** Dùng chung cho test của mọi module. Không phải file test — vitest chỉ nhận
 *  `*.test.ts`, nên file này không bị gom vào lượt chạy. */

import { expect } from 'vitest';
import { ID_RE } from '@live/contracts';
import type { Ctx, LiveModule, SessionView } from '@live/contracts';
import { hookKinds } from '@live/runtime';

/** Phiên rỗng, chỉ khai số tim vì đó là con số duy nhất module cần tới giờ. */
export function phien(likes = 0): SessionView {
  return {
    designId: 'ke-chuyen',
    startedAt: 0,
    totals: { viewers: 0, likes, gifts: 0, xu: 0, comments: 0 },
    topGivers: [],
    seats: [],
    recentUsers: [],
    recentFeed: [],
  };
}

export function ctx<C>(config: C, now = 0, likes = 0): Ctx<C> {
  // rand cố định: lõi thuần phải chạy lại cho cùng kết quả (quy ước 01 §5).
  return { config, now, rand: () => 0.5, session: phien(likes) };
}

/** Những điều mọi module phải đúng. Gọi trong test của từng module, nhờ vậy
 *  module thứ 22 cũng được kiểm đúng như module đầu tiên. */
export function kiemModule<C extends object, S>(m: LiveModule<C, S>): void {
  const man = m.manifest;
  expect(man.id).toMatch(ID_RE);
  expect(man.name.trim()).not.toBe('');
  expect(man.icon.trim()).not.toBe('');
  expect(man.summary.trim()).not.toBe('');

  const keys = man.fields.map((f) => f.key);
  expect(new Set(keys).size, 'khoá cấu hình bị trùng').toBe(keys.length);

  // Mặc định nằm trong schema, không ở `fields` — nên schema phải dựng nổi cấu
  // hình từ object rỗng, nếu không trang quản lý mở thẻ là nổ.
  const macDinh = man.schema.parse({}) as Record<string, unknown>;
  for (const k of keys) {
    expect(macDinh, `thiếu mặc định cho "${k}"`).toHaveProperty(k);
  }

  const quick = man.quick ?? [];
  expect(quick.length, 'quá 3 ô chỉnh nhanh thì thẻ chật').toBeLessThanOrEqual(3);
  for (const k of quick) {
    expect(keys, `ô chỉnh nhanh "${k}" không có trong fields`).toContain(k);
  }
  if (man.group === 'other') {
    expect(man.quick, 'thẻ gọn không có chỗ cho ô chỉnh nhanh').toBeUndefined();
  }

  for (const f of man.fields) {
    if (f.type !== 'select') continue;
    expect(f.options?.length, `select "${f.key}" thiếu options`).toBeGreaterThan(0);
  }

  // Trang quản lý đọc `triggers` để nói "Chạy khi: có quà", còn runtime gọi theo
  // `hooks`. Lệch nhau thì thẻ nói một đằng, máy làm một nẻo.
  expect([...man.triggers].sort(), 'triggers không khớp hooks').toEqual(hookKinds(m).sort());
}
