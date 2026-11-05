import { timDangKy } from './registry';
import { guiLenh } from './state';
import { useStage, useTrangThaiNut } from './Stage';

function bam(id: string, op: string): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'module-action', moduleId: id, action: op },
    by: 'nguoi',
    reason: 'bấm nút từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

/** Hàng nút bấm tức thời của một module (`ui.actions`): "Nhảy ngay", "Đoạn sau"…
 *
 *  Đọc từ manifest, không biết tên module nào. Module chưa bật thì nút khoá: lõi
 *  chưa chạy trên sân khấu, bấm cũng không có ai nhận. Module không khai nút thì
 *  không vẽ gì. */
export function NutModule({ id }: { id: string }) {
  const s = useStage();
  const tt = useTrangThaiNut(id);
  const nut = timDangKy(id)?.ui.actions ?? [];
  if (nut.length === 0) return null;
  const khoa = !s.noiDuoc || !s.enabled.includes(id);

  return (
    <div className="bx-the-nut">
      {nut.map((a) => (
        <button
          type="button"
          key={a.op}
          disabled={khoa}
          // Module khai trạng thái thì nút đang có hiệu lực sáng lên, như công tắc.
          aria-pressed={tt === null ? undefined : tt.bat === a.op}
          onClick={() => bam(id, a.op)}
        >
          {a.icon === undefined ? null : <span aria-hidden>{a.icon}</span>}
          {a.label}
        </button>
      ))}
      {tt === null ? null : (
        // Chấm xanh khi nút đầu (thường là "chạy") đang có hiệu lực, xám khi đứng.
        <p className="bx-the-tt" data-bat={tt.bat !== null && tt.bat === nut[0]?.op} role="status">
          {tt.chu}
        </p>
      )}
    </div>
  );
}
