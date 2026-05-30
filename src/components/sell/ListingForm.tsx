"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

type Condition = "like_new" | "good" | "fair" | "worn";
type Reason = "closing" | "downsizing" | "moving" | "refurbishing" | "other";

interface Line {
  description: string;
  quantity: number;
  condition: Condition;
  askingPriceSek: string; // string for input control
}

const CONDITIONS: Condition[] = ["like_new", "good", "fair", "worn"];
const REASONS: Reason[] = ["closing", "downsizing", "moving", "refurbishing", "other"];

const blankLine = (): Line => ({ description: "", quantity: 1, condition: "good", askingPriceSek: "" });

export function ListingForm() {
  const t = useTranslations("sell.form");
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [reason, setReason] = useState<Reason>("closing");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    companyName.trim().length > 0 &&
    contactName.trim().length > 0 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail) &&
    city.trim().length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.description.trim().length > 0 && l.quantity > 0);

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((arr) => arr.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((arr) => [...arr, blankLine()]);
  }
  function removeLine(idx: number) {
    setLines((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sell/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
          city: city.trim(),
          moveOutDate: moveOutDate || null,
          reason,
          notes: notes.trim() || null,
          items: lines.map((l) => ({
            description: l.description.trim(),
            quantity: l.quantity,
            condition: l.condition,
            askingPriceSek: l.askingPriceSek ? Number(l.askingPriceSek) : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("errors.submit"));
        setSubmitting(false);
        return;
      }
      router.push(`/sell/${data.id}/thanks`);
    } catch {
      setError(t("errors.network"));
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      {/* Section: company + contact */}
      <Section title={t("sections.company")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t("fields.companyName")} required>
            <Input value={companyName} onChange={setCompanyName} placeholder="Acme AB" />
          </Field>
          <Field label={t("fields.city")} required>
            <Input value={city} onChange={setCity} placeholder="Stockholm" />
          </Field>
          <Field label={t("fields.contactName")} required>
            <Input value={contactName} onChange={setContactName} placeholder="Anna Andersson" />
          </Field>
          <Field label={t("fields.contactEmail")} required>
            <Input type="email" value={contactEmail} onChange={setContactEmail} placeholder="anna@acme.se" />
          </Field>
          <Field label={t("fields.contactPhone")}>
            <Input value={contactPhone} onChange={setContactPhone} placeholder="+46 70 123 45 67" />
          </Field>
          <Field label={t("fields.moveOutDate")}>
            <Input type="date" value={moveOutDate} onChange={setMoveOutDate} />
          </Field>
        </div>
        <Field label={t("fields.reason")}>
          <div className="flex flex-wrap gap-2 mt-1">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="px-3.5 py-1.5 rounded-full text-xs uppercase tracking-[0.1em] font-semibold border transition-colors"
                style={{
                  borderColor: reason === r ? "transparent" : "var(--color-line)",
                  background: reason === r ? "var(--color-ink)" : "transparent",
                  color: reason === r ? "white" : "var(--color-ink-soft)",
                }}
              >
                {t(`reason.${r}`)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Section: items */}
      <Section title={t("sections.items")} description={t("sections.itemsHint")}>
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <LineRow
              key={idx}
              line={line}
              onChange={(patch) => setLine(idx, patch)}
              onRemove={lines.length > 1 ? () => removeLine(idx) : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition-colors hover:bg-accent/40"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
        >
          <Plus className="size-4" />
          {t("addItem")}
        </button>
      </Section>

      {/* Section: notes */}
      <Section title={t("sections.notes")} description={t("sections.notesHint")}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={t("fields.notesPlaceholder")}
          className="w-full rounded-xl border p-4 text-sm leading-relaxed outline-none focus:ring-2 transition-shadow"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-line)", fontFamily: "var(--font-body)" }}
        />
      </Section>

      {/* Footer */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-lg border"
          style={{ borderColor: "var(--color-terracotta)", background: "rgba(184, 66, 28, 0.06)", color: "var(--color-terracotta)" }}
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--color-line)" }}>
        <p className="text-xs" style={{ color: "var(--color-ink-mute)" }}>
          {t("submitHint")}
        </p>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--color-cta)" }}
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {submitting ? t("submitting") : t("submit")}
          {!submitting && <ArrowRight className="size-3.5" />}
        </button>
      </div>
    </motion.form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="text-xl tracking-tight"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          {description}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="text-[11px] uppercase tracking-[0.12em] font-semibold"
        style={{ color: "var(--color-ink-mute)" }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: "var(--color-terracotta)" }}>
            *
          </span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input({
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
    />
  );
}

function LineRow({
  line,
  onChange,
  onRemove,
}: {
  line: Line;
  onChange: (patch: Partial<Line>) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations("sell.form");
  return (
    <div
      className="flex flex-wrap items-end gap-3 p-4 rounded-xl border bg-white"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div className="flex-1 min-w-[200px]">
        <Field label={t("fields.itemDescription")} required>
          <Input
            value={line.description}
            onChange={(v) => onChange({ description: v })}
            placeholder="e.g. Kinnarps Oberon sit-stand desk 160×80"
          />
        </Field>
      </div>
      <div className="w-20">
        <Field label={t("fields.quantity")} required>
          <Input
            type="number"
            value={String(line.quantity)}
            onChange={(v) => onChange({ quantity: Math.max(1, Number(v) || 1) })}
          />
        </Field>
      </div>
      <div className="w-36">
        <Field label={t("fields.condition")} required>
          <select
            value={line.condition}
            onChange={(e) => onChange({ condition: e.target.value as Condition })}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {t(`condition.${c}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="w-32">
        <Field label={t("fields.askingPrice")}>
          <Input
            type="number"
            value={line.askingPriceSek}
            onChange={(v) => onChange({ askingPriceSek: v })}
            placeholder="SEK"
          />
        </Field>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="remove item"
          className="size-10 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-destructive/10"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
