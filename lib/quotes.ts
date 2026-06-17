import { nanoid } from 'nanoid'

export function generateToken(): string {
  return nanoid(24)
}

export function formatQuoteNumber(n: number): string {
  return `PCT-${String(n).padStart(4, '0')}`
}

export async function nextQuoteNumber(): Promise<string> {
  const { prisma } = await import('@/lib/prisma')
  const count = await prisma.quote.count()
  return formatQuoteNumber(count + 1)
}
