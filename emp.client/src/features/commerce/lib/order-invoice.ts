import type { OrderInvoiceRecord } from '../services/commerce.api'

export const downloadOrderInvoice = (invoice: OrderInvoiceRecord) => {
  const filename = `${invoice.invoiceNumber || 'invoice'}.json`
  const blob = new Blob([JSON.stringify(invoice.raw, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
