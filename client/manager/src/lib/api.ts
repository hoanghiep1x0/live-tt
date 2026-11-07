/** Gọi REST của backend.
 *
 *  Luôn dùng đường tương đối `/api/…`. Token không nằm ở đây: lúc phát triển
 *  thì dev server gắn header (xem vite.config.ts), bản đóng gói thì vỏ Tauri
 *  gắn. Nhờ vậy khoá không bao giờ lọt vào bundle của trang.
 */

import type { DesignInfo, Json, KieuNguon, KieuNha, SessionView, TrangThaiNguon, ViecAi } from '@live/contracts';

export interface ModuleState {
  enabled: boolean;
  config: Record<string, Json>;
}

export interface DesignList {
  designs: DesignInfo[];
  live: string | null;
}

/** Cùng kiểu với hợp đồng (`@live/contracts`): REST và tin WS `source` một dạng. */
export type SourceKind = KieuNguon;
export type SourceStatus = TrangThaiNguon;

/** Cầu nối backend tự bật (docs/07 §4). Khớp `bridge_url_mac_dinh` ở backend. */
export const CAU_NOI_MAC_DINH = 'ws://127.0.0.1:8787/ws/live';

/** Cùng kiểu với kho kết nối dùng chung ở `@live/contracts`. */
export type ProviderKind = KieuNha;

/** Loại việc một kết nối AI làm được. Kho chia tab theo đây. */
export type AiUse = ViecAi;

export interface ProviderInfo {
  id: string;
  /** Tên hiển thị đúng như người vận hành gõ ("MC"); id là bản nắn để code gọi. */
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  /** Model chung của bản cũ — loại nào chưa có model riêng thì dùng cái này. */
  model: string;
  uses: AiUse[];
  /** Model mặc định theo từng loại, đã điền đủ cả loại đang rơi về model chung. */
  models: Partial<Record<AiUse, string>>;
  /** Có khoá hay chưa. Giá trị khoá không bao giờ ra khỏi backend. */
  hasKey: boolean;
}

/** Loại việc theo giao thức, cho kho cũ chưa khai `uses`. Trùng luật với
 *  `uses_theo_kieu` ở backend. */
const USES_THEO_KIEU: Record<ProviderKind, AiUse[]> = {
  anthropic: ['chat'],
  elevenlabs: ['tts'],
  openai: ['chat', 'tts', 'image'],
};

/** Điền đủ trường cho một dòng kho. Backend cũ chưa trả `uses`/`models`; thiếu
 *  mà để nguyên thì cả trang quản lý vỡ ngay lúc vẽ. */
function chuanNha(p: Partial<ProviderInfo>): ProviderInfo {
  const kind = p.kind ?? 'openai';
  const model = p.model ?? '';
  const uses = p.uses ?? USES_THEO_KIEU[kind];
  return {
    id: p.id ?? '',
    name: p.name || (p.id ?? ''),
    kind,
    baseUrl: p.baseUrl ?? '',
    model,
    uses,
    models: p.models ?? Object.fromEntries(model === '' ? [] : uses.map((u) => [u, model])),
    hasKey: p.hasKey === true,
  };
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
  /** Đa giọng. Backend cũ chưa có thì thiếu — coi như đơn giọng. */
  multi?: boolean;
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

  secrets: async () => {
    const kq = await call<{ providers: Partial<ProviderInfo>[] }>('/secrets');
    return { providers: kq.providers.map(chuanNha) };
  },

  /** Khoá rỗng nghĩa là giữ khoá cũ — trang quản lý không đọc được khoá nên
   *  không gửi lại được, mà vẫn phải sửa được địa chỉ và model. */
  setSecret: (
    id: string,
    /** Thân dựng bằng `thanGhi` của `@live/contracts`, giống hệt sân khấu. */
    v: Record<string, unknown>,
  ) => call<{ provider: ProviderInfo }>(`/secrets/${encodeURIComponent(id)}`, 'PUT', v),

  /** Khoá của một kết nối, cho form sửa. Danh sách thì không bao giờ có khoá. */
  secretKey: (id: string) => call<{ key: string }>(`/secrets/${encodeURIComponent(id)}/key`),
  delSecret: (id: string) =>
    call<{ removed: string }>(`/secrets/${encodeURIComponent(id)}`, 'DELETE'),

  voice: () => call<{ voice: VoiceCfg }>('/voice'),

  setVoice: (cfg: VoiceCfg) => call<{ voice: VoiceCfg }>('/voice', 'PUT', cfg),

  modules: (designId: string) =>
    call<{ modules: Record<string, ModuleState> }>(`/designs/${designId}/modules`),

  setConfig: (designId: string, moduleId: string, config: Record<string, Json>) =>
    call<ModuleState>(`/designs/${designId}/modules/${moduleId}/config`, 'PUT', config),

  setEnabled: (designId: string, moduleId: string, on: boolean) =>
    call<{ enabled: boolean }>(`/designs/${designId}/modules/${moduleId}/enabled`, 'POST', { on }),

  /** Bấm nút trên thẻ (`ModuleUi.actions`). Không lưu gì: backend chuyển xuống sân khấu. */
  bamNut: (designId: string, moduleId: string, action: string) =>
    call<unknown>(`/designs/${designId}/modules/${moduleId}/action`, 'POST', { action }),
};
