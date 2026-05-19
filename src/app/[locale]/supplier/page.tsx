import { requireSupplier } from "@/lib/supplier-auth";
import { getDashboardMetrics } from "@/server/supplier-metrics";
import { listInbox } from "@/server/supplier-rfq";
import { KpiCard } from "@/components/supplier/KpiCard";
import { StockMix } from "@/components/supplier/StockMix";
import { WinRate } from "@/components/supplier/WinRate";
import { RfqInbox } from "@/components/supplier/RfqInbox";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";

export default async function SupplierDashboardPage() {
  const { supplierId } = await requireSupplier();
  const metrics = await getDashboardMetrics(supplierId);
  const { rfqs } = await listInbox(supplierId, { limit: 5 });
  const t = await getTranslations("supplier.dashboard");
  const hours = Math.floor(metrics.avgResponseTimeMs / 3600_000);
  const mins = Math.floor((metrics.avgResponseTimeMs % 3600_000) / 60_000);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          <KpiCard label={t("kpi.openRfqs")} value={String(metrics.openRfqs)} />
          <KpiCard label={t("kpi.winRate")} value={`${Math.round(metrics.winRate30d.rate * 100)}%`} delta={`${metrics.winRate30d.won}/${metrics.winRate30d.won + metrics.winRate30d.lost} decided`} />
          <KpiCard label={t("kpi.pipeline")} value={formatSek(metrics.pipelineValueOre)} />
          <KpiCard label={t("kpi.avgResponse")} value={metrics.avgResponseTimeMs === 0 ? "—" : `${hours}h ${mins}m`} />
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 48 }}>{t("incoming")}</h2>
        <RfqInbox rfqs={rfqs} activeStatus="all" />
      </div>
      <div style={{ display: "grid", gap: 24 }}>
        <StockMix data={metrics.stockMix} />
        <WinRate data={metrics.winVsCompetitor} />
      </div>
    </div>
  );
}
