"use client";

import Link from "next/link";

export default function PageError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
      <p style={{ fontSize: 64 }}>⚠️</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 16 }}>Something went wrong</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{error.message || "Unknown error."}</p>
      <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={reset} style={{ background: "var(--color-terracotta)", color: "white", padding: "10px 20px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          Try again
        </button>
        <Link href="/sv" style={{ padding: "10px 20px", border: "1px solid var(--color-line)", borderRadius: 4, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none", color: "var(--color-ink)" }}>
          Home
        </Link>
      </div>
    </div>
  );
}
