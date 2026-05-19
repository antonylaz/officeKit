const STEPS = ["confirmed", "in_production", "shipped", "delivered"] as const;

export function OrderStatusTimeline({ status }: { status: string }) {
  const currentIdx = STEPS.indexOf(status as (typeof STEPS)[number]);
  const cancelled = status === "cancelled";
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: "32px 0", display: "grid", gap: 16 }}>
      {STEPS.map((step, idx) => {
        const done = !cancelled && idx <= currentIdx;
        const current = !cancelled && idx === currentIdx;
        return (
          <li key={step} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: done ? "var(--color-forest)" : "var(--color-cream-2)",
              border: current ? "2px solid var(--color-terracotta)" : "none",
            }} />
            <span style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, fontWeight: 600, color: done ? "var(--color-ink)" : "var(--color-ink-mute)" }}>
              {step.replace("_", " ")}
            </span>
          </li>
        );
      })}
      {cancelled && (
        <li style={{ color: "var(--color-terracotta)", fontWeight: 600, fontSize: 13, marginTop: 16 }}>
          Order cancelled
        </li>
      )}
    </ol>
  );
}
