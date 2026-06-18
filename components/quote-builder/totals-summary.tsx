'use client'
import { subtotal, gst, totalWithGst, formatCurrency } from '@/lib/pricing'
import type { LineItemData } from './line-items-table'

type Props = {
  oneOffItems: LineItemData[]
  recurringItems: LineItemData[]
}

function TotalsBlock({
  label,
  items,
  perSuffix,
}: {
  label: string
  items: LineItemData[]
  perSuffix?: string
}) {
  const sub = subtotal(items)
  const gstAmount = gst(sub)
  const total = totalWithGst(sub)
  const suffix = perSuffix ?? ''

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      <div className="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span>{formatCurrency(sub)}{suffix}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>GST (15%)</span>
        <span>{formatCurrency(gstAmount)}{suffix}</span>
      </div>
      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
        <span>Total</span>
        <span>{formatCurrency(total)}{suffix}</span>
      </div>
    </div>
  )
}

export function TotalsSummary({ oneOffItems, recurringItems }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <TotalsBlock label="One-off Total" items={oneOffItems} />
      <TotalsBlock label="Monthly Recurring" items={recurringItems} perSuffix="/mo" />
    </div>
  )
}
