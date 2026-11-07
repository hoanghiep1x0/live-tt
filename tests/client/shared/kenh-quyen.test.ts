import { describe, expect, it } from 'vitest';
import { datGuiQuyen, guiQuyen, ngheQuyen, nhanQuyen } from '../../../client/shared/stage-sdk/src/kenh-quyen';
import { QuyenNoi } from '../../../client/shared/stage-sdk/src/quyen-noi';

describe('kênh quyền nói qua máy chủ', () => {
  it('chưa nối máy chủ thì gửi là thôi, nối rồi thì gửi đi', () => {
    datGuiQuyen(null);
    expect(() => guiQuyen({ t: 'toi' })).not.toThrow();
    const di: unknown[] = [];
    datGuiQuyen((t) => di.push(t));
    guiQuyen({ t: 'toi', id: 'a' });
    expect(di).toEqual([{ t: 'toi', id: 'a' }]);
    datGuiQuyen(null);
  });

  it('hai cửa sổ ở hai trình duyệt chỉ còn MỘT cửa sổ được nói khi bàn qua máy chủ', () => {
    // Mỗi "trình duyệt" một kênh riêng, chỉ nối nhau qua máy chủ chuyển tin.
    const nghe: Record<string, (t: unknown) => void> = {};
    const may = (tu: string) => ({
      postMessage: (t: unknown) => Object.entries(nghe).forEach(([k, f]) => k !== tu && f(t)),
      nghe: (f: (t: unknown) => void) => {
        nghe[tu] = f;
      },
    });
    let gio = 1_000;
    const hen = () => () => {};
    const a = new QuyenNoi(may('a'), 'a', false, () => {}, hen, () => gio);
    a.gianh();
    gio += 10;
    const b = new QuyenNoi(may('b'), 'b', false, () => {}, hen, () => gio);
    b.gianh();
    expect([a.duocNoi(), b.duocNoi()]).toEqual([false, true]);
  });

  it('tin máy chủ chuyển xuống tới mọi người nghe', () => {
    const toi: unknown[] = [];
    ngheQuyen((t) => toi.push(t));
    nhanQuyen({ t: 'roi', id: 'x' });
    expect(toi).toContainEqual({ t: 'roi', id: 'x' });
  });
});
