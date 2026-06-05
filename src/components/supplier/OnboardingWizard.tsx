"use client";
import { useState } from "react";
import { TotpEnroll } from "./TotpEnroll";
import { RecoveryCodesDisplay } from "./RecoveryCodesDisplay";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function OnboardingWizard({ token, email, supplierName, totpSecret, qrDataUrl }: {
  token: string;
  email: string;
  supplierName: string;
  totpSecret: string;
  qrDataUrl: string;
}) {
  const t = useTranslations("supplier.onboarding");
  const router = useRouter();
  const [step, setStep] = useState<"password" | "totp" | "recovery">("password");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function complete() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/supplier/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password, totpSecret, totpToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "invalid");
      setSubmitting(false);
      return;
    }
    setRecoveryCodes(data.recoveryCodes);
    setStep("recovery");
    setSubmitting(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 32px" }}>
      <p style={{ color: "var(--color-ink-mute)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{supplierName}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginTop: 8 }}>
        {step === "password" && t("setPassword.title")}
        {step === "totp" && t("enroll2fa.title")}
        {step === "recovery" && t("recovery.title")}
      </h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>{email}</p>

      {step === "password" && (
        <div style={{ marginTop: 32 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("setPassword.password")}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }} />
            <span style={{ fontSize: 12, color: "var(--color-ink-mute)" }}>{t("setPassword.hint")}</span>
          </label>
          <button onClick={() => setStep("totp")} disabled={password.length < 8}
            style={{ marginTop: 24, background: "var(--color-cta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
            {t("setPassword.next")} →
          </button>
        </div>
      )}

      {step === "totp" && (
        <TotpEnroll qrDataUrl={qrDataUrl} secret={totpSecret} value={totpToken} onChange={setTotpToken} onSubmit={complete} submitting={submitting} error={error} />
      )}

      {step === "recovery" && (
        <RecoveryCodesDisplay codes={recoveryCodes} onContinue={() => router.push("/supplier/login")} />
      )}
    </div>
  );
}
