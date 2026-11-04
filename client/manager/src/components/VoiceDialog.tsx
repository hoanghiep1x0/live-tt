import { useEffect, useState } from 'react';
import { KeyRound, Mic, Play, Plus, Star, Trash2 } from 'lucide-react';
import { api, ttsThu } from '../lib/api';
import type { CastVoice, ProviderInfo, ProviderKind, VoiceCfg } from '../lib/api';
import { Dialog, DialogBody, DialogClose, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';

const KIEU: Record<ProviderKind, string> = {
  openai: 'Kiểu OpenAI (VieNeu, OpenAI, 9router…)',
  elevenlabs: 'ElevenLabs',
  anthropic: 'Anthropic — cho MC, không phải giọng đọc',
};

/** Mẫu điền sẵn cho những nhà hay dùng. Chọn một mẫu là điền hộ địa chỉ và
 *  model; người dùng chỉ còn phải dán khoá. "Tự điền" để trống hết. */
interface Mau {
  ten: string;
  id: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  goiY: string;
}

const MAU: readonly Mau[] = [
  {
    ten: 'Tự điền',
    id: '',
    kind: 'openai',
    baseUrl: '',
    model: '',
    goiY: 'Điền tay theo tài liệu của nhà cung cấp.',
  },
  {
    ten: '9router (chạy trên máy)',
    id: '9router',
    kind: 'openai',
    baseUrl: 'http://localhost:20128/v1',
    model: 'google-tts/vi',
    goiY: 'Giọng nằm trong model, ví dụ google-tts/vi hoặc edge-tts/vi-VN-HoaiMyNeural.',
  },
  {
    ten: 'VieNeu',
    id: 'vieneu',
    kind: 'openai',
    baseUrl: 'https://api.vieneu.io/api/v1',
    model: 'vieneu-v4',
    goiY: 'Tên giọng là tên người, ví dụ Anh Khôi.',
  },
  {
    ten: 'OpenAI',
    id: 'openai',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini-tts',
    goiY: 'Tên giọng ví dụ alloy, nova.',
  },
  {
    ten: 'ElevenLabs',
    id: 'eleven',
    kind: 'elevenlabs',
    baseUrl: '',
    model: 'eleven_multilingual_v2',
    goiY: 'Giọng là voice_id, chỉ chữ và số.',
  },
  {
    ten: 'AI vẽ ảnh (OpenAI)',
    id: 'anh',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-image-1',
    goiY:
      'Khoá để nhờ AI vẽ ảnh cho khung chiếu. Tên ngắn phải đúng là "anh". ' +
      'Nhà nào theo kiểu OpenAI (POST /images/generations) đều dùng được.',
  },
  {
    ten: 'MC do AI dẫn (Anthropic)',
    id: 'mc',
    kind: 'anthropic',
    baseUrl: '',
    model: '',
    goiY:
      'Khoá cho MC, KHÔNG phải giọng đọc. Tên ngắn phải đúng là "mc" thì MC mới tìm ra. ' +
      'Model chọn ở thẻ MC trên bảng xem, không điền ở đây. Địa chỉ để trống là gọi ' +
      'api.anthropic.com; điền khi anh chạy một cổng trung chuyển trên máy.',
  },
];

const CAU_THU = 'Xin chào cả phòng, đây là giọng đọc thử.';

interface Props {
  onToast(text: string, loi?: boolean): void;
}

export function VoiceDialog({ onToast }: Props) {
  const [ds, setDs] = useState<ProviderInfo[]>([]);
  const [cfg, setCfg] = useState<VoiceCfg | null>(null);
  const [mau, setMau] = useState(0);
  const [moi, setMoi] = useState({ id: '', kind: 'openai' as ProviderKind, baseUrl: '', model: '', key: '' });
  const [dangThu, setDangThu] = useState('');

  const tai = (): void => {
    void (async () => {
      try {
        const [a, b] = await Promise.all([api.secrets(), api.voice()]);
        setDs(a.providers);
        setCfg(b.voice);
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không đọc được cài đặt', true);
      }
    })();
  };
  useEffect(tai, []);

  const luuGiong = (c: VoiceCfg): void => {
    setCfg(c);
    void (async () => {
      try {
        const kq = await api.setVoice(c);
        setCfg(kq.voice);
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không lưu được', true);
      }
    })();
  };

  const suaCast = (i: number, v: Partial<CastVoice>): void => {
    if (cfg === null) return;
    const cast = cfg.cast.map((x, j) => (j === i ? { ...x, ...v } : x));
    setCfg({ ...cfg, cast });
  };

  const chonMau = (i: number): void => {
    setMau(i);
    const m = MAU[i];
    if (m === undefined) return;
    setMoi({ id: m.id, kind: m.kind, baseUrl: m.baseUrl, model: m.model, key: '' });
  };

  const luuNha = (): void => {
    const id = moi.id.trim();
    if (id === '') {
      onToast('Đặt một tên ngắn cho nhà cung cấp, ví dụ 9router', true);
      return;
    }
    void (async () => {
      try {
        await api.setSecret(id, {
          kind: moi.kind,
          baseUrl: moi.baseUrl.trim(),
          key: moi.key.trim(),
          model: moi.model.trim(),
        });
        setMoi({ ...moi, key: '' });
        tai();
        onToast(`Đã lưu nhà cung cấp "${id}"`);
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không lưu được', true);
      }
    })();
  };

  const ngheThu = (v: CastVoice): void => {
    if (cfg === null) return;
    setDangThu(v.id);
    void (async () => {
      try {
        const blob = await ttsThu({
          provider: v.provider,
          voice: v.voice,
          text: CAU_THU,
          speed: cfg.speed,
        });
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.volume = cfg.volume;
        a.onended = () => URL.revokeObjectURL(url);
        await a.play();
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không nghe thử được', true);
      } finally {
        setDangThu('');
      }
    })();
  };

  const goiY = MAU[mau]?.goiY ?? '';

  return (
    <Dialog>
      <DialogTrigger className="btn btn-icon btn-ghost" aria-label="Giọng đọc và khoá API">
        <Mic size={16} />
      </DialogTrigger>
      <DialogBody
        size="md"
        icon={<KeyRound size={15} />}
        title="Giọng đọc và khoá API"
        desc="Một phiên có nhiều nhân vật, mỗi nhân vật một giọng. Khoá cho MC do AI dẫn cũng cắm ở đây (tên ngắn “mc”). Khoá nằm ở máy chủ và không bao giờ gửi về trang này."
        foot={<DialogClose className="btn btn-gold">Xong</DialogClose>}
      >
        <div className="quick-grid">
          <section className="quick-sec">
            <div className="quick-head">
              <span className="mod-icon">🎭</span>
              <b>Dàn giọng</b>
              <Switch
                checked={cfg?.enabled === true}
                onCheckedChange={(on) => cfg !== null && luuGiong({ ...cfg, enabled: on })}
                label="Bật đọc to"
              />
            </div>

            {cfg === null ? (
              <p className="hint">Đang đọc cài đặt…</p>
            ) : (
              <>
                {cfg.cast.length === 0 ? (
                  <p className="hint">
                    Chưa có giọng nào — sân khấu đang dùng giọng máy của trình duyệt. Thêm một
                    giọng ở dưới.
                  </p>
                ) : (
                  <div className="voice-list">
                    {cfg.cast.map((v, i) => (
                      <div className="voice-row" key={v.id}>
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          title={
                            cfg.default === v.id
                              ? 'Đang là giọng mặc định'
                              : 'Đặt làm giọng mặc định'
                          }
                          onClick={() => luuGiong({ ...cfg, default: v.id })}
                        >
                          <Star
                            size={14}
                            className={cfg.default === v.id ? 'la-mac-dinh' : ''}
                          />
                        </button>
                        <span className="v-name">
                          <b>{v.id}</b>
                          <small>{v.role === '' ? 'chưa ghi vai' : v.role}</small>
                        </span>
                        <select
                          className="input input-xs"
                          value={v.provider}
                          aria-label={`Nhà cung cấp của ${v.id}`}
                          onChange={(e) => {
                            suaCast(i, { provider: e.target.value });
                            luuGiong({
                              ...cfg,
                              cast: cfg.cast.map((x, j) =>
                                j === i ? { ...x, provider: e.target.value } : x,
                              ),
                            });
                          }}
                        >
                          <option value="">— chọn nhà —</option>
                          {ds.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input input-xs"
                          value={v.voice}
                          placeholder="giọng hoặc model"
                          aria-label={`Giọng của ${v.id}`}
                          onChange={(e) => suaCast(i, { voice: e.target.value })}
                          onBlur={() => luuGiong(cfg)}
                        />
                        <button
                          type="button"
                          className="btn btn-icon"
                          disabled={dangThu !== '' || v.provider === ''}
                          title="Nghe thử giọng này"
                          onClick={() => ngheThu(v)}
                        >
                          <Play size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon"
                          title={`Xoá ${v.id}`}
                          onClick={() =>
                            luuGiong({ ...cfg, cast: cfg.cast.filter((_, j) => j !== i) })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form" style={{ marginTop: 12 }}>
                  <div className="field">
                    <input
                      className="input"
                      placeholder="id nhân vật, vd: mc, be-gai"
                      aria-label="Id nhân vật mới"
                      id="g-moi"
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const o = document.getElementById('g-moi');
                        const id = o instanceof HTMLInputElement ? o.value.trim() : '';
                        if (id === '') {
                          onToast('Đặt id cho nhân vật, ví dụ mc hoặc be-gai', true);
                          return;
                        }
                        if (o instanceof HTMLInputElement) o.value = '';
                        luuGiong({
                          ...cfg,
                          cast: [...cfg.cast, { id, provider: '', voice: '', role: '' }],
                        });
                      }}
                    >
                      <Plus size={15} />
                      Thêm nhân vật
                    </button>
                  </div>
                  <span className="hint">
                    Module đọc câu nào bằng giọng nào thì ghi id này vào hiệu ứng
                    <code> say</code>. Không ghi thì dùng giọng có dấu sao.
                  </span>

                  <div className="form-row">
                    <label htmlFor="v-toc">Tốc độ</label>
                    <div className="range">
                      <input
                        type="range"
                        id="v-toc"
                        min={0.5}
                        max={2}
                        step={0.05}
                        value={cfg.speed}
                        onChange={(e) => luuGiong({ ...cfg, speed: e.target.valueAsNumber })}
                      />
                      <output>{cfg.speed.toFixed(2)}</output>
                    </div>
                  </div>
                  <div className="form-row">
                    <label htmlFor="v-vol">Âm lượng</label>
                    <div className="range">
                      <input
                        type="range"
                        id="v-vol"
                        min={0}
                        max={1}
                        step={0.05}
                        value={cfg.volume}
                        onChange={(e) => luuGiong({ ...cfg, volume: e.target.valueAsNumber })}
                      />
                      <output>{Math.round(cfg.volume * 100)}%</output>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="quick-sec">
            <div className="quick-head">
              <span className="mod-icon">🔑</span>
              <b>Khoá API</b>
              <small>Giọng đọc và MC. Khoá chỉ nằm ở máy chủ, không bao giờ gửi ra trang nào</small>
            </div>

            {ds.length === 0 ? (
              <p className="hint">Chưa có nhà nào. Chọn một mẫu ở dưới rồi dán khoá.</p>
            ) : (
              <div className="voice-list">
                {ds.map((p) => (
                  <div className="voice-row" key={p.id}>
                    <span className="v-ico">{p.hasKey ? '🔐' : '⚠️'}</span>
                    <span className="v-name">
                      <b>{p.id}</b>
                      <small>{p.baseUrl === '' ? KIEU[p.kind] : p.baseUrl}</small>
                    </span>
                    <span className={p.hasKey ? 'v-tag v-clone' : 'v-tag'}>
                      {p.hasKey ? 'có khoá' : 'thiếu khoá'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-icon"
                      title={`Xoá ${p.id}`}
                      onClick={() => {
                        void (async () => {
                          try {
                            await api.delSecret(p.id);
                            tai();
                            onToast(`Đã xoá ${p.id}`);
                          } catch (e) {
                            onToast(e instanceof Error ? e.message : 'không xoá được', true);
                          }
                        })();
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="form" style={{ marginTop: 14 }}>
              <div className="form-row">
                <label htmlFor="n-mau">Mẫu</label>
                <select
                  className="input"
                  id="n-mau"
                  value={mau}
                  onChange={(e) => chonMau(Number(e.target.value))}
                >
                  {MAU.map((m, i) => (
                    <option key={m.ten} value={i}>
                      {m.ten}
                    </option>
                  ))}
                </select>
                <span className="hint">{goiY}</span>
              </div>
              <div className="form-row">
                <label htmlFor="n-id">Tên ngắn</label>
                <input
                  className="input"
                  id="n-id"
                  value={moi.id}
                  placeholder="9router"
                  onChange={(e) => setMoi({ ...moi, id: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label htmlFor="n-kieu">Kiểu giao thức</label>
                <select
                  className="input"
                  id="n-kieu"
                  value={moi.kind}
                  onChange={(e) => setMoi({ ...moi, kind: e.target.value as ProviderKind })}
                >
                  {(Object.keys(KIEU) as ProviderKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIEU[k]}
                    </option>
                  ))}
                </select>
              </div>
              {moi.kind === 'openai' || moi.kind === 'anthropic' ? (
                <div className="form-row">
                  <label htmlFor="n-url">Địa chỉ</label>
                  <input
                    className="input"
                    id="n-url"
                    value={moi.baseUrl}
                    placeholder="http://localhost:20128/v1"
                    onChange={(e) => setMoi({ ...moi, baseUrl: e.target.value })}
                  />
                  <span className="hint">
                    Chỉ nhận https, trừ khi nhà cung cấp chạy ngay trên máy này.
                  </span>
                </div>
              ) : null}
              <div className="form-row" hidden={moi.kind === 'anthropic'}>
                <label htmlFor="n-model">Model mặc định</label>
                <input
                  className="input"
                  id="n-model"
                  value={moi.model}
                  placeholder="google-tts/vi"
                  onChange={(e) => setMoi({ ...moi, model: e.target.value })}
                />
                <span className="hint">
                  Dùng khi giọng của nhân vật để trống. Giọng có dấu gạch chéo thì chính nó là
                  model.
                </span>
              </div>
              <div className="form-row">
                <label htmlFor="n-key">Khoá API</label>
                <input
                  className="input"
                  id="n-key"
                  type="password"
                  value={moi.key}
                  placeholder="để trống nếu chỉ sửa địa chỉ"
                  autoComplete="off"
                  onChange={(e) => setMoi({ ...moi, key: e.target.value })}
                />
                <span className="hint">Khoá lưu ở máy chủ và không hiện lại ở đây.</span>
              </div>
              <button type="button" className="btn btn-gold" onClick={luuNha}>
                Lưu nhà cung cấp
              </button>
            </div>
          </section>
        </div>
      </DialogBody>
    </Dialog>
  );
}
