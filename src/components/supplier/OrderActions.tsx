"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";

const NEXT_STATUS: Record<string, string | null> = {
  confirmed: "in_production",
  in_production: "shipped",
  shipped: "delivered",
  delivered: null,
  paid: null,
  cancelled: null,
};

export function OrderActions({ orderId, status, canCancel }: { orderId: string; status: string; canCancel: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [tracking, setTracking] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const next = NEXT_STATUS[status];

  async function advance() {
    if (!next) return;
    setSubmitting(true);
    const res = await fetch(`/api/v1/supplier/orders/${orderId}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next, trackingNumber: next === "shipped" ? tracking : undefined }),
    });
    setSubmitting(false);
    if (res.ok) router.refresh();
  }

  async function cancel() {
    setSubmitting(true);
    const res = await fetch(`/api/v1/supplier/orders/${orderId}/cancel`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    setSubmitting(false);
    if (res.ok) router.refresh();
  }

  return (
    <div style={{ marginTop: 32, display: "grid", gap: 16 }}>
      {next && (
        <div style={{ display: "grid", gap: 8 }}>
          {status === "in_production" && (
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number (optional)"
              style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }} />
          )}
          <button onClick={advance} disabled={submitting}
            style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
            Mark as {next.replace("_", " ")}
          </button>
        </div>
      )}
      {canCancel && (
        <div>
          {!cancelOpen ? (
            <button onClick={() => setCancelOpen(true)}
              style={{ background: "transparent", color: "var(--color-terracotta)", padding: "12px 24px", border: "1px solid var(--color-terracotta)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
              Cancel order
            </button>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (shared with buyer)" rows={3}
                style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 12, fontFamily: "var(--font-body)" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={cancel} disabled={submitting || !cancelReason}
                  style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", fontSize: 12, cursor: "pointer" }}>
                  Confirm cancel
                </button>
                <button onClick={() => setCancelOpen(false)} style={{ background: "transparent", border: "1px solid var(--color-line)", padding: "12px 24px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
