/**
 * Sync affiliate feeds into ProductVariant.
 *
 * Default mode: syncs the local mock feed at prisma/mock-feeds/tradedoubler-dustin-sample.xml
 *
 * Production mode (set both vars):
 *   AFFILIATE_FEED_URL=https://...   AFFILIATE_FEED_SOURCE=tradedoubler_dustin \
 *     pnpm tsx scripts/sync-affiliate-feeds.ts
 */

import { syncAffiliateFeed, type SyncOptions } from "@/server/affiliate-sync";

async function main() {
  const url = process.env.AFFILIATE_FEED_URL;
  const source = process.env.AFFILIATE_FEED_SOURCE;
  const opts: SyncOptions =
    url && source
      ? { feedSource: source, source: { type: "url", url } }
      : {
          feedSource: "tradedoubler_dustin_mock",
          source: { type: "file", path: "prisma/mock-feeds/tradedoubler-dustin-sample.xml" },
        };

  console.log(`\nSyncing affiliate feed: ${opts.feedSource}`);
  console.log(`  source: ${opts.source.type === "url" ? opts.source.url : opts.source.path}\n`);

  const result = await syncAffiliateFeed(opts);
  console.log(`  parsed:   ${result.parsed}`);
  console.log(`  upserted: ${result.upserted}`);
  console.log(`  skipped:  ${result.skipped} (no officekitItemId or unknown catalog id)`);
  if (result.errors.length > 0) {
    console.log(`\n  errors:`);
    for (const e of result.errors.slice(0, 10)) console.log(`    - ${e}`);
    if (result.errors.length > 10) console.log(`    ... and ${result.errors.length - 10} more`);
  }
  console.log();
  process.exit(result.errors.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
