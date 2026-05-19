import { requireSupplier } from "@/lib/supplier-auth";
import { listSupplierOrders } from "@/server/supplier-orders";
import { SupplierOrderRow } from "@/components/supplier/SupplierOrderRow";
import { getTranslations } from "next-intl/server";

export default async function SupplierOrdersPage() {
  const { supplierId } = await requireSupplier();
  const orders = await listSupplierOrders(supplierId);
  const t = await getTranslations("supplier.orders");
  return (
    <div style={{ maxWidth: 1280 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{orders.length} {t("total")}</p>
      <div style={{ marginTop: 32 }}>
        {orders.length === 0 && <p style={{ color: "var(--color-ink-mute)" }}>{t("empty")}</p>}
        {orders.map((o) => <SupplierOrderRow key={o.id} order={o} />)}
      </div>
    </div>
  );
}
