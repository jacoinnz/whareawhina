import { Resend } from 'resend'
import { render } from '@react-email/components'
import { ProposalEmail } from '@/emails/proposal-email'
import { ResponseAlertEmail } from '@/emails/response-alert-email'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendProposalArgs = {
  to: string
  clientName: string
  quoteNumber: string
  quoteTitle: string
  proposalUrl: string
  companyName: string
  primaryColor: string
}

type SendAlertArgs = {
  to: string
  clientName: string
  quoteNumber: string
  quoteTitle: string
  quoteUrl: string
  accepted: boolean
  companyName: string
}

export async function sendProposalEmail(args: SendProposalArgs) {
  const html = await render(ProposalEmail(args))
  return resend.emails.send({
    from: `${args.companyName} <quotes@pctechnz.co.nz>`,
    to: args.to,
    subject: `Your IT Proposal from ${args.companyName} — ${args.quoteNumber}`,
    html,
  })
}

export async function sendResponseAlertEmail(args: SendAlertArgs) {
  const html = await render(ResponseAlertEmail(args))
  const verb = args.accepted ? 'ACCEPTED' : 'DECLINED'
  return resend.emails.send({
    from: `${args.companyName} <noreply@pctechnz.co.nz>`,
    to: args.to,
    subject: `${args.accepted ? '✓' : '✗'} ${args.clientName} has ${verb} quote ${args.quoteNumber}`,
    html,
  })
}
