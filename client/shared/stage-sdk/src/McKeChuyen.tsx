/** Khối "AI viết & kể truyện" (ô `mc-ke-chuyen`), đứng đầu tab Cài đặt của
 *  Kể chuyện: MC kể truyện và AI viết truyện kế tiếp là CÙNG một AI (cấu hình AI
 *  của phòng), nên chọn một lần ở một chỗ. Ở phòng kể chuyện MC chính là người
 *  kể, nên không có thẻ "Người dẫn do AI" riêng (thẻ đó vẫn dùng ở phòng lớp học —
 *  MC là cô giáo, một vai khác).
 *
 *  Lưu vẫn đúng chỗ cũ — cấu hình AI của phòng (`set-ai`) — chỉ chuyển chỗ hiện.
 *  Dùng chung các ô với thẻ MC (`mc-cfg.tsx`), không định nghĩa lại. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentType } from 'react';
import { oChonGiong } from '@live/contracts';
import type { ConfigField, Json } from '@live/contracts';
import { ONguonChu } from './AnhTruyen';
import { nhaMacDinh, O_DAN, O_CHAT_MOI_15, O_CHAT_TIKTOK, O_GIONG_MC, O_NHIP, O_PHAT_LIEN_TUC, O_SANG_TAO, O_TRAN, oModel, oNha, suaAi, useNhaAi } from './mc-cfg';
import { AI_MAC_DINH, VAI_GIONG_TRONG } from './state';
import type { VaiGiong } from './state';
import { useStage } from './Stage';
import type { CastVoice } from './audio';

/** Ô cấu hình chung (`OConfig`), truyền vào để khỏi vòng import. */
export type OChung = ComponentType<{
  moduleId: string;
  field: ConfigField;
  value: Json;
  disabled: boolean;
  onChange(v: Json): void;
}>;

const O_BAT_MC: ConfigField = {
  key: 'enabled',
  label: 'Bật người dẫn',
  type: 'toggle',
  hint: 'Mình kể từng đoạn, chào và đáp khách. Tắt thì phòng tự đọc.',
};

/** Giọng dẫn chuyện = giọng chính của MC: ở phòng kể chuyện MC là người kể. */
const O_GIONG_DAN: ConfigField = {
  ...O_GIONG_MC,
  label: 'Kể truyện — giọng dẫn truyện',
  hint: 'Lời kể, lời mở và khép truyện. Cũng là giọng dùng khi một việc chưa được giao giọng.',
};

const TEN_AI: Record<'api' | 'codex' | 'claude', string> = {
  api: 'API',
  codex: 'Codex (tài khoản ChatGPT)',
  claude: 'Claude (tài khoản Claude)',
};

/** Model Claude Code cho từng việc — chọn rẻ cho việc chạy liên tục. */
const MODEL_CLI = [
  { value: 'haiku', label: 'Haiku — rẻ, nhanh' },
  { value: 'sonnet', label: 'Sonnet — cân bằng (mặc định)' },
  { value: 'opus', label: 'Opus — cao nhất, tốn nhất' },
];
const O_MODEL_MC: ConfigField = {
  key: 'cliModel',
  label: 'Model Người dẫn truyện',
  type: 'select',
  options: MODEL_CLI,
  hint: 'Chạy liên tục suốt buổi live — Haiku hay Sonnet là đủ.',
};
const O_MODEL_VIET: ConfigField = {
  key: 'cliModelViet',
  label: 'Model tìm truyện',
  type: 'select',
  options: MODEL_CLI,
  hint: 'Tìm truyện quen hợp thể loại rồi kể lại. Mỗi truyện gọi một lần.',
};

/** Codex: tài khoản ChatGPT chỉ cho vài model, để trống là model mặc định của
 *  tài khoản. Mức suy luận là chỗ tiết kiệm chính. */
const MUC_CODEX = [
  { value: 'low', label: 'Thấp — rẻ, nhanh (mặc định)' },
  { value: 'medium', label: 'Vừa' },
  { value: 'high', label: 'Cao — chậm, tốn hạn mức' },
];
const O_CODEX_MUC: ConfigField = {
  key: 'codexMuc',
  label: 'Mức suy luận — Người dẫn truyện',
  type: 'select',
  options: MUC_CODEX,
  hint: 'Chạy liên tục suốt buổi live — để Thấp.',
};
const O_CODEX_MUC_VIET: ConfigField = {
  key: 'codexMucViet',
  label: 'Mức suy luận — tìm truyện',
  type: 'select',
  options: MUC_CODEX,
};
const O_CODEX_MODEL: ConfigField = {
  key: 'codexModel',
  label: 'Model Codex',
  type: 'text',
  hint: 'Để trống là model mặc định của tài khoản ChatGPT. Tài khoản thường chỉ dùng được model mặc định.',
};

