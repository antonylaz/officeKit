"use client";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle } from "lucide-react";
import { AiBuildForm } from "./AiBuildForm";

interface Props {
  locale: string;
  aiAvailable: boolean;
  eyebrow: string;
  beta: string;
  title: string;
  subtitle: string;
  notConfigured: string;
}

export function AiBuildPage({ locale, aiAvailable, eyebrow, beta, title, subtitle, notConfigured }: Props) {
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Ambient gradient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-[-15%] right-[-10%] size-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--color-gold), transparent)" }}
        />
        <div
          className="absolute bottom-[-15%] left-[-10%] size-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--color-terracotta), transparent)" }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium px-3 py-1.5 rounded-full border"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
              color: "var(--color-terracotta)",
            }}
          >
            <Sparkles className="size-3.5" />
            {eyebrow}
            <span
              className="text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded ml-1"
              style={{ background: "var(--color-ink)", color: "white" }}
            >
              {beta}
            </span>
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 text-5xl md:text-6xl leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-5 text-lg leading-relaxed max-w-2xl"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {subtitle}
        </motion.p>

        {!aiAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 flex items-start gap-3 p-4 rounded-lg border"
            style={{
              borderColor: "var(--color-gold)",
              background: "rgba(212, 160, 86, 0.08)",
            }}
          >
            <AlertTriangle className="size-5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-gold)" }} />
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{notConfigured}</p>
          </motion.div>
        )}

        <AiBuildForm locale={locale} disabled={!aiAvailable} />
      </div>
    </div>
  );
}
