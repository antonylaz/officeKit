// In-memory rate limiter for the AI office builder.
// Process-local; on multi-instance deploy, swap for Upstash. For v1 (single Vercel function), this is fine.
//
// Limits per IP: 10 requests/minute AND 50 requests/day.

interface IpState {
  minuteBucket: number[]; // ms timestamps in the last 60s
  dayCount: number;
  dayResetAt: number;      // ms timestamp when dayCount resets (rolling 24h window)
}

const PER_MINUTE = 10;
const PER_DAY = 50;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const store = new Map<string, IpState>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
  remaining: { minute: number; day: number };
}

export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const state = store.get(ip) ?? { minuteBucket: [], dayCount: 0, dayResetAt: now + DAY_MS };

  // Reset day window if elapsed
  if (now >= state.dayResetAt) {
    state.dayCount = 0;
    state.dayResetAt = now + DAY_MS;
  }

  // Prune minute bucket
  state.minuteBucket = state.minuteBucket.filter((t) => now - t < MINUTE_MS);

  if (state.minuteBucket.length >= PER_MINUTE) {
    const oldest = state.minuteBucket[0]!;
    const retryAfterSec = Math.ceil((oldest + MINUTE_MS - now) / 1000);
    store.set(ip, state);
    return { allowed: false, retryAfterSec, remaining: { minute: 0, day: Math.max(0, PER_DAY - state.dayCount) } };
  }

  if (state.dayCount >= PER_DAY) {
    const retryAfterSec = Math.ceil((state.dayResetAt - now) / 1000);
    store.set(ip, state);
    return { allowed: false, retryAfterSec, remaining: { minute: PER_MINUTE - state.minuteBucket.length, day: 0 } };
  }

  state.minuteBucket.push(now);
  state.dayCount += 1;
  store.set(ip, state);

  return {
    allowed: true,
    remaining: { minute: PER_MINUTE - state.minuteBucket.length, day: PER_DAY - state.dayCount },
  };
}

export function _resetRateLimitStore(): void {
  store.clear();
}
