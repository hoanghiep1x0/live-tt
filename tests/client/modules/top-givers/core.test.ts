import { describe, expect, it } from 'vitest';
import type { Effect } from '@live/contracts';
import { runTick } from '@live/runtime';
import { core, hangDangSoi, moduleTopGivers as mod, schema } from '@live/mod-top-givers';
import { ctx, kiemModule, nguoiTang } from '../_helper';

const MAC_DINH = schema.parse({});

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('không bắt sự kiện nào: bảng đọc thẳng từ phiên', () => {
    expect(mod.manifest.triggers).toEqual([]);
    expect(mod.manifest.slots).toEqual(['tops']);
  });
});

describe('đèn soi', () => {
  it('tắt khi chưa có ai trong top', () => {
    expect(hangDangSoi(0, 0)).toBe(-1);
  });

  it('soi một lúc rồi nghỉ, chứ không sáng suốt buổi', () => {
    expect(hangDangSoi(0, 3)).toBe(0);
    expect(hangDangSoi(3_000, 3)).toBe(0);
    expect(hangDangSoi(5_000, 3), 'quá 3,6 giây thì nghỉ').toBe(-1);
  });

  it('lần lượt chuyển sang người kế', () => {
    expect(hangDangSoi(9_000, 3)).toBe(1);
    expect(hangDangSoi(18_000, 3)).toBe(2);
    expect(hangDangSoi(27_000, 3), 'hết vòng thì quay lại người đầu').toBe(0);
  });

  it('không soi quá số người đang có', () => {
    for (let t = 0; t < 60_000; t += 500) {
      expect(hangDangSoi(t, 2)).toBeLessThan(2);
    }
  });

  it('lõi ghi lại hạng đang soi để phần vẽ dùng', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [nguoiTang('a', 'An', 10)]));
    expect(s.dangSoi).toBe(0);
    runTick(mod, s, 5_000, ctx(MAC_DINH, 5_000, 0, [nguoiTang('a', 'An', 10)]));
    expect(s.dangSoi).toBe(-1);
  });
});

describe('báo đổi ngôi', () => {
  it('im lặng khi chưa ai lên bảng', () => {
    const s = core.init(MAC_DINH);
    expect(runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, []))).toEqual([]);
  });

  it('người đầu tiên lên bảng không phải là "vượt lên"', () => {
    const s = core.init(MAC_DINH);
    const top = [nguoiTang('a', 'An', 100)];
    expect(runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, top))).toEqual([]);
  });

  it('có người vượt lên hạng nhất thì báo một lần', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [nguoiTang('a', 'An', 100)]));

    const moi = [nguoiTang('b', 'Bình', 500), nguoiTang('a', 'An', 100)];
    expect(loiNoi(runTick(mod, s, 1, ctx(MAC_DINH, 1, 0, moi)))).toBe(
      'Bình vừa vươn lên dẫn đầu!',
    );
    // Vẫn người đó dẫn thì không nhắc lại.
    expect(runTick(mod, s, 2, ctx(MAC_DINH, 2, 0, moi))).toEqual([]);
  });

  it('đòi lại ngôi đầu thì báo tiếp', () => {
    const s = core.init(MAC_DINH);
    const a = nguoiTang('a', 'An', 100);
    const b = nguoiTang('b', 'Bình', 500);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [a]));
    runTick(mod, s, 1, ctx(MAC_DINH, 1, 0, [b, a]));
    expect(loiNoi(runTick(mod, s, 2, ctx(MAC_DINH, 2, 0, [nguoiTang('a', 'An', 900), b])))).toBe(
      'An vừa vươn lên dẫn đầu!',
    );
  });

  it('tắt báo đổi ngôi thì bảng vẫn chạy nhưng im lặng', () => {
    const c = { ...MAC_DINH, announce: false };
    const s = core.init(c);
    runTick(mod, s, 0, ctx(c, 0, 0, [nguoiTang('a', 'An', 100)]));
    expect(runTick(mod, s, 1, ctx(c, 1, 0, [nguoiTang('b', 'Bình', 500)]))).toEqual([]);
  });

  it('tắt báo giữa chừng rồi bật lại thì không báo dồn người cũ', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [nguoiTang('a', 'An', 100)]));

    const tat = { ...MAC_DINH, announce: false };
    core.onConfig!(s, tat);
    runTick(mod, s, 1, ctx(tat, 1, 0, [nguoiTang('b', 'Bình', 500)]));

    core.onConfig!(s, MAC_DINH);
    expect(
      runTick(mod, s, 2, ctx(MAC_DINH, 2, 0, [nguoiTang('b', 'Bình', 500)])),
      'Bình đã dẫn từ lúc đang tắt, bật lại không phải tin mới',
    ).toEqual([]);
  });
});
