/** Nối dev server của Vite tới backend nội bộ.
 *
 *  Backend ghi `.tmp/agent-port.json` khi mở (docs/05-backend.md §2). File này
 *  đọc lại để biết cổng và token, rồi tự gắn header `Authorization` cho `/api`.
 *  Nhờ vậy **token không bao giờ nằm trong mã trang hay trong bundle** — trang
 *  chỉ gọi đường tương đối, việc giữ khoá là của dev server và của vỏ Tauri.
 *
 *  Dùng chung cho trang quản lý và mọi thiết kế: mỗi thiết kế mới chỉ cần một
 *  dòng trong `vite.config.ts`, không chép lại đoạn này.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProxyOptions } from 'vite';

export const CONG_MAC_DINH = 47830;

export interface CongBao {
  port: number;
  token: string;
}

export function docCong(goc: string): CongBao | null {
  try {
    const v = JSON.parse(
      readFileSync(resolve(goc, '.tmp', 'agent-port.json'), 'utf8'),
    ) as Partial<CongBao>;
    if (typeof v.port === 'number' && typeof v.token === 'string') {
      return { port: v.port, token: v.token };
    }
  } catch {
    // Backend chưa chạy — không phải lỗi, chỉ là chưa có gì để đọc.
  }
  return null;
}

/** Cấu hình `server.proxy` cho Vite. `goc` là thư mục gốc dự án. */
export function proxyBackend(goc: string): Record<string, ProxyOptions> {
  const dau = docCong(goc);
  if (dau === null) {
    console.warn(
      '[dev] chưa thấy .tmp/agent-port.json\n' +
        '      Mở backend trước: cd backend && cargo run\n' +
        '      Rồi khởi động lại dev server để nó biết cổng.',
    );
  }
  const cong = dau?.port ?? CONG_MAC_DINH;
  const dich = `http://127.0.0.1:${cong}`;
  // Backend chặn `Host` lạ để chống DNS rebinding (backend/src/guard.rs), nên
  // proxy phải gửi đúng host của backend. Đặt thẳng thay vì trông vào
  // `changeOrigin`: với WebSocket upgrade, Vite không viết lại Host, và hậu quả
  // là REST chạy còn bus im lặng — kiểu lỗi mất cả buổi mới tìm ra.
  const may = { host: `127.0.0.1:${cong}` };

  // `Origin` vẫn là của dev server và nằm trong whitelist của backend, nên vẫn
  // phân biệt được "trang quản lý gọi vào" với "một trang web ngoài gọi vào".
  const giuToken: ProxyOptions = {
    target: dich,
    changeOrigin: true,
    headers: may,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        // Đọc lại mỗi lần: backend mở lại là token mới, không bắt người dùng
        // khởi động lại dev server chỉ vì chuyện đó.
        const t = docCong(goc)?.token;
        if (t !== undefined) proxyReq.setHeader('authorization', `Bearer ${t}`);
      });
    },
  };

  return {
    '/api': giuToken,
    // Assets của thiết kế và của module: backend phục vụ, không cần token.
    '/a': { target: dich, changeOrigin: true, headers: may },
    '/m': { target: dich, changeOrigin: true, headers: may },
    '/ws': { target: dich, ws: true, changeOrigin: true, headers: may },
  };
}
