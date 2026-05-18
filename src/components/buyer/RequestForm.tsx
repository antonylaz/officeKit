"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function RequestForm({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "magic_sent" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch(`/api/v1/projects/${projectId}/request-quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.status === "magic_link_sent") setState("magic_sent");
    else if (data.status === "sent") { setState("sent"); router.push(`/projects/${projectId}/confirmation`); }
    else setState("error");
  }

  if (state === "magic_sent") {
    return <p style={{ marginTop: 32, color: "var(--color-forest)" }}>Check your inbox — we sent a sign-in link to {email}. Click it to finish sending the request.</p>;
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("request.emailLabel")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }}
        />
      </label>
      <button type="submit" disabled={state === "sending"} style={{ background: "var(--color-terracotta)", color: "white", padding: "16px 24px", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 4, cursor: "pointer" }}>
        {state === "sending" ? "…" : `${t("request.send")} →`}
      </button>
      {state === "error" && <p style={{ color: "var(--color-terracotta)" }}>Something went wrong. Try again.</p>}
    </form>
  );
}
