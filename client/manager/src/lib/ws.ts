/** Nối bus phát xuống của backend.
 *
 *  Trang quản lý KHÔNG tự đoán trạng thái sau mỗi lần bấm: backend phát xuống
 *  thì cả trang này và thiết kế đang chạy cùng thấy một sự thật. Mở hai cửa sổ
 *  quản lý cũng không lệch nhau.
 */

import { WS_PATH } from '@live/contracts';
import type { Down } from '@live/contracts';

/** Chờ lâu hơn sau mỗi lần nối lại thất bại, trần 10 giây — backend có thể
 *  đang biên dịch lại, không nên gõ cửa 2 lần/giây suốt lúc đó. */
const CHO_DAU = 500;
const CHO_TRAN = 10_000;

export interface WsCallbacks {
  tin(d: Down): void;
  /** `true` khi đang nối được. Dùng để hiện trạng thái trên thanh trên. */
  trangThai(noiDuoc: boolean): void;
}

export function connect(cb: WsCallbacks): () => void {
  let ws: WebSocket | null = null;
  let dong = false;
  let cho = CHO_DAU;
  let hen: ReturnType<typeof setTimeout> | undefined;

  const mo = (): void => {
    const giaoThuc = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${giaoThuc}://${location.host}${WS_PATH}`);

    ws.onopen = () => {
      cho = CHO_DAU;
      cb.trangThai(true);
    };
    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        cb.tin(JSON.parse(e.data) as Down);
      } catch {
        // Tin lạ thì bỏ qua, không làm sập trang quản lý.
      }
    };
    ws.onclose = () => {
      cb.trangThai(false);
      if (dong) return;
      hen = setTimeout(mo, cho);
      cho = Math.min(cho * 2, CHO_TRAN);
    };
    ws.onerror = () => ws?.close();
  };

  mo();

  return () => {
    dong = true;
    if (hen !== undefined) clearTimeout(hen);
    ws?.close();
  };
}
