import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { listInbox } from "@/server/supplier-rfq";
import type { RfqStatus } from "@prisma/client";

export async function GET(req: Request) {
  const { supplierId } = await requireSupplier();
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const valid: Array<RfqStatus | "all"> = ["all", "sent", "viewed", "quoted", "won", "lost", "expired"];
  const status = (statusParam && (valid as string[]).includes(statusParam) ? statusParam : "all") as RfqStatus | "all";
  const { rfqs, total } = await listInbox(supplierId, { status, limit, offset });
  return NextResponse.json({ rfqs, total });
}
