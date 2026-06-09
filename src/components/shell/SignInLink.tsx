"use client";
import { LogIn } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

export function SignInLink() {
  const locale = useLocale() as "sv" | "en";
  const label = locale === "sv" ? "Logga in" : "Sign in";
  return (
    <Link
      href="/sign-in"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] uppercase tracking-[0.1em] font-semibold border transition-colors hover:bg-accent/40"
      style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
    >
      <LogIn className="size-3.5" />
      {label}
    </Link>
  );
}
