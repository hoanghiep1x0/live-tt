import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Lõi thuần phải chạy được ở Node, không cần DOM. Phần nào cần DOM thì
    // nó thuộc lớp hiển thị (stage.tsx), không thuộc core.ts.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '.tmp/**'],
  },
});
