import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export default async function AdminBuyersPage() {
  await requireAdmin();
  const buyers = await db.user.findMany({
    where: { role: "buyer" },
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Buyers</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{buyers.length} registered</p>
      <div style={{ marginTop: 32 }}>
        {buyers.map((b) => (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px", gap: 16, padding: 16, borderBottom: "1px solid var(--color-line)" }}>
            <div style={{ fontWeight: 600 }}>{b.name ?? "(no name)"}</div>
            <div style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{b.email}</div>
            <div style={{ fontSize: 12 }}>{b._count.projects} projects</div>
            <div style={{ fontSize: 12, color: "var(--color-ink-mute)" }}>{b.createdAt.toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
