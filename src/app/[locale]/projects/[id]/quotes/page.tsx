import { notFound } from "next/navigation";
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
    <div data-industry={project.industry} style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>{t("subtitle", { received: quotes.length, expected: 3 })}</p>

      {quotes.length === 0 && (
        <p style={{ marginTop: 48, color: "var(--color-ink-mute)" }}>{t("noQuotesYet")}</p>
      )}

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
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
    </div>
  );
}
