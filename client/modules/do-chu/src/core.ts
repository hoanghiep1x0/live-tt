/** Lõi module Lớp học đố chữ — nối máy lớp học (`lop/quiz.ts`, chuyển gần
 *  nguyên vẹn từ repo lop-hoc-chu) vào runtime của Live Studio.
 *
 *  Bản cũ có một `useGame` React lo bốn việc lẫn nhau: nhận sự kiện TikTok, đọc
 *  giọng, giữ nhịp, lưu sổ lên máy chủ Node. Ở đây tách ra:
 *  - sự kiện đến qua móc feed (`hooks`), giờ và ngẫu nhiên tiêm vào;
 *  - giọng đi ra bằng `Effect` `say` — runtime xếp hàng và đọc;
 *  - nhịp giọng ("cô đọc xong đề mới đếm giờ") đọc từ `ctx.dangNoi`;
 *  - sổ lớp nằm NGAY trong state (`so-lop.ts`), phần vẽ chỉ nạp và cất file.
 */

import type { Ctx, Effect, FeedItem, ModuleCore } from '@live/contracts';
import { GAME } from './lop/config';
import { Classroom, plain } from './lop/quiz';
import type { RecessGame, Say } from './lop/quiz';
import type { Question } from './lop/questions';
import type { ShowBank, ShowKind } from './lop/show';
import { GiftThanker, OncePerPerson } from './lop/chatter';
import { speakableName } from './lop/names';
import { containsBanned } from './lop/tu-cam';
import { diemDanh, docSo, gopSo, phienMoi, talkTop, todayTop, weekTop } from './so-lop';
import type { DongTop, SoLop } from './so-lop';
import { NUT } from './manifest';
import type { Config } from './manifest';

/** Dữ liệu phần vẽ nạp lúc mở trang: bộ câu (gói trong phần vẽ để các phòng
 *  khác không phải tải) và sổ lớp máy chủ đang cất. */
export interface DuLieuNap {
  bank: Question[];
  showBank: ShowBank;
  so: unknown;
}

interface CauCho {
  text: string;
  priority: boolean;
  until: number;
}

export interface QuaGanNhat {
  nickname: string;
  giftName: string;
  coins: number;
  count: number;
  at: number;
}

export interface State {
  config: Config;
  /** Lớp đang học. `null` khi chưa nạp xong bộ câu và sổ. */
  room: Classroom | null;
  so: SoLop | null;
  /** Hộp thư phần vẽ bỏ dữ liệu vào; nhịp kế lõi mở lớp. */
  nap: DuLieuNap | null;
  /** Đã xin phần vẽ nạp chưa — để nó không nạp hai lần. */
  dangNap: boolean;
  /** Sổ đổi từ lần cất trước. Phần vẽ cất rồi hạ cờ. */
  soDoi: boolean;
  /** Vừa đọc câu chính (đề, đáp án, tổng kết): còn đọc thì đồng hồ dừng. */
  choCauChinh: boolean;
  /** Câu chính vừa đọc là câu đề: đọc xong thì mở bảng chữ. */
  moBangSauKhiDoc: boolean;
  /** Câu nói thêm (chào, cảm ơn, cà khịa) chờ lúc rảnh mới nói. */
  noiThem: CauCho[];
  chao: { names: { key: string; name: string }[]; seen: Set<string>; lastAt: number };
  gifts: GiftThanker;
  follows: OncePerPerson;
  likeBase: number | null;
  lastTick: number;
  lastShare: number;
  phien: string;
  lastGift: QuaGanNhat | null;
  tops: { week: DongTop[]; today: DongTop[]; talk: DongTop[] };
}

/** Ảnh gốc của các trường trong GAME mà cấu hình được chỉnh — để tắt một tuỳ
 *  chọn là trả đúng số cũ, không phải đoán. */
const GOC = {
  questionSec: GAME.questionSec,
  teamPickSec: GAME.teamPickSec,
  showEvery: GAME.showEvery,
};

/** Tên cô giáo, chữ bảng đỏ: ô để trống là chữ gốc. */
export const tenCo = (c: Config): string => c.tenCo.trim() || 'Cô Ngân';
export const khauHieu = (c: Config): string => c.khauHieu.trim() || 'NGHE HẾT ĐỀ – GÕ MỚI ĂN ĐIỂM';

