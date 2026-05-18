import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

class MemoryStore {
  private hits = new Map<string, number[]>();
  async limit(key: string) {
    const now = Date.now();
    const windowMs = 60_000;
    const hits = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    hits.push(now);
    this.hits.set(key, hits);
    return { success: hits.length <= 10, remaining: Math.max(0, 10 - hits.length) };
  }
}

export const magicLinkLimiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.fixedWindow(10, "60 s"),
        analytics: false,
      })
    : new MemoryStore();
