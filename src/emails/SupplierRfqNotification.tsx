import { Body, Container, Heading, Html, Link, Text } from "@react-email/components";

export function SupplierRfqNotificationEmail({
  url, industry, city, headcount, itemCount, deadlineAt, locale,
}: {
  url: string;
  industry: string;
  city: string;
  headcount: number;
  itemCount: number;
  deadlineAt: Date;
  locale: "sv" | "en";
}) {
  const deadlineStr = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(deadlineAt);
  const t = locale === "sv"
    ? { heading: "Ny offertförfrågan", body: "Du har fått en ny offertförfrågan via OfficeKit.", cta: "Visa förfrågan", deadline: "Deadline:", details: "Detaljer" }
    : { heading: "New quote request", body: "You've received a new quote request via OfficeKit.", cta: "View request", deadline: "Deadline:", details: "Details" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 520, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ fontSize: 14, color: "#4a544a", marginTop: 16 }}>{t.details}:</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
            Industry: {industry}<br/>
            Location: {city}<br/>
            Headcount: {headcount}<br/>
            Items: {itemCount}<br/>
            {t.deadline} {deadlineStr}
          </Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 24, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
