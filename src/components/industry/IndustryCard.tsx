import { Link } from "@/i18n/routing";
import type { IndustryMeta } from "@/lib/presets";
import { useTranslations } from "next-intl";

export function IndustryCard({ industry, index }: { industry: IndustryMeta; index: number }) {
  const t = useTranslations("industry");
  return (
    <Link
      href={{ pathname: "/projects/new", query: { industry: industry.id } }}
      data-industry={industry.id}
      style={{
        display: "block",
        background: "var(--color-paper)",
        border: "1px solid var(--color-line)",
        borderRadius: 4,
        padding: 32,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <p style={{ color: "var(--color-ink-mute)", fontSize: 12, fontStyle: "italic" }}>— Vertical 0{index + 1}</p>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 16, color: "var(--ok-accent)" }}>{industry.label}</h3>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 12, fontSize: 14 }}>{industry.tagline}</p>
      <hr style={{ border: 0, borderTop: "1px dashed var(--color-line)", margin: "20px 0" }} />
      <dl style={{ display: "grid", gap: 8, fontSize: 13 }}>
        <Row k={t("avgSpend")} v={`${industry.avgSpendPerSeatSek.toLocaleString("sv-SE")} kr`} />
        {industry.complianceFlags && <Row k="Compliance flags" v={industry.complianceFlags.join(", ")} />}
        <Row k={t("reuseShare")} v={industry.reuseShareLabel} />
        <Row k={t("setupTime")} v={industry.setupTimeLabel} />
      </dl>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt>
      <dd style={{ fontWeight: 600 }}>{v}</dd>
    </div>
  );
}
