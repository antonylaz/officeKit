"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ExternalLink, Loader2 } from "lucide-react";
import { formatSek } from "@/lib/money";
import type { ProductVariant, ItemCatalog } from "@prisma/client";

interface Props {
  item: ItemCatalog;
  currentVariantId: string | null;
  onClose: () => void;
  onPick: (variant: ProductVariant | null) => void;
}

export function VariantPickerModal({ item, currentVariantId, onClose, onPick }: Props) {
  const t = useTranslations();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/catalog/items/${item.id}/variants`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setVariants(d.variants ?? []);
        setLoading(false);
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
    };
  }, [item.id, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("variantPicker.title")}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-5"
        style={{
          background: "rgba(26, 31, 26, 0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl"
        >
          <div className="flex justify-between items-start">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.12em] font-semibold"
                style={{ color: "var(--color-ink-mute)" }}
              >
                {t("variantPicker.title")}
              </p>
              <h2
                className="mt-1 text-3xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.name}
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {item.description}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="close"
              className="p-2 rounded-full hover:bg-accent/40 transition-colors"
            >
              <X className="size-5" style={{ color: "var(--color-ink-mute)" }} />
            </button>
          </div>

          {loading && (
            <div className="mt-12 flex flex-col items-center gap-3" style={{ color: "var(--color-ink-mute)" }}>
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Loading…</p>
            </div>
          )}

          {!loading && variants.length === 0 && (
            <p className="mt-12 text-center" style={{ color: "var(--color-ink-mute)" }}>
              {t("variantPicker.noVariants")}
            </p>
          )}

          {!loading && variants.length > 0 && (
            <div className="mt-7 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {variants.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <VariantCard variant={v} selected={currentVariantId === v.id} onPick={() => onPick(v)} />
                </motion.div>
              ))}
            </div>
          )}

          <button
            onClick={() => onPick(null)}
            className="mt-6 text-sm underline hover:no-underline transition-all"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {t("variantPicker.stayGeneric")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function VariantCard({
  variant,
  selected,
  onPick,
}: {
  variant: ProductVariant;
  selected: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("variantPicker");
  const specs = variant.specs as Record<string, string>;
  const specKeys = Object.keys(specs).slice(0, 3);
  const blocketUrl = variant.blocketSearchQuery
    ? `https://www.blocket.se/annonser/hela_sverige?q=${encodeURIComponent(variant.blocketSearchQuery)}`
    : null;
  const traderaUrl = variant.traderaSearchQuery
    ? `https://www.tradera.com/search?q=${encodeURIComponent(variant.traderaSearchQuery)}`
    : null;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl overflow-hidden flex flex-col h-full transition-all"
      style={{
        background: selected ? "var(--color-cream-2)" : "white",
        border: `2px solid ${selected ? "var(--color-terracotta)" : "var(--color-line)"}`,
        boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "var(--color-paper)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={variant.imageUrl}
          alt={`${variant.manufacturer} ${variant.name}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg";
          }}
        />
        {selected && (
          <div
            className="absolute top-3 right-3 size-7 rounded-full flex items-center justify-center shadow-md"
            style={{ background: "var(--color-terracotta)" }}
          >
            <Check className="size-4 text-white" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.08em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {variant.manufacturer}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-tight">{variant.name}</h3>
        </div>

        {specKeys.length > 0 && (
          <dl className="m-0 grid gap-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {specKeys.map((k) => (
              <div key={k} className="flex gap-1.5">
                <dt className="capitalize" style={{ color: "var(--color-ink-mute)" }}>
                  {k}:
                </dt>
                <dd className="m-0">{String(specs[k])}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto">
          <p
            className="text-2xl font-semibold m-0"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-terracotta)" }}
          >
            {formatSek(variant.priceNewOre)}
          </p>
          {variant.priceUsedDefaultOre !== null && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-mute)" }}>
              {t("usedFrom", { price: formatSek(variant.priceUsedDefaultOre) })}
            </p>
          )}
        </div>

        <button
          onClick={onPick}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors"
          style={{ background: selected ? "var(--color-green-leaf)" : "var(--color-terracotta)" }}
        >
          {selected ? (
            <>
              <Check className="size-3.5" />
              {t("picked")}
            </>
          ) : (
            t("pickThis")
          )}
        </button>

        {(blocketUrl || traderaUrl) && (
          <div className="flex gap-3 flex-wrap pt-1">
            {blocketUrl && (
              <a
                href={blocketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] underline hover:no-underline"
                style={{ color: "var(--color-green-leaf)" }}
              >
                {t("findUsedBlocket")}
                <ExternalLink className="size-3" />
              </a>
            )}
            {traderaUrl && (
              <a
                href={traderaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] underline hover:no-underline"
                style={{ color: "var(--color-green-leaf)" }}
              >
                {t("findUsedTradera")}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
