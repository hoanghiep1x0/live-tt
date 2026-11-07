import { createRoot } from 'react-dom/client';
import { BangXem, StageProvider } from '@live/stage-sdk';
import thietKe from '../design.json';
import { Stage } from './Stage';
import './stage.css';

const goc = document.getElementById('san-khau');
if (goc === null) throw new Error('thiếu #san-khau trong index.html');

createRoot(goc).render(
  <StageProvider thietKe={thietKe}>
    <Stage />
    {/* NGOÀI `.stage`: `.stage` khai container-type, bảng xem đặt trong đó là lọt khung, lên sóng. */}
    <BangXem />
  </StageProvider>,
);
