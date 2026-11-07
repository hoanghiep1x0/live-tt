import { describe, expect, it } from 'vitest';
import { runAction, runTick } from '@live/runtime';
import { core, moduleHostVideo as mod, schema } from '@live/mod-host-video';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

describe('video người thật', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('mở trang không tự phát lại video cũ', () => {
    const s = core.init({ ...MAC_DINH, video: '/u/ke-chuyen/clip.mp4' });
    runTick(mod, s, 1_000, ctx(s.config, 1_000));
    expect(s.phat).toBeNull();
  });

  it('tải video mới lên là phát ngay một lần, từ nhịp kế', () => {
    const s = core.init(MAC_DINH);
    core.onConfig?.(s, { ...MAC_DINH, video: '/u/ke-chuyen/clip.mp4' });
    runTick(mod, s, 5_000, ctx(s.config, 5_000));
    expect(s.phat).toMatchObject({ url: '/u/ke-chuyen/clip.mp4', tu: 5_000 });
    // Nhịp sau không phát lại từ đầu.
    runTick(mod, s, 6_000, ctx(s.config, 6_000));
    expect(s.phat?.tu).toBe(5_000);
  });

  it('tắt "phát ngay" thì chờ bấm Phát; bấm Tắt là ẩn', () => {
    const cfg = { ...MAC_DINH, phatNgay: false };
    const s = core.init(cfg);
    core.onConfig?.(s, { ...cfg, video: '/u/x/a.mp4' });
    runTick(mod, s, 1_000, ctx(s.config, 1_000));
    expect(s.phat).toBeNull();
    runAction(mod, s, 'phat', ctx(s.config, 2_000));
    expect(s.phat?.tu).toBe(2_000);
    runAction(mod, s, 'tat', ctx(s.config, 3_000));
    expect(s.phat).toBeNull();
  });
});

describe('vòng phát: một lúc rồi ẩn, cách quãng hiện lại', () => {
  const CLIP = '/u/ke-chuyen/clip.mp4';
  const cfg = { ...MAC_DINH, video: CLIP, phatPhut: 2, lapPhut: 10 };

  it('phát đủ 2 phút thì tự ẩn, 10 phút sau hiện lại', () => {
    const s = core.init({ ...cfg, video: '' });
    core.onConfig?.(s, cfg);
    runTick(mod, s, 0, ctx(s.config, 0));
    expect(s.phat?.tu, 'tải lên là phát ngay').toBe(0);

    // Chưa hết 2 phút: vẫn chạy.
    runTick(mod, s, 119_000, ctx(s.config, 119_000));
    expect(s.phat).not.toBeNull();
    // Đủ 2 phút: ẩn.
    runTick(mod, s, 120_000, ctx(s.config, 120_000));
    expect(s.phat).toBeNull();

    // Trong 10 phút nghỉ thì không hiện.
    runTick(mod, s, 700_000, ctx(s.config, 700_000));
    expect(s.phat).toBeNull();
    // Đủ 10 phút kể từ lúc ẩn: hiện lại, lượt mới.
    runTick(mod, s, 720_000, ctx(s.config, 720_000));
    expect(s.phat?.tu).toBe(720_000);
    expect(s.phat?.k).toBe(2);
  });

  it('bấm Tắt là thôi hẳn, không tự hiện lại', () => {
    const s = core.init({ ...cfg, video: '' });
    core.onConfig?.(s, cfg);
    runTick(mod, s, 0, ctx(s.config, 0));
    runAction(mod, s, 'tat', ctx(s.config, 10_000));
    expect(s.phat).toBeNull();
    runTick(mod, s, 10_000_000, ctx(s.config, 10_000_000));
    expect(s.phat, 'tắt tay thì nằm im').toBeNull();
  });

  it('để 0 phút thì chỉ phát một lượt', () => {
    const s = core.init({ ...cfg, video: '', lapPhut: 0 });
    core.onConfig?.(s, { ...cfg, lapPhut: 0 });
    runTick(mod, s, 0, ctx(s.config, 0));
    runTick(mod, s, 120_000, ctx(s.config, 120_000));
    expect(s.phat).toBeNull();
    runTick(mod, s, 5_000_000, ctx(s.config, 5_000_000));
    expect(s.phat).toBeNull();
  });
});
