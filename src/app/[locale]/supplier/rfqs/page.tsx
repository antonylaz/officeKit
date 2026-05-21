import { requireSupplier } from "@/lib/supplier-auth";
import { listInbox } from "@/server/supplier-rfq";
import { RfqInbox } from "@/components/supplier/RfqInbox";
import { getTranslations } from "next-intl/server";
import type { RfqStatus } from "@prisma/client";

export default async function SupplierRfqsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supplierId } = await requireSupplier();
  const sp = await searchParams;
  const valid: Array<RfqStatus | "all"> = ["all", "sent", "viewed", "quoted", "won", "lost", "expired"];
  const statusParam = sp.status;
  const status = (statusParam && (valid as string[]).includes(statusParam) ? statusParam : "all") as RfqStatus | "all";
  const { rfqs, total } = await listInbox(supplierId, { status });
  const t = await getTranslations("supplier.inbox");
  return (
    <div className="max-w-[1280px]">
      <div>
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
          {total} {t("totalRequests")}
        </p>
        <h1
          className="mt-2 text-4xl tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          {t("title")}
        </h1>
      </div>
      <RfqInbox rfqs={rfqs} activeStatus={status} />
    </div>
  );
}