/** Số chỗ đứng ngoài 2 cửa — bằng 2 × `CHO_MOT_BEN` ở `view/GameStage.tsx` (11 mỗi cửa: 9 ngoài hành lang,
 *  2 chớm qua ngưỡng). Khung cửa chỉ chứa chừng ấy người; bạn sau nữa vẫn chơi, hiện ở "chờ vào lớp". */
export const DUNG_CUA = 22;

/** Máy lớp học đọc số liệu từ một object `GAME` chung, nên cấu hình được áp
 *  bằng cách ghi đè vài trường của nó. Một trang chỉ có một lớp, nên không có
 *  hai cấu hình giành nhau. */
export function apCauHinh(c: Config): void {
  GAME.questionSec = c.giayMoiCau;
  GAME.quickRead = c.cheDoNhanh;
  GAME.teamPickSec = c.chiaTo ? GOC.teamPickSec : 0;
  // Tắt cả 2 game lớn thì `nextKind()` rỗng, tới lượt game lớn là ra chơi như thường.
  GAME.showEvery = GOC.showEvery;
  GAME.showsOn = { everest: c.everest, chuong: c.chuong };
  GAME.teacherName = tenCo(c);
  // Đúng số chỗ phần vẽ có ở 2 khung cửa.
  GAME.standing = c.dungCua ? DUNG_CUA : 0;
}

/** Đổi lời thoại kiểu cũ sang kiểu dàn giọng của Live Studio.
 *
 *  Bản cũ viết "F: câu | E: cat | F: tiếp" (`|` tách đoạn, `F:` giọng nữ, `M:` giọng
 *  nam, `E:` giọng tiếng Anh, `^` hô to). Ở đây đoạn tiếng Anh thành `[giongAnh] … [-]`
 *  khi có chọn giọng tiếng Anh; còn lại đọc liền một giọng. */
export function chuMieng(text: string, giongAnh: string): { text: string; daGiong: boolean } {
  const doan: string[] = [];
  let daGiong = false;
  for (const tho of text.split('|')) {
    let t = tho.trim();
    let anh = false;
    const m = /^([MFE]):\s*/.exec(t);
    if (m !== null) {
      anh = m[1] === 'E';
      t = t.slice(m[0].length);
    }
    t = t.replace(/^\^\s*/, '').trim();
    if (t === '') continue;
    if (anh && giongAnh !== '') {
      doan.push(`[${giongAnh}] ${t} [-]`);
      daGiong = true;
    } else {
      doan.push(t);
    }
  }
  return { text: doan.join(' '), daGiong };
}

function cauNoi(st: State, l: Say, priority: 'normal' | 'high' = 'normal'): Effect {
  const c = chuMieng(l.text, st.config.giongAnh);
  // Lớp học tự vẽ mọi chữ lên bảng: không cần thẻ MC lặp lại câu cô nói.
  const e: Extract<Effect, { kind: 'say' }> = { kind: 'say', text: c.text, priority, caption: false };
  if (c.daGiong) e.daGiong = true;
  return e;
}

/** Xếp câu máy lớp học trả về: câu chính đọc ngay (đồng hồ dừng trong lúc
 *  đọc), câu nhắc giờ chen lên đọc liền, còn lại chờ lúc rảnh. */
function noi(st: State, lines: Say[], now: number): Effect[] {
  const ra: Effect[] = [];
  for (const l of lines) {
    if (l.text.trim() === '') continue;
    if (l.main === true) {
      st.choCauChinh = true;
      if (l.showAfter === true || l.go === true) st.moBangSauKhiDoc = true;
      // Câu chương trình chen lên trước câu MC AI / tính năng khác đang chờ, và
      // không bị hàng đọc bỏ khi đầy (`xep` giữ đúng thứ tự giữa chúng).
      ra.push(cauNoi(st, l, 'high'));
    } else if (l.warn === true) {
      ra.push(cauNoi(st, l, 'high'));
    } else {
      const ttl = l.ttl ?? (l.priority === true ? GAME.giftLineMaxWaitMs : GAME.chatterMaxWaitMs);
      st.noiThem.push({ text: l.text, priority: l.priority === true, until: now + ttl });
    }
  }
  return ra;
}

