import { describe, expect, it } from 'vitest';
import type { Effect } from '@live/contracts';
import type { FeedItem } from '@live/contracts';
import { runAction, runFeed, runTick } from '@live/runtime';
import {
  catDoan,
  CHAO_KHUNG,
  CHO_MC_MS,
  chuPhuDe,
  core,
  doanHienTai,
  dongHo,
  giongTuDoc,
  loiChaoKhung,
  moduleStory as mod,
  schema,
  coHinhNao,
  tinTuDoc,
  trongSuot,
} from '@live/mod-story';
import { ctx, kiemModule } from '../_helper';

const BA_DOAN = 'Đoạn một.\nĐoạn hai.\nĐoạn ba.';
/** Các test nhịp tự đọc chạy ở chế độ "tự đọc"; chế độ MC kể có khối riêng. */
const MAC_DINH = { ...schema.parse({}), passages: BA_DOAN, secPerPassage: 10, cachKe: 'tu-doc' as const };
const MC_KE = { ...MAC_DINH, cachKe: 'mc-day-du' as const };

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('báo máy chủ đoạn đã tự đọc', () => {
  const CHIN_DOAN = Array.from({ length: 9 }, (_, i) => `Đoạn ${i + 1}.`).join('\n');
  const truyen = (title: string) => ({ ...MC_KE, title, passages: CHIN_DOAN });
  /** Module đang ở đoạn `doan`, đoạn đó do chính nó tự đọc thay MC. */
  const daTuDoc = (title: string, doan: number) => ({
    ...core.init(truyen(title)),
    doan,
    daDoc: true,
    loiKe: null,
  });

  it('đúng truyện đang kể thì báo tên và số đoạn', () => {
    expect(tinTuDoc(truyen('Tấm Cám'), daTuDoc('Tấm Cám', 2))).toEqual({ ten: 'Tấm Cám', doan: 2 });
  });

  it('lần vẽ ngay lúc đổi truyện: số đoạn của truyện cũ không được gán cho truyện mới', () => {
    expect(tinTuDoc(truyen('Sự tích cây vú sữa'), daTuDoc('Bà nội và bát cháo hành', 8))).toBeNull();
  });

  it('sau onConfig của truyện mới thì không còn gì để báo', () => {
    const st = daTuDoc('Bà nội và bát cháo hành', 8);
    const moi = { ...truyen('Sự tích cây vú sữa'), passages: 'Một.\nHai.' };
    expect(tinTuDoc(moi, core.onConfig?.(st, moi) ?? st)).toBeNull();
  });

  it('không báo khi MC đang kể, chưa đọc, giờ nghỉ, hay phòng tự đọc', () => {
    const ten = 'Tấm Cám';
    expect(tinTuDoc(truyen(ten), { ...daTuDoc(ten, 2), loiKe: 'MC kể' })).toBeNull();
    expect(tinTuDoc(truyen(ten), { ...daTuDoc(ten, 2), daDoc: false })).toBeNull();
    expect(tinTuDoc(truyen(ten), { ...daTuDoc(ten, 2), doan: -1 })).toBeNull();
    const nghi = { truyenSau: 'X', lyDo: 'chuyen', tu: 1, batBot: false, han: 5000 };
    expect(tinTuDoc({ ...truyen(ten), giaiLao: nghi } as typeof MC_KE, daTuDoc(ten, 2))).toBeNull();
    expect(tinTuDoc({ ...MAC_DINH, title: ten }, daTuDoc(ten, 2))).toBeNull();
  });
});

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chỉ nghe câu MC (để theo nhịp MC kể), không theo sự kiện khán giả', () => {
    expect(mod.manifest.triggers).toEqual(['host']);
    expect(mod.manifest.slots).toEqual(['screen']);
  });

  it('có nút chuyển đoạn trên thẻ', () => {
    expect(mod.manifest.actions?.map((a) => a.op)).toEqual(['next']);
  });

  it('nền trong suốt mặc định tắt, cấu hình cũ không xin thiết kế bỏ nền', () => {
    expect(trongSuot(schema.parse({}))).toBe(false);
    expect(trongSuot(schema.parse({ media: 'a.mp4' }))).toBe(false);
  });

  it('tắt ảnh minh hoạ thì khung coi như KHÔNG có hình', () => {
    // Ảnh đã vẽ vẫn nằm trong `moc`, nhưng khung giấu hết nên nó trong suốt.
    // Không thế thì thiết kế kéo màn chờ lên sau khung trống — người xem thấy
    // "Chào cả nhà" chồng lên lúc truyện đang kể.
    const co = { title: 'A', moc: [{ tu: 1, ta: '', nhanVat: [], anh: 'a.webp', dau: 'd' }] };
    expect(coHinhNao(schema.parse(co))).toBe(true);
    expect(coHinhNao(schema.parse({ ...co, hienAnh: false }))).toBe(false);
    expect(trongSuot(schema.parse({ ...co, hienAnh: false }))).toBe(true, 'khung phải trong suốt');
    // Ảnh chung người vận hành tự dán cũng bị giấu theo.
    expect(coHinhNao(schema.parse({ title: 'A', media: 'x.mp4', hienAnh: false }))).toBe(false);
  });

  it('bật nền trong suốt thì xin thiết kế bỏ nền khung', () => {
    expect(trongSuot(schema.parse({ transparentBg: true }))).toBe(true);
  });
});

