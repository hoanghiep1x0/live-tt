import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { proxyBackend } from '@live/dev-proxy';

const GOC = resolve(import.meta.dirname, '..', '..', '..');

export default defineConfig({
  plugins: [react()],
  // Backend phục vụ bản build ở /d/<id>/, nên mọi đường dẫn trong bundle phải
  // tương đối (quy ước 04 §6). Để '/' là OBS tải trang trắng.
  base: './',
  // Assets KHÔNG nằm trong bundle: backend phục vụ ở /a/<id>/, dev server proxy
  // sang đó. Nhờ vậy ~6,5 MB texture không bị chép vào dist mỗi lần build.
  server: { proxy: proxyBackend(GOC) },
  build: { outDir: 'dist', emptyOutDir: true },
  optimizeDeps: { exclude: ['@live/contracts', '@live/stage-sdk', '@live/runtime'] },
});
