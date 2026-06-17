'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptQuote, declineQuote } from '@/app/proposals/[token]/actions'
import { useRouter } from 'next/navigation'

type Props = {
  token: string
  status: string
}

export function ProposalActions({ token, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(status)

  if (localStatus === 'ACCEPTED') {
    return (
      <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-700 font-semibold text-lg">Quote Accepted</p>
        <p className="text-green-600 text-sm mt-1">Thank you — we'll be in touch shortly.</p>
      </div>
    )
  }

  if (localStatus === 'DECLINED') {
    return (
      <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-700 font-semibold text-lg">Quote Declined</p>
        <p className="text-red-600 text-sm mt-1">Thank you for letting us know.</p>
      </div>
    )
  }

  function handleAccept() {
    startTransition(async () => {
      await acceptQuote(token)
      setLocalStatus('ACCEPTED')
      router.push(`/proposals/${token}/done?result=accepted`)
    })
  }

  function handleDecline() {
    startTransition(async () => {
      await declineQuote(token)
      setLocalStatus('DECLINED')
      router.push(`/proposals/${token}/done?result=declined`)
    })
  }

  return (
    <div className="flex gap-4 justify-center pt-4">
      <Button
        onClick={handleAccept}
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white px-8"
        size="lg"
      >
        {isPending ? 'Processing…' : 'Accept Quote'}
      </Button>
      <Button
        onClick={handleDecline}
        disabled={isPending}
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 px-8"
        size="lg"
      >
        {isPending ? 'Processing…' : 'Decline Quote'}
      </Button>
    </div>
  )
}
