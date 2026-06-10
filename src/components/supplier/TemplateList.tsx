"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Calendar, Hash, Package } from "lucide-react";
import { toSek } from "@/lib/money";

interface Template {
  id: string;
  name: string;
  notes: string | null;
  perks: string[];
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  lines: Array<{
    id: string;
    itemId: string;
    mode: "new" | "used";
    unitPrice: number;
    item: { id: string; name: string; icon: string | null };
  }>;
}

export function TemplateList({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/supplier/quote-templates/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {templates.map((t) => {
          const expanded = expandedId === t.id;
          const subtotal = t.lines.reduce((s, l) => s + l.unitPrice, 0); // sum of unit prices, no quantities here
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: "var(--color-line)" }}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : t.id)}
                className="w-full text-left p-4 flex items-center gap-4 transition-colors hover:bg-accent/20"
                aria-expanded={expanded}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] truncate">{t.name}</h3>
                  <div
                    className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px]"
                    style={{ color: "var(--color-ink-mute)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Package className="size-3" />
                      {t.lines.length} {t.lines.length === 1 ? "line" : "lines"}
                    </span>
                    {t.useCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Hash className="size-3" />
                        used {t.useCount}×
                      </span>
                    )}
                    {t.lastUsedAt && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(t.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id, t.name);
                  }}
                  role="button"
                  aria-label="delete template"
                  className="size-9 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors shrink-0"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  {deletingId === t.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      className="px-4 pb-4 pt-2 border-t"
                      style={{ borderColor: "var(--color-line)" }}
                    >
                      {/* Lines */}
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr
                            className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold"
                            style={{ color: "var(--color-ink-mute)" }}
                          >
                            <th className="py-2">Item</th>
                            <th className="py-2">Mode</th>
                            <th className="py-2 text-right">Unit price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.lines.map((l) => (
                            <tr
                              key={l.id}
                              className="border-t"
                              style={{ borderColor: "var(--color-line)" }}
                            >
                              <td className="py-2 inline-flex items-center gap-2">
                                <span className="text-lg">{l.item.icon}</span>
                                <span>{l.item.name}</span>
                              </td>
                              <td className="py-2 lowercase">{l.mode}</td>
                              <td className="py-2 text-right tabular-nums">
                                {toSek(l.unitPrice).toLocaleString("sv-SE")} kr
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr
                            className="border-t font-semibold"
                            style={{ borderColor: "var(--color-ink)" }}
                          >
                            <td className="py-2" colSpan={2}>
                              Sum of unit prices
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {toSek(subtotal).toLocaleString("sv-SE")} kr
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      {t.perks.length > 0 && (
                        <div className="mt-4">
                          <p
                            className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-1.5"
                            style={{ color: "var(--color-ink-mute)" }}
                          >
                            Perks
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {t.perks.map((p) => (
                              <span
                                key={p}
                                className="text-[11px] px-2 py-0.5 rounded-full"
                                style={{
                                  background: "var(--color-cream-2)",
                                  color: "var(--color-ink-soft)",
                                }}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {t.notes && (
                        <div className="mt-4">
                          <p
                            className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-1"
                            style={{ color: "var(--color-ink-mute)" }}
                          >
                            Notes
                          </p>
                          <p
                            className="text-[13px] italic leading-relaxed"
                            style={{ color: "var(--color-ink-soft)" }}
                          >
                            &quot;{t.notes}&quot;
                          </p>
                        </div>
                      )}

                      <p
                        className="mt-4 text-[11px]"
                        style={{ color: "var(--color-ink-mute)" }}
                      >
                        Saved {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
