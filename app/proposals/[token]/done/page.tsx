type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ result?: string }>
}

export default async function ProposalDonePage({ searchParams }: Props) {
  const { result } = await searchParams
  const accepted = result === 'accepted'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-10 text-center space-y-4">
        <div className={`text-5xl ${accepted ? 'text-green-500' : 'text-gray-400'}`}>
          {accepted ? '✓' : '—'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {accepted ? 'Quote Accepted' : 'Quote Declined'}
        </h1>
        <p className="text-gray-500">
          {accepted
            ? "Thank you for accepting our proposal. We'll be in touch shortly to discuss next steps."
            : 'Thank you for letting us know. Please feel free to contact us if you have any questions.'}
        </p>
      </div>
    </div>
  )
}
