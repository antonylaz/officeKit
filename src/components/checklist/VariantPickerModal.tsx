"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { cancelled = true; document.removeEventListener("keydown", onKey); };
  }, [item.id, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("variantPicker.title")}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(26, 31, 26, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "fadeIn var(--transition-default) ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "var(--radius-modal)",
          maxWidth: 960, width: "100%",
          maxHeight: "90vh", overflowY: "auto",
          padding: 32,
          boxShadow: "var(--shadow-lg)",
          animation: "slideUp var(--transition-default) ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)", fontWeight: 600 }}>{t("variantPicker.title")}</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 4, letterSpacing: "-0.02em" }}>{item.name}</h2>
            <p style={{ color: "var(--color-ink-soft)", marginTop: 8, fontSize: 14 }}>{item.description}</p>
          </div>
          <button onClick={onClose} aria-label="close"
            style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "var(--color-ink-mute)", padding: 8 }}>×</button>
        </div>

        {loading && <p style={{ marginTop: 32, color: "var(--color-ink-mute)" }}>Loading…</p>}

        {!loading && variants.length === 0 && (
          <p style={{ marginTop: 32, color: "var(--color-ink-mute)" }}>{t("variantPicker.noVariants")}</p>
        )}

        {!loading && variants.length > 0 && (
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {variants.map((v) => (
              <VariantCard
                key={v.id}
                variant={v}
                selected={currentVariantId === v.id}
                onPick={() => onPick(v)}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => onPick(null)}
          style={{
            marginTop: 24,
            background: "transparent",
            border: "none",
            color: "var(--color-ink-mute)",
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {t("variantPicker.stayGeneric")}
        </button>

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
      </div>
    </div>
  );
}

function VariantCard({ variant, selected, onPick }: { variant: ProductVariant; selected: boolean; onPick: () => void }) {
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
    <article
      style={{
        background: selected ? "var(--color-cream-2)" : "white",
        border: `2px solid ${selected ? "var(--color-terracotta)" : "var(--color-line)"}`,
        borderRadius: "var(--radius-card-lg)",
        overflow: "hidden",
        transition: "transform var(--transition-default), box-shadow var(--transition-default), border-color var(--transition-fast)",
        display: "flex", flexDirection: "column",
        boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
      }}
    >
      <div style={{
        aspectRatio: "4/3",
        background: "var(--color-paper)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={variant.imageUrl}
          alt={`${variant.manufacturer} ${variant.name}`}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg"; }}
        />
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink-mute)", fontWeight: 600 }}>{variant.manufacturer}</p>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 4, letterSpacing: "-0.01em" }}>{variant.name}</h3>
        </div>

        {specKeys.length > 0 && (
          <dl style={{ margin: 0, display: "grid", gap: 4, fontSize: 12, color: "var(--color-ink-soft)" }}>
            {specKeys.map((k) => (
              <div key={k} style={{ display: "flex", gap: 6 }}>
                <dt style={{ color: "var(--color-ink-mute)", textTransform: "capitalize" }}>{k}:</dt>
                <dd style={{ margin: 0 }}>{String(specs[k])}</dd>
              </div>
            ))}
          </dl>
        )}

        <div style={{ marginTop: "auto" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-terracotta)", fontWeight: 600, margin: 0 }}>
            {formatSek(variant.priceNewOre)}
          </p>
          {variant.priceUsedDefaultOre !== null && (
            <p style={{ fontSize: 12, color: "var(--color-ink-mute)", margin: "2px 0 0" }}>
              {t("usedFrom", { price: formatSek(variant.priceUsedDefaultOre) })}
            </p>
          )}
        </div>

        <button
          onClick={onPick}
          style={{
            background: selected ? "var(--color-green-leaf)" : "var(--color-terracotta)",
            color: "white",
            padding: "10px 16px",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "background var(--transition-fast)",
          }}
        >
          {selected ? "✓ " + t("picked") : t("pickThis")}
        </button>

        {(blocketUrl || traderaUrl) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {blocketUrl && (
              <a href={blocketUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "var(--color-green-leaf)", textDecoration: "underline" }}>
                {t("findUsedBlocket")} →
              </a>
            )}
            {traderaUrl && (
              <a href={traderaUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "var(--color-green-leaf)", textDecoration: "underline" }}>
                {t("findUsedTradera")} →
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
