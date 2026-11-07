import { describe, expect, it } from 'vitest';
import { Classroom } from '../../../../client/modules/do-chu/src/lop/quiz';
import {
  dayKey,
  diemDanh,
  docSo,
  gopSo,
  phienMoi,
  soRong,
  talkTop,
  todayTop,
  weekKey,
  weekTop,
} from '../../../../client/modules/do-chu/src/so-lop';

// 2026-11-04 (thứ tư) 10 giờ sáng giờ máy.
const T = new Date(2026, 10, 4, 10, 0, 0).getTime();
const NGAY = 86_400_000;

describe('sổ lớp', () => {
  it('ngày và tuần ISO theo giờ máy', () => {
    expect(dayKey(T)).toBe('2026-11-04');
    expect(weekKey(T)).toBe('2026-W45');
    // Chủ nhật vẫn thuộc tuần bắt đầu từ thứ hai trước đó.
    expect(weekKey(new Date(2026, 10, 8, 23).getTime())).toBe('2026-W45');
    expect(weekKey(new Date(2026, 10, 9, 1).getTime())).toBe('2026-W46');
  });

  it('sổ hỏng, sổ trống hay khoá độc đều thành sổ dùng được', () => {
    expect(docSo(null, T)).toEqual(soRong(T));
    expect(docSo('rác', T)).toEqual(soRong(T));
    const s = docSo(
      JSON.parse('{"scores":{"__proto__":{"nickname":"x","points":5},"an":{"nickname":"An","points":"x"}}}'),
      T,
    );
    expect(Object.keys(s.scores)).toEqual(['an']);
    expect(s.scores['an']?.points).toBe(0);
  });

  it('sang tuần mới thì xoá bảng vàng tuần, sang ngày mới thì xoá điểm hôm nay', () => {
    const s = soRong(T);
    s.scores['an'] = { nickname: 'An', points: 10 };
    s.today.scores['an'] = { nickname: 'An', points: 10 };
    s.today.flowers = 7;
    const homSau = docSo(JSON.parse(JSON.stringify(s)), T + NGAY);
    expect(homSau.scores['an']?.points).toBe(10);
    expect(homSau.today.scores).toEqual({});
    expect(homSau.today.flowers).toBe(0);
    const tuanSau = docSo(JSON.parse(JSON.stringify(s)), T + 7 * NGAY);
    expect(tuanSau.scores).toEqual({});
  });

  it('chuyên cần: đi học liền thì cộng ngày, nghỉ một ngày là đếm lại', () => {
    const s = soRong(T);
    expect(diemDanh(s, 'an', 'An', T).days).toBe(1);
    expect(diemDanh(s, 'an', 'An', T + 3600_000).days).toBe(1);
    expect(diemDanh(s, 'an', 'An', T + NGAY).days).toBe(2);
    const r = diemDanh(s, 'an', 'An', T + 3 * NGAY);
    expect(r.days).toBe(1);
    expect(r.total).toBe(3);
    expect(diemDanh(s, '__proto__', 'x', T).days).toBe(0);
  });

  it('gộp phần lớp vừa ghi vào sổ rồi xoá khỏi lớp', () => {
    const s = soRong(T);
    const room = new Classroom([], T, () => 0.5);
    room.usedLog.push('02-con-vat:MÈO');
    room.weekDelta.set('an', { nickname: 'An', points: 10 });
    room.lifeDelta.set('an', { nickname: 'An', points: 10, total: 1, toan: 1, su: 0, meo: 0, anh: 0 });
    room.talkDelta.set('an', { nickname: 'An', points: 3 });
    room.banLog.push({ id: '01-truong-lop:BẢNG', answer: 'BẢNG', clue: 'c' });
    room.flowerDelta = 5;
    expect(gopSo(s, room, T)).toBe(true);
    expect(s.used['02-con-vat:MÈO']).toBe(T);
    expect(s.scores['an']?.points).toBe(10);
    expect(s.today.scores['an']?.points).toBe(10);
    expect(s.life['an']?.toan).toBe(1);
    expect(s.today.talk['an']?.points).toBe(3);
    expect(s.banned['01-truong-lop:BẢNG']?.answer).toBe('BẢNG');
    expect(s.today.flowers).toBe(5);
    expect(room.usedLog).toEqual([]);
    expect(room.weekDelta.size).toBe(0);
    expect(room.flowerDelta).toBe(0);
    expect(gopSo(s, room, T)).toBe(false);
    expect(weekTop(s)[0]).toEqual({ username: 'an', nickname: 'An', points: 10 });
    expect(todayTop(s)).toHaveLength(1);
    expect(talkTop(s)[0]?.points).toBe(3);
  });

  it('Top tương tác làm lại khi sang phiên live khác', () => {
    const s = soRong(T);
    expect(phienMoi(s, 'p1')).toBe(true);
    s.today.talk['an'] = { nickname: 'An', points: 4 };
    expect(phienMoi(s, 'p1')).toBe(false);
    expect(s.today.talk['an']?.points).toBe(4);
    expect(phienMoi(s, 'p2')).toBe(true);
    expect(s.today.talk).toEqual({});
    expect(phienMoi(s, '')).toBe(false);
  });
});
