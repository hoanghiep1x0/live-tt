import { oChonGiong } from '@live/contracts';
import type { ConfigField, Json } from '@live/contracts';
import { useDanGiong } from '../lib/danGiong';
import { Switch } from './ui/switch';

interface Props {
  field: ConfigField;
  value: Json;
  disabled: boolean;
  onChange(v: Json): void;
}

/** Một ô chỉnh nhanh ngay trên thẻ. Nhãn ngắn lấy từ `short` của manifest. */
export function QuickCell({ field, value, disabled, onChange }: Props) {
  const dan = useDanGiong(field.type === 'voice');
  const f = oChonGiong(field, dan, value);
  const nhan = f.short ?? f.label;

  let o;
  if (f.type === 'toggle') {
    o = (
      <Switch
        checked={value === true}
        onCheckedChange={onChange}
        disabled={disabled}
        small
        label={f.label}
      />
    );
  } else if (f.type === 'range') {
    const n = typeof value === 'number' ? value : (f.min ?? 0);
    o = (
      <>
        <input
          type="range"
          min={f.min ?? 0}
          max={f.max ?? 100}
          value={n}
          disabled={disabled}
          aria-label={f.label}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <output>{n}</output>
      </>
    );
  } else if (f.type === 'select') {
    o = (
      <select
        className="input input-xs"
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        aria-label={f.label}
        onClick={(e) => e.stopPropagation()}
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
        className="input input-xs"
        type="number"
        min={f.min}
        max={f.max}
        value={typeof value === 'number' ? value : 0}
        disabled={disabled}
        aria-label={f.label}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    );
  } else {
    o = (
      <input
        className="input input-xs"
        type={f.type === 'time' ? 'time' : 'text'}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        aria-label={f.label}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <span className={`q q-${f.type}`} title={f.label}>
      <span className="q-lbl">{nhan}</span>
      {o}
    </span>
  );
}
