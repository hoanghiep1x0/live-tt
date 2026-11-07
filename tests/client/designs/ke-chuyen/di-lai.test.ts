import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import {
  cacLuot,
  CAO_NGUOI,
  choDen,
  DI_MS,
  loiGan,
  tenNgan,
} from '../../../../client/designs/ke-chuyen/src/parts/di-lai';
import { dungGhe } from '../../../../client/designs/ke-chuyen/src/parts/ghe';
import { AISLES_X } from '../../../../client/designs/ke-chuyen/src/seats';

const ghe = dungGhe(7);
const hangCuoi = Math.max(...ghe.map((g) => g.r));

const vao = (id: number, at: number, name: string): FeedItem =>
  ({ id, at, kind: 'join', name, user: name, text: 'vào phòng' }) as unknown as FeedItem;

describe('chỗ người đi vào đi tới', () => {
  it('biết ghế thật thì về đúng ghế đó', () => {
    const g = ghe.find((x) => x.r === 3 && x.y > CAO_NGUOI);
    expect(g).toBeDefined();
    if (g === undefined) return;
    expect(choDen('Vy', { x: g.x, y: g.y }, ghe)).toEqual({ x: g.x, y: g.y });
  });

  it('CHƯA có ghế thì vẫn có chỗ để rẽ vào, không đi thẳng lên đỉnh rạp', () => {
    // Đây là lỗi chủ phòng báo: phòng nghìn người mà rạp chỉ 84 ghế, nên hầu
    // hết khách không có ghế — bản cũ cho họ đi tuột lên `y = 6cqw` ở giữa lối,
    // tức đi thẳng một mạch rồi tắt.
    const cho = choDen('khach-khong-ghe', undefined, ghe);
    expect(cho.y).toBeGreaterThan(CAO_NGUOI);
    // Chỗ ấy phải LỆCH khỏi lối đi, nếu không thì chẳng có gì để rẽ.
    const lech = Math.min(...AISLES_X.map((x) => Math.abs(x - cho.x)));
    expect(lech).toBeGreaterThan(1);
    // Và phải là một ghế có thật ở hai hàng cuối.
    const g = ghe.find((x) => Math.abs(x.x - cho.x) < 0.001 && x.r >= hangCuoi - 1);
    expect(g).toBeDefined();
  });

  it('KHÔNG BAO GIỜ dừng cao quá mép rạp — đầu bị cắt là lỗi chủ phòng báo', () => {
    // Rạp cắt phần tràn ra ngoài, nên điểm dừng cách mép trên chưa đủ một thân
    // người là khách thấy một người cụt đầu.
    for (const ai of ['a', 'bb', 'ccc', 'Vy', '♕P.H.hoa']) {
      expect(choDen(ai, undefined, ghe).y).toBeGreaterThanOrEqual(CAO_NGUOI);
    }
    // Ghế hàng đầu nằm cao hơn một thân người thì cũng bị kéo xuống.
    expect(choDen('Vy', { x: 40, y: 2 }, ghe).y).toBe(CAO_NGUOI);
  });

  it('cùng một nick luôn ra cùng một chỗ', () => {
    // Hai cửa sổ cùng xem một phòng phải thấy người ấy đi cùng một đường.
    expect(choDen('Vy', undefined, ghe)).toEqual(choDen('Vy', undefined, ghe));
    expect(choDen('Vy', undefined, ghe)).not.toEqual(choDen('Lan', undefined, ghe));
  });

  it('luôn nhắm vào một ghế CÓ THẬT ở hai hàng cuối', () => {
    const sau = ghe.filter((g) => g.r >= hangCuoi - 1);
    for (const ai of ['a', 'Vy', 'roblox_gam', 'user907985569357']) {
      const cho = choDen(ai, undefined, ghe);
      expect(sau.some((g) => Math.abs(g.x - cho.x) < 0.001)).toBe(true);
    }
  });

  it('rạp chưa dựng xong thì không nổ, đứng giữa lối giữa', () => {
    expect(choDen('Vy', undefined, [])).toEqual({ x: 50, y: CAO_NGUOI });
  });
});

describe('lượt đi ở lối', () => {
  it('đi lối GẦN chỗ mình nhất, để rẽ vào hàng cho ngắn', () => {
    const timCho = (ai: string) => choDen(ai, undefined, ghe);
    const luot = cacLuot([vao(1, 1_000, 'Vy')], 1_000, timCho);
    expect(luot).toHaveLength(1);
    const l = luot[0];
    expect(l).toBeDefined();
    if (l === undefined) return;
    expect(l.loi).toBe(loiGan(l.cho.x));
  });

  it('chốt chỗ vào chính lượt đi, để phần vẽ khỏi tra lại lệch', () => {
    // `loi` chọn theo `cho`; hai bên mà lệch nhau thì người đi lên một lối rồi
    // rẽ ngang sang lối khác.
    const biet = { x: 8, y: 30 };
    const luot = cacLuot([vao(1, 1_000, 'Vy')], 1_000, () => biet);
    expect(luot[0]?.cho).toEqual(biet);
    expect(luot[0]?.loi).toBe(loiGan(8));
  });

  it('hết quãng đi thì lượt biến mất', () => {
    const timCho = (ai: string) => choDen(ai, undefined, ghe);
    const feed = [vao(1, 1_000, 'Vy')];
    expect(cacLuot(feed, 1_000 + DI_MS - 1, timCho)).toHaveLength(1);
    expect(cacLuot(feed, 1_000 + DI_MS, timCho)).toHaveLength(0);
  });

  it('tên dài thì rút cho vừa nhãn đi theo đầu', () => {
    expect(tenNgan('Nguyễn Thị Lan')).toBe('Lan');
    expect(tenNgan('user907985569357')).toBe('user907985');
  });
});
