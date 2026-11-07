import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { hopThietKe, laLoaiPhong } from '@live/contracts';
import type {
  DesignCard,
  DesignOption,
  Json,
  ModuleUi,
  RoomKind,
  SessionView,
  SlotName,
  TrangThaiNut,
} from '@live/contracts';
import { connectStage, BAN_DAU } from './state';
import type { StageState } from './state';
import { conDangDoc } from './audio';
import { partsCho, slotTrongSuot, timDangKy } from './registry';
import { useRunner } from './runner';
import type { KetQuaChay, LoiMc } from './runner';
import { designAssetUrl } from './assets';

interface CtxValue {
  s: StageState;
  designId: string;
  /** Loại phòng của thiết kế này, đọc từ `category` trong design.json. */
  loaiPhong: RoomKind | undefined;
  /** Tính năng có hợp thiết kế này không — `hopThietKe` với loại phòng và
   *  slot đọc từ design.json. */
  hop: (ui: ModuleUi) => boolean;
  /** Lựa chọn thiết kế tự khai. Bảng xem dựng form từ đây, và `useThietKe`
   *  lấy mặc định từ đây khi backend chưa lưu gì. */
  luaChon: readonly DesignCard[];
  chay: KetQuaChay;
}

const RONG: KetQuaChay = {
  modState: new Map(),
  loiMc: null,
  slotSang: new Map(),
  now: 0,
  noi: () => {},
};

const KHONG_CO: readonly DesignCard[] = [];

const Ctx = createContext<CtxValue>({
  s: BAN_DAU,
  designId: '',
  loaiPhong: undefined,
  hop: () => true,
  luaChon: KHONG_CO,
  chay: RONG,
});

/** Bọc quanh sân khấu. Giữ một WebSocket duy nhất và nuôi các lõi module. */
export function StageProvider({
  thietKe,
  luaChon = KHONG_CO,
  children,
}: {
  /** Chính `design.json` của thiết kế (import thẳng file đó). Id và loại phòng
   *  cùng đọc từ một chỗ, nên không thể khai lệch nhau. */
  thietKe: { id: string; category?: string; slots?: readonly string[] };
  /** Lựa chọn của riêng thiết kế này — xem `DesignOption`. Thiết kế nào không
   *  có gì để chỉnh thì bỏ trống, bảng xem sẽ không dựng thẻ nào. */
  luaChon?: readonly DesignCard[];
  children: ReactNode;
}) {
  const designId = thietKe.id;
  const loaiPhong = laLoaiPhong(thietKe.category) ? thietKe.category : undefined;
  const slots = thietKe.slots;
  const hop = useCallback(
    (ui: ModuleUi) => hopThietKe(ui, { category: loaiPhong, slots: slots ?? [] }),
    [loaiPhong, slots],
  );
  const [tho, setS] = useState<StageState>(BAN_DAU);
  useEffect(() => connectStage(setS, designId), [designId]);
  // Tính năng không hợp thiết kế (sai loại phòng, hoặc thiếu slot để vẽ) thì
  // coi như tắt, kể cả khi database đang để bật: không dựng lõi, không vẽ,
  // bảng xem không hiện. Một bộ lọc ở đây là đủ cho mọi thứ phía dưới.
  const s = useMemo(() => locHop(tho, hop), [tho, hop]);
  const chay = useRunner(s);
  return (
    <Ctx.Provider value={{ s, designId, loaiPhong, hop, luaChon, chay }}>{children}</Ctx.Provider>
  );
}

function locHop(s: StageState, hop: (ui: ModuleUi) => boolean): StageState {
  const enabled = s.enabled.filter((id) => {
    const dk = timDangKy(id);
    return dk !== undefined && hop(dk.ui);
  });
  return enabled.length === s.enabled.length ? s : { ...s, enabled };
}

/** Bộ lọc tính năng của thiết kế đang chạy, cho bảng xem dùng. */
export function useHopThietKe(): (ui: ModuleUi) => boolean {
  return useContext(Ctx).hop;
}

/** Loại phòng của thiết kế đang chạy. `undefined` là thiết kế chưa khai —
 *  chỉ có tính năng chung. */
export function useLoaiPhong(): RoomKind | undefined {
  return useContext(Ctx).loaiPhong;
}

/** Lựa chọn của thiết kế đang có hiệu lực: mặc định đã khai, phủ bằng thứ
 *  backend lưu. Đổi giữa lúc đang live là vẽ lại — không tải lại trang. */
export function useThietKe(): Record<string, Json> {
  const { s, luaChon } = useContext(Ctx);
  const ra: Record<string, Json> = {};
  for (const the of luaChon) {
    if (the.toggle !== undefined) ra[the.toggle.key] = the.toggle.value;
    for (const o of the.fields) ra[o.key] = o.value;
  }
  for (const [k, v] of Object.entries(s.design)) {
    if (k in ra) ra[k] = v;
  }
  return ra;
}

/** Các thẻ lựa chọn thiết kế đã khai — bảng xem dùng để dựng form. */
export function useLuaChonThietKe(): readonly DesignCard[] {
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

/** Cho thiết kế đọc to một câu, chung hàng đọc với module và MC. */
export function useNoi(): (text: string, voice?: string) => void {
  return useContext(Ctx).chay.noi;
}

/** Slot nào đang được một module xin sáng. Thiết kế dùng để nhấn vùng đó lên. */
/** Hàng nút của module `id` đang ở thế nào. `null` khi module không khai trạng thái
 *  hoặc lõi chưa chạy (module tắt). Đọc lại mỗi nhịp runner, nên chữ "còn …s" tự chạy. */
export function useTrangThaiNut(id: string): TrangThaiNut | null {
  const { chay } = useContext(Ctx);
  const dk = timDangKy(id);
  if (dk?.trangThaiNut === undefined || !chay.modState.has(id)) return null;
  return dk.trangThaiNut(chay.modState.get(id), chay.now);
}

export function useSlotSang(slot: SlotName): boolean {
  const { chay } = useContext(Ctx);
  return chay.slotSang.has(slot);
}

/** Module ở slot này xin bỏ nền: thiết kế thôi vẽ màn chờ và nền khung của
 *  slot, để lộ phòng phía sau. Thiết kế không cần biết module nào xin. */
export function useSlotTrongSuot(slot: SlotName): boolean {
  const { s, chay } = useContext(Ctx);
  // `chay.now` đổi mỗi nhịp nên hàm này được tính lại đều — nhờ vậy lúc giọng
  // đọc xong câu cuối, khung nhường chỗ cho màn chờ ngay nhịp sau.
  return slotTrongSuot(slot, s.enabled, s.config as Record<string, Json>, conDangDoc());
}

/** Id thiết kế đang vẽ. Bảng xem cần nó để gửi file tải lên đúng kho của
 *  phòng này. */
export function useDesignId(): string {
  return useContext(Ctx).designId;
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
            dangDoc={conDangDoc()}
          />
        );
      })}
    </>
  );
}
