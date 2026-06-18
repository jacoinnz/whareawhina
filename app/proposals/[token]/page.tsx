import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProposalHeader } from '@/components/proposal/proposal-header'
import { ProposalLineItems } from '@/components/proposal/proposal-line-items'
import { ProposalActions } from '@/components/proposal/proposal-actions'

type Props = { params: Promise<{ token: string }> }

export default async function ProposalPage({ params }: Props) {
  const { token } = await params

  const [quote, brand] = await Promise.all([
    prisma.quote.findUnique({
      where: { token },
      include: {
        client: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.brandSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  if (!quote || !brand) notFound()

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <ProposalHeader brand={brand} />

        <div className="bg-white shadow-sm px-8 py-6 space-y-8">
          {/* Meta */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quotation Proposal</h2>
              <p className="text-gray-500 text-sm mt-1">
                Prepared for: <span className="font-medium text-gray-700">{quote.client.name}</span>
              </p>
              {quote.client.contactName && (
                <p className="text-gray-500 text-sm">Attn: {quote.client.contactName}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-gray-900">{quote.quoteNumber}</p>
              <p className="text-gray-500 text-sm">
                {quote.sentAt
                  ? new Date(quote.sentAt).toLocaleDateString('en-NZ')
                  : new Date(quote.createdAt).toLocaleDateString('en-NZ')}
              </p>
            </div>
          </div>

          {/* Scope */}
          {quote.notes && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Scope of Work</h3>
              <p className="text-gray-600 whitespace-pre-line">{quote.notes}</p>
            </div>
          )}

          {/* Line Items */}
          <ProposalLineItems lineItems={quote.lineItems} />

          {/* Terms */}
          {quote.terms && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
              <p className="text-gray-500 text-sm whitespace-pre-line">{quote.terms}</p>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-6">
            <ProposalActions token={token} status={quote.status} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-b-xl px-8 py-4 text-center">
          <p className="text-gray-400 text-xs">
            {brand.companyName}
            {brand.phone && ` · ${brand.phone}`}
            {brand.email && ` · ${brand.email}`}
          </p>
        </div>
      </div>
    </div>
  )
}
