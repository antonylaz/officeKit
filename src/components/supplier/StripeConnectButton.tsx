"use client";
import { useState } from "react";

export function StripeConnectButton({ hasAccount, active }: { hasAccount: boolean; active: boolean }) {
  const [submitting, setSubmitting] = useState(false);

  async function onboard() {
    setSubmitting(true);
    const res = await fetch("/api/v1/stripe/connect/onboard", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setSubmitting(false);
  }

  return (
    <button
      onClick={onboard}
      disabled={submitting || active}
      style={{
        background: active ? "var(--color-green-leaf)" : "var(--color-terracotta)",
        color: "white",
        padding: "14px 24px",
        border: "none",
        borderRadius: 4,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontSize: 12,
        cursor: active ? "default" : "pointer",
        opacity: active ? 0.7 : 1,
      }}
    >
      {submitting ? "…" : active ? "Connected ✓" : hasAccount ? "Continue onboarding" : "Connect with Stripe"} →
    </button>
  );
}
