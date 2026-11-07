import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runAction, runFeed, runTick } from '@live/runtime';
import type { Ctx, Effect, FeedItem } from '@live/contracts';
import { apCauHinh, chuMieng, core, laySoDeCat, moduleDoChu as mod, napDuLieu, noiTen, schema, xep } from '@live/mod-do-chu';
import type { Config, State } from '@live/mod-do-chu';
import { parseBank } from '../../../../client/modules/do-chu/src/lop/questions';
import { parseCodes, parseMc } from '../../../../client/modules/do-chu/src/lop/show';
import { GAME } from '../../../../client/modules/do-chu/src/lop/config';
import { kiemModule, phien } from '../_helper';

const LOP = resolve(__dirname, '../../../../client/modules/do-chu/src/lop');
const BANK = parseBank(
  Object.fromEntries(readdirSync(join(LOP, 'cau-hoi')).map((f) => [f, readFileSync(join(LOP, 'cau-hoi', f), 'utf8')])),
);
const SHOW = {
  mc: parseMc(readFileSync(join(LOP, 'cau-hoi-show', 'trac-nghiem.txt'), 'utf8')),
  codes: parseCodes(readFileSync(join(LOP, 'cau-hoi-show', 'mat-ma.txt'), 'utf8')),
};
const MAC_DINH = schema.parse({});
const GAME_GOC = { ...GAME };
afterAll(() => Object.assign(GAME, GAME_GOC));

function c(config: Config, now: number, dangNoi = false, startedAt: number | null = 1): Ctx<Config> {
  return { config, now, rand: () => 0.42, session: { ...phien(), startedAt }, dangNoi };
}

function cmt(id: number, user: string, text: string, at: number): FeedItem {
  return { id, at, kind: 'comment', name: user.toUpperCase(), user, text };
}

const say = (ra: Effect[]) => ra.filter((e): e is Extract<Effect, { kind: 'say' }> => e.kind === 'say');

/** Lớp đã mở với sổ cho trước, trả state và giờ hiện tại. */
function moLop(so: unknown = {}, cfg: Config = MAC_DINH): { s: State; t: number; ra: Effect[] } {
  const s = core.init(cfg);
  napDuLieu(s, { bank: BANK, showBank: SHOW, so });
  const t = 1_800_000_000_000;
  const ra = runTick(mod, s, t, c(cfg, t));
  return { s, t, ra };
}

