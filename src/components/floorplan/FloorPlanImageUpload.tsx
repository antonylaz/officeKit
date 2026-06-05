"use client";
import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

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

  if (currentImageUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative rounded-2xl overflow-hidden border bg-card shadow-sm"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div className="aspect-[16/8] overflow-hidden" style={{ background: "var(--color-paper)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImageUrl} alt="Floor plan" className="w-full h-full object-contain" />
        </div>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <p
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            <ImageIcon className="size-3.5" style={{ color: "var(--color-green-leaf)" }} />
            {t("uploaded")}
          </p>
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent/40 disabled:opacity-50"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            {t("remove")}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
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
      onClick={() => inputRef.current?.click()}
      className="relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
      style={{
        borderColor: dragOver ? "var(--color-terracotta)" : "var(--color-line)",
        background: dragOver ? "rgba(197, 85, 45, 0.04)" : "var(--color-paper)",
      }}
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
          <Loader2 className="size-10 animate-spin" style={{ color: "var(--color-terracotta)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-mute)" }}>
            {t("processing")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className="size-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(197, 85, 45, 0.08)" }}
          >
            <Upload className="size-7" style={{ color: "var(--color-terracotta)" }} />
          </div>
          <div>
            <p className="text-base font-medium" style={{ color: "var(--color-ink)" }}>
              {t("dropOrClick")}
            </p>
            <div
              className="mt-1.5 inline-flex items-center gap-2 text-xs"
              style={{ color: "var(--color-ink-mute)" }}
            >
              <FileText className="size-3.5" />
              {t("formats")}
            </div>
          </div>
        </div>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute left-0 right-0 bottom-3 text-xs px-4"
          style={{ color: "var(--color-terracotta)" }}
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

async function renderPdfFirstPageToPng(file: File): Promise<File> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

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
