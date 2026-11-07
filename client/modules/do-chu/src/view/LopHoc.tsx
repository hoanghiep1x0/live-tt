/** Lớp I/O của module: nạp bộ câu và sổ lớp, cất sổ, phát tiếng động, vẽ.
 *
 *  Lõi (`core.ts`) không fetch, không phát tiếng. Mấy việc đó nằm ở đây, đúng
 *  vai `useGame` của bản cũ — nhưng game không chạy ở đây: lõi chạy trong
 *  runtime, chỗ này chỉ đọc state của nó ra hình và tiếng.
 */

import { useEffect, useMemo, useRef } from 'react';
import { duocNoi } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import { khauHieu, laySoDeCat, napDuLieu, tenCo } from '../core';
import type { State } from '../core';
import type { Config } from '../manifest';
import { parseBank } from '../lop/questions';
import { parseCodes, parseMc } from '../lop/show';
import { GameStage } from './GameStage';
import { sfx } from './sfx';
import type { StageView } from './kieu';
import './lop.gen.css';

// Bộ câu gói trong chunk này (Vite gom lúc build): thêm file .txt vào cau-hoi/
// là có, không phải sửa danh sách nào. Chỉ phòng lớp học tải chunk này.
const CAU_HOI = import.meta.glob('../lop/cau-hoi/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const CAU_SHOW = import.meta.glob('../lop/cau-hoi-show/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const fileShow = (ten: string) => Object.entries(CAU_SHOW).find(([p]) => p.endsWith(`/${ten}`))?.[1] ?? '';

const MODULE = 'do-chu';
/** Bản cũ cất 20 giây một lần; tắt máy giữa chừng mất tối đa chừng ấy. */
const CAT_MOI_MS = 20_000;

function duongSo(designId: string): string {
  return `/s/so/${designId}/${MODULE}`;
}

export default function LopHoc({ config, state, modState, now }: StagePartProps<Config, State>) {
  const designId = state.cuaMinh;
  const st = modState;

  // Nạp một lần: bộ câu (sẵn trong chunk) + sổ lớp máy chủ đang cất.
  useEffect(() => {
    if (st.dangNap || st.room !== null || designId === null) return;
    st.dangNap = true;
    const bank = parseBank(CAU_HOI);
    const showBank = { mc: parseMc(fileShow('trac-nghiem.txt')), codes: parseCodes(fileShow('mat-ma.txt')) };
    fetch(duongSo(designId))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((so: unknown) => napDuLieu(st, { bank, showBank, so }));
  }, [st, designId]);

  // Cất sổ: chỉ trang của phòng đang PHÁT và đang giữ quyền nói. Bản xem thử
  // của phòng chưa phát, hay cửa sổ thứ hai của cùng phòng, mà cũng ghi thì mỗi
  // bình luận được cộng hai lần vào bảng vàng.
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const liveRef = useRef(state.live);
  liveRef.current = state.live;
  useEffect(() => {
    if (designId === null) return;
    const cat = (giuLai: boolean) => {
      if (!cfgRef.current.ghiSo || liveRef.current !== designId || !duocNoi()) return;
      const so = laySoDeCat(st);
      if (so === null) return;
      void fetch(duongSo(designId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(so),
        keepalive: giuLai,
      })
        .then((r) => {
          if (!r.ok) st.soDoi = true;
        })
        .catch(() => {
          // Máy chủ tắt: lần sau cất lại cả sổ.
          st.soDoi = true;
        });
    };
    const h = setInterval(() => cat(false), CAT_MOI_MS);
    const truocKhiDong = () => cat(true);
    window.addEventListener('pagehide', truocKhiDong);
    return () => {
      clearInterval(h);
      window.removeEventListener('pagehide', truocKhiDong);
      cat(true);
    };
  }, [st, designId]);

  const room = st.room;
  const view = useMemo<StageView | null>(
    () =>
      room === null
        ? null
        : { ...room.view(now), weekTop: st.tops.week, todayTop: st.tops.today, talkTop: st.tops.talk },
    // `now` đổi mỗi nhịp runner (250 ms): ảnh chụp lớp vẽ lại theo đúng nhịp đó.
    [room, now, st.tops],
  );

  // Tiếng động và nhạc nền game lớn — chỉ ở cửa sổ đang giữ quyền nói, theo âm
  // lượng của dàn giọng, để OBS và bảng xem không cùng kêu.
  const truoc = useRef<StageView | null>(null);
  useEffect(() => {
    sfx.volume = state.voice.enabled && duocNoi() ? 0.35 * state.voice.volume : 0;
    if (room === null || view === null) return;
    sfx.clock(room.showAsking() ? 'question' : room.phase, room.boardShown, room.phaseEndsAt, now);
    const sh = room.show;
    const buoc = sh?.steps[sh.i]?.k;
    const dangDoc = st.choCauChinh;
    sfx.music(
      sh?.kind ?? null,
      !sh || dangDoc ? 0 : room.showAsking() ? (room.phaseEndsAt - now <= 5000 ? 2 : 1) : buoc === 'gather' || buoc === 'honor' ? 1 : 0,
    );
    sfx.watch(truoc.current, view);
    truoc.current = view;
  }, [view, room, now, st, state.voice]);

  useEffect(() => {
    sfx.loadFiles();
    return () => sfx.music(null, 0);
  }, []);

  return (
    <div className="dc-root" style={{ position: 'absolute', inset: 0 }}>
      <GameStage
        game={{
          view,
          channelName: config.tenLop,
          lastGift: st.lastGift,
          lop: { tenCo: tenCo(config), khauHieu: khauHieu(config), nen: config.nenLop.trim(), everest: config.everest, chuong: config.chuong },
        }}
        now={now}
      />
    </div>
  );
}
