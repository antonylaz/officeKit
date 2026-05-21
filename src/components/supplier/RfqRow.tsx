"use client";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Clock, MapPin, Users, Package, ChevronRight } from "lucide-react";
import { formatSek } from "@/lib/money";
import type { Rfq, Project, Company, Quote, ProjectItem } from "@prisma/client";

type RfqWithProject = Rfq & {
  project: Project & { company: Company; items: ProjectItem[] };
  quote: Quote | null;
};

function timeRemaining(deadline: Date): { text: string; urgent: boolean; expired: boolean } {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return { text: "expired", urgent: false, expired: true };
  const h = Math.floor(ms / 3600_000);
  const d = Math.floor(h / 24);
  const urgent = h < 24;
  if (d >= 1) return { text: `${d}d ${h % 24}h`, urgent, expired: false };
  const m = Math.floor((ms % 3600_000) / 60_000);
  return { text: `${h}h ${m}m`, urgent, expired: false };
}

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  sent: { bg: "rgba(212, 160, 86, 0.15)", fg: "var(--color-gold)" },
  viewed: { bg: "rgba(74, 84, 74, 0.1)", fg: "var(--color-ink-soft)" },
  quoted: { bg: "rgba(107, 142, 90, 0.15)", fg: "var(--color-green-leaf)" },
  won: { bg: "rgba(107, 142, 90, 0.2)", fg: "var(--color-green-leaf)" },
  lost: { bg: "rgba(197, 85, 45, 0.12)", fg: "var(--color-terracotta)" },
  expired: { bg: "rgba(138, 143, 134, 0.15)", fg: "var(--color-ink-mute)" },
};

export function RfqRow({ rfq }: { rfq: RfqWithProject }) {
  const t = useTranslations("supplier.inbox");
  const itemCount = rfq.project.items.reduce((n, r) => n + r.quantity, 0);
  const time = timeRemaining(rfq.deadlineAt);
  const status = STATUS_STYLES[rfq.status] ?? STATUS_STYLES.viewed!;

  return (
    <Link
      href={`/supplier/rfqs/${rfq.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl border bg-white transition-all hover:shadow-md hover:border-foreground/20"
      style={{ borderColor: "var(--color-line)", textDecoration: "none", color: "inherit" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-[15px]">{rfq.project.company.name}</h4>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold"
            style={{ background: status.bg, color: status.fg }}
          >
            {rfq.status}
          </span>
        </div>
        <div
          className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {rfq.project.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {rfq.project.headcount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="size-3" />
            {itemCount} {t("itemsShort")}
          </span>
          <span>{rfq.project.industry}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div
          className="inline-flex items-center gap-1 text-[12px]"
          style={{
            color: time.expired
              ? "var(--color-ink-mute)"
              : time.urgent
                ? "var(--color-terracotta)"
                : "var(--color-ink-soft)",
            fontWeight: time.urgent ? 600 : 400,
          }}
        >
          <Clock className="size-3" />
          {time.expired ? t("expiredLabel") : <>{t("closesIn")} {time.text}</>}
        </div>
      </div>

      <div className="text-right font-semibold w-28 tabular-nums shrink-0">
        {rfq.quote ? formatSek(rfq.quote.totalAmount) : "—"}
      </div>

      <ChevronRight
        className="size-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-ink-mute)" }}
      />
    </Link>
  );
}
