import { NextResponse } from "next/server";
import { searchTradera, isTraderaEnabled } from "@/server/tradera";

export async function GET(req: Request) {
  if (!isTraderaEnabled()) {
    return NextResponse.json({ enabled: false, total: 0, items: [] });
  }
  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ enabled: true, total: 0, items: [] });
  }
  const limit = Math.min(5, Math.max(1, Number(url.searchParams.get("limit") ?? 3)));
  const result = await searchTradera(query, limit);
  if (!result) {
    return NextResponse.json({ enabled: true, total: 0, items: [] });
  }
  return NextResponse.json({ enabled: true, ...result });
}
