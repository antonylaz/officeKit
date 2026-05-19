import { describe, expect, it } from "vitest";
import { computeWinRate, computeAvgResponseMs } from "@/server/supplier-metrics";

describe("supplier metrics primitives", () => {
  it("computeWinRate returns 0 when denominator is 0", () => {
    expect(computeWinRate(0, 0)).toBe(0);
  });

  it("computeWinRate returns ratio between 0 and 1", () => {
    expect(computeWinRate(3, 7)).toBeCloseTo(0.3);
    expect(computeWinRate(7, 0)).toBe(1);
  });

  it("computeAvgResponseMs averages an array of millisecond differences", () => {
    expect(computeAvgResponseMs([])).toBe(0);
    expect(computeAvgResponseMs([1000, 2000, 3000])).toBe(2000);
  });
});
