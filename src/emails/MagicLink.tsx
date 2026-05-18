import { Body, Container, Heading, Html, Link, Preview, Text } from "@react-email/components";

export function MagicLinkEmail({ url, locale }: { url: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { preview: "Logga in på OfficeKit", heading: "Logga in på OfficeKit", body: "Klicka på länken för att logga in. Länken är giltig i 24 timmar.", cta: "Logga in" }
    : { preview: "Sign in to OfficeKit", heading: "Sign in to OfficeKit", body: "Click the link to sign in. The link is valid for 24 hours.", cta: "Sign in" };
  return (
    <Html lang={locale}>
      <Preview>{t.preview}</Preview>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif", color: "#1a1f1a" }}>{t.heading}</Heading>
          <Text style={{ color: "#4a544a" }}>{t.body}</Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 16, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
