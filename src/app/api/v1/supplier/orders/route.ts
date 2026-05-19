import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { listSupplierOrders } from "@/server/supplier-orders";

export async function GET() {
  const { supplierId } = await requireSupplier();
  const orders = await listSupplierOrders(supplierId);
  return NextResponse.json({ orders });
}
