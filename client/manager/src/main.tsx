import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const goc = document.getElementById('goc');
if (goc === null) throw new Error('thiếu #goc trong index.html');

createRoot(goc).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
