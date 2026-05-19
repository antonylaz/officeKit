"use client";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import { QuoteLineRow } from "./QuoteLineRow";
import type { Rfq, Project, Company, Quote, QuoteLine, ItemCatalog, ProjectItem } from "@prisma/client";

type RfqWithEverything = Rfq & {
  project: Project & { company: Company; items: (ProjectItem & { item: ItemCatalog })[] };
  quote: (Quote & { lines: (QuoteLine & { item: ItemCatalog })[] }) | null;
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
    if (!res.ok) { setError(data.error ?? "submit_failed"); setSubmitting(false); return; }
    router.push("/supplier/rfqs?status=quoted");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 48, maxWidth: 1280 }}>
      <div>
        <p style={{ color: "var(--color-ink-mute)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{rfq.project.industry} · {competitorCount} {t("competitorsLabel")}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, marginTop: 8 }}>{rfq.project.company.name}</h1>
        <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
          {rfq.project.city} · {rfq.project.headcount} {t("people")} · {t("deadline")} {new Date(rfq.deadlineAt).toLocaleString()}
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 40 }}>{t("builderTitle")}</h2>
        <div style={{ marginTop: 16 }}>
          {lines.map((l, idx) => (
            <QuoteLineRow
              key={l.id}
              line={l}
              disabled={submitted}
              onChange={(patch) => setLines((arr) => arr.map((x, i) => i === idx ? { ...x, ...patch, lineTotal: (patch.unitPrice ?? x.unitPrice) * (patch.quantity ?? x.quantity) } : x))}
              onRemove={() => setLines((arr) => arr.filter((_, i) => i !== idx))}
            />
          ))}
        </div>

        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 32 }}>{t("notes")}</h3>
        <textarea disabled={submitted} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
          style={{ marginTop: 8, width: "100%", background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 12, fontFamily: "var(--font-body)", fontSize: 14 }} />

        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 32 }}>{t("perks")}</h3>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {perks.map((p, i) => (
            <span key={i} style={{ padding: "6px 12px", background: "var(--color-cream-2)", borderRadius: 100, fontSize: 12 }}>
              {p} {!submitted && <button onClick={() => setPerks(perks.filter((_, ix) => ix !== i))} style={{ marginLeft: 8, border: "none", background: "transparent", cursor: "pointer" }}>×</button>}
            </span>
          ))}
          {!submitted && (
            <span style={{ display: "inline-flex", gap: 4 }}>
              <input value={perkDraft} onChange={(e) => setPerkDraft(e.target.value)} placeholder={t("addPerk")}
                style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "4px 8px", fontSize: 12 }} />
              <button onClick={() => { if (perkDraft) { setPerks([...perks, perkDraft]); setPerkDraft(""); } }}
                style={{ background: "transparent", border: "1px solid var(--color-line)", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>+</button>
            </span>
          )}
        </div>
      </div>

      <aside style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 32, height: "fit-content", position: "sticky", top: 32 }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>{t("totals")}</p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <span>{t("subtotal")}</span><span>{formatSek(subtotal)}</span>
        </div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", color: "var(--color-ink-mute)" }}>
          <span>{t("vat")}</span><span>{formatSek(total - subtotal)}</span>
        </div>
        <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "16px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{t("total")}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-terracotta)" }}>{formatSek(total)}</span>
        </div>
        {savedAt && !submitted && <p style={{ marginTop: 16, fontSize: 11, color: "var(--color-ink-mute)" }}>{t("savedAt")} {savedAt.toLocaleTimeString()}</p>}
        {submitted && <p style={{ marginTop: 16, fontSize: 13, color: "var(--color-green-leaf)" }}>{t("submitted")}</p>}
        {error && <p style={{ marginTop: 16, color: "var(--color-terracotta)" }}>{error}</p>}
        {!submitted && (
          <div style={{ display: "grid", gap: 8, marginTop: 24 }}>
            <button onClick={saveDraft}
              style={{ background: "transparent", color: "var(--color-ink)", padding: "12px 24px", border: "1px solid var(--color-line)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
              {t("saveDraft")}
            </button>
            <button onClick={submit} disabled={submitting || lines.length === 0}
              style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
              {submitting ? "…" : t("submitQuote")} →
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