export function OMcKeChuyen({
  field: f,
  value,
  cfg,
  disabled,
  onChange,
  suaKhac,
  O,
}: {
  field: ConfigField;
  /** `cachKe` của tính năng: 'tu-doc' là phòng tự đọc, còn lại là MC kể. */
  value: Json;
  cfg: Readonly<Record<string, Json>>;
  disabled: boolean;
  onChange(v: Json): void;
  suaKhac?: ((key: string, v: Json) => void) | undefined;
  O: OChung;
}) {
  const s = useStage();
  const ai = s.ai ?? AI_MAC_DINH;
  const ds = useNhaAi();
  const kAi = f.mcKe?.ai ?? 'aiChu';
  const nguon = cfg[kAi] === 'codex' || cfg[kAi] === 'claude' ? cfg[kAi] : 'api';
  const nhaChu = ai.provider.trim() === '' ? (nhaMacDinh(ds, 'chat', 'mc')?.id ?? '') : ai.provider.trim();
  // MC kể = tính năng để MC kể (`cachKe`) VÀ MC của phòng đang bật. Một công tắc
  // ghi cả hai, để sân khấu, máy chủ và bảng này không bao giờ nói hai kiểu.
  const bat = value !== 'tu-doc' && ai.enabled;
  const tat = disabled || !bat;
  const doiBat = (v: Json) => {
    onChange(v === true ? 'mc-day-du' : 'tu-doc');
    suaAi('enabled', v === true);
  };

  return (
    <div className="bx-nguon-anh bx-mc-ke">
      <O moduleId="mc" field={O_BAT_MC} value={bat} disabled={disabled} onChange={doiBat} />
      <p className="bx-goi bx-dang-dung">
        <b>Đang chạy:</b>{' '}
        {bat
          ? `Mình kể truyện và viết truyện kế tiếp bằng AI qua ${TEN_AI[nguon]}`
          : 'Người dẫn đang tắt · phòng tự đọc từng đoạn, không tự viết truyện mới'}
      </p>
      {bat ? (
        <>
          <span className="bx-mc-nhan">AI</span>
          <ONguonChu
            field={{ ...f, key: kAi, type: 'nguon-chu', label: 'AI' }}
            value={nguon}
            disabled={disabled || suaKhac === undefined}
            onChange={(v) => suaKhac?.(kAi, v)}
            anDangDung
            them={nguon === 'api' ? undefined : <LichSuCli />}
          />
          {nguon === 'claude' ? (
            <>
              <O
                moduleId="story"
                field={O_MODEL_MC}
                value={chuoi(cfg.cliModel, 'sonnet')}
                disabled={tat || suaKhac === undefined}
                onChange={(v) => suaKhac?.('cliModel', v)}
              />
              <O
                moduleId="story"
                field={O_MODEL_VIET}
                value={chuoi(cfg.cliModelViet, 'sonnet')}
                disabled={tat || suaKhac === undefined}
                onChange={(v) => suaKhac?.('cliModelViet', v)}
              />
              <p className="bx-goi">
                Mỗi truyện một session: trong truyện MC nhớ mạch, sang truyện mới là session mới.
              </p>
            </>
          ) : null}
          {nguon === 'codex' ? (
            <>
              <O
                moduleId="story"
                field={O_CODEX_MUC}
                value={chuoi(cfg.codexMuc, 'low')}
                disabled={tat || suaKhac === undefined}
                onChange={(v) => suaKhac?.('codexMuc', v)}
              />
              <O
                moduleId="story"
                field={O_CODEX_MUC_VIET}
                value={chuoi(cfg.codexMucViet, 'low')}
                disabled={tat || suaKhac === undefined}
                onChange={(v) => suaKhac?.('codexMucViet', v)}
              />
              <details className="bx-ho-so">
                <summary>Model Codex</summary>
                <div className="bx-nang-cao">
                  <O
                    moduleId="story"
                    field={O_CODEX_MODEL}
                    value={chuoi(cfg.codexModel, '')}
                    disabled={tat || suaKhac === undefined}
                    onChange={(v) => suaKhac?.('codexModel', v)}
                  />
                  <O
                    moduleId="story"
                    field={{ ...O_CODEX_MODEL, key: 'codexModelViet', label: 'Model Codex — tìm truyện' }}
                    value={chuoi(cfg.codexModelViet, '')}
                    disabled={tat || suaKhac === undefined}
                    onChange={(v) => suaKhac?.('codexModelViet', v)}
                  />
                </div>
              </details>
              <p className="bx-goi">
                Mỗi truyện một session: trong truyện MC nhớ mạch, sang truyện mới là session mới.
              </p>
            </>
          ) : null}
          {nguon === 'api' ? (
            <>
              <O
                moduleId="mc"
                field={oNha('provider', 'Kết nối', 'chat', 'mc', ds, ai.provider)}
                value={ai.provider}
                disabled={tat}
                onChange={(v) => suaAi('provider', v)}
              />
              <O
                moduleId="mc"
                field={oModel('model', 'Model', 'chat', nhaChu, ds)}
                value={ai.model}
                disabled={tat}
                onChange={(v) => suaAi('model', v)}
              />
            </>
          ) : null}
          <div className="bx-nang-cao">
            <O moduleId="mc" field={O_DAN} value={ai.extra} disabled={tat} onChange={(v) => suaAi('extra', v)} />
            <O moduleId="mc" field={O_NHIP} value={ai.everySec} disabled={tat} onChange={(v) => suaAi('everySec', v)} />
            <O
              moduleId="mc"
              field={O_PHAT_LIEN_TUC}
              value={ai.phatLienTuc === true}
              disabled={tat}
              onChange={(v) => suaAi('phatLienTuc', v)}
            />
            <O
              moduleId="mc"
              field={O_CHAT_TIKTOK}
              value={ai.chatTiktok === true}
              disabled={tat}
              onChange={(v) => suaAi('chatTiktok', v)}
            />
            {ai.chatTiktok === true ? (
              <O
                moduleId="mc"
                field={O_CHAT_MOI_15}
                value={ai.chatMoi15 ?? 3}
                disabled={tat}
                onChange={(v) => suaAi('chatMoi15', v)}
              />
            ) : null}
            <O
              moduleId="mc"
              field={O_SANG_TAO}
              value={ai.temperature === null || ai.temperature === undefined ? '' : String(ai.temperature)}
              disabled={tat}
              onChange={(v) => suaAi('temperature', v === '' ? null : Number(v))}
            />
            <O
              moduleId="mc"
              field={O_TRAN}
              value={ai.maxTokens}
              disabled={tat}
              onChange={(v) => suaAi('maxTokens', v)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

const chuoi = (v: Json | undefined, md: string): string => (typeof v === 'string' && v !== '' ? v : md);

/** Một lượt CLI trong lịch sử (máy chủ `cli_goi::MucCli`). */
interface MucCli {
  luc: number;
  phong: string;
  viec: string;
  cong: string;
  model: string;
  phien: string;
  phienMoi: boolean;
  truyen: string;
  dan: string;
  gui: string;
  nhan: string;
  ms: number;
  tokVao: number;
  tokRa: number;
  cacheDoc: number;
  cacheGhi: number;
  loi: string;
}

/** Nút "Lịch sử CLI" và hộp xem: MC gửi gì lên Claude Code, nhận về gì, mỗi
 *  lượt thuộc session nào (mỗi truyện một session), tốn bao nhiêu token. */
function LichSuCli() {
  const [mo, setMo] = useState(false);
  const [ds, setDs] = useState<MucCli[]>([]);
  const o = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mo) return;
    const tai = () =>
      void fetch('/s/ai-cli/lich-su')
        .then((r) => (r.ok ? (r.json() as Promise<MucCli[]>) : []))
        .then(setDs)
        .catch(() => undefined);
    tai();
    const t = setInterval(tai, 3_000);
    return () => clearInterval(t);
  }, [mo]);
  const ngan = o.current?.closest('.bx-ngan') ?? null;
  const gio = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour12: false });
  return (
    <div ref={o}>
      <button type="button" className="bx-trang-thai" onClick={() => setMo(true)}>
        Lịch sử CLI
      </button>
      {mo && ngan !== null
        ? createPortal(
            <div className="bx-tam" role="dialog" aria-modal aria-label="Lịch sử CLI">
              <div className="bx-modal">
                <div className="bx-dau2">
                  <span className="bx-icon">🧾</span>
                  <span className="bx-ten">
                    <b>Lịch sử CLI</b>
                    <small>gửi gì lên Claude Code và nhận về gì — mới nhất trên cùng</small>
                  </span>
                  <button type="button" className="bx-x" onClick={() => setMo(false)} aria-label="Đóng">
                    ✕
                  </button>
                </div>
                <div className="bx-than bx-lich-su-cli">
                  {ds.length === 0 ? (
                    <p className="bx-goi">Chưa có lượt nào. Chạy qua Claude thì từng lượt hiện ở đây.</p>
                  ) : (
                    ds.map((m, i) => (
                      <details key={`${m.luc}-${i}`} className="bx-muc-cli" data-loi={m.loi !== '' ? '1' : '0'}>
                        <summary>
                          <b>{gio(m.luc)}</b> · {m.viec === 'viet' ? 'Tìm truyện' : 'Người dẫn truyện'} ·{' '}
                          {m.cong === 'codex' ? 'Codex' : 'Claude'} · {m.model}
                          {' · '}
                          {m.phienMoi ? 'session mới' : 'nối tiếp'} · {(m.ms / 1000).toFixed(1)}s
                          {m.loi !== '' ? ' · lỗi' : ` · ${m.tokVao + m.cacheDoc + m.cacheGhi}→${m.tokRa} token`}
                          <small>
                            {m.truyen !== '' ? `${m.truyen} · ` : ''}session {m.phien.slice(0, 8) || '—'}
                          </small>
                        </summary>
                        {m.dan !== '' ? (
                          <details className="bx-ho-so">
                            <summary>Lời dặn (gửi khi mở session)</summary>
                            <pre className="bx-cli">{m.dan}</pre>
                          </details>
                        ) : null}
                        <span className="bx-ds-nhan">Gửi</span>
                        <pre className="bx-cli">{m.gui}</pre>
                        <span className="bx-ds-nhan">Nhận</span>
                        {m.loi !== '' ? (
                          <span className="bx-media-loi">{m.loi}</span>
                        ) : (
                          <pre className="bx-cli">{m.nhan}</pre>
                        )}
                        <small className="bx-goi">
                          Token: vào {m.tokVao} · đọc đệm {m.cacheDoc} · ghi đệm {m.cacheGhi} · ra {m.tokRa}
                        </small>
                      </details>
                    ))
                  )}
                </div>
              </div>
            </div>,
            ngan,
          )
        : null}
    </div>
  );
}

