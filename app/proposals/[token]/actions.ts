'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendResponseAlertEmail } from '@/lib/email'

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

  const brand = await prisma.brandSettings.findUnique({ where: { id: 'singleton' } })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (brand?.notifyEmail) {
    try {
      await sendResponseAlertEmail({
        to: brand.notifyEmail,
        clientName: quote.client.name,
        quoteNumber: quote.quoteNumber,
        quoteTitle: quote.title,
        quoteUrl: `${appUrl}/quotes/${quote.id}`,
        accepted,
        companyName: brand.companyName,
      })
    } catch (err) {
      console.error('Failed to send response alert email:', err)
    }
  }
}

export async function acceptQuote(token: string): Promise<void> {
  await updateQuoteStatus(token, true)
}

export async function declineQuote(token: string): Promise<void> {
  await updateQuoteStatus(token, false)
}
