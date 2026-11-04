import type { Json } from '@live/contracts';
import type { Registered } from '../lib/registry';
import { tenSuKien } from '../lib/registry';
import { ConfigRow } from './ConfigRow';
import { DialogBody, DialogClose } from './ui/dialog';
import { Switch } from './ui/switch';

interface Props {
  r: Registered;
  cfg: Record<string, Json>;
  bat: boolean;
  disabled: boolean;
  onBat(on: boolean): void;
  onLuu(config: Record<string, Json>): void;
}

export function ModuleDialog({ r, cfg, bat, disabled, onBat, onLuu }: Props) {
  const ui = r.ui;
  return (
    <DialogBody
      icon={ui.icon}
      title={ui.name}
      desc={ui.summary}
      foot={
        // Không có nút "Lưu": mọi thay đổi ghi ngay và đẩy xuống thiết kế đang
        // phát. Giữ một nút Lưu chỉ tạo cảm giác an toàn giả.
        <DialogClose className="btn btn-gold">Xong</DialogClose>
      }
    >
      <div className="form">
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

        <label className="form-inline hl" htmlFor={`on-${ui.id}`}>
          <span>
            <b>Bật tính năng</b>
            <small>Tắt thì thiết kế vẫn chạy bình thường, chỉ thiếu tính năng này</small>
          </span>
          <Switch
            checked={bat}
            onCheckedChange={onBat}
            disabled={disabled}
            label={`Bật ${ui.name}`}
          />
        </label>

        {ui.fields.map((f) => (
          <ConfigRow
            key={f.key}
            moduleId={ui.id}
            field={f}
            value={cfg[f.key] ?? null}
            disabled={disabled}
            onChange={(v) => onLuu({ ...cfg, [f.key]: v })}
          />
        ))}
      </div>
    </DialogBody>
  );
}
