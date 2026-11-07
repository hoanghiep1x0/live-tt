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
  // Assets KHÔNG nằm trong bundle: nền lớp ở /a/<id>/, ảnh nhân vật của module ở
  // /m/do-chu/ — backend phục vụ, dev server proxy sang đó.
  server: { proxy: proxyBackend(GOC) },
  build: { outDir: 'dist', emptyOutDir: true },
  optimizeDeps: { exclude: ['@live/contracts', '@live/stage-sdk', '@live/runtime'] },
});
