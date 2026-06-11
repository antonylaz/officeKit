import { BookOpen, Inbox } from "lucide-react";
import { requireSupplier } from "@/lib/supplier-auth";
import { listSupplierTemplates } from "@/server/quote-templates";
import { TemplateList } from "@/components/supplier/TemplateList";

export default async function SupplierTemplatesPage() {
  const { supplierId } = await requireSupplier();
  const templates = await listSupplierTemplates(supplierId);

  return (
    <div>
      <div className="mb-8">
        <p
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <BookOpen className="size-3.5" />
          {templates.length} {templates.length === 1 ? "template" : "templates"}
        </p>
        <h1
          className="mt-2 text-4xl tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Quote templates
        </h1>
        <p className="mt-3 text-[14px] max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          Reusable pricing + notes + perks for similar projects. Save one from any RFQ in the
          builder; apply it back to future drafts to skip the typing.
        </p>
      </div>

      {templates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-mute)" }}
        >
          <Inbox className="size-9" />
          <div className="text-center max-w-sm">
            <p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
              No templates yet
            </p>
            <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
              On any RFQ in the builder, hit <strong>Save as template</strong> to stash the
              current pricing for later.
            </p>
          </div>
        </div>
      ) : (
        <TemplateList templates={templates.map(serializeTemplate)} />
      )}
    </div>
  );
}

// Strip Decimal/Date to JSON-serializable shapes for the client component
function serializeTemplate(t: {
  id: string;
  name: string;
  notes: string | null;
  perks: string[];
  useCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  lines: Array<{
    id: string;
    itemId: string;
    mode: "new" | "used";
    unitPrice: number;
    item: { id: string; name: string; icon: string | null; category: string; subcategory: string | null };
  }>;
}) {
  return {
    id: t.id,
    name: t.name,
    notes: t.notes,
    perks: t.perks,
    useCount: t.useCount,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    lines: t.lines,
  };
}
