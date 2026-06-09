import { Inbox, Package, ArrowRight, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { listMyProjects } from "@/server/my-projects";
import { OrderRow } from "@/components/buyer/OrderRow";
import { Link } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";

export default async function OrdersPage() {
  const { projects, context } = await listMyProjects();
  const locale = (await getLocale()) as "sv" | "en";
  const t = await getTranslations("buyer.orders");

  const projectIds = projects.map((p) => p.id);
  const orders = projectIds.length
    ? await db.order.findMany({
        where: { projectId: { in: projectIds } },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const ui =
    locale === "sv"
      ? {
          eyebrow: "Mina beställningar",
          guestHint:
            "Du surfar som gäst — beställningar sparas i den här webbläsaren. Logga in för att se dem på andra enheter.",
          ctaBuild: "Starta projekt",
          ctaAi: "Bygg med AI",
        }
      : {
          eyebrow: "My orders",
          guestHint:
            "You're browsing as a guest — orders are saved in this browser. Sign in to see them on other devices.",
          ctaBuild: "Start project",
          ctaAi: "Build with AI",
        };

  return (
    <div className="max-w-[1080px] mx-auto px-6 lg:px-8 pt-12 pb-24">
      <div className="mb-8">
        <p
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Package className="size-3.5" />
          {ui.eyebrow}
        </p>
        <h1
          className="mt-2 text-4xl md:text-5xl tracking-tight leading-[1.05]"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          {t("title")}
        </h1>
        {!context.userId && context.claimToken && (
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-mute)" }}>
            {ui.guestHint}
          </p>
        )}
      </div>

      {orders.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-line)" }}
        >
          <Inbox className="size-10" style={{ color: "var(--color-ink-mute)" }} />
          <div className="text-center max-w-sm">
            <p
              className="text-lg"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {t("emptyTitle")}
            </p>
            <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
              {t("emptyBody")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/start"
              className="inline-flex items-center gap-2 h-11 px-6 text-xs uppercase tracking-[0.12em] font-semibold rounded-md text-white shadow-sm hover:shadow-md transition-shadow"
              style={{ background: "var(--color-cta)" }}
            >
              {ui.ctaBuild}
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/ai-build"
              className="inline-flex items-center gap-2 h-11 px-5 text-xs uppercase tracking-[0.12em] font-semibold rounded-md border transition-colors hover:bg-accent/40"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              <Sparkles className="size-3.5" />
              {ui.ctaAi}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
