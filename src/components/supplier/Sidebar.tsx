import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export async function Sidebar() {
  const t = await getTranslations("supplier.nav");
  return (
    <nav style={{ background: "var(--color-cream)", borderRight: "1px solid var(--color-line)", padding: "32px 24px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24 }}>
        <span style={{ color: "var(--color-ink)" }}>office</span>
        <span style={{ color: "var(--color-terracotta)", fontWeight: 700 }}>kit.</span>
      </div>
      <ul style={{ marginTop: 32, listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        <li><Link href="/supplier" style={navLink}>{t("dashboard")}</Link></li>
        <li><Link href="/supplier/rfqs" style={navLink}>{t("rfqs")}</Link></li>
        <li><Link href="/supplier/orders" style={navLink}>{t("orders")}</Link></li>
        <li><Link href="/supplier/payouts" style={navLink}>{t("payouts")}</Link></li>
        <li><Link href="/supplier/settings" style={navLink}>{t("settings")}</Link></li>
      </ul>
    </nav>
  );
}

const navLink: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  color: "var(--color-ink)",
  textDecoration: "none",
  fontSize: 14,
  borderRadius: 4,
};
