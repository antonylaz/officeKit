"use client";
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import { formatSek } from "@/lib/money";

export function ItemRow({
  item,
  line,
  onQuantity,
  onMode,
}: {
  item: ItemCatalog;
  line: (ProjectItem & { item: ItemCatalog }) | undefined;
  onQuantity: (q: number) => void;
  onMode: (m: "new" | "used") => void;
}) {
  const qty = line?.quantity ?? 0;
  const mode = line?.mode ?? "new";
  const unitOre = mode === "new" ? item.priceNewDefault : (item.priceUsedDefault ?? item.priceNewDefault);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 200px 140px 100px", gap: 16, alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--color-line)" }}>
      <div style={{ fontSize: 28 }}>{item.icon}</div>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600 }}>{item.name}</h4>
        <p style={{ margin: "4px 0 0", color: "var(--color-ink-mute)", fontSize: 13 }}>{item.description}</p>
        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.tags.map((tg) => (
            <span key={tg} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-green-leaf)" }}>{tg}</span>
          ))}
        </div>
      </div>
      <ModeToggle mode={mode} onChange={onMode} usedAvailable={item.priceUsedDefault !== null} />
      <Stepper value={qty} onChange={onQuantity} />
      <div style={{ textAlign: "right", color: "var(--color-ink-mute)", fontSize: 13 }}>{formatSek(unitOre)} / ea</div>
    </div>
  );
}

function ModeToggle({ mode, onChange, usedAvailable }: { mode: "new" | "used"; onChange: (m: "new" | "used") => void; usedAvailable: boolean }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--color-line)", borderRadius: 100 }}>
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
            cursor: m === "used" && !usedAvailable ? "not-allowed" : "pointer",
            opacity: m === "used" && !usedAvailable ? 0.4 : 1,
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, border: "1px solid var(--color-line)", borderRadius: 100, padding: "4px 12px" }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={btn}>−</button>
      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btn}>+</button>
    </div>
  );
}
const btn: React.CSSProperties = { border: "none", background: "transparent", fontSize: 16, cursor: "pointer", width: 24, color: "var(--color-ink-soft)" };