describe('cắt đoạn', () => {
  it('mỗi dòng một đoạn, bỏ dòng trống và khoảng trắng thừa', () => {
    expect(catDoan('  Một  hai \n\n\n Ba \n')).toEqual(['Một hai', 'Ba']);
  });

  it('không có chữ thì không có đoạn nào', () => {
    expect(catDoan('   \n\n')).toEqual([]);
  });
});

describe('kể lần lượt', () => {
  it('đoạn đầu lên ngay nhịp đầu tiên', () => {
    const s = core.init(MAC_DINH);
    expect(loiNoi(runTick(mod, s, 1_000, ctx(MAC_DINH, 1_000)))).toBe('Đoạn một.');
    expect(doanHienTai(s)).toBe('Đoạn một.');
  });

  it('chưa hết giờ thì giữ nguyên đoạn', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(runTick(mod, s, 9_000, ctx(MAC_DINH, 9_000))).toEqual([]);
    expect(doanHienTai(s)).toBe('Đoạn một.');
  });

  it('tự đọc: giọng còn đang đọc thì chưa sang đoạn — chữ, hình không đi trước giọng', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(runTick(mod, s, 10_000, { ...ctx(MAC_DINH, 10_000), dangNoi: true })).toEqual([]);
    expect(doanHienTai(s)).toBe('Đoạn một.');
    expect(loiNoi(runTick(mod, s, 11_000, { ...ctx(MAC_DINH, 11_000), dangNoi: false }))).toBe('Đoạn hai.');
  });

  it('hết giờ thì sang đoạn kế', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(loiNoi(runTick(mod, s, 10_000, ctx(MAC_DINH, 10_000)))).toBe('Đoạn hai.');
  });

  it('hết truyện thì kể lại từ đầu', () => {
    const s = core.init(MAC_DINH);
    let t = 0;
    for (const mong of ['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.', 'Đoạn một.']) {
      expect(loiNoi(runTick(mod, s, t, ctx(MAC_DINH, t)))).toBe(mong);
      t += 10_000;
    }
  });

  it('tắt lặp lại thì kể hết rồi dừng', () => {
    const c = { ...MAC_DINH, loop: false };
    const s = core.init(c);
    let t = 0;
    for (let i = 0; i < 3; i += 1) {
      runTick(mod, s, t, ctx(c, t));
      t += 10_000;
    }
    expect(runTick(mod, s, t, ctx(c, t))).toEqual([]);
    expect(doanHienTai(s), 'vẫn giữ đoạn cuối trên màn').toBe('Đoạn ba.');
  });

  it('chưa có truyện thì im lặng', () => {
    const c = { ...MAC_DINH, passages: '' };
    const s = core.init(c);
    expect(runTick(mod, s, 0, ctx(c, 0))).toEqual([]);
    expect(doanHienTai(s)).toBeNull();
  });

  it('tắt đọc to thì vẫn chuyển đoạn, chỉ không phát tiếng', () => {
    const c = { ...MAC_DINH, readAloud: false };
    const s = core.init(c);
    const ra = runTick(mod, s, 0, ctx(c, 0));
    expect(ra.some((e) => e.kind === 'say')).toBe(false);
    expect(doanHienTai(s)).toBe('Đoạn một.');
  });
});

