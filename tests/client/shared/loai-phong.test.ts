import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  designManifestSchema,
  hopPhong,
  hopThietKe,
  LOAI_PHONG,
  TINH_NANG_HE,
  thuocPhong,
} from '@live/contracts';
import type { ModuleUi } from '@live/contracts';

const GOC = resolve(__dirname, '../../../client');

/** Đọc thẳng thư mục, không qua registry nào: thêm module hay thiết kế mới là
 *  tự vào test, không ai phải nhớ khai thêm. */
async function moiModule(): Promise<ModuleUi[]> {
  const ds = readdirSync(join(GOC, 'modules'));
  return Promise.all(
    ds.map(async (id) => {
      const m = (await import(
        pathToFileURL(join(GOC, 'modules', id, 'src', 'manifest.ts')).href
      )) as { manifest: ModuleUi };
      return m.manifest;
    }),
  );
}

function moiThietKe() {
  return readdirSync(join(GOC, 'designs'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) =>
      designManifestSchema.parse(
        JSON.parse(readFileSync(join(GOC, 'designs', d.name, 'design.json'), 'utf8')),
      ),
    );
}

describe('tính năng theo loại phòng', () => {
  it('tính năng chung hợp mọi phòng, tính năng riêng chỉ hợp đúng loại', () => {
    expect(hopPhong({}, 'san-bar')).toBe(true);
    expect(hopPhong({}, undefined)).toBe(true);
    expect(hopPhong({ room: 'san-bar' }, 'san-bar')).toBe(true);
    expect(hopPhong({ room: 'san-bar' }, 'ke-chuyen')).toBe(false);
    expect(hopPhong({ room: 'san-bar' }, undefined)).toBe(false);
    expect(hopPhong({ room: ['ke-chuyen', 'san-bar'] }, 'san-bar')).toBe(true);
    expect(hopPhong({ room: ['ke-chuyen', 'san-bar'] }, 'dam-cuoi')).toBe(false);
  });

  it('thiếu slot tính năng cần thì không hợp thiết kế', () => {
    const tk = { category: 'san-bar' as const, slots: ['stage-3d', 'ticker'] };
    expect(hopThietKe({ slots: ['ticker'] }, tk)).toBe(true);
    expect(hopThietKe({ slots: ['target'] }, tk)).toBe(false);
    expect(hopThietKe({}, tk)).toBe(true);
    expect(hopThietKe({ room: 'ke-chuyen', slots: ['ticker'] }, tk)).toBe(false);
  });

  it('schema từ chối loại phòng không có trong LOAI_PHONG', () => {
    expect(() => designManifestSchema.parse({ id: 'x-y', name: 'x', category: 'chua' })).toThrow();
  });

  it('module khai room thì room đó phải có trong LOAI_PHONG', async () => {
    for (const m of await moiModule()) {
      if (m.room === undefined) continue;
      for (const r of typeof m.room === 'string' ? [m.room] : m.room) {
        expect(
          LOAI_PHONG.some((p) => p.id === r),
          m.id,
        ).toBe(true);
      }
    }
  });

  it('chỉ Kết nối AI là dùng chung: module nào cũng khai room', async () => {
    for (const m of await moiModule()) expect(m.room, `${m.id} chưa khai room`).toBeDefined();
  });

  it('MC và nhân vật ảo chỉ ở loại phòng có thiết kế dùng tới', () => {
    const tks = moiThietKe();
    for (const r of TINH_NANG_HE.nhanVatAo.room) {
      expect(tks.some((tk) => tk.category === r && tk.crowd.lines.length > 0), r).toBe(true);
    }
    expect(thuocPhong(TINH_NANG_HE.mc, 'san-bar')).toBe(false);
    expect(thuocPhong(TINH_NANG_HE.nhanVatAo, 'san-bar')).toBe(false);
  });

  it('thiết kế sàn bar chỉ khai vũ công 3D: không slot, gợi ý hay đám đông của phòng kể chuyện', () => {
    for (const tk of moiThietKe().filter((x) => x.category === 'san-bar')) {
      expect(tk.slots, tk.id).toEqual(['stage-3d']);
      expect(tk.recommends, tk.id).toEqual(['vu-cong-3d']);
      expect(Object.keys(tk.defaults).every((k) => k === 'vu-cong-3d'), tk.id).toBe(true);
      expect(tk.crowd.lines, tk.id).toEqual([]);
    }
  });

  it('mọi thiết kế khai category, và chỉ gợi ý tính năng hợp loại phòng của nó', async () => {
    const mods = await moiModule();
    for (const tk of moiThietKe()) {
      expect(tk.category, `${tk.id} thiếu "category" trong design.json`).toBeDefined();
      const ten = [...tk.recommends, ...Object.keys(tk.defaults)];
      for (const id of ten) {
        const m = mods.find((x) => x.id === id);
        expect(m, `${tk.id} gợi ý module không tồn tại: ${id}`).toBeDefined();
        if (m !== undefined) {
          expect(
            hopThietKe(m, tk),
            `${tk.id} gợi ý ${id}, nhưng nó không hợp (loại ${String(m.room ?? 'chung')}, cần slot ${m.slots?.join(', ')})`,
          ).toBe(true);
        }
      }
    }
  });
});
