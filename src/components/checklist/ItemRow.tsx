"use client";
import type { ItemCatalog, ProjectItem, ProductVariant } from "@prisma/client";
import { formatSek } from "@/lib/money";
import { useTranslations } from "next-intl";

type LineWithVariant = (ProjectItem & { item: ItemCatalog; variant?: ProductVariant | null });

export function ItemRow({
  item,
  line,
  onQuantity,
  onMode,
  onChooseModel,
}: {
  item: ItemCatalog;
  line: LineWithVariant | undefined;
  onQuantity: (q: number) => void;
  onMode: (m: "new" | "used") => void;
  onChooseModel: () => void;
}) {
  const t = useTranslations("checklist");
  const qty = line?.quantity ?? 0;
  const mode = line?.mode ?? "new";
  const variant = line?.variant ?? null;
  const unitOre = variant
    ? (mode === "new" ? variant.priceNewOre : (variant.priceUsedDefaultOre ?? variant.priceNewOre))
    : (mode === "new" ? item.priceNewDefault : (item.priceUsedDefault ?? item.priceNewDefault));
  const usedAvailable = variant
    ? variant.priceUsedDefaultOre !== null
    : item.priceUsedDefault !== null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr 180px 160px 140px 100px",
        gap: 20,
        alignItems: "center",
        padding: "20px 24px",
        marginBottom: 12,
        background: "white",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-card-lg)",
        boxShadow: "var(--shadow-sm)",
        transition: "box-shadow var(--transition-default), transform var(--transition-default)",
      }}
    >
      <div style={{ fontSize: 32 }} aria-hidden>{item.icon}</div>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{item.name}</h4>
        <p style={{ margin: "4px 0 0", color: "var(--color-ink-mute)", fontSize: 13, lineHeight: 1.4 }}>{item.description}</p>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.tags.map((tg) => (
            <span key={tg} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-green-leaf)", fontWeight: 600 }}>{tg}</span>
          ))}
        </div>
      </div>

      <button
        onClick={onChooseModel}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px",
          background: variant ? "var(--color-cream-2)" : "var(--color-cream)",
          border: `1px solid var(--color-line)`,
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          color: "var(--color-ink)",
          textAlign: "left",
          width: "100%",
          transition: "background var(--transition-fast)",
        }}
      >
        {variant ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={variant.imageUrl} alt="" width={32} height={32}
              style={{ objectFit: "cover", borderRadius: 4, background: "var(--color-paper)" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg"; }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{variant.manufacturer} {variant.sku ?? ""}</span>
          </>
        ) : (
          <span style={{ color: "var(--color-ink-mute)" }}>{t("chooseModel")}</span>
        )}
      </button>

      <ModeToggle mode={mode} onChange={onMode} usedAvailable={usedAvailable} />
      <Stepper value={qty} onChange={onQuantity} />
      <div style={{ textAlign: "right", color: "var(--color-ink-mute)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
        {formatSek(unitOre)} <span style={{ fontSize: 11 }}>/ ea</span>
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange, usedAvailable }: { mode: "new" | "used"; onChange: (m: "new" | "used") => void; usedAvailable: boolean }) {
  return (
    <div style={{ display: "inline-flex", padding: 2, background: "var(--color-cream)", borderRadius: 100, border: "1px solid var(--color-line)" }}>
      {(["new", "used"] as const).map((m) => (
        <button
          key={m}
          disabled={m === "used" && !usedAvailable}
          onClick={() => onChange(m)}
          style={{
            padding: "6px 14px",
            border: "none",
            background: mode === m ? "var(--color-ink)" : "transparent",
            color: mode === m ? "white" : "var(--color-ink-mute)",
            borderRadius: 100,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            cursor: m === "used" && !usedAvailable ? "not-allowed" : "pointer",
            opacity: m === "used" && !usedAvailable ? 0.4 : 1,
            transition: "background var(--transition-fast), color var(--transition-fast)",
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, border: "1px solid var(--color-line)", borderRadius: 100, padding: "4px 12px", background: "var(--color-cream)" }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={btn} aria-label="decrease">−</button>
      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btn} aria-label="increase">+</button>
    </div>
  );
}
const btn: React.CSSProperties = { border: "none", background: "transparent", fontSize: 18, cursor: "pointer", width: 24, color: "var(--color-ink-soft)", lineHeight: 1, transition: "color var(--transition-fast)" };
