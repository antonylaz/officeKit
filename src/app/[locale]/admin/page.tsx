import { requireAdmin } from "@/lib/admin-auth";
import { getAdminMetrics, computeFunnelRates } from "@/server/admin-metrics";
import { KpiCard } from "@/components/supplier/KpiCard";
import { formatSek } from "@/lib/money";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const m = await getAdminMetrics();
  const rates = computeFunnelRates(m.funnel);

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Platform overview</h1>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard label="GMV (this month)" value={formatSek(m.gmvThisMonthOre)} />
        <KpiCard label="GMV (YTD)" value={formatSek(m.gmvYtdOre)} />
        <KpiCard label="Active suppliers" value={String(m.activeSuppliers)} />
        <KpiCard label="Open RFQs" value={String(m.openRfqs)} />
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 48 }}>Conversion funnel (YTD)</h2>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <FunnelStep label="RFQs sent" value={m.funnel.rfqsSent} subtext="100%" />
        <FunnelStep label="Quotes received" value={m.funnel.quotesReceived} subtext={`${Math.round(rates.quoteRate * 100)}% of RFQs`} />
        <FunnelStep label="Orders placed" value={m.funnel.ordersPlaced} subtext={`${Math.round(rates.orderRate * 100)}% of quotes`} />
      </div>
    </div>
  );
}

function FunnelStep({ label, value, subtext }: { label: string; value: number; subtext: string }) {
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 36, marginTop: 8 }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--color-ink-mute)", marginTop: 4 }}>{subtext}</p>
    </div>
  );
}