describe('lớp học đố chữ — lõi module', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chưa nạp bộ câu và sổ thì lớp chưa mở, không nói gì', () => {
    const s = core.init(MAC_DINH);
    expect(runTick(mod, s, 1000, c(MAC_DINH, 1000))).toEqual([]);
    expect(s.room).toBeNull();
    expect(runFeed(mod, s, cmt(1, 'an', 'vào lớp', 1000), c(MAC_DINH, 1000))).toEqual([]);
  });

  it('nạp xong thì mở tiết 1 và cô lên tiếng, không hiện thẻ MC', () => {
    const { s, ra } = moLop();
    expect(s.room).not.toBeNull();
    expect(s.room?.round).toBe(1);
    const cau = say(ra);
    expect(cau.length).toBeGreaterThan(0);
    for (const e of cau) {
      expect(e.caption).toBe(false);
      expect(e.text).not.toMatch(/(^|\|)\s*[MFE]:/);
    }
  });

  it('cô đang đọc câu chính thì đồng hồ đứng; đọc xong mới chạy', () => {
    const { s, t } = moLop();
    const r = s.room!;
    expect(s.choCauChinh).toBe(true);
    const het = r.phaseEndsAt;
    runTick(mod, s, t + 3000, c(MAC_DINH, t + 3000, true));
    expect(r.phaseEndsAt).toBe(het + 3000);
    runTick(mod, s, t + 3200, c(MAC_DINH, t + 3200, false));
    expect(s.choCauChinh).toBe(false);
    const sau = r.phaseEndsAt;
    runTick(mod, s, t + 4200, c(MAC_DINH, t + 4200, false));
    expect(r.phaseEndsAt).toBe(sau);
  });

  it('bình luận đầu tiên của một bạn: vào lớp và được điểm danh chuyên cần vào sổ', () => {
    const { s, t } = moLop();
    runFeed(mod, s, cmt(1, 'an', 'chào cô', t + 10), c(MAC_DINH, t + 10));
    expect(s.room?.students.has('an')).toBe(true);
    expect(s.so?.attend['an']?.streak).toBe(1);
    expect(s.soDoi).toBe(true);
  });

  it('gõ "vào lớp" thì vài giây sau cô chào tên, gom nhiều bạn một câu', () => {
    const { s, t } = moLop();
    for (const [i, u] of ['minh', 'lan'].entries()) runFeed(mod, s, cmt(i + 1, u, 'vào lớp', t + 10), c(MAC_DINH, t + 10));
    expect(s.chao.names.map((x) => x.key)).toEqual(['minh', 'lan']);
    runTick(mod, s, t + GAME.greetEveryMs + 20, c(MAC_DINH, t + GAME.greetEveryMs + 20));
    expect(s.chao.names).toEqual([]);
  });

  it('sổ lớp nạp lại được: câu đã hỏi và câu bị bỏ đi vào lớp mới', () => {
    const id = BANK[0]!.id;
    const { s } = moLop({ used: { [id]: 5 }, banned: { [BANK[1]!.id]: { answer: 'x', clue: 'y', at: 1 } } });
    expect(s.so?.used[id]).toBe(5);
    expect(Object.keys(s.so?.banned ?? {})).toEqual([BANK[1]!.id]);
  });

  it('câu vừa hỏi được ghi vào sổ, lấy sổ để cất thì hạ cờ đổi', () => {
    const { s, t } = moLop();
    // Chạy qua giới thiệu tiết cho tới khi có câu đầu.
    let now = t;
    for (let i = 0; i < 200 && s.room?.phase !== 'question'; i++) {
      now += 500;
      runTick(mod, s, now, c(MAC_DINH, now));
    }
    expect(s.room?.phase).toBe('question');
    expect(Object.keys(s.so?.used ?? {}).length).toBeGreaterThan(0);
    expect(laySoDeCat(s)).not.toBeNull();
    expect(laySoDeCat(s)).toBeNull();
  });

  it('phiên live mới thì làm lại Top tương tác; cùng phiên thì giữ', () => {
    const { s, t } = moLop({ today: { date: '2000-01-01', scores: {}, talk: {}, flowers: 0, talkRoom: '' } });
    s.so!.today.talk['an'] = { nickname: 'An', points: 9 };
    s.so!.today.talkRoom = '1';
    runTick(mod, s, t + 100, c(MAC_DINH, t + 100, false, 1));
    expect(s.so?.today.talk['an']?.points).toBe(9);
    runTick(mod, s, t + 200, c(MAC_DINH, t + 200, false, 2));
    expect(s.so?.today.talk).toEqual({});
  });

  it('quà: nhớ món vừa tặng để vẽ băng thông báo', () => {
    const { s, t } = moLop();
    const g: FeedItem = { id: 9, at: t, kind: 'gift', name: 'Lan', user: 'lan', text: '', gift: 'Rose', count: 3, coins: 3 };
    runFeed(mod, s, g, c(MAC_DINH, t));
    expect(s.lastGift).toMatchObject({ nickname: 'Lan', giftName: 'Rose', count: 3, coins: 3 });
  });

  it('nút trên thẻ: tiết mới, ra chơi, game lớn, chào tạm biệt', () => {
    const { s, t } = moLop();
    runAction(mod, s, 'tiet-moi', c(MAC_DINH, t + 1));
    expect(s.room?.round).toBe(2);
    runAction(mod, s, 'ra-choi', c(MAC_DINH, t + 2));
    expect(s.room?.phase).toBe('recess');
    runAction(mod, s, 'everest', c(MAC_DINH, t + 3));
    expect(s.room?.phase).toBe('show');
    expect(s.room?.show?.kind).toBe('everest');
    runAction(mod, s, 'tam-biet', c(MAC_DINH, t + 4));
    expect(s.room?.goodbyeAt).toBe(t + 4);
    expect(core.trangThaiNut?.(s, t + 5).chu).toMatch(/Tiết 2/);
  });

  it('cấu hình đổi giữa lúc live: số giây mỗi câu, chia tổ, game lớn áp ngay', () => {
    const s = core.init(MAC_DINH);
    core.onConfig?.(s, { ...MAC_DINH, giayMoiCau: 30, chiaTo: false, everest: false, chuong: false, tenCo: '  Thầy Nam ' });
    expect(GAME.questionSec).toBe(30);
    expect(GAME.teamPickSec).toBe(0);
    expect(GAME.showsOn).toEqual({ everest: false, chuong: false });
    expect(GAME.teacherName).toBe('Thầy Nam');
    expect(GAME.standing).toBe(0);
    apCauHinh({ ...MAC_DINH, tenCo: '   ' });
    expect(GAME.teacherName).toBe('Cô Ngân');
    apCauHinh(MAC_DINH);
    expect(GAME.questionSec).toBe(20);
    expect(GAME.teamPickSec).toBe(GAME_GOC.teamPickSec);
    expect(GAME.showEvery).toBe(GAME_GOC.showEvery);
    expect(GAME.showsOn).toEqual({ everest: true, chuong: true });
  });
});

