import { Link } from "@/i18n/routing";

export function Header() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(250, 247, 239, 0.85)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      borderBottom: "1px solid var(--color-line)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 28, textDecoration: "none" }}>
          <span style={{ color: "var(--color-ink)" }}>office</span>
          <span style={{ color: "var(--color-terracotta)", fontWeight: 700 }}>kit.</span>
        </Link>
      </div>
    </header>
  );
}
