import { getTranslations } from "next-intl/server";
import { AiBuildForm } from "@/components/ai-build/AiBuildForm";

export default async function AiBuildPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const aiAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 32px" }}>
      <p style={{ color: "var(--color-terracotta)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {t("aiBuild.eyebrow")} <span style={{ background: "var(--color-ink)", color: "white", padding: "2px 6px", borderRadius: 3, fontSize: 9, marginLeft: 6 }}>{t("aiBuild.beta")}</span>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, lineHeight: 1.1, marginTop: 16 }}>{t("aiBuild.title")}</h1>
      <p style={{ marginTop: 16, color: "var(--color-ink-soft)", fontSize: 17, lineHeight: 1.5 }}>{t("aiBuild.subtitle")}</p>

      {!aiAvailable && (
        <div
          style={{
            marginTop: 32,
            padding: 20,
            border: "1px solid var(--color-gold, #b58a3a)",
            borderRadius: 6,
            background: "rgba(181, 138, 58, 0.08)",
            color: "var(--color-ink)",
            fontSize: 13,
          }}
        >
          {t("aiBuild.errors.notConfigured")}
        </div>
      )}

      <AiBuildForm locale={locale} disabled={!aiAvailable} />
    </div>
  );
}
