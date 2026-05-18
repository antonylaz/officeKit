"use client";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations();
  return (
    <footer style={{ borderTop: "1px solid var(--color-line)", padding: "32px", maxWidth: 1280, margin: "64px auto 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
      <p>© {new Date().getFullYear()} OfficeKit · Stockholm · officekit.se</p>
      <p style={{ marginTop: 8 }}>
        <Link href="/integritetspolicy">{t("footer.privacyPolicy")}</Link> · <Link href="/partners">{t("footer.partners")}</Link>
      </p>
    </footer>
  );
}
