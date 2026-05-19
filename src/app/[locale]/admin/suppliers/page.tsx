import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Link } from "@/i18n/routing";

export default async function AdminSuppliersPage() {
  await requireAdmin();
  const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Suppliers</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{suppliers.length} total</p>
      <div style={{ marginTop: 32 }}>
        {suppliers.map((s) => (
          <Link key={s.id} href={`/admin/suppliers/${s.id}`} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", gap: 16, padding: 16, borderBottom: "1px solid var(--color-line)", textDecoration: "none", color: "inherit", alignItems: "center" }}>
            <div>
              <h4 style={{ margin: 0, fontWeight: 600 }}>{s.name}</h4>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-ink-mute)" }}>{s.orgNumber}</p>
            </div>
            <div style={{ fontSize: 12 }}>{s.coverageAreas.length} regions</div>
            <div style={{ fontSize: 12 }}>{Number(s.commissionRate) * 100}% commission</div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: s.active ? "var(--color-green-leaf)" : "var(--color-ink-mute)" }}>{s.active ? "Active" : "Paused"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
