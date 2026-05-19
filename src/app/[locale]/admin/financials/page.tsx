import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { formatSek } from "@/lib/money";

export default async function AdminFinancialsPage() {
  await requireAdmin();
  const now = new Date();
  const year = now.getFullYear();

  // Revenue (commission) by month for the current year
  const yearStart = new Date(year, 0, 1);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: yearStart }, status: { not: "cancelled" } },
    select: { commissionAmount: true, createdAt: true },
  });
  const byMonth = new Array(12).fill(0);
  for (const o of orders) {
    const m = o.createdAt.getMonth();
    byMonth[m] += o.commissionAmount;
  }

  // Payout queue: orders delivered without transfer
  const pendingPayouts = await db.order.findMany({
    where: { status: "delivered", stripeTransferId: null },
    include: { supplier: true },
    take: 50,
  });

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Financials</h1>
      <a href="/api/v1/admin/financials/export" download
        style={{ display: "inline-block", marginTop: 16, background: "transparent", color: "var(--color-ink)", padding: "10px 20px", border: "1px solid var(--color-line)", borderRadius: 4, textDecoration: "none", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>
        Export CSV
      </a>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 48 }}>Revenue (commission) by month — {year}</h2>
      <table style={{ marginTop: 16, borderCollapse: "collapse", width: 480 }}>
        <thead>
          <tr><th style={th}>Month</th><th style={th}>Commission</th></tr>
        </thead>
        <tbody>
          {byMonth.map((amount, i) => (
            <tr key={i}>
              <td style={td}>{new Date(year, i, 1).toLocaleString("default", { month: "long" })}</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatSek(amount)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...td, fontWeight: 600 }}>Total YTD</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{formatSek(byMonth.reduce((a, b) => a + b, 0))}</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 48 }}>Pending payouts</h2>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{pendingPayouts.length} orders delivered but not yet transferred</p>
      <div style={{ marginTop: 16 }}>
        {pendingPayouts.map((o) => (
          <div key={o.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px", gap: 16, padding: 12, borderBottom: "1px solid var(--color-line)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-mute)" }}>{o.id.slice(0, 8)}</div>
            <div style={{ fontSize: 13 }}>{o.supplier.name}</div>
            <div style={{ textAlign: "right", fontWeight: 600 }}>{formatSek(o.payoutAmount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink-mute)", borderBottom: "1px solid var(--color-line)" };
const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid var(--color-line)", fontSize: 13 };
