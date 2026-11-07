import { describe, expect, it } from 'vitest';
import { bocAnhHayDongHo, khungHien } from '@live/contracts';

describe('ảnh hoặc đồng hồ ngẫu nhiên mỗi truyện', () => {
  it('tắt công tắc ngẫu nhiên: theo hai công tắc riêng, ô thiếu là vẫn hiện', () => {
    expect(khungHien({})).toEqual({ anh: true, dongHo: true });
    expect(khungHien({ hienAnh: false })).toEqual({ anh: false, dongHo: true });
    expect(khungHien({ hienDongHo: false, anhHoacDongHo: false })).toEqual({ anh: true, dongHo: false });
  });

  it('bật: mỗi truyện đúng MỘT trong hai, bỏ qua hai công tắc riêng', () => {
    const k = khungHien({ anhHoacDongHo: true, title: 'Tấm Cám', batDau: 1, hienAnh: false, hienDongHo: false });
    expect(k.anh !== k.dongHo).toBe(true);
  });

  it('cùng truyện cùng mốc thì mọi cửa sổ ra cùng kết quả', () => {
    for (let i = 0; i < 20; i++) {
      expect(bocAnhHayDongHo('Thạch Sanh', 1794000000000 + i)).toBe(bocAnhHayDongHo('Thạch Sanh', 1794000000000 + i));
    }
  });

  it('nhiều truyện thì ra cả hai kiểu, không kẹt một kiểu', () => {
    const ten = ['Tấm Cám', 'Thạch Sanh', 'Sọ Dừa', 'Cây tre trăm đốt', 'Sự tích trầu cau', 'Thánh Gióng', 'Cóc kiện trời', 'Treo biển'];
    const ra = new Set(ten.map((t, i) => bocAnhHayDongHo(t, 1794000000000 + i * 60_000)));
    expect(ra).toEqual(new Set(['anh', 'dong-ho']));
  });
});
