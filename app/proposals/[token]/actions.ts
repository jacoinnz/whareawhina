'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function updateQuoteStatus(token: string, accepted: boolean): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { token },
    include: { client: true },
  })
  if (!quote || quote.status !== 'SENT') return

  const status = accepted ? 'ACCEPTED' : 'DECLINED'
  await prisma.quote.update({ where: { token }, data: { status } })

  revalidatePath('/dashboard')
  revalidatePath(`/proposals/${token}`)

  // Alert email wired in Task 12
}

export async function acceptQuote(token: string): Promise<void> {
  await updateQuoteStatus(token, true)
}

export async function declineQuote(token: string): Promise<void> {
  await updateQuoteStatus(token, false)
}
