import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.itemCatalog.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json({ items });
}

export const revalidate = 300;
