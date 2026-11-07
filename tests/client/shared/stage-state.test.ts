import { describe, expect, it } from 'vitest';
import type { FeedItem, SessionView } from '@live/contracts';
import { apTin, BAN_DAU, PHIEN_RONG } from '../../../client/shared/stage-sdk/src/state';
import type { StageState } from '../../../client/shared/stage-sdk/src/state';

const phien = (designId: string): SessionView => ({ ...PHIEN_RONG, designId, startedAt: 1 });
const binhLuan: FeedItem = { id: 1, at: 1, kind: 'comment', name: 'An', text: 'chào' };

/** Trang xem thử của `minh`, trong lúc backend đang phát `live`. */
function trang(minh: string, live: string | null): StageState {
  return { ...BAN_DAU, cuaMinh: minh, live };
}

describe('trang xem thử chỉ nhận phiên của chính phòng mình', () => {
  it('phòng khác đang phát: không nhận phiên của nó', () => {
    const s = apTin(trang('ke-chuyen', 'san-bar-hop-dem'), {
      t: 'session',
      view: phien('san-bar-hop-dem'),
    });
    expect(s.session).toBe(PHIEN_RONG);
  });

  it('phòng khác đang phát: không nhận feed của nó', () => {
    const s = apTin(trang('ke-chuyen', 'san-bar-hop-dem'), { t: 'feed', items: [binhLuan] });
    expect(s.session.recentFeed).toEqual([]);
  });

  it('chính mình đang phát: nhận cả phiên lẫn feed', () => {
    let s = apTin(trang('ke-chuyen', 'ke-chuyen'), { t: 'session', view: phien('ke-chuyen') });
    s = apTin(s, { t: 'feed', items: [binhLuan] });
    expect(s.session.designId).toBe('ke-chuyen');
    expect(s.session.recentFeed).toHaveLength(1);
  });

  it('thôi phát phòng mình: phiên cũ bị bỏ', () => {
    const dang = apTin(trang('ke-chuyen', 'ke-chuyen'), { t: 'session', view: phien('ke-chuyen') });
    expect(apTin(dang, { t: 'live', designId: 'san-bar-hop-dem' }).session).toBe(PHIEN_RONG);
    expect(apTin(dang, { t: 'live', designId: null }).session).toBe(PHIEN_RONG);
  });

  it('phiên xem thử của chính mình (gắn designId) thì nhận, của phòng khác thì bỏ', () => {
    let s = apTin(trang('ke-chuyen', null), { t: 'session', view: phien('ke-chuyen'), designId: 'ke-chuyen' });
    s = apTin(s, { t: 'feed', items: [binhLuan], designId: 'ke-chuyen' });
    expect(s.session.recentFeed).toHaveLength(1);
    const khac = apTin(trang('ke-chuyen', null), { t: 'feed', items: [binhLuan], designId: 'san-bar-hop-dem' });
    expect(khac.session.recentFeed).toEqual([]);
  });

  it('trang quản lý (không phải thiết kế) vẫn nhận mọi phiên', () => {
    const s = apTin({ ...BAN_DAU, live: 'san-bar-hop-dem' }, { t: 'session', view: phien('san-bar-hop-dem') });
    expect(s.session.designId).toBe('san-bar-hop-dem');
  });
});

describe('sổ chi phí', () => {
  const so = (designId: string) => ({
    designId,
    batDau: 1,
    ketThuc: null,
    live: true,
    khoan: { mc: { lan: 2, tokVao: 100, tokRa: 20, kyTu: 0, usd: 0.001, chuaRo: 0 } },
    tongUsd: 0.001,
    chuaRo: 0,
    truyen: ['Cây vú sữa'],
  });

  it('phòng đang phát nhận sổ không gắn designId', () => {
    const s = apTin(trang('ke-chuyen', 'ke-chuyen'), { t: 'chi-phi', so: so('ke-chuyen') });
    expect(s.chiPhi?.tongUsd).toBe(0.001);
  });

  it('sổ của phòng khác thì không áp', () => {
    const s = apTin(trang('ke-chuyen', 'san-bar-hop-dem'), {
      t: 'chi-phi',
      so: so('san-bar-hop-dem'),
      designId: 'san-bar-hop-dem',
    });
    expect(s.chiPhi).toBeNull();
  });

  it('phòng xem thử nhận sổ gắn đúng designId của mình', () => {
    const s = apTin(trang('ke-chuyen', null), { t: 'chi-phi', so: so('ke-chuyen'), designId: 'ke-chuyen' });
    expect(s.chiPhi?.khoan['mc']?.lan).toBe(2);
  });
});

describe('tin backend gửi xuống mà sân khấu không cần', () => {
  it('tin nguồn sự kiện: giữ nguyên trạng thái', () => {
    const tin = { t: 'source', source: { kind: 'bridge', url: '', channel: 'a', nhip: 900, running: true } } as const;
    expect(apTin(BAN_DAU, tin)).toBe(BAN_DAU);
  });

  it('loại tin chưa có trong bản đã build: bỏ qua chứ không làm hỏng trạng thái', () => {
    const la = { t: 'tin-tuong-lai', x: 1 } as unknown as Parameters<typeof apTin>[1];
    expect(apTin(BAN_DAU, la)).toBe(BAN_DAU);
  });
});
