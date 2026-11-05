import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { proxyBackend } from '@live/dev-proxy';

const GOC = resolve(import.meta.dirname, '..', '..');

// Đọc thẳng thư mục module thay vì liệt kê tay: danh sách tay từng sót
// `vu-cong-3d`. Gói module đặt tên `@live/mod-<thư mục>` (xem package.json của nó).
const GOI_MODULE = readdirSync(resolve(GOC, 'client', 'modules'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => `@live/mod-${d.name}`);

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    // Cổng này nằm trong whitelist Origin của backend (backend/src/guard.rs).
    port: 5180,
    strictPort: true,
    proxy: proxyBackend(GOC),
  },
  // Các gói trong workspace là mã TS nguồn; để Vite nạp thẳng thay vì gói trước.
  optimizeDeps: {
    exclude: ['@live/contracts', '@live/runtime', '@live/stage-sdk', ...GOI_MODULE],
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
