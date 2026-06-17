'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { nextQuoteNumber, generateToken } from '@/lib/quotes'
import { revalidatePath } from 'next/cache'
import type { LineItemData } from '@/components/quote-builder/line-items-table'

type SaveQuoteInput = {
  id: string
  title: string
  notes: string
  terms: string
  clientId: string | null
  newClient: { name: string; contactName: string; email: string; phone: string; address: string } | null
  oneOffItems: LineItemData[]
  recurringItems: LineItemData[]
}

export async function saveQuote(input: SaveQuoteInput): Promise<{ error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const quote = await prisma.quote.findUnique({ where: { id: input.id } })
  if (!quote || quote.authorId !== session.user.id) return { error: 'Not found' }
  if (quote.status !== 'DRAFT') return { error: 'Only draft quotes can be edited' }

  let clientId = input.clientId

  if (input.newClient) {
    const { name, contactName, email, phone, address } = input.newClient
    if (!name || !contactName || !email) return { error: 'Client name, contact name, and email are required' }
    const client = await prisma.client.create({
      data: { name, contactName, email, phone: phone || null, address: address || null },
    })
    clientId = client.id
  }

  if (!clientId) return { error: 'Please select or create a client' }
  if (!input.title.trim()) return { error: 'Title is required' }

  const allItems = [
    ...input.oneOffItems.map((item, i) => ({ ...item, type: 'ONE_OFF' as const, sortOrder: i })),
    ...input.recurringItems.map((item, i) => ({ ...item, type: 'RECURRING' as const, sortOrder: i })),
  ]

  await prisma.lineItem.deleteMany({ where: { quoteId: input.id } })
  await prisma.quote.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      notes: input.notes.trim() || null,
      terms: input.terms.trim() || null,
      clientId,
      lineItems: {
        create: allItems.map(({ id: _id, ...item }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          type: item.type,
          sortOrder: item.sortOrder,
        })),
      },
    },
  })

  revalidatePath(`/quotes/${input.id}`)
  revalidatePath('/dashboard')
  return {}
}

export async function sendToClient(quoteId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { client: true },
  })
  if (!quote || quote.authorId !== session.user.id) return { error: 'Not found' }
  if (quote.status !== 'DRAFT') return { error: 'Quote already sent' }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'SENT', sentAt: new Date() },
  })

  // Email sending will be wired in Task 10
  revalidatePath(`/quotes/${quoteId}`)
  revalidatePath('/dashboard')
  return {}
}

export async function duplicateQuote(quoteId: string): Promise<{ newId?: string; error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const original = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true },
  })
  if (!original || original.authorId !== session.user.id) return { error: 'Not found' }

  const quoteNumber = await nextQuoteNumber()
  const token = generateToken()

  const newQuote = await prisma.quote.create({
    data: {
      quoteNumber,
      title: `${original.title} (copy)`,
      status: 'DRAFT',
      token,
      notes: original.notes,
      terms: original.terms,
      clientId: original.clientId,
      authorId: session.user.id,
      lineItems: {
        create: original.lineItems.map(({ id: _id, quoteId: _qid, ...item }) => item),
      },
    },
  })

  revalidatePath('/dashboard')
  return { newId: newQuote.id }
}
