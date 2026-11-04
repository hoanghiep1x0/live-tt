import type { ConfigField, Json } from '@live/contracts';
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

/** Một hàng cấu hình trong modal, dựng theo mô tả `fields` của manifest.
 *
 *  Không có `if (moduleId === …)` ở đây: module tự khai nó cần ô gì, trang quản
 *  lý chỉ dựng theo. Thêm module mới thì chỗ này không phải sửa. */
export function ConfigRow({ moduleId, field: f, value, disabled, onChange }: Props) {
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
  if (f.type === 'textarea') {
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