describe('đứng ngoài cửa khi hết ghế', () => {
  it('mặc định tắt: hết ghế thì không ai đứng cửa; bật thì 60 bạn sau ghế cuối ra đứng, vẫn chơi', () => {
    expect(MAC_DINH.dungCua).toBe(false);
    const { s, t } = moLop();
    for (let i = 0; i < 40; i++) runFeed(mod, s, cmt(i + 1, `u${i}`, 'chào cô', t + i), c(MAC_DINH, t + i));
    expect(s.room!.view(t + 100).seats).toHaveLength(30);
    expect(s.room!.view(t + 100).standing).toHaveLength(0);
    core.onConfig?.(s, { ...MAC_DINH, dungCua: true });
    const v = s.room!.view(t + 100);
    expect(v.seats).toHaveLength(30);
    expect(v.standing).toHaveLength(10);
    core.onConfig?.(s, MAC_DINH);
    expect(s.room!.view(t + 100).standing).toHaveLength(0);
  });
});

describe('nhân vật ảo trong lớp: chỉ ngồi và nói chuyện', () => {
  const ao = (id: number, kind: FeedItem['kind'], user: string, text: string, at: number): FeedItem => ({
    id,
    at,
    kind,
    name: user.toUpperCase(),
    user,
    text,
    virtual: true,
  });

  /** Lớp đã sang câu hỏi đầu tiên, bảng chữ đã mở. */
  function denCauHoi() {
    const r = moLop({}, { ...MAC_DINH, chiaTo: false });
    let now = r.t;
    for (let i = 0; i < 400 && !(r.s.room?.phase === 'question' && r.s.room.boardShown); i++) {
      now += 500;
      runTick(mod, r.s, now, c(r.s.config, now));
    }
    expect(r.s.room?.phase).toBe('question');
    return { s: r.s, now };
  }

  it('vào phòng là có ghế, bình luận thành bong bóng — nhưng không vào sổ, không điểm danh', () => {
    const { s, t } = moLop();
    runFeed(mod, s, ao(1, 'join', 'mh0001', '', t), c(MAC_DINH, t));
    runFeed(mod, s, ao(2, 'comment', 'mh0001', 'câu này khó ghê', t + 5), c(MAC_DINH, t + 5));
    const hs = s.room?.students.get('mh0001');
    expect(hs?.virtual).toBe(true);
    expect(hs?.bubble?.text).toBe('câu này khó ghê');
    expect(s.so?.attend['mh0001']).toBeUndefined();
    expect(s.room?.talkDelta.has('mh0001')).toBe(false);
  });

  it('gõ đúng đáp án cũng không được tính, không điểm, không vào bảng nhanh nhất', () => {
    const { s, now } = denCauHoi();
    const dapAn = s.room!.q!.answer;
    runFeed(mod, s, ao(1, 'comment', 'mh0002', dapAn, now + 100), c(MAC_DINH, now + 100));
    expect(s.room?.correct).toEqual([]);
    expect(s.room?.students.get('mh0002')?.score).toBe(0);
    expect(s.room?.weekDelta.has('mh0002')).toBe(false);
  });

  it('luôn ngồi sau bạn thật, không có tổ, không tính vào số bạn đang chơi', () => {
    const { s, t } = moLop();
    runFeed(mod, s, ao(1, 'join', 'mh0003', '', t), c(MAC_DINH, t));
    runFeed(mod, s, cmt(2, 'that', 'chào cô', t + 50), c(MAC_DINH, t + 50));
    const ghe = s.room!.seats().map((x) => x.username);
    expect(ghe.indexOf('that')).toBeLessThan(ghe.indexOf('mh0003'));
    expect(s.room?.students.get('mh0003')?.team).toBe(0);
    expect(s.room?.activePlayers(t + 60)).toBe(1);
  });

  it('rời phòng là trả ghế; bạn thật thì không bao giờ bị xoá', () => {
    const { s, t } = moLop();
    runFeed(mod, s, ao(1, 'join', 'mh0004', '', t), c(MAC_DINH, t));
    runFeed(mod, s, cmt(2, 'that', 'chào cô', t + 1), c(MAC_DINH, t + 1));
    runFeed(mod, s, ao(3, 'leave', 'mh0004', '', t + 2), c(MAC_DINH, t + 2));
    s.room?.virtualOut('that');
    expect(s.room?.students.has('mh0004')).toBe(false);
    expect(s.room?.students.has('that')).toBe(true);
  });

  it('nhân vật ảo trùng tên một bạn thật thì bỏ qua, không đè bạn thật', () => {
    const { s, t } = moLop();
    runFeed(mod, s, cmt(1, 'an', 'chào cô', t), c(MAC_DINH, t));
    runFeed(mod, s, ao(2, 'comment', 'an', 'nói bậy', t + 1), c(MAC_DINH, t + 1));
    expect(s.room?.students.get('an')?.virtual).toBeUndefined();
  });
});

