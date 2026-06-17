import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Quote, Client } from '@prisma/client'

type QuoteRow = Quote & { client: Client }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

export function QuoteTable({ quotes }: { quotes: QuoteRow[] }) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">No quotes yet.</p>
        <Link href="/quotes/new">
          <Button className="mt-4">Create your first quote</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Quote #</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-blue-600">{q.quoteNumber}</td>
              <td className="px-4 py-3">{q.title}</td>
              <td className="px-4 py-3">{q.client.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={q.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(q.createdAt).toLocaleDateString('en-NZ')}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/quotes/${q.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
