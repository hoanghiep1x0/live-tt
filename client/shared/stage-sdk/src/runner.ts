/** Chạy lõi module ngay trên sân khấu.
 *
 *  Vì sao chạy ở đây chứ không ở backend: `Effect` của module là tiếng nói, tiếng
 *  động và hình vẽ — chúng phải xảy ra ở chỗ có loa và có màn, tức là ở trang mà
 *  OBS đang thu. Backend giữ phiên; sân khấu biến phiên thành thứ nghe và thấy được.
 */

import { useEffect, useRef, useState } from 'react';
import { boVai, xungMinh } from '@live/contracts';
import type { Effect, Json, SlotName } from '@live/contracts';
import { HangGiong, playSfx } from './audio';
import { SO_MODULE, timDangKy } from './registry';
import type { TheSong } from './registry';
import { giongChoViec } from './state';
import type { StageState } from './state';

/** Nhịp chạy `onTick` và nhịp vẽ lại phần hiển thị theo thời gian. */
const NHIP_MS = 250;
/** Lời MC hiện bao lâu rồi tắt, khi không có câu mới thay. */
export const LOI_MC_MS = 6_000;
/** Lời kể chờ giọng tối đa ngần này rồi khung truyện vẫn đổi (giọng hỏng, hàng
 *  kẹt). Bình thường khung đổi đúng lúc giọng bắt đầu đọc. */
export const CHO_GIONG_KE_MS = 30_000;
/** Câu MC cũ hơn ngần này (trang vừa mở) thì không đọc lại. */
const CAU_CU_MS = 20_000;

export interface LoiMc {
  text: string;
  /** Lúc giọng bắt đầu đọc câu này (thẻ hiện cùng lúc). */
  at: number;
  /** Thẻ giữ bao lâu (ms): theo độ dài câu, để chữ còn đó tới khi giọng đọc
   *  xong — câu dài mà tắt sau 6 giây là chữ biến mất giữa lúc đang nghe. */
  ms: number;
}

/** Thẻ lời MC giữ bao lâu cho câu `text`: tối thiểu `LOI_MC_MS`, câu dài thì
 *  theo thời gian đọc (~13 ký tự/giây) cộng một hơi. Hàm thuần. */
export function thoiGianHien(text: string): number {
  return Math.min(15_000, Math.max(LOI_MC_MS, Math.round((text.length * 1000) / 13) + 1_200));
}

