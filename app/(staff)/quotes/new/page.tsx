import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { nextQuoteNumber, generateToken } from '@/lib/quotes'
import { redirect } from 'next/navigation'

export default async function NewQuotePage() {
  const session = await auth()

  const brand = await prisma.brandSettings.findUnique({ where: { id: 'singleton' } })

  const quoteNumber = await nextQuoteNumber()
  const token = generateToken()

  // Need a clientId — use first existing client or create a placeholder
  const firstClient = await prisma.client.findFirst({ orderBy: { createdAt: 'asc' } })

  let clientId: string
  if (firstClient) {
    clientId = firstClient.id
  } else {
    const placeholder = await prisma.client.create({
      data: {
        name: 'New Client',
        contactName: 'Contact Name',
        email: 'client@example.com',
      },
    })
    clientId = placeholder.id
  }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      title: 'New Quote',
      status: 'DRAFT',
      token,
      terms: brand?.defaultTerms ?? null,
      clientId,
      authorId: session!.user.id,
    },
  })

  redirect(`/quotes/${quote.id}`)
}
