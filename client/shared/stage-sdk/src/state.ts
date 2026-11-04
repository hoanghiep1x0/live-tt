/** Trạng thái một sân khấu thấy được, và đường nối tới backend.
 *
 *  Thiết kế KHÔNG tự đọc WebSocket, không tự giữ cấu hình, không đọc
 *  localStorage. Nó nhận mọi thứ qua đây, nên đổi cấu hình giữa lúc đang live là
 *  vẽ lại — không tải lại trang, không mất khán giả.
 */

import { WS_PATH } from '@live/contracts';
import type { Down, Json, SessionView } from '@live/contracts';

export interface StageState {
  /** Thiết kế đang phát theo backend. Khác id của mình thì mình chỉ là bản xem trước. */
  live: string | null;
  session: SessionView;
  /** Module đang bật cho thiết kế này. */
  enabled: readonly string[];
  /** Cấu hình từng module, khoá là moduleId. */
  config: Readonly<Record<string, Json>>;
  noiDuoc: boolean;
}

/** Phiên rỗng. Nguồn sự kiện TikTok chưa dựng (docs/05-backend.md §0), nên đây
 *  là thứ sân khấu thấy khi chưa có ai trong phòng — và nó phải lên hình được. */
export const PHIEN_RONG: SessionView = {
  designId: null,
  startedAt: null,
  totals: { viewers: 0, likes: 0, gifts: 0, xu: 0, comments: 0 },
  topGivers: [],
  recentUsers: [],
  recentFeed: [],
};

export const BAN_DAU: StageState = {
  live: null,
  session: PHIEN_RONG,
  enabled: [],
  config: {},
  noiDuoc: false,
};

/** Áp một tin từ backend lên trạng thái. Hàm thuần nên test được không cần WebSocket. */
export function apTin(s: StageState, d: Down): StageState {
  switch (d.t) {
    case 'live':
      return { ...s, live: d.designId };
    case 'session':
      return { ...s, session: d.view };
    case 'modules':
      return { ...s, enabled: d.enabled };
    case 'config':
      return { ...s, config: { ...s.config, [d.moduleId]: d.config } };
    case 'feed': {
      // Giữ một đoạn ngắn: sân khấu chỉ cần vài mục gần nhất để vẽ, không phải
      // cả phiên. Phiên đầy đủ là việc của backend.
      const giu = [...s.session.recentFeed, ...d.items].slice(-60);
      return { ...s, session: { ...s.session, recentFeed: giu } };
    }
    case 'error':
      return s;
  }
}

const CHO_DAU = 500;
const CHO_TRAN = 10_000;

/** Nối WebSocket và gọi `nhan` mỗi lần trạng thái đổi. Trả về hàm đóng. */
export function connectStage(nhan: (s: StageState) => void): () => void {
  let s = BAN_DAU;
  let ws: WebSocket | null = null;
  let dong = false;
  let cho = CHO_DAU;
  let hen: ReturnType<typeof setTimeout> | undefined;

  const dat = (moi: StageState): void => {
    s = moi;
    nhan(s);
  };

  const mo = (): void => {
    const giaoThuc = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${giaoThuc}://${location.host}${WS_PATH}`);

    ws.onopen = () => {
      cho = CHO_DAU;
      dat({ ...s, noiDuoc: true });
    };
    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        dat(apTin(s, JSON.parse(e.data) as Down));
      } catch {
        // Tin lạ thì bỏ. Sân khấu đang live không được sập vì một tin hỏng.
      }
    };
    ws.onclose = () => {
      dat({ ...s, noiDuoc: false });
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
