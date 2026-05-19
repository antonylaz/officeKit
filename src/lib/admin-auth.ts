import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string } | undefined;
  if (!u?.id || u.role !== "admin") redirect("/sv/admin/login");
  return { userId: u.id! };
}
