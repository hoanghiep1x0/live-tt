// Dựng CSS cho phần vẽ của module Lớp học đố chữ (client/modules/do-chu/src/view).
//
// Phần vẽ viết bằng class Tailwind (chuyển nguyên từ repo lop-hoc-chu). Mọi thiết kế
// cùng gói mọi module, nên không bắt thiết kế nào cài Tailwind: dựng sẵn một lần ra
// `lop.gen.css`, mọi selector gói dưới `.dc-root` để preflight và class chung chung
// (.tile, .badge…) không lọt sang phòng khác.
//
//   node scripts/phong/lop-hoc/tao-css.mjs          ghi lop.gen.css
//   node scripts/phong/lop-hoc/tao-css.mjs --kiem   chỉ kiểm, bản dựng cũ thì thoát mã 1
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import postcss from 'postcss';

const GOC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const VIEW = resolve(GOC, 'client', 'modules', 'do-chu', 'src', 'view');
const NGUON = resolve(VIEW, 'lop.css');
const DICH = resolve(VIEW, 'lop.gen.css');
const PHAM_VI = '.dc-root';

/** `:root`, `html`… là gốc trang ở bản cũ — ở đây gốc là khung lớp học. */
const LA_GOC = new Set([':root', ':host', 'html', 'body', 'html,:host']);

function goi(sel) {
  const s = sel.trim();
  if (s === '' || s.startsWith(PHAM_VI)) return s;
  if (LA_GOC.has(s)) return PHAM_VI;
  // `*` của preflight áp cả cho chính khung gốc (box-sizing…).
  if (s === '*') return `${PHAM_VI}, ${PHAM_VI} *`;
  if (s.startsWith('::')) return `${PHAM_VI}${s}, ${PHAM_VI} *${s}`;
  for (const g of [':root', ':host', 'html', 'body']) {
    if (s.startsWith(`${g} `) || s.startsWith(`${g}:`) || s.startsWith(`${g}[`)) return `${PHAM_VI}${s.slice(g.length)}`;
  }
  return `${PHAM_VI} ${s}`;
}

export async function dungCss() {
  const vao = readFileSync(NGUON, 'utf8');
  const tw = await compile(vao, { base: VIEW, onDependency: () => {} });
  const scanner = new Scanner({ sources: [{ base: VIEW, pattern: '**/*.tsx', negated: false }] });
  const tho = tw.build(scanner.scan());
  // Gỡ lồng nhau (`&:hover`, `@media` trong rule) trước khi gói selector.
  const phang = optimize(tho, { minify: false }).code;
  const goc = postcss.parse(phang);
  goc.walkRules((r) => {
    let p = r.parent;
    while (p) {
      if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return;
      p = p.parent;
    }
    r.selectors = r.selectors.map(goi);
  });
  return `/* TỰ SINH bởi scripts/phong/lop-hoc/tao-css.mjs từ lop.css + class trong *.tsx — đừng sửa tay. */\n${goc.toString()}`;
}

const css = await dungCss();
if (process.argv.includes('--kiem')) {
  const cu = existsSync(DICH) ? readFileSync(DICH, 'utf8') : '';
  if (cu !== css) {
    console.error('lop.gen.css đã cũ — chạy: node scripts/phong/lop-hoc/tao-css.mjs');
    process.exit(1);
  }
  console.log('lop.gen.css khớp nguồn');
} else {
  writeFileSync(DICH, css);
  console.log(`Đã ghi ${DICH} (${(css.length / 1024).toFixed(0)} KB)`);
}