/** Hàng đọc đẩy câu `high` lên ĐẦU từng câu một, nên một lượt có nhiều câu
 *  `high` sẽ bị đọc ngược. Đảo riêng các câu đó trước khi trả ra để cô đọc đúng
 *  thứ tự máy lớp học viết; câu khác giữ nguyên chỗ. */
export function xep(ra: Effect[]): Effect[] {
  const cao = ra.filter((e) => e.kind === 'say' && e.priority === 'high').reverse();
  let i = 0;
  return ra.map((e) => (e.kind === 'say' && e.priority === 'high' ? cao[i++]! : e));
}

/** ['An', 'Bình', 'Chi'] → 'bạn An, bạn Bình và bạn Chi' */
export function noiTen(names: string[]): string {
  const spoken = names.map((n) => `bạn ${n}`);
  return spoken.length > 1 ? `${spoken.slice(0, -1).join(', ')} và ${spoken[spoken.length - 1] ?? ''}` : (spoken[0] ?? '');
}

interface Nguoi {
  username: string;
  nickname: string;
  spoken: string;
  avatar: string;
}

/** Tên an toàn để hiện và đọc: tên có từ cấm thì dùng nick. Ảnh đại diện lấy
 *  từ phiên — mục feed không mang ảnh. */
function nguoi(item: FeedItem, ctx: Ctx<Config>): Nguoi {
  const username = item.user ?? item.name;
  const nickname = containsBanned(item.name) ? username : item.name;
  const avatar = ctx.session.recentUsers.find((u) => u.user === username)?.avatar ?? '';
  return { username, nickname, spoken: speakableName(nickname), avatar };
}

function lamTop(st: State): void {
  if (st.so === null) return;
  st.tops = { week: weekTop(st.so), today: todayTop(st.so), talk: talkTop(st.so) };
  const dau = st.tops.week[0];
  if (st.room !== null) st.room.weekLeader = dau ? speakableName(dau.nickname) : '';
}

/** Phần vẽ gọi sau khi tải xong bộ câu và sổ. Lõi mở lớp ở nhịp kế. */
export function napDuLieu(st: State, d: DuLieuNap): void {
  st.nap = d;
}

/** Bản sổ để cất, và hạ cờ đổi. `null` khi không có gì mới. */
export function laySoDeCat(st: State): SoLop | null {
  if (st.so === null || !st.soDoi) return null;
  st.soDoi = false;
  return st.so;
}

function moLop(st: State, d: DuLieuNap, now: number, ctx: Ctx<Config>): Effect[] {
  const so = docSo(d.so, now);
  const room = new Classroom(d.bank, now, ctx.rand, so.used, Object.keys(so.banned));
  room.showBank = d.showBank;
  room.setFlowersSaved(so.today.flowers);
  st.so = so;
  st.room = room;
  lamTop(st);
  return noi(st, room.newRound(now), now);
}

/** Nhả một câu nói thêm nếu đang tới lúc: giọng rảnh, không còn câu chính,
 *  lớp đang chờ trả lời và còn đủ giờ. Cảm ơn quà trước; câu thường mỗi phần
 *  chỉ `GAME.chatterPerPhase` câu. */
function nhaNoiThem(st: State, room: Classroom, now: number, ctx: Ctx<Config>): Effect[] {
  st.noiThem = st.noiThem.filter((c) => c.until > now);
  if (ctx.dangNoi === true || st.choCauChinh || !room.chatterWindow(now)) return [];
  const p = st.noiThem.findIndex((c) => c.priority);
  const i = p >= 0 ? p : room.chatterAllowed(false) ? 0 : -1;
  if (i < 0) return [];
  const next = st.noiThem.splice(i, 1)[0];
  if (next === undefined) return [];
  if (!next.priority) room.chatterUsed++;
  return [cauNoi(st, { text: next.text })];
}

function chaoLuot(st: State, room: Classroom, now: number): Effect[] {
  const c = st.chao;
  if (c.names.length === 0 || now - c.lastAt < GAME.greetEveryMs) return [];
  // Còn câu nói thêm đang chờ thì gom tên lượt sau.
  if (st.noiThem.length >= 2) return [];
  c.lastAt = now;
  const batch = c.names.splice(0, GAME.namesPerGreeting);
  return noi(st, [room.greet(noiTen(batch.map((b) => b.name)))], now);
}

