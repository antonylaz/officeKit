"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const EXAMPLES_SV = [
  "25-personers fintech-kontor i Stockholm, hybrid Tis/Tor",
  "10-personers kreativ studio i Göteborg",
  "Advokatbyrå med 4 delägarrum",
  "Hybrid SaaS-team, 40 skrivbord i Malmö",
];

const EXAMPLES_EN = [
  "25-person fintech office in Stockholm, hybrid Tue/Thu",
  "10-person creative studio in Göteborg",
  "Law firm with 4 partner offices",
  "Hybrid SaaS team, 40 desks in Malmö",
];

export function AiBuildForm({ locale, disabled }: { locale: string; disabled: boolean }) {
  const t = useTranslations("aiBuild");
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examples = locale === "sv" ? EXAMPLES_SV : EXAMPLES_EN;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || submitting || prompt.trim().length < 8) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/build-office", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) setError(t("errors.rateLimited"));
        else if (data.error === "hallucinated_ids") setError(t("errors.invalidProposal"));
        else if (data.error === "build_failed") setError(t("errors.buildFailed"));
        else setError(t("errors.generic"));
        setSubmitting(false);
        return;
      }
      router.push(`/projects/${data.projectId}/checklist`);
    } catch {
      setError(t("errors.offline"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 40 }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("placeholder")}
        rows={5}
        disabled={disabled || submitting}
        style={{
          width: "100%",
          background: "var(--color-cream)",
          border: "1px solid var(--color-line)",
          borderRadius: 6,
          padding: 16,
          fontFamily: "var(--font-body)",
          fontSize: 15,
          lineHeight: 1.5,
          resize: "vertical",
        }}
      />

      <p style={{ marginTop: 24, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>
        {t("tryThese")}
      </p>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setPrompt(example)}
            disabled={disabled || submitting}
            style={{
              padding: "8px 14px",
              border: "1px solid var(--color-line)",
              borderRadius: 100,
              background: "transparent",
              fontSize: 13,
              cursor: "pointer",
              color: "var(--color-ink)",
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ marginTop: 24, color: "var(--color-terracotta)", fontSize: 14 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={disabled || submitting || prompt.trim().length < 8}
        style={{
          marginTop: 32,
          padding: "16px 32px",
          background: disabled || submitting || prompt.trim().length < 8 ? "var(--color-ink-mute)" : "var(--color-terracotta)",
          color: "white",
          textTransform: "uppercase",
          fontSize: 12,
          letterSpacing: "0.1em",
          fontWeight: 600,
          border: "none",
          borderRadius: 4,
          cursor: disabled || submitting || prompt.trim().length < 8 ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? `${t("submitting")}…` : `${t("submit")} →`}
      </button>

      {submitting && (
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--color-ink-mute)" }}>{t("buildingHint")}</p>
      )}
    </form>
  );
}
