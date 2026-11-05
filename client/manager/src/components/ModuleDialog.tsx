import { useState } from 'react';
import type { ConfigField, Json } from '@live/contracts';
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

/** Gom ô theo `tab`, giữ thứ tự xuất hiện. Ô không khai tab về tab đầu. */
function chiaTab(fields: readonly ConfigField[]): { ten: string; fields: ConfigField[] }[] {
  const ra: { ten: string; fields: ConfigField[] }[] = [{ ten: TAB_DAU, fields: [] }];
  for (const f of fields) {
    const ten = f.tab ?? TAB_DAU;
    let nhom = ra.find((t) => t.ten === ten);
    if (nhom === undefined) {
      nhom = { ten, fields: [] };
      ra.push(nhom);
    }
    nhom.fields.push(f);
  }
  return ra;
}

const TAB_DAU = 'Cài đặt';

export function ModuleDialog({ r, cfg, bat, disabled, onBat, onLuu }: Props) {
  const ui = r.ui;
  const [tab, setTab] = useState(TAB_DAU);
  const tabs = chiaTab(ui.fields);
  const oCuaTab = tabs.find((t) => t.ten === tab)?.fields ?? [];
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
      {tabs.length < 2 ? null : (
        <div className="ai-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.ten}
              type="button"
              role="tab"
              className="ai-tab"
              aria-selected={tab === t.ten}
              data-chon={tab === t.ten}
              onClick={() => setTab(t.ten)}
            >
              {t.ten}
            </button>
          ))}
        </div>
      )}
      <div className="form">
        {tab === TAB_DAU && ui.triggers.length > 0 ? (
          <div className="hooks">
            <span className="q-lbl">Chạy khi</span>
            {ui.triggers.map((t) => (
              <span className="hook" key={t}>
                {tenSuKien(t)}
              </span>
            ))}
          </div>
        ) : null}

        {tab !== TAB_DAU ? null : (
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
        )}

        {oCuaTab.map((f) => (
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
