/**
 * Daily price-sync cron — pulls every configured affiliate feed and upserts
 * into VariantPrice. Runs nightly at 03:00 Europe/Stockholm via vercel.json.
 *
 * Authentication: Vercel signs cron requests with the Authorization header
 * `Bearer ${CRON_SECRET}`. We refuse unauthenticated calls in production.
 *
 * Feed configuration: a JSON array in the AFFILIATE_FEEDS env var, e.g.
 *   AFFILIATE_FEEDS='[
 *     {"feedSource":"tradedoubler_dustin","retailerId":"dustin","url":"https://..."},
 *     {"feedSource":"awin_komplett","retailerId":"komplett","url":"https://..."}
 *   ]'
 *
 * When AFFILIATE_FEEDS is empty (the dev default), the route falls back to
 * the local mock feed so we can test the cron pipeline without real accounts.
 */

import { NextResponse } from "next/server";
import { syncAffiliateFeed, type SyncOptions } from "@/server/affiliate-sync";

interface FeedConfig {
  feedSource: string;
  retailerId?: string;
  url: string;
}

export async function GET(req: Request) {
  // Guard: in prod, require the Vercel cron bearer token
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const feeds = parseFeedsConfig();
  const started = Date.now();
  const summary = {
    feeds: feeds.length,
    parsed: 0,
    upserted: 0,
    skipped: 0,
    errors: [] as string[],
    perFeed: [] as Array<{ feedSource: string; parsed: number; upserted: number; errors: number }>,
  };

  for (const f of feeds) {
    const opts: SyncOptions = {
      feedSource: f.feedSource,
      retailerId: f.retailerId,
      source: f.url.startsWith("http") ? { type: "url", url: f.url } : { type: "file", path: f.url },
    };
    const r = await syncAffiliateFeed(opts);
    summary.parsed += r.parsed;
    summary.upserted += r.upserted;
    summary.skipped += r.skipped;
    summary.errors.push(...r.errors.map((e) => `[${f.feedSource}] ${e}`));
    summary.perFeed.push({
      feedSource: f.feedSource,
      parsed: r.parsed,
      upserted: r.upserted,
      errors: r.errors.length,
    });
  }

  return NextResponse.json({
    ok: summary.errors.length === 0,
    durationMs: Date.now() - started,
    ...summary,
  });
}

function parseFeedsConfig(): FeedConfig[] {
  const raw = process.env.AFFILIATE_FEEDS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (f): f is FeedConfig =>
            typeof f === "object" && f !== null && "feedSource" in f && "url" in f,
        );
      }
    } catch {
      // fall through to dev default
    }
  }
  // Dev default — the mock feed is fast and offline-safe.
  return [
    {
      feedSource: "tradedoubler_dustin_mock",
      retailerId: "dustin",
      url: "prisma/mock-feeds/tradedoubler-dustin-sample.xml",
    },
  ];
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min budget for many feeds
