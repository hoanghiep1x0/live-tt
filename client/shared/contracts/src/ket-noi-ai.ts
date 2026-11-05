/** Kho kết nối AI — phần dùng chung cho trang quản lý và bảng xem thử.
 *
 *  Mọi tính năng gọi AI (MC, nhờ AI viết, vẽ ảnh, giọng đọc) đều lấy khoá từ
 *  một kho. Hai nơi sửa kho phải nói cùng một thứ tiếng: cùng danh sách
 *  provider, cùng luật "provider nào làm được việc gì", cùng cách nắn tên và
 *  báo trùng. Để ở đây, mỗi nơi chỉ còn phần vẽ.
 *
 *  Thuần, không chạm trình duyệt, để test không cần DOM. */

/** Giao thức backend gọi và đọc response theo. Trùng `ProviderKind` ở backend. */
export type KieuNha = 'openai' | 'anthropic' | 'elevenlabs';

/** Loại việc một kết nối làm được. Trùng `Use` ở backend. */
export type ViecAi = 'chat' | 'tts' | 'image' | 'video';

/** Một dòng trong kho, đúng thứ backend trả về — không bao giờ có khoá. */
export interface KetNoiAi {
  id: string;
  /** Tên hiển thị đúng như người vận hành gõ. Kho cũ không có thì dùng id. */
  name?: string;
  kind: KieuNha;
  baseUrl?: string;
  uses: readonly ViecAi[];
  models: Partial<Record<ViecAi, string>>;
  hasKey: boolean;
}

export const VIEC_AI: readonly { id: ViecAi; ten: string }[] = [
  { id: 'chat', ten: 'Chat' },
  { id: 'image', ten: 'Ảnh' },
  { id: 'tts', ten: 'Giọng đọc' },
  { id: 'video', ten: 'Video' },
];

export const TEN_KIEU: Record<KieuNha, string> = {
  openai: 'Kiểu OpenAI',
  anthropic: 'Kiểu Anthropic',
  elevenlabs: 'Kiểu ElevenLabs',
};

/** Giao thức nào làm được việc nào. Chọn sai là gọi đi rồi mới biết hỏng. */
export const KIEU_LAM_DUOC: Record<KieuNha, readonly ViecAi[]> = {
  openai: ['chat', 'image', 'tts', 'video'],
  anthropic: ['chat'],
  elevenlabs: ['tts'],
};

export function tenViec(v: ViecAi): string {
  return VIEC_AI.find((x) => x.id === v)?.ten ?? v;
}

/** Mẫu provider: chọn một mẫu là có giao thức, địa chỉ và model từng việc,
 *  chỉ còn dán khoá. `khac` là "tự điền", giữ nguyên thứ đã gõ. */
export interface MauNha {
  ma: string;
  ten: string;
  kind: KieuNha;
  /** Tên ngắn gợi ý khi ô tên còn trống. */
  id: string;
  baseUrl: string;
  models: Partial<Record<ViecAi, string>>;
}

export const MAU_NHA: readonly MauNha[] = [
  {
    ma: 'openai',
    ten: 'OpenAI',
    kind: 'openai',
    id: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: { chat: 'gpt-4o-mini', image: 'gpt-image-1', tts: 'gpt-4o-mini-tts' },
  },
  {
    ma: 'anthropic',
    ten: 'Anthropic (Claude)',
    kind: 'anthropic',
    id: 'claude',
    baseUrl: '',
    models: { chat: 'claude-sonnet-5-5' },
  },
  {
    ma: '9router',
    ten: '9router',
    kind: 'openai',
    id: '9router',
    baseUrl: 'http://localhost:20128/v1',
    models: { tts: 'google-tts/vi' },
  },
  {
    ma: 'vieneu',
    ten: 'VieNeu',
    kind: 'openai',
    id: 'vieneu',
    baseUrl: 'https://api.vieneu.io/api/v1',
    models: { tts: 'vieneu-v4' },
  },
  {
    ma: 'elevenlabs',
    ten: 'ElevenLabs',
    kind: 'elevenlabs',
    id: 'eleven',
    baseUrl: '',
    models: { tts: 'eleven_multilingual_v2' },
  },
  { ma: 'khac', ten: 'Khác — nói tiếng OpenAI', kind: 'openai', id: '', baseUrl: '', models: {} },
];

