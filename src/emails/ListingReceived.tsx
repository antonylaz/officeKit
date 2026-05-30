import { Body, Container, Heading, Html, Text, Section, Hr } from "@react-email/components";

interface Props {
  contactName: string;
  companyName: string;
  itemCount: number;
  listingId: string;
  locale: "sv" | "en";
}

export function ListingReceivedEmail({ contactName, companyName, itemCount, listingId, locale }: Props) {
  const t =
    locale === "sv"
      ? {
          heading: "Tack — vi har fått er annons",
          greeting: `Hej ${contactName},`,
          body: `Vi har tagit emot er annons för ${companyName} (${itemCount} ${itemCount === 1 ? "rad" : "rader"}). En av oss läser igenom den och återkommer inom 24 timmar med en uppskattad värdering och nästa steg.`,
          stepsTitle: "Vad händer nu",
          step1: "1. Vi går igenom annonsen och ger en uppskattad värdering inom 24 timmar.",
          step2: "2. Om ni godkänner publicerar vi annonsen och matchar mot pågående köpprojekt.",
          step3: "3. Vid intresserad köpare koordinerar vi upphämtning och betalning åt er.",
          questions: "Frågor? Svara på det här mejlet.",
          refLabel: "Referens",
        }
      : {
          heading: "Thanks — we've got your listing",
          greeting: `Hi ${contactName},`,
          body: `We've received your listing for ${companyName} (${itemCount} ${itemCount === 1 ? "line" : "lines"}). One of us will read through it and get back within 24 hours with an estimated valuation and next steps.`,
          stepsTitle: "What happens next",
          step1: "1. We review your listing and respond with an estimated valuation within 24 hours.",
          step2: "2. If you approve, we publish it and match against active buyer projects.",
          step3: "3. If a buyer is interested, we coordinate pickup and payment for you.",
          questions: "Questions? Just reply to this email.",
          refLabel: "Reference",
        };

  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#fafaf8", padding: "32px 0" }}>
        <Container style={{ maxWidth: 520, background: "#ffffff", padding: 40, borderRadius: 12, border: "1px solid #e5e3dd" }}>
          <Heading style={{ fontFamily: "Fraunces, serif", fontSize: 26, color: "#1b3026", margin: 0 }}>
            {t.heading}
          </Heading>
          <Text style={{ marginTop: 24, color: "#0f1612", fontSize: 15 }}>{t.greeting}</Text>
          <Text style={{ color: "#3a423e", fontSize: 15, lineHeight: 1.55 }}>{t.body}</Text>

          <Hr style={{ borderColor: "#e5e3dd", margin: "28px 0" }} />

          <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#7a8079", margin: 0 }}>
            {t.stepsTitle}
          </Text>
          <Section style={{ marginTop: 12 }}>
            <Text style={{ color: "#3a423e", fontSize: 14, lineHeight: 1.6, margin: "6px 0" }}>{t.step1}</Text>
            <Text style={{ color: "#3a423e", fontSize: 14, lineHeight: 1.6, margin: "6px 0" }}>{t.step2}</Text>
            <Text style={{ color: "#3a423e", fontSize: 14, lineHeight: 1.6, margin: "6px 0" }}>{t.step3}</Text>
          </Section>

          <Hr style={{ borderColor: "#e5e3dd", margin: "28px 0" }} />

          <Text style={{ color: "#7a8079", fontSize: 12 }}>{t.questions}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7a8079", marginTop: 16 }}>
            {t.refLabel}: <strong style={{ color: "#0f1612" }}>{listingId.slice(0, 8)}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
