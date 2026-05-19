export default function PageLoading() {
  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
      <div style={{
        width: 40, height: 40, margin: "0 auto",
        borderRadius: "50%", border: "3px solid var(--color-cream-2)",
        borderTopColor: "var(--color-terracotta)",
        animation: "spin 800ms linear infinite",
      }} />
      <p style={{ color: "var(--color-ink-mute)", marginTop: 16, fontSize: 13 }}>Loading…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
