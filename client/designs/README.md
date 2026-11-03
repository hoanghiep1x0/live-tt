# client/designs/

Mỗi thư mục con là **một thiết kế** — một phòng live hoàn chỉnh, đóng gói riêng,
có assets riêng. Cách viết: [docs/04-viet-thiet-ke.md](../../docs/04-viet-thiet-ke.md).

```
<design-id>/
├─ design.json      manifest: id, tên, slot, khả năng, module gợi ý
├─ package.json     name: "@live/design-<design-id>"
├─ src/
├─ assets/          assets RIÊNG, không dùng chung với thiết kế khác
└─ dist/            (không commit) bản build, thứ OBS tải về
```

Máy chủ quét thư mục này lúc chạy. Thiết kế chưa build vẫn hiện trên trang quản lý,
kèm dòng "chưa build" — để bạn thấy nó tồn tại thay vì thắc mắc sao danh sách trống.

`design.json` phải có `id` trùng tên thư mục, nếu không máy chủ từ chối và nói rõ lý do.
