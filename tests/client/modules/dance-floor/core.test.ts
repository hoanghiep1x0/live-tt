import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { runAction, runFeed, runTick } from '@live/runtime';
import {
  CHO_DUNG,
  chang,
  core,
  KHACH_CHO_MS,
  KHACH_NHAY_MS,
  LEN_MS,
  moduleDanceFloor as mod,
  schema,
  TOI_DA,
  xepSan,
  XUONG_MS,
} from '@live/mod-dance-floor';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});
const NHAY_MS = MAC_DINH.danceSec * 1_000;

function qua(at: number, id = 1): FeedItem {
  return { id, at, kind: 'gift', name: 'Hạnh', text: 'tặng Hoa hồng', user: 'hanh', xu: 10 };
}

/** Chạy một nhịp rồi trả về động tác của từng người trên sàn. */
function nhip(s: ReturnType<typeof core.init>, now: number): string[] {
  runTick(mod, s, now, ctx(s.config, now));
  return s.nguoi.map((n) => n.dang);
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy khi có quà, cần slot sàn, xếp vào phòng kể chuyện', () => {
    expect(mod.manifest.triggers).toEqual(['gift', 'comment']);
    expect(mod.manifest.slots).toEqual(['floor']);
    // Hôm nay chỉ phòng kể chuyện có slot `floor`. Để ở mục dùng chung là nói
    // với người vận hành rằng phòng nào cũng bật được, trong khi bật ở phòng
    // khác thì nó im lặng không hiện gì. Phần mã vẫn không ràng vào phòng nào.
    expect(mod.manifest.room).toBe('ke-chuyen');
  });
});

describe('chỗ đứng', () => {
  it('chưa có quà thì sàn trống', () => {
    const s = core.init(MAC_DINH);
    expect(s.nguoi).toEqual([]);
    expect(nhip(s, 500_000)).toEqual([]);
  });

  it('lên sàn thì ba người, mỗi người một chỗ riêng ở giữa sàn như bản cũ', () => {
    const ds = xepSan(MAC_DINH, 1_000, 0, 100_000);
    expect(new Set(ds.map((n) => n.cho)).size).toBe(3);
    expect(ds.map((n) => n.x)).toEqual([38, 62, 50]);
    // Hai mép ngoài để trống cho ảnh người đứng hai bên sàn của thiết kế.
    expect(CHO_DUNG.every((c) => c.x >= 16 && c.x <= 84)).toBe(true);
  });

  it('xin đông hơn số chỗ thì chỉ xếp tới hết chỗ', () => {
    expect(xepSan({ ...MAC_DINH, count: 99 }, 1_000, 0, 100_000)).toHaveLength(TOI_DA);
  });

  it('cùng một `now` thì hai cửa sổ xếp ra y hệt nhau', () => {
    expect(xepSan(MAC_DINH, 7_123, 0, 100_000)).toEqual(xepSan(MAC_DINH, 7_123, 0, 100_000));
  });
});

describe('có quà thì chạy lên nhảy, xong thì chạy xuống', () => {
  it('chạy lên → nhảy đúng thời lượng → chạy xuống → sàn trống', () => {
    const s = core.init(MAC_DINH);
    const ra = runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    expect(ra).toEqual([{ kind: 'overlay', slot: 'floor', ttlMs: LEN_MS + NHAY_MS }]);

    expect(nhip(s, 10_000)).toEqual(['len', 'len', 'len']);
    expect(nhip(s, 10_000 + LEN_MS)).toEqual(['nhay', 'nhay', 'nhay']);
    const het = 10_000 + LEN_MS + NHAY_MS;
    expect(nhip(s, het - 1)).toEqual(['nhay', 'nhay', 'nhay']);
    expect(nhip(s, het)).toEqual(['xuong', 'xuong', 'xuong']);
    expect(nhip(s, het + XUONG_MS)).toEqual([]);
  });

  it('cả nhóm chung một mốc mỗi chặng, nên hai cửa sổ thấy cùng nhịp', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    nhip(s, 20_000);
    expect(new Set(s.nguoi.map((n) => n.tu))).toEqual(new Set([10_000 + LEN_MS]));
  });

  it('quà tới lúc đang nhảy thì nhảy thêm, không chạy xuống, không giật về đầu', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    const ra = runFeed(mod, s, qua(100_000, 2), ctx(MAC_DINH, 100_000));
    expect(s.nhayTu).toBe(10_000);
    expect(s.nhayDen).toBe(100_000 + NHAY_MS);
    expect(ra).toEqual([{ kind: 'overlay', slot: 'floor', ttlMs: NHAY_MS }]);
    // Hạn cũ đã qua mà vẫn đang nhảy, cùng mốc nhịp như trước.
    expect(nhip(s, 10_000 + LEN_MS + NHAY_MS + 1)).toEqual(['nhay', 'nhay', 'nhay']);
    expect(new Set(s.nguoi.map((n) => n.tu))).toEqual(new Set([10_000 + LEN_MS]));
  });

  it('quà tới lúc đang chạy xuống thì quay lại nhảy luôn', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    const xuong = 10_000 + LEN_MS + NHAY_MS + 500;
    expect(chang(xuong, s.nhayTu, s.nhayDen)?.dang).toBe('xuong');
    runFeed(mod, s, qua(xuong, 2), ctx(MAC_DINH, xuong));
    expect(nhip(s, xuong)).toEqual(['nhay', 'nhay', 'nhay']);
  });

  it('sàn đã trống thì quà sau chạy lên lại từ đầu', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    const sau = 10_000 + LEN_MS + NHAY_MS + XUONG_MS + 1;
    runFeed(mod, s, qua(sau, 2), ctx(MAC_DINH, sau));
    expect(s.nhayTu).toBe(sau);
    expect(nhip(s, sau)).toEqual(['len', 'len', 'len']);
  });

  it('nhân vật ảo tặng quà thì không tính — runtime lọc trước khi tới móc', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, { ...qua(10_000), virtual: true }, ctx(MAC_DINH, 10_000));
    expect(s.nhayDen).toBe(0);
  });
});

