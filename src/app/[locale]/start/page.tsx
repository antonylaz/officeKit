import { getTranslations } from "next-intl/server";
import { INDUSTRIES } from "@/lib/presets";
import { IndustryCard } from "@/components/industry/IndustryCard";

export default async function StartPage() {
  const t = await getTranslations("industry");
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1.1, maxWidth: 720 }}>{t("title")}</h1>
      <p style={{ maxWidth: 600, marginTop: 24, color: "var(--color-ink-soft)", fontSize: 17 }}>{t("subhead")}</p>
      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {INDUSTRIES.map((i, idx) => (
          <IndustryCard key={i.id} industry={i} index={idx} />
        ))}
      </div>
    </div>
  );
}
