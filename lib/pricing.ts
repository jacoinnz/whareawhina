export const GST_RATE = 0.15

export type LineItemInput = {
  quantity: number
  unitPrice: number
}

export function lineItemTotal(item: LineItemInput): number {
  return item.quantity * item.unitPrice
}

export function subtotal(items: LineItemInput[]): number {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0)
}

export function gst(amount: number): number {
  return amount * GST_RATE
}

export function totalWithGst(amount: number): number {
  return amount + gst(amount)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(amount)
}
