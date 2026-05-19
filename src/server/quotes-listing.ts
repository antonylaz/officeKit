import { db } from "@/lib/db";
import { pickBestValue, pickSustainabilityLeader, type QuoteForBadges } from "./quote-badges";

export async function listQuotesForProject(projectId: string) {
  const rfqs = await db.rfq.findMany({
    where: { projectId, quote: { is: { submittedAt: { not: null } } } },
    include: {
      supplier: true,
      quote: { include: { lines: true } },
    },
    orderBy: { quotedAt: "asc" },
  });

  const submitted = rfqs.filter((r) => r.quote && r.quote.submittedAt);

  const forBadges: QuoteForBadges[] = submitted.map((r) => ({
    id: r.quote!.id,
    totalAmount: r.quote!.totalAmount,
    usedLines: r.quote!.lines.filter((l) => l.mode === "used").length,
    totalLines: r.quote!.lines.length,
    submittedAt: r.quote!.submittedAt!,
  }));

  return {
    quotes: submitted,
    bestValueQuoteId: pickBestValue(forBadges),
    sustainabilityLeaderQuoteId: pickSustainabilityLeader(forBadges),
  };
}
