import { describe, expect, it } from 'vitest';
import { docOThemTab, idTabMoi, nhanTab, nickTuLink, TRANG_CO_SAN } from '../../../client/manager/src/lib/trang-web';

describe('trình duyệt trong app desktop', () => {
  it('trang có sẵn có id riêng, gồm muse.ai để tạo ảnh', () => {
    const ids = TRANG_CO_SAN.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TRANG_CO_SAN.find((t) => t.id === 'muse')?.url).toBe('https://muse.ai/');
  });

  it('nhãn tab: trang có sẵn theo tên, tab thêm theo tiêu đề rồi tên miền', () => {
    expect(nhanTab({ id: 'tiktok', url: 'https://www.tiktok.com/x', title: 'abc' })).toBe('TikTok');
    expect(nhanTab({ id: 'xem-1', url: 'https://www.tiktok.com/@a', title: '' })).toBe('tiktok.com');
    expect(nhanTab({ id: 'xem-2', url: '', title: 'Trang chủ muse' })).toBe('Trang chủ muse');
  });

  it('id tab thêm hợp luật id của vỏ app', () => {
    expect(idTabMoi(1_793_932_000_123)).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('đọc được nick kênh trong link live, kể cả link chia sẻ có đuôi dài', () => {
    // Link TikTok gắn thêm lúc bấm "Sao chép liên kết" — bỏ đuôi đó đi thì
    // nút "Kết nối Studio" mới so được với kênh nguồn đang nối.
    expect(
      nickTuLink('https://www.tiktok.com/@yuki.54haji/live?enter_from_merge=share&enter_method=share_copy_link'),
    ).toBe('yuki.54haji');
    expect(nickTuLink('https://www.tiktok.com/@labeau_official/live')).toBe('labeau_official');
    expect(nickTuLink('@Yuki.54Haji')).toBe('yuki.54haji');
    expect(nickTuLink('https://livestudio.tiktok.com/')).toBeNull();
    expect(nickTuLink('')).toBeNull();
  });

  it('link live có đuôi chia sẻ vẫn mở được thành tab kênh', () => {
    const t = docOThemTab(
      'https://www.tiktok.com/@labeau_official/live?enter_from_merge=share&enter_method=share_copy_link',
      1_793_932_000_123,
    );
    expect(t).toEqual({ id: 'kenh-labeau-official', url: 'https://www.tiktok.com/@labeau_official/live' });
  });
});

describe('ô thêm tab', () => {
  it('nick kênh hay link trang live → tab trang live của kênh', () => {
    expect(docOThemTab('@abc.123', 1)).toEqual({ id: 'kenh-abc-123', url: 'https://www.tiktok.com/@abc.123/live' });
    expect(docOThemTab('https://www.tiktok.com/@abc123/live', 1)?.id).toBe('kenh-abc123');
  });

  it('link trang web bất kỳ → tab mới; nick có chấm vẫn là nick', () => {
    expect(docOThemTab('muse.ai', 5)?.url).toBe('https://muse.ai');
    expect(docOThemTab('https://www.tiktok.com/foryou', 5)?.id).toBe('xem-5');
    expect(docOThemTab('google.com', 5)).toEqual({ id: 'xem-5', url: 'https://google.com' });
    expect(docOThemTab('http://example.org/a?b=1', 5)?.url).toBe('http://example.org/a?b=1');
    expect(docOThemTab('www.abc.xyz', 5)?.url).toBe('https://www.abc.xyz');
    expect(docOThemTab('localhost:5173', 5)?.url).toBe('https://localhost:5173');
    expect(docOThemTab('linh.nguyen', 5)?.id).toBe('kenh-linh-nguyen');
  });

  it('không mở: trống, có khoảng trắng, lược đồ lạ', () => {
    expect(docOThemTab('  ', 5)).toBeNull();
    expect(docOThemTab('hai chữ', 5)).toBeNull();
    expect(docOThemTab('javascript:alert(1)', 5)).toBeNull();
    expect(docOThemTab('file:///C:/x', 5)).toBeNull();
  });
});
