import { requireSupplier } from "@/lib/supplier-auth";
import { signOut } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function SupplierSettingsPage() {
  await requireSupplier();
  const t = await getTranslations("supplier.nav");
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/sv/supplier/login" });
  }
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Settings</h1>
      <form action={logout} style={{ marginTop: 32 }}>
        <button type="submit"
          style={{ background: "transparent", color: "var(--color-ink)", padding: "12px 24px", border: "1px solid var(--color-line)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {t("logout")}
        </button>
      </form>
    </div>
  );
}
