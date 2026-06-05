"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, AlertCircle } from "lucide-react";
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
  const isReady = prompt.trim().length >= 8 && !disabled && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady) return;
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
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-10"
    >
      <div
        className="relative rounded-2xl border bg-card overflow-hidden shadow-lg"
        style={{ borderColor: "var(--color-line)" }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("placeholder")}
          rows={4}
          disabled={disabled || submitting}
          className="w-full resize-none border-0 outline-none px-6 py-5 text-base leading-relaxed bg-transparent placeholder:text-muted-foreground/60 disabled:opacity-60"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
        />
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--color-line)", background: "var(--color-cream)" }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-ink-mute)" }}>
            <Sparkles className="size-3.5" style={{ color: "var(--color-terracotta)" }} />
            <span>{t("buildingHint")}</span>
          </div>
          <button
            type="submit"
            disabled={!isReady}
            className="inline-flex items-center gap-2 h-10 px-5 text-xs uppercase tracking-[0.12em] font-semibold rounded-lg text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:shadow-md"
            style={{
              background: isReady ? "var(--color-terracotta)" : "var(--color-ink-mute)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                {t("submit")}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-8"
      >
        <p className="text-xs uppercase tracking-[0.14em] mb-3" style={{ color: "var(--color-ink-mute)" }}>
          {t("tryThese")}
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example, i) => (
            <motion.button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              disabled={disabled || submitting}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              whileHover={{ y: -2 }}
              className="px-4 py-2 text-sm rounded-full border transition-colors hover:bg-accent/40 disabled:opacity-50"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
            >
              {example}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-start gap-3 p-4 rounded-lg border"
          style={{
            borderColor: "var(--color-terracotta)",
            background: "rgba(197, 85, 45, 0.06)",
            color: "var(--color-terracotta)",
          }}
        >
          <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}
    </motion.form>
  );
}
