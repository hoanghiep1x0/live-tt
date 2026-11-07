import { useEffect, useState } from 'react';
import { Bot, KeyRound, Play, Plus, Star, Trash2 } from 'lucide-react';
import { chuNguon, giongQua, nguonGiong } from '@live/contracts';
import { quenDanGiong } from '../lib/danGiong';
import { api, ttsThu } from '../lib/api';
import type { CastVoice, ProviderInfo, VoiceCfg } from '../lib/api';
import { AiKhoDialog } from './AiKhoDialog';
import { Dialog, DialogBody, DialogClose, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';

const CAU_THU = 'Xin chào cả phòng, đây là giọng đọc thử.';

interface Props {
  onToast(text: string, loi?: boolean): void;
}

export function VoiceDialog({ onToast }: Props) {
  const [ds, setDs] = useState<ProviderInfo[]>([]);
  const [cfg, setCfg] = useState<VoiceCfg | null>(null);
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
        quenDanGiong();
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

  // Chỉ kết nối dùng được cho giọng đọc mới chọn được ở đây.
  const nhaGiong = ds.filter((p) => p.uses.includes('tts'));

  return (
    <Dialog>
      <DialogTrigger className="btn btn-icon btn-ghost" aria-label="Giọng đọc">
        <KeyRound size={16} />
      </DialogTrigger>
      <DialogBody
        size="md"
        icon={<KeyRound size={15} />}
        title="Giọng đọc"
        desc="Mỗi nhân vật một giọng: chọn kết nối giọng đọc trong kho AI dùng chung rồi điền tên giọng. Khoá nằm ở máy chủ và không bao giờ gửi về trang này."
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
                <label className="form-inline hl" htmlFor="voice-multi">
                  <span>
                    <b>{cfg.multi === true ? 'Đa giọng' : 'Đơn giọng'}</b>
                    <small>
                      {cfg.multi === true
                        ? 'Mỗi tính năng đọc bằng giọng chính của nó (tab Giọng đọc). Trong câu, [id-giọng] đổi sang giọng đó, [-] quay về giọng chính. Ví dụ: Ông lão gọi: [ong-lao] Con ơi! [-] Cô bé chạy về.'
                        : 'Cả phòng đọc bằng giọng mặc định (ngôi sao). Giọng riêng của từng tính năng và dấu [id-giọng] trong câu bị bỏ qua.'}
                    </small>
                  </span>
                  <Switch
                    checked={cfg.multi === true}
                    onCheckedChange={(on) => luuGiong({ ...cfg, multi: on })}
                    label="Đa giọng"
                  />
                </label>

                {cfg.cast.length === 0 ? (
                  <p className="hint">
                    Chưa có giọng nào — sân khấu đang dùng giọng máy của trình duyệt. Thêm một giọng
                    ở dưới.
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
                          <Star size={14} className={cfg.default === v.id ? 'la-mac-dinh' : ''} />
                        </button>
                        <span className="v-name">
                          <b>{v.id}</b>
                          <small>
                            {v.role === '' ? 'chưa ghi vai' : v.role} ·{' '}
                            {chuNguon(nguonGiong(v, ds))}
                          </small>
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
                          {nhaGiong.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.hasKey ? '' : ' (thiếu khoá)'}
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
              <b>Kết nối giọng đọc</b>
              <small>
                Khoá nằm ở kho AI dùng chung — nhập một lần, MC và vẽ ảnh cũng chọn từ đó
              </small>
            </div>
            {nhaGiong.length === 0 ? (
              <p className="hint">Chưa có kết nối giọng đọc nào. Mở kho AI để thêm.</p>
            ) : (
              <div className="voice-list">
                {nhaGiong.map((p) => {
                  const doc = cfg === null ? [] : giongQua(cfg.cast, p.id);
                  return (
                  <div className="voice-row" key={p.id}>
                    <span className="v-ico">{p.hasKey ? '🔐' : '⚠️'}</span>
                    <span className="v-name">
                      <b>{p.name}</b>
                      <small>
                        {p.models.tts ?? 'chưa đặt model'}
                        {doc.length === 0 ? ' · chưa đọc cho vai nào' : ` · đọc cho ${doc.join(', ')}`}
                      </small>
                    </span>
                    <span className={p.hasKey ? 'v-tag v-clone' : 'v-tag'}>
                      {p.hasKey ? 'có khoá' : 'thiếu khoá'}
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
            <AiKhoDialog
              onToast={onToast}
              tab="tts"
              onDoi={setDs}
              trigger={
                <button type="button" className="btn" style={{ marginTop: 12 }}>
                  <Bot size={15} />
                  Mở kho kết nối AI
                </button>
              }
            />
          </section>
        </div>
      </DialogBody>
    </Dialog>
  );
}
