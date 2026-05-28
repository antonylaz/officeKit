"use client";
import { useState } from "react";

export function SupplierEditForm({ id, name: initName, commissionRate: initCR, active: initActive }: { id: string; name: string; commissionRate: number; active: boolean }) {
  const [name, setName] = useState(initName);
  const [commissionRate, setCommissionRate] = useState(initCR);
  const [active, setActive] = useState(initActive);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/v1/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, commissionRate, active }),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <div style={{ marginTop: 32, display: "grid", gap: 16, padding: 24, border: "1px solid var(--color-line)", borderRadius: 4 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>Commission rate (0–1)</span>
        <input type="number" value={commissionRate} step={0.001} min={0} max={1} onChange={(e) => setCommissionRate(Number(e.target.value))} style={inputStyle} />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active
      </label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={save} disabled={saving} style={{ background: "var(--color-cta)", color: "white", padding: "10px 20px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {saving ? "…" : "Save"}
        </button>
        {saved && <span style={{ color: "var(--color-green-leaf)", fontSize: 13 }}>Saved ✓</span>}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px", fontSize: 14 };
