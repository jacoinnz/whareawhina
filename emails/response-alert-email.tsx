import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'

type Props = {
  clientName: string
  quoteNumber: string
  quoteTitle: string
  quoteUrl: string
  accepted: boolean
  companyName: string
}

export function ResponseAlertEmail({
  clientName,
  quoteNumber,
  quoteTitle,
  quoteUrl,
  accepted,
  companyName,
}: Props) {
  const verb = accepted ? 'ACCEPTED' : 'DECLINED'
  const color = accepted ? '#16a34a' : '#dc2626'

  return (
    <Html>
      <Head />
      <Preview>{clientName} has {verb.toLowerCase()} quote {quoteNumber}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ backgroundColor: color, padding: '16px 24px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>
              {accepted ? '✓' : '✗'} Quote {verb}
            </Heading>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '0 0 8px 8px' }}>
            <Text style={{ color: '#374151' }}>
              <strong>{clientName}</strong> has {verb.toLowerCase()} the following quote:
            </Text>
            <Text style={{ color: '#374151' }}>
              <strong>Quote:</strong> {quoteNumber}<br />
              <strong>Title:</strong> {quoteTitle}
            </Text>
            <Button
              href={quoteUrl}
              style={{
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View in {companyName}
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ResponseAlertEmail