/** Một việc trong "Ai đọc gì": tên việc, ô lưu, lời gợi ý. */
const VIEC: { khoa: Exclude<keyof VaiGiong, 'daDat'>; ten: string; goi: string }[] = [
  {
    khoa: 'nhanVat',
    ten: 'Đọc lời nhân vật trong truyện',
    goi: 'Mình tự giao mỗi nhân vật một giọng hợp tuổi, giới, giữ suốt truyện.',
  },
  { khoa: 'chao', ten: 'Chào khách mới vào', goi: 'Mình tự thay phiên người chào.' },
  { khoa: 'dap', ten: 'Trò chuyện, đáp bình luận', goi: 'Mình tự chọn người nói chuyện với khách.' },
  { khoa: 'qua', ten: 'Cảm ơn quà', goi: 'thay phiên đọc lời cảm ơn quà.' },
  { khoa: 'anUi', ten: 'Cảm ơn người lên an ủi bé', goi: 'thay phiên đọc lúc khách chạy lên ôm bé.' },
];

/** Ô chọn nhiều giọng có tìm kiếm: giọng đã chọn hiện thành thẻ (bấm × để
 *  bỏ), gõ vào ô để lọc dàn giọng rồi bấm một dòng để thêm / bỏ. Dàn thêm giọng
 *  mới là có ngay trong danh sách — gọn cả khi dàn dài. */
