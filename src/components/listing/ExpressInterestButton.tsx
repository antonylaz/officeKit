"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  listingId: string;
  companyName: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  label?: string;
}

export function ExpressInterestButton({ listingId, companyName, variant = "primary", size = "md", label }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? `inline-flex items-center gap-2 px-${size === "sm" ? 4 : 6} py-${size === "sm" ? 2 : 3} rounded-lg text-white text-${size === "sm" ? "[11px]" : "xs"} uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-all`
            : `inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] uppercase tracking-[0.08em] font-semibold transition-colors`
        }
        style={
          variant === "primary"
            ? { background: "var(--color-forest)" }
            : { borderColor: "var(--color-forest)", color: "var(--color-forest)" }
        }
      >
        <Send className={size === "sm" ? "size-3" : "size-3.5"} />
        {label ?? "Express interest"}
      </button>
      <ExpressInterestModal
        listingId={listingId}
        companyName={companyName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ExpressInterestModal({
  listingId,
  companyName,
  open,
  onClose,
}: {
  listingId: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    buyerName.trim().length > 0 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/listings/${listingId}/interest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerCompany: buyerCompany.trim() || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("Could not send. Try again in a moment.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
    // Reset state after exit animation
    setTimeout(() => {
      setBuyerName("");
      setBuyerEmail("");
      setBuyerCompany("");
      setMessage("");
      setSuccess(false);
      setError(null);
      setSubmitting(false);
    }, 300);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[110]"
            style={{ background: "rgba(15, 22, 18, 0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-5 pointer-events-none"
          >
            <div
              className="pointer-events-auto bg-white rounded-3xl max-w-lg w-full shadow-2xl"
              style={{ border: "1px solid var(--color-line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {success ? (
                <div className="p-10 text-center">
                  <div
                    className="mx-auto size-14 rounded-full inline-flex items-center justify-center"
                    style={{ background: "rgba(74, 107, 82, 0.15)", color: "var(--color-green-leaf)" }}
                  >
                    <CheckCircle2 className="size-7" />
                  </div>
                  <h2
                    className="mt-5 text-2xl tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Interest sent
                  </h2>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                    We&apos;ve notified {companyName}. They&apos;ll reply directly to <strong>{buyerEmail}</strong>{" "}
                    — usually within 24 hours.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-7 inline-flex items-center px-6 py-3 rounded-lg text-white text-xs uppercase tracking-[0.1em] font-semibold"
                    style={{ background: "var(--color-cta)" }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="p-7">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p
                        className="text-[11px] uppercase tracking-[0.14em] font-semibold"
                        style={{ color: "var(--color-forest)" }}
                      >
                        Express interest
                      </p>
                      <h2
                        className="mt-1 text-2xl tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {companyName}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 -mr-2 rounded-full hover:bg-accent/40 transition-colors"
                      aria-label="close"
                    >
                      <X className="size-5" style={{ color: "var(--color-ink-mute)" }} />
                    </button>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                    The seller will receive your message and reply directly to your email.
                    OfficeKit is not your contracting party — you&apos;re connecting directly.
                  </p>

                  <div className="mt-6 space-y-3">
                    <Field label="Your name" required>
                      <input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Anna Andersson"
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
                        style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
                      />
                    </Field>
                    <Field label="Email" required>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="anna@yourcompany.se"
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
                        style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
                      />
                    </Field>
                    <Field label="Company">
                      <input
                        value={buyerCompany}
                        onChange={(e) => setBuyerCompany(e.target.value)}
                        placeholder="Acme AB"
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
                        style={{ background: "var(--color-paper)", borderColor: "var(--color-line)" }}
                      />
                    </Field>
                    <Field label="Message">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="What are you interested in? Pickup timing, quantity, anything specific…"
                        className="w-full rounded-lg border p-3 text-sm leading-relaxed outline-none focus:ring-2 transition-shadow"
                        style={{
                          background: "var(--color-paper)",
                          borderColor: "var(--color-line)",
                          fontFamily: "var(--font-body)",
                        }}
                      />
                    </Field>
                  </div>

                  {error && (
                    <div
                      className="mt-4 flex items-start gap-2 p-3 rounded-lg border text-[13px]"
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

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-lg border text-xs uppercase tracking-[0.1em] font-semibold transition-colors hover:bg-accent/40"
                      style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit || submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-xs uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "var(--color-forest)" }}
                    >
                      {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      {submitting ? "Sending" : "Send to seller"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
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
