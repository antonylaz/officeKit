"use client";
import type { QuoteLine, ItemCatalog, ProductVariant } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { fromSek, toSek } from "@/lib/money";

export function QuoteLineRow({
  line,
  disabled,
  onChange,
  onRemove,
}: {
  line: QuoteLine & { item: ItemCatalog; variant: ProductVariant | null };
  disabled: boolean;
  onChange: (patch: Partial<{ quantity: number; mode: "new" | "used"; unitPrice: number }>) => void;
  onRemove: () => void;
}) {
  const v = line.variant;
  const lineTotal = line.unitPrice * line.quantity;
  return (
    <div
      className="flex items-center gap-3 p-3 mb-2 rounded-xl border bg-white transition-shadow hover:shadow-sm"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div
        className="size-12 shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ background: "var(--color-paper)" }}
      >
        {v ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/variants/_placeholder.svg";
            }}
          />
        ) : (
          <span className="text-xl" aria-hidden>
            {line.item.icon}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] leading-tight truncate">{line.item.name}</div>
        {v ? (
          <div
            className="mt-0.5 text-[12px] font-medium"
            style={{ color: "var(--color-terracotta)" }}
          >
            {v.manufacturer} {v.sku ?? v.name}
          </div>
        ) : (
          <div className="mt-0.5 text-[12px] truncate" style={{ color: "var(--color-ink-mute)" }}>
            {line.item.description}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <label className="sr-only" htmlFor={`mode-${line.id}`}>Condition</label>
        <select
          id={`mode-${line.id}`}
          value={line.mode}
          disabled={disabled}
          onChange={(e) => onChange({ mode: e.target.value as "new" | "used" })}
          className="rounded-md border px-2.5 py-1.5 text-[13px] outline-none focus:ring-2 disabled:opacity-50"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
        >
          <option value="new">new</option>
          <option value="used">used</option>
        </select>

        <div className="flex items-center gap-1">
          <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--color-ink-mute)" }}>
            qty
          </span>
          <input
            type="number"
            value={line.quantity}
            disabled={disabled}
            min={0}
            max={9999}
            onChange={(e) => onChange({ quantity: Number(e.target.value) })}
            className="w-20 rounded-md border px-2 py-1.5 text-[13px] text-right tabular-nums outline-none focus:ring-2 disabled:opacity-50"
            style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--color-ink-mute)" }}>
            unit
          </span>
          <input
            type="number"
            value={toSek(line.unitPrice)}
            disabled={disabled}
            step={1}
            onChange={(e) => onChange({ unitPrice: fromSek(Number(e.target.value)) })}
            className="w-28 rounded-md border px-2 py-1.5 text-[13px] text-right tabular-nums outline-none focus:ring-2 disabled:opacity-50"
            style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
          />
        </div>

        <div className="hidden md:block w-28 text-right">
          <div
            className="text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--color-ink-mute)" }}
          >
            line
          </div>
          <div
            className="font-semibold tabular-nums"
            style={{ color: "var(--color-ink)" }}
          >
            {toSek(lineTotal).toLocaleString("sv-SE")} kr
          </div>
        </div>

        <button
          onClick={onRemove}
          disabled={disabled}
          aria-label="remove line"
          className="size-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-destructive/10 disabled:opacity-30"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
