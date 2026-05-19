import { Body, Container, Heading, Html, Link, Text } from "@react-email/components";

export function OrderCancelledBuyerEmail({ supplierName, reason, projectUrl, locale }: { supplierName: string; reason: string; projectUrl: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Din beställning har avbokats", body: `${supplierName} har avbokat din beställning. Du kan välja en annan leverantörs offert.`, reasonLabel: "Anledning:", cta: "Se andra offerter" }
    : { heading: "Your order was cancelled", body: `${supplierName} cancelled your order. You can pick another supplier's quote.`, reasonLabel: "Reason:", cta: "View other quotes" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ color: "#4a544a", marginTop: 16 }}>{t.reasonLabel}</Text>
          <Text style={{ fontStyle: "italic" }}>&quot;{reason}&quot;</Text>
          <Link href={projectUrl} style={{ display: "inline-block", marginTop: 24, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
