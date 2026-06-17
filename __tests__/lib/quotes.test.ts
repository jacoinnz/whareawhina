import { describe, it, expect } from 'vitest'
import { generateToken, formatQuoteNumber } from '@/lib/quotes'

describe('generateToken', () => {
  it('returns a string of 24 characters', () => {
    expect(generateToken()).toHaveLength(24)
  })
  it('returns URL-safe characters only', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })
  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()))
    expect(tokens.size).toBe(200)
  })
})

describe('formatQuoteNumber', () => {
  it('pads to 4 digits with PCT- prefix', () => {
    expect(formatQuoteNumber(1)).toBe('PCT-0001')
    expect(formatQuoteNumber(42)).toBe('PCT-0042')
    expect(formatQuoteNumber(1000)).toBe('PCT-1000')
  })
})
