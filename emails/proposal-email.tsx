import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components'

type Props = {
  clientName: string
  quoteNumber: string
  quoteTitle: string
  proposalUrl: string
  companyName: string
  primaryColor: string
}

export function ProposalEmail({
  clientName,
  quoteNumber,
  quoteTitle,
  proposalUrl,
  companyName,
  primaryColor,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your IT proposal {quoteNumber} from {companyName}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ backgroundColor: primaryColor, padding: '24px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>
              {companyName}
            </Heading>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
            <Heading as="h2" style={{ color: '#111827', fontSize: '20px' }}>
              Hi {clientName},
            </Heading>
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              Please find your IT proposal below. Click the button to review and accept or decline.
            </Text>
            <Text style={{ color: '#374151' }}>
              <strong>Quote:</strong> {quoteNumber}<br />
              <strong>Title:</strong> {quoteTitle}
            </Text>
            <Button
              href={proposalUrl}
              style={{
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
                marginTop: '16px',
              }}
            >
              View Proposal
            </Button>
            <Hr style={{ margin: '32px 0', borderColor: '#e5e7eb' }} />
            <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
              {companyName} · This link is unique to you. Please do not share it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ProposalEmail
