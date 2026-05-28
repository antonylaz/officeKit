"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";

const STATUSES = ["confirmed", "in_production", "shipped", "delivered", "paid", "cancelled"] as const;

export function AdminOrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  async function override() {
    setSubmitting(true);
    const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSubmitting(false);
    if (res.ok) router.refresh();
  }

  async function refund() {
    setSubmitting(true);
    const res = await fetch(`/api/v1/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setSubmitting(false);
    if (res.ok) router.refresh();
  }

  return (
    <div style={{ marginTop: 32, display: "grid", gap: 16, padding: 24, border: "1px solid var(--color-line)", borderRadius: 4 }}>
      <div>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>Manual status override</p>
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "8px 12px" }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={override} disabled={submitting || status === currentStatus} style={{ background: "var(--color-cta)", color: "white", padding: "8px 16px", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer" }}>
            Apply
          </button>
        </div>
      </div>
      <div>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>Refund</p>
        {!refundOpen ? (
          <button onClick={() => setRefundOpen(true)} style={{ marginTop: 8, background: "transparent", color: "var(--color-terracotta)", padding: "8px 16px", border: "1px solid var(--color-terracotta)", borderRadius: 4, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer" }}>Refund full amount</button>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" rows={3}
              style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={refund} disabled={submitting || !reason} style={{ background: "var(--color-cta)", color: "white", padding: "8px 16px", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Confirm refund</button>
              <button onClick={() => setRefundOpen(false)} style={{ background: "transparent", border: "1px solid var(--color-line)", padding: "8px 16px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
