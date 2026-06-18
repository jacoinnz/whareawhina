import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { QuoteTable } from '@/components/dashboard/quote-table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await auth()
  const quotes = await prisma.quote.findMany({
    where: { authorId: session!.user.id },
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link href="/quotes/new">
          <Button>+ New Quote</Button>
        </Link>
      </div>
      <QuoteTable quotes={quotes} />
    </div>
  )
}
