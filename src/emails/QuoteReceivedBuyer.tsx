import { Body, Container, Heading, Html, Text, Section, Hr, Button } from "@react-email/components";

interface Props {
  supplierName: string;
  projectName: string;
  totalSek: number; // already in SEK (not öre)
  projectId: string;
  remainingExpected: number;
  appUrl: string;
  locale: "sv" | "en";
}

export function QuoteReceivedBuyerEmail({
  supplierName,
  projectName,
  totalSek,
  projectId,
  remainingExpected,
  appUrl,
  locale,
}: Props) {
  const t =
    locale === "sv"
      ? {
          heading: "En offert har kommit in",
          body: `${supplierName} har lämnat en offert på ${projectName}.`,
          totalLabel: "Total inkl. moms",
          waiting:
            remainingExpected > 0
              ? `Vi väntar fortfarande på ${remainingExpected} ${remainingExpected === 1 ? "offert till" : "offerter till"}. Du kan jämföra alla på en gång när de kommit in.`
              : "Alla offerter är inne — jämför dem nu.",
          cta: "Jämför offerter",
          refLabel: "Projekt-ID",
        }
      : {
          heading: "A quote has arrived",
          body: `${supplierName} has submitted a quote for ${projectName}.`,
          totalLabel: "Total incl. VAT",
          waiting:
            remainingExpected > 0
              ? `We're still waiting on ${remainingExpected} more ${remainingExpected === 1 ? "quote" : "quotes"}. You can compare them all together once they arrive.`
              : "All quotes are in — compare them now.",
          cta: "Compare quotes",
          refLabel: "Project ID",
        };

  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#fafaf8", padding: "32px 0" }}>
        <Container style={{ maxWidth: 520, background: "#ffffff", padding: 40, borderRadius: 12, border: "1px solid #e5e3dd" }}>
          <Heading style={{ fontFamily: "Fraunces, serif", fontSize: 26, color: "#0f1612", margin: 0 }}>
            {t.heading}
          </Heading>
          <Text style={{ color: "#3a423e", fontSize: 15, lineHeight: 1.55, marginTop: 20 }}>{t.body}</Text>

          <Section style={{ margin: "28px 0", padding: 20, borderRadius: 8, background: "#fafaf8", border: "1px solid #e5e3dd" }}>
            <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#7a8079", margin: 0 }}>
              {t.totalLabel}
            </Text>
            <Text style={{ fontFamily: "Fraunces, serif", fontSize: 32, color: "#b8421c", marginTop: 4 }}>
              {totalSek.toLocaleString(locale === "sv" ? "sv-SE" : "en-GB")} kr
            </Text>
          </Section>

          <Text style={{ color: "#3a423e", fontSize: 14, lineHeight: 1.6 }}>{t.waiting}</Text>

          <Section style={{ marginTop: 28 }}>
            <Button
              href={`${appUrl}/${locale}/projects/${projectId}/quotes`}
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
              {t.cta} →
            </Button>
          </Section>

          <Hr style={{ borderColor: "#e5e3dd", margin: "32px 0 16px" }} />
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7a8079", margin: 0 }}>
            {t.refLabel}: <strong style={{ color: "#0f1612" }}>{projectId.slice(0, 8)}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
