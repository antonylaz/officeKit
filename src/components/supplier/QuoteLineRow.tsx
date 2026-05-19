"use client";
import type { QuoteLine, ItemCatalog } from "@prisma/client";
import { fromSek, toSek } from "@/lib/money";

export function QuoteLineRow({
  line, disabled, onChange, onRemove,
}: {
  line: QuoteLine & { item: ItemCatalog };
  disabled: boolean;
  onChange: (patch: Partial<{ quantity: number; mode: "new" | "used"; unitPrice: number }>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 120px 32px", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--color-line)" }}>
      <div style={{ fontSize: 20 }}>{line.item.icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{line.item.name}</div>
        <div style={{ color: "var(--color-ink-mute)", fontSize: 12 }}>{line.item.description}</div>
      </div>
      <select value={line.mode} disabled={disabled} onChange={(e) => onChange({ mode: e.target.value as "new" | "used" })}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "6px 8px", fontSize: 13 }}>
        <option value="new">new</option>
        <option value="used">used</option>
      </select>
      <input type="number" value={line.quantity} disabled={disabled} min={0} max={9999}
        onChange={(e) => onChange({ quantity: Number(e.target.value) })}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "6px 8px", fontSize: 13, textAlign: "right" }} />
      <input type="number" value={toSek(line.unitPrice)} disabled={disabled} step={1}
        onChange={(e) => onChange({ unitPrice: fromSek(Number(e.target.value)) })}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "6px 8px", fontSize: 13, textAlign: "right" }} />
      <button onClick={onRemove} disabled={disabled}
        style={{ background: "transparent", border: "none", color: "var(--color-ink-mute)", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}
