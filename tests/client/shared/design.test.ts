import { describe, expect, it } from 'vitest';
import { designManifestSchema } from '@live/contracts';
import { ID_RE } from '@live/contracts';

describe('id thiết kế và module', () => {
  it('nhận kebab-case tự do, không ràng buộc dạng kieu-<số> như mã cũ', () => {
    for (const id of ['ke-chuyen', 'hip-hop', 'bar-3d', 'tich-phuoc', 'kieu-1']) {
      expect(ID_RE.test(id), id).toBe(true);
    }
  });

  it('từ chối id sai', () => {
    for (const id of ['', 'A', '1-phong', 'Ke-Chuyen', 'ke_chuyen', 'ke chuyen', 'k']) {
      expect(ID_RE.test(id), id).toBe(false);
    }
  });
});

describe('design.json', () => {
  it('điền đủ giá trị mặc định khi chỉ có id và tên', () => {
    const m = designManifestSchema.parse({ id: 'ke-chuyen', name: 'Phòng kể chuyện' });
    expect(m).toMatchObject({
      summary: '',
      version: '1.0.0',
      canvas: { width: 1080, height: 1920 },
      slots: [],
      provides: [],
      recommends: [],
      entry: 'dist/index.html',
    });
  });

  it('giữ nguyên slot và khả năng đã khai báo', () => {
    const m = designManifestSchema.parse({
      id: 'ke-chuyen',
      name: 'Phòng kể chuyện',
      slots: ['top-bar', 'center', 'stage-3d'],
      provides: ['stage-3d'],
      recommends: ['gift-thanks', 'welcome'],
    });
    expect(m.slots).toEqual(['top-bar', 'center', 'stage-3d']);
    expect(m.provides).toEqual(['stage-3d']);
    expect(m.recommends).toEqual(['gift-thanks', 'welcome']);
  });

  it('từ chối slot lạ thay vì bỏ qua im lặng', () => {
    const r = designManifestSchema.safeParse({
      id: 'ke-chuyen',
      name: 'Phòng kể chuyện',
      slots: ['goc-trai'],
    });
    expect(r.success).toBe(false);
  });

  it('từ chối id sai dạng, kèm lý do đọc được', () => {
    const r = designManifestSchema.safeParse({ id: 'Ke Chuyen', name: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('kebab-case');
  });
});
