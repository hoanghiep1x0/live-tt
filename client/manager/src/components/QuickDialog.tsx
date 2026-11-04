import { SlidersHorizontal } from 'lucide-react';
import type { Json } from '@live/contracts';
import type { ModuleState } from '../lib/api';
import type { Registered } from '../lib/registry';
import { hopCauHinh, tenSuKien } from '../lib/registry';
import { ConfigRow } from './ConfigRow';
import { Dialog, DialogBody, DialogClose, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';

interface Props {
  mods: readonly Registered[];
  states: Record<string, ModuleState>;
  disabled: boolean;
  onBat(moduleId: string, on: boolean): void;
  onLuu(moduleId: string, config: Record<string, Json>): void;
}

/** Cấu hình nhiều module trong một chỗ, cho lúc dựng phòng trước khi lên sóng.
 *  Dùng chung đúng hàng cấu hình với modal riêng, nên không có chuyện hai nơi
 *  hiểu khác nhau về một khoá. */
export function QuickDialog({ mods, states, disabled, onBat, onLuu }: Props) {
  return (
    <Dialog>
      <DialogTrigger className="btn btn-gold">
        <SlidersHorizontal size={15} />
        Cấu hình nhanh
      </DialogTrigger>
      <DialogBody
        size="md"
        icon={<SlidersHorizontal size={15} />}
        title="Cấu hình nhanh"
        desc="Chỉnh nhiều tính năng trong một chỗ. Thay đổi áp ngay cho thiết kế đang phát."
        foot={<DialogClose className="btn btn-gold">Xong</DialogClose>}
      >
        <div className="quick-grid">
          {mods.map((r) => {
            const cfg = hopCauHinh(r, states[r.ui.id]?.config);
            const bat = states[r.ui.id]?.enabled === true;
            return (
              <section className="quick-sec" key={r.ui.id} data-bat={bat}>
                <div className="quick-head">
                  <span className="mod-icon">{r.ui.icon}</span>
                  <b>{r.ui.name}</b>
                  <Switch
                    checked={bat}
                    onCheckedChange={(on) => onBat(r.ui.id, on)}
                    disabled={disabled}
                    label={`Bật ${r.ui.name}`}
                  />
                </div>
                {r.ui.triggers.length > 0 ? (
                  <div className="hooks" style={{ marginBottom: 10 }}>
                    <span className="q-lbl">Chạy khi</span>
                    {r.ui.triggers.map((t) => (
                      <span className="hook" key={t}>
                        {tenSuKien(t)}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="form">
                  {r.ui.fields.map((f) => (
                    <ConfigRow
                      key={f.key}
                      moduleId={`q-${r.ui.id}`}
                      field={f}
                      value={cfg[f.key] ?? null}
                      disabled={disabled}
                      onChange={(v) => onLuu(r.ui.id, { ...cfg, [f.key]: v })}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </DialogBody>
    </Dialog>
  );
}
