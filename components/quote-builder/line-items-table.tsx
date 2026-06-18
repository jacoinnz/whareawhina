'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency, lineItemTotal } from '@/lib/pricing'

export type LineItemData = {
  id?: string
  description: string
  quantity: number
  unitPrice: number
}

type Props = {
  typeLabel: string
  items: LineItemData[]
  onChange: (items: LineItemData[]) => void
  readOnly?: boolean
}

export function LineItemsTable({ typeLabel, items, onChange, readOnly }: Props) {
  function update(index: number, field: keyof LineItemData, raw: string) {
    const value = field === 'description' ? raw : (parseFloat(raw) || 0)
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onChange(updated)
  }

  function addRow() {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-700">{typeLabel}</h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">Qty</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Unit Price</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Total</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span>{item.description}</span>
                  ) : (
                    <Input
                      value={item.description}
                      onChange={(e) => update(i, 'description', e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-1"
                      placeholder="Description"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right">{item.quantity}</span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => update(i, 'quantity', e.target.value)}
                      className="h-8 text-right border-0 shadow-none focus-visible:ring-1"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right">{formatCurrency(item.unitPrice)}</span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => update(i, 'unitPrice', e.target.value)}
                      className="h-8 text-right border-0 shadow-none focus-visible:ring-1"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-medium">
                  {formatCurrency(lineItemTotal(item))}
                </td>
                {!readOnly && (
                  <td className="px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(i)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="px-3 py-4 text-center text-gray-400 text-sm">
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add Row
        </Button>
      )}
    </div>
  )
}
