"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

const ACCEPT_ATTR = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 10;

interface Photo {
  id: string;
  url: string;
}

interface Props {
  listingId: string;
  initialPhotos?: Photo[];
}

export function ListingPhotoUpload({ listingId, initialPhotos = [] }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadOne = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setError("File too large (max 8 MB)");
        return;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setError("Use PNG, JPG, or WebP");
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/sell/listings/${listingId}/photos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "too_many_photos" ? `Max ${MAX_PHOTOS} photos` : "Upload failed");
        return;
      }
      setPhotos((prev) => [...prev, data.photo]);
    },
    [listingId],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const list = Array.from(files);
      if (photos.length + list.length > MAX_PHOTOS) {
        setError(`Max ${MAX_PHOTOS} photos`);
        return;
      }
      setUploading(true);
      try {
        for (const f of list) await uploadOne(f);
      } finally {
        setUploading(false);
      }
    },
    [photos.length, uploadOne],
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      await fetch(`/api/v1/sell/listings/${listingId}/photos?photoId=${photoId}`, { method: "DELETE" });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    },
    [listingId],
  );

  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div>
      {/* Existing photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          <AnimatePresence>
            {photos.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative aspect-square rounded-xl overflow-hidden border group"
                style={{ borderColor: "var(--color-line)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-2 right-2 size-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="remove photo"
                >
                  <X className="size-3.5" style={{ color: "var(--color-ink)" }} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Drop zone */}
      {!atLimit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? "var(--color-forest)" : "var(--color-line)",
            background: dragOver ? "rgba(27, 48, 38, 0.04)" : "var(--color-paper)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-7 animate-spin" style={{ color: "var(--color-forest)" }} />
              <p className="text-sm" style={{ color: "var(--color-ink-mute)" }}>Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="size-12 rounded-full inline-flex items-center justify-center"
                style={{ background: "rgba(27, 48, 38, 0.08)", color: "var(--color-forest)" }}
              >
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                {photos.length === 0 ? "Add photos" : `Add more (${MAX_PHOTOS - photos.length} left)`}
              </p>
              <p className="text-xs inline-flex items-center gap-1.5" style={{ color: "var(--color-ink-mute)" }}>
                <ImageIcon className="size-3" />
                PNG, JPG, or WebP · max 8 MB each
              </p>
            </div>
          )}
        </div>
      )}

      {atLimit && (
        <p className="text-xs text-center" style={{ color: "var(--color-ink-mute)" }}>
          {MAX_PHOTOS} photos uploaded — that&apos;s the max.
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-center" style={{ color: "var(--color-terracotta)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
