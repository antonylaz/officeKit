import { Body, Container, Heading, Html, Link, Text } from "@react-email/components";

export function OrderWonSupplierEmail({ orderId, companyName, totalAmountKr, url, locale }: { orderId: string; companyName: string; totalAmountKr: number; url: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Du har vunnit en beställning", body: `${companyName} har valt din offert. Beställningsvärde: ${totalAmountKr.toLocaleString("sv-SE")} kr inkl. moms.`, cta: "Öppna beställning", id: "Order-ID:" }
    : { heading: "You won an order", body: `${companyName} chose your quote. Order value: ${totalAmountKr.toLocaleString("en-GB")} SEK incl. VAT.`, cta: "Open order", id: "Order ID:" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", marginTop: 16 }}>{t.id} <strong>{orderId}</strong></Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 24, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
