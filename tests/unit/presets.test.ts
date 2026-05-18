import { describe, expect, it } from "vitest";
import { computeQuantity, INDUSTRIES } from "@/lib/presets";

describe("presets", () => {
  it("multiplies preset ratio by headcount, rounding up", () => {
    expect(computeQuantity({ it: 1, finance: 0.5, sales: 0, law: 1 }, "it", 10)).toBe(10);
    expect(computeQuantity({ it: 1, finance: 0.5, sales: 0, law: 1 }, "finance", 10)).toBe(5);
    expect(computeQuantity({ it: 1, finance: 0.5, sales: 0, law: 1 }, "sales", 10)).toBe(0);
  });

  it("rounds up fractional results (a phone booth for 8 law staff)", () => {
    expect(computeQuantity({ law: 0.08 }, "law", 8)).toBe(1);
    expect(computeQuantity({ law: 0.08 }, "law", 13)).toBe(2);
  });

  it("returns 0 when the industry is not in the preset map", () => {
    expect(computeQuantity({ it: 1 }, "law", 10)).toBe(0);
  });

  it("exposes the 4 industries with metadata", () => {
    expect(INDUSTRIES).toHaveLength(4);
    expect(INDUSTRIES.map((i) => i.id).sort()).toEqual(["finance", "it", "law", "sales"]);
  });
});
