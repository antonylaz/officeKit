import { Sidebar } from "@/components/supplier/Sidebar";
import { getSupplierSession } from "@/lib/supplier-auth";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await getSupplierSession();
  // Login + onboarding pages must work without session — passthrough when not authed.
  if (!session) return <>{children}</>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ padding: "32px 48px" }}>{children}</div>
    </div>
  );
}