const RA_CHOI: readonly RecessGame[] = ['rps', 'callup', 'pick', 'roll', 'heart'];

/** Người vận hành bấm nút trên thẻ. */
function bam(st: State, op: string, ctx: Ctx<Config>): Effect[] {
  const room = st.room;
  if (room === null) return [];
  const now = ctx.now;
  switch (op) {
    case NUT.tietMoi:
      st.noiThem = [];
      return noi(st, room.newRound(now), now);
    case NUT.quaCau:
      return noi(st, room.skip(now), now);
    case NUT.boCau:
      return noi(st, room.banCurrent(now), now);
    case NUT.raChoi: {
      const g = RA_CHOI[Math.floor(ctx.rand() * RA_CHOI.length)] ?? 'rps';
      return noi(st, room.forceRecess(g, now), now);
    }
    case NUT.everest:
    case NUT.chuong:
      return noi(st, room.forceShow(op as ShowKind, now), now);
    case NUT.tamBiet:
      return noi(st, room.goodbye(now), now);
    default:
      return [];
  }
}


export const core: ModuleCore<Config, State> = {
  init(config) {
    apCauHinh(config);
    return {
      config,
      room: null,
      so: null,
      nap: null,
      dangNap: false,
      soDoi: false,
      choCauChinh: false,
      moBangSauKhiDoc: false,
      noiThem: [],
      chao: { names: [], seen: new Set(), lastAt: 0 },
      gifts: new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins),
      follows: new OncePerPerson(),
      likeBase: null,
      lastTick: 0,
      lastShare: 0,
      phien: '',
      lastGift: null,
      tops: { week: [], today: [], talk: [] },
    };
  },

  onConfig(st, config) {
    st.config = config;
    apCauHinh(config);
    return st;
  },

  tickMs: 200,

  onTick(st, now, ctx) {
    if (st.room === null) {
      if (st.nap === null) return [];
      const d = st.nap;
      st.nap = null;
      st.lastTick = now;
      st.lastShare = now;
      // Nhịp mở lớp chỉ mở lớp: câu chào vừa trả ra chưa vào hàng đọc, xét
      // "cô đọc xong chưa" ngay nhịp này là tưởng đã đọc xong.
      return xep(moLop(st, d, now, ctx));
    }
    const room = st.room;
    if (st.so === null) return [];
    const ra: Effect[] = [];

    // Phiên live mới: làm lại Top tương tác. Rớt mạng nối lại cùng phiên thì giữ.
    const phien = ctx.session.startedAt === null ? '' : String(ctx.session.startedAt);
    if (phien !== st.phien) {
      st.phien = phien;
      if (phienMoi(st.so, phien)) st.soDoi = true;
    }

    // Cô đang đọc câu chính: dừng đồng hồ. Đọc xong (hàng giọng rảnh) thì
    // chạy lại, và nếu đó là câu đề thì mở bảng chữ.
    if (st.choCauChinh) {
      if (ctx.dangNoi === true) {
        room.hold(now - st.lastTick);
      } else {
        st.choCauChinh = false;
        if (st.moBangSauKhiDoc) {
          st.moBangSauKhiDoc = false;
          room.showBoard(now);
        }
      }
    }
    st.lastTick = now;

    ra.push(...noi(st, room.tick(now), now));
    ra.push(...chaoLuot(st, room, now));
    if (now - st.lastShare >= GAME.shareReminderEveryMs) {
      st.lastShare = now;
      ra.push(...noi(st, [room.share()], now));
    }
    ra.push(...nhaNoiThem(st, room, now, ctx));

    if (gopSo(st.so, room, now)) {
      st.soDoi = true;
      lamTop(st);
    }
    return xep(ra);
  },

  hooks: {
    comment: {
      // Nhân vật ảo cũng vào: có ghế, có bong bóng chat — nhưng đi lối riêng
      // (`virtualIn`), không bao giờ tới chỗ chấm bài, điểm danh hay sổ lớp.
      includeVirtual: true,
      run(st, item, ctx) {
        const room = st.room;
        if (room === null || st.so === null) return [];
        const p = nguoi(item, ctx);
        if (item.virtual === true) {
          room.virtualIn(p, ctx.now, containsBanned(item.text) ? '' : item.text);
          return [];
        }
        const isNew = !room.students.has(p.username);
        const ra = noi(
          st,
          room.chat({ ...p, comment: item.text, createTime: item.at, safe: !containsBanned(item.text) }, ctx.now),
          ctx.now,
        );
        if (isNew && p.spoken !== 'bạn' && GAME.joinKeywords.includes(plain(item.text)) && !st.chao.seen.has(p.username)) {
          st.chao.seen.add(p.username);
          st.chao.names.push({ key: p.username, name: p.spoken });
          if (st.chao.names.length > 30) st.chao.names.shift();
        }
        // Chuyên cần: lần đầu bình luận trong buổi thì ghi ngày đi học.
        if (isNew) {
          const a = diemDanh(st.so, p.username, p.nickname, ctx.now);
          st.soDoi = true;
          ra.push(...noi(st, room.attendance(p, a.days, ctx.now, a.life), ctx.now));
        }
        return xep(ra);
      },
    },
    // TikTok không báo người xem thật vào/ra theo kiểu này (bạn thật vào lớp
    // khi bình luận, như bản cũ); hai móc này chỉ để nhân vật ảo lấy và trả ghế.
    join: {
      includeVirtual: true,
      run(st, item, ctx) {
        if (item.virtual === true) st.room?.virtualIn(nguoi(item, ctx), ctx.now);
        return [];
      },
    },
    leave: {
      includeVirtual: true,
      run(st, item) {
        if (item.virtual === true) st.room?.virtualOut(item.user ?? item.name);
        return [];
      },
    },
    gift: {
      run(st, item, ctx) {
        const room = st.room;
        if (room === null) return [];
        const p = nguoi(item, ctx);
        const count = item.count ?? 1;
        const coins = item.coins ?? item.xu ?? 0;
        const giftName = item.gift ?? '';
        st.lastGift = { nickname: p.nickname, giftName, coins, count, at: ctx.now };
        const hint = room.gift(p, coins, ctx.now, count, giftName);
        const ra = noi(st, hint, ctx.now);
        const choCamOn = st.noiThem.filter((c) => c.priority).length;
        if (hint.length === 0 && st.gifts.shouldThank(p.username, coins, choCamOn, ctx.now)) {
          ra.push(...noi(st, [room.thank(p, giftName, coins)], ctx.now));
        }
        return xep(ra);
      },
    },
    like: {
      run(st, item, ctx) {
        const room = st.room;
        if (room === null) return [];
        const count = item.count ?? 1;
        const total = ctx.session.totals.likes;
        if (st.likeBase === null) st.likeBase = total - count;
        // Tim thật × heartBoost: đủ 300 tim (60 tim thật) là cả lớp vỗ tay.
        const reached = (total - st.likeBase) * GAME.heartBoost >= GAME.likesPerClap;
        if (reached) st.likeBase = total;
        return xep(noi(st, room.like(count, ctx.now, reached), ctx.now));
      },
    },
    follow: {
      run(st, item, ctx) {
        const room = st.room;
        if (room === null) return [];
        const p = nguoi(item, ctx);
        return st.follows.first(p.username) ? noi(st, [room.follow(p)], ctx.now) : [];
      },
    },
  },

  onAction(st, op, ctx) {
    return xep(bam(st, op, ctx));
  },

  trangThaiNut(st) {
    const r = st.room;
    if (r === null) return { bat: null, chu: 'Đang mở lớp…' };
    const pha: Record<string, string> = {
      team: 'Chọn tổ',
      intro: 'Giới thiệu tiết',
      question: `Câu ${r.qNo}/${GAME.questionsPerRound}`,
      bonus: `Câu ${r.qNo} · thêm giờ`,
      reveal: `Câu ${r.qNo} · đáp án`,
      praise: 'Điểm danh giữa tiết',
      results: 'Tổng kết tiết',
      recess: 'Giờ ra chơi',
      show: r.show?.kind === 'everest' ? 'Đường lên đỉnh Everest' : 'Rung Chuông Đồng',
      vote: 'Bình chọn chủ đề',
    };
    return { bat: null, chu: `Tiết ${r.round} · ${pha[r.phase] ?? r.phase} · ${r.students.size} bạn` };
  },
};
