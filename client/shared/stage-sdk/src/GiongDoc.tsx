import { useCallback, useEffect, useRef, useState } from 'react';
import { chuNguon, loiGiong, nguonGiong, tenKetNoi } from '@live/contracts';
import type { KetNoiAi } from '@live/contracts';
import type { CastVoice, VoiceCfg } from './audio';
import { useStage } from './Stage';

/** Dàn giọng — phần dùng chung như kho Kết nối AI: mỗi giọng là "đọc bằng kết
 *  nối nào, giọng tên gì". Tính năng của từng phòng (kể chuyện, chào khách, MC)
 *  chỉ chọn giọng nào trong dàn, và lựa chọn đó lưu theo phòng — sửa dàn ở
 *  đây không đổi tính năng nào của phòng khác sang giọng khác.
 *
 *  Cùng một kho với hộp Giọng đọc của trang quản lý (`/s/voice` và `/api/voice`
 *  ghi chung một file), nên sửa ở đâu thì nơi kia thấy ngay. */

const CAU_THU = 'Xin chào cả phòng, đây là giọng đọc thử.';

/** Đọc kho kết nối một lần lúc mở. Không bao giờ có giá trị khoá. */
function useKho(): KetNoiAi[] {
  const [ds, setDs] = useState<KetNoiAi[]>([]);
  useEffect(() => {
    void fetch('/s/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((j: { providers?: KetNoiAi[] }) => setDs(j.providers ?? []))
      .catch(() => setDs([]));
  }, []);
  return ds;
}

/** Nhãn nguồn của một giọng: tên kết nối (đúng tên ở thẻ Kết nối AI) rồi dịch
 *  vụ đọc và giá. Cùng tên ở hai thẻ thì nhìn là nối được giọng nào đi qua
 *  kết nối nào. */
function NhanNguon({ g, kho }: { g: CastVoice; kho: readonly KetNoiAi[] }) {
  const n = nguonGiong(g, kho);
  if (n === null) return <span className="bx-nguon-chu">chưa có kết nối</span>;
  const gia = n.mienPhi === null ? '' : n.mienPhi ? ' · miễn phí' : ' · trả phí';
  return (
    <>
      <span className="bx-nhan-ket-noi" data-mien-phi={n.mienPhi ?? undefined}>
        {n.quaKetNoi}
      </span>
      <span className="bx-nguon-chu">
        {n.dichVu === n.quaKetNoi ? '' : n.dichVu}
        {gia}
      </span>
    </>
  );
}

/** Thẻ dàn giọng ở mục dùng chung của ngăn xem thử. */
export function TheGiong({ mo }: { mo: () => void }) {
  const s = useStage();
  const kho = useKho();
  const cast = s.voice.cast;
  const hong = cast.filter((g) => loiGiong(g, kho) !== null).length;
  const tom =
    cast.length === 0
      ? 'Chưa có giọng nào — đọc to sẽ im lặng'
      : !s.voice.enabled
        ? `${cast.length} giọng · đang tắt đọc to`
        : hong === 0
          ? `${cast.length} giọng, đọc được hết`
          : `${cast.length} giọng, ${hong} giọng chưa đọc được`;

  return (
    <article className="bx-the bx-the-kho" data-bat={cast.length > 0 && hong === 0 && s.voice.enabled}>
      <button type="button" className="bx-cham" aria-label="Sửa dàn giọng" onClick={mo} />
      <div className="bx-the-dau">
        <span className="bx-icon">🗣</span>
        <span className="bx-ten">
          <b>Giọng đọc</b>
          <small>{tom}</small>
        </span>
        <button type="button" className="bx-kho-mo-nho" onClick={mo}>
          {cast.length === 0 ? 'Thêm giọng' : 'Sửa'}
        </button>
      </div>
      {/* Gọn một hàng: vai + chấm xanh / đỏ; ★ là giọng mặc định. Chi tiết khi rê chuột. */}
      {cast.length === 0 ? null : (
        <ul className="bx-gon-ds" onClick={mo}>
          {cast.map((g) => {
            const loi = loiGiong(g, kho);
            const nha = kho.find((p) => p.id === g.provider);
            const ta = `${nha === undefined ? g.provider : tenKetNoi(nha)}${g.voice.trim() === '' ? '' : ` · ${g.voice}`} · ${loi ?? 'đọc được'}`;
            return (
              <li key={g.id} data-co={loi === null} title={`${g.role} · ${ta}`}>
                {g.id === s.voice.default ? '★ ' : ''}
                {/* Chỉ tên vai ngắn ("Nam dẫn chuyện — lời nhân vật nam" → "Nam dẫn chuyện"). */}
                {(g.role.split(/\s[—–-]\s|,/)[0] ?? '').trim() || g.id}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function giongMoi(cast: readonly CastVoice[], nha: string): CastVoice {
  let i = cast.length + 1;
  while (cast.some((g) => g.id === `giong-${i}`)) i += 1;
  return { id: `giong-${i}`, provider: nha, voice: '', role: '' };
}

/** Hộp sửa dàn giọng. Cùng cơ chế với hộp Kết nối AI: bảng danh sách, bấm Sửa
 *  mới mở form của dòng đó. Không ghi gì cho tới khi bấm Lưu — sửa dở một
 *  giọng mà sân khấu đã đổi sang đọc bằng giọng hỏng là phòng đang live im
 *  bặt. */
export function ModalGiong({ dong }: { dong: () => void }) {
  const s = useStage();
  const kho = useKho();
  const nhaGiong = kho.filter((p) => p.uses.includes('tts'));
  const [cfg, setCfg] = useState<VoiceCfg>(s.voice);
  const [dang, setDang] = useState<number | null>(null);
  const [bao, setBao] = useState('');
  const [thu, setThu] = useState('');
  const amThanh = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => amThanh.current?.pause(), []);

  const sua = (i: number, v: Partial<CastVoice>): void =>
    setCfg((c) => ({ ...c, cast: c.cast.map((g, j) => (j === i ? { ...g, ...v } : g)) }));

  const luu = useCallback(() => {
    setBao('đang lưu…');
    void fetch('/s/voice', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `máy chủ trả mã ${r.status}`);
        }
        const j = (await r.json()) as { voice: VoiceCfg };
        setCfg(j.voice);
        setBao('Đã lưu dàn giọng');
      })
      .catch((e: unknown) => setBao(e instanceof Error ? e.message : 'không lưu được'));
  }, [cfg]);

  const ngheThu = (g: CastVoice): void => {
    setThu(g.id);
    void fetch('/s/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: g.provider, voice: g.voice, text: CAU_THU, speed: cfg.speed }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `máy chủ trả mã ${r.status}`);
        }
        const url = URL.createObjectURL(await r.blob());
        amThanh.current?.pause();
        const a = new Audio(url);
        amThanh.current = a;
        a.volume = cfg.volume;
        a.onended = () => URL.revokeObjectURL(url);
        await a.play();
        setBao('');
      })
      .catch((e: unknown) => setBao(e instanceof Error ? e.message : 'không nghe thử được'))
      .finally(() => setThu(''));
  };

  const g = dang === null ? undefined : cfg.cast[dang];
  const nha = g === undefined ? undefined : kho.find((p) => p.id === g.provider);
  const loi = g === undefined ? null : loiGiong(g, kho);

  return (
    <div className="bx-tam" role="dialog" aria-modal aria-label="Giọng đọc">
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">🗣</span>
          <span className="bx-ten">
            <b>Giọng đọc</b>
            <small>Dàn giọng dùng chung — mỗi tính năng chọn giọng của mình trong dàn này</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="bx-than">
          <label className="bx-dong bx-dong-chinh">
            <span>
              <b>Đọc to</b>
              <small>Tắt thì mọi tính năng chỉ hiện chữ, không đọc</small>
            </span>
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            />
          </label>
          <label className="bx-dong">
            <span>
              <b>Đa giọng</b>
              <small>
                {cfg.multi
                  ? 'Mình tự chọn giọng theo vai từng câu; mỗi tính năng đọc bằng giọng của nó (chọn "Tự đổi giọng" là mỗi câu một giọng).'
                  : 'Đang đơn giọng: cả phòng đọc bằng giọng mặc định ★, giọng riêng của từng tính năng bị bỏ qua.'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={cfg.multi}
              aria-label="Đa giọng"
              onChange={(e) => setCfg({ ...cfg, multi: e.target.checked })}
            />
          </label>
          <label className="bx-dong">
            <span>
              <b>Tốc độ đọc</b>
              <small>{cfg.speed.toFixed(2)}×</small>
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={cfg.speed}
              aria-label="Tốc độ đọc"
              onChange={(e) => setCfg({ ...cfg, speed: e.target.valueAsNumber })}
            />
          </label>

          <div className="bx-kho-dau">
            <b>Dàn giọng</b>
            <button
              type="button"
              className="bx-kho-sua"
              onClick={() => {
                setCfg((c) => ({ ...c, cast: [...c.cast, giongMoi(c.cast, nhaGiong[0]?.id ?? '')] }));
                setDang(cfg.cast.length);
              }}
            >
              + Thêm giọng
            </button>
          </div>

          {nhaGiong.length === 0 ? (
            <p className="bx-kho-trong">
              Chưa có kết nối nào làm được việc Giọng đọc. Mở thẻ Kết nối AI, sửa một kết nối và
              tích “Giọng đọc”.
            </p>
          ) : null}

          {cfg.cast.length === 0 ? null : (
            <table className="bx-kho-bang">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Giọng</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {cfg.cast.map((x, i) => {
                  const l = loiGiong(x, kho);
                  return (
                    <tr key={`${i}:${x.id}`} data-dang={dang === i}>
                      <td className="bx-kho-stt">{x.id === cfg.default ? '★' : i + 1}</td>
                      <td>
                        <b>{x.role.trim() === '' ? x.id : x.role}</b>
                        <small className="bx-giong-nguon">
                          <NhanNguon g={x} kho={kho} />
                        </small>
                        <small className="bx-giong-loi" data-loi={l !== null}>
                          {l ?? 'đọc được'}
                        </small>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="bx-kho-sua"
                          aria-label={`Sửa giọng ${x.id}`}
                          onClick={() => setDang(i)}
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {g === undefined || dang === null ? null : (
            <div className="bx-kho-form">
              <label>
                <span>Mã giọng</span>
                <input
                  className="bx-o bx-o-nho"
                  value={g.id}
                  aria-label="Mã giọng"
                  onChange={(e) => sua(dang, { id: e.target.value.trim().toLowerCase() })}
                />
              </label>
              <label>
                <span>Vai</span>
                <input
                  className="bx-o bx-o-nho"
                  value={g.role}
                  placeholder="giọng dẫn truyện, bé gái, chào khách…"
                  aria-label="Vai của giọng"
                  onChange={(e) => sua(dang, { role: e.target.value })}
                />
              </label>
              <label>
                <span>Kết nối</span>
                <select
                  className="bx-o bx-o-nho"
                  value={g.provider}
                  aria-label="Kết nối đọc giọng"
                  onChange={(e) => sua(dang, { provider: e.target.value })}
                >
                  <option value="">— chọn kết nối —</option>
                  {nhaGiong.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.hasKey ? tenKetNoi(p) : `${tenKetNoi(p)} (thiếu khoá)`}
                    </option>
                  ))}
                  {g.provider !== '' && !nhaGiong.some((p) => p.id === g.provider) ? (
                    <option value={g.provider}>{g.provider} (không dùng được)</option>
                  ) : null}
                </select>
              </label>
              <label>
                <span>Tên giọng</span>
                <input
                  className="bx-o bx-o-nho"
                  value={g.voice}
                  placeholder={
                    (nha?.models.tts ?? '') === ''
                      ? 'vd edge-tts/vi-VN-HoaiMyNeural'
                      : `trống là dùng model ${nha?.models.tts ?? ''}`
                  }
                  aria-label="Tên giọng"
                  onChange={(e) => sua(dang, { voice: e.target.value })}
                />
              </label>
              <p className="bx-giong-doi">
                Đọc bằng: <b>{chuNguon(nguonGiong(g, kho))}</b>. Muốn đổi giọng miễn phí sang trả
                phí: cắm khoá nhà đó (ElevenLabs, OpenAI…) ở thẻ Kết nối AI, rồi chọn kết nối ấy ở
                ô Kết nối và điền tên giọng của nhà đó. Mọi tính năng đang dùng giọng{' '}
                <b>{g.id}</b> đổi theo ngay khi lưu.
              </p>
              {loi === null ? null : <p className="bx-kho-bao">{loi}</p>}
              <div className="bx-kho-nut">
                <button
                  type="button"
                  className="bx-kho-sua"
                  disabled={loi !== null || thu !== ''}
                  onClick={() => ngheThu(g)}
                >
                  {thu === g.id ? 'đang đọc…' : '▶ Nghe thử'}
                </button>
                <button
                  type="button"
                  className="bx-kho-sua"
                  disabled={cfg.default === g.id}
                  onClick={() => setCfg({ ...cfg, default: g.id })}
                >
                  ★ Giọng mặc định
                </button>
                <button
                  type="button"
                  className="bx-kho-sua"
                  onClick={() => {
                    setCfg({ ...cfg, cast: cfg.cast.filter((_, j) => j !== dang) });
                    setDang(null);
                  }}
                >
                  Xoá giọng
                </button>
              </div>
            </div>
          )}
          {bao === '' ? null : <p className="bx-kho-bao">{bao}</p>}
        </div>

        <div className="bx-chan2">
          <button type="button" className="bx-xong" onClick={luu}>
            Lưu dàn giọng
          </button>
          <button type="button" className="bx-kho-huy" onClick={dong}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
