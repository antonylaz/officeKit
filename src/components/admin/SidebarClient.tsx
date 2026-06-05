"use client";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Building2,
  Wallet,
  PackageOpen,
} from "lucide-react";
import { Link } from "@/i18n/routing";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/buyers", label: "Buyers", icon: Users },
  { href: "/admin/financials", label: "Financials", icon: Wallet },
  { href: "/admin/listings", label: "Listings", icon: PackageOpen },
];

export function AdminSidebarClient() {
  const pathname = usePathname();
  const locale = useLocale();
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  function isActive(item: (typeof ITEMS)[number]) {
    if (item.exact) return pathWithoutLocale === item.href;
    return pathWithoutLocale.startsWith(item.href);
  }

  return (
    <nav className="flex-1 px-3 pt-2 pb-6 space-y-0.5">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative isolate flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors"
            style={{ color: active ? "var(--color-ink)" : "var(--color-ink-soft)" }}
          >
            {active && (
              <motion.span
                layoutId="activeAdminNav"
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--color-cream-2)", zIndex: -1 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
              />
            )}
            <Icon
              className="size-4 relative"
              style={{ color: active ? "var(--color-terracotta)" : "var(--color-ink-mute)" }}
            />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
