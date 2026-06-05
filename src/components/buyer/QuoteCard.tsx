import { MapPin, Trophy, Leaf, Check, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";
import type { Rfq, Supplier, Quote, QuoteLine } from "@prisma/client";

type RfqWithQuote = Rfq & {
  supplier: Supplier;
  quote: (Quote & { lines: QuoteLine[] }) | null;
};

export async function QuoteCard({
  rfq,
  projectId,
  isBestValue,
  isSustainabilityLeader,
}: {
  rfq: RfqWithQuote;
  projectId: string;
  isBestValue: boolean;
  isSustainabilityLeader: boolean;
}) {
  const t = await getTranslations("buyer.quotes");
  if (!rfq.quote) return null;

  const hasBadge = isBestValue || isSustainabilityLeader;

  return (
    <article
      className="relative flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        background: "var(--color-paper)",
        borderColor: hasBadge ? "var(--color-terracotta)" : "var(--color-line)",
        boxShadow: hasBadge ? "0 0 0 1px var(--color-terracotta) inset" : undefined,
      }}
    >
      {/* Badges (always reserve space) */}
      <div className="flex gap-2 flex-wrap min-h-6">
        {isBestValue && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold text-white"
            style={{ background: "var(--color-gold)" }}
          >
            <Trophy className="size-3" />
            {t("badges.bestValue")}
          </span>
        )}
        {isSustainabilityLeader && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold text-white"
            style={{ background: "var(--color-green-leaf)" }}
          >
            <Leaf className="size-3" />
            {t("badges.sustainability")}
          </span>
        )}
      </div>

      {/* Supplier */}
      <div>
        <h3 className="text-2xl tracking-tight m-0" style={{ fontFamily: "var(--font-display)" }}>
          {rfq.supplier.name}
        </h3>
        <p
          className="mt-1 inline-flex items-center gap-1 text-[13px]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <MapPin className="size-3" />
          {rfq.supplier.coverageAreas.join(", ")}
        </p>
      </div>

      {/* Price */}
      <div>
        <p
          className="text-4xl tracking-tight tabular-nums m-0"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-terracotta)" }}
        >
          {formatSek(rfq.quote.totalAmount)}
        </p>
        <p
          className="mt-1 text-[12px] uppercase tracking-[0.1em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {t("inclVat")}
        </p>
      </div>

      {/* Perks */}
      {rfq.quote.perks.length > 0 && (
        <ul className="m-0 p-0 space-y-1.5 list-none text-[13px]">
          {rfq.quote.perks.map((p) => (
            <li
              key={p}
              className="flex items-start gap-2"
              style={{ color: "var(--color-ink-soft)" }}
            >
              <Check className="size-3.5 mt-0.5 shrink-0" style={{ color: "var(--color-green-leaf)" }} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Note */}
      {rfq.quote.notes && (
        <p
          className="text-[13px] italic border-l-2 pl-3"
          style={{ color: "var(--color-ink-soft)", borderColor: "var(--color-line)" }}
        >
          &quot;{rfq.quote.notes}&quot;
        </p>
      )}

      {/* CTA — sticks to bottom */}
      <Link
        href={`/projects/${projectId}/quotes/${rfq.quote.id}/confirm`}
        className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-shadow"
        style={{ background: "var(--color-cta)", textDecoration: "none" }}
      >
        {t("choose", { name: rfq.supplier.name })}
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}
