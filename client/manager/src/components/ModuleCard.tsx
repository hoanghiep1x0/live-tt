import type { Json } from '@live/contracts';
import type { Registered } from '../lib/registry';
import { hopCauHinh, tenSuKien } from '../lib/registry';
import type { ModuleState } from '../lib/api';
import { Dialog, DialogTrigger } from './ui/dialog';
import { ModuleDialog } from './ModuleDialog';
import { QuickCell } from './QuickRow';
import { Switch } from './ui/switch';

interface Props {
  r: Registered;
  st: ModuleState | undefined;
  /** Không có thiết kế nào đang phát thì không có chỗ để áp cấu hình. */
  disabled: boolean;
  onBat(on: boolean): void;
  onLuu(config: Record<string, Json>): void;
  /** Bấm nút trên thẻ (`ui.actions`). Thiếu thì không vẽ nút. */
  onBam?(op: string): void;
}

export function ModuleCard({ r, st, disabled, onBat, onLuu, onBam }: Props) {
  const ui = r.ui;
  const cfg = hopCauHinh(r, st?.config);
  const bat = st?.enabled === true;
  const quick = (ui.quick ?? [])
    .map((k) => ui.fields.find((f) => f.key === k))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);

  return (
    <Dialog>
      <article className="card mod" data-bat={bat}>
        <DialogTrigger className="mod-hit" aria-label={`Cấu hình ${ui.name}`} />

        <div className="mod-top">
          <span className="mod-icon">{ui.icon}</span>
          <div className="mod-text">
            <b>{ui.name}</b>
            <span>{ui.summary}</span>
          </div>
          <Switch
            checked={bat}
            onCheckedChange={onBat}
            disabled={disabled}
            label={`Bật ${ui.name}`}
          />
        </div>

        {ui.triggers.length > 0 ? (
          <div className="hooks">
            <span className="q-lbl">Chạy khi</span>
            {ui.triggers.map((t) => (
              <span className="hook" key={t}>
                {tenSuKien(t)}
              </span>
            ))}
          </div>
        ) : null}

        {quick.length > 0 ? (
          <div className="mod-quick">
            {quick.map((f) => (
              <QuickCell
                key={f.key}
                field={f}
                value={cfg[f.key] ?? null}
                disabled={disabled}
                onChange={(v) => onLuu({ ...cfg, [f.key]: v })}
              />
            ))}
          </div>
        ) : null}

        {onBam !== undefined && (ui.actions ?? []).length > 0 ? (
          <div className="mod-nut">
            {(ui.actions ?? []).map((a) => (
              <button
                type="button"
                key={a.op}
                className="btn btn-sm"
                // Nút bấm tức thời chỉ có nghĩa khi module đang chạy trên sân khấu.
                disabled={disabled || !bat}
                onClick={() => onBam(a.op)}
              >
                {a.icon === undefined ? null : <span aria-hidden>{a.icon}</span>}
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <ModuleDialog r={r} cfg={cfg} bat={bat} disabled={disabled} onBat={onBat} onLuu={onLuu} />
    </Dialog>
  );
}
