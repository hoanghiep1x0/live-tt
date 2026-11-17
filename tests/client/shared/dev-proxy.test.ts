import { describe, expect, it } from 'vitest';
import { DUONG_SAN_KHAU, laTrangCuaMinh } from '@live/dev-proxy';

describe('dev-proxy: đường /s của sân khấu', () => {
  const qua = (duong: string): boolean => new RegExp(DUONG_SAN_KHAU).test(duong);

  it('chuyển tiếp các đường /s để ngăn xem thử có dữ liệu thật', () => {
    expect(qua('/s/providers')).toBe(true);
    expect(qua('/s/thiet-ke/ke-chuyen/link')).toBe(true);
    expect(qua('/s/truyen-kho/ke-chuyen')).toBe(true);
    expect(qua('/s/tts-kho')).toBe(true);
  });

  it('không chuyển /s/tts: trang dev câm, không nói chồng phòng live', () => {
    expect(qua('/s/tts')).toBe(false);
    expect(qua('/s/tts?v=1')).toBe(false);
    expect(qua('/s/tts/abc')).toBe(false);
  });

  it('không đụng tới đường của chính trang', () => {
    expect(qua('/src/main.tsx')).toBe(false);
    expect(qua('/sound.mp3')).toBe(false);
  });
});

describe('dev-proxy: trang của chính dev server', () => {
  it('trang cùng cổng của dev server thì được đổi Origin', () => {
    expect(laTrangCuaMinh('http://localhost:5181', 'localhost:5181')).toBe(true);
    expect(laTrangCuaMinh('http://127.0.0.1:5173', '127.0.0.1:5173')).toBe(true);
  });

  it('trang web ngoài gọi vào thì giữ nguyên để backend chặn', () => {
    expect(laTrangCuaMinh('https://ke-gian.example', 'localhost:5181')).toBe(false);
    expect(laTrangCuaMinh('http://localhost:9999', 'localhost:5181')).toBe(false);
  });

  it('Host lạ trỏ về máy (DNS rebinding) thì không đổi', () => {
    expect(laTrangCuaMinh('http://ke-gian.example:5181', 'ke-gian.example:5181')).toBe(false);
  });
});
