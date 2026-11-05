import { useEffect, useState } from 'react';
import { docTuDo } from '@live/contracts';
import type { MonTuDo } from '@live/contracts';

/** Danh mục tủ đồ của từng module, dùng chung cho phần vẽ và bảng xem: một lần tải, ai cũng thấy cùng một bản, xoá
 *  món là mọi chỗ cập nhật. Máy chủ quét thư mục mỗi lần hỏi (`/s/tu-do/<module>`), nên đây chỉ là bản đệm. */
const DEM = new Map<string, MonTuDo[]>();
const NGHE = new Map<string, Set<(ds: MonTuDo[]) => void>>();
const DANG_TAI = new Set<string>();

async function tai(moduleId: string): Promise<void> {
  if (DANG_TAI.has(moduleId)) return;
  DANG_TAI.add(moduleId);
  try {
    const r = await fetch(`/s/tu-do/${encodeURIComponent(moduleId)}`);
    const ds = r.ok ? docTuDo(await r.json()) : [];
    DEM.set(moduleId, ds);
    for (const f of NGHE.get(moduleId) ?? []) f(ds);
  } catch {
    // mất nối máy chủ: giữ bản cũ, lần sau tải lại
  } finally {
    DANG_TAI.delete(moduleId);
  }
}

/** Danh mục tủ đồ của module. Rỗng khi chưa tải xong hoặc tủ trống. */
export function useTuDo(moduleId: string): MonTuDo[] {
  const [ds, setDs] = useState<MonTuDo[]>(() => DEM.get(moduleId) ?? []);
  useEffect(() => {
    const ds = NGHE.get(moduleId) ?? new Set();
    ds.add(setDs);
    NGHE.set(moduleId, ds);
    if (!DEM.has(moduleId)) void tai(moduleId);
    return () => {
      ds.delete(setDs);
    };
  }, [moduleId]);
  return ds;
}

/** Xoá một món (`nguồn/ô/món`), một ô (`nguồn/ô`) hoặc cả một nguồn (`nguồn`) khỏi tủ, rồi tải lại danh mục.
 *  Trả lỗi dạng chữ, `null` là xong. */
export async function xoaTuDo(moduleId: string, duong: string): Promise<string | null> {
  try {
    const r = await fetch(`/s/tu-do/${encodeURIComponent(moduleId)}/${duong}`, { method: 'DELETE' });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      return j.error ?? `máy chủ trả ${r.status}`;
    }
    await tai(moduleId);
    return null;
  } catch {
    return 'chưa nối được máy chủ';
  }
}
