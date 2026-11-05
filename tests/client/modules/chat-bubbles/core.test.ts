import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { runFeed, runTick } from '@live/runtime';
import { core, moduleChatBubbles as mod, NHIP_BONG_MS, schema } from '@live/mod-chat-bubbles';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

let dem = 0;
function binhLuan(text: string, name = 'An'): FeedItem {
  dem += 1;
  return { id: dem, at: 0, kind: 'comment', name, text, user: name.toLowerCase() };
}
function qua(gift = 'Hoa sen', count = 1): FeedItem {
  dem += 1;
  return {
    id: dem,
    at: 0,
    kind: 'gift',
    name: 'Hào',
    text: 'tặng quà',
    user: 'hao',
    gift,
    count,
    coins: 10,
  };
}

/** Chạy nhịp đều từ `tu` cho tới khi hàng chờ lên hết bóng. Trả về giờ cuối. */
function xa(s: ReturnType<typeof core.init>, tu: number): number {
  let t = tu;
  while (s.cho.length > 0) {
    t += NHIP_BONG_MS;
    runTick(mod, s, t, ctx(s.config, t));
  }
  return t;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy khi có bình luận và khi có quà', () => {
    expect([...mod.manifest.triggers].sort()).toEqual(['comment', 'gift']);
  });
});

describe('bóng bình luận', () => {
  it('mỗi bình luận thành một bóng, mới nhất ở cuối', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, binhLuan('chào'), ctx(MAC_DINH, 0));
    runFeed(mod, s, binhLuan('hay quá'), ctx(MAC_DINH, 100));
    xa(s, 100);
    expect(s.bong.map((b) => b.text)).toEqual(['chào', 'hay quá']);
  });

  it('dồn một lúc thì lên từng bóng một, có nhịp', () => {
    const s = core.init(MAC_DINH);
    for (const t of ['1', '2', '3']) runFeed(mod, s, binhLuan(t), ctx(MAC_DINH, 0));
    expect(s.bong.map((b) => b.text), 'chỉ câu đầu lên ngay').toEqual(['1']);
    runTick(mod, s, NHIP_BONG_MS - 1, ctx(MAC_DINH, NHIP_BONG_MS - 1));
    expect(s.bong, 'chưa đủ nhịp thì chưa lên').toHaveLength(1);
    runTick(mod, s, NHIP_BONG_MS, ctx(MAC_DINH, NHIP_BONG_MS));
    expect(s.bong.map((b) => b.text)).toEqual(['1', '2']);
    const ra = runTick(mod, s, NHIP_BONG_MS * 2, ctx(MAC_DINH, NHIP_BONG_MS * 2));
    expect(s.bong.map((b) => b.text)).toEqual(['1', '2', '3']);
    expect(ra).toEqual([{ kind: 'overlay', slot: 'chat', ttlMs: MAC_DINH.songSec * 1000 }]);
  });

  it('câu cũ hơn đời một bóng (mở trang giữa chừng) thì không lên', () => {
    const s = core.init(MAC_DINH);
    const cu = { ...binhLuan('chuyện cũ'), at: 0 };
    expect(runFeed(mod, s, cu, ctx(MAC_DINH, MAC_DINH.songSec * 1000 + 1))).toEqual([]);
    expect(s.bong).toHaveLength(0);
  });

  it('quá số bóng cùng lúc thì bỏ bóng cũ nhất', () => {
    const c = { ...MAC_DINH, max: 3 };
    const s = core.init(c);
    for (const t of ['1', '2', '3', '4', '5']) runFeed(mod, s, binhLuan(t), ctx(c, 0));
    xa(s, 0);
    expect(s.bong.map((b) => b.text)).toEqual(['3', '4', '5']);
  });

  it('xin slot chat sáng lên đúng bằng thời gian bóng sống', () => {
    const s = core.init(MAC_DINH);
    const ra = runFeed(mod, s, binhLuan('chào'), ctx(MAC_DINH, 0));
    expect(ra).toEqual([{ kind: 'overlay', slot: 'chat', ttlMs: MAC_DINH.songSec * 1000 }]);
  });

  it('bóng liền nhau xen kẽ so le, kể cả khi id cùng chẵn lẻ', () => {
    const s = core.init(MAC_DINH);
    for (const id of [3, 5, 7]) runFeed(mod, s, { ...binhLuan('chào'), id }, ctx(MAC_DINH, 0));
    xa(s, 0);
    expect(s.bong.map((b) => b.le)).toEqual([false, true, false]);
  });

  it('lời của nhân vật ảo cũng lên bóng — họ vào là để phòng đỡ trống', () => {
    const s = core.init(MAC_DINH);
    const ao: FeedItem = { ...binhLuan('nghe hay quá ạ', 'Bé Na'), virtual: true };
    runFeed(mod, s, ao, ctx(MAC_DINH, 0));
    expect(s.bong.map((b) => b.text)).toEqual(['nghe hay quá ạ']);
  });

  it('quà ảo thì không lên bóng', () => {
    const cfg = { ...MAC_DINH, giftEvery: 1 };
    const s = core.init(cfg);
    expect(runFeed(mod, s, { ...qua(), virtual: true }, ctx(cfg, 0))).toEqual([]);
    expect(s.bong).toHaveLength(0);
  });
});

describe('bóng quà chen thưa', () => {
  it('mặc định cứ ba món mới chen một bóng quà', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(), ctx(MAC_DINH, 0));
    runFeed(mod, s, qua(), ctx(MAC_DINH, 0));
    expect(s.bong, 'hai món đầu chưa tới lượt').toHaveLength(0);

    runFeed(mod, s, qua('Đèn lồng', 2), ctx(MAC_DINH, 0));
    expect(s.bong).toHaveLength(1);
    expect(s.bong[0]!.qua).toBe(true);
    expect(s.bong[0]!.text).toBe('tặng Đèn lồng ×2');
  });

  it('để 1 thì món quà nào cũng hiện', () => {
    const c = { ...MAC_DINH, giftEvery: 1 };
    const s = core.init(c);
    runFeed(mod, s, qua(), ctx(c, 0));
    runFeed(mod, s, qua(), ctx(c, 0));
    xa(s, 0);
    expect(s.bong).toHaveLength(2);
  });
});

describe('bóng tự tắt', () => {
  it('hết hạn thì nhịp sau dọn đi', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, binhLuan('chào'), ctx(MAC_DINH, 1_000));
    const han = MAC_DINH.songSec * 1000;

    runTick(mod, s, 1_000 + han - 1, ctx(MAC_DINH, 0));
    expect(s.bong, 'chưa hết hạn thì còn').toHaveLength(1);

    runTick(mod, s, 1_000 + han + 1, ctx(MAC_DINH, 0));
    expect(s.bong).toHaveLength(0);
  });
});

describe('đổi cấu hình giữa lúc đang live', () => {
  it('rút số bóng xuống thì bỏ bớt ngay, không chờ hết hạn', () => {
    const s = core.init(MAC_DINH);
    for (const t of ['1', '2', '3', '4']) runFeed(mod, s, binhLuan(t), ctx(MAC_DINH, 0));
    xa(s, 0);
    expect(s.bong).toHaveLength(4);

    core.onConfig!(s, { ...MAC_DINH, max: 2 });
    expect(s.bong.map((b) => b.text)).toEqual(['3', '4']);
  });

  it('dispose dọn sạch bóng', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, binhLuan('chào'), ctx(MAC_DINH, 0));
    core.dispose!(s);
    expect(s.bong).toHaveLength(0);
  });
});
