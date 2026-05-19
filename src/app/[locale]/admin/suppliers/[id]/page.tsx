import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { SupplierEditForm } from "@/components/admin/SupplierEditForm";

export default async function AdminSupplierEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supplier = await db.supplier.findUnique({ where: { id }, include: { rfqs: { include: { project: true }, take: 10, orderBy: { sentAt: "desc" } } } });
  if (!supplier) notFound();
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{supplier.name}</h1>
      <SupplierEditForm
        id={supplier.id}
        name={supplier.name}
        commissionRate={Number(supplier.commissionRate)}
        active={supplier.active}
      />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginTop: 48 }}>Recent RFQs</h2>
      <div style={{ marginTop: 16 }}>
        {supplier.rfqs.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px", gap: 16, padding: 12, borderBottom: "1px solid var(--color-line)" }}>
            <div style={{ fontSize: 13 }}>{r.project.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-ink-mute)" }}>{r.sentAt.toLocaleDateString()}</div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
