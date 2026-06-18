import type { LineItem } from '@prisma/client'
import { subtotal, gst, totalWithGst, formatCurrency, lineItemTotal } from '@/lib/pricing'

export function LineTable({
  title,
  items,
  perSuffix,
}: {
  title: string
  items: LineItem[]
  perSuffix?: string
}) {
  const sub = subtotal(items.map(i => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })))
  const gstAmount = gst(sub)
  const total = totalWithGst(sub)
  const suffix = perSuffix ?? ''

  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">{title}</h3>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="text-left py-2 text-gray-600 font-medium">Description</th>
            <th className="text-right py-2 text-gray-600 font-medium w-16">Qty</th>
            <th className="text-right py-2 text-gray-600 font-medium w-28">Unit Price</th>
            <th className="text-right py-2 text-gray-600 font-medium w-28">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-right">{Number(item.quantity)}</td>
              <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice))}{suffix}</td>
              <td className="py-2 text-right font-medium">
                {formatCurrency(lineItemTotal({ quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))}
                {suffix}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t pt-2 space-y-0.5 text-sm text-right text-gray-600">
        <p>Subtotal: {formatCurrency(sub)}{suffix}</p>
        <p>GST (15%): {formatCurrency(gstAmount)}{suffix}</p>
        <p className="font-semibold text-gray-900 text-base">Total: {formatCurrency(total)}{suffix}</p>
      </div>
    </div>
  )
}

export function ProposalLineItems({ lineItems }: { lineItems: LineItem[] }) {
  const oneOff = lineItems.filter((i) => i.type === 'ONE_OFF')
  const recurring = lineItems.filter((i) => i.type === 'RECURRING')

  return (
    <div className="space-y-8">
      <LineTable title="One-off Costs" items={oneOff} />
      <LineTable title="Monthly Recurring" items={recurring} perSuffix="/mo" />
    </div>
  )
}
