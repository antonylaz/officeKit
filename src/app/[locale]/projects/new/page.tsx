"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const CITIES = ["Stockholm", "Göteborg", "Malmö", "Uppsala", "Västerås", "Linköping", "Örebro", "Norrköping", "Helsingborg", "Jönköping"];

export default function NewProjectPage() {
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const industry = sp.get("industry") ?? "it";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        industry,
        headcount: Number(fd.get("headcount")),
        city: String(fd.get("city")),
        moveInDate: fd.get("moveInDate") ? new Date(String(fd.get("moveInDate"))).toISOString() : null,
        companyName: String(fd.get("companyName")),
      }),
    });
    if (!res.ok) {
      setError("Couldn't create project. Please check your input.");
      setSubmitting(false);
      return;
    }
    const { id } = await res.json();
    router.push(`/projects/${id}/checklist`);
  }

  return (
    <div data-industry={industry} style={{ maxWidth: 560, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("project.basicsTitle")}</h1>
      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 24 }}>
        <Field label="Company name" name="companyName" required />
        <Field label={t("project.headcount")} name="headcount" type="number" min={1} max={500} required />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("project.city")}</span>
          <select name="city" required style={inputStyle}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <Field label={t("project.moveInDate")} name="moveInDate" type="date" />
        {error && <p style={{ color: "var(--color-terracotta)" }}>{error}</p>}
        <button type="submit" disabled={submitting} style={ctaStyle}>
          {submitting ? "…" : `${t("common.cta.continue")} →`}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-cream)",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 14,
};

const ctaStyle: React.CSSProperties = {
  background: "var(--ok-accent)",
  color: "white",
  padding: "16px 24px",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: 12,
  fontWeight: 600,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{label}</span>
      <input {...rest} style={inputStyle} />
    </label>
  );
}
