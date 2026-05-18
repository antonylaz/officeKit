import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface SupplierSession {
  userId: string;
  supplierId: string;
  email: string;
}

export async function requireSupplier(): Promise<SupplierSession> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string; supplierId?: string | null; email?: string | null } | undefined;
  if (!u?.id || u.role !== "supplier" || !u.supplierId) {
    redirect("/sv/supplier/login");
  }
  return { userId: u.id, supplierId: u.supplierId, email: u.email ?? "" };
}

export async function getSupplierSession(): Promise<SupplierSession | null> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string; supplierId?: string | null; email?: string | null } | undefined;
  if (!u?.id || u.role !== "supplier" || !u.supplierId) return null;
  return { userId: u.id, supplierId: u.supplierId, email: u.email ?? "" };
}
