import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    brandSettings: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/email', () => ({
  sendResponseAlertEmail: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ get: vi.fn() })) }))

import { prisma } from '@/lib/prisma'
import { acceptQuote, declineQuote } from '@/app/proposals/[token]/actions'

// mockSentQuote includes client because findUnique uses include: { client: true }
const mockSentQuote = {
  id: 'q-1',
  token: 'abc123',
  status: 'SENT',
  quoteNumber: 'PCT-0001',
  title: 'Test',
  client: { name: 'Whareawhina' },
}

describe('acceptQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when quote is not found', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(null)
    await acceptQuote('bad-token')
    expect(prisma.quote.update).not.toHaveBeenCalled()
  })

  it('does nothing when quote is not SENT', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      ...mockSentQuote,
      status: 'ACCEPTED',
    } as any)
    await acceptQuote('abc123')
    expect(prisma.quote.update).not.toHaveBeenCalled()
  })

  it('sets status to ACCEPTED for a SENT quote', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(mockSentQuote as any)
    vi.mocked(prisma.brandSettings.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.quote.update).mockResolvedValue({} as any)

    await acceptQuote('abc123')
    expect(prisma.quote.update).toHaveBeenCalledWith({
      where: { token: 'abc123' },
      data: { status: 'ACCEPTED' },
    })
  })
})

describe('declineQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets status to DECLINED for a SENT quote', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(mockSentQuote as any)
    vi.mocked(prisma.brandSettings.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.quote.update).mockResolvedValue({} as any)

    await declineQuote('abc123')
    expect(prisma.quote.update).toHaveBeenCalledWith({
      where: { token: 'abc123' },
      data: { status: 'DECLINED' },
    })
  })
})