function ChonNhieuGiong({
  ten,
  chon,
  dan,
  disabled,
  doi,
}: {
  ten: string;
  chon: readonly string[];
  dan: readonly CastVoice[];
  disabled: boolean;
  doi(id: string): void;
}) {
  const [mo, setMo] = useState(false);
  const [tim, setTim] = useState('');
  const hop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (hop.current !== null && !hop.current.contains(e.target as Node)) setMo(false);
    };
    document.addEventListener('mousedown', ngoai);
    return () => document.removeEventListener('mousedown', ngoai);
  }, [mo]);
  const tenCua = (id: string) => {
    const g = dan.find((x) => x.id === id);
    return g === undefined ? `${id} (đã gỡ khỏi dàn)` : g.role.trim() === '' ? g.id : g.role;
  };
  const q = tim.trim().toLowerCase();
  const loc = dan.filter((g) => q === '' || `${g.role} ${g.id} ${g.voice}`.toLowerCase().includes(q));
  return (
    <div className="bx-chon-nhieu" ref={hop}>
      <div className="bx-chon-the" onClick={() => !disabled && setMo(true)}>
        {chon.map((id) => (
          <span key={id} className="bx-the-giong">
            {tenCua(id)}
            <button
              type="button"
              aria-label={`Bỏ ${tenCua(id)}`}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                doi(id);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="bx-chon-tim"
          value={tim}
          disabled={disabled}
          aria-label={`Tìm giọng — ${ten}`}
          placeholder={chon.length === 0 ? 'Tìm và chọn giọng…' : 'Thêm giọng…'}
          onFocus={() => setMo(true)}
          onChange={(e) => {
            setTim(e.target.value);
            setMo(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setMo(false);
            if (e.key === 'Enter' && loc[0] !== undefined) {
              e.preventDefault();
              doi(loc[0].id);
              setTim('');
            }
          }}
        />
      </div>
      {mo ? (
        <div className="bx-chon-ds" role="listbox" aria-multiselectable aria-label={ten}>
          {loc.length === 0 ? (
            <p className="bx-goi">Không có giọng nào khớp “{tim}”.</p>
          ) : (
            loc.map((g) => {
              const co = chon.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  role="option"
                  aria-selected={co}
                  onClick={() => {
                    doi(g.id);
                    setTim('');
                  }}
                >
                  <span className="bx-chon-dau">{co ? '✓' : ''}</span>
                  <span>{g.role.trim() === '' ? g.id : g.role}</span>
                  <small>{tenGoc(g.voice)}</small>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Tên giọng gốc cho dễ nhận: "edge-tts/vi-VN-HoaiMyNeural" → "HoaiMy". */
function tenGoc(voice: string): string {
  const cuoi = voice.split('/').pop() ?? '';
  return cuoi.replace(/^vi-VN-/, '').replace(/Neural$/, '');
}

/** "Ai đọc gì" ở tab Giọng đọc của Kể chuyện: giọng dẫn chuyện (giọng chính
 *  của MC) và mỗi việc một nhóm giọng. Không chọn giọng nào cho một việc là để
 *  MC tự chọn trong cả dàn. Lưu ở cấu hình AI của phòng (`voiceId`, `vaiGiong`). */
export function OVaiGiong({ disabled, O }: { disabled: boolean; O: OChung }) {
  const s = useStage();
  const ai = s.ai ?? AI_MAC_DINH;
  const vai: VaiGiong = { ...VAI_GIONG_TRONG, ...(ai.vaiGiong ?? {}) };
  const dan = s.voice.cast;
  const doi = (khoa: Exclude<keyof VaiGiong, 'daDat'>, id: string) => {
    const cu = vai[khoa];
    const moi = cu.includes(id) ? cu.filter((g) => g !== id) : [...cu, id];
    suaAi('vaiGiong', { ...vai, [khoa]: moi, daDat: true });
  };
  return (
    <div className="bx-vai-giong">
      <O
        moduleId="mc"
        field={oChonGiong(O_GIONG_DAN, dan, ai.voiceId)}
        value={ai.voiceId}
        disabled={disabled}
        onChange={(v) => suaAi('voiceId', v)}
      />
      {!s.voice.multi ? (
        <p className="bx-goi bx-canh-bao">
          Phòng đang Đơn giọng — cả phòng một giọng. Bật Đa giọng ở thẻ Giọng đọc (Tính năng chung) thì phân vai dưới
          đây mới có tác dụng.
        </p>
      ) : null}
      {dan.length === 0 ? (
        <p className="bx-goi">Dàn giọng chưa có giọng nào — thêm ở thẻ Giọng đọc (Tính năng chung).</p>
      ) : (
        VIEC.map((v) => (
          <div key={v.khoa} className="bx-ds">
            <span className="bx-ds-nhan">{v.ten}</span>
            <ChonNhieuGiong
              ten={v.ten}
              chon={vai[v.khoa]}
              dan={dan}
              disabled={disabled}
              doi={(id) => doi(v.khoa, id)}
            />
            <span className="bx-goi">
              {vai[v.khoa].length === 0
                ? 'Chưa tích giọng nào — mình tự chọn trong cả dàn.'
                : `${vai[v.khoa].length} giọng tham gia — ${v.goi}`}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
