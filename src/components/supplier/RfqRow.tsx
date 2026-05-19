"use client";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import type { Rfq, Project, Company, Quote, ProjectItem } from "@prisma/client";

type RfqWithProject = Rfq & {
  project: Project & { company: Company; items: ProjectItem[] };
  quote: Quote | null;
};

function timeRemaining(deadline: Date): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return "expired";
  const h = Math.floor(ms / 3600_000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${m}m`;
}

const STATUS_COLOR: Record<string, string> = {
  sent: "var(--color-gold)",
  viewed: "var(--color-ink-soft)",
  quoted: "var(--color-green-leaf)",
  won: "var(--color-green-leaf)",
  lost: "var(--color-terracotta)",
  expired: "var(--color-ink-mute)",
};

export function RfqRow({ rfq }: { rfq: RfqWithProject }) {
  const t = useTranslations("supplier.inbox");
  const itemCount = rfq.project.items.reduce((n, r) => n + r.quantity, 0);
  return (
    <Link href={`/supplier/rfqs/${rfq.id}`} style={{
      display: "grid",
      gridTemplateColumns: "1fr 120px 100px",
      gap: 16,
      padding: 20,
      borderTop: "1px solid var(--color-line)",
      textDecoration: "none",
      color: "inherit",
      alignItems: "center",
    }}>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600 }}>{rfq.project.company.name}</h4>
        <p style={{ margin: "4px 0 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
          {rfq.project.industry} · {rfq.project.city} · {rfq.project.headcount} ppl · {itemCount} items
          {" · "}
          <span style={{ color: STATUS_COLOR[rfq.status], textTransform: "uppercase", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em" }}>
            {rfq.status}
          </span>
        </p>
      </div>
      <div style={{ textAlign: "right", color: "var(--color-ink-mute)", fontSize: 12 }}>
        {t("closesIn")} {timeRemaining(rfq.deadlineAt)}
      </div>
      <div style={{ textAlign: "right", fontWeight: 600 }}>
        {rfq.quote ? formatSek(rfq.quote.totalAmount) : "—"}
      </div>
    </Link>
  );
}
