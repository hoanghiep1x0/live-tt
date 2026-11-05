import { describe, expect, it } from 'vitest';
import { CHU_KY_MS, HIEN_MS, luotGoiY } from '../../../client/designs/ke-chuyen/src/parts/goi-y';

describe('nhịp popup gợi ý lệnh', () => {
  it('hiện ở đầu mỗi chu kỳ rồi tắt', () => {
    expect(luotGoiY(0).hien).toBe(true);
    expect(luotGoiY(HIEN_MS - 1).hien).toBe(true);
    expect(luotGoiY(HIEN_MS).hien).toBe(false);
    expect(luotGoiY(CHU_KY_MS - 1).hien).toBe(false);
    expect(luotGoiY(CHU_KY_MS).hien).toBe(true);
  });

  it('mỗi chu kỳ một số lượt khác nhau, để hiệu ứng vào chạy lại', () => {
    expect(luotGoiY(0).luot).toBe(0);
    expect(luotGoiY(CHU_KY_MS + 10).luot).toBe(1);
    expect(luotGoiY(CHU_KY_MS * 7 + 10).luot).toBe(7);
  });

  it('hai cửa sổ mở cùng lúc thấy cùng một thứ — chỉ phụ thuộc đồng hồ', () => {
    const t = 1_700_000_123_456;
    expect(luotGoiY(t)).toEqual(luotGoiY(t));
  });
});
