import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DesignOption, Json, SessionView, SlotName } from '@live/contracts';
import { connectStage, BAN_DAU } from './state';
import type { StageState } from './state';
import { partsCho } from './registry';
import { useRunner } from './runner';
import type { KetQuaChay, LoiMc } from './runner';
import { designAssetUrl } from './assets';

interface CtxValue {
  s: StageState;
  designId: string;
  /** Lựa chọn thiết kế tự khai. Bảng xem dựng form từ đây, và `useThietKe`
   *  lấy mặc định từ đây khi backend chưa lưu gì. */
  luaChon: readonly DesignOption[];
  chay: KetQuaChay;
}

const RONG: KetQuaChay = {
  modState: new Map(),
  loiMc: null,
  slotSang: new Map(),
  now: 0,
};

const KHONG_CO: readonly DesignOption[] = [];

const Ctx = createContext<CtxValue>({
  s: BAN_DAU,
  designId: '',
  luaChon: KHONG_CO,
  chay: RONG,
});

/** Bọc quanh sân khấu. Giữ một WebSocket duy nhất và nuôi các lõi module. */
export function StageProvider({
  designId,
  luaChon = KHONG_CO,
  children,
}: {
  designId: string;
  /** Lựa chọn của riêng thiết kế này — xem `DesignOption`. Thiết kế nào không
   *  có gì để chỉnh thì bỏ trống, bảng xem sẽ không dựng thẻ nào. */
  luaChon?: readonly DesignOption[];
  children: ReactNode;
}) {
  const [s, setS] = useState<StageState>(BAN_DAU);
  useEffect(() => connectStage(setS), []);
  const chay = useRunner(s);
  return <Ctx.Provider value={{ s, designId, luaChon, chay }}>{children}</Ctx.Provider>;
}

/** Lựa chọn của thiết kế đang có hiệu lực: mặc định đã khai, phủ bằng thứ
 *  backend lưu. Đổi giữa lúc đang live là vẽ lại — không tải lại trang. */
export function useThietKe(): Record<string, Json> {
  const { s, luaChon } = useContext(Ctx);
  const ra: Record<string, Json> = {};
  for (const o of luaChon) ra[o.key] = o.value;
  for (const [k, v] of Object.entries(s.design)) {
    if (k in ra) ra[k] = v;
  }
  return ra;
}

/** Danh sách lựa chọn thiết kế đã khai — bảng xem dùng để dựng form. */
export function useLuaChonThietKe(): readonly DesignOption[] {
  return useContext(Ctx).luaChon;
}

export function useStage(): StageState {
  return useContext(Ctx).s;
}

export function useSession(): SessionView {
  return useContext(Ctx).s.session;
}

/** Câu MC đang nói, hoặc `null`. Thiết kế quyết định vẽ nó ở đâu — trên video
 *  thì làm phụ đề, không có video thì đặt giữa khung. */
export function useLoiMc(): LoiMc | null {
  return useContext(Ctx).chay.loiMc;
}

/** Slot nào đang được một module xin sáng. Thiết kế dùng để nhấn vùng đó lên. */
export function useSlotSang(slot: SlotName): boolean {
  const { chay } = useContext(Ctx);
  return chay.slotSang.has(slot);
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
  const { s, chay } = useContext(Ctx);
  const parts = partsCho(name, s.enabled);
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((p) => {
        const Part = p.Part;
        if (Part === undefined) return null;
        // Lõi được dựng ở effect, tức là sau lượt vẽ đầu. Phần vẽ nào cũng cần
        // trạng thái lõi, nên chờ một nhịp còn hơn vẽ bằng `undefined`.
        if (!chay.modState.has(p.id)) return null;
        return (
          <Part
            key={p.id}
            config={p.hopCauHinh((s.config[p.id] ?? {}) as Json)}
            state={s}
            modState={chay.modState.get(p.id)}
            now={chay.now}
          />
        );
      })}
    </>
  );
}
