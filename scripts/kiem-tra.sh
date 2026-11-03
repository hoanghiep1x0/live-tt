#!/usr/bin/env bash
# Kiểm tra trước khi commit: typecheck rồi chạy test.
# Chạy được từ bất kỳ thư mục nào.
set -euo pipefail

goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$goc"

echo "== Kiểm tra kiểu =="
npx tsc --build --force

echo "== Chạy test =="
npx vitest run

if [ -d backend/src ]; then
  echo "== Test backend =="
  (cd backend && cargo test)
fi

echo "Xong — mọi thứ xanh."
