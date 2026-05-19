import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";
import type { Order, Company } from "@prisma/client";

export function SupplierOrderRow({ order }: { order: Order & { company: Company } }) {
  return (
    <Link href={`/supplier/orders/${order.id}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 120px", gap: 16, padding: 20, borderBottom: "1px solid var(--color-line)", textDecoration: "none", color: "inherit", alignItems: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>{order.id.slice(0, 8)}</div>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600 }}>{order.company.name}</h4>
      </div>
      <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11, fontWeight: 600 }}>{order.status}</div>
      <div style={{ textAlign: "right", fontWeight: 600 }}>{formatSek(order.payoutAmount)}</div>
    </Link>
  );
}
