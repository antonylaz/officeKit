import { Shield } from "lucide-react";
import { LoginForm } from "@/components/supplier/LoginForm";
import { getTranslations } from "next-intl/server";

export default async function AdminLoginPage() {
  const t = await getTranslations("supplier.login");
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-2">
          <div
            className="inline-flex size-12 items-center justify-center rounded-xl mb-5"
            style={{ background: "rgba(184, 66, 28, 0.08)", color: "var(--color-terracotta)" }}
          >
            <Shield className="size-5" />
          </div>
          <p
            className="text-[11px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: "var(--color-terracotta)" }}
          >
            Admin console
          </p>
          <h1
            className="mt-3 text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {t("title")}
          </h1>
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
            Restricted — admin credentials + TOTP required.
          </p>
        </div>
        <div
          className="mt-8 rounded-2xl border p-7 bg-white shadow-sm"
          style={{ borderColor: "var(--color-line)" }}
        >
          <LoginForm defaultRedirect="/admin" />
        </div>
      </div>
    </div>
  );
}
