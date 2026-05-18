import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations();
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
      <p style={{ color: "var(--color-terracotta)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {t("common.tagline")}
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 64, lineHeight: 1.05, marginTop: 16, maxWidth: 720 }}>
        {t("landing.headline")}
      </h1>
      <p style={{ maxWidth: 540, marginTop: 24, color: "var(--color-ink-soft)", fontSize: 18, lineHeight: 1.5 }}>
        {t("landing.subhead")}
      </p>
      <Link
        href="/start"
        style={{
          display: "inline-block",
          marginTop: 32,
          padding: "16px 32px",
          background: "var(--color-terracotta)",
          color: "white",
          textTransform: "uppercase",
          fontSize: 12,
          letterSpacing: "0.1em",
          fontWeight: 600,
          borderRadius: 4,
        }}
      >
        {t("common.cta.start")} →
      </Link>

      <section style={{ marginTop: 96, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
        <Stat label={t("landing.stats.setupTime")} value="11 days → 2" />
        <Stat label={t("landing.stats.suppliers")} value="37 across Sverige" />
        <Stat label={t("landing.stats.reuseShare")} value="Up to 60%" />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-ink-mute)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 8 }}>{value}</p>
    </div>
  );
}
