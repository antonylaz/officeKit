import { Body, Container, Heading, Html, Link, Text } from "@react-email/components";

export function SupplierInviteEmail({ url, supplierName, locale }: { url: string; supplierName: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Välkommen till OfficeKit", body: `Du har bjudits in att representera ${supplierName} på OfficeKit. Klicka på länken för att aktivera ditt konto.`, cta: "Aktivera konto" }
    : { heading: "Welcome to OfficeKit", body: `You've been invited to represent ${supplierName} on OfficeKit. Click the link to activate your account.`, cta: "Activate account" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 16, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
