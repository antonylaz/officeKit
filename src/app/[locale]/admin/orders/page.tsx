import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const where = sp.status ? { status: sp.status as never } : undefined;
  const orders = await db.order.findMany({ where, include: { company: true, supplier: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Orders</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{orders.length} most recent</p>
      <div style={{ marginTop: 32 }}>
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px 120px", gap: 16, padding: 16, borderBottom: "1px solid var(--color-line)", textDecoration: "none", color: "inherit", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-mute)" }}>{o.id.slice(0, 8)}</div>
            <div style={{ fontSize: 14 }}>{o.company.name}</div>
            <div style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{o.supplier.name}</div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{o.status}</div>
            <div style={{ textAlign: "right", fontWeight: 600 }}>{formatSek(o.totalAmount)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
