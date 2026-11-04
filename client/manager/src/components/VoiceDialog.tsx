import { useEffect, useState } from 'react';
import { KeyRound, Mic, Play, Trash2 } from 'lucide-react';
import { api, ttsThu } from '../lib/api';
import type { ProviderInfo, ProviderKind, VoiceCfg } from '../lib/api';
import { Dialog, DialogBody, DialogClose, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';

const KIEU: Record<ProviderKind, string> = {
  openai: 'Kiểu OpenAI (VieNeu, OpenAI, 9router)',
  elevenlabs: 'ElevenLabs',
};

const CAU_THU = 'Xin chào cả phòng, đây là giọng đọc thử.';

interface Props {
  onToast(text: string, loi?: boolean): void;
}

/** Khoá API và giọng đọc.
 *
 *  Khoá **không bao giờ** đi ngược ra: ô khoá luôn trống, nhập thì đặt khoá mới,
 *  để trống thì giữ khoá cũ. Trang này chỉ biết "nhà nào đã có khoá". */
export function VoiceDialog({ onToast }: Props) {
  const [ds, setDs] = useState<ProviderInfo[]>([]);
  const [cfg, setCfg] = useState<VoiceCfg | null>(null);
  const [moi, setMoi] = useState({ id: '', kind: 'openai' as ProviderKind, baseUrl: '', key: '', model: '' });
  const [dangThu, setDangThu] = useState(false);

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

  const luuNha = (): void => {
    const id = moi.id.trim();
    if (id === '') {
      onToast('Đặt một tên ngắn cho nhà cung cấp, ví dụ vieneu', true);
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

  const luuGiong = (c: VoiceCfg): void => {
    setCfg(c);
    void (async () => {
      try {
        await api.setVoice(c);
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không lưu được', true);
      }
    })();
  };

  const ngheThu = (): void => {
    if (cfg === null) return;
    setDangThu(true);
    void (async () => {
      try {
        const blob = await ttsThu({
          provider: cfg.provider,
          voice: cfg.voice,
          text: CAU_THU,
          speed: cfg.speed,
        });
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.volume = cfg.volume;
        a.onended = () => URL.revokeObjectURL(url);
        await a.play();
        onToast('Đang phát thử giọng');
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không nghe thử được', true);
      } finally {
        setDangThu(false);
      }
    })();
  };

  return (
    <Dialog>
      <DialogTrigger className="btn btn-icon btn-ghost" aria-label="Giọng đọc và khoá API">
        <Mic size={16} />
      </DialogTrigger>
      <DialogBody
        size="md"
        icon={<KeyRound size={15} />}
        title="Giọng đọc"
        desc="Khoá API nằm ở máy chủ, không bao giờ gửi về trang này. Chưa cấu hình nhà cung cấp thì sân khấu dùng giọng máy của trình duyệt."
        foot={<DialogClose className="btn btn-gold">Xong</DialogClose>}
      >
        <div className="quick-grid">
          <section className="quick-sec">
            <div className="quick-head">
              <span className="mod-icon">🎙️</span>
              <b>Giọng đang dùng</b>
              <Switch
                checked={cfg?.enabled === true}
                onCheckedChange={(on) => cfg !== null && luuGiong({ ...cfg, enabled: on })}
                label="Bật đọc to"
              />
            </div>
            {cfg === null ? (
              <p className="hint">Đang đọc cài đặt…</p>
            ) : (
              <div className="form">
                <div className="form-row">
                  <label htmlFor="v-nha">Nhà cung cấp</label>
                  <select
                    className="input"
                    id="v-nha"
                    value={cfg.provider}
                    onChange={(e) => luuGiong({ ...cfg, provider: e.target.value })}
                  >
                    <option value="">Giọng máy của trình duyệt</option>
                    {ds.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.hasKey}>
                        {p.id}
                        {p.hasKey ? '' : ' — chưa có khoá'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="v-giong">Tên giọng</label>
                  <input
                    className="input"
                    id="v-giong"
                    value={cfg.voice}
                    placeholder="vd: Anh Khôi"
                    onChange={(e) => setCfg({ ...cfg, voice: e.target.value })}
                    onBlur={() => luuGiong(cfg)}
                  />
                  <span className="hint">
                    Không có API liệt kê giọng; tên giọng lấy từ trang của nhà cung cấp.
                    ElevenLabs thì điền voice_id.
                  </span>
                </div>
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
                <button
                  type="button"
                  className="btn"
                  disabled={dangThu || cfg.provider === ''}
                  onClick={ngheThu}
                  title={cfg.provider === '' ? 'Chọn nhà cung cấp trước' : 'Nghe thử một câu'}
                >
                  <Play size={15} />
                  Nghe thử
                </button>
              </div>
            )}
          </section>

          <section className="quick-sec">
            <div className="quick-head">
              <span className="mod-icon">🔑</span>
              <b>Nhà cung cấp</b>
            </div>

            {ds.length === 0 ? (
              <p className="hint">Chưa có nhà nào. Thêm một nhà ở dưới.</p>
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
                <label htmlFor="n-id">Tên ngắn</label>
                <input
                  className="input"
                  id="n-id"
                  value={moi.id}
                  placeholder="vieneu"
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
              {moi.kind === 'openai' ? (
                <div className="form-row">
                  <label htmlFor="n-url">Địa chỉ</label>
                  <input
                    className="input"
                    id="n-url"
                    value={moi.baseUrl}
                    placeholder="https://api.vieneu.io/api/v1"
                    onChange={(e) => setMoi({ ...moi, baseUrl: e.target.value })}
                  />
                  <span className="hint">
                    Chỉ nhận https, trừ khi nhà cung cấp chạy ngay trên máy này.
                  </span>
                </div>
              ) : null}
              <div className="form-row">
                <label htmlFor="n-model">Model (tuỳ chọn)</label>
                <input
                  className="input"
                  id="n-model"
                  value={moi.model}
                  placeholder="vieneu-v4"
                  onChange={(e) => setMoi({ ...moi, model: e.target.value })}
                />
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
                <span className="hint">Khoá được lưu ở máy chủ và không hiện lại ở đây.</span>
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
