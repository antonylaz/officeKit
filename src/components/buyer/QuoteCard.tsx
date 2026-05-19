import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";
import type { Rfq, Supplier, Quote, QuoteLine } from "@prisma/client";

type RfqWithQuote = Rfq & {
  supplier: Supplier;
  quote: (Quote & { lines: QuoteLine[] }) | null;
};

export async function QuoteCard({
  rfq, projectId, isBestValue, isSustainabilityLeader,
}: {
  rfq: RfqWithQuote;
  projectId: string;
  isBestValue: boolean;
  isSustainabilityLeader: boolean;
}) {
  const t = await getTranslations("buyer.quotes");
  if (!rfq.quote) return null;
  return (
    <article style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minHeight: 24 }}>
        {isBestValue && <span style={{ padding: "4px 10px", background: "var(--color-gold)", color: "white", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: 100 }}>{t("badges.bestValue")}</span>}
        {isSustainabilityLeader && <span style={{ padding: "4px 10px", background: "var(--color-green-leaf)", color: "white", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: 100 }}>{t("badges.sustainability")}</span>}
      </div>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: 0 }}>{rfq.supplier.name}</h3>
      <p style={{ color: "var(--color-ink-mute)", fontSize: 13, margin: 0 }}>{rfq.supplier.coverageAreas.join(", ")}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 36, margin: 0, color: "var(--color-terracotta)" }}>{formatSek(rfq.quote.totalAmount)}</p>
      <p style={{ color: "var(--color-ink-soft)", fontSize: 13, margin: 0 }}>{t("inclVat")}</p>
      {rfq.quote.perks.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4, fontSize: 13 }}>
          {rfq.quote.perks.map((p) => <li key={p} style={{ color: "var(--color-ink-soft)" }}>✓ {p}</li>)}
        </ul>
      )}
      {rfq.quote.notes && <p style={{ color: "var(--color-ink-soft)", fontSize: 13, fontStyle: "italic" }}>&quot;{rfq.quote.notes}&quot;</p>}
      <Link href={`/projects/${projectId}/quotes/${rfq.quote.id}/confirm`}
        style={{ marginTop: "auto", display: "block", textAlign: "center", padding: "14px 24px", background: "var(--ok-accent)", color: "white", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 600, borderRadius: 4, textDecoration: "none" }}>
        {t("choose", { name: rfq.supplier.name })}
      </Link>
    </article>
  );
}
