import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/routing";
import { db } from "@/lib/db";
import { OrderRow } from "@/components/buyer/OrderRow";
import { getTranslations } from "next-intl/server";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect({ href: "/", locale: "sv" });
  const orders = await db.order.findMany({
    where: { company: { createdByUserId: session!.user!.id! } },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });
  const t = await getTranslations("buyer.orders");

  if (orders.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 64 }}>📦</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 16 }}>{t("emptyTitle")}</h1>
        <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: "48px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <div style={{ marginTop: 32 }}>
        {orders.map((o) => <OrderRow key={o.id} order={o} />)}
      </div>
    </div>
  );
}
