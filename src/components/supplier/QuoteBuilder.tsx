"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Trophy, Check, ArrowRight, Loader2, X, Plus, AlertCircle } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import { QuoteLineRow } from "./QuoteLineRow";
import { QuoteTemplatesControl } from "./QuoteTemplatesControl";
import type { Rfq, Project, Company, Quote, QuoteLine, ItemCatalog, ProjectItem, ProductVariant } from "@prisma/client";

type RfqWithEverything = Rfq & {
  project: Project & {
    company: Company;
    items: (ProjectItem & { item: ItemCatalog; variant: ProductVariant | null })[];
  };
  quote: (Quote & { lines: (QuoteLine & { item: ItemCatalog; variant: ProductVariant | null })[] }) | null;
};

export function QuoteBuilder({ rfq, competitorCount }: { rfq: RfqWithEverything; competitorCount: number }) {
  const t = useTranslations("supplier.rfq");
  const router = useRouter();
  const submitted = rfq.quote?.submittedAt != null;
  const [lines, setLines] = useState(rfq.quote?.lines ?? []);
  const [notes, setNotes] = useState(rfq.quote?.notes ?? "");
  const [perks, setPerks] = useState<string[]>(rfq.quote?.perks ?? []);
  const [perkDraft, setPerkDraft] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = Math.round(subtotal * 1.25);

  useEffect(() => {
    if (submitted) return;
    const h = setTimeout(saveDraft, 30_000);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, notes, perks]);

  async function saveDraft() {
    const res = await fetch(`/api/v1/supplier/rfqs/${rfq.id}/quote`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, notes, perks }),
    });
    if (res.ok) setSavedAt(new Date());
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    await saveDraft();
    const res = await fetch(`/api/v1/supplier/rfqs/${rfq.id}/quote`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "submit_failed");
      setSubmitting(false);
      return;
    }
    router.push("/supplier/rfqs?status=quoted");
  }

  const deadlineDate = new Date(rfq.deadlineAt);
  const hoursLeft = Math.max(0, Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60)));
  const deadlineUrgent = hoursLeft < 24;

  return (
    <div
      className="max-w-[1280px] mx-auto px-8 py-12 grid gap-10"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 400px" }}
    >
      <div>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10"
        >
          <p
            className="text-xs uppercase tracking-[0.14em] inline-flex items-center gap-2"
            style={{ color: "var(--color-ink-mute)" }}
          >
            <span>{rfq.project.industry}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="size-3.5" />
              {competitorCount} {t("competitorsLabel")}
            </span>
          </p>
          <h1
            className="mt-2 text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {rfq.project.company.name}
          </h1>
          <div
            className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {rfq.project.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {rfq.project.headcount} {t("people")}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: deadlineUrgent ? "var(--color-terracotta)" : "var(--color-ink-soft)" }}
            >
              <Calendar className="size-3.5" />
              {t("deadline")} {deadlineDate.toLocaleString()}
              {deadlineUrgent && <span className="font-semibold">· {hoursLeft}h</span>}
            </span>
          </div>
        </motion.div>

        {/* Lines */}
        <section>
          <h2
            className="text-xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {t("builderTitle")}
          </h2>
          {!submitted && (
            <div className="mt-4">
              <QuoteTemplatesControl
                rfqId={rfq.id}
                currentLines={lines.map((l) => ({
                  itemId: l.itemId,
                  mode: l.mode,
                  unitPrice: l.unitPrice,
                  quantity: l.quantity,
                }))}
                currentNotes={notes}
                currentPerks={perks}
                onApplied={() => router.refresh()}
                disabled={submitted}
              />
            </div>
          )}
          <div className="mt-4">
            {lines.map((l, idx) => (
              <QuoteLineRow
                key={l.id}
                line={l}
                disabled={submitted}
                onChange={(patch) =>
                  setLines((arr) =>
                    arr.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            ...patch,
                            lineTotal: (patch.unitPrice ?? x.unitPrice) * (patch.quantity ?? x.quantity),
                          }
                        : x,
                    ),
                  )
                }
                onRemove={() => setLines((arr) => arr.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="mt-10">
          <h3
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {t("notes")}
          </h3>
          <textarea
            disabled={submitted}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Lead time, delivery details, payment terms…"
            className="mt-3 w-full rounded-xl border p-4 text-sm leading-relaxed outline-none focus:ring-2 transition-shadow"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
              fontFamily: "var(--font-body)",
            }}
          />
        </section>

        {/* Perks */}
        <section className="mt-10">
          <h3
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {t("perks")}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {perks.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "var(--color-cream-2)", color: "var(--color-ink)" }}
              >
                {p}
                {!submitted && (
                  <button
                    onClick={() => setPerks(perks.filter((_, ix) => ix !== i))}
                    className="hover:bg-white/40 rounded-full p-0.5 transition-colors"
                    aria-label="remove perk"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
            {!submitted && (
              <span className="inline-flex items-center gap-1">
                <input
                  value={perkDraft}
                  onChange={(e) => setPerkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && perkDraft) {
                      e.preventDefault();
                      setPerks([...perks, perkDraft]);
                      setPerkDraft("");
                    }
                  }}
                  placeholder={t("addPerk")}
                  className="rounded-full border px-3 py-1.5 text-xs outline-none focus:ring-2 transition-shadow"
                  style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
                />
                <button
                  onClick={() => {
                    if (perkDraft) {
                      setPerks([...perks, perkDraft]);
                      setPerkDraft("");
                    }
                  }}
                  className="size-7 inline-flex items-center justify-center rounded-full border transition-colors hover:bg-accent/40"
                  style={{ borderColor: "var(--color-line)" }}
                  aria-label="add perk"
                >
                  <Plus className="size-3.5" style={{ color: "var(--color-ink-soft)" }} />
                </button>
              </span>
            )}
          </div>
        </section>
      </div>

      {/* Sticky totals sidebar */}
      <aside className="sticky top-8 self-start">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl border p-6 shadow-sm"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {t("totals")}
          </p>

          <div className="mt-4 space-y-2">
            <Row label={t("subtotal")} value={formatSek(subtotal)} />
            <Row label={t("vat")} value={formatSek(total - subtotal)} muted />
          </div>

          <hr className="my-5" style={{ borderColor: "var(--color-line)" }} />

          <div className="flex items-baseline justify-between">
            <span className="text-base" style={{ fontFamily: "var(--font-display)" }}>
              {t("total")}
            </span>
            <span
              className="text-3xl tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-terracotta)" }}
            >
              {formatSek(total)}
            </span>
          </div>

          {savedAt && !submitted && (
            <p
              className="mt-5 text-[11px] inline-flex items-center gap-1.5"
              style={{ color: "var(--color-ink-mute)" }}
            >
              <Check className="size-3" />
              {t("savedAt")} {savedAt.toLocaleTimeString()}
            </p>
          )}

          {submitted && (
            <p
              className="mt-5 text-[13px] inline-flex items-center gap-1.5"
              style={{ color: "var(--color-green-leaf)" }}
            >
              <Check className="size-3.5" />
              {t("submitted")}
            </p>
          )}

          {error && (
            <p
              className="mt-5 text-[13px] inline-flex items-start gap-1.5"
              style={{ color: "var(--color-terracotta)" }}
            >
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {!submitted && (
            <div className="mt-6 grid gap-2">
              <button
                onClick={saveDraft}
                className="px-6 py-3 rounded-lg border text-xs uppercase tracking-[0.1em] font-semibold transition-colors hover:bg-accent/40"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
              >
                {t("saveDraft")}
              </button>
              <button
                onClick={submit}
                disabled={submitting || lines.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white text-xs uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--color-cta)" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Submitting
                  </>
                ) : (
                  <>
                    {t("submitQuote")}
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </aside>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className="text-[13px]"
        style={{ color: muted ? "var(--color-ink-mute)" : "var(--color-ink)" }}
      >
        {label}
      </span>
      <span
        className="text-[14px] tabular-nums"
        style={{ color: muted ? "var(--color-ink-mute)" : "var(--color-ink)" }}
      >
        {value}
      </span>
    </div>
  );
}
