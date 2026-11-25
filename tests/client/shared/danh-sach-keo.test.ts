import { describe, expect, it } from 'vitest';
import { doiList, tenMucList, type ConfigField } from '../../../client/shared/contracts/src/module';

const f: ConfigField = {
  key: 'chuoi',
  label: 'Sự kiện',
  type: 'list',
  fields: [{ key: 'viec', label: 'Việc', type: 'select', options: [{ value: 'ai', label: 'Ải Nhập Môn' }, { value: 'pk', label: 'Đại Chiến' }] }],
};

describe('ô list: đổi thứ tự và tên mục', () => {
  it('kéo mục 0 xuống chỗ 2, mục giữa dồn lên; chỉ số sai thì giữ nguyên', () => {
    const v = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect((doiList(v, 0, 2) as { id: string }[]).map((m) => m.id)).toEqual(['b', 'c', 'a']);
    expect((doiList(v, 2, 0) as { id: string }[]).map((m) => m.id)).toEqual(['c', 'a', 'b']);
    expect((doiList(v, 0, 5) as { id: string }[]).map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(v.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('tên mục: ô ten nếu có, không thì nhãn của ô chọn đầu tiên', () => {
    expect(tenMucList(f, { id: 'x', viec: 'pk' }, 0)).toBe('Đại Chiến');
    expect(tenMucList(f, { id: 'x', ten: 'Mở màn', viec: 'pk' }, 0)).toBe('Mở màn');
    expect(tenMucList(f, { id: 'x' }, 2)).toBe('Sự kiện 3');
  });
});
