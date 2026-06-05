import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { db } from "@/lib/db";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS_PER_LISTING = 10;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PUBLIC_DIR = resolve(process.cwd(), "public/listing-photos");

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await ctx.params;

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { _count: { select: { photos: true } } },
  });
  if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (listing._count.photos >= MAX_PHOTOS_PER_LISTING) {
    return NextResponse.json({ error: "too_many_photos", limit: MAX_PHOTOS_PER_LISTING }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large", maxBytes: MAX_BYTES }, { status: 413 });
  if (!ACCEPTED_TYPES.includes(file.type)) return NextResponse.json({ error: "invalid_type", accepted: ACCEPTED_TYPES }, { status: 415 });

  if (!existsSync(PUBLIC_DIR)) await mkdir(PUBLIC_DIR, { recursive: true });

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
  const filename = `${listingId}-${Date.now()}.${ext}`;
  const filePath = join(PUBLIC_DIR, filename);
  const publicUrl = `/listing-photos/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const photo = await db.listingPhoto.create({
    data: {
      listingId,
      url: publicUrl,
      displayOrder: listing._count.photos,
    },
  });

  return NextResponse.json({ photo });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await ctx.params;
  const url = new URL(req.url);
  const photoId = url.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "photo_id_required" }, { status: 400 });

  const photo = await db.listingPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.listingId !== listingId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (photo.url.startsWith("/listing-photos/")) {
    const filePath = join(process.cwd(), "public", photo.url);
    try {
      if (existsSync(filePath)) await unlink(filePath);
    } catch {
      // Non-fatal
    }
  }

  await db.listingPhoto.delete({ where: { id: photoId } });
  return NextResponse.json({ ok: true });
}
