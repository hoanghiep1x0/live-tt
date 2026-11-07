import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAT_MS, QuyenNoi } from '../../../client/shared/stage-sdk/src/quyen-noi';
import type { HenGio, KenhTin } from '../../../client/shared/stage-sdk/src/quyen-noi';

/** Kênh giả nối mọi cửa sổ như BroadcastChannel: tin đi tới mọi kênh KHÁC. */
function bus(): () => KenhTin {
  const ds: { k: KenhTin; f: () => ((t: unknown) => void) | null }[] = [];
  return () => {
    let nghe: ((t: unknown) => void) | null = null;
    const k = {
      postMessage(tin: unknown) {
        for (const x of ds) if (x.k !== k) x.f()?.(tin);
      },
      nghe(f: (t: unknown) => void) {
        nghe = f;
      },
    };
    ds.push({ k, f: () => nghe });
    return k;
  };
}

let dongHo = 0;

/** Hẹn giờ giả: giữ việc hẹn trong hàng, `chayHet()` chạy hết. */
let cho: (() => void)[] = [];
const hen: HenGio = (f) => {
  cho.push(f);
  return () => {
    cho = cho.filter((x) => x !== f);
  };
};
function chayHet(): void {
  const ds = cho;
  cho = [];
  ds.forEach((f) => f());
}

function cuaSo(moi: () => KenhTin, id: string, obs = false, thay = true) {
  const mat = vi.fn();
  const q = new QuyenNoi(moi(), id, obs, mat, hen, () => dongHo, () => thay);
  return { q, mat };
}

describe('chỉ một cửa sổ được đọc to', () => {
  beforeEach(() => {
    cho = [];
    dongHo = 1_000;
  });

  it('cửa sổ mới mở giành quyền, cửa sổ cũ im và tắt câu đang đọc', () => {
    const moi = bus();
    const a = cuaSo(moi, 'a');
    a.q.gianh();
    const b = cuaSo(moi, 'b');
    dongHo += 500;
    b.q.gianh();
    expect(b.q.duocNoi()).toBe(true);
    expect(a.q.duocNoi()).toBe(false);
    expect(a.mat).toHaveBeenCalledOnce();
  });

  it('bấm vào cửa sổ nào thì cửa sổ đó đọc', () => {
    const moi = bus();
    const a = cuaSo(moi, 'a');
    const b = cuaSo(moi, 'b');
    a.q.gianh();
    dongHo += 500;
    b.q.gianh();
    dongHo += 500;
    a.q.gianh();
    expect([a.q.duocNoi(), b.q.duocNoi()]).toEqual([true, false]);
  });

  it('OBS không nhường cửa sổ thường', () => {
    const moi = bus();
    const obs = cuaSo(moi, 'obs', true);
    obs.q.gianh();
    const xem = cuaSo(moi, 'xem');
    xem.q.gianh();
    expect(obs.q.duocNoi()).toBe(true);
    expect(xem.q.duocNoi()).toBe(false);
  });

  it('cửa sổ đang đọc đóng thì cửa sổ còn thấy được nhận quyền', () => {
    const moi = bus();
    const a = cuaSo(moi, 'a');
    const an = cuaSo(moi, 'an', false, false);
    const b = cuaSo(moi, 'b');
    a.q.gianh();
    b.q.gianh();
    b.q.tra();
    chayHet();
    expect(a.q.duocNoi()).toBe(true);
    expect(an.q.duocNoi()).toBe(false);
  });

  it('không có kênh (trình duyệt cũ) thì một mình cứ nói', () => {
    expect(new QuyenNoi(null, 'x', false, () => {}, hen, () => 0).duocNoi()).toBe(true);
  });

  it('cửa sổ đang nói mất tích (không kịp báo đóng) thì cửa sổ khác tự nhận sau một lúc', () => {
    const moi = bus();
    const a = cuaSo(moi, 'a');
    const b = cuaSo(moi, 'b');
    a.q.gianh();
    dongHo += 1_000;
    b.q.gianh();
    // b mất tích: không báo gì nữa. a chưa nhận ngay…
    dongHo += MAT_MS - 1_000;
    a.q.nhip();
    expect(a.q.duocNoi()).toBe(false);
    // …im quá lâu thì a nhận.
    dongHo += 2_000;
    a.q.nhip();
    expect(a.q.duocNoi()).toBe(true);
  });

  it('đang nói thì nhịp đều giữ các cửa sổ khác im', () => {
    const moi = bus();
    const a = cuaSo(moi, 'a');
    const b = cuaSo(moi, 'b');
    a.q.gianh();
    for (let i = 0; i < 10; i += 1) {
      dongHo += 2_000;
      a.q.nhip();
      b.q.nhip();
    }
    expect([a.q.duocNoi(), b.q.duocNoi()]).toEqual([true, false]);
  });

  it('hai cửa sổ cùng giành một lúc: chỉ còn đúng một', () => {
    const moi = bus();
    const a = cuaSo(moi, 'a');
    const b = cuaSo(moi, 'b');
    // Cả hai cùng hết chờ và giành ở cùng một mốc giờ.
    a.q.gianh();
    b.q.gianh();
    expect([a.q.duocNoi(), b.q.duocNoi()].filter(Boolean)).toHaveLength(1);
  });
});