export function tenKetNoi(p: Pick<KetNoiAi, 'id' | 'name'>): string {
  return p.name !== undefined && p.name !== '' ? p.name : p.id;
}

/** Kết nối đã có ứng với mẫu nào: trùng địa chỉ trước (9router chạy trên máy
 *  đặt tên gì cũng nhận ra), rồi trùng tên ngắn, không thì theo giao thức. */
export function mauCua(p: Pick<KetNoiAi, 'id' | 'kind' | 'baseUrl'>): MauNha {
  const dia = (p.baseUrl ?? '').trim().replace(/\/+$/, '');
  const khac = MAU_NHA[MAU_NHA.length - 1] as MauNha;
  return (
    MAU_NHA.find((m) => m.baseUrl !== '' && m.baseUrl === dia) ??
    MAU_NHA.find((m) => m.id !== '' && m.id === p.id && m.kind === p.kind) ??
    (p.kind === 'openai' ? khac : MAU_NHA.find((m) => m.kind === p.kind)) ??
    khac
  );
}

/** Tên provider để hiện trong bảng. */
export function tenProvider(p: Pick<KetNoiAi, 'id' | 'kind' | 'baseUrl'>): string {
  const m = mauCua(p);
  return m.ma === 'khac' ? TEN_KIEU[p.kind] : m.ten;
}

/** Việc mặc định khi tạo kết nối mới từ một mẫu: những việc mẫu có model,
 *  không có thì mọi việc giao thức làm được (trừ video — chưa tính năng nào
 *  dùng). `uuTien` là việc của chỗ mở form, luôn được bật nếu làm được. */
export function viecMacDinh(m: MauNha, uuTien?: ViecAi): ViecAi[] {
  const lam = KIEU_LAM_DUOC[m.kind];
  const theoMau = (Object.keys(m.models) as ViecAi[]).filter((v) => lam.includes(v));
  const ds = theoMau.length > 0 ? theoMau : lam.filter((v) => v !== 'video');
  if (uuTien !== undefined && lam.includes(uuTien) && !ds.includes(uuTien)) ds.push(uuTien);
  return VIEC_AI.map((v) => v.id).filter((v) => ds.includes(v));
}

const BO_DAU: readonly [string, string][] = [
  ['àáảãạăằắẳẵặâầấẩẫậ', 'a'],
  ['èéẻẽẹêềếểễệ', 'e'],
  ['ìíỉĩị', 'i'],
  ['òóỏõọôồốổỗộơờớởỡợ', 'o'],
  ['ùúủũụưừứửữự', 'u'],
  ['ỳýỷỹỵ', 'y'],
  ['đ', 'd'],
];

/** Id backend sẽ lưu cho một tên ngắn. Trùng luật `nan_id` ở backend
 *  (`backend/src/secrets.rs`): chữ thường, bỏ dấu, còn lại thành gạch nối. */
export function nanId(ten: string): string {
  let id = '';
  for (const c0 of ten.trim().toLowerCase()) {
    const c = BO_DAU.find(([s]) => s.includes(c0))?.[1] ?? c0;
    if (/^[a-z0-9]$/.test(c)) id += c;
    else if (id !== '' && !id.endsWith('-')) id += '-';
  }
  return id.replace(/-+$/, '').slice(0, 32).replace(/-+$/, '');
}

/** Kết nối khác đã mang tên này (cùng id sau khi nắn). Tạo mới mà trùng thì
 *  sẽ đè khoá của nó — nơi gọi phải báo, không được lặng lẽ ghi. */
export function timTrung(
  ds: readonly KetNoiAi[],
  ten: string,
  boQuaId?: string,
): KetNoiAi | undefined {
  const id = nanId(ten);
  return ds.find((p) => p.id !== boQuaId && p.id === id);
}

