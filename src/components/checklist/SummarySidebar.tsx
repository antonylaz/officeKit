"use client";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import type { ProjectSummary } from "@/server/project-summary";

export function SummarySidebar({ summary, city }: { summary: ProjectSummary; city: string }) {
  const t = useTranslations("checklist.summary");
  return (
    <aside style={{
      position: "sticky", top: 96,
      background: "white",
      border: "1px solid var(--color-line)",
      borderRadius: "var(--radius-card-lg)",
      padding: 32,
      boxShadow: "var(--shadow)",
    }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)", fontWeight: 600 }}>{t("cityPrefix")}</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 8, letterSpacing: "-0.02em" }}>{city}, SE</h2>
      <dl style={{ marginTop: 28, display: "grid", gap: 12, fontSize: 14, margin: "28px 0 0" }}>
        <Row k={t("itemsSelected")} v={String(summary.itemsSelected)} />
        <Row k={t("newUnits")} v={String(summary.newUnits)} />
        <Row k={t("usedUnits")} v={String(summary.usedUnits)} />
        <Row k={t("estVat")} v={formatSek(summary.vatOre)} />
      </dl>
      <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "24px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500 }}>{t("total")}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--color-terracotta)", fontWeight: 600, letterSpacing: "-0.02em" }}>{formatSek(summary.totalOre)}</span>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-line)", paddingBottom: 10 }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt>
      <dd style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{v}</dd>
    </div>
  );
}
