import { describe, expect, it } from "vitest";
import { canTransitionStatus, isWithinCancelWindow, CANCEL_WINDOW_MS } from "@/server/order-state";

describe("order state machine", () => {
  it("allows confirmed → in_production", () => {
    expect(canTransitionStatus("confirmed", "in_production")).toBe(true);
  });

  it("allows in_production → shipped", () => {
    expect(canTransitionStatus("in_production", "shipped")).toBe(true);
  });

  it("allows shipped → delivered", () => {
    expect(canTransitionStatus("shipped", "delivered")).toBe(true);
  });

  it("rejects backwards transitions", () => {
    expect(canTransitionStatus("shipped", "in_production")).toBe(false);
    expect(canTransitionStatus("delivered", "shipped")).toBe(false);
  });

  it("rejects skipping a step", () => {
    expect(canTransitionStatus("confirmed", "shipped")).toBe(false);
  });

  it("rejects transitions from terminal states", () => {
    expect(canTransitionStatus("delivered", "in_production")).toBe(false);
    expect(canTransitionStatus("cancelled", "in_production")).toBe(false);
  });

  it("isWithinCancelWindow true when createdAt is recent", () => {
    expect(isWithinCancelWindow(new Date())).toBe(true);
    expect(isWithinCancelWindow(new Date(Date.now() - 1000))).toBe(true);
  });

  it("isWithinCancelWindow false after 48 hours", () => {
    expect(isWithinCancelWindow(new Date(Date.now() - CANCEL_WINDOW_MS - 1000))).toBe(false);
  });
});
