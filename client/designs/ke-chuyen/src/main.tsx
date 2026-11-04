import { createRoot } from 'react-dom/client';
import { StageProvider } from '@live/stage-sdk';
import { Stage } from './Stage';
import './stage.css';

const goc = document.getElementById('san-khau');
if (goc === null) throw new Error('thiếu #san-khau trong index.html');

// Không StrictMode: sân khấu mở WebSocket và chạy video, StrictMode gắn rồi tháo
// hai lần sẽ làm nối hai lần và nhảy hình.
createRoot(goc).render(
  <StageProvider designId="ke-chuyen">
    <Stage />
  </StageProvider>,
);
