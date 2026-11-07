import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import {
  aiCanChao,
  CACH_MAC_DINH_GIAY,
  cauChao,
  MOI_DOT,
  NGHI_MS,
  QUA_CU_MS,
  soChaoMoi,
  tenDocDuoc,
} from '../../../../client/designs/ke-chuyen/src/parts/chao-vao';

const vao = (id: number, at: number, name: string, ao = false): FeedItem =>
  ({ id, at, kind: 'join', name, text: 'vào phòng', ...(ao ? { virtual: true } : {}) }) as unknown as FeedItem;

const ten = (ds: readonly FeedItem[]): string[] => ds.map((f) => f.name);

describe('chào khách vào phòng bằng giọng', () => {
  it('tên có ký tự trang trí thì rút về phần đọc được', () => {
    // Đọc nguyên văn "♕P.H.hoa ❤️" thì giọng ra một tràng vô nghĩa.
    expect(tenDocDuoc('♕P.H.hoa ❤️')).toBe('P H hoa');
    expect(tenDocDuoc('Quốc Khánh')).toBe('Quốc Khánh');
    expect(tenDocDuoc('lion🐯')).toBe('lion');
    expect(tenDocDuoc('❤️❤️')).toBe('');
  });

  it('CHỈ MỘT kiểu câu chào, gộp nhiều tên, không từ đệm cuối', () => {
    // Chủ app chốt: lời chào lặp mấy chục lần một phút nên phải ngắn và luôn
    // giống nhau; đổi kiểu chỉ làm ồn, thêm "nha"/"nhé" thì nghe ra cái máy.
    expect(cauChao(['Vy'])).toBe('Chào Vy vào phòng');
    expect(cauChao(['Vy', 'Lan', 'Hùng'])).toBe('Chào Vy, Lan, Hùng vào phòng');
    for (const tu of ['nha', 'nhé', 'nghen', 'nhá']) {
      expect(cauChao(['Vy']).endsWith(tu)).toBe(false, `không được kết bằng "${tu}"`);
    }
    // Tên không đọc được bị loại khỏi danh sách, không làm hỏng cả câu.
    expect(cauChao(['Vy', '❤️', 'Lan'])).toBe('Chào Vy, Lan vào phòng');
    expect(cauChao(['❤️'])).toBe('');
    expect(cauChao([])).toBe('');
  });

  it('gộp tối đa 3 người vào MỘT lời chào rồi NGHỈ', () => {
    const so = soChaoMoi();
    const feed = [1, 2, 3, 4, 5].map((i) => vao(i, 1_000, `N${i}`));
    // Năm người vào cùng lúc: chào ba người đầu trong một câu.
    expect(ten(aiCanChao(feed, 1_000, so, 3))).toEqual(['N1', 'N2', 'N3']);
    // Đủ nhóm là phòng đang đông: im suốt quãng nghỉ dù còn hai người chờ.
    expect(aiCanChao(feed, 1_100, so, 3)).toEqual([]);
    expect(aiCanChao(feed, 1_000 + NGHI_MS - 1, so, 3)).toEqual([]);
  });

  it('hết nghỉ thì BỎ người tồn đọng, chào người mới vào', () => {
    const so = soChaoMoi();
    const cu = [1, 2, 3, 4, 5].map((i) => vao(i, 1_000, `Cu${i}`));
    expect(ten(aiCanChao(cu, 1_000, so, 0))).toEqual(['Cu1', 'Cu2', 'Cu3']);
    // Đang nghỉ; trong lúc nghỉ có người MỚI vào.
    const sau = so.nghiToi + 10;
    const them = [...cu, vao(9, sau, 'Moi')];
    expect(aiCanChao(them, so.nghiToi - 10, so, 0)).toEqual([]);
    // Hết nghỉ: Cu4, Cu5 bị bỏ qua, chào thẳng người mới.
    expect(ten(aiCanChao(them, sau, so, 0))).toEqual(['Moi']);
  });

  it('ít người thì chào đúng số người đang chờ, không bắt nghỉ', () => {
    const so = soChaoMoi();
    expect(ten(aiCanChao([vao(1, 1_000, 'A')], 1_000, so, 0))).toEqual(['A']);
    expect(so.nghiToi).toBe(0, 'chưa đủ nhóm thì không nghỉ');
    expect(ten(aiCanChao([vao(1, 1_000, 'A'), vao(2, 2_000, 'B')], 2_000, so, 0))).toEqual(['B']);
    expect(so.nghiToi).toBe(0);
  });

  it('giữ đúng giãn cách giữa hai lời chào', () => {
    const so = soChaoMoi();
    // Người đầu tiên được chào NGAY, không phải đợi hết một nhịp.
    expect(ten(aiCanChao([vao(1, 1_000, 'A')], 1_000, so, 3))).toEqual(['A']);
    const feed = [vao(1, 1_000, 'A'), vao(2, 1_100, 'B')];
    expect(aiCanChao(feed, 2_000, so, 3)).toEqual([], 'chưa đủ 3 giây');
    expect(ten(aiCanChao(feed, 4_000, so, 3))).toEqual(['B']);
  });

  it('không chào lại người đã chào', () => {
    const so = soChaoMoi();
    const feed = [vao(1, 1_000, 'Vy')];
    expect(ten(aiCanChao(feed, 1_000, so, 0))).toEqual(['Vy']);
    expect(aiCanChao(feed, 9_000, so, 0)).toEqual([]);
  });

  it('bỏ qua nhân vật ảo, người vào đã lâu, và tên không đọc được', () => {
    const so = soChaoMoi();
    expect(aiCanChao([vao(1, 1_000, 'Bot', true)], 1_000, so, 0)).toEqual([]);
    // Vào từ lâu: chào vuốt đuôi thì vô duyên, bỏ hẳn và không xét lại.
    const cu = [vao(2, 1_000, 'Xa')];
    expect(aiCanChao(cu, 1_000 + QUA_CU_MS, so, 0)).toEqual([]);
    expect(aiCanChao(cu, 1_000 + QUA_CU_MS + 1_000, so, 0)).toEqual([]);
    // Tên chỉ toàn biểu tượng: không đọc được nên bỏ, đừng xét lại mãi.
    const bieuTuong = [vao(3, 5_000, '❤️❤️')];
    expect(aiCanChao(bieuTuong, 5_000, so, 0)).toEqual([]);
  });

  it('mặc định giãn cách 3 giây và gộp 3 tên như chủ phòng dặn', () => {
    expect(CACH_MAC_DINH_GIAY).toBe(3);
    expect(MOI_DOT).toBe(3);
  });
});
