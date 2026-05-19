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
    <div style={{ maxWidth: 1280 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{total} {t("totalRequests")}</p>
      <RfqInbox rfqs={rfqs} activeStatus={status} />
    </div>
  );
}
