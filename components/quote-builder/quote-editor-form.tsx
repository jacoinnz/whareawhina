'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LineItemsTable } from './line-items-table'
import type { LineItemData } from './line-items-table'
import { TotalsSummary } from './totals-summary'
import { ClientSelector } from './client-selector'
import type { NewClientFields } from './client-selector'
import type { Quote, Client, LineItem, QuoteStatus } from '@prisma/client'
import { saveQuote, sendToClient, duplicateQuote } from '@/app/(staff)/quotes/[id]/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type QuoteWithRelations = Quote & {
  client: Client
  lineItems: LineItem[]
}

function toLineItemData(item: LineItem): LineItemData {
  return {
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }
}

type Props = {
  quote: QuoteWithRelations
  clients: Client[]
}

const READ_ONLY_STATUSES: QuoteStatus[] = ['SENT', 'ACCEPTED', 'DECLINED']

export function QuoteEditorForm({ quote, clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const readOnly = READ_ONLY_STATUSES.includes(quote.status)

  const [title, setTitle] = useState(quote.title)
  const [notes, setNotes] = useState(quote.notes ?? '')
  const [terms, setTerms] = useState(quote.terms ?? '')
  const [clientId, setClientId] = useState(quote.clientId)
  const [newClient, setNewClient] = useState<NewClientFields | null>(null)

  const [oneOffItems, setOneOffItems] = useState<LineItemData[]>(
    quote.lineItems.filter((i) => i.type === 'ONE_OFF').map(toLineItemData)
  )
  const [recurringItems, setRecurringItems] = useState<LineItemData[]>(
    quote.lineItems.filter((i) => i.type === 'RECURRING').map(toLineItemData)
  )

  function handleSave() {
    startTransition(async () => {
      const result = await saveQuote({
        id: quote.id,
        title,
        notes,
        terms,
        clientId: clientId || null,
        newClient,
        oneOffItems,
        recurringItems,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Quote saved successfully.')
        router.refresh()
      }
    })
  }

  function handleSend() {
    startTransition(async () => {
      const result = await sendToClient(quote.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Proposal emailed to client.')
        router.refresh()
      }
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateQuote(quote.id)
      if (result.newId) {
        toast.success('New draft created.')
        router.push(`/quotes/${result.newId}`)
      }
    })
  }

  const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${quote.token}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Quote Number</Label>
            <Input value={quote.quoteNumber} readOnly className="bg-gray-50 font-mono" />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input value={new Date(quote.createdAt).toLocaleDateString('en-NZ')} readOnly className="bg-gray-50" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={readOnly}
            placeholder="IT System Upgrade for Whareawhina"
          />
        </div>
        <ClientSelector
          clients={clients}
          selectedClientId={clientId}
          onClientIdChange={setClientId}
          newClient={newClient}
          onNewClientChange={setNewClient}
        />
        <div className="space-y-1">
          <Label htmlFor="notes">Scope / Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            readOnly={readOnly}
            rows={4}
            placeholder="Describe the scope of work or any relevant notes…"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <LineItemsTable
          typeLabel="One-off Costs (hardware, project work, software)"
          items={oneOffItems}
          onChange={setOneOffItems}
          readOnly={readOnly}
        />
        <LineItemsTable
          typeLabel="Monthly Recurring (managed services, licensing, support)"
          items={recurringItems}
          onChange={setRecurringItems}
          readOnly={readOnly}
        />
        <TotalsSummary oneOffItems={oneOffItems} recurringItems={recurringItems} />
      </div>

      {/* Footer */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            readOnly={readOnly}
            rows={4}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
            quote.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
            quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {quote.status}
          </span>

          {quote.status === 'DRAFT' && (
            <>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button onClick={handleSend} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                {isPending ? 'Sending…' : 'Send to Client'}
              </Button>
            </>
          )}

          {quote.status !== 'DRAFT' && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(proposalUrl)}
              className="text-sm text-blue-600 hover:underline"
            >
              Copy proposal link
            </button>
          )}

          <Button variant="outline" onClick={handleDuplicate} disabled={isPending}>
            Duplicate
          </Button>
        </div>
      </div>
    </div>
  )
}
