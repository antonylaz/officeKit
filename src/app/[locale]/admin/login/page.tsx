import { LoginForm } from "@/components/supplier/LoginForm";
import { getTranslations } from "next-intl/server";

export default async function AdminLoginPage() {
  const t = await getTranslations("supplier.login");
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 32px" }}>
      <p style={{ color: "var(--color-terracotta)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Admin</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginTop: 4 }}>{t("title")}</h1>
      <LoginForm defaultRedirect="/admin" />
    </div>
  );
}
