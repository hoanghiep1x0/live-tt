import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Json, SessionView, SlotName } from '@live/contracts';
import { connectStage, BAN_DAU } from './state';
import type { StageState } from './state';
import { partsCho } from './parts';
import { designAssetUrl } from './assets';

interface CtxValue {
  s: StageState;
  designId: string;
}

const Ctx = createContext<CtxValue>({ s: BAN_DAU, designId: '' });

/** Bọc quanh sân khấu. Giữ một WebSocket duy nhất cho cả trang. */
export function StageProvider({ designId, children }: { designId: string; children: ReactNode }) {
  const [s, setS] = useState<StageState>(BAN_DAU);
  useEffect(() => connectStage(setS), []);
  return <Ctx.Provider value={{ s, designId }}>{children}</Ctx.Provider>;
}

export function useStage(): StageState {
  return useContext(Ctx).s;
}

export function useSession(): SessionView {
  return useContext(Ctx).s.session;
}

/** Đường dẫn tới một asset của thiết kế này. */
export function useAsset(): (path: string) => string {
  const { designId } = useContext(Ctx);
  return useCallback((path: string) => designAssetUrl(designId, path), [designId]);
}

/** Chỗ cắm module.
 *
 *  Thiết kế không biết module nào sẽ nằm ở đây, và không cần biết. Không có
 *  module nào thì slot rỗng — thiết kế vẫn phải lên hình đầy đủ (quy ước 04 §1). */
export function Slot({ name }: { name: SlotName }) {
  const { s } = useContext(Ctx);
  const parts = partsCho(name, s.enabled);
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((p) => (
        <p.Part key={p.moduleId} config={(s.config[p.moduleId] ?? {}) as Json} state={s} />
      ))}
    </>
  );
}
