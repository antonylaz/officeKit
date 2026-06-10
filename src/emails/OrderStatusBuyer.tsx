import { Body, Container, Heading, Html, Text, Section, Hr, Button } from "@react-email/components";

interface Props {
  supplierName: string;
  status: "confirmed" | "in_production" | "shipped" | "delivered" | "paid";
  orderId: string;
  trackingNumber: string | null;
  appUrl: string;
  locale: "sv" | "en";
}

export function OrderStatusBuyerEmail({
  supplierName,
  status,
  orderId,
  trackingNumber,
  appUrl,
  locale,
}: Props) {
  const meta = STATUS_META[status][locale];

  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#fafaf8", padding: "32px 0" }}>
        <Container style={{ maxWidth: 520, background: "#ffffff", padding: 40, borderRadius: 12, border: "1px solid #e5e3dd" }}>
          <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, color: meta.color, margin: 0 }}>
            {meta.tag}
          </Text>
          <Heading style={{ fontFamily: "Fraunces, serif", fontSize: 26, color: "#0f1612", margin: "8px 0 0" }}>
            {meta.heading}
          </Heading>
          <Text style={{ color: "#3a423e", fontSize: 15, lineHeight: 1.55, marginTop: 16 }}>
            {meta.body(supplierName)}
          </Text>

          {trackingNumber && status === "shipped" && (
            <Section style={{ margin: "24px 0", padding: 16, borderRadius: 8, background: "#fafaf8", border: "1px solid #e5e3dd" }}>
              <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#7a8079", margin: 0 }}>
                {locale === "sv" ? "Spårningsnummer" : "Tracking number"}
              </Text>
              <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16, color: "#0f1612", marginTop: 4 }}>
                {trackingNumber}
              </Text>
            </Section>
          )}

          <Section style={{ marginTop: 28 }}>
            <Button
              href={`${appUrl}/${locale}/orders/${orderId}`}
              style={{
                background: "#0f1612",
                color: "white",
                padding: "14px 24px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              {locale === "sv" ? "Se beställning" : "View order"} →
            </Button>
          </Section>

          <Hr style={{ borderColor: "#e5e3dd", margin: "32px 0 16px" }} />
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7a8079", margin: 0 }}>
            {locale === "sv" ? "Beställnings-ID" : "Order ID"}: <strong style={{ color: "#0f1612" }}>{orderId.slice(0, 8)}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

type StatusKey = "confirmed" | "in_production" | "shipped" | "delivered" | "paid";

const STATUS_META: Record<StatusKey, Record<"sv" | "en", { tag: string; heading: string; body: (sup: string) => string; color: string }>> = {
  confirmed: {
    sv: {
      tag: "Bekräftad",
      heading: "Er beställning är bekräftad",
      body: (s) => `${s} har bekräftat beställningen och börjar förbereda leveransen.`,
      color: "#b8862c",
    },
    en: {
      tag: "Confirmed",
      heading: "Your order is confirmed",
      body: (s) => `${s} has confirmed the order and is starting to prepare delivery.`,
      color: "#b8862c",
    },
  },
  in_production: {
    sv: {
      tag: "Tillverkas",
      heading: "Beställningen tillverkas",
      body: (s) => `${s} har påbörjat tillverkningen. Vi meddelar när det skickas.`,
      color: "#3a423e",
    },
    en: {
      tag: "In production",
      heading: "Your order is in production",
      body: (s) => `${s} has started production. We'll let you know when it ships.`,
      color: "#3a423e",
    },
  },
  shipped: {
    sv: {
      tag: "Skickad",
      heading: "Beställningen är på väg",
      body: (s) => `${s} har skickat er beställning.`,
      color: "#1b3026",
    },
    en: {
      tag: "Shipped",
      heading: "Your order is on the way",
      body: (s) => `${s} has shipped your order.`,
      color: "#1b3026",
    },
  },
  delivered: {
    sv: {
      tag: "Levererad",
      heading: "Beställningen är levererad",
      body: (s) =>
        `${s} har markerat beställningen som levererad. Kontakta dem direkt om något inte stämmer.`,
      color: "#4a6b52",
    },
    en: {
      tag: "Delivered",
      heading: "Your order has been delivered",
      body: (s) =>
        `${s} has marked the order as delivered. Reach out directly if anything's off.`,
      color: "#4a6b52",
    },
  },
  paid: {
    sv: {
      tag: "Slutförd",
      heading: "Beställningen är slutförd",
      body: (s) =>
        `Betalningen till ${s} har gått igenom. Tack för att ni handlade via OfficeKit.`,
      color: "#4a6b52",
    },
    en: {
      tag: "Completed",
      heading: "Your order is complete",
      body: (s) =>
        `Payment to ${s} has been settled. Thanks for shopping with OfficeKit.`,
      color: "#4a6b52",
    },
  },
};
