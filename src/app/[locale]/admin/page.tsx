import { TrendingUp, Wallet, Users, Inbox, Send, FileText, ShoppingCart, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminMetrics, computeFunnelRates } from "@/server/admin-metrics";
import { getAiUsageMetrics } from "@/server/ai-metrics";
import { KpiCard } from "@/components/supplier/KpiCard";
import { formatSek } from "@/lib/money";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [m, ai] = await Promise.all([getAdminMetrics(), getAiUsageMetrics()]);
  const rates = computeFunnelRates(m.funnel);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
          Admin overview
        </p>
        <h1
          className="mt-2 text-4xl tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Platform overview
        </h1>
      </div>

      <section>
        <SectionHeader>Marketplace KPIs</SectionHeader>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="GMV (this month)"
            value={formatSek(m.gmvThisMonthOre)}
            icon={Wallet}
            accent="primary"
          />
          <KpiCard label="GMV (YTD)" value={formatSek(m.gmvYtdOre)} icon={TrendingUp} accent="success" />
          <KpiCard label="Active suppliers" value={String(m.activeSuppliers)} icon={Users} />
          <KpiCard label="Open RFQs" value={String(m.openRfqs)} icon={Inbox} accent="warning" />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader>Conversion funnel (YTD)</SectionHeader>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FunnelStep
            icon={Send}
            label="RFQs sent"
            value={m.funnel.rfqsSent}
            subtext="100%"
            accent="muted"
          />
          <FunnelStep
            icon={FileText}
            label="Quotes received"
            value={m.funnel.quotesReceived}
            subtext={`${Math.round(rates.quoteRate * 100)}% of RFQs`}
            accent="warning"
          />
          <FunnelStep
            icon={ShoppingCart}
            label="Orders placed"
            value={m.funnel.ordersPlaced}
            subtext={`${Math.round(rates.orderRate * 100)}% of quotes`}
            accent="success"
          />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader>AI office builder</SectionHeader>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Builds (today)" value={String(ai.buildsToday)} icon={Sparkles} accent="primary" />
          <KpiCard label="Builds (7 days)" value={String(ai.buildsWeek)} icon={Sparkles} />
          <KpiCard label="Avg cost / build" value={formatSek(ai.avgCostOreToday)} icon={Wallet} />
          <KpiCard
            label="Avg latency"
            value={`${(ai.avgLatencyMsToday / 1000).toFixed(1)}s`}
            icon={Clock}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiCard label="Total AI cost (30d)" value={formatSek(ai.totalCostOreMonth)} icon={Wallet} />
          <KpiCard
            label="Rejection rate (30d)"
            value={`${ai.rejectionRatePct}%`}
            icon={AlertTriangle}
            accent={ai.rejectionRatePct > 10 ? "warning" : "muted"}
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-lg tracking-tight"
      style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
    >
      {children}
    </h2>
  );
}

function FunnelStep({
  label,
  value,
  subtext,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  subtext: string;
  icon: typeof Send;
  accent: "muted" | "warning" | "success";
}) {
  const accentColor =
    accent === "success"
      ? "var(--color-green-leaf)"
      : accent === "warning"
        ? "var(--color-gold)"
        : "var(--color-ink-mute)";
  return (
    <div
      className="rounded-2xl border p-6 transition-shadow hover:shadow-sm"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" style={{ color: accentColor }} />
        <p
          className="text-[11px] uppercase tracking-[0.12em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {label}
        </p>
      </div>
      <p
        className="mt-3 text-4xl tracking-tight tabular-nums"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-mute)" }}>
        {subtext}
      </p>
    </div>
  );
}
