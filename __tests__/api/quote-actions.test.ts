import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma and auth
vi.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    client: { create: vi.fn() },
    lineItem: { deleteMany: vi.fn() },
    brandSettings: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => ({ user: { id: 'user-1', name: 'Admin', email: 'admin@pctechnz.co.nz' } })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendProposalEmail: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ get: vi.fn() })) }))

import { prisma } from '@/lib/prisma'
import { duplicateQuote } from '@/app/(staff)/quotes/[id]/actions'

describe('duplicateQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when quote not found', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(null)
    const result = await duplicateQuote('nonexistent')
    expect(result.error).toBe('Not found')
  })

  it('returns error when quote belongs to different user', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      id: 'q-1',
      authorId: 'different-user',
      lineItems: [],
    } as any)
    const result = await duplicateQuote('q-1')
    expect(result.error).toBe('Not found')
  })

  it('creates a new draft when quote is valid', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      id: 'q-1',
      authorId: 'user-1',
      title: 'Test Quote',
      notes: null,
      terms: null,
      clientId: 'client-1',
      lineItems: [],
    } as any)
    vi.mocked(prisma.quote.count).mockResolvedValue(5)
    vi.mocked(prisma.quote.create).mockResolvedValue({ id: 'new-q' } as any)

    const result = await duplicateQuote('q-1')
    expect(result.newId).toBe('new-q')
    expect(prisma.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quoteNumber: 'PCT-0006',
          title: 'Test Quote (copy)',
          status: 'DRAFT',
        }),
      })
    )
  })
})
