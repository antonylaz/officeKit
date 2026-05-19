import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";
import type { Order, Supplier } from "@prisma/client";

const STATUS_COLOR: Record<string, string> = {
  confirmed: "var(--color-gold)",
  in_production: "var(--color-ink-soft)",
  shipped: "var(--color-forest)",
  delivered: "var(--color-green-leaf)",
  paid: "var(--color-green-leaf)",
  cancelled: "var(--color-terracotta)",
};

export function OrderRow({ order }: { order: Order & { supplier: Supplier } }) {
  return (
    <Link href={`/orders/${order.id}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 120px", gap: 16, padding: 20, borderBottom: "1px solid var(--color-line)", textDecoration: "none", color: "inherit", alignItems: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>{order.id.slice(0, 8)}</div>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600 }}>{order.supplier.name}</h4>
        <p style={{ margin: "4px 0 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
          Delivery: {order.deliveryWindowStart.toLocaleDateString()} – {order.deliveryWindowEnd.toLocaleDateString()}
        </p>
      </div>
      <div style={{ color: STATUS_COLOR[order.status], textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11, fontWeight: 600 }}>{order.status}</div>
      <div style={{ textAlign: "right", fontWeight: 600 }}>{formatSek(order.totalAmount)}</div>
    </Link>
  );
}
