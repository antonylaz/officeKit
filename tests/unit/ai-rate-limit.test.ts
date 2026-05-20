import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, _resetRateLimitStore } from "@/lib/ai-rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => _resetRateLimitStore());

  it("allows the first request", () => {
    const r = checkRateLimit("1.2.3.4");
    expect(r.allowed).toBe(true);
    expect(r.remaining.minute).toBe(9);
    expect(r.remaining.day).toBe(49);
  });

  it("allows up to 10 requests in a minute", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      const r = checkRateLimit("ip1", now + i);
      expect(r.allowed, `request ${i + 1}`).toBe(true);
    }
    const eleventh = checkRateLimit("ip1", now + 10);
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets the minute window after 60 seconds", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) checkRateLimit("ip2", t0 + i);
    const blocked = checkRateLimit("ip2", t0 + 1000);
    expect(blocked.allowed).toBe(false);

    const oneMinuteLater = checkRateLimit("ip2", t0 + 61_000);
    expect(oneMinuteLater.allowed).toBe(true);
  });

  it("enforces a 50/day cap across independent minutes", () => {
    const t0 = 2_000_000;
    // 50 requests spaced 70s apart, so each falls in its own minute bucket
    for (let i = 0; i < 50; i++) {
      const r = checkRateLimit("ip3", t0 + i * 70_000);
      expect(r.allowed, `daily request ${i + 1}`).toBe(true);
    }
    const fiftyFirst = checkRateLimit("ip3", t0 + 50 * 70_000);
    expect(fiftyFirst.allowed).toBe(false);
    expect(fiftyFirst.remaining.day).toBe(0);
  });

  it("scopes per-IP independently", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 10; i++) checkRateLimit("alice", t0 + i);
    const aliceBlocked = checkRateLimit("alice", t0 + 100);
    expect(aliceBlocked.allowed).toBe(false);

    const bob = checkRateLimit("bob", t0 + 100);
    expect(bob.allowed).toBe(true);
  });
});
