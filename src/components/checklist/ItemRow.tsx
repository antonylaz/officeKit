"use client";
import type { ItemCatalog, ProjectItem, ProductVariant } from "@prisma/client";
import { formatSek } from "@/lib/money";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Plus, Minus, ChevronRight } from "lucide-react";

type LineWithVariant = ProjectItem & { item: ItemCatalog; variant?: ProductVariant | null };

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
    ? mode === "new"
      ? variant.priceNewOre
      : variant.priceUsedDefaultOre ?? variant.priceNewOre
    : mode === "new"
      ? item.priceNewDefault
      : item.priceUsedDefault ?? item.priceNewDefault;
  const usedAvailable = variant ? variant.priceUsedDefaultOre !== null : item.priceUsedDefault !== null;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="grid items-center gap-5 p-5 mb-3 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
      style={{
        borderColor: "var(--color-line)",
        gridTemplateColumns: "56px minmax(0, 1fr) 180px 160px 140px 100px",
      }}
    >
      <div className="text-3xl" aria-hidden>
        {item.icon}
      </div>

      <div className="min-w-0">
        <h4 className="m-0 font-semibold text-[15px] leading-tight">{item.name}</h4>
        <p className="mt-1 text-[13px] leading-snug truncate" style={{ color: "var(--color-ink-mute)" }}>
          {item.description}
        </p>
        {item.tags.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {item.tags.slice(0, 3).map((tg) => (
              <span
                key={tg}
                className="text-[10px] uppercase tracking-[0.08em] font-semibold"
                style={{ color: "var(--color-green-leaf)" }}
              >
                {tg}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onChooseModel}
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs transition-colors hover:brightness-[0.98]"
        style={{
          background: variant ? "var(--color-cream-2)" : "var(--color-cream)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
      >
        {variant ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={variant.imageUrl}
              alt=""
              width={32}
              height={32}
              className="rounded shrink-0 object-cover"
              style={{ background: "var(--color-paper)" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg";
              }}
            />
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {variant.manufacturer} {variant.sku ?? ""}
            </span>
            <ChevronRight className="size-3.5 shrink-0" style={{ color: "var(--color-ink-mute)" }} />
          </>
        ) : (
          <>
            <span className="flex-1" style={{ color: "var(--color-ink-mute)" }}>
              {t("chooseModel")}
            </span>
            <ChevronRight className="size-3.5 shrink-0" style={{ color: "var(--color-ink-mute)" }} />
          </>
        )}
      </button>

      <ModeToggle mode={mode} onChange={onMode} usedAvailable={usedAvailable} />
      <Stepper value={qty} onChange={onQuantity} />

      <div
        className="text-right text-[13px] tabular-nums"
        style={{ color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)" }}
      >
        {formatSek(unitOre)}{" "}
        <span className="text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
          / ea
        </span>
      </div>
    </motion.div>
  );
}

function ModeToggle({
  mode,
  onChange,
  usedAvailable,
}: {
  mode: "new" | "used";
  onChange: (m: "new" | "used") => void;
  usedAvailable: boolean;
}) {
  return (
    <div
      className="inline-flex p-0.5 rounded-full border"
      style={{ background: "var(--color-cream)", borderColor: "var(--color-line)" }}
    >
      {(["new", "used"] as const).map((m) => {
        const isActive = mode === m;
        const isDisabled = m === "used" && !usedAvailable;
        return (
          <button
            key={m}
            disabled={isDisabled}
            onClick={() => onChange(m)}
            className="px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.08em] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div
      className="inline-flex items-center gap-3 rounded-full px-3 py-1 border"
      style={{ background: "var(--color-cream)", borderColor: "var(--color-line)" }}
    >
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="decrease"
        className="size-6 inline-flex items-center justify-center rounded-full hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={value === 0}
      >
        <Minus className="size-3.5" style={{ color: "var(--color-ink-soft)" }} />
      </button>
      <span className="min-w-6 text-center font-semibold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label="increase"
        className="size-6 inline-flex items-center justify-center rounded-full hover:bg-white transition-colors"
      >
        <Plus className="size-3.5" style={{ color: "var(--color-ink-soft)" }} />
      </button>
    </div>
  );
}
