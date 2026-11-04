import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { proxyBackend } from '@live/dev-proxy';

const GOC = resolve(import.meta.dirname, '..', '..');

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
    exclude: [
      '@live/contracts',
      '@live/mod-chat-bubbles',
      '@live/mod-gift-thanks',
      '@live/mod-top-givers',
      '@live/mod-welcome',
      '@live/mod-likes-counter',
      '@live/mod-follow-thanks',
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
