import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { proxyBackend } from '@live/dev-proxy';

const GOC = resolve(import.meta.dirname, '..', '..', '..');

export default defineConfig({
  plugins: [react()],
  // Backend phục vụ bản build ở /d/<id>/, nên mọi đường dẫn trong bundle phải tương đối.
  base: './',
  // Game và ảnh nhân vật nằm ở assets/game/, backend phục vụ ở /a/<id>/game/.
  server: { proxy: proxyBackend(GOC) },
  build: { outDir: 'dist', emptyOutDir: true },
  optimizeDeps: { exclude: ['@live/contracts', '@live/stage-sdk', '@live/runtime'] },
});
