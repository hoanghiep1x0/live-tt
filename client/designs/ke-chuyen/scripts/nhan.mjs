// Nhận blob video từ trang ghi hình trong trình duyệt rồi ghi ra file.
// Chỉ nghe 127.0.0.1, chỉ một đường, chỉ một lần.
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:http';

const RA = process.argv[2];
if (!RA) { console.error('thiếu đường ra'); process.exit(1); }

const sv = createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  const f = createWriteStream(RA);
  req.pipe(f);
  req.on('end', () => {
    f.end(() => {
      res.writeHead(200).end('ok');
      console.log('đã ghi', RA);
      sv.close();
      setTimeout(() => process.exit(0), 200);
    });
  });
});
sv.listen(47899, '127.0.0.1', () => console.log('chờ ở 127.0.0.1:47899 ->', RA));
