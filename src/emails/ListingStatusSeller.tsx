import { Body, Container, Heading, Html, Text, Section, Hr, Button } from "@react-email/components";

type StatusKey = "reviewing" | "approved" | "listed" | "sold" | "withdrawn";

interface Props {
  sellerName: string;
  companyName: string;
  status: StatusKey;
  listingId: string;
  appUrl: string;
  locale: "sv" | "en";
}

const STATUS_META: Record<StatusKey, Record<"sv" | "en", { tag: string; heading: string; body: (companyName: string) => string; color: string; ctaLabel: string }>> = {
  reviewing: {
    sv: {
      tag: "Granskas",
      heading: "Vi granskar er annons",
      body: (c) => `Vi har börjat gå igenom annonsen för ${c}. Återkommer med uppskattad värdering inom 24 timmar.`,
      color: "#b8862c",
      ctaLabel: "Se annons",
    },
    en: {
      tag: "Reviewing",
      heading: "We're reviewing your listing",
      body: (c) => `We've started reviewing the listing for ${c}. We'll respond with an estimated valuation within 24 hours.`,
      color: "#b8862c",
      ctaLabel: "View listing",
    },
  },
  approved: {
    sv: {
      tag: "Godkänd",
      heading: "Er annons är godkänd",
      body: (c) =>
        `Annonsen för ${c} är godkänd och visas nu i vår matchningsmotor. Köpare som söker liknande utrustning får upp den i sina förslag.`,
      color: "#4a6b52",
      ctaLabel: "Se annons",
    },
    en: {
      tag: "Approved",
      heading: "Your listing is approved",
      body: (c) =>
        `The listing for ${c} is approved and now visible in our matching engine. Buyers shopping for similar items will see it.`,
      color: "#4a6b52",
      ctaLabel: "View listing",
    },
  },
  listed: {
    sv: {
      tag: "Publicerad",
      heading: "Er annons är nu publicerad",
      body: (c) =>
        `Annonsen för ${c} är nu publicerad och söker köpare aktivt. Vi meddelar er direkt när någon visar intresse.`,
      color: "#1b3026",
      ctaLabel: "Se annons",
    },
    en: {
      tag: "Live",
      heading: "Your listing is now live",
      body: (c) =>
        `The listing for ${c} is live and actively looking for buyers. We'll notify you the moment someone shows interest.`,
      color: "#1b3026",
      ctaLabel: "View listing",
    },
  },
  sold: {
    sv: {
      tag: "Såld",
      heading: "Annonsen är såld",
      body: (c) =>
        `Annonsen för ${c} är markerad som såld. Vi tar bort den från sökresultat. Tack för att ni använde OfficeKit.`,
      color: "#4a6b52",
      ctaLabel: "Se annons",
    },
    en: {
      tag: "Sold",
      heading: "Your listing has sold",
      body: (c) =>
        `The listing for ${c} is marked as sold. We're removing it from search results. Thanks for using OfficeKit.`,
      color: "#4a6b52",
      ctaLabel: "View listing",
    },
  },
  withdrawn: {
    sv: {
      tag: "Tillbakadragen",
      heading: "Annonsen har dragits tillbaka",
      body: (c) =>
        `Annonsen för ${c} har dragits tillbaka och är inte längre synlig för köpare. Vill ni återpublicera kontaktar ni oss på det här mejlet.`,
      color: "#b8421c",
      ctaLabel: "Se annons",
    },
    en: {
      tag: "Withdrawn",
      heading: "Your listing has been withdrawn",
      body: (c) =>
        `The listing for ${c} has been withdrawn and is no longer visible to buyers. To republish, reply to this email.`,
      color: "#b8421c",
      ctaLabel: "View listing",
    },
  },
};

export function ListingStatusSellerEmail({
  sellerName,
  companyName,
  status,
  listingId,
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
            {locale === "sv" ? `Hej ${sellerName},` : `Hi ${sellerName},`}
          </Text>
          <Text style={{ color: "#3a423e", fontSize: 15, lineHeight: 1.55 }}>{meta.body(companyName)}</Text>

          <Section style={{ marginTop: 28 }}>
            <Button
              href={`${appUrl}/${locale}/listings/${listingId}`}
              style={{
                background: "#1b3026",
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
              {meta.ctaLabel} →
            </Button>
          </Section>

          <Hr style={{ borderColor: "#e5e3dd", margin: "32px 0 16px" }} />
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7a8079", margin: 0 }}>
            {locale === "sv" ? "Referens" : "Reference"}: <strong style={{ color: "#0f1612" }}>{listingId.slice(0, 8)}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
