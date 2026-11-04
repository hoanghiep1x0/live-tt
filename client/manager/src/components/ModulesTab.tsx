import { useState } from 'react';
import { LOAI_PHONG } from '@live/contracts';
import { MODULES } from '../lib/registry';
import type { Manager } from '../lib/store';
import { ModuleCard } from './ModuleCard';
import { QuickDialog } from './QuickDialog';

interface Props {
  m: Manager;
  onSangThietKe(): void;
}

export function ModulesTab({ m, onSangThietKe }: Props) {
  const [tim, setTim] = useState('');
  const q = tim.trim().toLowerCase();

  // Cấu hình luôn áp 1-1 cho thiết kế đang phát. Chưa phát thì không có đích để
  // áp, nên khoá điều khiển lại thay vì ghi vào một chỗ người dùng không thấy.
  const khoa = m.live === null;
  const tenLive = m.designs.find((d) => d.manifest.id === m.live)?.displayName ?? null;

  const loc = MODULES.filter(
    (r) =>
      q === '' ||
      r.ui.name.toLowerCase().includes(q) ||
      r.ui.summary.toLowerCase().includes(q) ||
      r.ui.id.includes(q),
  );
  // Dùng chung lên trên; đặc thù từng loại phòng xuống dưới, mỗi loại một mục.
  // Mở một dạng live mới thì thêm một dòng ở `LOAI_PHONG`, chỗ này không sửa.
  const nhanh = loc.filter((r) => r.ui.room === undefined);
  const theoPhong = LOAI_PHONG.map((p) => ({
    ...p,
    ds: loc.filter((r) => r.ui.room === p.id),
  }));

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Gói tính năng</div>
          <h1>Tính năng</h1>
          <p>
            Mỗi thẻ là một tính năng cắm thêm, chạy theo sự kiện của phòng. Bấm vào thẻ để cấu hình
            đầy đủ; công tắc và ô chỉnh nhanh áp dụng ngay, không tải lại trang.
          </p>
          <div className="apply-to" data-trong={khoa}>
            <span className={khoa ? 'dot warn' : 'dot ok'} />
            {khoa ? (
              <>
                Chưa phát phòng nào
                <small>— bật một thiết kế rồi mới cấu hình được</small>
                <button type="button" className="btn btn-ghost" onClick={onSangThietKe}>
                  Chọn thiết kế
                </button>
              </>
            ) : (
              <>
                Đang áp dụng cho <b>{tenLive}</b>
                <small>— thiết kế đang phát</small>
              </>
            )}
          </div>
        </div>
        <div className="tools">
          <input
            className="input"
            placeholder="Tìm tính năng…"
            aria-label="Tìm tính năng"
            value={tim}
            onChange={(e) => setTim(e.target.value)}
          />
          <QuickDialog
            mods={MODULES}
            states={m.mods}
            disabled={khoa}
            onBat={m.batModule}
            onLuu={m.luuCauHinh}
          />
        </div>
      </div>

      {nhanh.length > 0 ? (
        <>
          <h3 className="group-title">
            Chỉnh nhanh <span>{nhanh.length}</span>
          </h3>
          <div className="grid-mods">
            {nhanh.map((r) => (
              <ModuleCard
                key={r.ui.id}
                r={r}
                st={m.mods[r.ui.id]}
                disabled={khoa}
                onBat={(on) => m.batModule(r.ui.id, on)}
                onLuu={(c) => m.luuCauHinh(r.ui.id, c)}
              />
            ))}
          </div>
        </>
      ) : null}

      {theoPhong.map((p) => (
        <section key={p.id}>
          <h3 className="group-title">
            Tính năng dành riêng cho “{p.name}” <span>{p.ds.length}</span>
          </h3>
          {p.ds.length === 0 ? (
            <p className="group-trong">Chưa có tính năng nào riêng cho loại phòng này.</p>
          ) : (
            <div className="grid-mods">
              {p.ds.map((r) => (
                <ModuleCard
                  key={r.ui.id}
                  r={r}
                  st={m.mods[r.ui.id]}
                  disabled={khoa}
                  onBat={(on) => m.batModule(r.ui.id, on)}
                  onLuu={(c) => m.luuCauHinh(r.ui.id, c)}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      {loc.length === 0 ? (
        <div className="empty">
          <b>Không có tính năng nào khớp “{tim}”</b>
          Danh sách này đọc từ <code>client/manager/src/lib/registry.ts</code>. Module đã chuyển
          sang kiến trúc mới thì có ở đây; số còn lại nằm trong <code>docs/06-lo-trinh.md</code>.
        </div>
      ) : null}
    </section>
  );
}
