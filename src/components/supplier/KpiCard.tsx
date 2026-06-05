import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "muted";
}) {
  const accentColor =
    accent === "primary"
      ? "var(--color-terracotta)"
      : accent === "success"
        ? "var(--color-green-leaf)"
        : accent === "warning"
          ? "var(--color-gold)"
          : "var(--color-ink-mute)";

  return (
    <div
      className="rounded-2xl border p-5 transition-shadow hover:shadow-sm"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5" style={{ color: accentColor }} />}
        <p
          className="text-[11px] uppercase tracking-[0.12em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {label}
        </p>
      </div>
      <p
        className="mt-2 text-3xl tracking-tight tabular-nums"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        {value}
      </p>
      {delta && (
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-mute)" }}>
          {delta}
        </p>
      )}
    </div>
  );
}
