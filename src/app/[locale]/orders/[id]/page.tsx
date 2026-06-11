import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStatusTimeline } from "@/components/buyer/OrderStatusTimeline";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";
import { CatalogIcon } from "@/lib/catalog-icon";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();
  const order = await db.order.findFirst({
    where: { id, company: { createdByUserId: session.user.id } },
    include: { supplier: true, project: true, quote: { include: { lines: { include: { item: true } } } } },
  });
  if (!order) notFound();
  const t = await getTranslations("buyer.orderDetail");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>{order.id}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginTop: 8 }}>{order.supplier.name}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
        {t("delivery")}: {order.deliveryWindowStart.toLocaleDateString()} – {order.deliveryWindowEnd.toLocaleDateString()}
      </p>
      <p style={{ color: "var(--color-ink-soft)" }}>
        {t("total")}: <strong>{formatSek(order.totalAmount)}</strong>
      </p>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 32 }}>{t("status")}</h2>
      <OrderStatusTimeline status={order.status} />

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 32 }}>{t("items")}</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {order.quote.lines.map((l) => (
          <li key={l.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 60px 100px", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--color-line)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CatalogIcon item={l.item} className="size-5" />
            </div>
            <div>{l.item.name}</div>
            <div style={{ textAlign: "right", color: "var(--color-ink-mute)" }}>×{l.quantity}</div>
            <div style={{ textAlign: "right", fontWeight: 600 }}>{formatSek(l.lineTotal)}</div>
          </li>
        ))}
      </ul>

      {order.cancelReason && (
        <p style={{ marginTop: 24, padding: 16, background: "var(--color-cream-2)", borderRadius: 4, color: "var(--color-terracotta)" }}>
          {t("cancelled")}: {order.cancelReason}
        </p>
      )}
    </div>
  );
}
