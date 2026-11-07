import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { laApp } from './lib/desktop';

// App desktop: luôn nền tối như bản cũ — WebView theo giao diện sáng của
// Windows thì cả trang quản lý thành nền kem, lệch với mọi màn khác.
if (laApp()) document.documentElement.dataset['theme'] = 'dark';

const goc = document.getElementById('goc');
if (goc === null) throw new Error('thiếu #goc trong index.html');

createRoot(goc).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
