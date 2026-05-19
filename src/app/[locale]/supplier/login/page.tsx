import { LoginForm } from "@/components/supplier/LoginForm";
import { getTranslations } from "next-intl/server";

export default async function SupplierLoginPage() {
  const t = await getTranslations("supplier.login");
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>{t("subtitle")}</p>
      <LoginForm />
    </div>
  );
}
