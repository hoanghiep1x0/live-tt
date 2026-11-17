import { describe, expect, it } from 'vitest';
import {
  CACH_GOI,
  CAU_CHO,
  cauCho,
  CUNG,
  dangGiuDoanCuoi,
  GIU_DOAN_CUOI_MS,
  giaiLaoCua,
  loiChao,
  tenTruyenSau,
  thuTuCho,
} from '../../../../client/designs/ke-chuyen/src/parts/cho-truyen';

const nghi = (tu: number, lyDo = 'chuyen') => ({ giaiLao: { truyenSau: 'Sọ Dừa', lyDo, tu } });

describe('giờ nghỉ giữa hai truyện', () => {
  it('đọc ô giaiLao của module Kể truyện', () => {
    expect(giaiLaoCua(nghi(1_000))).toEqual({ truyenSau: 'Sọ Dừa', lyDo: 'chuyen', tu: 1_000, han: 0, giaoLuu: false });
    expect(giaiLaoCua({ giaiLao: { truyenSau: 'A', lyDo: 'chuyen', tu: 5, han: 22_000 } })?.han).toBe(22_000);
    expect(giaiLaoCua({})).toBeNull();
    expect(giaiLaoCua(null)).toBeNull();
    expect(giaiLaoCua({ giaiLao: { tu: 0 } })).toBeNull();
  });

  it('mấy giây đầu còn giữ đoạn cuối: chưa đếm, chưa kéo màn chờ lên', () => {
    const g = giaiLaoCua(nghi(1_000));
    expect(dangGiuDoanCuoi(g, 1_000)).toBe(true);
    expect(dangGiuDoanCuoi(g, 1_000 + GIU_DOAN_CUOI_MS - 1)).toBe(true);
    expect(dangGiuDoanCuoi(g, 1_000 + GIU_DOAN_CUOI_MS)).toBe(false);
    // Nghỉ vì sự cố thì không có đoạn cuối nào vừa kể xong để mà giữ.
    expect(dangGiuDoanCuoi(giaiLaoCua(nghi(1_000, 'anh')), 1_000)).toBe(false);
    expect(dangGiuDoanCuoi(null, 1_000)).toBe(false);
  });

});

describe('tên truyện sắp kể trên màn chờ', () => {
  it('lấy tên truyện máy chủ đã chuẩn bị', () => {
    expect(tenTruyenSau({ title: '', truyenSau: { title: 'Ngựa con qua sông' } })).toBe(
      'Ngựa con qua sông',
    );
  });

  it('giờ nghỉ đã có dải "Truyện tiếp theo" thì màn chờ không vẽ lại', () => {
    const cfg = {
      title: '',
      giaiLao: { truyenSau: 'Sọ Dừa', lyDo: 'chuyen', tu: 1_000 },
      truyenSau: { title: 'Sọ Dừa' },
    };
    expect(tenTruyenSau(cfg)).toBe('');
  });

  it('giờ nghỉ chưa biết tên thì vẫn lấy truyện đã chuẩn bị', () => {
    const cfg = {
      title: '',
      giaiLao: { truyenSau: '', lyDo: 'chuyen', tu: 1_000 },
      truyenSau: { title: 'Trí khôn của ta đây' },
    };
    expect(tenTruyenSau(cfg)).toBe('Trí khôn của ta đây');
  });

  it('đang kể truyện thì không chớp tên truyện khác', () => {
    expect(tenTruyenSau({ title: 'Tấm Cám', truyenSau: { title: 'Sọ Dừa' } })).toBe('');
  });

  it('chưa chuẩn bị được truyện nào thì không hiện khối rỗng', () => {
    for (const cfg of [{}, { truyenSau: {} }, { truyenSau: { title: '   ' } }, null, 'x', []]) {
      expect(tenTruyenSau(cfg)).toBe('');
    }
  });
})

describe('đổi cách gọi người nghe trên màn chờ', () => {
  it('xen kẽ gọi cả phòng và gọi một người', () => {
    const vong = CACH_GOI.map((_, i) => loiChao(i));
    expect(new Set(vong).size).toBe(CACH_GOI.length, 'trong một vòng không lời nào lặp');
    expect(vong).toContain('Chào cả nhà');
    expect(vong).toContain('Chào bạn');
    // Hết vòng thì quay lại, không nhảy lung tung.
    expect(loiChao(CACH_GOI.length)).toBe(loiChao(0));
  });

  it('câu giữ chân điền đúng cách gọi, có cả lối rủ nghe cùng MC', () => {
    const n = CAU_CHO.length * CACH_GOI.length * CUNG.length;
    const ds = Array.from({ length: n }, (_, i) => cauCho(i));
    expect(ds.every((c) => !c.includes('{'))).toBe(true, 'không được còn chỗ trống');
    expect(ds.every((c) => c.trim() !== '')).toBe(true);
    // Chỗ trống đứng đầu câu phải được viết hoa lại, không để "cả phòng ngồi…".
    expect(ds.every((c) => c[0] === c[0]?.toUpperCase())).toBe(true, 'có câu mở đầu bằng chữ thường');
    // Đủ cả ba kiểu người đi cùng mà chủ phòng muốn.
    for (const c of ['cùng tớ', 'cùng chúng mình', 'cùng cả nhà']) {
      expect(ds.some((x) => x.includes(c))).toBe(true, `thiếu "${c}"`);
    }
    // Ba vòng KHÔNG chia hết cho nhau thì mới nhân lên; chia hết là bước
    // song song, thêm bao nhiêu từ cũng vô ích.
    expect(CAU_CHO.length % CACH_GOI.length).not.toBe(0);
    expect(CAU_CHO.length % CUNG.length).not.toBe(0);
    expect(new Set(ds).size).toBeGreaterThan(CAU_CHO.length * 2);
  });

  it('mốc xoay giữ nguyên suốt một lượt chờ', () => {
    const g = giaiLaoCua({ giaiLao: { truyenSau: 'A', lyDo: 'chuyen', tu: 1_700_000_000_000 } });
    const a = thuTuCho({ batDau: 123 }, g);
    expect(thuTuCho({ batDau: 123 }, g)).toBe(a, 'cùng lượt chờ thì cùng một mốc');
    // Chưa có giờ nghỉ thì theo lúc truyện bắt đầu; không có gì thì về 0.
    expect(thuTuCho({ batDau: 5_000 }, null)).toBe(5);
    expect(thuTuCho({}, null)).toBe(0);
    expect(thuTuCho(null, null)).toBe(0);
  });

  it('mốc âm hay lạ cũng không làm vỡ chỉ số', () => {
    for (const t of [-7, -1, 0, 1.9, Number.NaN]) {
      expect(loiChao(t).startsWith('Chào ')).toBe(true, `mốc ${t}`);
      expect(cauCho(t).trim()).not.toBe('');
    }
  });
})
