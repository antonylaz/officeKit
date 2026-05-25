import { Calendar, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";
import type { Order, Supplier } from "@prisma/client";

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: "rgba(212, 160, 86, 0.15)", fg: "var(--color-gold)" },
  in_production: { bg: "rgba(74, 84, 74, 0.1)", fg: "var(--color-ink-soft)" },
  shipped: { bg: "rgba(31, 58, 46, 0.1)", fg: "var(--color-forest)" },
  delivered: { bg: "rgba(107, 142, 90, 0.15)", fg: "var(--color-green-leaf)" },
  paid: { bg: "rgba(107, 142, 90, 0.2)", fg: "var(--color-green-leaf)" },
  cancelled: { bg: "rgba(197, 85, 45, 0.12)", fg: "var(--color-terracotta)" },
};

export function OrderRow({ order }: { order: Order & { supplier: Supplier } }) {
  const status = STATUS_STYLES[order.status] ?? STATUS_STYLES.confirmed!;
  return (
    <Link
      href={`/orders/${order.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl border bg-white transition-all hover:shadow-md hover:border-foreground/20"
      style={{ borderColor: "var(--color-line)", textDecoration: "none", color: "inherit" }}
    >
      <div
        className="w-20 shrink-0 text-[11px] tabular-nums"
        style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink-mute)" }}
      >
        #{order.id.slice(0, 8)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-[15px]">{order.supplier.name}</h4>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold"
            style={{ background: status.bg, color: status.fg }}
          >
            {order.status}
          </span>
        </div>
        <div
          className="mt-1.5 inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Calendar className="size-3" />
          {order.deliveryWindowStart.toLocaleDateString()} – {order.deliveryWindowEnd.toLocaleDateString()}
        </div>
      </div>

      <div className="text-right font-semibold tabular-nums shrink-0">
        {formatSek(order.totalAmount)}
      </div>

      <ChevronRight
        className="size-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-ink-mute)" }}
      />
    </Link>
  );
}
