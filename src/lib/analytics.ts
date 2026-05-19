// Server-side analytics. No-op when NEXT_PUBLIC_POSTHOG_KEY is unset.
// Uses fetch directly to avoid pulling in posthog-node which has its own queue/flush logic.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";

export async function track(event: string, props: Record<string, unknown> & { distinctId: string }) {
  if (!KEY) return;
  const { distinctId, ...rest } = props;
  try {
    await fetch(`${HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: distinctId,
        properties: rest,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("analytics track failed:", (e as Error).message);
  }
}
