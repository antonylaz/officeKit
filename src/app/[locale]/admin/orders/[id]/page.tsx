import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { formatSek } from "@/lib/money";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { company: true, supplier: true, project: true, quote: { include: { lines: { include: { item: true } } } } },
  });
  if (!order) notFound();
  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>{order.id}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, marginTop: 8 }}>{order.company.name}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 4 }}>Supplier: {order.supplier.name}</p>
      <p style={{ color: "var(--color-ink-soft)" }}>Status: <strong>{order.status}</strong> · Total: {formatSek(order.totalAmount)} · Commission: {formatSek(order.commissionAmount)} · Payout: {formatSek(order.payoutAmount)}</p>
      <AdminOrderActions orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
