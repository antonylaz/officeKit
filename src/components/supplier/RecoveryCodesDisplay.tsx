"use client";
import { useTranslations } from "next-intl";

export function RecoveryCodesDisplay({ codes, onContinue }: { codes: string[]; onContinue: () => void }) {
  const t = useTranslations("supplier.onboarding.recovery");
  function download() {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "officekit-recovery-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ color: "var(--color-ink-soft)" }}>{t("body")}</p>
      <pre style={{ marginTop: 16, padding: 24, background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 14, lineHeight: 1.8 }}>
        {codes.join("\n")}
      </pre>
      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <button onClick={download}
          style={{ background: "transparent", color: "var(--color-ink)", padding: "12px 24px", border: "1px solid var(--color-line)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {t("download")}
        </button>
        <button onClick={onContinue}
          style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {t("continue")} →
        </button>
      </div>
    </div>
  );
}
