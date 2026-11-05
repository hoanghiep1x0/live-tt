import { describe, expect, it } from 'vitest';
import { bamMon, boLenSong, docTuDo, khoaMon, locTuDo } from '@live/contracts';
import type { MonTuDo } from '@live/contracts';

const m = (o: string, id: string, che: string[]): MonTuDo => ({
  id,
  than: 'model-1',
  tuoi: 'nguoi-lon',
  nguon: 'mh',
  o,
  ten: id,
  che,
  duong: `tu-do/model-1/mh/${o}/${id}/`,
});
const AO = m('ao', 'ao-hai-day', ['nguc']);
const VAY = m('duoi', 'vay-ngan', []);
const SHORT = m('duoi', 'short', ['hang']);
const DAM = m('lien', 'dam', ['nguc']);
const LOT_DUOI = m('lot', 'quan-lot', ['hang']);
const LOT_TREN = m('lot', 'ao-lot', ['nguc']);
const TU = [AO, VAY, SHORT, DAM, LOT_DUOI, LOT_TREN];
const k = khoaMon;

describe('bấm món', () => {
  it('mặc, rồi bấm lại là cởi', () => {
    const a = bamMon(TU, [], k(AO));
    expect(a).toEqual([k(AO)]);
    expect(bamMon(TU, a, k(AO))).toEqual([]);
  });

  it('đầm thay cả áo lẫn quần; mặc áo thì cởi đầm', () => {
    const coDam = bamMon(TU, [k(AO), k(SHORT)], k(DAM));
    expect(coDam).toEqual([k(DAM)]);
    expect(bamMon(TU, coDam, k(AO))).toEqual([k(AO)]);
  });

  it('cùng ô chỉ một món: váy thay short', () => {
    expect(bamMon(TU, [k(AO), k(SHORT)], k(VAY))).toEqual([k(AO), k(VAY)]);
  });
});

describe('bộ lên sóng', () => {
  it('đủ che thì giữ nguyên', () => {
    expect(boLenSong(TU, [k(AO), k(SHORT)])?.map((x) => x.id)).toEqual(['ao-hai-day', 'short']);
  });

  it('váy, đầm hở đáy: tự mặc kèm quần lót', () => {
    expect(boLenSong(TU, [k(AO), k(VAY)])?.map((x) => x.id)).toEqual(['ao-hai-day', 'vay-ngan', 'quan-lot']);
    expect(boLenSong(TU, [k(DAM)])?.map((x) => x.id)).toEqual(['dam', 'quan-lot']);
  });

  it('chỉ mặc quần: tự thêm áo lót', () => {
    expect(boLenSong(TU, [k(SHORT)])?.map((x) => x.id)).toEqual(['short', 'ao-lot']);
  });

  it('tủ không có lót che được thì không cho mặc', () => {
    expect(boLenSong([AO, VAY], [k(AO), k(VAY)])).toBeNull();
  });

  it('không chọn gì, hoặc món đã bị xoá khỏi tủ: về bộ dựng sẵn', () => {
    expect(boLenSong(TU, [])).toEqual([]);
    expect(boLenSong(TU, ['model-1/mh/ao/da-xoa'])).toEqual([]);
  });
});

it('đọc danh mục bỏ mục sai dạng', () => {
  expect(docTuDo([AO, { id: 1 }, null, 'x'])).toEqual([AO]);
  expect(docTuDo('hỏng')).toEqual([]);
});

describe('lọc tủ theo thân và tuổi', () => {
  it('chỉ đồ đúng thân nhân vật', () => {
    const NAM = { ...AO, id: 'ao-nam', than: 'model-2' };
    expect(locTuDo([AO, NAM], 'model-1').map((x) => x.id)).toEqual(['ao-hai-day']);
  });

  it('đồ không phải người lớn, hoặc không khai tuổi, không bao giờ lọt vào', () => {
    const TRE = { ...AO, id: 'ao-tre', tuoi: 'tre-em' };
    const KHONG_KHAI: MonTuDo = { ...AO, id: 'ao-khong-khai' };
    delete (KHONG_KHAI as { tuoi?: string }).tuoi;
    expect(locTuDo([AO, TRE, KHONG_KHAI], 'model-1').map((x) => x.id)).toEqual(['ao-hai-day']);
  });

  it('khoá món có thân: cùng tên món ở hai thân là hai món', () => {
    expect(khoaMon(AO)).toBe('model-1/mh/ao/ao-hai-day');
    expect(khoaMon({ ...AO, than: 'model-2' })).not.toBe(khoaMon(AO));
  });
});
