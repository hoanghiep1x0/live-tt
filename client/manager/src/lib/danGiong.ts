import { useEffect, useState } from 'react';
import type { GiongTrongDan } from '@live/contracts';
import { api } from './api';

/** Dàn giọng của phòng, đọc một lần cho cả trang. Ô `voice` của module nào cũng
 *  cần danh sách này, mà gọi API mỗi ô một lần thì phí. */
let dang: Promise<GiongTrongDan[]> | null = null;

function docDan(): Promise<GiongTrongDan[]> {
  dang ??= api
    .voice()
    .then((r) => r.voice.cast.map((g) => ({ id: g.id, role: g.role })))
    .catch(() => {
      dang = null;
      return [];
    });
  return dang;
}

/** Đọc lại lần sau: gọi khi hộp thoại Giọng đọc vừa lưu dàn mới. */
export function quenDanGiong(): void {
  dang = null;
}

export function useDanGiong(can: boolean): GiongTrongDan[] {
  const [ds, setDs] = useState<GiongTrongDan[]>([]);
  useEffect(() => {
    if (!can) return;
    let con = true;
    void docDan().then((x) => {
      if (con) setDs(x);
    });
    return () => {
      con = false;
    };
  }, [can]);
  return ds;
}
