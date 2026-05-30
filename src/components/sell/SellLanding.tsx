"use client";
import { motion } from "framer-motion";
import { ArrowRight, ListChecks, Handshake, Banknote, Leaf, Clock, Recycle } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Props {
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  cta: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  whyTitle: string;
  whyA: string;
  whyB: string;
  whyC: string;
  faq1Q: string;
  faq1A: string;
  faq2Q: string;
  faq2A: string;
  faq3Q: string;
  faq3A: string;
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

// Forest as the section brand color (experimental — this is where the green direction lives)
const FOREST = "var(--color-forest)";
const LEAF = "var(--color-green-leaf)";

export function SellLanding(p: Props) {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient forest backdrop */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-[-15%] left-[-10%] size-[700px] rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${FOREST}, transparent)` }}
        />
        <div
          className="absolute bottom-[-25%] right-[-10%] size-[600px] rounded-full opacity-15 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${LEAF}, transparent)` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-20 pb-28">
        {/* Hero */}
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium px-3 py-1.5 rounded-full border"
          style={{
            background: "var(--color-paper)",
            borderColor: "var(--color-line)",
            color: FOREST,
          }}
        >
          <Leaf className="size-3.5" />
          {p.eyebrow}
        </motion.p>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 max-w-3xl text-5xl md:text-7xl leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {p.title}{" "}
          <span
            className="italic"
            style={{
              backgroundImage: `linear-gradient(120deg, ${FOREST} 0%, ${LEAF} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {p.titleAccent}
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 max-w-xl text-lg leading-relaxed"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {p.subtitle}
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10"
        >
          <Link
            href="/sell/new"
            className="inline-flex items-center gap-2 h-12 px-7 text-sm uppercase tracking-[0.12em] font-semibold rounded-md text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: FOREST }}
          >
            {p.cta}
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>

        {/* Steps */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-28"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              step="01"
              icon={ListChecks}
              title={p.step1Title}
              desc={p.step1Desc}
              accent={FOREST}
            />
            <StepCard
              step="02"
              icon={Handshake}
              title={p.step2Title}
              desc={p.step2Desc}
              accent={FOREST}
            />
            <StepCard
              step="03"
              icon={Banknote}
              title={p.step3Title}
              desc={p.step3Desc}
              accent={FOREST}
            />
          </div>
        </motion.section>

        {/* Why */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-28"
        >
          <h2
            className="text-3xl tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {p.whyTitle}
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyCard icon={Recycle} text={p.whyA} accent={LEAF} />
            <WhyCard icon={Clock} text={p.whyB} accent={LEAF} />
            <WhyCard icon={Banknote} text={p.whyC} accent={LEAF} />
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-28"
        >
          <h2
            className="text-3xl tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            FAQ
          </h2>
          <div className="mt-8 divide-y" style={{ borderColor: "var(--color-line)" }}>
            <FaqItem q={p.faq1Q} a={p.faq1A} />
            <FaqItem q={p.faq2Q} a={p.faq2A} />
            <FaqItem q={p.faq3Q} a={p.faq3A} />
          </div>
        </motion.section>

        {/* Closing CTA */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-28 rounded-3xl border p-10 md:p-14 text-center"
          style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
        >
          <h2
            className="text-3xl md:text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to list?
          </h2>
          <Link
            href="/sell/new"
            className="mt-6 inline-flex items-center gap-2 h-12 px-7 text-sm uppercase tracking-[0.12em] font-semibold rounded-md text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: FOREST }}
          >
            {p.cta}
            <ArrowRight className="size-4" />
          </Link>
        </motion.section>
      </div>
    </div>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  desc,
  accent,
}: {
  step: string;
  icon: typeof Leaf;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="p-6 rounded-2xl border"
      style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="size-10 rounded-full inline-flex items-center justify-center"
          style={{ background: "rgba(27, 48, 38, 0.1)", color: accent }}
        >
          <Icon className="size-5" />
        </span>
        <span
          className="text-2xl tabular-nums"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink-mute)" }}
        >
          {step}
        </span>
      </div>
      <h3
        className="mt-5 text-xl tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p
        className="mt-2 text-[14px] leading-relaxed"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {desc}
      </p>
    </motion.div>
  );
}

function WhyCard({ icon: Icon, text, accent }: { icon: typeof Leaf; text: string; accent: string }) {
  return (
    <div
      className="p-5 rounded-2xl border"
      style={{ borderColor: "var(--color-line)", background: "white" }}
    >
      <Icon className="size-5" style={{ color: accent }} />
      <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        {text}
      </p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details
      className="group py-5 cursor-pointer"
      style={{ borderColor: "var(--color-line)" }}
    >
      <summary className="flex items-center justify-between list-none">
        <h3 className="text-[16px] font-semibold pr-6" style={{ color: "var(--color-ink)" }}>
          {q}
        </h3>
        <span
          className="size-6 rounded-full inline-flex items-center justify-center text-sm transition-transform group-open:rotate-45 shrink-0"
          style={{ background: "var(--color-cream)", color: "var(--color-ink)" }}
        >
          +
        </span>
      </summary>
      <p
        className="mt-3 text-[14px] leading-relaxed pr-12"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {a}
      </p>
    </details>
  );
}
