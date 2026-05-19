"use client";
import { useState } from "react";
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
      email, password, totp, useRecovery: useRecovery ? "true" : "false",
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
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
      <Field label={t("email")} type="email" value={email} onChange={setEmail} required />
      <Field label={t("password")} type="password" value={password} onChange={setPassword} required />
      <Field
        label={useRecovery ? t("recoveryCode") : t("totp")}
        value={totp}
        onChange={setTotp}
        placeholder={useRecovery ? "ABCDE12345" : "000000"}
        required
      />
      <button type="button" onClick={() => setUseRecovery((x) => !x)} style={{ background: "none", border: "none", color: "var(--color-ink-mute)", fontSize: 13, textAlign: "left", cursor: "pointer", padding: 0 }}>
        {useRecovery ? t("useTotp") : t("useRecovery")}
      </button>
      {error && <p style={{ color: "var(--color-terracotta)" }}>{error}</p>}
      <button type="submit" disabled={submitting}
        style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
        {submitting ? "…" : t("submit")} →
      </button>
    </form>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }} />
    </label>
  );
}
