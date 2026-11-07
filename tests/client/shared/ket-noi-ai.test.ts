import { describe, expect, it } from 'vitest';
import {
  batViec,
  chonMau,
  doiKieu,
  loiNhap,
  mauCua,
  nanId,
  nhapMoi,
  tenProvider,
  thanGhi,
} from '@live/contracts';
import type { KetNoiAi } from '@live/contracts';

const KHO: KetNoiAi[] = [
  {
    id: 'mc',
    name: 'MC',
    kind: 'anthropic',
    baseUrl: '',
    uses: ['chat'],
    models: { chat: 'claude-sonnet-5-5' },
    hasKey: true,
  },
  {
    id: '9router',
    kind: 'openai',
    baseUrl: 'http://localhost:20128/v1',
    uses: ['tts'],
    models: { tts: 'google-tts/vi' },
    hasKey: true,
  },
];

describe('kho kết nối AI dùng chung', () => {
  it('nắn tên giống backend: chữ thường, bỏ dấu, gạch nối', () => {
    expect(nanId('MC')).toBe('mc');
    expect(nanId('  Giọng Bắc_đẹp! ')).toBe('giong-bac-dep');
    expect(nanId('!')).toBe('');
  });

  it('tạo mới trùng tên (sau khi nắn) thì báo, sửa chính nó thì không', () => {
    const n = { ...nhapMoi(), name: 'mc', uses: ['chat' as const] };
    expect(loiNhap(n, KHO, null)).toContain('Đã có kết nối “MC”');
    expect(loiNhap(n, KHO, 'mc')).toBeNull();
  });

  it('chọn mẫu điền giao thức, địa chỉ, việc và model; tên chỉ điền khi trống', () => {
    const n = chonMau(nhapMoi(), 'elevenlabs');
    expect(n.kind).toBe('elevenlabs');
    expect(n.name).toBe('eleven');
    expect(n.uses).toEqual(['tts']);
    expect(chonMau({ ...nhapMoi(), name: 'Giọng EL' }, 'elevenlabs').name).toBe('Giọng EL');
  });

  it('việc giao thức không làm được thì không bật, đổi giao thức thì gỡ', () => {
    const n = chonMau(nhapMoi(), 'anthropic');
    expect(batViec(n, 'tts', true).uses).toEqual(['chat']);
    const o = batViec(doiKieu(n, 'openai'), 'tts', true);
    expect(o.uses).toEqual(['chat', 'tts']);
    expect(doiKieu(o, 'elevenlabs').uses).toEqual(['tts']);
  });

  it('thân ghi chỉ gửi model của việc đang bật, kèm tên hiển thị', () => {
    const n = { ...chonMau(nhapMoi(), 'openai'), name: ' OpenAI chính ' };
    const t = thanGhi(batViec(n, 'image', false));
    expect(t['name']).toBe('OpenAI chính');
    expect(t['uses']).toEqual(['chat', 'tts']);
    expect(t['models']).toEqual({ chat: 'gpt-4o-mini', tts: 'gpt-4o-mini-tts' });
  });

  it('nhận ra mẫu của kết nối cũ theo địa chỉ, đặt tên gì cũng được', () => {
    expect(mauCua({ id: 'giong-may', kind: 'openai', baseUrl: 'http://localhost:20128/v1/' }).ma).toBe(
      '9router',
    );
    expect(tenProvider({ id: 'la', kind: 'openai', baseUrl: 'https://x.y/v1' })).toBe('Kiểu OpenAI');
  });
});

describe('moTaKetNoi — ghi rõ AI nào đang làm', () => {
  it('tên · nơi gọi · model của đúng việc', async () => {
    const { moTaKetNoi } = await import('@live/contracts');
    expect(
      moTaKetNoi(
        { id: 'tao-anh', name: 'Tạo Ảnh', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: { image: 'google/gemini-2.5-flash-image' } },
        'image',
      ),
    ).toBe('Tạo Ảnh · openrouter.ai · google/gemini-2.5-flash-image');
  });
  it('thiếu địa chỉ, thiếu model thì nói rõ', async () => {
    const { moTaKetNoi } = await import('@live/contracts');
    expect(moTaKetNoi({ id: 'x', kind: 'openai', models: {} }, 'image')).toBe('x · openai · model mặc định');
  });
});
