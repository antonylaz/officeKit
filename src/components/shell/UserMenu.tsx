"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { LogOut, FolderOpen, ShoppingBag, User } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Props {
  /** Signed-in user email — if null, but a claim cookie exists, the menu still shows
   *  with a "Recent projects" item but no email. */
  userEmail: string | null;
  /** True when either auth session OR claim cookie is set */
  hasIdentity: boolean;
  /** Number of projects to badge on "My projects" */
  projectCount: number;
  /** Number of orders to badge on "My orders" */
  orderCount: number;
}

export function UserMenu({ userEmail, hasIdentity, projectCount, orderCount }: Props) {
  const locale = useLocale() as "sv" | "en";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!hasIdentity) return null;

  const labels =
    locale === "sv"
      ? {
          myProjects: "Mina projekt",
          myOrders: "Mina beställningar",
          signOut: "Logga ut",
          guest: "Gäst",
          guestHint: "Du har sparat projekt i den här webbläsaren.",
        }
      : {
          myProjects: "My projects",
          myOrders: "My orders",
          signOut: "Sign out",
          guest: "Guest",
          guestHint: "You have saved projects in this browser.",
        };

  const avatarInitial = (userEmail?.[0] ?? "·").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors hover:bg-accent/30"
        style={{ borderColor: "var(--color-line)" }}
      >
        <span
          className="size-7 rounded-full inline-flex items-center justify-center text-[12px] font-semibold"
          style={{
            background: userEmail ? "var(--color-ink)" : "var(--color-cream-2)",
            color: userEmail ? "white" : "var(--color-ink-soft)",
          }}
        >
          {avatarInitial === "·" ? <User className="size-3.5" /> : avatarInitial}
        </span>
        {projectCount + orderCount > 0 && (
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {projectCount + orderCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-white shadow-lg overflow-hidden z-[60]"
            style={{ borderColor: "var(--color-line)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-line)" }}>
              <p
                className="text-[10px] uppercase tracking-[0.12em] font-semibold"
                style={{ color: "var(--color-ink-mute)" }}
              >
                {userEmail ? "Signed in" : labels.guest}
              </p>
              <p className="mt-1 text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>
                {userEmail ?? labels.guestHint}
              </p>
            </div>

            <div className="py-1">
              <MenuItem
                href="/projects"
                icon={FolderOpen}
                label={labels.myProjects}
                badge={projectCount > 0 ? String(projectCount) : null}
                onClick={() => setOpen(false)}
              />
              <MenuItem
                href="/orders"
                icon={ShoppingBag}
                label={labels.myOrders}
                badge={orderCount > 0 ? String(orderCount) : null}
                onClick={() => setOpen(false)}
              />
            </div>

            {userEmail && (
              <div className="border-t py-1" style={{ borderColor: "var(--color-line)" }}>
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-accent/40"
                    style={{ color: "var(--color-terracotta)" }}
                  >
                    <LogOut className="size-3.5" />
                    {labels.signOut}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: typeof FolderOpen;
  label: string;
  badge: string | null;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center justify-between px-4 py-2.5 text-[13px] transition-colors hover:bg-accent/40"
      style={{ color: "var(--color-ink)" }}
    >
      <span className="inline-flex items-center gap-2.5">
        <Icon className="size-3.5" style={{ color: "var(--color-ink-mute)" }} />
        {label}
      </span>
      {badge && (
        <span
          className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
          style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)" }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
