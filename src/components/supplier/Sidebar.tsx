import { LayoutDashboard, Inbox, ShoppingBag, Wallet, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { SupplierSidebarClient } from "./SidebarClient";

export async function Sidebar() {
  const t = await getTranslations("supplier.nav");
  const items = [
    { href: "/supplier", label: t("dashboard"), icon: "dashboard" },
    { href: "/supplier/rfqs", label: t("rfqs"), icon: "rfqs" },
    { href: "/supplier/orders", label: t("orders"), icon: "orders" },
    { href: "/supplier/payouts", label: t("payouts"), icon: "payouts" },
    { href: "/supplier/settings", label: t("settings"), icon: "settings" },
  ];
  return (
    <aside
      className="border-r flex flex-col"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
        minHeight: "100vh",
      }}
    >
      <div className="px-6 py-6">
        <Link
          href="/"
          className="text-2xl font-bold italic"
          style={{ fontFamily: "var(--font-display)", textDecoration: "none" }}
        >
          <span style={{ color: "var(--color-ink)" }}>office</span>
          <span style={{ color: "var(--color-terracotta)" }}>kit.</span>
        </Link>
        <p
          className="mt-1 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          Supplier portal
        </p>
      </div>
      <SupplierSidebarClient items={items} />
    </aside>
  );
}

// Icon helper exposed for the client component to use
export const SIDEBAR_ICONS = {
  dashboard: LayoutDashboard,
  rfqs: Inbox,
  orders: ShoppingBag,
  payouts: Wallet,
  settings: Settings,
} as const;
