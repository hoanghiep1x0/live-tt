#!/usr/bin/env bash
# Phòng sàn bar — đồng bộ giữa máy này (repo + D:\Assets) và project dựng 3D trên hpc-station.
# Quy ước thư mục: docs/phong/san-bar/nhan-vat/01-chuan-bi.md §2. Chạy từ Git Bash trên Windows.
#
#   scripts/phong/san-bar/hpc-dong-bo.sh script            # đẩy scripts/phong/san-bar → <project>/repo (ghi đè)
#   scripts/phong/san-bar/hpc-dong-bo.sh day <model-N>     # đẩy D:\Assets\<model-N> (ảnh vào) → <project>/assets/<model-N>
#   scripts/phong/san-bar/hpc-dong-bo.sh day-chung         # đẩy thư viện dùng chung: parts\, base\, *.fbx
#   scripts/phong/san-bar/hpc-dong-bo.sh keo <đường dẫn>   # kéo <project>/assets/<đường dẫn> về D:\Assets\<đường dẫn>
#
# Chỉ đẩy/kéo trong <project>; không bao giờ ghi ra ngoài project (kể cả ~ trên hpc).
set -euo pipefail

HOST="${HPC_HOST:-hpc-station}"
PROJ="${HPC_PROJ:-/mnt/D/dung-3d}"
ASSETS="${ASSETS:-/d/Assets}"
goc="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

viec="${1:-}"; shift || true
case "$viec" in
  script)
    # Bỏ CR: bản checkout trên Windows có thể là CRLF, bash/python trên Linux không chạy được shebang có \r
    tar cf - -C "$goc" scripts/phong/san-bar | ssh "$HOST" "tar xf - -C '$PROJ/repo' &&
      find '$PROJ/repo/scripts' -type f \( -name '*.sh' -o -name '*.py' \) -exec sed -i 's/\r\$//' {} + &&
      chmod +x '$PROJ/repo/scripts/phong/san-bar/'*.sh"
    echo "Đã đẩy scripts/phong/san-bar → $HOST:$PROJ/repo"
    ;;
  day)
    m="${1:?Thiếu tên model, vd model-2}"
    tar cf - -C "$ASSETS" "$m" | ssh "$HOST" "tar xf - -C '$PROJ/assets'"
    echo "Đã đẩy $ASSETS/$m → $HOST:$PROJ/assets/$m"
    ;;
  day-chung)
    (cd "$ASSETS" && tar cf - parts base ./*.fbx) | ssh "$HOST" "tar xf - -C '$PROJ/assets'"
    echo "Đã đẩy parts, base, *.fbx → $HOST:$PROJ/assets"
    ;;
  keo)
    p="${1:?Thiếu đường dẫn trong assets/, vd model-2/out/model2_base.glb}"
    case "$p" in /*|*..*) echo "Đường dẫn phải nằm trong assets/ (không /, không ..)" >&2; exit 2 ;; esac
    ssh "$HOST" "tar cf - -C '$PROJ/assets' '$p'" | tar xf - -C "$ASSETS"
    echo "Đã kéo $HOST:$PROJ/assets/$p → $ASSETS/$p"
    ;;
  *)
    sed -n '2,10p' "$0" >&2; exit 2 ;;
esac
