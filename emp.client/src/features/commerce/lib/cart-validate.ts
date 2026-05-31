import type { CartValidationResult, CartValidatedItem } from '../services/commerce.api'

const availabilityLabels: Record<string, string> = {
  INACTIVE: 'Sản phẩm không còn bán',
  OUT_OF_STOCK: 'Hết hàng',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho',
}

const formatIssue = (issue: string, item: CartValidatedItem) => {
  const label = availabilityLabels[issue] ?? issue
  if (issue === 'INSUFFICIENT_STOCK' && item.suggestedQuantity > 0) {
    return `${label} (gợi ý: ${item.suggestedQuantity})`
  }
  return label
}

export const formatCartValidationIssues = (items: CartValidatedItem[]): string => {
  const invalidItems = items.filter((item) => !item.isValid)

  if (invalidItems.length === 0) {
    return 'Giỏ hàng chưa sẵn sàng checkout. Vui lòng kiểm tra lại các sản phẩm đã chọn.'
  }

  return invalidItems
    .map((item) => {
      const issues = item.issues.map((issue) => formatIssue(issue, item)).join(', ')
      return `${item.productName} (SKU ${item.sku}): ${issues}`
    })
    .join('\n')
}

export const assertCartCheckoutReady = (validation: CartValidationResult): void => {
  if (validation.summary.checkoutReady) return
  throw new Error(formatCartValidationIssues(validation.items))
}
