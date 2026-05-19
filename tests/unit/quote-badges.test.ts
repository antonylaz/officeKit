import { describe, expect, it } from "vitest";
import { pickBestValue, pickSustainabilityLeader, type QuoteForBadges } from "@/server/quote-badges";

const q = (id: string, totalAmount: number, usedLines: number, totalLines: number, submittedAt = new Date()): QuoteForBadges => ({
  id, totalAmount, usedLines, totalLines, submittedAt,
});

describe("quote badges", () => {
  it("pickBestValue returns cheapest quote id", () => {
    expect(pickBestValue([q("a", 1000, 0, 1), q("b", 500, 0, 1), q("c", 800, 0, 1)])).toBe("b");
  });

  it("pickBestValue tie broken by earliest submittedAt", () => {
    const t1 = new Date("2026-05-19T10:00:00Z");
    const t2 = new Date("2026-05-19T11:00:00Z");
    expect(pickBestValue([
      { id: "a", totalAmount: 500, usedLines: 0, totalLines: 1, submittedAt: t2 },
      { id: "b", totalAmount: 500, usedLines: 0, totalLines: 1, submittedAt: t1 },
    ])).toBe("b");
  });

  it("pickBestValue returns null on empty input", () => {
    expect(pickBestValue([])).toBe(null);
  });

  it("pickSustainabilityLeader returns highest used-share quote", () => {
    expect(pickSustainabilityLeader([
      q("a", 1000, 1, 4),
      q("b", 1000, 3, 4),
      q("c", 1000, 2, 4),
    ])).toBe("b");
  });

  it("pickSustainabilityLeader returns null when all quotes are 0%", () => {
    expect(pickSustainabilityLeader([q("a", 1000, 0, 4), q("b", 1000, 0, 4)])).toBe(null);
  });

  it("pickSustainabilityLeader tie broken by absolute used count", () => {
    expect(pickSustainabilityLeader([
      { id: "a", totalAmount: 1000, usedLines: 2, totalLines: 4, submittedAt: new Date() },
      { id: "b", totalAmount: 1000, usedLines: 4, totalLines: 8, submittedAt: new Date() },
    ])).toBe("b");
  });
});
