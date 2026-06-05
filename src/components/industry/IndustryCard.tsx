"use client";
import { motion } from "framer-motion";
import { Coins, Recycle, Clock, Shield, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import type { IndustryMeta } from "@/lib/presets";

interface Props {
  industry: IndustryMeta;
  index: number;
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export function IndustryCard({ industry, index }: Props) {
  const t = useTranslations("industry");
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.07 }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={{ pathname: "/projects/new", query: { industry: industry.id } }}
        data-industry={industry.id}
        className="group block rounded-2xl border bg-white p-7 transition-all hover:shadow-lg"
        style={{
          borderColor: "var(--color-line)",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] uppercase tracking-[0.14em] font-semibold tabular-nums"
            style={{ color: "var(--color-ink-mute)" }}
          >
            Vertical 0{index + 1}
          </p>
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            style={{ color: "var(--ok-accent)" }}
          />
        </div>

        <h3
          className="mt-5 text-3xl tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--ok-accent)" }}
        >
          {industry.label}
        </h3>

        <p
          className="mt-3 text-[14px] leading-relaxed"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {industry.tagline}
        </p>

        <div
          className="my-6 h-px"
          style={{
            background:
              "linear-gradient(to right, var(--color-line) 0%, var(--color-line) 70%, transparent)",
          }}
        />

        <dl className="space-y-2.5 text-[13px]">
          <MetaRow icon={Coins} label={t("avgSpend")}>
            {industry.avgSpendPerSeatSek.toLocaleString("sv-SE")} kr
          </MetaRow>
          <MetaRow icon={Recycle} label={t("reuseShare")}>
            {industry.reuseShareLabel}
          </MetaRow>
          <MetaRow icon={Clock} label={t("setupTime")}>
            {industry.setupTimeLabel}
          </MetaRow>
          {industry.complianceFlags && industry.complianceFlags.length > 0 && (
            <MetaRow icon={Shield} label="Compliance">
              {industry.complianceFlags.join(", ")}
            </MetaRow>
          )}
        </dl>
      </Link>
    </motion.div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt
        className="inline-flex items-center gap-1.5"
        style={{ color: "var(--color-ink-mute)" }}
      >
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="font-semibold tabular-nums" style={{ color: "var(--color-ink)" }}>
        {children}
      </dd>
    </div>
  );
}
