import { describe, expect, it } from 'vitest';
import type { Effect } from '@live/contracts';
import { runAction, runTick } from '@live/runtime';
import { catDoan, core, doanHienTai, moduleStory as mod, schema } from '@live/mod-story';
import { ctx, kiemModule } from '../_helper';

const BA_DOAN = 'Đoạn một.\nĐoạn hai.\nĐoạn ba.';
const MAC_DINH = { ...schema.parse({}), passages: BA_DOAN, secPerPassage: 10 };

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy theo nhịp, không theo sự kiện khán giả', () => {
    expect(mod.manifest.triggers).toEqual([]);
    expect(mod.manifest.slots).toEqual(['screen']);
  });

  it('có nút chuyển đoạn trên thẻ', () => {
    expect(mod.manifest.action?.op).toBe('next');
  });
});

describe('cắt đoạn', () => {
  it('mỗi dòng một đoạn, bỏ dòng trống và khoảng trắng thừa', () => {
    expect(catDoan('  Một  hai \n\n\n Ba \n')).toEqual(['Một hai', 'Ba']);
  });

  it('không có chữ thì không có đoạn nào', () => {
    expect(catDoan('   \n\n')).toEqual([]);
  });
});

describe('kể lần lượt', () => {
  it('đoạn đầu lên ngay nhịp đầu tiên', () => {
    const s = core.init(MAC_DINH);
    expect(loiNoi(runTick(mod, s, 1_000, ctx(MAC_DINH, 1_000)))).toBe('Đoạn một.');
    expect(doanHienTai(s)).toBe('Đoạn một.');
  });

  it('chưa hết giờ thì giữ nguyên đoạn', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(runTick(mod, s, 9_000, ctx(MAC_DINH, 9_000))).toEqual([]);
    expect(doanHienTai(s)).toBe('Đoạn một.');
  });

  it('hết giờ thì sang đoạn kế', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(loiNoi(runTick(mod, s, 10_000, ctx(MAC_DINH, 10_000)))).toBe('Đoạn hai.');
  });

  it('hết truyện thì kể lại từ đầu', () => {
    const s = core.init(MAC_DINH);
    let t = 0;
    for (const mong of ['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.', 'Đoạn một.']) {
      expect(loiNoi(runTick(mod, s, t, ctx(MAC_DINH, t)))).toBe(mong);
      t += 10_000;
    }
  });

  it('tắt lặp lại thì kể hết rồi dừng', () => {
    const c = { ...MAC_DINH, loop: false };
    const s = core.init(c);
    let t = 0;
    for (let i = 0; i < 3; i += 1) {
      runTick(mod, s, t, ctx(c, t));
      t += 10_000;
    }
    expect(runTick(mod, s, t, ctx(c, t))).toEqual([]);
    expect(doanHienTai(s), 'vẫn giữ đoạn cuối trên màn').toBe('Đoạn ba.');
  });

  it('chưa có truyện thì im lặng', () => {
    const c = { ...MAC_DINH, passages: '' };
    const s = core.init(c);
    expect(runTick(mod, s, 0, ctx(c, 0))).toEqual([]);
    expect(doanHienTai(s)).toBeNull();
  });

  it('tắt đọc to thì vẫn chuyển đoạn, chỉ không phát tiếng', () => {
    const c = { ...MAC_DINH, readAloud: false };
    const s = core.init(c);
    const ra = runTick(mod, s, 0, ctx(c, 0));
    expect(ra.some((e) => e.kind === 'say')).toBe(false);
    expect(doanHienTai(s)).toBe('Đoạn một.');
  });
});

describe('bấm nút chuyển đoạn', () => {
  it('nhảy sang đoạn kế ngay, không chờ hết giờ', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(loiNoi(runAction(mod, s, 'next', ctx(MAC_DINH, 500)))).toBe('Đoạn hai.');
  });

  it('ở đoạn cuối thì vòng về đoạn đầu', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    runAction(mod, s, 'next', ctx(MAC_DINH, 1));
    runAction(mod, s, 'next', ctx(MAC_DINH, 2));
    expect(loiNoi(runAction(mod, s, 'next', ctx(MAC_DINH, 3)))).toBe('Đoạn một.');
  });

  it('nút lạ thì không làm gì', () => {
    const s = core.init(MAC_DINH);
    expect(runAction(mod, s, 'xoa-het', ctx(MAC_DINH, 0))).toEqual([]);
  });
});

describe('sửa truyện giữa lúc đang kể', () => {
  it('đoạn đang kể không đổi thì giữ nguyên chỗ đứng', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    runTick(mod, s, 10_000, ctx(MAC_DINH, 10_000));
    expect(doanHienTai(s)).toBe('Đoạn hai.');

    // Đổi đoạn cuối, đoạn đang kể vẫn thế.
    core.onConfig!(s, { ...MAC_DINH, passages: 'Đoạn một.\nĐoạn hai.\nĐoạn ba mới.' });
    expect(doanHienTai(s)).toBe('Đoạn hai.');
  });

  it('thay cả truyện thì kể lại từ đầu', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    runTick(mod, s, 10_000, ctx(MAC_DINH, 10_000));

    core.onConfig!(s, { ...MAC_DINH, passages: 'Truyện khác hẳn.\nĐoạn sau.' });
    expect(doanHienTai(s)).toBe('Truyện khác hẳn.');
  });

  it('kể hết rồi mà nạp truyện mới thì chạy tiếp', () => {
    const c = { ...MAC_DINH, loop: false };
    const s = core.init(c);
    let t = 0;
    for (let i = 0; i < 4; i += 1) {
      runTick(mod, s, t, ctx(c, t));
      t += 10_000;
    }
    core.onConfig!(s, { ...c, passages: 'Truyện mới.' });
    expect(loiNoi(runTick(mod, s, t + 20_000, ctx(c, t + 20_000)))).toBe('Truyện mới.');
  });
});
