"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, Leaf } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

interface NavItem {
  href: string;
  labelKey: "build" | "aiBuild" | "sell";
  icon?: typeof Sparkles;
  accent?: "forest" | "primary";
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/start", labelKey: "build" },
  { href: "/ai-build", labelKey: "aiBuild", icon: Sparkles, badge: "BETA" },
  { href: "/sell", labelKey: "sell", icon: Leaf, accent: "forest" },
];

const HEADER_LABELS = {
  sv: {
    build: "Bygg kontoret",
    aiBuild: "AI-bygg",
    sell: "Sälj möbler",
    supplier: "För leverantörer",
    language: "Språk",
    switchLocale: "EN",
    menu: "Meny",
  },
  en: {
    build: "Build office",
    aiBuild: "AI build",
    sell: "Sell furniture",
    supplier: "For suppliers",
    language: "Language",
    switchLocale: "SV",
    menu: "Menu",
  },
} as const;

export function Header() {
  const locale = useLocale() as "sv" | "en";
  const labels = HEADER_LABELS[locale];
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Strip the /<locale> prefix for active-link detection
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  function isActive(href: string) {
    if (href === "/") return pathWithoutLocale === "/";
    return pathWithoutLocale.startsWith(href);
  }

  // Locale-swap URL
  const otherLocale = locale === "sv" ? "en" : "sv";
  const switchedPath = pathname.replace(new RegExp(`^/${locale}`), `/${otherLocale}`);

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "color-mix(in oklab, var(--color-paper) 85%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold italic shrink-0"
          style={{ fontFamily: "var(--font-display)", textDecoration: "none" }}
        >
          <span style={{ color: "var(--color-ink)" }}>office</span>
          <span style={{ color: "var(--color-terracotta)" }}>kit.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const accent = item.accent === "forest" ? "var(--color-forest)" : "var(--color-ink)";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative isolate inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors"
                style={{ color: active ? accent : "var(--color-ink-soft)" }}
              >
                {active && (
                  <motion.span
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-md"
                    style={{ background: "var(--color-cream-2)", zIndex: -1 }}
                    transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
                  />
                )}
                {Icon && <Icon className="size-3.5 relative" />}
                <span className="relative">{labels[item.labelKey]}</span>
                {item.badge && (
                  <span
                    className="ml-1 text-[8px] tracking-[0.14em] font-bold px-1 py-0.5 rounded relative"
                    style={{ background: "var(--color-ink)", color: "white" }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right rail — supplier link + locale */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            href="/supplier/login"
            className="text-[12px] uppercase tracking-[0.1em] font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {labels.supplier}
          </Link>
          <a
            href={switchedPath}
            className="text-[11px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded border transition-colors hover:bg-accent/30"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
          >
            {labels.switchLocale}
          </a>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={labels.menu}
          aria-expanded={mobileOpen}
          className="md:hidden inline-flex items-center justify-center size-10 rounded-md hover:bg-accent/30 transition-colors"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t"
            style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
          >
            <nav className="max-w-[1280px] mx-auto px-6 py-4 grid gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const accent = item.accent === "forest" ? "var(--color-forest)" : "var(--color-ink)";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-md transition-colors"
                    style={{
                      background: active ? "var(--color-cream-2)" : "transparent",
                      color: active ? accent : "var(--color-ink-soft)",
                    }}
                  >
                    {Icon && <Icon className="size-4" />}
                    <span className="text-[14px] font-medium">{labels[item.labelKey]}</span>
                    {item.badge && (
                      <span
                        className="ml-auto text-[9px] tracking-[0.14em] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--color-ink)", color: "white" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              <hr className="my-2" style={{ borderColor: "var(--color-line)" }} />
              <Link
                href="/supplier/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-3 py-3 rounded-md text-[14px] transition-colors"
                style={{ color: "var(--color-ink-soft)" }}
              >
                {labels.supplier}
              </Link>
              <a
                href={switchedPath}
                className="flex items-center justify-between px-3 py-3 rounded-md text-[14px] transition-colors"
                style={{ color: "var(--color-ink-soft)" }}
              >
                <span>{labels.language}</span>
                <span
                  className="text-[10px] uppercase tracking-[0.12em] font-bold px-1.5 py-0.5 rounded border"
                  style={{ borderColor: "var(--color-line)" }}
                >
                  {labels.switchLocale}
                </span>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
