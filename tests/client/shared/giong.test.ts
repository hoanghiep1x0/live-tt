import { describe, expect, it } from 'vitest';
import { GIONG_XOAY, giongXoay, boVai, chuNguon, ganGiong, giongQua, khoaGiong, loiGiong, nguonGiong, oChonGiong, tachVai, TAB_GIONG } from '@live/contracts';
import type { ConfigField, Effect, KetNoiAi } from '@live/contracts';
import { moduleGiftThanks } from '@live/mod-gift-thanks';
import { moduleLikesCounter } from '@live/mod-likes-counter';
import { moduleStory } from '@live/mod-story';
import { moduleTopGivers } from '@live/mod-top-givers';
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
    expect(f.options?.map((o) => o.value)).toEqual(['', GIONG_XOAY, 'mc', 'be']);
    expect(f.options?.[2]?.label).toBe('Người dẫn (mc)');
    expect(f.options?.[3]?.label).toBe('be');
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

describe('nguồn giọng', () => {
  const KHO: KetNoiAi[] = [
    { id: '9router', kind: 'openai', baseUrl: 'http://localhost:20128/v1', uses: ['tts'], models: { tts: 'google-tts/vi' }, hasKey: true },
    { id: 'eleven', name: 'Eleven', kind: 'elevenlabs', uses: ['tts'], models: {}, hasKey: true },
    { id: 'tu-cam', kind: 'openai', baseUrl: 'https://x.y/v1', uses: ['tts'], models: {}, hasKey: true },
  ];
  const g = (provider: string, voice: string) => ({ id: 'mc', role: 'MC', provider, voice });

  it('9router chỉ là bộ chuyển: tên giọng mới nói ai đọc', () => {
    expect(chuNguon(nguonGiong(g('9router', 'edge-tts/vi-VN-HoaiMyNeural'), KHO))).toBe(
      'Microsoft Edge · miễn phí · qua 9router',
    );
    expect(nguonGiong(g('9router', ''), KHO)?.dichVu).toBe('Google Dịch');
  });

  it('ElevenLabs là trả phí, kết nối tự cắm thì chưa rõ', () => {
    expect(chuNguon(nguonGiong(g('eleven', 'abc123'), KHO))).toBe('ElevenLabs · trả phí · qua Eleven');
    expect(nguonGiong(g('tu-cam', 'x'), KHO)?.mienPhi).toBeNull();
    expect(chuNguon(nguonGiong(g('mat', 'x'), KHO))).toBe('chưa có kết nối');
  });

  it('kết nối biết mình đang đọc cho vai nào', () => {
    const cast = [g('9router', ''), { id: 'be', role: '', provider: '9router', voice: '' }, g('eleven', '')];
    expect(giongQua(cast, '9router')).toEqual(['MC', 'be']);
  });
});

describe('tự đổi giọng', () => {
  it('không lặp liền một giọng, quay khắp dàn', () => {
    let truoc = '';
    const gap = new Set<string>();
    let r = 0;
    for (let i = 0; i < 30; i += 1) {
      r = (r + 0.37) % 1;
      const g = giongXoay(['mc', 'be-gai', 'nam-minh'], truoc, () => r);
      expect(g).not.toBe(truoc);
      gap.add(g);
      truoc = g;
    }
    expect(gap.size).toBe(3);
  });

  it('dàn một giọng thì cứ giọng đó; dàn rỗng thì giọng mặc định', () => {
    expect(giongXoay(['mc'], 'mc', () => 0.5)).toBe('mc');
    expect(giongXoay([], '', () => 0.5)).toBe('');
  });

  it('ô chọn giọng có lựa chọn tự đổi, không bị coi là giọng đã gỡ', () => {
    const f = oChonGiong(O_GIONG, DAN, GIONG_XOAY);
    expect(f.options?.map((o) => o.value)).toEqual(['', GIONG_XOAY, 'mc', 'be']);
  });
});

describe('xungMinh — MC tự xưng "mình"', () => {
  it('đổi chữ MC đứng riêng, đầu câu viết hoa', async () => {
    const { xungMinh } = await import('@live/contracts');
    expect(xungMinh('MC kể thêm chuyện Sự tích trầu cau nha cả nhà, nghe kỹ nha!')).toBe(
      'Mình kể thêm chuyện Sự tích trầu cau nha cả nhà, nghe kỹ nha!',
    );
    expect(xungMinh('Ui, Lan tặng hoa cho MC nè. MC thương bạn ghê ❤')).toBe(
      'Ui, Lan tặng hoa cho mình nè. Mình thương bạn ghê ❤',
    );
    expect(xungMinh('MCX và DMC không đổi')).toBe('MCX và DMC không đổi');
  });
});

describe('hienO — ô chỉ hiện khi có tác dụng', () => {
  it('khớp một trong các điều kiện', async () => {
    const { hienO } = await import('@live/contracts');
    const loop = { hienKhi: [{ cachKe: ['tu-doc'] }, { tuChuyen: [false] }] };
    expect(hienO(loop, { cachKe: 'mc-tiet-kiem', tuChuyen: true })).toBe(false);
    expect(hienO(loop, { cachKe: 'tu-doc', tuChuyen: true })).toBe(true);
    expect(hienO(loop, { cachKe: 'mc-tiet-kiem', tuChuyen: false })).toBe(true);
    expect(hienO({}, {})).toBe(true);
    // Mọi khoá trong một điều kiện đều phải khớp.
    expect(hienO({ hienKhi: [{ a: [1], b: [2] }] }, { a: 1, b: 3 })).toBe(false);
  });
});

describe('giọng cho một việc ("Ai đọc gì")', () => {
  it('chưa giao giọng thì rỗng; nhiều giọng thì thay phiên, không lặp liền', async () => {
    const { giongChoViec } = await import('../../../client/shared/stage-sdk/src/state');
    expect(giongChoViec([], 'a', () => 0)).toBe('');
    expect(giongChoViec(undefined, '', () => 0)).toBe('');
    expect(giongChoViec(['a'], 'a', () => 0)).toBe('a');
    expect(giongChoViec(['a', 'b'], 'a', () => 0)).toBe('b');
  });
});
