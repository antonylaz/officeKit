"use client";
import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPT_ATTR = "image/png,image/jpeg,image/webp,application/pdf";
const MAX_BYTES = 8 * 1024 * 1024;

interface UploadProps {
  projectId: string;
  currentImageUrl: string | null;
  onUploaded: (url: string | null) => void;
}

export function FloorPlanImageUpload({ projectId, currentImageUrl, onUploaded }: UploadProps) {
  const t = useTranslations("floorplan.upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > MAX_BYTES) {
        setError(t("errors.tooLarge"));
        return;
      }

      let uploadFile = file;

      // PDFs: render page 1 to PNG client-side via pdfjs-dist
      if (file.type === "application/pdf") {
        setUploading(true);
        try {
          uploadFile = await renderPdfFirstPageToPng(file);
        } catch (e) {
          console.error("pdf render failed", e);
          setError(t("errors.pdfFailed"));
          setUploading(false);
          return;
        }
      } else if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setError(t("errors.invalidType"));
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);

      try {
        const res = await fetch(`/api/v1/projects/${projectId}/floorplan-image`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(t("errors.uploadFailed"));
          setUploading(false);
          return;
        }
        onUploaded(data.url);
      } catch {
        setError(t("errors.network"));
      } finally {
        setUploading(false);
      }
    },
    [projectId, onUploaded, t],
  );

  const handleRemove = useCallback(async () => {
    setUploading(true);
    try {
      await fetch(`/api/v1/projects/${projectId}/floorplan-image`, { method: "DELETE" });
      onUploaded(null);
    } catch {
      setError(t("errors.removeFailed"));
    } finally {
      setUploading(false);
    }
  }, [projectId, onUploaded, t]);

  // Already has an image — render preview + remove
  if (currentImageUrl) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border bg-card">
        <div className="aspect-[16/10] bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImageUrl} alt="Floor plan" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("uploaded")}</p>
          <Button variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            <span className="ml-2">{t("remove")}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`relative rounded-lg border-2 border-dashed transition-all p-10 text-center cursor-pointer ${
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t("processing")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <ImageIcon className="size-8 text-muted-foreground" />
            <Upload className="size-10 text-primary" />
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium">{t("dropOrClick")}</p>
          <p className="text-xs text-muted-foreground">{t("formats")}</p>
        </div>
      )}

      {error && (
        <p className="absolute left-0 right-0 bottom-2 text-xs text-destructive px-4">{error}</p>
      )}
    </div>
  );
}

async function renderPdfFirstPageToPng(file: File): Promise<File> {
  // Dynamic import keeps pdfjs out of the initial bundle (~500KB)
  // Use the legacy build to avoid worker-loader issues with Turbopack
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Use a CDN worker — Turbopack-friendly, no bundling step required
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  // Render at 2x scale for sharpness on retina screens
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unsupported");

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.92),
  );
  if (!blob) throw new Error("blob_failed");
  return new File([blob], `${file.name.replace(/\.pdf$/i, "")}.png`, { type: "image/png" });
}
