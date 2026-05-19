import { Link } from "@/i18n/routing";

export function AdminSidebar() {
  return (
    <nav style={{ background: "var(--color-cream)", borderRight: "1px solid var(--color-line)", padding: "32px 24px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24 }}>
        <span style={{ color: "var(--color-ink)" }}>office</span>
        <span style={{ color: "var(--color-terracotta)", fontWeight: 700 }}>kit.</span>
      </div>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-terracotta)", marginTop: 4 }}>Admin</p>
      <ul style={{ marginTop: 32, listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        <li><Link href="/admin" style={navLink}>Dashboard</Link></li>
        <li><Link href="/admin/suppliers" style={navLink}>Suppliers</Link></li>
        <li><Link href="/admin/orders" style={navLink}>Orders</Link></li>
        <li><Link href="/admin/buyers" style={navLink}>Buyers</Link></li>
        <li><Link href="/admin/financials" style={navLink}>Financials</Link></li>
      </ul>
    </nav>
  );
}

const navLink: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  color: "var(--color-ink)",
  textDecoration: "none",
  fontSize: 14,
  borderRadius: 4,
};
