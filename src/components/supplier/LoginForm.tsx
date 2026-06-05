"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, AlertCircle, Lock, Mail, Shield } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function LoginForm({ defaultRedirect = "/supplier" }: { defaultRedirect?: string } = {}) {
  const t = useTranslations("supplier.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      totp,
      useRecovery: useRecovery ? "true" : "false",
      redirect: false,
    });
    if (res?.error) {
      setError(t("invalid"));
      setSubmitting(false);
      return;
    }
    router.push(defaultRedirect);
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Field
        label={t("email")}
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label={t("password")}
        icon={Lock}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />
      <Field
        label={useRecovery ? t("recoveryCode") : t("totp")}
        icon={Shield}
        value={totp}
        onChange={setTotp}
        placeholder={useRecovery ? "ABCDE12345" : "000000"}
        autoComplete="one-time-code"
        inputMode={useRecovery ? "text" : "numeric"}
        required
      />
      <button
        type="button"
        onClick={() => setUseRecovery((x) => !x)}
        className="text-[12px] underline hover:no-underline transition-all text-left"
        style={{ color: "var(--color-ink-mute)" }}
      >
        {useRecovery ? t("useTotp") : t("useRecovery")}
      </button>

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
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--color-cta)" }}
      >
        {submitting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {t("submit")}
          </>
        ) : (
          <>
            {t("submit")}
            <ArrowRight className="size-3.5" />
          </>
        )}
      </button>
    </motion.form>
  );
}

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: typeof Mail;
}

function Field({ label, value, onChange, icon: Icon, ...rest }: FieldProps) {
  return (
    <label className="block">
      <span
        className="text-[11px] uppercase tracking-[0.12em] font-semibold"
        style={{ color: "var(--color-ink-mute)" }}
      >
        {label}
      </span>
      <div className="relative mt-1.5">
        {Icon && (
          <Icon
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none"
            style={{ color: "var(--color-ink-mute)" }}
          />
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
          className="w-full rounded-lg border py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
          style={{
            background: "var(--color-paper)",
            borderColor: "var(--color-line)",
            paddingLeft: Icon ? 36 : 12,
            paddingRight: 12,
          }}
        />
      </div>
    </label>
  );
}
