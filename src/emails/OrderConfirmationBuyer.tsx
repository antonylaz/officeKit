import { Body, Container, Heading, Html, Text } from "@react-email/components";

export function OrderConfirmationBuyerEmail({ orderId, supplierName, locale }: { orderId: string; supplierName: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Beställning bekräftad", body: `Din beställning hos ${supplierName} har skickats. De bekräftar inom 24 timmar.`, id: "Order-ID:" }
    : { heading: "Order placed", body: `Your order with ${supplierName} has been sent. They'll confirm within 24 hours.`, id: "Order ID:" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", marginTop: 24 }}>{t.id} <strong>{orderId}</strong></Text>
        </Container>
      </Body>
    </Html>
  );
}
