import { describe, expect, it } from "vitest";
import { computeFunnelRates, type FunnelCounts } from "@/server/admin-metrics";

describe("admin metrics primitives", () => {
  it("computeFunnelRates returns 0 when sent count is 0", () => {
    const f: FunnelCounts = { rfqsSent: 0, quotesReceived: 0, ordersPlaced: 0 };
    const rates = computeFunnelRates(f);
    expect(rates.quoteRate).toBe(0);
    expect(rates.orderRate).toBe(0);
  });

  it("computeFunnelRates returns quoteRate = quotes/sent", () => {
    const rates = computeFunnelRates({ rfqsSent: 100, quotesReceived: 60, ordersPlaced: 0 });
    expect(rates.quoteRate).toBeCloseTo(0.6);
  });

  it("computeFunnelRates returns orderRate = orders/quotes (when quotes > 0)", () => {
    const rates = computeFunnelRates({ rfqsSent: 100, quotesReceived: 60, ordersPlaced: 30 });
    expect(rates.orderRate).toBeCloseTo(0.5);
  });

  it("computeFunnelRates orderRate is 0 when quotes is 0", () => {
    const rates = computeFunnelRates({ rfqsSent: 100, quotesReceived: 0, ordersPlaced: 0 });
    expect(rates.orderRate).toBe(0);
  });
});
