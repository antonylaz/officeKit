"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "@/i18n/routing";

export function ResetPasswordForm({ token, locale }: { token: string; locale: "sv" | "en" }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const labels =
    locale === "sv"
      ? {
          password: "Nytt lösenord",
          confirm: "Bekräfta lösenord",
          submit: "Spara nytt lösenord",
          mismatch: "Lösenorden matchar inte.",
          weak: "Lösenordet måste vara minst 8 tecken.",
          generic: "Något gick fel. Försök igen.",
          successTitle: "Lösenordet är ändrat",
          successBody: "Du kan nu logga in med ditt nya lösenord.",
          signIn: "Logga in",
        }
      : {
          password: "New password",
          confirm: "Confirm password",
          submit: "Save new password",
          mismatch: "Passwords don't match.",
          weak: "Password must be at least 8 characters.",
          generic: "Something went wrong. Please try again.",
          successTitle: "Password updated",
          successBody: "You can sign in with your new password now.",
          signIn: "Sign in",
        };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(labels.weak);
      return;
    }
    if (password !== confirm) {
      setError(labels.mismatch);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/password-reset/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        setError(labels.generic);
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(labels.generic);
      setSubmitting(false);
    }
  }

  if (success) {
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
          {labels.successTitle}
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {labels.successBody}
        </p>
        <button
          onClick={() => router.push("/supplier/login")}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all"
          style={{ background: "var(--color-cta)" }}
        >
          {labels.signIn}
          <ArrowRight className="size-3.5" />
        </button>
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
      <PasswordField label={labels.password} value={password} onChange={setPassword} />
      <PasswordField label={labels.confirm} value={confirm} onChange={setConfirm} />
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
        disabled={submitting || password.length < 8 || password !== confirm}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--color-cta)" }}
      >
        {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {submitting ? labels.submit : labels.submit}
        {!submitting && <ArrowRight className="size-3.5" />}
      </button>
    </motion.form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span
        className="text-[11px] uppercase tracking-[0.12em] font-semibold"
        style={{ color: "var(--color-ink-mute)" }}
      >
        {label}
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
          required
          className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
        />
      </div>
    </label>
  );
}
