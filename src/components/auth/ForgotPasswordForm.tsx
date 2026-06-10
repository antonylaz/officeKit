"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm({ locale }: { locale: "sv" | "en" }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const labels =
    locale === "sv"
      ? {
          email: "E-postadress",
          placeholder: "du@företaget.se",
          send: "Skicka länk",
          sentTitle: "Kolla din inkorg",
          sentBody:
            "Om din e-post finns i vårt system har vi skickat en återställningslänk. Länken är giltig i 30 minuter.",
        }
      : {
          email: "Email",
          placeholder: "you@company.com",
          send: "Send link",
          sentTitle: "Check your inbox",
          sentBody:
            "If your email is in our system, we've sent a reset link. The link is valid for 30 minutes.",
        };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), locale }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-2">
        <div
          className="mx-auto size-12 rounded-full inline-flex items-center justify-center"
          style={{ background: "rgba(74, 107, 82, 0.15)", color: "var(--color-green-leaf)" }}
        >
          <CheckCircle2 className="size-6" />
        </div>
        <h2
          className="mt-4 text-2xl tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {labels.sentTitle}
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {labels.sentBody}
        </p>
      </div>
    );
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
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
    </motion.form>
  );
}
