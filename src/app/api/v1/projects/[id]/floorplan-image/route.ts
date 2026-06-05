import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { db } from "@/lib/db";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PUBLIC_DIR = resolve(process.cwd(), "public/floorplans");

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;

  // Verify the project exists (auth check is handled at the page level via session;
  // here we accept any signed-in caller hitting their own project id)
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid_type", accepted: ACCEPTED_TYPES }, { status: 415 });
  }

  if (!existsSync(PUBLIC_DIR)) await mkdir(PUBLIC_DIR, { recursive: true });

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
  // Sanitize: filename = projectId + timestamp + ext (no user-controlled chars in the filename)
  const filename = `${projectId}-${Date.now()}.${ext}`;
  const filePath = join(PUBLIC_DIR, filename);
  const publicUrl = `/floorplans/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // If a previous image was set, try to clean it up
  if (project.floorPlanImageUrl?.startsWith("/floorplans/")) {
    const oldPath = join(process.cwd(), "public", project.floorPlanImageUrl);
    try {
      if (existsSync(oldPath)) await unlink(oldPath);
    } catch {
      // Non-fatal — leave the old file orphaned rather than failing the upload
    }
  }

  await db.project.update({
    where: { id: projectId },
    data: { floorPlanImageUrl: publicUrl },
  });

  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!project.floorPlanImageUrl) return NextResponse.json({ ok: true });

  if (project.floorPlanImageUrl.startsWith("/floorplans/")) {
    const filePath = join(process.cwd(), "public", project.floorPlanImageUrl);
    try {
      if (existsSync(filePath)) await unlink(filePath);
    } catch {
      // Non-fatal
    }
  }
  await db.project.update({ where: { id: projectId }, data: { floorPlanImageUrl: null } });
  return NextResponse.json({ ok: true });
}
