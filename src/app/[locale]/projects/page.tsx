import { FolderOpen, MapPin, Users, Package, Inbox, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { listMyProjects } from "@/server/my-projects";
import { Link } from "@/i18n/routing";
import { getLocale } from "next-intl/server";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: { sv: string; en: string } }> = {
  draft: {
    bg: "rgba(58, 66, 62, 0.1)",
    fg: "var(--color-ink-soft)",
    label: { sv: "Utkast", en: "Draft" },
  },
  requesting_quotes: {
    bg: "rgba(184, 134, 44, 0.15)",
    fg: "var(--color-gold)",
    label: { sv: "Begär offerter", en: "Requesting quotes" },
  },
  quotes_received: {
    bg: "rgba(74, 107, 82, 0.15)",
    fg: "var(--color-green-leaf)",
    label: { sv: "Offerter mottagna", en: "Quotes received" },
  },
  ordered: {
    bg: "rgba(74, 107, 82, 0.2)",
    fg: "var(--color-green-leaf)",
    label: { sv: "Beställd", en: "Ordered" },
  },
  closed: {
    bg: "rgba(138, 128, 121, 0.15)",
    fg: "var(--color-ink-mute)",
    label: { sv: "Avslutad", en: "Closed" },
  },
};

export default async function MyProjectsPage() {
  const { projects, context } = await listMyProjects();
  const locale = (await getLocale()) as "sv" | "en";

  const ui = locale === "sv"
    ? {
        eyebrow: "Mina projekt",
        title: "Era kontorsprojekt",
        emptyTitle: "Inga projekt än",
        emptyBody: "Skapa ditt första projekt — bygg manuellt eller låt AI börja åt dig.",
        ctaBuild: "Starta projekt",
        ctaAi: "Bygg med AI",
        items: "artiklar",
        rfqs: "offertförfrågningar",
        orders: "beställningar",
        notSigned: "Du surfar som gäst — projekt sparas i den här webbläsaren. Logga in för att se dem på andra enheter.",
      }
    : {
        eyebrow: "My projects",
        title: "Your office projects",
        emptyTitle: "No projects yet",
        emptyBody: "Start your first project — build manually or let AI get you started.",
        ctaBuild: "Start project",
        ctaAi: "Build with AI",
        items: "items",
        rfqs: "RFQs",
        orders: "orders",
        notSigned: "You're browsing as a guest — projects are saved in this browser. Sign in to see them on other devices.",
      };

  return (
    <div className="max-w-[1080px] mx-auto px-6 lg:px-8 pt-12 pb-24">
      <div className="mb-8">
        <p
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <FolderOpen className="size-3.5" />
          {ui.eyebrow}
        </p>
        <h1
          className="mt-2 text-4xl md:text-5xl tracking-tight leading-[1.05]"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          {ui.title}
        </h1>
        {!context.userId && context.claimToken && (
          <p
            className="mt-3 text-[13px] inline-flex items-start gap-1.5"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {ui.notSigned}
          </p>
        )}
      </div>

      {projects.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-line)" }}
        >
          <Inbox className="size-10" style={{ color: "var(--color-ink-mute)" }} />
          <div className="text-center">
            <p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
              {ui.emptyTitle}
            </p>
            <p className="mt-2 text-[14px] max-w-sm" style={{ color: "var(--color-ink-soft)" }}>
              {ui.emptyBody}
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
        <div className="space-y-3">
          {projects.map((p) => {
            const status = STATUS_STYLES[p.status] ?? STATUS_STYLES.draft!;
            // Next-step heuristic: if no items, send to /start (claim flow); else checklist
            const href = p._count.items > 0 ? `/projects/${p.id}/checklist` : `/projects/${p.id}/checklist`;
            return (
              <Link
                key={p.id}
                href={href}
                className="group flex items-center gap-4 p-5 rounded-xl border bg-white transition-all hover:shadow-md hover:border-foreground/20"
                style={{ borderColor: "var(--color-line)", textDecoration: "none", color: "inherit" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="text-[17px] font-semibold leading-tight"
                      style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
                    >
                      {p.name}
                    </h3>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold"
                      style={{ background: status.bg, color: status.fg }}
                    >
                      {status.label[locale]}
                    </span>
                  </div>
                  <div
                    className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]"
                    style={{ color: "var(--color-ink-mute)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {p.city}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {p.headcount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package className="size-3" />
                      {p._count.items} {ui.items}
                    </span>
                    {p._count.rfqs > 0 && (
                      <span>
                        · {p._count.rfqs} {ui.rfqs}
                      </span>
                    )}
                    {p._count.orders > 0 && (
                      <span style={{ color: "var(--color-green-leaf)", fontWeight: 600 }}>
                        · {p._count.orders} {ui.orders}
                      </span>
                    )}
                    <span className="ml-auto">
                      {p.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--color-ink-mute)" }}
                />
              </Link>
            );
          })}

          <div className="mt-8 flex gap-3 flex-wrap pt-4 border-t" style={{ borderColor: "var(--color-line)" }}>
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
      )}
    </div>
  );
}
