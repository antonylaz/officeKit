"use client";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { LayoutDashboard, Inbox, ShoppingBag, Wallet, Settings } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Item {
  href: string;
  label: string;
  icon: string;
}

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  rfqs: Inbox,
  orders: ShoppingBag,
  payouts: Wallet,
  settings: Settings,
};

export function SupplierSidebarClient({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const locale = useLocale();
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  function isActive(href: string) {
    if (href === "/supplier") return pathWithoutLocale === "/supplier";
    return pathWithoutLocale.startsWith(href);
  }

  return (
    <nav className="flex-1 px-3 pt-2 pb-6 space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative isolate flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors"
            style={{
              color: active ? "var(--color-ink)" : "var(--color-ink-soft)",
            }}
          >
            {active && (
              <motion.span
                layoutId="activeSupplierNav"
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
