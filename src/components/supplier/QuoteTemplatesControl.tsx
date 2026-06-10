"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Save, Trash2, Loader2, X, ChevronDown, AlertCircle, Check } from "lucide-react";

interface TemplateLine {
  itemId: string;
  mode: "new" | "used";
  unitPrice: number;
  item: { id: string; name: string; icon: string | null };
}

interface Template {
  id: string;
  name: string;
  notes: string | null;
  perks: string[];
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  lines: TemplateLine[];
}

interface DraftLine {
  itemId: string;
  mode: "new" | "used";
  unitPrice: number;
  quantity: number;
}

interface Props {
  rfqId: string;
  /** Current draft lines (used for "Save as template"). Use the live lines state from QuoteBuilder. */
  currentLines: DraftLine[];
  currentNotes: string;
  currentPerks: string[];
  /** Called after a template is successfully applied — should refresh the page so new lines render */
  onApplied: () => void;
  disabled?: boolean;
}

export function QuoteTemplatesControl({
  rfqId,
  currentLines,
  currentNotes,
  currentPerks,
  onApplied,
  disabled,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadOpen, setLoadOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/supplier/quote-templates")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTemplates(d.templates ?? []);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="rounded-xl border p-3 flex flex-wrap items-center gap-2"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold mr-2"
        style={{ color: "var(--color-ink-mute)" }}
      >
        <BookOpen className="size-3.5" />
        Templates
      </span>

      <button
        type="button"
        onClick={() => setLoadOpen(true)}
        disabled={disabled || loading || templates.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <ChevronDown className="size-3" />
        )}
        Load template
        {templates.length > 0 && (
          <span
            className="ml-1 text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)" }}
          >
            {templates.length}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => setSaveOpen(true)}
        disabled={disabled || currentLines.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      >
        <Save className="size-3" />
        Save as template
      </button>

      {/* Load modal */}
      <LoadTemplatesModal
        open={loadOpen}
        templates={templates}
        rfqId={rfqId}
        onClose={() => setLoadOpen(false)}
        onApplied={() => {
          setLoadOpen(false);
          onApplied();
        }}
        onDeleted={(id) => setTemplates((tt) => tt.filter((t) => t.id !== id))}
      />

      {/* Save modal */}
      <SaveTemplateModal
        open={saveOpen}
        currentLines={currentLines}
        currentNotes={currentNotes}
        currentPerks={currentPerks}
        existingNames={templates.map((t) => t.name)}
        onClose={() => setSaveOpen(false)}
        onSaved={(t) => {
          setTemplates((tt) => {
            const idx = tt.findIndex((x) => x.id === t.id);
            return idx >= 0 ? [t, ...tt.filter((x) => x.id !== t.id)] : [t, ...tt];
          });
          setSaveOpen(false);
        }}
      />
    </div>
  );
}

// ──────────────────── Load modal ────────────────────

function LoadTemplatesModal({
  open,
  templates,
  rfqId,
  onClose,
  onApplied,
  onDeleted,
}: {
  open: boolean;
  templates: Template[];
  rfqId: string;
  onClose: () => void;
  onApplied: () => void;
  onDeleted: (id: string) => void;
}) {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(id: string) {
    setApplyingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/supplier/rfqs/${rfqId}/apply-template`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "template_does_not_match_project"
            ? "This template's items don't match the project."
            : "Couldn't apply — try again.",
        );
        setApplyingId(null);
        return;
      }
      onApplied();
    } catch {
      setError("Network error.");
      setApplyingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    await fetch(`/api/v1/supplier/quote-templates/${id}`, { method: "DELETE" });
    setDeletingId(null);
    onDeleted(id);
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Load template" subtitle="Picks pricing + notes; buyer's quantities are preserved.">
      {error && (
        <div
          className="mb-3 flex items-start gap-2 p-3 rounded-lg border text-[13px]"
          style={{
            borderColor: "var(--color-terracotta)",
            background: "rgba(184, 66, 28, 0.06)",
            color: "var(--color-terracotta)",
          }}
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-3 rounded-xl border bg-white"
            style={{ borderColor: "var(--color-line)" }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[14px] truncate">{t.name}</p>
              <p
                className="mt-0.5 text-[12px] truncate"
                style={{ color: "var(--color-ink-mute)" }}
              >
                {t.lines.length} {t.lines.length === 1 ? "line" : "lines"}
                {t.useCount > 0 && ` · used ${t.useCount}×`}
                {t.lastUsedAt && ` · last ${new Date(t.lastUsedAt).toLocaleDateString()}`}
              </p>
            </div>
            <button
              onClick={() => apply(t.id)}
              disabled={applyingId !== null}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[11px] uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              style={{ background: "var(--color-cta)" }}
            >
              {applyingId === t.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Apply
            </button>
            <button
              onClick={() => remove(t.id)}
              disabled={deletingId !== null}
              aria-label="delete"
              className="size-8 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
              style={{ color: "var(--color-ink-mute)" }}
            >
              {deletingId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

// ──────────────────── Save modal ────────────────────

function SaveTemplateModal({
  open,
  currentLines,
  currentNotes,
  currentPerks,
  existingNames,
  onClose,
  onSaved,
}: {
  open: boolean;
  currentLines: DraftLine[];
  currentNotes: string;
  currentPerks: string[];
  existingNames: string[];
  onClose: () => void;
  onSaved: (t: Template) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the modal opens. setState in effect is intentional —
  // this synchronizes form state with the open/close lifecycle.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/supplier/quote-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          notes: currentNotes || null,
          perks: currentPerks,
          // Strip quantity from the saved template — quantity belongs to the buyer's project
          lines: currentLines.map((l) => ({
            itemId: l.itemId,
            mode: l.mode,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Couldn't save — try again.");
        setSubmitting(false);
        return;
      }
      onSaved(data.template);
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  const replacing = existingNames.includes(name.trim()) && name.trim().length > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Save as template"
      subtitle={`${currentLines.length} ${currentLines.length === 1 ? "line" : "lines"} · prices + notes + perks (quantities are not saved)`}
    >
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span
            className="text-[11px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            Template name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard IT office (Stockholm)"
            autoFocus
            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
            style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
            maxLength={80}
          />
        </label>

        {replacing && (
          <p
            className="text-[12px] flex items-start gap-1.5"
            style={{ color: "var(--color-gold)" }}
          >
            <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
            A template with this name exists — saving will replace it.
          </p>
        )}

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg border text-[13px]"
            style={{
              borderColor: "var(--color-terracotta)",
              background: "rgba(184, 66, 28, 0.06)",
              color: "var(--color-terracotta)",
            }}
          >
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border text-[12px] font-medium transition-colors hover:bg-accent/40"
            style={{ borderColor: "var(--color-line)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-white text-[11px] uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            style={{ background: "var(--color-cta)" }}
          >
            {submitting ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
            {replacing ? "Replace" : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ──────────────────── Shared modal shell ────────────────────

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[110]"
            style={{ background: "rgba(15, 22, 18, 0.5)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-5 pointer-events-none"
          >
            <div
              className="pointer-events-auto bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6"
              style={{ border: "1px solid var(--color-line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2
                    className="text-xl tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p
                      className="mt-1 text-[12px]"
                      style={{ color: "var(--color-ink-mute)" }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="close"
                  className="p-1.5 -mt-1 -mr-1 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <X className="size-4" style={{ color: "var(--color-ink-mute)" }} />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
