import { describe, expect, it } from 'vitest';
import { boVai, ganGiong, khoaGiong, loiGiong, oChonGiong, tachVai, TAB_GIONG } from '@live/contracts';
import type { ConfigField, Effect, KetNoiAi } from '@live/contracts';
import { moduleGiftThanks } from '@live/mod-gift-thanks';
import { moduleLikesCounter } from '@live/mod-likes-counter';
import { moduleStory } from '@live/mod-story';
import { moduleTopGivers } from '@live/mod-top-givers';
import { moduleWelcome } from '@live/mod-welcome';
import { moduleFollowThanks } from '@live/mod-follow-thanks';

const O_GIONG: ConfigField = { key: 'voiceId', label: 'Giọng', type: 'voice', tab: TAB_GIONG };
const DAN = [
  { id: 'mc', role: 'Người dẫn' },
  { id: 'be', role: '' },
];

describe('ô chọn giọng', () => {
  it('đổ dàn giọng thành ô chọn, giọng mặc định đứng đầu', () => {
    const f = oChonGiong(O_GIONG, DAN, '');
    expect(f.type).toBe('select');
    expect(f.options?.map((o) => o.value)).toEqual(['', 'mc', 'be']);
    expect(f.options?.[1]?.label).toBe('Người dẫn (mc)');
    expect(f.options?.[2]?.label).toBe('be');
  });

  it('giọng đã gỡ khỏi dàn vẫn hiện, ghi rõ', () => {
    const f = oChonGiong(O_GIONG, DAN, 'cu');
    expect(f.options?.at(-1)).toEqual({ value: 'cu', label: 'cu (không còn trong dàn)' });
  });

  it('ô khác giữ nguyên', () => {
    const o: ConfigField = { key: 'x', label: 'X', type: 'text' };
    expect(oChonGiong(o, DAN, '')).toBe(o);
  });
});

describe('gắn giọng vào câu đọc', () => {
  const ra: Effect[] = [
    { kind: 'say', text: 'a' },
    { kind: 'say', text: 'b', voice: 'rieng' },
    { kind: 'sfx', sound: 'gift' },
  ];

  it('chỉ gắn vào câu chưa tự chọn giọng', () => {
    expect(ganGiong(ra, 'mc')).toEqual([
      { kind: 'say', text: 'a', voice: 'mc' },
      { kind: 'say', text: 'b', voice: 'rieng' },
      { kind: 'sfx', sound: 'gift' },
    ]);
  });

  it('chưa chọn giọng thì để nguyên', () => {
    expect(ganGiong(ra, '')).toBe(ra);
    expect(ganGiong(ra, undefined)).toBe(ra);
  });
});

describe('tính năng biết đọc to', () => {
  const doc = [
    moduleWelcome,
    moduleFollowThanks,
    moduleGiftThanks,
    moduleStory,
    moduleTopGivers,
    moduleLikesCounter,
  ];

  it.each(doc.map((m) => [m.manifest.id, m] as const))(
    '%s có tab Giọng đọc với ô chọn giọng và công tắc đọc to',
    (_id, m) => {
      const f = m.manifest.fields;
      expect(khoaGiong(f)).toBe('voiceId');
      const tab = f.filter((o) => o.tab === TAB_GIONG);
      expect(tab.some((o) => o.type === 'toggle')).toBe(true);
      expect((m.manifest.schema.parse({}) as Record<string, unknown>).voiceId).toBe('');
    },
  );
});

describe('đọc theo vai', () => {
  const cau = 'Ông lão gọi: [ong-lao] Con ơi về đi! [-] Cô bé chạy về. [be-gai] Dạ con về!';

  it('đa giọng: mỗi dấu đổi giọng, [-] về giọng chính', () => {
    expect(tachVai(cau, 'mc', true)).toEqual([
      { text: 'Ông lão gọi:', voice: 'mc' },
      { text: 'Con ơi về đi!', voice: 'ong-lao' },
      { text: 'Cô bé chạy về.', voice: 'mc' },
      { text: 'Dạ con về!', voice: 'be-gai' },
    ]);
  });

  it('đơn giọng: một đoạn, giọng mặc định, không lộ dấu', () => {
    expect(tachVai(cau, 'mc', false)).toEqual([
      { text: 'Ông lão gọi: Con ơi về đi! Cô bé chạy về. Dạ con về!', voice: '' },
    ]);
  });

  it('câu không dấu vai: một đoạn giọng chính', () => {
    expect(tachVai('Chào cả nhà', 'mc', true)).toEqual([{ text: 'Chào cả nhà', voice: 'mc' }]);
  });

  it('dấu liền nhau cùng giọng thì gộp, dấu thừa ở cuối không sinh đoạn rỗng', () => {
    expect(tachVai('[be-gai] A [be-gai] B [-]', '', true)).toEqual([
      { text: 'A B', voice: 'be-gai' },
    ]);
  });

  it('phụ đề bỏ dấu vai', () => {
    expect(boVai(cau)).toBe('Ông lão gọi: Con ơi về đi! Cô bé chạy về. Dạ con về!');
  });
});

describe('dàn giọng đọc được chưa, theo kho Kết nối AI', () => {
  const kho: KetNoiAi[] = [
    { id: '9router', kind: 'openai', uses: ['tts'], models: {}, hasKey: true },
    { id: 'eleven', kind: 'elevenlabs', uses: ['tts'], models: { tts: 'eleven_v2' }, hasKey: false },
    { id: 'claude', kind: 'anthropic', uses: ['chat'], models: {}, hasKey: true },
  ];
  const g = (provider: string, voice = '') => ({ id: 'mc', role: '', provider, voice });

  it('đủ kết nối, khoá và tên giọng thì đọc được', () => {
    expect(loiGiong(g('9router', 'edge-tts/vi-VN-HoaiMyNeural'), kho)).toBeNull();
  });

  it('nói rõ thiếu gì', () => {
    expect(loiGiong(g(''), kho)).toMatch(/chưa chọn kết nối/);
    expect(loiGiong(g('khong-co'), kho)).toMatch(/không còn trong kho/);
    expect(loiGiong(g('claude'), kho)).toMatch(/Giọng đọc/);
    expect(loiGiong(g('eleven', 'x'), kho)).toMatch(/thiếu khoá/);
    expect(loiGiong(g('9router'), kho), 'trống tên giọng mà kết nối cũng không có model').toMatch(/tên giọng/);
  });
});
