export function KpiCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 36, marginTop: 8 }}>{value}</p>
      {delta && <p style={{ fontSize: 12, color: "var(--color-ink-mute)", marginTop: 4 }}>{delta}</p>}
    </div>
  );
}
