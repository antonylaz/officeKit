import { Body, Container, Heading, Html, Text, Section, Hr, Button } from "@react-email/components";

export function PasswordResetEmail({
  resetUrl,
  expiresInMinutes,
  locale,
}: {
  resetUrl: string;
  expiresInMinutes: number;
  locale: "sv" | "en";
}) {
  const t =
    locale === "sv"
      ? {
          heading: "Återställ ditt lösenord",
          body: "Vi fick en begäran att återställa lösenordet till ditt OfficeKit-konto. Klicka på knappen nedan inom",
          minutes: "minuter",
          cta: "Återställ lösenord",
          ignore:
            "Om du inte begärde detta kan du ignorera det här mejlet. Ditt lösenord ändras inte.",
          fallback: "Knappen fungerar inte? Kopiera den här länken:",
        }
      : {
          heading: "Reset your password",
          body: "We received a request to reset the password on your OfficeKit account. Click the button below within",
          minutes: "minutes",
          cta: "Reset password",
          ignore: "If you didn't request this, just ignore this email. Your password won't change.",
          fallback: "Button not working? Copy this link:",
        };

  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#fafaf8", padding: "32px 0" }}>
        <Container style={{ maxWidth: 520, background: "#ffffff", padding: 40, borderRadius: 12, border: "1px solid #e5e3dd" }}>
          <Heading style={{ fontFamily: "Fraunces, serif", fontSize: 26, color: "#0f1612", margin: 0 }}>
            {t.heading}
          </Heading>
          <Text style={{ color: "#3a423e", fontSize: 15, lineHeight: 1.55, marginTop: 20 }}>
            {t.body} {expiresInMinutes} {t.minutes}.
          </Text>
          <Section style={{ marginTop: 28 }}>
            <Button
              href={resetUrl}
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
          <Text style={{ color: "#7a8079", fontSize: 12, marginTop: 28 }}>{t.fallback}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0f1612", wordBreak: "break-all" }}>
            {resetUrl}
          </Text>
          <Hr style={{ borderColor: "#e5e3dd", margin: "32px 0 16px" }} />
          <Text style={{ color: "#7a8079", fontSize: 12 }}>{t.ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}
