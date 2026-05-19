"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function OrderConfirmForm({ projectId, quoteId, defaultCity, defaultCompanyName, defaultOrgNumber }: {
  projectId: string;
  quoteId: string;
  defaultCity: string;
  defaultCompanyName: string;
  defaultOrgNumber: string;
}) {
  const t = useTranslations("buyer.confirm");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      quoteId,
      billing: {
        companyName: String(fd.get("companyName")),
        orgNumber: String(fd.get("orgNumber")),
        address: {
          street: String(fd.get("billingStreet")),
          postal: String(fd.get("billingPostal")),
          city: String(fd.get("billingCity")),
          country: "SE",
        },
      },
      deliveryAddress: {
        street: String(fd.get("deliveryStreet")),
        postal: String(fd.get("deliveryPostal")),
        city: String(fd.get("deliveryCity")),
        country: "SE",
      },
      deliveryWindowStart: new Date(String(fd.get("deliveryStart"))).toISOString(),
      deliveryWindowEnd: new Date(String(fd.get("deliveryEnd"))).toISOString(),
      paymentMethod: String(fd.get("paymentMethod")),
      lostReason: String(fd.get("lostReason") ?? "") || undefined,
    };
    const res = await fetch(`/api/v1/projects/${projectId}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(typeof data.error === "string" ? data.error : "place_failed"); setSubmitting(false); return; }
    router.push(`/orders/${data.orderId}`);
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 24 }}>
      <fieldset style={fs}>
        <legend style={lg}>{t("billing")}</legend>
        <Field label={t("companyName")} name="companyName" defaultValue={defaultCompanyName} required />
        <Field label={t("orgNumber")} name="orgNumber" defaultValue={defaultOrgNumber} required />
        <Field label={t("street")} name="billingStreet" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <Field label={t("postal")} name="billingPostal" required />
          <Field label={t("city")} name="billingCity" required />
        </div>
      </fieldset>
      <fieldset style={fs}>
        <legend style={lg}>{t("delivery")}</legend>
        <Field label={t("street")} name="deliveryStreet" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <Field label={t("postal")} name="deliveryPostal" required />
          <Field label={t("city")} name="deliveryCity" defaultValue={defaultCity} required />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("windowStart")} name="deliveryStart" type="date" required />
          <Field label={t("windowEnd")} name="deliveryEnd" type="date" required />
        </div>
      </fieldset>
      <fieldset style={fs}>
        <legend style={lg}>{t("payment")}</legend>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="radio" name="paymentMethod" value="card" defaultChecked /> {t("paymentCard")}
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="radio" name="paymentMethod" value="klarna_invoice" /> {t("paymentKlarna")}
        </label>
        <p style={{ fontSize: 12, color: "var(--color-ink-mute)", marginTop: 8 }}>{t("paymentNotice")}</p>
      </fieldset>
      <fieldset style={fs}>
        <legend style={lg}>{t("optional")}</legend>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("lostReasonLabel")}</span>
          <textarea name="lostReason" rows={3} maxLength={500}
            style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 12, fontFamily: "var(--font-body)", fontSize: 14 }} />
        </label>
      </fieldset>
      {error && <p style={{ color: "var(--color-terracotta)" }}>{error}</p>}
      <button type="submit" disabled={submitting}
        style={{ background: "var(--color-terracotta)", color: "white", padding: "16px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
        {submitting ? "…" : t("placeOrder")} →
      </button>
    </form>
  );
}

const fs: React.CSSProperties = { border: "1px solid var(--color-line)", borderRadius: 4, padding: 24, display: "grid", gap: 16 };
const lg: React.CSSProperties = { padding: "0 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" };

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{label}</span>
      <input {...rest} style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px", fontSize: 14 }} />
    </label>
  );
}
