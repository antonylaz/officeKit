import { AdminSidebar } from "@/components/admin/Sidebar";
import { auth } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const u = session?.user as { role?: string } | undefined;
  // Passthrough for login page — render without shell when not authenticated as admin
  if (!u || u.role !== "admin") return <>{children}</>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      <AdminSidebar />
      <div style={{ padding: "32px 48px" }}>{children}</div>
    </div>
  );
}