describe('chung hàng đọc với MC AI', () => {
  it('câu chương trình của cô (đọc đề, tổng kết) đi hàng ưu tiên, chen trước câu MC', () => {
    const { ra } = moLop();
    const cau = say(ra);
    expect(cau.length).toBeGreaterThan(0);
    for (const e of cau) expect(e.priority).toBe('high');
  });

  it('nhiều câu ưu tiên một lượt: đảo trước khi trả ra để hàng đọc đọc đúng thứ tự', () => {
    const a: Effect = { kind: 'say', text: 'A', priority: 'high' };
    const b: Effect = { kind: 'say', text: 'B', priority: 'high' };
    const n: Effect = { kind: 'say', text: 'N' };
    expect(xep([a, n, b])).toEqual([b, n, a]);
    // Hàng đọc đẩy từng câu high lên đầu: B rồi A → đọc A, B như máy lớp học viết.
    const hang: string[] = [];
    for (const e of xep([a, b])) if (e.kind === 'say') hang.unshift(e.text);
    expect(hang).toEqual(['A', 'B']);
  });
});

describe('lời thoại sang dàn giọng', () => {
  it('bỏ dấu giọng kiểu cũ, ghép các đoạn', () => {
    expect(chuMieng('F: Trời ơi! | ^Hoan hô!', '')).toEqual({ text: 'Trời ơi! Hoan hô!', daGiong: false });
  });

  it('đoạn tiếng Anh đọc bằng giọng tiếng Anh đã chọn, xong thì về giọng chính', () => {
    expect(chuMieng('F: Đáp án là | E: cat | F: nha cả lớp', 'giong-anh')).toEqual({
      text: 'Đáp án là [giong-anh] cat [-] nha cả lớp',
      daGiong: true,
    });
  });

  it('chưa chọn giọng tiếng Anh thì đọc liền một giọng', () => {
    expect(chuMieng('F: Đáp án là | E: cat', '').text).toBe('Đáp án là cat');
  });

  it('ghép tên để chào', () => {
    expect(noiTen(['An'])).toBe('bạn An');
    expect(noiTen(['An', 'Bình', 'Chi'])).toBe('bạn An, bạn Bình và bạn Chi');
  });
});
