"use client";
import { useTranslations } from "next-intl";

export function TotpEnroll({ qrDataUrl, secret, value, onChange, onSubmit, submitting, error }: {
  qrDataUrl: string;
  secret: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const t = useTranslations("supplier.onboarding.enroll2fa");
  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ color: "var(--color-ink-soft)" }}>{t("qrInstruction")}</p>
      <div style={{ marginTop: 16, padding: 16, border: "1px solid var(--color-line)", borderRadius: 4, background: "white", display: "inline-block" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="TOTP QR code" width={200} height={200} />
      </div>
      <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>
        Or enter manually: <code>{secret}</code>
      </p>
      <label style={{ display: "grid", gap: 6, marginTop: 24, maxWidth: 200 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("code")}</span>
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          pattern="\d{6}" maxLength={6}
          style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: "0.2em" }} />
      </label>
      {error && <p style={{ color: "var(--color-terracotta)", marginTop: 12 }}>{error}</p>}
      <button onClick={onSubmit} disabled={submitting || value.length !== 6}
        style={{ marginTop: 24, background: "var(--color-cta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
        {submitting ? "…" : t("verify")} →
      </button>
    </div>
  );
}
