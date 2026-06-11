"use client";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { formatSek } from "@/lib/money";
import type { ProjectSummary } from "@/server/project-summary";
import type { ItemCatalog, ProjectItem, ProductVariant } from "@prisma/client";

type Line = ProjectItem & { item: ItemCatalog; variant: ProductVariant | null };

export function SummarySidebar({
  summary,
  city,
  lines = [],
}: {
  summary: ProjectSummary;
  city: string;
  lines?: Line[];
}) {
  const t = useTranslations("checklist.summary");
  const picked = lines.filter((l) => l.quantity > 0);
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

      {picked.length > 0 && (
        <>
          <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "24px 0 16px" }} />
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)", fontWeight: 600, marginBottom: 12 }}>
            Selected products · {picked.length}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {picked.map((line) => (
              <PickedLine key={line.id} line={line} />
            ))}
          </ul>
        </>
      )}

      <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "24px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500 }}>{t("total")}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--color-terracotta)", fontWeight: 600, letterSpacing: "-0.02em" }}>{formatSek(summary.totalOre)}</span>
      </div>
    </aside>
  );
}

function PickedLine({ line }: { line: Line }) {
  const v = line.variant;
  const unitOre = v
    ? line.mode === "new"
      ? v.priceNewOre
      : v.priceUsedDefaultOre ?? v.priceNewOre
    : line.mode === "new"
      ? line.item.priceNewDefault
      : line.item.priceUsedDefault ?? line.item.priceNewDefault;

  // Pick the "best" outbound link given current mode + what data we have.
  // New mode prefers the affiliate-tagged retailer URL > manufacturer URL.
  // Used mode prefers Tradera deep search > Blocket deep search.
  const link = (() => {
    if (!v) return null;
    if (line.mode === "new") {
      if (v.affiliateUrl) return { href: v.affiliateUrl, label: retailerLabel(v.feedSource) ?? "Retailer" };
      if (v.manufacturerUrl) return { href: v.manufacturerUrl, label: v.manufacturer };
      return null;
    }
    if (v.traderaSearchQuery) {
      return {
        href: `https://www.tradera.com/search?q=${encodeURIComponent(v.traderaSearchQuery)}`,
        label: "Tradera",
      };
    }
    if (v.blocketSearchQuery) {
      return {
        href: `https://www.blocket.se/annonser/hela_sverige?q=${encodeURIComponent(v.blocketSearchQuery)}`,
        label: "Blocket",
      };
    }
    return null;
  })();

  return (
    <li
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid var(--color-line)",
        background: "var(--color-paper)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 4,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--color-ink)",
          }}
        >
          {v ? v.name : line.item.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-ink-mute)", marginTop: 2 }}>
          {line.quantity} × {formatSek(unitOre)} · {line.mode}
        </div>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              marginTop: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: line.mode === "new" ? "var(--color-terracotta)" : "var(--color-forest)",
              textDecoration: "none",
            }}
          >
            {line.mode === "new" ? "Buy at" : "Find on"} {link.label}
            <ExternalLink style={{ width: 10, height: 10 }} />
          </a>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: "var(--color-ink)",
          whiteSpace: "nowrap",
        }}
      >
        {formatSek(unitOre * line.quantity)}
      </div>
    </li>
  );
}

function retailerLabel(feedSource: string | null): string | null {
  if (!feedSource) return null;
  const slug = feedSource.split("_")[1] ?? feedSource;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-line)", paddingBottom: 10 }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt>
      <dd style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{v}</dd>
    </div>
  );
}
