import { useRef, useState } from 'react';
import {
  O_TU_DO,
  bamMon,
  boLenSong,
  boList,
  khoaMon,
  locTuDo,
  mucList,
  mucRoster,
  suaList,
  suaRoster,
  themList,
} from '@live/contracts';
import type { ConfigField, Json } from '@live/contracts';
import { useDesignId } from './Stage';
import { moduleAssetUrl } from './assets';
import { useTuDo, xoaTuDo } from './tu-do';

interface Props {
  field: ConfigField;
  value: Json;
  disabled: boolean;
  onChange(value: Json): void;
}

function soHoac(v: Json, mac: number): number {
  return typeof v === 'number' ? v : mac;
}

function chuHoac(v: Json): string {
  return typeof v === 'string' ? v : '';
}

/** Ô hiện thành lưới ảnh: `gallery`, hoặc `select` mà mục nào cũng có ảnh. */
export function laLuoiAnh(f: ConfigField): boolean {
  const ops = f.options ?? [];
  return f.type === 'gallery' || (f.type === 'select' && ops.length > 0 && ops.every((x) => x.img !== undefined));
}

/** Lưới ảnh nhỏ: `gallery` bấm để bật / tắt từng mục, `select` bấm để chọn một.
 *  Mảng trả về giữ thứ tự của `options`, không theo thứ tự bấm — cấu hình lưu
 *  xuống đĩa không đổi chỉ vì bấm bật lại. */