describe('bấm nút chuyển đoạn', () => {
  it('nhảy sang đoạn kế ngay, không chờ hết giờ', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    expect(loiNoi(runAction(mod, s, 'next', ctx(MAC_DINH, 500)))).toBe('Đoạn hai.');
  });

  it('ở đoạn cuối thì vòng về đoạn đầu', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    runAction(mod, s, 'next', ctx(MAC_DINH, 1));
    runAction(mod, s, 'next', ctx(MAC_DINH, 2));
    expect(loiNoi(runAction(mod, s, 'next', ctx(MAC_DINH, 3)))).toBe('Đoạn một.');
  });

  it('nút lạ thì không làm gì', () => {
    const s = core.init(MAC_DINH);
    expect(runAction(mod, s, 'xoa-het', ctx(MAC_DINH, 0))).toEqual([]);
  });
});

describe('sửa truyện giữa lúc đang kể', () => {
  it('đoạn đang kể không đổi thì giữ nguyên chỗ đứng', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    runTick(mod, s, 10_000, ctx(MAC_DINH, 10_000));
    expect(doanHienTai(s)).toBe('Đoạn hai.');

    // Đổi đoạn cuối, đoạn đang kể vẫn thế.
    core.onConfig!(s, { ...MAC_DINH, passages: 'Đoạn một.\nĐoạn hai.\nĐoạn ba mới.' });
    expect(doanHienTai(s)).toBe('Đoạn hai.');
  });

  it('thay cả truyện thì kể lại từ đầu', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0));
    runTick(mod, s, 10_000, ctx(MAC_DINH, 10_000));

    core.onConfig!(s, { ...MAC_DINH, passages: 'Truyện khác hẳn.\nĐoạn sau.' });
    expect(doanHienTai(s)).toBe('Truyện khác hẳn.');
  });

  it('kể hết rồi mà nạp truyện mới thì chạy tiếp', () => {
    const c = { ...MAC_DINH, loop: false };
    const s = core.init(c);
    let t = 0;
    for (let i = 0; i < 4; i += 1) {
      runTick(mod, s, t, ctx(c, t));
      t += 10_000;
    }
    core.onConfig!(s, { ...c, passages: 'Truyện mới.' });
    expect(loiNoi(runTick(mod, s, t + 20_000, ctx(c, t + 20_000)))).toBe('Truyện mới.');
  });
});

