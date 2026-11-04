import { createRoot } from 'react-dom/client';
import { BangXem, StageProvider } from '@live/stage-sdk';
import { LUA_CHON } from './Stage';
import { Stage } from './Stage';
import './stage.css';

const goc = document.getElementById('san-khau');
if (goc === null) throw new Error('thiếu #san-khau trong index.html');

// Không StrictMode: sân khấu mở WebSocket và chạy video, StrictMode gắn rồi tháo
// hai lần sẽ làm nối hai lần và nhảy hình.
createRoot(goc).render(
  <StageProvider designId="ke-chuyen" luaChon={LUA_CHON}>
    <Stage />
    {/* NGOÀI `.stage`, cố ý: `.stage` khai `container-type`, mà thuộc tính đó
        biến nó thành khối chứa cho con `position: fixed` — đặt bảng vào trong
        thì nó nằm lọt trong khung và lên sóng. */}
    <BangXem />
  </StageProvider>,
);
