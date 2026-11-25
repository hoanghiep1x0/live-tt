import { useState } from 'react';
import { boList, doiList, mucList, mucRoster, oChonGiong, suaList, suaRoster, tenMucList, themList } from '@live/contracts';
import type { ConfigField, Json } from '@live/contracts';
import { useDanGiong } from '../lib/danGiong';
import { Switch } from './ui/switch';

interface Props {
  moduleId: string;
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

/** `roster`: hàng tab con, mỗi mục một tab; dưới là các ô của mục đang chọn. */
function DanhSach({ moduleId, field: f, value, disabled, onChange }: Props) {
  const muc = f.options ?? [];
  const [chon, setChon] = useState('');
  const dang = muc.some((m) => m.value === chon) ? chon : (muc[0]?.value ?? '');
  const cua = mucRoster(value, dang);
  return (
    <div className="form-row">
      <label>{f.label}</label>
      <div className="ai-tabs" role="tablist" aria-label={f.label}>
        {muc.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            className="ai-tab"
            aria-selected={m.value === dang}
            data-chon={m.value === dang}
            onClick={() => setChon(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {f.hint ? <span className="hint">{f.hint}</span> : null}
      <div className="form" role="tabpanel">
        {(f.fields ?? []).map((o) => (
          <ConfigRow
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

/** `list`: mỗi mục một khối (các ô + nút Bỏ), dưới cùng nút Thêm. */
function DanhSachMuc({ moduleId, field: f, value, disabled, onChange }: Props) {
  const ds = mucList(value);
  const day = f.max !== undefined && ds.length >= f.max;
  return (
    <div className="form-row">
      <label>{f.label}</label>
      {f.hint ? <span className="hint">{f.hint}</span> : null}
      {ds.map((m, i) => {
        const id = typeof m['id'] === 'string' ? m['id'] : String(i);
        return (
          <fieldset key={id} className="form">
            <legend>
              {tenMucList(f, m, i)}{' '}
              <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || i === 0} onClick={() => onChange(doiList(value, i, i - 1))}>
                ↑
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled || i === ds.length - 1}
                onClick={() => onChange(doiList(value, i, i + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() => onChange(boList(value, i))}
              >
                Bỏ
              </button>
            </legend>
            {(f.fields ?? []).map((o) => (
              <ConfigRow
                key={o.key}
                moduleId={`${moduleId}-${f.key}-${id}`}
                field={o}
                value={m[o.key] ?? null}
                disabled={disabled}
                onChange={(x) => onChange(suaList(value, i, o.key, x))}
              />
            ))}
          </fieldset>
        );
      })}
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled || day}
        onClick={() => onChange(themList(f, value, Math.random().toString(36).slice(2, 10)))}
      >
        {day ? `Tối đa ${f.max}` : `+ Thêm ${f.label.toLowerCase()}`}
      </button>
    </div>
  );
}

/** Một hàng cấu hình trong modal, dựng theo mô tả `fields` của manifest.
 *
 *  Không có `if (moduleId === …)` ở đây: module tự khai nó cần ô gì, trang quản
 *  lý chỉ dựng theo. Thêm module mới thì chỗ này không phải sửa. */
export function ConfigRow(props: Props) {
  // Tách ra trước mọi hook: `roster` dựng cây con riêng, không dùng hook của ô thường.
  if (props.field.type === 'roster') return <DanhSach {...props} />;
  if (props.field.type === 'list') return <DanhSachMuc {...props} />;
  if (props.field.type === 'tu-do') {
    // Tủ đồ cần ảnh từng món và nút xoá thư mục — dựng ở bảng xem thử của sân khấu, nơi có sẵn cảnh 3D để soi.
    const n = Array.isArray(props.value) ? props.value.length : 0;
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">
          {n === 0 ? 'Chưa chọn món nào.' : `Đang mặc ${n} món.`} Chọn, thay và xoá đồ ở bảng xem thử (nút ⚙ trên
          sân khấu) — có ảnh từng món và cảnh 3D để soi ngay.
        </span>
      </div>
    );
  }
  if (props.field.type === 'ket-noi') {
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">
          {typeof props.value === 'string' && props.value !== '' ? props.value : 'Mặc định của kho'} — chọn ở bảng
          xem thử (nút ⚙ trên sân khấu), nơi có danh sách kết nối.
        </span>
      </div>
    );
  }
  if (props.field.type === 'mc-ke-chuyen') {
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">Chọn AI (API / Codex / Claude) ở bảng xem thử (nút ⚙ trên sân khấu).</span>
      </div>
    );
  }
  if (props.field.type === 'vai-giong' || props.field.type === 'kho-truyen') {
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">Chỉnh ở bảng xem thử (nút ⚙ trên sân khấu).</span>
      </div>
    );
  }
  if (props.field.type === 'nguon-chu') {
    const ten = props.value === 'codex' ? 'Codex (tài khoản ChatGPT)' : props.value === 'claude' ? 'Claude Code (tài khoản Claude)' : 'API';
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">{ten} · đổi ở bảng xem thử (nút ⚙ trên sân khấu).</span>
      </div>
    );
  }
  if (props.field.type === 'truyen-sau') {
    const sau = props.value !== null && typeof props.value === 'object' && !Array.isArray(props.value) ? props.value : {};
    const ten = typeof sau['title'] === 'string' ? sau['title'] : '';
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">
          {ten === '' ? 'Đang chuẩn bị…' : ten} — xem và đổi ở bảng xem thử (nút ⚙ trên sân khấu).
        </span>
      </div>
    );
  }
  if (props.field.type === 'nguon-anh') {
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">
          {props.value === true
            ? 'muse.ai — tab trình duyệt trong app, miễn phí'
            : 'API — kết nối vẽ ảnh trong kho, tính tiền mỗi ảnh'}{' '}
          · đổi ở bảng xem thử (nút ⚙ trên sân khấu).
        </span>
      </div>
    );
  }
  if (props.field.type === 'anh-truyen') {
    // Vẽ ảnh cần xem ảnh ngay cạnh truyện — dựng ở bảng xem thử của sân khấu.
    const n = Array.isArray(props.value) ? props.value.length : 0;
    return (
      <div className="form-row">
        <label>{props.field.label}</label>
        <span className="hint">
          {n === 0 ? 'Chưa có ảnh.' : `${n} ảnh.`} AI tự làm khi bật “AI tự tạo ảnh”; xem tiến độ và
          ảnh ở bảng xem thử (nút ⚙ trên sân khấu), tab Ảnh truyện của Kể chuyện.
        </span>
      </div>
    );
  }
  return <OThuong {...props} />;
}

function OThuong({ moduleId, field, value, disabled, onChange }: Props) {
  const dan = useDanGiong(field.type === 'voice');
  const f = oChonGiong(field, dan, value);
  const id = `f-${moduleId}-${f.key}`;
  const nhan = f.unit ? `${f.label} (${f.unit})` : f.label;

  if (f.type === 'toggle') {
    return (
      <label className="form-inline" htmlFor={id}>
        <span>
          <b>{f.label}</b>
          {f.hint ? <small>{f.hint}</small> : null}
        </span>
        <Switch
          checked={value === true}
          onCheckedChange={onChange}
          disabled={disabled}
          label={f.label}
        />
      </label>
    );
  }

  let dieuKhien;
  const ops = f.options ?? [];
  if (f.type === 'gallery' || (f.type === 'select' && ops.length > 0 && ops.every((o) => o.img !== undefined))) {
    // Lưới ảnh: `gallery` bật / tắt từng mục, `select` có ảnh thì chọn một. Mảng
    // giữ thứ tự `options`, không theo thứ tự bấm.
    const nhieu = f.type === 'gallery';
    const bat = nhieu
      ? Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
      : [chuHoac(value)];
    dieuKhien = (
      <div className="luoi-anh" id={id} role="group" aria-label={f.label}>
        {ops.map((o) => {
          const on = bat.includes(o.value);
          return (
            <button
              type="button"
              key={o.value}
              className="luoi-anh-o"
              aria-pressed={on}
              disabled={disabled}
              title={o.label}
              onClick={() => {
                if (!nhieu) return onChange(o.value);
                const sau = on ? bat.filter((v) => v !== o.value) : [...bat, o.value];
                onChange(ops.filter((x) => sau.includes(x.value)).map((x) => x.value));
              }}
            >
              {o.img === undefined ? null : <img src={o.img} alt="" loading="lazy" />}
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    );
  } else if (f.type === 'textarea') {
    dieuKhien = (
      <textarea
        className="input"
        id={id}
        value={chuHoac(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (f.type === 'select') {
    dieuKhien = (
      <select
        className="input"
        id={id}
        value={chuHoac(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {(f.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (f.type === 'range') {
    const n = soHoac(value, f.min ?? 0);
    dieuKhien = (
      <div className="range">
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
      </div>
    );
  } else if (f.type === 'number') {
    dieuKhien = (
      <input
        className="input"
        type="number"
        id={id}
        min={f.min}
        max={f.max}
        step={f.step ?? 1}
        value={soHoac(value, 0)}
        disabled={disabled}
        onChange={(e) => {
          // Ô trống cho ra NaN; giữ nguyên giá trị cũ thay vì ghi NaN xuống đĩa.
          const n = e.target.valueAsNumber;
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    );
  } else {
    dieuKhien = (
      <input
        className="input"
        type={f.type === 'time' ? 'time' : 'text'}
        id={id}
        value={chuHoac(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="form-row">
      <label htmlFor={id}>{nhan}</label>
      {dieuKhien}
      {f.hint ? <span className="hint">{f.hint}</span> : null}
    </div>
  );
}
