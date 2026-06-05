"use client";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Recycle, Clock, Users, Leaf } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Stat {
  label: string;
  value: string;
}

interface Props {
  tagline: string;
  headline: string;
  subhead: string;
  ctaStart: string;
  ctaAi: string;
  beta: string;
  stats: Stat[];
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function LandingHero({ tagline, headline, subhead, ctaStart, ctaAi, beta, stats }: Props) {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-[-20%] left-[-10%] size-[700px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--color-terracotta), transparent)" }}
        />
        <div
          className="absolute bottom-[-30%] right-[-10%] size-[700px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--color-forest), transparent)" }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-24 pb-32">
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium px-3 py-1.5 rounded-full border"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-line)", color: "var(--color-terracotta)" }}
        >
          <Sparkles className="size-3.5" />
          {tagline}
        </motion.p>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 max-w-3xl text-5xl md:text-7xl leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="block">{headline.split(" ").slice(0, -2).join(" ")}</span>
          <span
            className="italic"
            style={{
              backgroundImage: "linear-gradient(120deg, var(--color-terracotta) 0%, var(--color-gold) 60%, var(--color-forest) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {headline.split(" ").slice(-2).join(" ")}
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 max-w-xl text-lg leading-relaxed"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {subhead}
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <Link
            href="/start"
            className="inline-flex items-center gap-2 h-12 px-7 text-sm uppercase tracking-[0.12em] font-semibold rounded-md text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: "var(--color-cta)" }}
          >
            {ctaStart}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/ai-build"
            className="inline-flex items-center gap-2 h-12 px-6 text-sm uppercase tracking-[0.12em] font-semibold rounded-md border transition-colors hover:bg-accent/40"
            style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          >
            <Sparkles className="size-4" />
            {ctaAi}
            <span
              className="text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded ml-1"
              style={{ background: "var(--color-ink)", color: "white" }}
            >
              {beta}
            </span>
          </Link>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 h-12 px-6 text-sm uppercase tracking-[0.12em] font-semibold rounded-md border transition-colors hover:bg-accent/40"
            style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}
          >
            <Leaf className="size-4" />
            Sell furniture
          </Link>
        </motion.div>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8"
        >
          {stats.map((stat, i) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={statIcons[i] ?? Clock} />
          ))}
        </motion.section>
      </div>
    </div>
  );
}

const statIcons = [Clock, Users, Recycle];

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--color-ink-mute)" }}>
        <Icon className="size-4" style={{ color: "var(--color-terracotta)" }} />
        {label}
      </div>
      <p className="mt-3 text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
    </motion.div>
  );
}
