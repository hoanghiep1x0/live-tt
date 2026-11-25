"""Lưu danh mục quà TikTok LIVE và tải ảnh từng quà.

Vào: tệp JSON danh sách quà (mảng {id, ten, xu, combo, loai, panel, anh}) lấy từ API
`webcast/gift/list` trong trang live (chạy trong trình duyệt đã mở live). Có thể là chuỗi JSON bọc trong nháy.
Ra: client/shared/qua-tiktok/danh-sach.json và client/shared/qua-tiktok/anh/<id>.webp (có rồi thì bỏ qua).

    python scripts/qua-tiktok/tai_qua.py <tệp-json>
"""

import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RA = Path(__file__).resolve().parents[2] / 'client' / 'shared' / 'qua-tiktok'


def doc(p: str) -> list[dict]:
    t = Path(p).read_text(encoding='utf-8').strip()
    try:
        v = json.loads(t)
    except json.JSONDecodeError:
        # Kết quả công cụ trình duyệt: [{type, text}] mà text là chuỗi JSON kèm dòng ghi chú cuối.
        v = json.loads(t[: t.rindex(']') + 1]) if t.startswith('[{"id"') else json.loads(t)
    if isinstance(v, list) and v and 'text' in v[0]:
        s = v[0]['text']
        s = s[: s.rindex('"') + 1]
        v = json.loads(json.loads(s))
    if isinstance(v, str):
        v = json.loads(v)
    return v


def tai(q: dict) -> str:
    dich = RA / 'anh' / f"{q['id']}.webp"
    if dich.exists() or not q['anh']:
        return 'bo'
    for lan in range(3):
        try:
            req = urllib.request.Request(q['anh'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=20) as r:
                dich.write_bytes(r.read())
            return 'ok'
        except Exception:  # noqa: BLE001
            time.sleep(1 + lan)
    return 'loi'


def main() -> None:
    ds = doc(sys.argv[1])
    (RA / 'anh').mkdir(parents=True, exist_ok=True)
    # Sắp: quà trên bảng quà trước (đúng thứ tự bảng), rồi theo giá.
    ds.sort(key=lambda q: (q['panel'] is None, q['panel'] if q['panel'] is not None else 0, q['xu'], q['ten']))
    # API đôi khi trả một quà hai lần (cùng id): giữ bản đầu.
    gap: set[int] = set()
    ds = [q for q in ds if not (q['id'] in gap or gap.add(q['id']))]
    for q in ds:
        q['file'] = f"anh/{q['id']}.webp"
    with ThreadPoolExecutor(8) as ex:
        kq = list(ex.map(tai, ds))
    (RA / 'danh-sach.json').write_text(json.dumps(ds, ensure_ascii=False, indent=1), encoding='utf-8')
    print(len(ds), 'quà ·', kq.count('ok'), 'tải mới ·', kq.count('bo'), 'có sẵn ·', kq.count('loi'), 'lỗi')
    for q, k in zip(ds, kq):
        if k == 'loi':
            print('  lỗi', q['id'], q['ten'])


if __name__ == '__main__':
    main()
