import { requireSupplier } from "@/lib/supplier-auth";
import { listPayouts } from "@/server/supplier-payouts";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";

export default async function SupplierPayoutsPage() {
  const { supplierId } = await requireSupplier();
  const payouts = await listPayouts(supplierId);
  const t = await getTranslations("supplier.payouts");

  return (
    <div style={{ maxWidth: 1024 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{payouts.length} {t("total")}</p>
      <div style={{ marginTop: 32 }}>
        {payouts.length === 0 && <p style={{ color: "var(--color-ink-mute)" }}>{t("empty")}</p>}
        {payouts.map((p) => (
          <div key={p.orderId} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 120px 120px 100px", gap: 16, padding: 16, borderBottom: "1px solid var(--color-line)", alignItems: "center", fontSize: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>{p.orderId.slice(0, 8)}</div>
            <div style={{ color: "var(--color-ink-mute)", fontSize: 12 }}>{p.transferId ?? "—"}</div>
            <div style={{ textAlign: "right" }}>{formatSek(p.gross)}</div>
            <div style={{ textAlign: "right", color: "var(--color-ink-mute)" }}>−{formatSek(p.commission)}</div>
            <div style={{ textAlign: "right", fontWeight: 600 }}>{formatSek(p.net)}</div>
            <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11, fontWeight: 600, color: p.status === "paid" ? "var(--color-green-leaf)" : p.status === "processing" ? "var(--color-gold)" : "var(--color-ink-mute)" }}>{t(`status.${p.status}`)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