describe('MC tự kể như bản cũ', () => {
  const ke = (i: number, at: number, text = `MC kể đoạn ${i + 1}`): FeedItem => ({
    id: at,
    at,
    kind: 'host',
    name: 'MC',
    text,
    ke: i,
  });

  it('mặc định là MC kể (AI diễn từng đoạn); cấu hình cũ giữ đúng cách đang chạy', async () => {
    const { cachKeCua } = await import('@live/contracts');
    expect(cachKeCua(schema.parse({}))).toBe('mc-day-du');
    expect(cachKeCua({ nguoiKe: 'tu-doc' })).toBe('tu-doc');
    expect(cachKeCua({ cachKe: 'mc-tiet-kiem' })).toBe('mc-day-du');
    expect(cachKeCua({ cachKe: 'tu-doc', nguoiKe: 'mc' })).toBe('tu-doc');
  });

  it('câu MC kể đoạn nào thì chuyển tới đoạn đó, phụ đề là chữ gốc của truyện, không tự đọc chồng', () => {
    const s = core.init(MC_KE);
    expect(runFeed(mod, s, ke(1, 1_000, '[be-gai] Mẹ ơi! [-] cậu gọi'), ctx(MC_KE, 1_000))).toEqual([
      { kind: 'overlay', slot: 'screen', ttlMs: 2000 },
    ]);
    expect(doanHienTai(s)).toBe('Đoạn hai.');
    // Phụ đề chỉ là nội dung truyện — lời MC (dù chêm gì) không lên khung.
    expect(chuPhuDe(s)).toBe('Đoạn hai.');
    // Hết giờ một đoạn mà MC còn đang kể thì module không tự đọc chen vào.
    expect(runTick(mod, s, 30_000, ctx(MC_KE, 30_000))).toEqual([]);
  });

  it('chờ MC lúc mới mở, MC vắng quá lâu thì tự đọc thay', () => {
    const s = core.init(MC_KE);
    expect(runTick(mod, s, 1_000, ctx(MC_KE, 1_000))).toEqual([]);
    expect(runTick(mod, s, 1_000 + CHO_MC_MS - 1, ctx(MC_KE, 1_000 + CHO_MC_MS - 1))).toEqual([]);
    const ra = runTick(mod, s, 1_000 + CHO_MC_MS, ctx(MC_KE, 1_000 + CHO_MC_MS));
    expect(loiNoi(ra)).toBe('Đoạn một.');
    expect(chuPhuDe(s)).toBe('Đoạn một.');
  });

  it('chế độ tự đọc thì bỏ qua câu MC', () => {
    const s = core.init(MAC_DINH);
    expect(runFeed(mod, s, ke(2, 1_000), ctx(MAC_DINH, 1_000))).toEqual([]);
  });
});

describe('giờ nghỉ (máy chủ ghi ô giaiLao)', () => {
  it('mặc định không nghỉ; đọc đúng giờ nghỉ máy chủ ghi', () => {
    expect(schema.parse({}).giaiLao).toBeNull();
    expect(schema.parse({}).boAnh).toBe(false);
    const c = schema.parse({ giaiLao: { truyenSau: 'Tấm Cám', lyDo: 'anh', tu: 5 } });
    expect(c.giaiLao).toEqual({ truyenSau: 'Tấm Cám', lyDo: 'anh', tu: 5, batBot: false, han: 0, giaoLuu: false });
    // Cờ "đã tự bật nhân vật minh hoạ" phải giữ được qua một lần lưu cấu hình.
    expect(schema.parse({ giaiLao: { truyenSau: 'A', lyDo: 'ket-noi', batBot: true } }).giaiLao?.batBot).toBe(true);
  });

  it('giờ nghỉ thì DỪNG đoạn — màn chờ đang hiện, giọng không được đọc tiếp', () => {
    const nghi = {
      ...MAC_DINH,
      giaiLao: { truyenSau: 'Sọ Dừa', lyDo: 'chuyen' as const, tu: 1_000, batBot: false, han: 0, giaoLuu: false },
    };
    const s = core.init(nghi);
    // Không có đoạn nào lên, không có câu nào được đọc.
    expect(runTick(mod, s, 1_000, ctx(nghi, 1_000))).toEqual([]);
    expect(runTick(mod, s, 60_000, ctx(nghi, 60_000))).toEqual([]);
    expect(doanHienTai(s)).toBe(null);

    // Hết giờ nghỉ thì kể lại bình thường, từ đoạn đầu.
    const s2 = core.init(MAC_DINH);
    expect(loiNoi(runTick(mod, s2, 1_000, ctx(MAC_DINH, 1_000)))).toBe('Đoạn một.');
  });

  it('giá trị hỏng không làm hỏng cả cấu hình truyện', () => {
    const c = schema.parse({ title: 'Cây khế', giaiLao: { truyenSau: 'A', lyDo: 'la-lam' } });
    expect(c.title).toBe('Cây khế');
    expect(c.giaiLao?.lyDo).toBe('chuyen');
    expect(schema.parse({ title: 'Cây khế', giaiLao: 'rác' }).giaiLao).toBeNull();
  });
});