function OAnh({ id, field: f, value, disabled, onChange }: Props & { id: string }) {
  const ops = f.options ?? [];
  const nhieu = f.type === 'gallery';
  const bat = nhieu
    ? Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
    : [chuHoac(value)];
  return (
    <div className="bx-anh" id={id} role="group" aria-label={f.label}>
      {ops.map((x) => {
        const on = bat.includes(x.value);
        const bam = (): void => {
          if (!nhieu) return onChange(x.value);
          const sau = on ? bat.filter((v) => v !== x.value) : [...bat, x.value];
          onChange(ops.filter((o) => sau.includes(o.value)).map((o) => o.value));
        };
        return (
          <button
            type="button"
            key={x.value}
            className={on ? 'bx-anh-o bx-anh-bat' : 'bx-anh-o'}
            aria-pressed={on}
            disabled={disabled}
            title={x.label}
            onClick={bam}
          >
            {x.img === undefined ? null : <img src={x.img} alt="" loading="lazy" />}
            <span>{x.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Thẻ nằm dưới một nút phủ kín mặt thẻ, nên mọi ô chỉnh nhanh phải chặn bubble
 *  — không bấm vào ô lại mở modal. */
function chan(e: { stopPropagation(): void }): void {
  e.stopPropagation();
}

/** Nút "AI viết" cho những ô có khai `ai` trong manifest.
 *
 *  Chữ trả về chỉ ĐIỀN VÀO Ô, không tự lưu: người vận hành đọc rồi sửa rồi mới
 *  quyết — máy viết hộ chứ không viết thay. */
function NhoAiViet({
  what,
  disabled,
  onText,
}: {
  what: string;
  disabled: boolean;
  onText(text: string): void;
}) {
  const designId = useDesignId();
  const [mo, setMo] = useState(false);
  const [y, setY] = useState('');
  const [dangLam, setDangLam] = useState(false);
  const [loi, setLoi] = useState('');

  async function nho(): Promise<void> {
    setLoi('');
    setDangLam(true);
    try {
      const r = await fetch(`/s/viet/${designId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what, extra: y }),
      });
      const j = (await r.json()) as { text?: string; error?: string };
      if (!r.ok || j.text === undefined) throw new Error(j.error ?? 'không nhờ được AI viết');
      onText(j.text);
      setMo(false);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'không nhờ được AI viết');
    } finally {
      setDangLam(false);
    }
  }

  return (
    <div className="bx-ai-viet">
      <div className="bx-media-nut">
        <button
          type="button"
          className="bx-nho"
          disabled={disabled || dangLam}
          onClick={() => setMo(!mo)}
        >
          {dangLam ? 'Đang viết…' : 'AI viết'}
        </button>
        {!mo ? null : (
          <>
            <input
              className="bx-o"
              type="text"
              placeholder="Ý của anh, ví dụ: chuyện cổ tích về lòng hiếu thảo"
              value={y}
              disabled={dangLam}
              onChange={(e) => setY(e.target.value)}
            />
            <button type="button" className="bx-nho" disabled={dangLam} onClick={() => void nho()}>
              Viết
            </button>
          </>
        )}
      </div>
      {loi === '' ? null : <span className="bx-media-loi">{loi}</span>}
    </div>
  );
}

/** Ô ảnh / video: dán đường dẫn, tải file lên, hoặc nhờ AI vẽ.
 *
 *  Ba đường cùng về MỘT chỗ: một chuỗi đường dẫn. File tải lên và ảnh AI vẽ
 *  được cất ở kho của phòng (`database/designs/<id>/media`) rồi trả về đường
 *  dẫn `/u/…`, nên module chỉ thấy một đường dẫn như mọi đường dẫn khác và
 *  không cần biết nó tới từ đâu.
 *
 *  Gửi thẳng tới backend chứ không qua kênh lệnh: lệnh đi bằng WebSocket dạng
 *  JSON, nhét một file video mấy chục MB vào đó là nghẽn cả đường tin của
 *  phòng đang live. */
function OMedia({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: Json;
  disabled: boolean;
  onChange(v: Json): void;
}) {
  const designId = useDesignId();
  const chonFile = useRef<HTMLInputElement>(null);
  const [dangLam, setDangLam] = useState('');
  const [loi, setLoi] = useState('');
  const [taAnh, setTaAnh] = useState<string | null>(null);

  async function guiFile(f: File): Promise<void> {
    setLoi('');
    setDangLam('Đang tải lên…');
    try {
      const ext = f.name.split('.').pop() ?? '';
      const r = await fetch(`/s/media/${designId}?ext=${encodeURIComponent(ext)}`, {
        method: 'POST',
        headers: { 'Content-Type': f.type || 'application/octet-stream' },
        body: f,
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || j.url === undefined) throw new Error(j.error ?? 'không tải lên được');
      onChange(j.url);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'không tải lên được');
    } finally {
      setDangLam('');
    }
  }

  async function nhoVe(ta: string): Promise<void> {
    setLoi('');
    setDangLam('Đang vẽ…');
    try {
      const r = await fetch(`/s/media/${designId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: ta }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || j.url === undefined) throw new Error(j.error ?? 'không vẽ được');
      onChange(j.url);
      setTaAnh(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'không vẽ được');
    } finally {
      setDangLam('');
    }
  }

  const duong = chuHoac(value);
  return (
    <div className="bx-media">
      <input
        className="bx-o"
        type="text"
        id={id}
        placeholder="Dán đường dẫn, hoặc tải lên / nhờ AI vẽ"
        value={duong}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="bx-media-nut">
        <input
          ref={chonFile}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f !== undefined) void guiFile(f);
          }}
        />
        <button
          type="button"
          className="bx-nho"
          disabled={disabled || dangLam !== ''}
          onClick={() => chonFile.current?.click()}
        >
          Tải lên
        </button>
        <button
          type="button"
          className="bx-nho"
          disabled={disabled || dangLam !== ''}
          onClick={() => setTaAnh(taAnh === null ? '' : null)}
        >
          AI vẽ ảnh
        </button>
        {duong === '' ? null : (
          <button
            type="button"
            className="bx-nho"
            disabled={disabled || dangLam !== ''}
            onClick={() => onChange('')}
          >
            Bỏ
          </button>
        )}
        {dangLam === '' ? null : <span className="bx-media-trang">{dangLam}</span>}
      </div>

      {taAnh === null ? null : (
        <div className="bx-media-nut">
          <input
            className="bx-o"
            type="text"
            placeholder="Tả cảnh cần vẽ, ví dụ: cây vú sữa trong vườn quê lúc hoàng hôn"
            value={taAnh}
            disabled={disabled || dangLam !== ''}
            onChange={(e) => setTaAnh(e.target.value)}
          />
          <button
            type="button"
            className="bx-nho"
            disabled={disabled || dangLam !== '' || taAnh.trim() === ''}
            onClick={() => void nhoVe(taAnh)}
          >
            Vẽ
          </button>
        </div>
      )}

      {loi === '' ? null : <span className="bx-media-loi">{loi}</span>}
      {duong === '' ? null : <span className="bx-media-xem">{duong}</span>}
    </div>
  );
}

/** Ô cấu hình, dựng theo mô tả `fields` của manifest.
 *
 *  Không có `if (moduleId === …)`: module tự khai nó cần ô gì, sân khấu chỉ
 *  dựng theo. Thêm module mới thì chỗ này không phải sửa.
 *
 *  Cố ý KHÔNG dùng chung component với trang quản lý: trang đó chạy Radix và
 *  Tailwind, còn sân khấu phải nhẹ vì nó là thứ lên sóng. Thứ dùng chung là
 *  `ConfigField` của hợp đồng — tức là phần dễ lệch nhau nhất. */
/** `roster`: hàng tab con, mỗi mục một tab; dưới là các ô của mục đang chọn. */
function ODanhSach({ moduleId, field: f, value, disabled, onChange }: Props & { moduleId: string }) {
  const muc = f.options ?? [];
  const [chon, setChon] = useState('');
  const dang = muc.some((m) => m.value === chon) ? chon : (muc[0]?.value ?? '');
  const cua = mucRoster(value, dang);
  return (
    <div className="bx-ds">
      <span className="bx-ds-nhan">{f.label}</span>
      <div className="bx-tabs bx-ds-tabs" role="tablist" aria-label={f.label}>
        {muc.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            className="bx-tab"
            aria-selected={m.value === dang}
            onClick={() => setChon(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {f.hint === undefined ? null : <span className="bx-goi">{f.hint}</span>}
      <div className="bx-ds-than" role="tabpanel">
        {(f.fields ?? []).map((o) => (
          <OConfig
            key={`${dang}/${o.key}`}
            moduleId={`${moduleId}-${f.key}-${dang}`}
            field={o}
            value={cua[o.key] ?? null}
            disabled={disabled}
            onChange={(x) => onChange(suaRoster(value, dang, o.key, x))}
          />
        ))}
      </div>
    </div>
  );
}

/** Id cho mục mới của `list`. Chỉ cần không trùng trong một danh sách. */
function idMoi(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** `list`: mỗi mục một thẻ (các ô của mục + nút Bỏ), dưới cùng nút Thêm. */
function ODanhSachMuc({ moduleId, field: f, value, disabled, onChange }: Props & { moduleId: string }) {
  const ds = mucList(value);
  const day = f.max !== undefined && ds.length >= f.max;
  return (
    <div className="bx-ds">
      <span className="bx-ds-nhan">{f.label}</span>
      {f.hint === undefined ? null : <span className="bx-goi">{f.hint}</span>}
      {ds.map((m, i) => {
        const id = typeof m['id'] === 'string' ? m['id'] : String(i);
        return (
          <section key={id} className="bx-muc-the">
            <div className="bx-muc-the-dau">
              <b>{typeof m['ten'] === 'string' && m['ten'] !== '' ? m['ten'] : `${f.label} ${i + 1}`}</b>
              <button
                type="button"
                className="bx-muc-bo"
                disabled={disabled}
                onClick={() => onChange(boList(value, i))}
              >
                Bỏ
              </button>
            </div>
            {(f.fields ?? []).map((o) => (
              <OConfig
                key={o.key}
                moduleId={`${moduleId}-${f.key}-${id}`}
                field={o}
                value={m[o.key] ?? null}
                disabled={disabled}
                onChange={(x) => onChange(suaList(value, i, o.key, x))}
              />
            ))}
          </section>
        );
      })}
      <button
        type="button"
        className="bx-muc-them"
        disabled={disabled || day}
        onClick={() => onChange(themList(f, value, idMoi()))}
      >
        {day ? `Tối đa ${f.max}` : `+ Thêm ${f.label.toLowerCase()}`}
      </button>
    </div>
  );
}

const TEN_VUNG: Record<string, string> = { nguc: 'ngực', hang: 'vùng kín' };

/** `tu-do`: tủ đồ của module — tab theo ô, lưới ảnh bấm mặc / cởi, xoá món hoặc cả nguồn ngay tại đây. */
function OTuDo({ moduleId, field: f, value, disabled, onChange }: Props & { moduleId: string }) {
  // Chỉ đồ ôm theo thân nhân vật của module, và chỉ đồ người lớn (locTuDo).
  const than = f.than ?? '';
  const ds = locTuDo(useTuDo(moduleId), than);
  // Khoá món đã bị xoá khỏi tủ (hay khoá kiểu cũ) thì bỏ — không đếm, không hiện là đang mặc.
  const dangMac = (Array.isArray(value) ? value : []).filter(
    (v): v is string => typeof v === 'string' && ds.some((m) => khoaMon(m) === v),
  );
  const coO = O_TU_DO.filter((o) => ds.some((m) => m.o === o.id));
  const [chon, setChon] = useState('');
  const o = coO.some((x) => x.id === chon) ? chon : (coO[0]?.id ?? '');
  const [bao, setBao] = useState('');
  const bo = boLenSong(ds, dangMac);
  const tuThem = bo === null ? [] : bo.filter((m) => !dangMac.includes(khoaMon(m)));
  const nguon = [...new Set(ds.map((m) => m.nguon))];

  async function xoa(duong: string, ten: string): Promise<void> {
    if (!window.confirm(`Xoá "${ten}" khỏi tủ đồ? Xoá là xoá hẳn thư mục trên máy.`)) return;
    const loi = await xoaTuDo(moduleId, duong);
    setBao(loi === null ? `Đã xoá ${ten}` : `Không xoá được: ${loi}`);
    if (loi === null) onChange(dangMac.filter((k) => !k.startsWith(duong)));
  }

  return (
    <div className="bx-ds">
      <span className="bx-ds-nhan">{f.label}</span>
      {f.hint === undefined ? null : <span className="bx-goi">{f.hint}</span>}
      {ds.length === 0 ? (
        <p className="bx-goi">Tủ đồ trống — chép món vào assets/tu-do của module.</p>
      ) : (
        <>
          <p className="bx-td-tt" data-loi={bo === null}>
            {dangMac.length === 0
              ? 'Chưa chọn món nào — đang dùng bộ dựng sẵn.'
              : bo === null
                ? 'Bộ này chưa che đủ và tủ không có đồ lót phù hợp — sân khấu giữ bộ dựng sẵn.'
                : `Đang mặc ${dangMac.length} món${tuThem.length > 0 ? ` · tự mặc kèm ${tuThem.map((m) => m.ten).join(', ')}` : ''}`}
            {dangMac.length === 0 ? null : (
              <button type="button" className="bx-muc-bo" disabled={disabled} onClick={() => onChange([])}>
                Cởi hết
              </button>
            )}
          </p>
          <div className="bx-tabs bx-ds-tabs" role="tablist" aria-label={f.label}>
            {coO.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                className="bx-tab"
                aria-selected={x.id === o}
                onClick={() => setChon(x.id)}
              >
                {x.ten} <small>{ds.filter((m) => m.o === x.id).length}</small>
              </button>
            ))}
          </div>
          <div className="bx-anh" role="group" aria-label={coO.find((x) => x.id === o)?.ten}>
            {ds
              .filter((m) => m.o === o)
              .map((m) => {
                const k = khoaMon(m);
                const on = dangMac.includes(k);
                return (
                  <div key={k} className="bx-td-o">
                    <button
                      type="button"
                      className={on ? 'bx-anh-o bx-anh-bat' : 'bx-anh-o'}
                      aria-pressed={on}
                      disabled={disabled}
                      title={`${m.ten} — ${m.giayPhep ?? '?'} · ${m.tacGia ?? '?'}`}
                      onClick={() => onChange(bamMon(ds, dangMac, k))}
                    >
                      <img src={moduleAssetUrl(moduleId, `${m.duong}anh.webp`)} alt="" loading="lazy" />
                      <span>{m.ten}</span>
                      <small className="bx-td-che">
                        {m.che.length === 0 ? 'không che vùng nào' : `che ${m.che.map((v) => TEN_VUNG[v] ?? v).join(', ')}`}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="bx-td-xoa"
                      aria-label={`Xoá ${m.ten}`}
                      title="Xoá món này khỏi tủ"
                      disabled={disabled}
                      onClick={() => void xoa(k, m.ten)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
          </div>
          <div className="bx-td-nguon">
            {nguon.map((n) => (
              <span key={n}>
                {n} · {ds.filter((m) => m.nguon === n).length} món
                <button
                  type="button"
                  className="bx-muc-bo"
                  disabled={disabled}
                  onClick={() => void xoa(`${than}/${n}`, `cả nguồn ${n}`)}
                >
                  Xoá cả nguồn
                </button>
              </span>
            ))}
          </div>
          {bao === '' ? null : <p className="bx-goi">{bao}</p>}
        </>
      )}
    </div>
  );
}

export function OConfig({ moduleId, field: f, value, disabled, onChange }: Props & { moduleId: string }) {
  if (f.type === 'tu-do') {
    return <OTuDo moduleId={moduleId} field={f} value={value} disabled={disabled} onChange={onChange} />;
  }
  if (f.type === 'list') {
    return <ODanhSachMuc moduleId={moduleId} field={f} value={value} disabled={disabled} onChange={onChange} />;
  }
  if (f.type === 'roster') {
    return <ODanhSach moduleId={moduleId} field={f} value={value} disabled={disabled} onChange={onChange} />;
  }
  const id = `xem-${moduleId}-${f.key}`;
  const nhan = f.unit === undefined ? f.label : `${f.label} (${f.unit})`;

  if (f.type === 'toggle') {
    return (
      <label className="bx-dong" htmlFor={id}>
        <span>
          <b>{f.label}</b>
          {f.hint === undefined ? null : <small>{f.hint}</small>}
        </span>
        <input
          type="checkbox"
          id={id}
          checked={value === true}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  let o;
  if (laLuoiAnh(f)) {
    o = <OAnh id={id} field={f} value={value} disabled={disabled} onChange={onChange} />;
  } else if (f.type === 'textarea') {
    o = (
      <textarea
        className="bx-o"
        id={id}
        rows={5}
        value={chuHoac(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (f.type === 'select') {
    o = (
      <select
        className="bx-o"
        id={id}
        value={chuHoac(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {(f.options ?? []).map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    );
  } else if (f.type === 'range') {
    const n = soHoac(value, f.min ?? 0);
    o = (
      <span className="bx-truot">
        <input
          type="range"
          id={id}
          min={f.min ?? 0}
          max={f.max ?? 100}
          step={f.step ?? 1}
          value={n}
          disabled={disabled}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <output>{n}</output>
      </span>
    );
  } else if (f.type === 'number') {
    o = (
      <input
        className="bx-o"
        type="number"
        id={id}
        min={f.min}
        max={f.max}
        step={f.step ?? 1}
        value={soHoac(value, 0)}
        disabled={disabled}
        onChange={(e) => {
          // Ô trống cho ra NaN; giữ giá trị cũ thay vì ghi NaN xuống đĩa.
          const n = e.target.valueAsNumber;
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    );
  } else if (f.type === 'media') {
    o = <OMedia id={id} value={value} disabled={disabled} onChange={onChange} />;
  } else {
    o = (
      <input
        className="bx-o"
        type={f.type === 'time' ? 'time' : 'text'}
        id={id}
        value={chuHoac(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="bx-hang">
      <label htmlFor={id}>{nhan}</label>
      {o}
      {f.ai === undefined ? null : (
        <NhoAiViet what={f.ai} disabled={disabled} onText={(t) => onChange(t)} />
      )}
      {f.hint === undefined ? null : <span className="bx-goi">{f.hint}</span>}
    </div>
  );
}

/** Ô chỉnh nhanh ngay trên thẻ. Nhãn ngắn lấy từ `short` của manifest. */
export function ONhanh({ field: f, value, disabled, onChange }: Props) {
  const nhan = f.short ?? f.label;

  let o;
  if (f.type === 'toggle') {
    o = (
      <input
        type="checkbox"
        checked={value === true}
        disabled={disabled}
        aria-label={f.label}
        onClick={chan}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  } else if (f.type === 'range') {
    const n = soHoac(value, f.min ?? 0);
    o = (
      <>
        <input
          type="range"
          min={f.min ?? 0}
          max={f.max ?? 100}
          step={f.step ?? 1}
          value={n}
          disabled={disabled}
          aria-label={f.label}
          onClick={chan}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <output>{n}</output>
      </>
    );
  } else if (f.type === 'select') {
    o = (
      <select
        className="bx-o bx-o-nho"
        value={chuHoac(value)}
        disabled={disabled}
        aria-label={f.label}
        onClick={chan}
        onChange={(e) => onChange(e.target.value)}
      >
        {(f.options ?? []).map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    );
  } else if (f.type === 'number') {
    o = (
      <input
        className="bx-o bx-o-nho"
        type="number"
        min={f.min}
        max={f.max}
        step={f.step ?? 1}
        value={soHoac(value, 0)}
        disabled={disabled}
        aria-label={f.label}
        onClick={chan}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    );
  } else {
    o = (
      <input
        className="bx-o bx-o-nho"
        type={f.type === 'time' ? 'time' : 'text'}
        value={chuHoac(value)}
        disabled={disabled}
        aria-label={f.label}
        onClick={chan}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <span className={`bx-q bx-q-${f.type}`} title={f.label}>
      <span className="bx-q-nhan">{nhan}</span>
      {o}
    </span>
  );
}
