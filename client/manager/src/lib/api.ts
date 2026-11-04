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

export type ProviderKind = 'openai' | 'elevenlabs' | 'anthropic';

export interface ProviderInfo {
  id: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  /** Có khoá hay chưa. Giá trị khoá không bao giờ ra khỏi backend. */
  hasKey: boolean;
}

/** Một nhân vật trong dàn giọng. Một phiên có nhiều nhân vật, mỗi người một giọng. */
export interface CastVoice {
  id: string;
  provider: string;
  voice: string;
  role: string;
}

export interface VoiceCfg {
  enabled: boolean;
  speed: number;
  volume: number;
  /** Id giọng dùng khi câu không nói rõ đọc bằng giọng nào. */
  default: string;
  cast: CastVoice[];
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

/** Nghe thử: trả về chính bytes mp3, không phải JSON. */
export async function ttsThu(req: {
  provider: string;
  voice: string;
  text: string;
  speed?: number;
}): Promise<Blob> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const j: unknown = await res.json().catch(() => null);
    const o = (j ?? {}) as { error?: string };
    throw new ApiError(o.error ?? `máy chủ trả lỗi ${res.status}`, res.status);
  }
  return res.blob();
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

  secrets: () => call<{ providers: ProviderInfo[] }>('/secrets'),

  /** Khoá rỗng nghĩa là giữ khoá cũ — trang quản lý không đọc được khoá nên
   *  không gửi lại được, mà vẫn phải sửa được địa chỉ và model. */
  setSecret: (
    id: string,
    v: { kind: ProviderKind; baseUrl?: string; key?: string; model?: string },
  ) => call<{ provider: ProviderInfo }>(`/secrets/${id}`, 'PUT', v),

  delSecret: (id: string) => call<{ removed: string }>(`/secrets/${id}`, 'DELETE'),

  voice: () => call<{ voice: VoiceCfg }>('/voice'),

  setVoice: (cfg: VoiceCfg) => call<{ voice: VoiceCfg }>('/voice', 'PUT', cfg),

  modules: (designId: string) =>
    call<{ modules: Record<string, ModuleState> }>(`/designs/${designId}/modules`),

  setConfig: (designId: string, moduleId: string, config: Record<string, Json>) =>
    call<ModuleState>(`/designs/${designId}/modules/${moduleId}/config`, 'PUT', config),

  setEnabled: (designId: string, moduleId: string, on: boolean) =>
    call<{ enabled: boolean }>(`/designs/${designId}/modules/${moduleId}/enabled`, 'POST', { on }),
};
