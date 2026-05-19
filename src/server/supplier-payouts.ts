import { db } from "@/lib/db";

export interface PayoutRow {
  orderId: string;
  gross: number;        // öre
  commission: number;
  net: number;
  status: "pending" | "processing" | "paid";
  date: Date;
  transferId: string | null;
}

export async function listPayouts(supplierId: string): Promise<PayoutRow[]> {
  const orders = await db.order.findMany({
    where: { supplierId, status: { in: ["delivered", "paid", "in_production", "shipped", "confirmed"] } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => {
    let status: "pending" | "processing" | "paid";
    if (o.status === "paid") status = "paid";
    else if (o.stripeTransferId) status = "processing";
    else status = "pending";
    return {
      orderId: o.id,
      gross: o.totalAmount,
      commission: o.commissionAmount,
      net: o.payoutAmount,
      status,
      date: o.createdAt,
      transferId: o.stripeTransferId,
    };
  });
}
