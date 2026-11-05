/** Đoán giao thức của một kết nối AI từ khoá và địa chỉ.
 *
 *  Bảng xem thử chỉ hỏi bốn thứ — tên ngắn, địa chỉ, model, khoá — vì giữa lúc
 *  live không ai muốn dừng lại chọn "giao thức". Mà backend thì phải biết gọi
 *  kiểu nào, nên suy ở đây. Hàm thuần, suy theo dấu hiệu chắc chắn trước:
 *
 *  1. Khoá Anthropic luôn mở đầu bằng `sk-ant-` — dấu hiệu rõ nhất.
 *  2. Địa chỉ có chữ `anthropic` — người vận hành chạy cổng trung chuyển riêng.
 *  3. Không khai địa chỉ: trong app này chỉ Anthropic mới hay để trống, nhà
 *     kiểu OpenAI thì dán hẳn `https://…/v1`.
 *  4. Còn lại là kiểu OpenAI — phần lớn nhà cung cấp nói tiếng này.
 *
 *  Kết quả hiện ngay dưới form, không suy ngầm sau lưng người vận hành. */
export type GiaoThuc = 'anthropic' | 'openai' | 'elevenlabs';

export function doanGiaoThuc(baseUrl: string, khoa: string): GiaoThuc {
  if (khoa.trim().startsWith('sk-ant-')) return 'anthropic';
  const dia = baseUrl.trim().toLowerCase();
  if (dia.includes('anthropic')) return 'anthropic';
  if (dia === '') return 'anthropic';
  return 'openai';
}

/** Tên giao thức để hiện cho người đọc. */
export function tenGiaoThuc(g: GiaoThuc): string {
  return g === 'anthropic' ? 'Kiểu Anthropic' : g === 'elevenlabs' ? 'Kiểu ElevenLabs' : 'Kiểu OpenAI';
}
