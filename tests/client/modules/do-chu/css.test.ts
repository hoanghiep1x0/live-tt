import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const GOC = resolve(__dirname, '../../../..');

describe('CSS dựng sẵn của phần vẽ lớp học', () => {
  // Sửa class Tailwind trong *.tsx mà quên dựng lại thì class mới không có CSS —
  // lên sóng mới thấy vỡ. Bắt ở đây.
  it('lop.gen.css khớp nguồn hiện tại', () => {
    const chay = () =>
      execFileSync('node', ['scripts/phong/lop-hoc/tao-css.mjs', '--kiem'], { cwd: GOC, encoding: 'utf8' });
    expect(chay).not.toThrow();
  }, 60_000);
});
