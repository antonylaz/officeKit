import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { searchTradera, isTraderaEnabled, _resetTraderaCache } from "@/server/tradera";

describe("tradera search", () => {
  const originalFetch = globalThis.fetch;
  const originalAppId = process.env.TRADERA_APP_ID;

  beforeEach(() => {
    _resetTraderaCache();
    process.env.TRADERA_APP_ID = "test-app-id";
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAppId === undefined) delete process.env.TRADERA_APP_ID;
    else process.env.TRADERA_APP_ID = originalAppId;
  });

  it("returns null when TRADERA_APP_ID is not set", async () => {
    delete process.env.TRADERA_APP_ID;
    expect(isTraderaEnabled()).toBe(false);
    expect(await searchTradera("Aeron", 3)).toBeNull();
  });

  it("parses a valid response and normalizes shape", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalNumberOfItems: 142,
        items: [
          {
            id: 90210,
            title: "Herman Miller Aeron Size B",
            buyItNowPrice: 4500,
            currentBid: 3200,
            bidCount: 4,
            thumbnailUrl: "https://img.tradera.com/abc.jpg",
            itemUrl: "https://www.tradera.com/item/90210",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await searchTradera("Aeron", 3);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(142);
    expect(result!.items).toHaveLength(1);
    // buyItNowPrice wins over currentBid
    expect(result!.items[0].priceSek).toBe(4500);
    expect(result!.items[0].id).toBe("90210");
    expect(result!.items[0].url).toBe("https://www.tradera.com/item/90210");
  });

  it("degrades to empty result on unrecognized payload (no throw)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: "garbage" }),
    }) as unknown as typeof fetch;
    const result = await searchTradera("Aeron", 3);
    // Schema treats missing items/total as a defensible empty payload; the UI
    // simply renders nothing instead of erroring.
    expect(result).toEqual({ total: 0, items: [] });
  });

  it("returns null when fetch itself throws", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    expect(await searchTradera("Aeron", 3)).toBeNull();
  });

  it("returns null on non-200 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    expect(await searchTradera("Aeron", 3)).toBeNull();
  });

  it("caches results within 30-minute TTL", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totalNumberOfItems: 1, items: [] }),
    });
    globalThis.fetch = mock as unknown as typeof fetch;
    await searchTradera("kontorsstol", 3);
    await searchTradera("kontorsstol", 3);
    await searchTradera("kontorsstol", 3);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
