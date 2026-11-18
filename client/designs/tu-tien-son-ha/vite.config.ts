import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { proxyBackend } from '@live/dev-proxy';
import thietKe from './design.json';

const GOC = resolve(import.meta.dirname, '..', '..', '..');
const ASSETS = resolve(import.meta.dirname, 'assets');
const LOAI: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

/** Chỉ khi `npm run dev`: tranh nền, tranh nhân vật nằm ở assets/ và bình thường do backend phục vụ
 *  ở /a/<id>/. Vẽ tranh xong muốn xem ngay mà chưa bật app thì dev server tự đưa file ra; có
 *  file thì phục vụ, không có thì để proxy chuyển sang backend như cũ. */
function assetsKhiDev(): Plugin {
  const dau = `/a/${thietKe.id}/`;
  return {
    name: 'assets-khi-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]!;
        if (!url.startsWith(dau)) return next();
        const p = resolve(ASSETS, decodeURIComponent(url.slice(dau.length)));
        if (!p.startsWith(ASSETS + sep) || !existsSync(p) || !statSync(p).isFile()) return next();
        res.setHeader('content-type', LOAI[extname(p)] ?? 'application/octet-stream');
        // Đang vẽ lại tranh liên tục: không cho trình duyệt giữ bản cũ.
        res.setHeader('cache-control', 'no-store');
        createReadStream(p).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), assetsKhiDev()],
  // Backend phục vụ bản build ở /d/<id>/, nên mọi đường dẫn trong bundle phải tương đối.
  base: './',
  server: { proxy: proxyBackend(GOC) },
  build: { outDir: 'dist', emptyOutDir: true },
  optimizeDeps: { exclude: ['@live/contracts', '@live/stage-sdk', '@live/runtime'] },
});