function loiMcMoi(text: string): LoiMc {
  const t = boVai(text);
  return { text: t, at: bayGio(), ms: thoiGianHien(t) };
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
  /** Cho THIẾT KẾ đọc một câu — vd lời cảm ơn người lên ôm. Đi chung hàng đọc
   *  với module và MC, nên không bao giờ hai giọng chồng nhau. Không hiện chữ
   *  ở khung MC: thiết kế gọi câu này thường đã tự vẽ chữ của nó rồi. */
  noi: (text: string, voice?: string) => void;
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
  const phienCuoi = useRef<number | null>(null);
  const nutCuoi = useRef(0);
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
        // Vừa đọc to vừa hiện chữ: người xem tắt tiếng vẫn theo được. Trừ khi
        // module đã tự vẽ câu đó lên màn rồi. Chữ hiện ĐÚNG LÚC giọng bắt đầu
        // đọc câu đó — hiện trước rồi một lúc sau mới nghe là lệch nhịp.
        const text = xungMinh(e.text);
        const hienChu = e.caption !== false ? () => setLoiMc(loiMcMoi(text)) : undefined;
        giong.current?.noi(text, e.priority ?? 'normal', e.voice ?? '', e.daGiong, hienChu === undefined ? {} : { batDau: hienChu });
      } else if (e.kind === 'sfx') {
        playSfx(e.sound, e.volume ?? 1);
      } else if (e.kind === 'overlay') {
        slotSang.current.set(e.slot, bayGio() + (e.ttlMs ?? 4000));
      }
      // `spawn`, `record` và `command` chưa có nơi thực thi: `command` cần cổng
      // duyệt. Bỏ im lặng ở đây còn hơn giả vờ đã làm.
    }
  });

  // "Ai đọc gì" → Cảm ơn quà: phòng đã giao giọng thì lời cảm ơn quà đọc bằng
  // các giọng đó, thay phiên — thay giọng riêng của tính năng.
  const aiMoi = useRef(s.ai);
  aiMoi.current = s.ai;
  const quaTruoc = useRef('');
  const theoVai = useRef((id: string, ra: Effect[]): Effect[] => {
    const ds = aiMoi.current?.vaiGiong?.qua ?? [];
    if (id !== 'gift-thanks' || ds.length === 0) return ra;
    return ra.map((e) => {
      if (e.kind !== 'say') return e;
      const g = giongChoViec(ds, quaTruoc.current, Math.random);
      quaTruoc.current = g;
      return { ...e, voice: g };
    });
  }).current;

  const noi = useRef((text: string, voice = '') =>
    nhan.current([{ kind: 'say', text, voice, caption: false }]),
  );

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
    // Phiên mới (phát lại, hay đổi phòng) đánh số feed lại từ 1. Giữ số cũ thì
    // mọi mục của phiên mới bị coi là đã xử lý cho tới khi vượt số đó.
    if (s.session.startedAt !== phienCuoi.current) {
      phienCuoi.current = s.session.startedAt;
      idCuoi.current = 0;
    }
    const moi = s.session.recentFeed.filter((f) => f.id > idCuoi.current);
    if (moi.length === 0) return;
    idCuoi.current = Math.max(...moi.map((f) => f.id));

    const ctx = { now: bayGio(), rand: Math.random, session: s.session, dangNoi: giong.current?.ban() ?? false };
    const ra: Effect[] = [];
    // Câu MC đi qua feed như mọi mục khác. Nhờ vậy nó nằm trong phiên (lượt sau
    // AI đọc lại được mình vừa nói gì), và cửa sổ xem mở giữa chừng cũng bắt
    // đúng mạch. Không module nào sinh ra nó — nó từ backend xuống.
    const choGiong = new Set<number>();
    for (const f of moi) {
      if (f.kind !== 'host') continue;
      // Câu cũ (trang vừa mở, nhận lại cả feed gần đây): chỉ để dựng lại khung,
      // không đọc lại — đọc lại cả loạt lời kể cũ là phòng lạc nhịp.
      if (ctx.now - f.at > CAU_CU_MS) continue;
      if (f.ke !== undefined) {
        // Lời KỂ: hiện làm phụ đề trong khung truyện (module Kể chuyện vẽ),
        // lời thoại nhân vật đọc bằng giọng riêng theo dấu `[id]`. Khung (ảnh +
        // chữ) chỉ đổi ĐÚNG LÚC giọng bắt đầu đọc câu này — hình, chữ, giọng
        // cùng lên; lời kể xếp trước mọi câu chào trong hàng đọc.
        choGiong.add(f.id);
        let da = false;
        const hien = () => {
          if (da) return;
          da = true;
          const c2 = { now: bayGio(), rand: Math.random, session: s.session, dangNoi: true };
          const ra2: Effect[] = [];
          for (const t of song.current.values()) ra2.push(...t.feed(f, c2));
          nhan.current(ra2);
          setModState(new Map([...song.current].map(([id, t]) => [id, t.state()])));
        };
        setTimeout(hien, CHO_GIONG_KE_MS);
        giong.current?.noi(f.text, 'normal', f.voice ?? '', true, { truyen: true, batDau: hien });
        continue;
      }
      if (f.truyen === true) {
        // Câu mở truyện ("Mình kể thêm truyện…"): thẻ MC như thường, nhưng đọc
        // theo mạch truyện — ngay trước đoạn đầu, không xếp sau câu chào. Thẻ
        // hiện đúng lúc giọng bắt đầu đọc.
        const text = xungMinh(f.text);
        giong.current?.noi(text, 'normal', f.voice ?? '', undefined, {
          truyen: true,
          batDau: () => setLoiMc(loiMcMoi(text)),
        });
        continue;
      }
      // Câu nói với khách (chào, đáp): chen vào khoảng nghỉ ngay sau đoạn
      // đang đọc — không đọc chồng lên lời kể, cũng không xếp sau cả truyện.
      if (f.khach === true) {
        const text = xungMinh(f.text);
        giong.current?.noi(text, 'normal', f.voice ?? '', undefined, {
          khach: true,
          batDau: () => setLoiMc(loiMcMoi(text)),
        });
        continue;
      }
      const say: Extract<Effect, { kind: 'say' }> = { kind: 'say', text: xungMinh(f.text) };
      if (f.voice !== undefined) say.voice = f.voice;
      ra.push(say);
    }
    for (const [id, t] of song.current) {
      for (const f of moi) {
        if (choGiong.has(f.id)) continue;
        const e = theoVai(id, t.feed(f, ctx));
        // Mục cũ (trang vừa mở hay OBS tải lại, nhận lại cả feed gần đây): vẫn
        // cho module đi qua để dựng lại trạng thái, nhưng BỎ hiệu ứng — không
        // thì mỗi lần tải lại là cảm ơn lại quà cũ, chào lại người cũ, đọc lại
        // mốc tim cũ. Lời MC (`host`) giữ nguyên: khung truyện dựng lại từ nó.
        if (f.kind !== 'host' && ctx.now - f.at > CAU_CU_MS) continue;
        ra.push(...e);
      }
    }
    nhan.current(ra);
    setModState(new Map([...song.current].map(([id, t]) => [id, t.state()])));
  }, [s.session]);

  // Người vận hành bấm nút của module: chạy mỗi lần bấm đúng một lần, chỉ ở module
  // đang bật. Trang vừa mở không chạy lại các lần bấm cũ — `hanhDong` rỗng lúc đầu.
  useEffect(() => {
    const moi = s.hanhDong.filter((h) => h.id > nutCuoi.current);
    if (moi.length === 0) return;
    nutCuoi.current = Math.max(...moi.map((h) => h.id));
    const ctx = { now: bayGio(), rand: Math.random, session: s.session, dangNoi: giong.current?.ban() ?? false };
    const ra: Effect[] = [];
    for (const h of moi) ra.push(...(song.current.get(h.moduleId)?.action(h.op, ctx) ?? []));
    nhan.current(ra);
    setModState(new Map([...song.current].map(([id, t]) => [id, t.state()])));
  }, [s.hanhDong]);

  // Nhịp đều: chạy `onTick`, dọn slot hết hạn, và đẩy `now` để phần vẽ theo
  // thời gian (bóng chat tự tắt) được vẽ lại.
  useEffect(() => {
    const h = setInterval(() => {
      const t = bayGio();
      const ctx = { now: t, rand: Math.random, session: s.session, dangNoi: giong.current?.ban() ?? false };
      const ra: Effect[] = [];
      for (const m of song.current.values()) ra.push(...m.tick(t, ctx));
      nhan.current(ra);

      for (const [slot, han] of slotSang.current) {
        if (han <= t) slotSang.current.delete(slot);
      }
      setNow(t);
      setModState(new Map([...song.current].map(([id, m]) => [id, m.state()])));
      setLoiMc((cu) => (cu !== null && t - cu.at > cu.ms ? null : cu));
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

  return { modState, loiMc, slotSang: slotSang.current, now, noi: noi.current };
}

export { SO_MODULE };
