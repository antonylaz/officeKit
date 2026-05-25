import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { getAuthorizedProject } from "@/server/projects";
import { listQuotesForProject } from "@/server/quotes-listing";
import { QuoteCard } from "@/components/buyer/QuoteCard";
import { getTranslations } from "next-intl/server";

export default async function QuoteComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const { quotes, bestValueQuoteId, sustainabilityLeaderQuoteId } = await listQuotesForProject(id);
  const t = await getTranslations("buyer.quotes");

  return (
    <div data-industry={project.industry} className="max-w-[1280px] mx-auto px-8 py-12">
      <div className="mb-12">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
          {project.city} · {project.name}
        </p>
        <h1
          className="mt-2 text-5xl tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          {t("title")}
        </h1>
        <p className="mt-3 text-base" style={{ color: "var(--color-ink-soft)" }}>
          {t("subtitle", { received: quotes.length, expected: 3 })}
        </p>
      </div>

      {quotes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-mute)" }}
        >
          <Inbox className="size-10 mb-4" />
          <p className="text-base">{t("noQuotesYet")}</p>
        </div>
      ) : (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {quotes.map((rfq) => (
            <QuoteCard
              key={rfq.id}
              rfq={rfq}
              projectId={id}
              isBestValue={rfq.quote?.id === bestValueQuoteId}
              isSustainabilityLeader={rfq.quote?.id === sustainabilityLeaderQuoteId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
