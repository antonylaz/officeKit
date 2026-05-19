import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { db } from "@/lib/db";
import { OrderConfirmForm } from "@/components/buyer/OrderConfirmForm";
import { getTranslations } from "next-intl/server";
import { formatSek } from "@/lib/money";

export default async function ConfirmOrderPage({ params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const { id, quoteId } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const quote = await db.quote.findFirst({
    where: { id: quoteId, rfq: { is: { projectId: id } }, submittedAt: { not: null } },
    include: { rfq: { include: { supplier: true } } },
  });
  if (!quote) notFound();
  const company = await db.company.findUnique({ where: { id: project.companyId } });
  const t = await getTranslations("buyer.confirm");

  return (
    <div data-industry={project.industry} style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
        {t("supplier")}: <strong>{quote.rfq.supplier.name}</strong> · {formatSek(quote.totalAmount)}
      </p>
      <OrderConfirmForm
        projectId={id}
        quoteId={quoteId}
        defaultCity={project.city}
        defaultCompanyName={company?.name ?? ""}
        defaultOrgNumber={company?.orgNumber ?? ""}
      />
    </div>
  );
}