/** Bản nháp của form sửa một kết nối — giống hệt ở hai nơi. */
export interface NhapKetNoi {
  /** Mẫu đang chọn ở ô Provider. */
  mau: string;
  kind: KieuNha;
  name: string;
  baseUrl: string;
  /** Rỗng khi sửa là giữ khoá cũ. */
  key: string;
  uses: ViecAi[];
  models: Partial<Record<ViecAi, string>>;
}

export function nhapMoi(uuTien?: ViecAi): NhapKetNoi {
  const khac = MAU_NHA[MAU_NHA.length - 1] as MauNha;
  return {
    mau: khac.ma,
    kind: khac.kind,
    name: '',
    baseUrl: '',
    key: '',
    uses: viecMacDinh(khac, uuTien),
    models: {},
  };
}

export function nhapTu(p: KetNoiAi): NhapKetNoi {
  return {
    mau: mauCua(p).ma,
    kind: p.kind,
    name: tenKetNoi(p),
    baseUrl: p.baseUrl ?? '',
    key: '',
    uses: [...p.uses],
    models: { ...p.models },
  };
}

/** Chọn mẫu ở ô Provider: đổi giao thức, địa chỉ, việc và model theo mẫu; tên
 *  chỉ điền khi còn trống. "Khác" chỉ đổi mẫu, giữ nguyên thứ đã gõ. */
export function chonMau(n: NhapKetNoi, ma: string, uuTien?: ViecAi): NhapKetNoi {
  const m = MAU_NHA.find((x) => x.ma === ma);
  if (m === undefined) return n;
  if (m.ma === 'khac') return { ...n, mau: m.ma };
  return {
    ...n,
    mau: m.ma,
    kind: m.kind,
    name: n.name.trim() === '' ? m.id : n.name,
    baseUrl: m.baseUrl,
    uses: viecMacDinh(m, uuTien),
    models: { ...m.models },
  };
}

/** Bật / tắt một việc. Việc giao thức không làm được thì không bật. */
export function batViec(n: NhapKetNoi, v: ViecAi, bat: boolean): NhapKetNoi {
  if (bat && !KIEU_LAM_DUOC[n.kind].includes(v)) return n;
  const uses = bat ? [...new Set([...n.uses, v])] : n.uses.filter((x) => x !== v);
  return { ...n, uses: VIEC_AI.map((x) => x.id).filter((x) => uses.includes(x)) };
}

/** Đổi giao thức: bỏ những việc giao thức mới không làm được. */
export function doiKieu(n: NhapKetNoi, kind: KieuNha): NhapKetNoi {
  return { ...n, kind, uses: n.uses.filter((v) => KIEU_LAM_DUOC[kind].includes(v)) };
}

/** Thân `PUT /…/secrets/:id`. Chỉ gửi model của việc đang bật. */
export function thanGhi(n: NhapKetNoi): Record<string, unknown> {
  const models: Partial<Record<ViecAi, string>> = {};
  for (const v of n.uses) {
    const m = (n.models[v] ?? '').trim();
    if (m !== '') models[v] = m;
  }
  return {
    kind: n.kind,
    name: n.name.trim(),
    baseUrl: n.baseUrl.trim(),
    key: n.key.trim(),
    uses: n.uses,
    models,
  };
}

/** Lỗi chặn được trước khi gửi, hoặc null. Chỉ chặn thứ chắc chắn hỏng — địa
 *  chỉ, khoá và model thì để backend nắn. */
export function loiNhap(
  n: NhapKetNoi,
  ds: readonly KetNoiAi[],
  dangSua: string | null,
): string | null {
  if (nanId(n.name).length < 2) return 'Đặt một tên ngắn có ít nhất hai chữ hoặc số';
  const trung = timTrung(ds, n.name, dangSua ?? undefined);
  if (trung !== undefined) {
    return `Đã có kết nối “${tenKetNoi(trung)}” — bấm vào dòng đó để sửa, hoặc đặt tên khác`;
  }
  if (n.uses.length === 0) return 'Chọn ít nhất một việc kết nối này làm';
  return null;
}
