"use client";
import type { ItemCatalog, ProjectItem, ProductVariant } from "@prisma/client";
import { formatSek } from "@/lib/money";
import { motion } from "framer-motion";
import { Plus, Minus, ChevronRight, ExternalLink } from "lucide-react";

type LineWithVariant = ProjectItem & { item: ItemCatalog; variant?: ProductVariant | null };

export function ItemRow({
  item,
  line,
  onQuantity,
  onOpen,
}: {
  item: ItemCatalog;
  line: LineWithVariant | undefined;
  onQuantity: (q: number) => void;
  onOpen: () => void;
}) {
  const qty = line?.quantity ?? 0;
  const mode = line?.mode ?? "new";
  const variant = line?.variant ?? null;
  const unitOre = variant
    ? mode === "new"
      ? variant.priceNewOre
      : variant.priceUsedDefaultOre ?? variant.priceNewOre
    : mode === "new"
      ? item.priceNewDefault
      : item.priceUsedDefault ?? item.priceNewDefault;

  const isActive = qty > 0;

  return (
    <motion.div
      layout
      transition={{ duration: 0.15 }}
      onClick={onOpen}
      className="group flex items-center gap-4 p-4 mb-2 bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md hover:border-foreground/20"
      style={{
        borderColor: isActive ? "var(--color-ink)" : "var(--color-line)",
      }}
    >
      <div
        className="size-14 shrink-0 rounded-lg flex items-center justify-center text-2xl overflow-hidden"
        style={{ background: variant ? "var(--color-paper)" : "var(--color-cream)" }}
        aria-hidden
      >
        {variant ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={variant.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg";
            }}
          />
        ) : (
          <span>{item.icon}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h4 className="m-0 font-semibold text-[15px] leading-tight truncate">{item.name}</h4>
          {variant && (
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
              style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)" }}
            >
              {variant.manufacturer} {variant.sku ?? ""}
            </span>
          )}
        </div>
        <p
          className="mt-0.5 text-[12.5px] leading-snug truncate"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {item.description}
        </p>
        {variant && qty > 0 && <RowOutboundLink variant={variant} mode={mode} />}
      </div>

      <div className="text-right shrink-0">
        <div className="font-medium text-[14px] tabular-nums">{formatSek(unitOre)}</div>
        <div className="text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
          {mode === "new" ? "new" : "used"} · per ea
        </div>
      </div>

      <div
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Stepper value={qty} onChange={onQuantity} />
      </div>

      <ChevronRight
        className="size-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-ink-mute)" }}
      />
    </motion.div>
  );
}

function RowOutboundLink({ variant, mode }: { variant: ProductVariant; mode: "new" | "used" }) {
  const link = (() => {
    if (mode === "new") {
      if (variant.affiliateUrl) {
        const slug = variant.feedSource?.split("_")[1] ?? null;
        return {
          href: variant.affiliateUrl,
          label: `Buy at ${slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "retailer"}`,
        };
      }
      if (variant.manufacturerUrl) return { href: variant.manufacturerUrl, label: `Buy at ${variant.manufacturer}` };
      return null;
    }
    if (variant.traderaSearchQuery) {
      return {
        href: `https://www.tradera.com/search?q=${encodeURIComponent(variant.traderaSearchQuery)}`,
        label: "Find on Tradera",
      };
    }
    if (variant.blocketSearchQuery) {
      return {
        href: `https://www.blocket.se/annonser/hela_sverige?q=${encodeURIComponent(variant.blocketSearchQuery)}`,
        label: "Find on Blocket",
      };
    }
    return null;
  })();
  if (!link) return null;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      className="mt-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] font-semibold hover:underline"
      style={{ color: mode === "new" ? "var(--color-terracotta)" : "var(--color-forest)" }}
    >
      {link.label}
      <ExternalLink className="size-2.5" />
    </a>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  if (value === 0) {
    return (
      <button
        onClick={() => onChange(1)}
        className="size-9 inline-flex items-center justify-center rounded-full border transition-colors"
        style={{
          borderColor: "var(--color-line)",
          background: "transparent",
          color: "var(--color-ink-soft)",
        }}
        aria-label="add"
      >
        <Plus className="size-4" />
      </button>
    );
  }
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border px-1"
      style={{ borderColor: "var(--color-ink)", background: "white" }}
    >
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="decrease"
        className="size-7 inline-flex items-center justify-center rounded-full hover:bg-accent/40 transition-colors"
      >
        <Minus className="size-3.5" style={{ color: "var(--color-ink-soft)" }} />
      </button>
      <span className="min-w-6 text-center font-semibold tabular-nums text-[14px]">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label="increase"
        className="size-7 inline-flex items-center justify-center rounded-full hover:bg-accent/40 transition-colors"
      >
        <Plus className="size-3.5" style={{ color: "var(--color-ink-soft)" }} />
      </button>
    </div>
  );
}
