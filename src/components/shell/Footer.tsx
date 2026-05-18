import { Link } from "@/i18n/routing";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-line)", padding: "32px", maxWidth: 1280, margin: "64px auto 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
      <p>© {new Date().getFullYear()} OfficeKit · Stockholm · officekit.se</p>
      <p style={{ marginTop: 8 }}>
        <Link href="/integritetspolicy">Integritetspolicy</Link> · <Link href="/partners">Partners</Link>
      </p>
    </footer>
  );
}
