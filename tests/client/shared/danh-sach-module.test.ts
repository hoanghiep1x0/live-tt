import { describe, expect, it } from 'vitest';
import { LOAI_PHONG, thuocPhong } from '@live/contracts';
import { DANH_SACH_MODULE } from '../../../client/shared/stage-sdk/src/danh-sach';

// Bộ kiểm tra Node cố ý không có kiểu của vite hay node; khai đúng phần cần.
declare global {
  interface ImportMeta {
    glob(pattern: string, opts: { eager: true }): Record<string, unknown>;
  }
}

// Trang quản lý và sân khấu cùng đọc `DANH_SACH_MODULE`, nên chỉ cần giữ mảng
// này khớp với thư mục `client/modules/` là hai nơi không thể lệch nhau.
const GOI = import.meta.glob('../../../client/modules/*/package.json', { eager: true });
const THU_MUC = Object.keys(GOI).map((p) => p.split('/').at(-2) ?? p);
const json = (m: unknown): Record<string, unknown> =>
  (m as { default: Record<string, unknown> }).default;
const THIET_KE = import.meta.glob('../../../client/designs/*/design.json', { eager: true });
const STAGE_SDK = import.meta.glob('../../../client/shared/stage-sdk/package.json', {
  eager: true,
});

describe('danh sách module dùng chung', () => {
  it('có đúng mọi module trong client/modules, không thiếu không thừa', () => {
    const ids = DANH_SACH_MODULE.map((m) => m.manifest.id);
    expect([...ids].sort()).toEqual([...THU_MUC].sort());
  });

  it('không trùng id', () => {
    const ids = DANH_SACH_MODULE.map((m) => m.manifest.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('module nào khai room thì room đó có tab ở LOAI_PHONG', () => {
    const phong = LOAI_PHONG.map((p) => p.id);
    for (const m of DANH_SACH_MODULE) {
      const room = m.manifest.room;
      if (room === undefined) continue;
      for (const r of typeof room === 'string' ? [room] : room) expect(phong, m.manifest.id).toContain(r);
    }
  });

  it('Sàn bar chỉ có Vũ công 3D — mọi tính năng khác là của phòng kể chuyện', () => {
    const sanBar = DANH_SACH_MODULE.filter((m) => thuocPhong(m.manifest, 'san-bar'));
    expect(sanBar.map((m) => m.manifest.id)).toEqual(['vu-cong-3d']);
  });

  it('gói của module tên `@live/mod-<thư mục>` (vite.config của trang quản lý dựa vào đây)', () => {
    for (const [p, m] of Object.entries(GOI)) {
      expect(json(m).name, p).toBe(`@live/mod-${p.split('/').at(-2)}`);
    }
  });

  it('stage-sdk khai đủ dependency cho mọi module trong danh sách', () => {
    const deps = Object.keys(
      (json(Object.values(STAGE_SDK)[0]).dependencies ?? {}) as Record<string, string>,
    );
    for (const m of DANH_SACH_MODULE) expect(deps).toContain(`@live/mod-${m.manifest.id}`);
  });

  it('design.json chỉ nhắc tới module có trong danh sách', () => {
    const ids = DANH_SACH_MODULE.map((m) => m.manifest.id);
    expect(Object.keys(THIET_KE).length).toBeGreaterThan(0);
    for (const [p, m] of Object.entries(THIET_KE)) {
      const d = json(m);
      const nhac = [
        ...((d.recommends ?? []) as string[]),
        ...Object.keys((d.defaults ?? {}) as Record<string, unknown>),
      ];
      for (const id of nhac) expect(ids, `${p}: ${id}`).toContain(id);
    }
  });

  it('module khai nút trên thẻ thì lõi có onAction, op đúng dạng id', () => {
    for (const m of DANH_SACH_MODULE) {
      const nut = m.manifest.actions ?? [];
      if (nut.length === 0) continue;
      expect(m.core.onAction, m.manifest.id).toBeTypeOf('function');
      for (const a of nut) expect(a.op, m.manifest.id).toMatch(/^[a-z][a-z0-9-]{1,31}$/);
    }
  });
});
