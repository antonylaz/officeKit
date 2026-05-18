import { Body, Container, Heading, Html, Text } from "@react-email/components";

export function QuoteRequestConfirmationEmail({ projectId, locale }: { projectId: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Din offertförfrågan är skickad", body: "Vi har skickat din spec till tre leverantörer. Du får svar inom 3–4 timmar.", id: "Projekt-ID:" }
    : { heading: "Your quote request is on its way", body: "We've sent your spec to three suppliers. Expect replies within 3–4 hours.", id: "Project ID:" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", marginTop: 24 }}>{t.id} <strong>{projectId}</strong></Text>
        </Container>
      </Body>
    </Html>
  );
}
