import { describe, expect, it } from 'vitest';
import { buocToast } from '../../../../client/designs/dai-chien-thap-den/src/toast-ket-noi';

const offline = { channel: 'yuki', running: false, problem: 'Kênh chưa phát live — tự thử lại mỗi phút' };
const dangNoi = { channel: 'yuki', running: false, problem: 'Đang nối tới phòng live…' };
const song = { channel: 'yuki', running: true, problem: null };

describe('toast kết nối', () => {
  it('trạng thái đầu tiên khi mở trang thì không báo', () => {
    expect(buocToast(null, song, false)).toBeUndefined();
  });

  it('nối được thì báo thành công, kể cả khi tự thử lại', () => {
    expect(buocToast(offline, song, false)).toMatchObject({ loai: 'xong', tieuDe: 'Đã kết nối @yuki' });
    expect(buocToast(dangNoi, song, true)?.loai).toBe('xong');
  });

  it('vừa bấm thì báo đang nối, tự thử lại thì im', () => {
    expect(buocToast(offline, dangNoi, true)?.loai).toBe('cho');
    expect(buocToast(offline, dangNoi, false)).toBeUndefined();
  });

  it('cầu nối đang khởi động lại chưa tính là lỗi', () => {
    const cau = { channel: 'yuki', problem: 'Chưa nối được cầu nối TikTok (ws://x) — đang thử lại' };
    expect(buocToast(song, cau, true)?.loai).toBe('cho');
  });

  it('bấm mà kênh chưa live thì báo rõ lý do', () => {
    expect(buocToast(dangNoi, offline, true)).toMatchObject({
      loai: 'loi',
      tieuDe: 'Chưa nối được @yuki',
      chu: offline.problem,
    });
    expect(buocToast(dangNoi, offline, false)).toBeUndefined();
  });

  it('đang chạy bình thường thì không báo lại', () => {
    expect(buocToast(song, song, false)).toBeUndefined();
  });
});
