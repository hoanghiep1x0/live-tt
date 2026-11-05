import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { runAction, runFeed, runTick } from '@live/runtime';
import {
  CHO_DUNG,
  core,
  dangCua,
  moduleDanceFloor as mod,
  schema,
  TOI_DA,
  xepSan,
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
    expect(mod.manifest.triggers).toEqual(['gift']);
    expect(mod.manifest.slots).toEqual(['floor']);
    // Hôm nay chỉ phòng kể chuyện có slot `floor`. Để ở mục dùng chung là nói
    // với người vận hành rằng phòng nào cũng bật được, trong khi bật ở phòng
    // khác thì nó im lặng không hiện gì. Phần mã vẫn không ràng vào phòng nào.
    expect(mod.manifest.room).toBe('ke-chuyen');
  });
});

describe('chỗ đứng', () => {
  it('mặc định ba người, mỗi người một chỗ riêng', () => {
    const s = core.init(MAC_DINH);
    expect(s.nguoi).toHaveLength(3);
    expect(new Set(s.nguoi.map((n) => n.cho)).size).toBe(3);
    expect(s.nguoi.map((n) => n.x)).toEqual(CHO_DUNG.slice(0, 3).map((c) => c.x));
  });

  it('ba chỗ đầu đứng giữa sàn như bản cũ, đông hơn thì lan ra hai bên', () => {
    expect(CHO_DUNG.slice(0, 3).map((c) => c.x)).toEqual([38, 62, 50]);
    // Hai mép ngoài để trống cho ảnh người đứng hai bên sàn của thiết kế.
    expect(CHO_DUNG.every((c) => c.x >= 16 && c.x <= 84)).toBe(true);
  });

  it('xin đông hơn số chỗ thì chỉ xếp tới hết chỗ', () => {
    expect(xepSan({ ...MAC_DINH, count: 99 }, 0, 0, 0)).toHaveLength(TOI_DA);
  });

  it('cùng một `now` thì hai cửa sổ xếp ra y hệt nhau', () => {
    expect(xepSan(MAC_DINH, 7_123_456, 0, 0)).toEqual(xepSan(MAC_DINH, 7_123_456, 0, 0));
  });
});

describe('động tác lúc không ai nhảy', () => {
  it('đứng là chính, thỉnh thoảng làm một động tác nghỉ', () => {
    expect(dangCua(0, 0, 0, 0).dang).toBe('nghi');
    expect(dangCua(0, 3_199, 0, 0).dang).toBe('nghi');
    expect(dangCua(0, 3_200, 0, 0).dang).toBe('dung');
    expect(dangCua(0, 16_000, 0, 0).dang).toBe('nghi');
  });

  it('động tác nghỉ có mốc bắt đầu, để phần vẽ lùi hoạt ảnh đúng chỗ', () => {
    expect(dangCua(0, 16_500, 0, 0).tu).toBe(16_000);
  });

  it('người này lệch người kia, cả hàng không cùng cúi một lượt', () => {
    for (let now = 0; now < 32_000; now += 400) {
      const dang = Array.from({ length: TOI_DA }, (_, i) => dangCua(i, now, 0, 0).dang);
      const nghi = dang.filter((d) => d === 'nghi').length;
      expect(nghi, `quá nhiều người cùng nghỉ ở ${now}ms`).toBeLessThanOrEqual(2);
      expect(dang, `không còn ai đứng ở ${now}ms`).toContain('dung');
    }
  });

  it('sàn không bao giờ trống: không ai nhảy thì vẫn đủ người đứng', () => {
    const s = core.init(MAC_DINH);
    expect(nhip(s, 500_000)).toHaveLength(3);
    expect(nhip(s, 500_000).every((d) => d === 'dung' || d === 'nghi')).toBe(true);
  });
});

describe('có quà thì lên nhảy', () => {
  it('cả nhóm nhảy đúng thời lượng đã khai rồi về đứng', () => {
    const s = core.init(MAC_DINH);
    const ra = runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    expect(ra).toEqual([{ kind: 'overlay', slot: 'floor', ttlMs: NHAY_MS }]);
    expect(s.nhayTu).toBe(10_000);

    expect(nhip(s, 10_000)).toEqual(['nhay', 'nhay', 'nhay']);
    expect(nhip(s, 10_000 + NHAY_MS - 1)).toEqual(['nhay', 'nhay', 'nhay']);
    expect(nhip(s, 10_000 + NHAY_MS).every((d) => d !== 'nhay')).toBe(true);
  });

  it('cả nhóm nhảy chung một mốc, nên hai cửa sổ thấy họ cùng nhịp', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    nhip(s, 12_000);
    expect(new Set(s.nguoi.map((n) => n.tu))).toEqual(new Set([10_000]));
  });

  it('quà dồn không cắt ngang màn đang nhảy', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    runFeed(mod, s, qua(40_000, 2), ctx(MAC_DINH, 40_000));
    expect(s.nhayTu).toBe(10_000);
  });

  it('hết màn và hết quãng nghỉ thì quà sau mở màn mới', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    const sau = 10_000 + NHAY_MS + 20_000;
    runFeed(mod, s, qua(sau, 2), ctx(MAC_DINH, sau));
    expect(s.nhayTu).toBe(sau);
  });

  it('nhân vật ảo tặng quà thì không tính — runtime lọc trước khi tới móc', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, { ...qua(10_000), virtual: true }, ctx(MAC_DINH, 10_000));
    expect(s.nhayDen).toBe(0);
  });
});

describe('nút Nhảy ngay', () => {
  it('bấm là nhảy luôn, kể cả khi tắt nhảy khi có quà', () => {
    const cfg = { ...MAC_DINH, danceOnGift: false };
    const s = core.init(cfg);
    const ra = runAction(mod, s, 'nhay', ctx(cfg, 1_000));
    expect(ra).toEqual([{ kind: 'overlay', slot: 'floor', ttlMs: NHAY_MS }]);
    expect(nhip(s, 2_000).every((d) => d === 'nhay')).toBe(true);
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
    nhip(s, 12_000);

    core.onConfig!(s, { ...MAC_DINH, danceOnGift: false });
    expect(s.nhayDen).toBe(0);
    expect(s.nguoi.every((n) => n.dang !== 'nhay')).toBe(true);
    expect(nhip(s, 12_250).every((d) => d !== 'nhay')).toBe(true);
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
    expect(s.nhayDen).toBe(10_000 + 30_000);
    expect(nhip(s, 10_000 + 30_000).every((d) => d !== 'nhay')).toBe(true);
  });

  it('bớt người thì bỏ bớt ngay, thêm người thì nhịp sau đã có mặt', () => {
    const s = core.init(MAC_DINH);
    core.onConfig!(s, { ...MAC_DINH, count: 1 });
    expect(s.nguoi).toHaveLength(1);

    core.onConfig!(s, { ...MAC_DINH, count: 5 });
    expect(nhip(s, 1_000)).toHaveLength(5);
  });

  it('dọn thì sàn trống hẳn, không còn màn nào treo lại', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(10_000), ctx(MAC_DINH, 10_000));
    core.dispose!(s);
    expect(s.nguoi).toEqual([]);
    expect(s.nhayDen).toBe(0);
  });
});
