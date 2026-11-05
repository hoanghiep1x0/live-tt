import { useState } from 'react';
import { LOAI_PHONG, thuocPhong } from '@live/contracts';
import { tinhNangDung } from '../lib/tinhNangDung';
import type { Manager } from '../lib/store';
import { KetNoiAiCard } from './KetNoiAiCard';
import { ModuleCard } from './ModuleCard';
import { QuickDialog } from './QuickDialog';

/** Tab dùng chung cho mọi loại phòng. Không trùng id loại phòng nào. */
const NHOM_CHUNG = 'chung';

interface Props {
  m: Manager;
  onSangThietKe(): void;
  onToast(text: string, loi?: boolean): void;
}

export function ModulesTab({ m, onSangThietKe, onToast }: Props) {
  const [tim, setTim] = useState('');
  const [nhom, setNhom] = useState<string>(NHOM_CHUNG);
  const q = tim.trim().toLowerCase();

  // Cấu hình luôn áp 1-1 cho thiết kế đang phát. Chưa phát thì không có đích để
  // áp, nên khoá điều khiển lại thay vì ghi vào một chỗ người dùng không thấy.
  const khoa = m.live === null;
  const dangPhat = m.designs.find((d) => d.manifest.id === m.live);
  const tenLive = dangPhat?.displayName ?? null;
  // Đang phát một thiết kế thì chỉ những tính năng chạy được ở đó: đúng loại
  // phòng và đủ slot để vẽ (`hopThietKe` — cùng hàm sân khấu dùng). Chưa phát
  // thì xem đủ mọi loại.
  const hop = tinhNangDung(m);

  const loc = hop.filter(
    (r) =>
      q === '' ||
      r.ui.name.toLowerCase().includes(q) ||
      r.ui.summary.toLowerCase().includes(q) ||
      r.ui.id.includes(q),
  );
  // Mỗi nhóm một tab: dùng chung đứng đầu, rồi đặc thù từng loại phòng.
  // Mở một dạng live mới thì thêm một dòng ở `LOAI_PHONG`, chỗ này không sửa.
  // Tab chung luôn có thẻ Kết nối AI (không phải module) đứng đầu, rồi tới
  // module nào không khai `room` — hôm nay không còn cái nào.
  const coAi = q === '' || 'kết nối ai'.includes(q);
  const cacNhom = [
    {
      id: NHOM_CHUNG,
      name: 'Tính năng chung',
      ds: loc.filter((r) => r.ui.room === undefined),
      them: coAi ? 1 : 0,
    },
    ...LOAI_PHONG.filter((p) => dangPhat === undefined || p.id === dangPhat.manifest.category).map(
      (p) => ({
        id: p.id,
        name: p.name,
        ds: loc.filter((r) => thuocPhong(r.ui, p.id)),
        them: 0,
      }),
    ),
  ];
  const dang = cacNhom.find((n) => n.id === nhom) ?? cacNhom[0];

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
            mods={hop}
            states={m.mods}
            disabled={khoa}
            onBat={m.batModule}
            onLuu={m.luuCauHinh}
          />
        </div>
      </div>

      <nav className="ai-tabs nhom-tabs" role="tablist" aria-label="Nhóm tính năng">
        {cacNhom.map((n) => (
          <button
            key={n.id}
            type="button"
            role="tab"
            className="ai-tab"
            aria-selected={dang?.id === n.id}
            data-chon={dang?.id === n.id}
            onClick={() => setNhom(n.id)}
          >
            {n.name}
            <span className="count">{n.ds.length + n.them}</span>
          </button>
        ))}
      </nav>

      {dang === undefined || (loc.length === 0 && dang.them === 0) ? null : dang.ds.length +
          dang.them ===
        0 ? (
        <p className="group-trong">
          {q === ''
            ? 'Chưa có tính năng nào riêng cho loại phòng này.'
            : `Không có tính năng nào khớp “${tim}” trong nhóm này.`}
        </p>
      ) : (
        <div className="grid-mods">
          {dang.them > 0 ? <KetNoiAiCard onToast={onToast} /> : null}
          {dang.ds.map((r) => (
            <ModuleCard
              key={r.ui.id}
              r={r}
              st={m.mods[r.ui.id]}
              disabled={khoa}
              onBat={(on) => m.batModule(r.ui.id, on)}
              onLuu={(c) => m.luuCauHinh(r.ui.id, c)}
              onBam={(op) => m.bamNut(r.ui.id, op)}
            />
          ))}
        </div>
      )}

      {loc.length === 0 && !coAi ? (
        <div className="empty">
          <b>Không có tính năng nào khớp “{tim}”</b>
          Danh sách này đọc từ <code>client/manager/src/lib/registry.ts</code>. Module đã chuyển
          sang kiến trúc mới thì có ở đây; số còn lại nằm trong <code>docs/06-lo-trinh.md</code>.
        </div>
      ) : null}
    </section>
  );
}
