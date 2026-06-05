"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, KeyRound, Check, ArrowRight, Building2 } from "lucide-react";
import { TotpEnroll } from "./TotpEnroll";
import { RecoveryCodesDisplay } from "./RecoveryCodesDisplay";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

type Step = "password" | "totp" | "recovery";

export function OnboardingWizard({
  token,
  email,
  supplierName,
  totpSecret,
  qrDataUrl,
}: {
  token: string;
  email: string;
  supplierName: string;
  totpSecret: string;
  qrDataUrl: string;
}) {
  const t = useTranslations("supplier.onboarding");
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
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

  const titles: Record<Step, string> = {
    password: t("setPassword.title"),
    totp: t("enroll2fa.title"),
    recovery: t("recovery.title"),
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center">
          <div
            className="inline-flex size-12 items-center justify-center rounded-xl mb-5"
            style={{ background: "rgba(15, 22, 18, 0.05)", color: "var(--color-ink)" }}
          >
            <Building2 className="size-5" />
          </div>
          <p
            className="text-[11px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {supplierName}
          </p>
          <h1
            className="mt-3 text-3xl md:text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {titles[step]}
          </h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-mute)" }}>
            {email}
          </p>
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* Body */}
        <div
          className="mt-8 rounded-2xl border p-7 bg-white shadow-sm"
          style={{ borderColor: "var(--color-line)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {step === "password" && (
                <PasswordStep
                  value={password}
                  onChange={setPassword}
                  onNext={() => setStep("totp")}
                  hint={t("setPassword.hint")}
                  passwordLabel={t("setPassword.password")}
                  nextLabel={t("setPassword.next")}
                />
              )}

              {step === "totp" && (
                <TotpEnroll
                  qrDataUrl={qrDataUrl}
                  secret={totpSecret}
                  value={totpToken}
                  onChange={setTotpToken}
                  onSubmit={complete}
                  submitting={submitting}
                  error={error}
                />
              )}

              {step === "recovery" && (
                <RecoveryCodesDisplay
                  codes={recoveryCodes}
                  onContinue={() => router.push("/supplier/login")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "password", label: "Password" },
    { id: "totp", label: "2FA" },
    { id: "recovery", label: "Recovery" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <ol className="mt-8 flex items-center justify-center gap-2">
      {steps.map((s, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <div
              className="size-7 rounded-full inline-flex items-center justify-center text-[12px] font-semibold tabular-nums transition-colors"
              style={{
                background: done
                  ? "var(--color-green-leaf)"
                  : active
                    ? "var(--color-ink)"
                    : "var(--color-cream-2)",
                color: done || active ? "white" : "var(--color-ink-mute)",
              }}
            >
              {done ? <Check className="size-3.5" /> : idx + 1}
            </div>
            <span
              className="text-[11px] uppercase tracking-[0.1em] font-semibold"
              style={{ color: active ? "var(--color-ink)" : "var(--color-ink-mute)" }}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className="w-6 h-px"
                style={{ background: idx < currentIdx ? "var(--color-green-leaf)" : "var(--color-line)" }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PasswordStep({
  value,
  onChange,
  onNext,
  hint,
  passwordLabel,
  nextLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  hint: string;
  passwordLabel: string;
  nextLabel: string;
}) {
  const tooShort = value.length < 8;
  return (
    <>
      <label className="block">
        <span
          className="text-[11px] uppercase tracking-[0.12em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {passwordLabel}
        </span>
        <div className="relative mt-1.5">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none"
            style={{ color: "var(--color-ink-mute)" }}
          />
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
            style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
          />
        </div>
        <span
          className="mt-2 inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <KeyRound className="size-3" />
          {hint}
        </span>
      </label>
      <button
        onClick={onNext}
        disabled={tooShort}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--color-cta)" }}
      >
        {nextLabel}
        <ArrowRight className="size-3.5" />
      </button>
    </>
  );
}