describe('nút Nhảy ngay', () => {
  it('bấm là chạy lên nhảy, kể cả khi tắt nhảy khi có quà', () => {
    const cfg = { ...MAC_DINH, danceOnGift: false };
    const s = core.init(cfg);
    runAction(mod, s, 'nhay', ctx(cfg, 1_000));
    expect(nhip(s, 1_000 + LEN_MS).every((d) => d === 'nhay')).toBe(true);
  });

  it('nút lạ thì không làm gì', () => {
    const s = core.init(MAC_DINH);
    expect(runAction(mod, s, 'khac', ctx(MAC_DINH, 0))).toEqual([]);
  });
});

describe('đổi cấu hình giữa lúc đang live', () => {
  it('tắt "nhảy khi có quà" thì màn đang chạy dừng ngay', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    nhip(s, 20_000);
    core.onConfig!(s, { ...MAC_DINH, danceOnGift: false });
    expect(s.nhayDen).toBe(0);
    expect(nhip(s, 20_250)).toEqual([]);
  });

  it('tắt rồi thì quà sau không mở màn nữa', () => {
    const s = core.init({ ...MAC_DINH, danceOnGift: false });
    expect(runFeed(mod, s, qua(10_000), ctx(s.config, 10_000))).toEqual([]);
    expect(s.nhayDen).toBe(0);
  });

  it('đổi thời lượng giữa chừng thì màn đang chạy tính lại hạn ngay', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    core.onConfig!(s, { ...MAC_DINH, danceSec: 30 });
    expect(s.nhayDen).toBe(10_000 + LEN_MS + 30_000);
  });

  it('bớt người thì bỏ bớt ngay, thêm người thì nhịp sau đã có mặt', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    nhip(s, 20_000);
    core.onConfig!(s, { ...MAC_DINH, count: 1 });
    expect(s.nguoi).toHaveLength(1);
    core.onConfig!(s, { ...MAC_DINH, count: 5 });
    expect(nhip(s, 20_250)).toHaveLength(5);
  });

  it('dọn thì sàn trống hẳn, không còn màn nào treo lại', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    core.dispose!(s);
    expect(s.nguoi).toEqual([]);
    expect(s.nhayDen).toBe(0);
  });
});

describe('khách gõ "nhảy"', () => {
  const go = (at: number, user: string, id = at, virtual = false): FeedItem => ({
    id,
    at,
    kind: 'comment',
    name: `Tên ${user}`,
    text: 'nhảy',
    user,
    lenh: { loai: 'nhay' },
    ...(virtual ? { virtual: true } : {}),
  });

  it('chibi của khách lên sàn, tên hiện trên đầu, nhảy thêm 30 giây', () => {
    const s = core.init(MAC_DINH);
    const ra = runFeed(mod, s, go(1_000, 'lan'), ctx(MAC_DINH, 1_000));
    expect(ra).toEqual([{ kind: 'overlay', slot: 'floor', ttlMs: LEN_MS + KHACH_NHAY_MS }]);
    nhip(s, 1_000 + LEN_MS);
    expect(s.nguoi[0]?.ten).toBe('Tên lan');
    expect(s.nguoi[1]?.ten).toBeUndefined();
  });

  it('khách sau đứng chỗ kế tiếp; hết chỗ thì không chen ai xuống', () => {
    const s = core.init(MAC_DINH);
    for (const [i, u] of ['a', 'b', 'c', 'd'].entries()) runFeed(mod, s, go(1_000 + i, u), ctx(MAC_DINH, 1_000 + i));
    nhip(s, 2_000);
    expect(s.nguoi.map((n) => n.ten)).toEqual(['Tên a', 'Tên b', 'Tên c']);
  });

  it('mỗi người chờ 90 giây mới gọi lại được; nhân vật ảo không tính', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, go(1_000, 'lan'), ctx(MAC_DINH, 1_000));
    const het = 1_000 + LEN_MS + KHACH_NHAY_MS + 4_000;
    nhip(s, het);
    expect(s.nguoi).toEqual([]);
    expect(runFeed(mod, s, go(het, 'lan'), ctx(MAC_DINH, het))).toEqual([]);
    expect(runFeed(mod, s, go(1_000 + KHACH_CHO_MS, 'lan'), ctx(MAC_DINH, 1_000 + KHACH_CHO_MS))).not.toEqual([]);
    const s2 = core.init(MAC_DINH);
    expect(runFeed(mod, s2, go(1_000, 'mh1', 1, true), ctx(MAC_DINH, 1_000))).toEqual([]);
  });

  it('bình luận thường không gọi ai lên', () => {
    const s = core.init(MAC_DINH);
    const thuong: FeedItem = { id: 1, at: 1_000, kind: 'comment', name: 'Lan', text: 'hay quá', user: 'lan' };
    expect(runFeed(mod, s, thuong, ctx(MAC_DINH, 1_000))).toEqual([]);
  });
});
