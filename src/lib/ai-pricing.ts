// Per-million-token pricing in öre (1 SEK = 100 öre).
// Source: Anthropic pricing page (see shared/live-sources.md → Models). Update on price changes.
// USD→SEK at ~10.5 (rough; for ledger we don't need 0.01% accuracy).
const SEK_PER_USD = 10.5;

interface ModelPricing {
  input: number;       // USD per Mtok
  output: number;
  cacheWrite: number;  // 1.25× input (5m) — we use 2× for 1h TTL
  cacheRead: number;   // 0.1× input
}

const PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": { input: 5.0, output: 25.0, cacheWrite: 10.0, cacheRead: 0.5 },
  "claude-opus-4-6": { input: 5.0, output: 25.0, cacheWrite: 10.0, cacheRead: 0.5 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheWrite: 6.0, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0, cacheWrite: 2.0, cacheRead: 0.1 },
};

export function computeAiCostOre(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
): number {
  const p = PRICING[model] ?? PRICING["claude-opus-4-7"]!;
  const usd =
    (inputTokens * p.input + outputTokens * p.output + cacheReadTokens * p.cacheRead + cacheWriteTokens * p.cacheWrite) / 1_000_000;
  const sek = usd * SEK_PER_USD;
  return Math.round(sek * 100);
}
