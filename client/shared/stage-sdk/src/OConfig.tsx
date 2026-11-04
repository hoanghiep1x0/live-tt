import type { ConfigField, Json } from '@live/contracts';

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

/** Thẻ nằm dưới một nút phủ kín mặt thẻ, nên mọi ô chỉnh nhanh phải chặn bubble
 *  — không bấm vào ô lại mở modal. */
function chan(e: { stopPropagation(): void }): void {
  e.stopPropagation();
}

/** Ô cấu hình, dựng theo mô tả `fields` của manifest.
 *
 *  Không có `if (moduleId === …)`: module tự khai nó cần ô gì, sân khấu chỉ
 *  dựng theo. Thêm module mới thì chỗ này không phải sửa.
 *
 *  Cố ý KHÔNG dùng chung component với trang quản lý: trang đó chạy Radix và
 *  Tailwind, còn sân khấu phải nhẹ vì nó là thứ lên sóng. Thứ dùng chung là
 *  `ConfigField` của hợp đồng — tức là phần dễ lệch nhau nhất. */
export function OConfig({ moduleId, field: f, value, disabled, onChange }: Props & { moduleId: string }) {
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
  if (f.type === 'textarea') {
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
