import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { getDashboardMetrics } from "@/server/supplier-metrics";

export async function GET() {
  const { supplierId } = await requireSupplier();
  const metrics = await getDashboardMetrics(supplierId);
  return NextResponse.json({ metrics });
}
