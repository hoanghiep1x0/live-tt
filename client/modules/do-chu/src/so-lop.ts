/** Sổ lớp: thứ lớp học phải nhớ qua nhiều buổi live.
 *
 *  Bản cũ để máy chủ Node tự cộng điểm, tự sang tuần mới. Ở kiến trúc này máy
 *  chủ chỉ CẤT một file JSON cho module (`/s/so/<thiết kế>/do-chu`), nên mọi
 *  phép tính chuyển về đây — hàm thuần, giờ truyền vào, test được ở Node.
 *
 *  Giữ đúng luật của bản cũ:
 *  - câu nào hỏi lúc nào (game ưu tiên câu lâu chưa hỏi), câu chủ kênh đã bỏ;
 *  - bảng vàng tuần (tự xoá khi sang tuần ISO mới), điểm và tương tác hôm nay
 *    (xoá khi sang ngày mới), quỹ hoa hôm nay;
 *  - chuyên cần: số ngày đi học liền;
 *  - học bạ cả đời: điểm cộng dồn mãi (lên lớp) và số câu đúng từng loại.
 */

import { emptyLife } from './lop/quiz';
import type { Classroom, Life } from './lop/quiz';

export interface Diem {
  nickname: string;
  points: number;
}

export interface ChuyenCan {
  nickname: string;
  /** Ngày gần nhất vào lớp, dạng `2026-11-04`. */
  last: string;
  streak: number;
  total: number;
}

export type DongHocBa = { nickname: string } & Life;

export interface SoLop {
  /** id câu → lần hỏi gần nhất (ms). */
  used: Record<string, number>;
  /** Tuần đang tính, vd `2026-W45`. */
  week: string;
  scores: Record<string, Diem>;
  banned: Record<string, { answer: string; clue: string; at: number }>;
  attend: Record<string, ChuyenCan>;
  today: {
    date: string;
    scores: Record<string, Diem>;
    talk: Record<string, Diem>;
    flowers: number;
    /** Phiên live đang tính Top tương tác. Phiên khác là làm lại bảng. */
    talkRoom: string;
  };
  life: Record<string, DongHocBa>;
}

export interface DongTop {
  username: string;
  nickname: string;
  points: number;
}

