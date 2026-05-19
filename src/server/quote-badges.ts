export interface QuoteForBadges {
  id: string;
  totalAmount: number;
  usedLines: number;
  totalLines: number;
  submittedAt: Date;
}

export function pickBestValue(quotes: QuoteForBadges[]): string | null {
  if (quotes.length === 0) return null;
  const sorted = [...quotes].sort((a, b) => a.totalAmount - b.totalAmount || a.submittedAt.getTime() - b.submittedAt.getTime());
  return sorted[0]!.id;
}

export function pickSustainabilityLeader(quotes: QuoteForBadges[]): string | null {
  if (quotes.length === 0) return null;
  const withShare = quotes.map((q) => ({ q, share: q.totalLines === 0 ? 0 : q.usedLines / q.totalLines }));
  const max = Math.max(...withShare.map((x) => x.share));
  if (max === 0) return null;
  const top = withShare.filter((x) => x.share === max);
  top.sort((a, b) => b.q.usedLines - a.q.usedLines);
  return top[0]!.q.id;
}
