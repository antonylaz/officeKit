import { describe, expect, it } from "vitest";
import { computeAiCostOre } from "@/lib/ai-pricing";

describe("computeAiCostOre", () => {
  it("computes Opus 4.7 cost for a representative cached request", () => {
    // 5000 cache-read + 50 user input + 1500 output, no cache write
    const cost = computeAiCostOre("claude-opus-4-7", 50, 1500, 5000, 0);
    // Math: ((50*5 + 1500*25 + 5000*0.5 + 0*10) / 1M) USD × 10.5 SEK × 100 öre
    // = (250 + 37500 + 2500) / 1M × 10.5 × 100
    // = 0.04025 × 10.5 × 100 ≈ 42 öre
    expect(cost).toBeGreaterThanOrEqual(40);
    expect(cost).toBeLessThanOrEqual(45);
  });

  it("first-request cost (with cache write) is higher than cached cost", () => {
    const firstCost = computeAiCostOre("claude-opus-4-7", 50, 1500, 0, 5000);
    const cachedCost = computeAiCostOre("claude-opus-4-7", 50, 1500, 5000, 0);
    expect(firstCost).toBeGreaterThan(cachedCost);
  });

  it("Sonnet 4.6 is cheaper than Opus 4.7 for the same tokens", () => {
    const opus = computeAiCostOre("claude-opus-4-7", 100, 1000, 5000, 0);
    const sonnet = computeAiCostOre("claude-sonnet-4-6", 100, 1000, 5000, 0);
    expect(sonnet).toBeLessThan(opus);
  });

  it("falls back to Opus 4.7 pricing for unknown model", () => {
    const known = computeAiCostOre("claude-opus-4-7", 100, 1000, 0, 0);
    const unknown = computeAiCostOre("some-future-model", 100, 1000, 0, 0);
    expect(unknown).toBe(known);
  });

  it("zero usage returns zero cost", () => {
    expect(computeAiCostOre("claude-opus-4-7", 0, 0, 0, 0)).toBe(0);
  });
});
