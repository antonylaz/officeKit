"use client";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import type { ProjectSummary } from "@/server/project-summary";

export function SummarySidebar({ summary, city }: { summary: ProjectSummary; city: string }) {
  const t = useTranslations("checklist.summary");
  return (
    <aside style={{ border: "1px solid var(--color-line)", borderRadius: 4, padding: 32, background: "var(--color-paper)" }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>{t("cityPrefix")}</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 8 }}>{city}, SE</h2>
      <dl style={{ marginTop: 24, display: "grid", gap: 12, fontSize: 14 }}>
        <Row k={t("itemsSelected")} v={String(summary.itemsSelected)} />
        <Row k={t("newUnits")} v={String(summary.newUnits)} />
        <Row k={t("usedUnits")} v={String(summary.usedUnits)} />
        <Row k={t("estVat")} v={formatSek(summary.vatOre)} />
      </dl>
      <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "20px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{t("total")}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-terracotta)" }}>{formatSek(summary.totalOre)}</span>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-line)", paddingBottom: 8 }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
