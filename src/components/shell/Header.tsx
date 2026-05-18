import { Link } from "@/i18n/routing";

export function Header() {
  return (
    <header style={{ borderBottom: "1px solid var(--color-line)", padding: "16px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <Link href="/" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 28 }}>
        <span style={{ color: "var(--color-ink)" }}>office</span>
        <span style={{ color: "var(--color-terracotta)", fontWeight: 700 }}>kit.</span>
      </Link>
    </header>
  );
}
