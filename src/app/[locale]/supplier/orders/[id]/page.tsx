import { notFound } from "next/navigation";
import { requireSupplier } from "@/lib/supplier-auth";
import { getSupplierOrder } from "@/server/supplier-orders";
import { OrderActions } from "@/components/supplier/OrderActions";
import { formatSek } from "@/lib/money";
import { isWithinCancelWindow } from "@/server/order-state";

export default async function SupplierOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplierId } = await requireSupplier();
  const order = await getSupplierOrder(id, supplierId);
  if (!order) notFound();

  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>{order.id}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginTop: 8 }}>{order.company.name}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
        Status: <strong>{order.status}</strong> · Payout: {formatSek(order.payoutAmount)}
      </p>
      <OrderActions
        orderId={order.id}
        status={order.status}
        canCancel={isWithinCancelWindow(order.createdAt) && !["delivered", "cancelled"].includes(order.status)}
      />
    </div>
  );
}
