import { createRoot } from 'react-dom/client';
import { BangXem, StageProvider } from '@live/stage-sdk';
import thietKe from '../design.json';
import { LUA_CHON, Stage } from './Stage';
import { TheSanDau, ToastKetNoi, THU } from './TheSanDau';
import './stage.css';

const goc = document.getElementById('san-khau');
if (goc === null) throw new Error('thiếu #san-khau trong index.html');

if (THU) document.body.classList.add('thu');

createRoot(goc).render(
  <StageProvider thietKe={thietKe} luaChon={LUA_CHON}>
    <Stage />
    {/* NGOÀI `.stage`: bảng xem đặt trong đó là lọt khung, lên sóng. */}
    <BangXem theRieng={<TheSanDau />} moSan={THU} />
    <ToastKetNoi />
  </StageProvider>,
);
