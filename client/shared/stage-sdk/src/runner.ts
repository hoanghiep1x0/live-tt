/** Chạy lõi module ngay trên sân khấu.
 *
 *  Vì sao chạy ở đây chứ không ở backend: `Effect` của module là tiếng nói, tiếng
 *  động và hình vẽ — chúng phải xảy ra ở chỗ có loa và có màn, tức là ở trang mà
 *  OBS đang thu. Backend giữ phiên; sân khấu biến phiên thành thứ nghe và thấy được.
 */

import { useEffect, useRef, useState } from 'react';
import type { Effect, Json, SlotName } from '@live/contracts';
import { HangGiong, playSfx } from './audio';
import { SO_MODULE, timDangKy } from './registry';
import type { TheSong } from './registry';
import type { StageState } from './state';

/** Nhịp chạy `onTick` và nhịp vẽ lại phần hiển thị theo thời gian. */
const NHIP_MS = 250;
/** Lời MC hiện bao lâu rồi tắt, khi không có câu mới thay. */
const LOI_MC_MS = 6_000;

export interface LoiMc {
  text: string;
  at: number;
}

export interface KetQuaChay {
  /** Trạng thái lõi của từng module, cho phần vẽ đọc. */
  modState: ReadonlyMap<string, unknown>;
  /** Câu MC đang nói. Chưa có giọng đọc nên nó hiện thành chữ trên màn — vốn
   *  cũng là thứ cần có, người xem tắt tiếng vẫn theo được. */
  loiMc: LoiMc | null;
  /** Slot đang được module xin sáng, kèm mốc hết hạn. */
  slotSang: ReadonlyMap<SlotName, number>;
  now: number;
}

function bayGio(): number {
  return Date.now();
}

/**
 * Nạp, nuôi và dọn các lõi module theo đúng danh sách đang bật.
 *
 * Bật tắt module hay đổi cấu hình giữa lúc đang live đều KHÔNG tải lại trang:
 * module mới được dựng tại chỗ, module tắt được `dispose`, cấu hình mới đi qua
 * `onConfig`. Phòng đang live mà tải lại là mất khán giả.
 */
export function useRunner(s: StageState): KetQuaChay {
  const song = useRef(new Map<string, TheSong>());
  const idCuoi = useRef(0);
  const cauHinh = useRef(new Map<string, Json>());

  const giong = useRef<HangGiong | null>(null);
  giong.current ??= new HangGiong();

  const [now, setNow] = useState(bayGio);
  const [modState, setModState] = useState<ReadonlyMap<string, unknown>>(new Map());
  const [loiMc, setLoiMc] = useState<LoiMc | null>(null);
  const slotSang = useRef(new Map<SlotName, number>());

  const nhan = useRef((ra: Effect[]) => {
    for (const e of ra) {
      if (e.kind === 'say') {
        // Vừa đọc to vừa hiện chữ: người xem tắt tiếng vẫn theo được.
        setLoiMc({ text: e.text, at: bayGio() });
        giong.current?.noi(e.text, e.priority ?? 'normal');
      } else if (e.kind === 'sfx') {
        playSfx(e.sound, e.volume ?? 1);
      } else if (e.kind === 'overlay') {
        slotSang.current.set(e.slot, bayGio() + (e.ttlMs ?? 4000));
      }
      // `spawn`, `record` và `command` chưa có nơi thực thi: `command` cần cổng
      // duyệt. Bỏ im lặng ở đây còn hơn giả vờ đã làm.
    }
  });

  // Cài đặt giọng đổi giữa lúc đang live: áp ngay, không tải lại trang.
  useEffect(() => {
    giong.current?.datCauHinh(s.voice);
  }, [s.voice]);

  // Dựng và dọn lõi theo danh sách module đang bật.
  useEffect(() => {
    const bang = song.current;
    const can = new Set(s.enabled.filter((id) => timDangKy(id) !== undefined));

    for (const [id, t] of bang) {
      if (!can.has(id)) {
        t.dispose();
        bang.delete(id);
      }
    }
    for (const id of can) {
      if (bang.has(id)) continue;
      const dk = timDangKy(id);
      if (dk === undefined) continue;
      bang.set(id, dk.mo((s.config[id] ?? {}) as Json));
    }
    setModState(new Map([...bang].map(([id, t]) => [id, t.state()])));
  }, [s.enabled, s.config]);

  // Cấu hình đổi giữa lúc đang chạy: đẩy vào lõi, không dựng lại.
  useEffect(() => {
    for (const [id, t] of song.current) {
      const c = (s.config[id] ?? {}) as Json;
      if (cauHinh.current.get(id) === c) continue;
      cauHinh.current.set(id, c);
      t.doiCauHinh(c);
    }
    setModState(new Map([...song.current].map(([id, t]) => [id, t.state()])));
  }, [s.config]);

  // Mục feed mới: đưa qua đúng móc của từng module đang bật.
  useEffect(() => {
    const moi = s.session.recentFeed.filter((f) => f.id > idCuoi.current);
    if (moi.length === 0) return;
    idCuoi.current = Math.max(...moi.map((f) => f.id));

    const ctx = { now: bayGio(), rand: Math.random, session: s.session };
    const ra: Effect[] = [];
    for (const t of song.current.values()) {
      for (const f of moi) ra.push(...t.feed(f, ctx));
    }
    nhan.current(ra);
    setModState(new Map([...song.current].map(([id, t]) => [id, t.state()])));
  }, [s.session]);

  // Nhịp đều: chạy `onTick`, dọn slot hết hạn, và đẩy `now` để phần vẽ theo
  // thời gian (bóng chat tự tắt) được vẽ lại.
  useEffect(() => {
    const h = setInterval(() => {
      const t = bayGio();
      const ctx = { now: t, rand: Math.random, session: s.session };
      const ra: Effect[] = [];
      for (const m of song.current.values()) ra.push(...m.tick(t, ctx));
      nhan.current(ra);

      for (const [slot, han] of slotSang.current) {
        if (han <= t) slotSang.current.delete(slot);
      }
      setNow(t);
      setModState(new Map([...song.current].map(([id, m]) => [id, m.state()])));
      setLoiMc((cu) => (cu !== null && t - cu.at > LOI_MC_MS ? null : cu));
    }, NHIP_MS);
    return () => clearInterval(h);
  }, [s.session]);

  // Rời trang thì dọn, để module nào giữ tài nguyên cũng được trả lại, và
  // không còn câu nào đọc tiếp sau khi sân khấu đã tắt.
  useEffect(() => {
    const bang = song.current;
    const g = giong.current;
    return () => {
      g?.dung();
      for (const t of bang.values()) t.dispose();
      bang.clear();
    };
  }, []);

  return { modState, loiMc, slotSang: slotSang.current, now };
}

export { SO_MODULE };
