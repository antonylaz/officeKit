"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Check, Plus, Minus, ExternalLink, Loader2, Leaf, MapPin } from "lucide-react";
import { ExpressInterestButton } from "@/components/listing/ExpressInterestButton";
import { formatSek } from "@/lib/money";
import type { ItemCatalog, ProductVariant, ItemCondition } from "@prisma/client";

export interface DrawerState {
  variantId: string | null;
  mode: "new" | "used";
  quantity: number;
}

interface MatchingListing {
  listingId: string;
  city: string;
  reason: string;
  moveOutDate: string | null;
  description: string;
  quantity: number;
  condition: ItemCondition;
  askingPriceOre: number | null;
}

interface Props {
  item: ItemCatalog | null;
  state: DrawerState;
  buyerCity?: string;
  onClose: () => void;
  onUpdate: (patch: Partial<DrawerState>) => void;
}

export function ItemDetailDrawer({ item, state, buyerCity, onClose, onUpdate }: Props) {
  const t = useTranslations();
  // Keyed by itemId so we don't have to setState synchronously to clear
  const [variantsByItemId, setVariantsByItemId] = useState<Record<string, ProductVariant[]>>({});
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [matchingByItemId, setMatchingByItemId] = useState<Record<string, MatchingListing[]>>({});
  const variants = item ? variantsByItemId[item.id] ?? [] : [];
  const matching = item ? matchingByItemId[item.id] ?? [] : [];
  const loading = item != null && loadingItemId === item.id && !variantsByItemId[item.id];
  const [traderaByVariantId, setTraderaByVariantId] = useState<Record<string, { total: number } | null>>({});

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

  // Fetch matching used listings (separate effect so a slow listings query doesn't block variants)
  useEffect(() => {
    if (!item || matchingByItemId[item.id]) return;
    let cancelled = false;
    const id = item.id;
    const url = buyerCity
      ? `/api/v1/catalog/items/${id}/matching-listings?city=${encodeURIComponent(buyerCity)}`
      : `/api/v1/catalog/items/${id}/matching-listings`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setMatchingByItemId((prev) => ({ ...prev, [id]: d.listings ?? [] }));
      })
      .catch(() => {
        // Soft fail — drawer keeps working without used matches
      });
    return () => {
      cancelled = true;
    };
  }, [item, buyerCity, matchingByItemId]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const selectedVariant = variants.find((v) => v.id === state.variantId) ?? null;

  // Tradera live count for the *selected* variant (one fetch per variant per drawer open).
  // Falls through silently when TRADERA_APP_ID is not configured.
  useEffect(() => {
    if (!selectedVariant) return;
    const query = selectedVariant.traderaSearchQuery ?? selectedVariant.name;
    if (!query) return;
    if (selectedVariant.id in traderaByVariantId) return;
    let cancelled = false;
    fetch(`/api/v1/tradera/search?q=${encodeURIComponent(query)}&limit=1`)
      .then((r) => r.json())
      .then((d: { enabled: boolean; total?: number }) => {
        if (cancelled) return;
        setTraderaByVariantId((prev) => ({
          ...prev,
          [selectedVariant.id]: d.enabled ? { total: d.total ?? 0 } : null,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setTraderaByVariantId((prev) => ({ ...prev, [selectedVariant.id]: null }));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVariant, traderaByVariantId]);

  // Per-variant listing match refinement.
  // When a specific variant is selected, narrow the resale matches to listings
  // mentioning the variant's manufacturer or SKU. If that filter leaves zero,
  // fall back to the full item-level list so we never hide everything.
  const refinedMatching = (() => {
    if (!selectedVariant || matching.length === 0) return matching;
    const brand = selectedVariant.manufacturer.toLowerCase();
    const sku = selectedVariant.sku?.toLowerCase();
    const filtered = matching.filter((m) => {
      const text = m.description.toLowerCase();
      if (text.includes(brand)) return true;
      if (sku && sku.length > 2 && text.includes(sku)) return true;
      return false;
    });
    return filtered.length > 0 ? filtered : matching;
  })();
  const matchingIsRefined = selectedVariant !== null && refinedMatching.length !== matching.length;
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

              {/* Matching resale listings */}
              {refinedMatching.length > 0 && (
                <section>
                  <SectionLabel>
                    <span className="inline-flex items-center gap-1.5">
                      <Leaf className="size-3" style={{ color: "var(--color-forest)" }} />
                      Available used near you · {refinedMatching.length}
                      {matchingIsRefined && (
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.06em] font-bold"
                          style={{ background: "rgba(27, 48, 38, 0.12)", color: "var(--color-forest)" }}
                        >
                          {selectedVariant?.manufacturer}
                        </span>
                      )}
                    </span>
                  </SectionLabel>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-mute)" }}>
                    {matchingIsRefined
                      ? `Filtered to listings matching ${selectedVariant?.manufacturer}. Clear the variant to see all ${matching.length}.`
                      : "Sellers closing or downsizing offices have this item available. Reach out via OfficeKit."}
                  </p>
                  <div className="mt-3 space-y-2">
                    {refinedMatching.slice(0, 3).map((m) => (
                      <MatchCard key={`${m.listingId}-${m.description}`} match={m} buyerCity={buyerCity} />
                    ))}
                  </div>
                </section>
              )}

              {/* Tradera live availability for the selected variant */}
              {selectedVariant && traderaByVariantId[selectedVariant.id] && (
                <section>
                  <SectionLabel>Tradera right now</SectionLabel>
                  <a
                    href={`https://www.tradera.com/search?q=${encodeURIComponent(selectedVariant.traderaSearchQuery ?? selectedVariant.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] hover:bg-accent/30 transition-colors"
                    style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                  >
                    <span className="font-semibold tabular-nums">
                      {traderaByVariantId[selectedVariant.id]?.total ?? 0}
                    </span>
                    <span style={{ color: "var(--color-ink-mute)" }}>
                      live listings on Tradera
                    </span>
                    <ExternalLink className="size-3" style={{ color: "var(--color-ink-mute)" }} />
                  </a>
                </section>
              )}

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

const CONDITION_LABEL: Record<ItemCondition, string> = {
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

function MatchCard({ match, buyerCity }: { match: MatchingListing; buyerCity?: string }) {
  const local = buyerCity != null && match.city.toLowerCase() === buyerCity.toLowerCase();
  return (
    <div
      className="p-3 rounded-xl border"
      style={{
        background: "rgba(27, 48, 38, 0.04)",
        borderColor: "rgba(27, 48, 38, 0.2)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="size-10 shrink-0 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(27, 48, 38, 0.1)" }}
        >
          <Leaf className="size-4" style={{ color: "var(--color-forest)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--color-ink)" }}>
              {match.description}
            </p>
            <span
              className="text-[10px] uppercase tracking-[0.08em] font-semibold"
              style={{ color: "var(--color-ink-mute)" }}
            >
              ×{match.quantity}
            </span>
          </div>
          <div
            className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]"
            style={{ color: "var(--color-ink-mute)" }}
          >
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-2.5" />
              {match.city}
              {local && (
                <span
                  className="ml-1 px-1 rounded text-[9px] uppercase tracking-[0.06em] font-bold"
                  style={{ background: "var(--color-forest)", color: "white" }}
                >
                  Local
                </span>
              )}
            </span>
            <span>{CONDITION_LABEL[match.condition]}</span>
            <span style={{ textTransform: "capitalize" }}>{match.reason}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {match.askingPriceOre != null ? (
            <div
              className="font-semibold text-[13px] tabular-nums"
              style={{ color: "var(--color-forest)" }}
            >
              {formatSek(match.askingPriceOre)}
            </div>
          ) : (
            <div className="text-[11px] italic" style={{ color: "var(--color-ink-mute)" }}>
              Make offer
            </div>
          )}
          <div className="text-[10px]" style={{ color: "var(--color-ink-mute)" }}>
            per unit
          </div>
        </div>
      </div>
      <div
        className="mt-3 pt-3 flex items-center gap-3 border-t"
        style={{ borderColor: "rgba(27, 48, 38, 0.12)" }}
      >
        <a
          href={`/sv/listings/${match.listingId}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] uppercase tracking-[0.08em] font-semibold hover:underline"
          style={{ color: "var(--color-forest)" }}
        >
          View full listing →
        </a>
        <span style={{ color: "var(--color-ink-mute)" }}>·</span>
        <ExpressInterestButton
          listingId={match.listingId}
          companyName="this seller"
          variant="ghost"
          size="sm"
          label="Express interest"
        />
      </div>
    </div>
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
