/** Gợi ý chatbot — chỉ giày dép (lọc gợi ý cũ từ phiên / API). */

const NON_SHOE_SUGGESTION =
  /\b(áo|ao thun|quần|váy|đầm|túi xách|balo|đồng hồ|mỹ phẩm|điện thoại|laptop|tai nghe)\b/i

export const DEFAULT_SHOE_SUGGESTIONS = [
  'Giày chạy bộ size 42',
  'Tra cứu đơn hàng',
  'Phí giao hàng',
] as const

export const filterShoeSuggestions = (items: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const s = raw.trim()
    if (s.length < 2 || seen.has(s) || NON_SHOE_SUGGESTION.test(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= 3) return out
  }
  for (const fallback of DEFAULT_SHOE_SUGGESTIONS) {
    if (!seen.has(fallback)) {
      seen.add(fallback)
      out.push(fallback)
    }
    if (out.length >= 3) break
  }
  return out
}
