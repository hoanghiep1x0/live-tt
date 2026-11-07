/**
 * Mấy luật "nói chuyện" chung cho mọi game, lấy từ Đi Chùa Online (đã chạy thật trên live).
 * Hàm thuần, không React, không phát tiếng: chỉ quyết định CÓ đọc hay không. Câu đọc nằm ở game/config.ts.
 */

// Bỏ dấu, thường hoá, 1 khoảng trắng, có khoảng trắng 2 đầu: "Cầu Bình An" -> " cau binh an "
export const plain = (text: string) =>
  ` ${text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

// ---------- Cảm ơn quà ----------

/**
 * Quà combo (x5, x10...) và quà tặng liên tục của cùng 1 người: chỉ cảm ơn 1 lần mỗi `cooldownMs`.
 * Quà to (>= bigCoins xu) luôn được cảm ơn. Quà nhỏ bị bỏ khi hàng câu quà đã dài (live đông).
 */
export class GiftThanker {
  private last = new Map<string, number>();
  constructor(
    private cooldownMs = 30_000,
    private bigCoins = 99,
    private maxWaiting = 6,
  ) {}
  shouldThank(username: string, coins: number, giftLinesWaiting: number, now: number) {
    const key = username.toLowerCase();
    const big = coins >= this.bigCoins;
    if (!big && now - (this.last.get(key) ?? -Infinity) < this.cooldownMs) return false;
    if (!big && giftLinesWaiting >= this.maxWaiting) return false;
    this.last.set(key, now);
    return true;
  }
  reset() {
    this.last.clear();
  }
}

// ---------- Chỉ 1 lần mỗi người (cảm ơn follow, share...) ----------

export class OncePerPerson {
  private seen = new Set<string>();
  /** true ở lần đầu của người đó, false các lần sau */
  first(username: string) {
    const key = username.toLowerCase();
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
  reset() {
    this.seen.clear();
  }
}
