import { describe, it, expect } from 'vitest'
import {
  lineItemTotal,
  subtotal,
  gst,
  totalWithGst,
  formatCurrency,
  GST_RATE,
} from '@/lib/pricing'

describe('GST_RATE', () => {
  it('is 0.15', () => {
    expect(GST_RATE).toBe(0.15)
  })
})

describe('lineItemTotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(lineItemTotal({ quantity: 3, unitPrice: 100 })).toBe(300)
  })
  it('handles decimal quantities', () => {
    expect(lineItemTotal({ quantity: 1.5, unitPrice: 200 })).toBe(300)
  })
  it('returns 0 when quantity is 0', () => {
    expect(lineItemTotal({ quantity: 0, unitPrice: 999 })).toBe(0)
  })
})

describe('subtotal', () => {
  it('sums all line item totals', () => {
    const items = [
      { quantity: 2, unitPrice: 100 },
      { quantity: 1, unitPrice: 500 },
    ]
    expect(subtotal(items)).toBe(700)
  })
  it('returns 0 for empty array', () => {
    expect(subtotal([])).toBe(0)
  })
})

describe('gst', () => {
  it('calculates 15% of the amount', () => {
    expect(gst(1000)).toBe(150)
  })
  it('handles fractional amounts', () => {
    expect(gst(100.5)).toBeCloseTo(15.075)
  })
})

describe('totalWithGst', () => {
  it('adds 15% GST to the amount', () => {
    expect(totalWithGst(1000)).toBe(1150)
  })
})

describe('formatCurrency', () => {
  it('formats as NZD with two decimal places', () => {
    const formatted = formatCurrency(1234.5)
    expect(formatted).toContain('1,234.50')
  })
  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0.00')
  })
})