/** Ngày theo giờ máy (Việt Nam), dạng `2026-11-04`. */
export function dayKey(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Tuần ISO (bắt đầu thứ hai), dạng `2026-W45`. */
export function weekKey(now: number): string {
  const d = new Date(now);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

export function soRong(now: number): SoLop {
  return {
    used: {},
    week: weekKey(now),
    scores: {},
    banned: {},
    attend: {},
    today: { date: dayKey(now), scores: {}, talk: {}, flowers: 0, talkRoom: '' },
    life: {},
  };
}

/** Tên TikTok có thể là `__proto__`: không cho làm khoá, tránh phá object sổ. */
const khoaAnToan = (k: string) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype';

const LIFE_KEYS = ['points', 'total', 'toan', 'su', 'meo', 'anh'] as const;

type Obj = Record<string, unknown>;
const laObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const so = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const chu = (x: unknown, max = 60) => (typeof x === 'string' ? x.slice(0, max) : '');

function bangDiem(x: unknown): Record<string, Diem> {
  const ra: Record<string, Diem> = {};
  if (!laObj(x)) return ra;
  for (const [k, v] of Object.entries(x)) {
    if (!khoaAnToan(k) || !laObj(v)) continue;
    ra[k] = { nickname: chu(v['nickname']), points: so(v['points']) };
  }
  return ra;
}

/** Đọc sổ máy chủ trả về. Sổ cũ, sổ hỏng một phần hay chưa có sổ đều thành một
 *  sổ dùng được — sân khấu không được kẹt ở màn chờ vì một dòng lạ. */
export function docSo(x: unknown, now: number): SoLop {
  const s = soRong(now);
  if (!laObj(x)) return s;
  if (laObj(x['used'])) {
    for (const [k, v] of Object.entries(x['used'])) if (khoaAnToan(k)) s.used[k] = so(v);
  }
  if (typeof x['week'] === 'string') s.week = x['week'];
  s.scores = bangDiem(x['scores']);
  if (laObj(x['banned'])) {
    for (const [k, v] of Object.entries(x['banned'])) {
      if (!khoaAnToan(k) || !laObj(v)) continue;
      s.banned[k] = { answer: chu(v['answer']), clue: chu(v['clue'], 300), at: so(v['at']) };
    }
  }
  if (laObj(x['attend'])) {
    for (const [k, v] of Object.entries(x['attend'])) {
      if (!khoaAnToan(k) || !laObj(v)) continue;
      s.attend[k] = { nickname: chu(v['nickname']), last: chu(v['last'], 10), streak: so(v['streak']), total: so(v['total']) };
    }
  }
  const t = x['today'];
  if (laObj(t) && typeof t['date'] === 'string') {
    s.today = {
      date: t['date'],
      scores: bangDiem(t['scores']),
      talk: bangDiem(t['talk']),
      flowers: so(t['flowers']),
      talkRoom: chu(t['talkRoom'], 80),
    };
  }
  if (laObj(x['life'])) {
    for (const [k, v] of Object.entries(x['life'])) {
      if (!khoaAnToan(k) || !laObj(v)) continue;
      const d: DongHocBa = { nickname: chu(v['nickname']), ...emptyLife() };
      for (const f of LIFE_KEYS) d[f] = so(v[f]);
      s.life[k] = d;
    }
  }
  return quaNgay(s, now);
}

/** Sang tuần mới thì xoá điểm tuần; sang ngày mới thì xoá điểm, tương tác và quỹ hoa hôm nay. */
export function quaNgay(s: SoLop, now: number): SoLop {
  const w = weekKey(now);
  if (s.week !== w) {
    s.week = w;
    s.scores = {};
  }
  const d = dayKey(now);
  if (s.today.date !== d) s.today = { date: d, scores: {}, talk: {}, flowers: 0, talkRoom: s.today.talkRoom };
  return s;
}

/** Top tương tác làm lại mỗi phiên live mới (chủ kênh chốt 2026-11-05). Rớt
 *  mạng nối lại cùng phiên thì giữ. Trả `true` khi vừa làm lại. */
export function phienMoi(s: SoLop, phien: string): boolean {
  if (phien === '' || s.today.talkRoom === phien) return false;
  s.today.talkRoom = phien;
  s.today.talk = {};
  return true;
}

function cong(book: Record<string, Diem>, key: string, nickname: string, points: number): void {
  const cur = book[key] ?? { nickname: '', points: 0 };
  cur.nickname = (nickname || cur.nickname).slice(0, 60);
  cur.points += points;
  book[key] = cur;
}

const kep = (x: number, max: number) => Math.max(0, Math.min(max, Math.round(x)));

/** Rút phần lớp vừa ghi (câu đã hỏi, điểm, học bạ, tương tác, quỹ hoa) ra khỏi
 *  `room` và cộng vào sổ. Gọi mỗi nhịp: phần cộng ngay để bảng trên màn đúng
 *  liền, không phải chờ lần lưu sau. Trả `true` khi sổ có đổi. */
export function gopSo(s: SoLop, room: Classroom, now: number): boolean {
  quaNgay(s, now);
  let doi = false;
  for (const id of room.usedLog.splice(0)) {
    if (!khoaAnToan(id)) continue;
    s.used[id.slice(0, 200)] = now;
    doi = true;
  }
  for (const [u, v] of room.weekDelta) {
    const key = u.slice(0, 100);
    if (!khoaAnToan(key)) continue;
    const p = kep(v.points, 1000);
    cong(s.scores, key, v.nickname, p);
    cong(s.today.scores, key, v.nickname, p);
    doi = true;
  }
  room.weekDelta.clear();
  for (const b of room.banLog.splice(0)) {
    if (!khoaAnToan(b.id)) continue;
    s.banned[b.id.slice(0, 200)] = { answer: b.answer.slice(0, 60), clue: b.clue.slice(0, 300), at: now };
    doi = true;
  }
  // Báo cáo từng câu của bản cũ cần một trang /bao-cao riêng — chưa chuyển,
  // nên bỏ ở đây cho khỏi phình bộ nhớ.
  room.reportLog.splice(0);
  for (const [u, v] of room.lifeDelta) {
    const key = u.slice(0, 100);
    if (!khoaAnToan(key)) continue;
    const cur = s.life[key] ?? { nickname: '', ...emptyLife() };
    cur.nickname = (v.nickname || cur.nickname).slice(0, 60);
    for (const f of LIFE_KEYS) cur[f] += kep(v[f], 5000);
    s.life[key] = cur;
    doi = true;
  }
  room.lifeDelta.clear();
  for (const [u, v] of room.talkDelta) {
    const key = u.slice(0, 100);
    if (!khoaAnToan(key)) continue;
    cong(s.today.talk, key, v.nickname, kep(v.points, 10_000));
    doi = true;
  }
  room.talkDelta.clear();
  if (room.flowerDelta > 0) {
    s.today.flowers += kep(room.flowerDelta, 1_000_000);
    room.flowerDelta = 0;
    doi = true;
  }
  return doi;
}

/** Chuyên cần: lần đầu bình luận trong buổi thì ghi ngày, trả số ngày đi học
 *  liền và học bạ để lớp biết bạn này đang học lớp mấy. */
export function diemDanh(
  s: SoLop,
  username: string,
  nickname: string,
  now: number,
): { days: number; total: number; life: Life } {
  const key = username.slice(0, 100);
  if (!khoaAnToan(key)) return { days: 0, total: 0, life: emptyLife() };
  const today = dayKey(now);
  const yesterday = dayKey(now - 86_400_000);
  const cur = s.attend[key] ?? { nickname: '', last: '', streak: 0, total: 0 };
  if (cur.last !== today) {
    cur.streak = cur.last === yesterday ? cur.streak + 1 : 1;
    cur.total++;
    cur.last = today;
  }
  cur.nickname = (nickname || cur.nickname).slice(0, 60);
  s.attend[key] = cur;
  const { nickname: _ten, ...life } = s.life[key] ?? { nickname: '', ...emptyLife() };
  return { days: cur.streak, total: cur.total, life };
}

function topOf(book: Record<string, Diem>, n = 10): DongTop[] {
  return Object.entries(book)
    .map(([username, v]) => ({ username, nickname: v.nickname, points: v.points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, n);
}

export function weekTop(s: SoLop): DongTop[] {
  return topOf(s.scores);
}

export function todayTop(s: SoLop): DongTop[] {
  return topOf(s.today.scores, 5);
}

export function talkTop(s: SoLop): DongTop[] {
  return topOf(s.today.talk, 5);
}
