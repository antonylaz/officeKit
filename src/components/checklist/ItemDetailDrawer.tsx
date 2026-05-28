"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Check, Plus, Minus, ExternalLink, Loader2 } from "lucide-react";
import { formatSek } from "@/lib/money";
import type { ItemCatalog, ProductVariant } from "@prisma/client";

export interface DrawerState {
  variantId: string | null;
  mode: "new" | "used";
  quantity: number;
}

interface Props {
  item: ItemCatalog | null;
  state: DrawerState;
  onClose: () => void;
  onUpdate: (patch: Partial<DrawerState>) => void;
}

export function ItemDetailDrawer({ item, state, onClose, onUpdate }: Props) {
  const t = useTranslations();
  // Keyed by itemId so we don't have to setState synchronously to clear
  const [variantsByItemId, setVariantsByItemId] = useState<Record<string, ProductVariant[]>>({});
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const variants = item ? variantsByItemId[item.id] ?? [] : [];
  const loading = item != null && loadingItemId === item.id && !variantsByItemId[item.id];

  useEffect(() => {
    if (!item || variantsByItemId[item.id]) return;
    let cancelled = false;
    const id = item.id;
    // Marking which item we're loading so spinner shows immediately while the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingItemId(id);
    fetch(`/api/v1/catalog/items/${id}/variants`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setVariantsByItemId((prev) => ({ ...prev, [id]: d.variants ?? [] }));
        setLoadingItemId((cur) => (cur === id ? null : cur));
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingItemId((cur) => (cur === id ? null : cur));
      });
    return () => {
      cancelled = true;
    };
  }, [item, variantsByItemId]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const selectedVariant = variants.find((v) => v.id === state.variantId) ?? null;
  const unitOre = selectedVariant
    ? state.mode === "new"
      ? selectedVariant.priceNewOre
      : selectedVariant.priceUsedDefaultOre ?? selectedVariant.priceNewOre
    : item
      ? state.mode === "new"
        ? item.priceNewDefault
        : item.priceUsedDefault ?? item.priceNewDefault
      : 0;
  const totalOre = unitOre * state.quantity;
  const usedAvailable = selectedVariant
    ? selectedVariant.priceUsedDefaultOre !== null
    : item
      ? item.priceUsedDefault !== null
      : false;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[80]"
            style={{
              background: "rgba(26, 31, 26, 0.4)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="fixed top-0 right-0 bottom-0 z-[90] w-full max-w-[520px] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header
              className="flex items-start justify-between px-7 py-6 border-b shrink-0"
              style={{ borderColor: "var(--color-line)" }}
            >
              <div className="min-w-0 pr-4">
                <p
                  className="text-[11px] uppercase tracking-[0.14em] font-semibold"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  {item.category}
                </p>
                <h2
                  className="mt-1 text-2xl tracking-tight truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.name}
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                  {item.description}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="close"
                className="p-2 -mr-2 rounded-full hover:bg-accent/40 transition-colors shrink-0"
              >
                <X className="size-5" style={{ color: "var(--color-ink-mute)" }} />
              </button>
            </header>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7">
              {/* Variant selection */}
              <section>
                <SectionLabel>{t("variantPicker.title")}</SectionLabel>
                {loading && (
                  <div
                    className="mt-3 flex items-center gap-2 text-sm"
                    style={{ color: "var(--color-ink-mute)" }}
                  >
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                )}
                {!loading && variants.length === 0 && (
                  <p className="mt-3 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                    {t("variantPicker.noVariants")}
                  </p>
                )}
                {!loading && variants.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {/* Stay-generic option */}
                    <VariantOption
                      selected={state.variantId === null}
                      onSelect={() => onUpdate({ variantId: null })}
                      image={null}
                      title={t("variantPicker.stayGeneric")}
                      subtitle={`${formatSek(state.mode === "new" ? item.priceNewDefault : item.priceUsedDefault ?? item.priceNewDefault)}`}
                    />
                    {variants.map((v) => (
                      <VariantOption
                        key={v.id}
                        selected={state.variantId === v.id}
                        onSelect={() => onUpdate({ variantId: v.id })}
                        image={v.imageUrl}
                        title={v.name}
                        subtitle={
                          <>
                            <span>{v.manufacturer}</span>
                            {v.sku && <span> · {v.sku}</span>}
                          </>
                        }
                        priceNew={v.priceNewOre}
                        priceUsed={v.priceUsedDefaultOre}
                        blocketQuery={v.blocketSearchQuery}
                        traderaQuery={v.traderaSearchQuery}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Mode toggle */}
              <section>
                <SectionLabel>Condition</SectionLabel>
                <div
                  className="mt-3 inline-flex p-1 rounded-full border"
                  style={{ background: "var(--color-cream)", borderColor: "var(--color-line)" }}
                >
                  {(["new", "used"] as const).map((m) => {
                    const isActive = state.mode === m;
                    const isDisabled = m === "used" && !usedAvailable;
                    return (
                      <button
                        key={m}
                        disabled={isDisabled}
                        onClick={() => onUpdate({ mode: m })}
                        className="px-5 py-2 rounded-full text-[12px] uppercase tracking-[0.1em] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: isActive ? "var(--color-ink)" : "transparent",
                          color: isActive ? "white" : "var(--color-ink-mute)",
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Quantity */}
              <section>
                <SectionLabel>Quantity</SectionLabel>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="inline-flex items-center gap-1 rounded-full border px-1 py-1"
                    style={{ borderColor: "var(--color-ink)" }}
                  >
                    <button
                      onClick={() => onUpdate({ quantity: Math.max(0, state.quantity - 1) })}
                      aria-label="decrease"
                      className="size-9 inline-flex items-center justify-center rounded-full hover:bg-accent/40 transition-colors disabled:opacity-30"
                      disabled={state.quantity === 0}
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-10 text-center font-semibold text-lg tabular-nums">
                      {state.quantity}
                    </span>
                    <button
                      onClick={() => onUpdate({ quantity: state.quantity + 1 })}
                      aria-label="increase"
                      className="size-9 inline-flex items-center justify-center rounded-full hover:bg-accent/40 transition-colors"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  {state.quantity === 0 && (
                    <span className="text-[12px]" style={{ color: "var(--color-ink-mute)" }}>
                      Set quantity to add to checklist
                    </span>
                  )}
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer
              className="px-7 py-5 border-t shrink-0 flex items-center justify-between"
              style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
            >
              <div>
                <p
                  className="text-[11px] uppercase tracking-[0.12em] font-semibold"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  Line total
                </p>
                <p
                  className="mt-0.5 text-2xl font-semibold tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
                >
                  {formatSek(totalOre)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg text-xs uppercase tracking-[0.12em] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                style={{ background: "var(--color-cta)" }}
              >
                Done
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] uppercase tracking-[0.14em] font-semibold"
      style={{ color: "var(--color-ink-mute)" }}
    >
      {children}
    </p>
  );
}

interface VariantOptionProps {
  selected: boolean;
  onSelect: () => void;
  image: string | null;
  title: string;
  subtitle: React.ReactNode;
  priceNew?: number;
  priceUsed?: number | null;
  blocketQuery?: string | null;
  traderaQuery?: string | null;
}

function VariantOption({
  selected,
  onSelect,
  image,
  title,
  subtitle,
  priceNew,
  priceUsed,
  blocketQuery,
  traderaQuery,
}: VariantOptionProps) {
  const t = useTranslations("variantPicker");
  const blocketUrl = blocketQuery
    ? `https://www.blocket.se/annonser/hela_sverige?q=${encodeURIComponent(blocketQuery)}`
    : null;
  const traderaUrl = traderaQuery
    ? `https://www.tradera.com/search?q=${encodeURIComponent(traderaQuery)}`
    : null;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all"
      style={{
        borderColor: selected ? "var(--color-terracotta)" : "var(--color-line)",
        background: selected ? "rgba(197, 85, 45, 0.04)" : "white",
        boxShadow: selected ? "0 0 0 1px var(--color-terracotta) inset" : "none",
      }}
    >
      <div
        className="size-14 shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ background: "var(--color-paper)" }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg";
            }}
          />
        ) : (
          <span style={{ color: "var(--color-ink-mute)", fontSize: 20 }}>—</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[14px] leading-tight truncate">{title}</div>
        <div className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-mute)" }}>
          {subtitle}
        </div>
        {(blocketUrl || traderaUrl) && (
          <div
            className="mt-1.5 flex gap-3 text-[11px]"
            style={{ color: "var(--color-green-leaf)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {blocketUrl && (
              <a
                href={blocketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:underline"
              >
                {t("findUsedBlocket")} <ExternalLink className="size-2.5" />
              </a>
            )}
            {traderaUrl && (
              <a
                href={traderaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:underline"
              >
                {t("findUsedTradera")} <ExternalLink className="size-2.5" />
              </a>
            )}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        {priceNew !== undefined && (
          <div
            className="font-semibold text-[14px] tabular-nums"
            style={{ color: "var(--color-terracotta)" }}
          >
            {formatSek(priceNew)}
          </div>
        )}
        {priceUsed != null && (
          <div className="text-[11px] tabular-nums" style={{ color: "var(--color-ink-mute)" }}>
            used {formatSek(priceUsed)}
          </div>
        )}
        {selected && (
          <div
            className="mt-1.5 inline-flex items-center justify-center size-5 rounded-full ml-auto"
            style={{ background: "var(--color-cta)" }}
          >
            <Check className="size-3 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}
