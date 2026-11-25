/** Tính nhất quán của bảng tu luyện: cảnh giới, đan dược, công pháp, trang bị, trang phục — và trang truyện
 *  (web/son-ha-tien-lo) phải ghi đúng số của game. Sửa bảng nào mà vỡ test này là có chỗ lệch logic. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { CANH_GIOI, DAN_GIA, DAN_LK } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';
import { AO, CANH_CP, CONG_PHAP, DAN, DAN_TONG, GIA_CP, HE_CP, moCong, PET } from '../../../../client/designs/tu-tien-son-ha/src/loi/tang-bao';
import { GOC_PHAM, lucGoc, PHAM, TEN_BIEN_THE } from '../../../../client/designs/tu-tien-son-ha/src/loi/trang-bi';

const khoang = (c: number) => CANH_GIOI[c + 1]!.can - CANH_GIOI[c]!.can;
const NGUYEN_ANH = CANH_GIOI.findIndex((g) => g.ten === 'Nguyên Anh');

describe('Cảnh giới', () => {
  it('ngưỡng tăng dần, khoảng cách giữa hai cảnh giới cũng tăng dần', () => {
    for (let c = 1; c < CANH_GIOI.length; c++) expect(CANH_GIOI[c]!.can).toBeGreaterThan(CANH_GIOI[c - 1]!.can);
    for (let c = 1; c < CANH_GIOI.length - 1; c++) expect(khoang(c)).toBeGreaterThan(khoang(c - 1));
  });
  it('độ kiếp từ Nguyên Anh: dưới không cần hộ pháp, từ đó mỗi bậc cần thêm một người', () => {
    CANH_GIOI.forEach((g, c) => expect(g.hoPhap).toBe(c < NGUYEN_ANH ? 0 : 3 + (c - NGUYEN_ANH)));
  });
  it('lực chiến gốc tăng theo cảnh giới', () => {
    for (let c = 1; c < CANH_GIOI.length; c++) expect(lucGoc(c)).toBeGreaterThan(lucGoc(c - 1));
  });
});

describe('Đan dược', () => {
  const lk = DAN.filter((d) => 'lk' in d.dung);
  it('đan linh khí: mới vào cảnh giới tối thiểu mà uống thì không phí giọt nào', () => {
    for (const d of lk) expect((d.dung as { lk: number }).lk).toBeLessThanOrEqual(khoang(d.can));
  });
  it('đan linh khí bậc cao: cảnh giới cần tăng dần, lời hơn (linh khí mỗi linh thạch tăng dần)', () => {
    for (let i = 1; i < lk.length; i++) {
      expect(lk[i]!.can).toBeGreaterThan(lk[i - 1]!.can);
      const a = (lk[i - 1]!.dung as { lk: number }).lk / lk[i - 1]!.gia;
      const b = (lk[i]!.dung as { lk: number }).lk / lk[i]!.gia;
      expect(b).toBeGreaterThan(a);
    }
  });
  it('tên đan khớp cảnh giới dùng: Trúc Cơ Đan từ Trúc Cơ, Kết Kim Đan từ Kết Đan', () => {
    expect(CANH_GIOI[DAN.find((d) => d.ten === 'Trúc Cơ Đan')!.can]!.ten).toBe('Trúc Cơ');
    expect(CANH_GIOI[DAN.find((d) => d.ten === 'Kết Kim Đan')!.can]!.ten).toBe('Kết Đan');
  });
  it('Phá Cảnh Đan chỉ từ Nguyên Anh: rẻ hơn đan thường khi lấp một khoảng lớn', () => {
    const p = DAN.find((d) => 'day' in d.dung)!;
    expect(p.can).toBe(NGUYEN_ANH);
    const tot = Math.max(...lk.map((d) => (d.dung as { lk: number }).lk / d.gia));
    expect(khoang(p.can) / p.gia).toBeLessThan(tot); // vẫn đắt hơn mua lẻ — trả cho sự tiện
    expect(khoang(CANH_GIOI.length - 2) / p.gia).toBeGreaterThan(tot); // ở bậc cao thì lời hơn
  });
  it('Hộ Kiếp Đan chỉ bán từ bậc ngay trước độ kiếp', () => {
    expect(DAN.find((d) => 'tran' in d.dung && d.dung.tran === 'kiep')!.can).toBe(NGUYEN_ANH - 1);
  });
  it('gõ 3 "luyện đan" đúng bằng Tụ Khí Đan D1', () => {
    expect(DAN[0]!.gia).toBe(DAN_GIA);
    expect((DAN[0]!.dung as { lk: number }).lk).toBe(DAN_LK);
  });
  it('mỗi tông một tên đan cho đủ chín món', () => {
    expect(DAN_TONG.son.length).toBe(DAN.length);
    expect(DAN_TONG.thuy.length).toBe(DAN.length);
  });
});

describe('Công pháp', () => {
  it('giá gấp đôi mỗi bậc, cảnh giới cần tăng theo bậc', () => {
    for (const m of CONG_PHAP) expect(m.gia).toBe(GIA_CP[m.bac]);
    for (let b = 2; b <= 5; b++) {
      expect(GIA_CP[b]).toBe(GIA_CP[b - 1]! * 2);
      expect(CANH_CP[b]).toBeGreaterThan(CANH_CP[b - 1]!);
    }
  });
  it('dòng công dụng sinh từ đúng hệ số trận (không gõ tay)', () => {
    for (const m of CONG_PHAP) expect(m.mo).toBe(moCong(m.he, m.bac));
    expect(moCong('ve', 3)).toBe('đỡ +15%, đòn +9%');
    expect(moCong('quan', 4)).toBe('bạo kích +12%, đòn +20%');
  });
  it('mỗi hệ có ít nhất một môn; Chiến Tướng đánh mạnh nhất mỗi bậc', () => {
    for (const he of Object.keys(HE_CP)) expect(CONG_PHAP.some((m) => m.he === he)).toBe(true);
    for (const he of Object.keys(HE_CP)) expect(HE_CP.tuong.don).toBeGreaterThanOrEqual(HE_CP[he as keyof typeof HE_CP].don);
  });
});

describe('Trang bị và trang phục', () => {
  it('phẩm cao cần cảnh giới cao; chỉ số gốc tăng theo phẩm', () => {
    for (let p = 1; p < PHAM.length; p++) {
      expect(PHAM[p]!.can).toBeGreaterThan(PHAM[p - 1]!.can);
      expect(GOC_PHAM[p]).toBeGreaterThan(GOC_PHAM[p - 1]!);
    }
  });
  it('đồ không vượt cảnh giới: cả bộ một phẩm (lệch +15%) cộng gốc vẫn dưới lực chiến gốc của cảnh giới kế', () => {
    PHAM.forEach((ph, p) => expect(lucGoc(ph.can) + 2 * GOC_PHAM[p]! * 1.15).toBeLessThan(lucGoc(ph.can + 1) * 1.6));
    PHAM.forEach((ph, p) => expect(2 * GOC_PHAM[p]! * 1.15).toBeLessThan(lucGoc(ph.can + 1)));
  });
  it('áo cần cảnh giới không giảm theo mã; pet đắt hơn thì mạnh hơn', () => {
    for (let i = 1; i < AO.length; i++) expect(AO[i]!.can).toBeGreaterThanOrEqual(AO[i - 1]!.can);
    for (let i = 1; i < PET.length; i++) {
      expect(PET[i]!.gia).toBeGreaterThanOrEqual(PET[i - 1]!.gia);
      expect(PET[i]!.phan).toBeGreaterThanOrEqual(PET[i - 1]!.phan);
    }
  });
});

// ---------- Trang truyện ghi đúng số của game ----------
const WEB = resolve(__dirname, '../../../../web/son-ha-tien-lo/js');
function napWeb(): { site: { CANH_GIOI: { ten: string; can: number; hoPhap: number }[] }; kho: { KHO: { id: string; dong?: unknown[][] }[] } } {
  const window: Record<string, unknown> = {};
  // DOM giả: trang chỉ cần đọc dữ liệu, mọi lệnh vẽ đều trả về phần tử rỗng.
  const el = (): Record<string, unknown> =>
    new Proxy({}, { get: (_t, k) => (k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains: () => false } : k === 'style' || k === 'dataset' ? {} : typeof k === 'string' && /^(get|query|create)/.test(k) ? () => el() : k === 'querySelectorAll' || k === 'children' ? [] : () => el()) });
  const document = new Proxy({}, { get: (_t, k) => (k === 'querySelectorAll' || k === 'getElementsByTagName' ? () => [] : k === 'body' || k === 'documentElement' ? el() : () => el()) });
  const ctx = { window, document, location: { search: '', pathname: '', href: '' }, localStorage: { getItem: () => null, setItem() {} }, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, requestAnimationFrame: () => 0, addEventListener() {}, navigator: { userAgent: '' } };
  runInNewContext(readFileSync(resolve(WEB, 'site.js'), 'utf8'), ctx);
  runInNewContext(readFileSync(resolve(WEB, 'tang-bao.js'), 'utf8'), ctx);
  return { site: window['SHTL'] as never, kho: window['SHTL_KHO'] as never };
}
const so = (x: unknown) => Number(String(x).replace(/[^\d]/g, ''));

describe('Trang truyện khớp game', () => {
  const { site, kho } = napWeb();
  const bang = (id: string) => kho.KHO.find((k) => k.id === id)!.dong!;

  it('cảnh giới: tên, ngưỡng, hộ pháp', () => {
    expect(site.CANH_GIOI.map((g) => [g.ten, g.can, g.hoPhap])).toEqual(CANH_GIOI.map((g) => [g.ten, g.can, g.hoPhap]));
  });
  it('đan dược: giá, công dụng, tên riêng từng tông', () => {
    const d = bang('dan');
    expect(d.length).toBe(DAN.length);
    DAN.forEach((m, i) => {
      expect(so(d[i]![3])).toBe(m.gia);
      expect(String(d[i]![1])).toBe(`${DAN_TONG.son[i]} ${m.ten}`);
      expect(String(d[i]![2])).toBe(`${DAN_TONG.thuy[i]} ${m.ten}`);
      if ('lk' in m.dung) expect(String(d[i]![4])).toContain(`+${m.dung.lk}`);
      if (m.can > 0) expect(String(d[i]![4])).toContain(CANH_GIOI[m.can]!.ten);
    });
  });
  it('công pháp: tên hai tông, giá, công dụng, cảnh giới cần', () => {
    const c = bang('cong-phap');
    expect(c.length).toBe(CONG_PHAP.length);
    CONG_PHAP.forEach((m, i) => {
      expect([c[i]![1], c[i]![2], so(c[i]![3])]).toEqual([m.ten.son, m.ten.thuy, m.gia]);
      expect(String(c[i]![4])).toContain(m.mo);
      if (CANH_CP[m.bac]! > 0) expect(String(c[i]![4])).toContain(CANH_GIOI[CANH_CP[m.bac]!]!.ten);
    });
  });
  it('trang bị: tên biến thể từng tông, phẩm, chỉ số, cảnh giới mặc', () => {
    const t = bang('trang-bi');
    const bt = (kho as unknown as { BIEN_THE: Record<'son' | 'thuy', string[][][]> }).BIEN_THE;
    (['vu', 'ao', 'bao'] as const).forEach((o, k) =>
      PHAM.forEach((ph, p) => {
        const r = t[k * 5 + p]!;
        for (const tg of ['son', 'thuy'] as const) expect(bt[tg][p]![k]).toEqual([...TEN_BIEN_THE[tg][p]![o]]);
        expect([r[1], r[2]]).toEqual([TEN_BIEN_THE.son[p]![o][0], TEN_BIEN_THE.thuy[p]![o][0]]);
        expect(r[5]).toBe(CANH_GIOI[ph.can]!.ten);
        expect(String(r[6])).toContain(String(o === 'bao' ? Math.floor(GOC_PHAM[p]! / 2) : GOC_PHAM[p]!));
      }),
    );
  });
  it('trang phục và linh thú: giá, cảnh giới cần', () => {
    const a = bang('ao');
    AO.forEach((m, i) => {
      expect([a[i]![1], a[i]![2], a[i]![3]]).toEqual([m.ten.son, m.ten.thuy, m.gia]);
      expect(a[i]![4]).toBe(m.can > 0 ? CANH_GIOI[m.can]!.ten : '');
    });
    const p = bang('linh-thu');
    PET.forEach((m, i) => {
      expect(p[i]![3]).toBe(m.gia);
      expect(p[i]![4]).toBe(`+${Math.round(m.phan * 100)}%`);
    });
  });
});
