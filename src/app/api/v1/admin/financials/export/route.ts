import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  await requireAdmin();
  const orders = await db.order.findMany({
    include: { company: true, supplier: true },
    orderBy: { createdAt: "desc" },
  });
  const header = "order_id,created_at,company_name,supplier_name,status,total_sek,commission_sek,payout_sek,payment_method,stripe_payment_intent,stripe_transfer";
  const rows = orders.map((o) => [
    o.id,
    o.createdAt.toISOString(),
    csvEscape(o.company.name),
    csvEscape(o.supplier.name),
    o.status,
    (o.totalAmount / 100).toFixed(2),
    (o.commissionAmount / 100).toFixed(2),
    (o.payoutAmount / 100).toFixed(2),
    o.paymentMethod,
    csvEscape(o.stripePaymentIntentId),
    csvEscape(o.stripeTransferId),
  ].join(","));
  const csv = [header, ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="officekit-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
