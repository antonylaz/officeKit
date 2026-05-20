import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
} catch {}

import { VARIANTS } from "../prisma/variants-data";

const OUT_DIR = resolve(process.cwd(), "public/variants");
const FALLBACK_URL = "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=85&auto=format";
const FORCE = process.argv.includes("--force");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function downloadOne(variantId: string, url: string): Promise<{ ok: boolean; bytes: number; usedFallback: boolean }> {
  const localPath = resolve(OUT_DIR, `${variantId}.jpg`);
  if (existsSync(localPath) && !FORCE) {
    return { ok: true, bytes: 0, usedFallback: false };
  }

  async function fetchUrl(u: string): Promise<Buffer | null> {
    try {
      const res = await fetch(u, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 OfficeKitImageBot/1.0",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        redirect: "follow",
      });
      if (!res.ok) return null;
      const arr = new Uint8Array(await res.arrayBuffer());
      if (arr.byteLength < 1000) return null; // Probably an error page, not a real image
      return Buffer.from(arr);
    } catch {
      return null;
    }
  }

  let buf = await fetchUrl(url);
  let usedFallback = false;
  if (!buf) {
    buf = await fetchUrl(FALLBACK_URL);
    usedFallback = true;
  }
  if (!buf) return { ok: false, bytes: 0, usedFallback };

  writeFileSync(localPath, buf);
  return { ok: true, bytes: buf.byteLength, usedFallback };
}

async function main() {
  console.log(`Downloading ${VARIANTS.length} variant images to ${OUT_DIR}...`);
  let okCount = 0, fallbackCount = 0, failCount = 0;
  for (const v of VARIANTS) {
    const url = (v as { sourceUrl?: string }).sourceUrl;
    if (!url) {
      console.warn(`  - ${v.id}: no sourceUrl, skipping`);
      failCount++;
      continue;
    }
    const result = await downloadOne(v.id, url);
    if (!result.ok) {
      console.warn(`  x ${v.id}: failed`);
      failCount++;
    } else if (result.usedFallback) {
      console.log(`  ~ ${v.id}: used fallback (${result.bytes} bytes)`);
      fallbackCount++;
    } else if (result.bytes === 0) {
      console.log(`  = ${v.id}: already exists, skipped`);
      okCount++;
    } else {
      console.log(`  + ${v.id}: ${result.bytes} bytes`);
      okCount++;
    }
    // Be polite — small delay between requests
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`\nDone. ok=${okCount}, fallback=${fallbackCount}, failed=${failCount}`);
}

main();
