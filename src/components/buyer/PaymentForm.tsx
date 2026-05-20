"use client";
import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export function PaymentForm({ clientSecret, publishableKey, returnUrl }: { clientSecret: string; publishableKey: string; returnUrl: string }) {
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  if (!publishableKey) {
    return <p style={{ marginTop: 24, color: "var(--color-gold)" }}>Stripe not configured (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing). Payment cannot complete in dev without keys.</p>;
  }
  if (!stripePromise) return <p>Loading…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <InnerForm returnUrl={returnUrl} />
    </Elements>
  );
}

function InnerForm({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });
    if (err) {
      setError(err.message ?? "Payment failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 24 }}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p style={{ color: "var(--color-terracotta)" }}>{error}</p>}
      <button type="submit" disabled={!stripe || submitting}
        style={{ background: "var(--color-terracotta)", color: "white", padding: "14px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
        {submitting ? "…" : "Pay"} →
      </button>
    </form>
  );
}
