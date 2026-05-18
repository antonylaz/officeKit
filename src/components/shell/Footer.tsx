export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-line)", padding: "32px", maxWidth: 1280, margin: "64px auto 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
      <p>© {new Date().getFullYear()} OfficeKit · Stockholm · officekit.se</p>
      <p style={{ marginTop: 8 }}>
        <a href="/sv/integritetspolicy">Integritetspolicy</a> · <a href="/sv/partners">Partners</a>
      </p>
    </footer>
  );
}