describe('khung truyện: trong suốt khi chưa có hình, đồng hồ đếm giờ', () => {
  it('chưa có hình nào thì trong suốt (không nền tím); có hình hay đang giờ nghỉ thì không', () => {
    expect(trongSuot(schema.parse({ title: 'A' }))).toBe(true);
    expect(trongSuot(schema.parse({ title: 'A', media: '/u/x/a.png' }))).toBe(false);
    const coMoc = schema.parse({ title: 'A', moc: [{ tu: 3, ta: '', nhanVat: [], anh: '/u/x/1.png', dau: 'x' }] });
    expect(trongSuot(coMoc)).toBe(false);
    // Giờ nghỉ: màn chờ của thiết kế phải hiện.
    expect(trongSuot(schema.parse({ title: 'A', giaiLao: { truyenSau: 'B' } }))).toBe(false);
    expect(trongSuot(schema.parse({ title: 'A', media: '/u/x/a.png', transparentBg: true }))).toBe(true);
  });

  it('bật đồng hồ mà khung không hình: VẪN trong suốt với thiết kế', () => {
    // Cái bẫy ở đây: công tắc trong suốt của thiết kế kéo LUÔN màn chờ "Chào
    // cả phòng" lên sau khung. Bỏ trong suốt để lấy nền cho đồng hồ thì giữa
    // lúc truyện đang kể, người xem đọc được "Chào cả phòng" xuyên qua khung.
    // Nên module tự trải nền của nó (`data-dong-ho-to` trong `stage.tsx`), còn
    // chỗ này phải giữ nguyên `true`.
    const cfg = schema.parse({ title: 'A', hienAnh: false, hienDongHo: true });
    expect(coHinhNao(cfg)).toBe(false);
    expect(trongSuot(cfg)).toBe(true, 'thiết kế vẫn phải cất màn chờ đi');
  });

  it('đồng hồ mm:ss, quá một giờ thì h:mm:ss', () => {
    expect(dongHo(0)).toBe('00:00');
    expect(dongHo(135.9)).toBe('02:15');
    expect(dongHo(3725)).toBe('1:02:05');
    expect(dongHo(-5)).toBe('00:00');
  });

  it('vắng MC: module tự đọc bằng giọng dẫn người phân vai đã chọn', () => {
    const pv = { giongDan: 'nam-minh', vai: [], camXuc: [] };
    // Ô giọng để mặc định hay "tự đổi": dùng giọng dẫn đã phân.
    expect(giongTuDoc(schema.parse({ phanVai: pv }))).toBe('nam-minh');
    expect(giongTuDoc(schema.parse({ voiceId: '*', phanVai: pv }))).toBe('nam-minh');
    // Người vận hành đặt hẳn một giọng: giọng của họ đứng trước.
    expect(giongTuDoc(schema.parse({ voiceId: 'mc', phanVai: pv }))).toBe('');
    // Cấu hình xuống sân khấu là JSON thô: thiếu hẳn ô phanVai cũng không nổ.
    expect(giongTuDoc({ voiceId: '' } as unknown as Parameters<typeof giongTuDoc>[0])).toBe('');
  });

  it('lời chào trên đồng hồ: xoay vòng theo TÊN TRUYỆN, không ngẫu nhiên', () => {
    // Cùng truyện thì mọi cửa sổ (sân khấu, OBS, bảng xem thử) phải ra cùng
    // một câu — và câu ấy đứng yên suốt truyện, không nhảy mỗi giây đồng hồ đập.
    const a = loiChaoKhung('Thằng Bờm có cái quạt mo');
    expect(loiChaoKhung('Thằng Bờm có cái quạt mo')).toBe(a);
    expect(CHAO_KHUNG).toContain(a);
    // Chủ phòng chốt đúng một câu, viết đúng hoa thường như họ gõ.
    expect(loiChaoKhung('Tấm Cám')).toBe('Chúc Nghe Truyện Vui vẻ');
  });
});
