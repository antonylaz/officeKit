import { Link } from "@/i18n/routing";
import { AdminSidebarClient } from "./SidebarClient";

export function AdminSidebar() {
  return (
    <aside
      className="border-r flex flex-col"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
        minHeight: "100vh",
      }}
    >
      <div className="px-6 py-6">
        <Link
          href="/"
          className="text-2xl font-bold italic"
          style={{ fontFamily: "var(--font-display)", textDecoration: "none" }}
        >
          <span style={{ color: "var(--color-ink)" }}>office</span>
          <span style={{ color: "var(--color-terracotta)" }}>kit.</span>
        </Link>
        <p
          className="mt-1 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: "var(--color-terracotta)" }}
        >
          Admin console
        </p>
      </div>
      <AdminSidebarClient />
    </aside>
  );
}
