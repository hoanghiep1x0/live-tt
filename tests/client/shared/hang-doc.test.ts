import { describe, expect, it } from 'vitest';
import {
  CU_MS,
  MAX_HANG,
  MAX_KHACH,
  NGHI_SAU_TRUYEN_MS,
  NGHI_TRUOC_TRUYEN_MS,
  canBo,
  choChen,
  nghiTruoc,
  quaCu,
} from '../../../client/shared/stage-sdk/src/hang-doc';
import type { MucHang } from '../../../client/shared/stage-sdk/src/hang-doc';

const m = (muc: MucHang['muc'], luc = 0): MucHang => ({ muc, luc });

describe('hàng đọc — mạch truyện đi trước', () => {
  it('lời kể chen trước mọi câu chào, giữ thứ tự giữa các lời kể', () => {
    const ds = [m('truyen'), m('cao'), m('thuong'), m('thuong')];
    expect(choChen(ds, 'truyen')).toBe(1);
    expect(choChen(ds, 'cao')).toBe(2);
    expect(choChen(ds, 'thuong')).toBe(4);
    expect(choChen([], 'truyen')).toBe(0);
  });

  it('câu chào chờ lâu thì bỏ, lời kể không bao giờ bỏ', () => {
    expect(quaCu(m('thuong', 0), CU_MS + 1)).toBe(true);
    expect(quaCu(m('truyen', 0), CU_MS * 10)).toBe(false);
    const day = [m('truyen'), ...Array.from({ length: MAX_HANG }, () => m('thuong'))];
    expect(canBo(day)).toBe(1);
    expect(canBo(Array.from({ length: MAX_HANG + 2 }, () => m('truyen')))).toBe(-1);
  });

  it('nghỉ một nhịp giữa lời kể và câu nói khác, cả hai chiều', () => {
    expect(nghiTruoc('truyen', 'thuong')).toBe(NGHI_SAU_TRUYEN_MS);
    expect(nghiTruoc('truyen', 'khach')).toBe(NGHI_SAU_TRUYEN_MS);
    expect(nghiTruoc('truyen', 'truyen')).toBe(0);
    expect(nghiTruoc('khach', 'truyen')).toBe(NGHI_TRUOC_TRUYEN_MS);
    expect(nghiTruoc(null, 'truyen')).toBe(0);
  });
});

describe('hàng đọc — câu với khách chen vào khoảng nghỉ, không đọc chồng', () => {
  it('câu với khách đứng trước các đoạn kể còn chờ, sau câu khách trước đó', () => {
    // Đang chờ: hai đoạn kể, một câu chào thường.
    const ds = [m('truyen'), m('truyen'), m('thuong')];
    expect(choChen(ds, 'khach')).toBe(0);
    expect(choChen([m('khach'), m('truyen')], 'khach')).toBe(1);
    // Lời kể mới vẫn xếp sau câu khách đang chờ — khách được gọi trước.
    expect(choChen([m('khach'), m('truyen')], 'truyen')).toBe(2);
  });

  it(`tối đa ${MAX_KHACH} câu khách chen giữa hai đoạn: thừa thì bỏ câu cũ nhất`, () => {
    const ds = [m('khach', 1), m('khach', 2), m('khach', 3), m('truyen')];
    expect(canBo(ds)).toBe(0);
    expect(canBo([m('khach'), m('khach'), m('truyen')])).toBe(-1);
  });

  it('câu khách chờ lâu cũng bỏ như câu chào', () => {
    expect(quaCu(m('khach', 0), CU_MS + 1)).toBe(true);
    expect(quaCu(m('khach', 0), CU_MS - 1)).toBe(false);
  });
});
