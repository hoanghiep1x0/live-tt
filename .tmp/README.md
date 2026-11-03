# .tmp/

Thùng rác. **Mọi thứ trong đây xoá được bất cứ lúc nào** mà không hỏng gì.

Dùng cho: kết quả trung gian của script, bản nháp, log gỡ lỗi, ảnh chụp màn hình khi thử,
file tải về để xem một lần.

```bash
rm -rf .tmp/*        # an toàn, luôn luôn
```

## Quy tắc

- Không nằm trong git (trừ chính file README này).
- Script sinh file tạm thì ghi vào đây, **không** ghi ra gốc dự án.
- Không ai được đọc file trong `.tmp/` như một đầu vào bắt buộc. Thiếu nó thì mọi thứ vẫn phải chạy.
- Cần giữ lại một thứ gì đó lâu dài thì chuyển sang `database/` hoặc `docs/`, không để ở đây.
