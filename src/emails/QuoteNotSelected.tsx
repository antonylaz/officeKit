import { Body, Container, Heading, Html, Text } from "@react-email/components";

export function QuoteNotSelectedEmail({ companyName, reason, locale }: { companyName: string; reason?: string | null; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Din offert valdes inte", body: `${companyName} valde en annan leverantör för detta projekt.`, reasonLabel: "Köparens kommentar:" }
    : { heading: "Your quote wasn't selected", body: `${companyName} chose another supplier for this project.`, reasonLabel: "Buyer note:" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          {reason && (
            <>
              <Text style={{ marginTop: 24, color: "#4a544a" }}>{t.reasonLabel}</Text>
              <Text style={{ fontStyle: "italic" }}>&quot;{reason}&quot;</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}
