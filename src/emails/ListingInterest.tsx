import { Body, Container, Heading, Html, Text, Section, Hr } from "@react-email/components";

interface Props {
  sellerName: string;
  sellerCompany: string;
  buyerName: string;
  buyerEmail: string;
  buyerCompany: string | null;
  message: string | null;
  itemSummary: string;
  listingId: string;
  locale: "sv" | "en";
}

export function ListingInterestEmail({
  sellerName, sellerCompany, buyerName, buyerEmail, buyerCompany, message, itemSummary, listingId, locale,
}: Props) {
  const t = locale === "sv"
    ? {
        heading: "Någon är intresserad av er annons",
        greeting: `Hej ${sellerName},`,
        body: `En potentiell köpare har visat intresse för er annons för ${sellerCompany}.`,
        buyerLabel: "Köpare",
        emailLabel: "E-post",
        companyLabel: "Företag",
        messageLabel: "Meddelande",
        itemsLabel: "Annonsen omfattar",
        nextStep: "Vi rekommenderar att ni svarar inom 24 timmar — köpare värderar snabb återkoppling högt. Svara direkt på köparens e-post.",
        refLabel: "Referens",
      }
    : {
        heading: "Someone is interested in your listing",
        greeting: `Hi ${sellerName},`,
        body: `A potential buyer has expressed interest in your listing for ${sellerCompany}.`,
        buyerLabel: "Buyer",
        emailLabel: "Email",
        companyLabel: "Company",
        messageLabel: "Message",
        itemsLabel: "The listing covers",
        nextStep: "We recommend replying within 24 hours — buyers value fast responses. Just reply directly to the buyer's email.",
        refLabel: "Reference",
      };

  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#fafaf8", padding: "32px 0" }}>
        <Container style={{ maxWidth: 540, background: "#ffffff", padding: 40, borderRadius: 12, border: "1px solid #e5e3dd" }}>
          <Heading style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: "#1b3026", margin: 0 }}>
            {t.heading}
          </Heading>
          <Text style={{ marginTop: 24, color: "#0f1612", fontSize: 15 }}>{t.greeting}</Text>
          <Text style={{ color: "#3a423e", fontSize: 15, lineHeight: 1.55 }}>{t.body}</Text>

          <Hr style={{ borderColor: "#e5e3dd", margin: "28px 0" }} />

          <Section>
            <Row label={t.buyerLabel} value={buyerName} />
            <Row label={t.emailLabel} value={buyerEmail} />
            {buyerCompany && <Row label={t.companyLabel} value={buyerCompany} />}
          </Section>

          {message && (
            <>
              <Hr style={{ borderColor: "#e5e3dd", margin: "20px 0" }} />
              <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#7a8079", margin: 0 }}>
                {t.messageLabel}
              </Text>
              <Text style={{ color: "#3a423e", fontSize: 14, lineHeight: 1.6, marginTop: 8, fontStyle: "italic", borderLeft: "3px solid #e5e3dd", paddingLeft: 12 }}>
                {message}
              </Text>
            </>
          )}

          <Hr style={{ borderColor: "#e5e3dd", margin: "20px 0" }} />

          <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#7a8079", margin: 0 }}>
            {t.itemsLabel}
          </Text>
          <Text style={{ color: "#3a423e", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{itemSummary}</Text>

          <Hr style={{ borderColor: "#e5e3dd", margin: "28px 0" }} />

          <Text style={{ color: "#3a423e", fontSize: 13, lineHeight: 1.6 }}>{t.nextStep}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7a8079", marginTop: 20 }}>
            {t.refLabel}: <strong style={{ color: "#0f1612" }}>{listingId.slice(0, 8)}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ margin: "8px 0" }}>
      <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, color: "#7a8079", margin: 0, display: "inline-block", minWidth: 80 }}>
        {label}
      </Text>
      <Text style={{ display: "inline", color: "#0f1612", fontSize: 14, marginLeft: 8 }}>
        {value}
      </Text>
    </Section>
  );
}
