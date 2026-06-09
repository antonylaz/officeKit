"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { Mail, Loader2, ArrowRight, AlertCircle } from "lucide-react";

interface Props {
  callbackUrl: string;
  bankidEnabled: boolean;
  bankidLabel: string;
  bankidUnavailable: string;
  orDivider: string;
  locale: "sv" | "en";
}

export function SignInForm({
  callbackUrl,
  bankidEnabled,
  bankidLabel,
  bankidUnavailable,
  orDivider,
  locale,
}: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bankidLoading, setBankidLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels =
    locale === "sv"
      ? { email: "E-postadress", placeholder: "du@företaget.se", send: "Skicka länk", error: "Kunde inte skicka — försök igen." }
      : { email: "Email", placeholder: "you@company.com", send: "Send link", error: "Couldn't send — try again." };

  async function onMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn("resend", {
        email: email.trim().toLowerCase(),
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError(labels.error);
        setSubmitting(false);
        return;
      }
      // On success, redirect to the same page with `?sent=1` to show the confirmation state
      const url = new URL(window.location.href);
      url.searchParams.set("sent", "1");
      window.location.href = url.toString();
    } catch {
      setError(labels.error);
      setSubmitting(false);
    }
  }

  async function onBankIdSubmit() {
    setBankidLoading(true);
    setError(null);
    await signIn("bankid-se", { callbackUrl });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Magic link form */}
      <form onSubmit={onMagicSubmit} className="space-y-3">
        <label className="block">
          <span
            className="text-[11px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {labels.email}
          </span>
          <div className="relative mt-1.5">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none"
              style={{ color: "var(--color-ink-mute)" }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.placeholder}
              autoComplete="email"
              required
              className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
              style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
            />
          </div>
        </label>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-lg border text-[13px]"
            style={{
              borderColor: "var(--color-terracotta)",
              background: "rgba(184, 66, 28, 0.06)",
              color: "var(--color-terracotta)",
            }}
          >
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={submitting || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--color-cta)" }}
        >
          {submitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {labels.send}
            </>
          ) : (
            <>
              {labels.send}
              <ArrowRight className="size-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--color-line)" }} />
        <span
          className="text-[11px] uppercase tracking-[0.14em]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {orDivider}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--color-line)" }} />
      </div>

      {/* BankID button */}
      <button
        onClick={onBankIdSubmit}
        disabled={!bankidEnabled || bankidLoading}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border text-xs uppercase tracking-[0.12em] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-accent/40"
        style={{
          borderColor: "var(--color-ink)",
          color: "var(--color-ink)",
          background: "white",
        }}
      >
        {bankidLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <BankIdIcon />
        )}
        {bankidLabel}
      </button>
      {!bankidEnabled && (
        <p
          className="text-[11px] text-center"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {bankidUnavailable}
        </p>
      )}
    </motion.div>
  );
}

function BankIdIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="24" height="24" rx="4" fill="currentColor" opacity="0.08" />
      <path
        d="M6 7h4.5c1.5 0 2.5 1 2.5 2.3 0 .8-.4 1.5-1 1.9.9.3 1.5 1.1 1.5 2 0 1.5-1.1 2.5-2.7 2.5H6V7Zm2 3h2.2c.7 0 1.1-.3 1.1-.9 0-.5-.4-.9-1.1-.9H8v1.8Zm0 4h2.4c.8 0 1.3-.4 1.3-1 0-.7-.5-1-1.3-1H8v2Zm7-7h2v9h-2V7Z"
        fill="currentColor"
      />
    </svg>
  );
}
