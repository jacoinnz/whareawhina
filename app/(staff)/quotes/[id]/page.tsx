import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { QuoteEditorForm } from '@/components/quote-builder/quote-editor-form'

type Props = { params: Promise<{ id: string }> }

export default async function QuoteEditorPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const [quote, clients] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!quote || quote.authorId !== session!.user.id) notFound()

  return (
    <div className="max-w-4xl space-y-2">
      <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
      <QuoteEditorForm quote={quote} clients={clients} />
    </div>
  )
}
