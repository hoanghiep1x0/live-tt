/** Gọi REST của backend.
 *
 *  Luôn dùng đường tương đối `/api/…`. Token không nằm ở đây: lúc phát triển
 *  thì dev server gắn header (xem vite.config.ts), bản đóng gói thì vỏ Tauri
 *  gắn. Nhờ vậy khoá không bao giờ lọt vào bundle của trang.
 */

import type { DesignInfo, Json, SessionView } from '@live/contracts';

export interface ModuleState {
  enabled: boolean;
  config: Record<string, Json>;
}

export interface DesignList {
  designs: DesignInfo[];
  live: string | null;
}

export type SourceKind = 'tat' | 'mau' | 'bridge';

export interface SourceStatus {
  kind: SourceKind;
  url: string;
  channel: string;
  nhip: number;
  running: boolean;
  problem?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Thiết kế đang phát, có ở lỗi 409 — để nói đúng tên phòng phải tắt. */
    readonly live: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('không nối được máy chủ — backend chưa chạy?', 0);
  }

  const than: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const o = (than ?? {}) as { error?: unknown; live?: unknown };
    const loi = typeof o.error === 'string' ? o.error : `máy chủ trả lỗi ${res.status}`;
    throw new ApiError(loi, res.status, typeof o.live === 'string' ? o.live : null);
  }
  return than as T;
}

export const api = {
  info: () => call<{ port: number; version: string }>('/info'),

  designs: () => call<DesignList>('/designs'),

  goLive: (designId: string) => call<{ live: string | null }>('/live', 'POST', { designId }),

  stopLive: () => call<{ live: string | null }>('/live', 'DELETE'),

  /** Đổi tên hiện trên thẻ, hoặc link Studio. `null` là xoá. */
  settings: (designId: string, patch: { name?: string | null; studioUrl?: string | null }) =>
    call<{ settings: { name?: string; studioUrl?: string } }>(
      `/designs/${designId}/settings`,
      'PUT',
      patch,
    ),

  /** Xoá dữ liệu phiên. Trả về đúng những file đã xoá. */
  reset: (designId: string) => call<{ cleared: string[] }>(`/designs/${designId}/reset`, 'POST'),

  session: () => call<{ session: SessionView | null }>('/session'),

  source: () => call<{ source: SourceStatus }>('/source'),

  setSource: (cfg: { kind: SourceKind; url?: string; channel?: string; nhip?: number }) =>
    call<{ source: SourceStatus }>('/source', 'PUT', cfg),

  modules: (designId: string) =>
    call<{ modules: Record<string, ModuleState> }>(`/designs/${designId}/modules`),

  setConfig: (designId: string, moduleId: string, config: Record<string, Json>) =>
    call<ModuleState>(`/designs/${designId}/modules/${moduleId}/config`, 'PUT', config),

  setEnabled: (designId: string, moduleId: string, on: boolean) =>
    call<{ enabled: boolean }>(`/designs/${designId}/modules/${moduleId}/enabled`, 'POST', { on }),
};
