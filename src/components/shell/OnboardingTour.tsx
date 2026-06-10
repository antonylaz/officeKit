"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { Sparkles, Leaf, User, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "officekit_tour_v1_seen";

interface Step {
  /** CSS selector for the element to highlight. Required — if missing, step is skipped. */
  anchor: string;
  /** Where to position the tooltip relative to the anchor */
  side: "bottom" | "left";
  icon: typeof Sparkles;
  titleSv: string;
  titleEn: string;
  bodySv: string;
  bodyEn: string;
}

// Anchors map to elements on the public landing pages. Steps that can't find
// their anchor are skipped (so the tour still works on pages that don't have
// every nav item visible).
const STEPS: Step[] = [
  {
    anchor: 'a[href*="/start"]',
    side: "bottom",
    icon: ArrowRight,
    titleSv: "Bygg kontoret manuellt",
    titleEn: "Build your office manually",
    bodySv: "Klassiska flödet — välj bransch, fyll i antal anställda och välj utrustning.",
    bodyEn: "The classic flow — pick an industry, set headcount, and choose equipment.",
  },
  {
    anchor: 'a[href*="/ai-build"]',
    side: "bottom",
    icon: Sparkles,
    titleSv: "Eller beskriv med ord",
    titleEn: "Or just describe it",
    bodySv: 'Skriv "25-personers fintech, hybrid, höj- och sänkbara bord" så bygger AI hela checklistan åt dig.',
    bodyEn: '"25-person fintech, hybrid, sit-stand desks" — AI builds the whole checklist for you.',
  },
  {
    anchor: 'a[href*="/sell"]',
    side: "bottom",
    icon: Leaf,
    titleSv: "Säljer ni möbler?",
    titleEn: "Selling furniture?",
    bodySv: "Stänger ni kontoret? Vi kopplar er med köpare som söker exakt det ni har.",
    bodyEn: "Closing your office? We connect you with buyers looking for what you have.",
  },
  {
    anchor: 'a[href*="/sign-in"]',
    side: "left",
    icon: User,
    titleSv: "Spara dina projekt",
    titleEn: "Keep your projects",
    bodySv: "Logga in via magisk länk eller BankID — så hittar du dina projekt på alla enheter.",
    bodyEn: "Sign in by magic link or BankID — see your projects across devices.",
  },
];

export function OnboardingTour() {
  const locale = useLocale() as "sv" | "en";
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // Decide whether to start
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return; // Storage blocked (private mode) — silently skip
    }
    // Small delay so the page can mount and anchors exist
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Resolve the current anchor; auto-advance if it doesn't exist on this page.
  // setState in effect is intentional — these are reactions to step/page changes,
  // not derivable from props/state. The rule warns about cascades; the early-return
  // structure here means each setState fires at most once per effect run.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!active) return;

    const step = STEPS[stepIdx];
    if (!step) {
      finish();
      return;
    }
    const el = document.querySelector(step.anchor) as HTMLElement | null;
    if (!el) {
      // Skip to next step instead of getting stuck
      if (stepIdx + 1 < STEPS.length) {
        setStepIdx(stepIdx + 1);
      } else {
        finish();
      }
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(el.getBoundingClientRect());

    // Keep the highlight rectangle in sync with scroll/resize
    function onChange() {
      const cur = STEPS[stepIdx];
      if (!cur) return;
      const e = document.querySelector(cur.anchor) as HTMLElement | null;
      if (e) setRect(e.getBoundingClientRect());
    }
    const raf = rafRef.current;
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, stepIdx, finish]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!active || !rect) return null;
  const step = STEPS[stepIdx];
  if (!step) return null;

  // Halo position (8px padding around the anchor)
  const halo = {
    left: rect.left - 8,
    top: rect.top - 8,
    width: rect.width + 16,
    height: rect.height + 16,
  };

  // Tooltip position
  const tooltip =
    step.side === "bottom"
      ? { left: Math.max(16, rect.left - 60), top: rect.bottom + 16 }
      : { left: Math.max(16, rect.left - 320 - 16), top: rect.top - 8 };

  const title = locale === "sv" ? step.titleSv : step.titleEn;
  const body = locale === "sv" ? step.bodySv : step.bodyEn;
  const isLast = stepIdx === STEPS.length - 1;
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[200] pointer-events-none"
        aria-hidden
      >
        {/* SVG overlay with a punched-out hole over the anchor */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={halo.left}
                y={halo.top}
                width={halo.width}
                height={halo.height}
                rx={12}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 22, 18, 0.55)"
            mask="url(#tour-hole)"
          />
        </svg>

        {/* Halo ring — animated breathing */}
        <motion.div
          key={`halo-${stepIdx}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: halo.left,
            top: halo.top,
            width: halo.width,
            height: halo.height,
            boxShadow: "0 0 0 3px var(--color-cta)",
          }}
        />

        {/* Tooltip — pointer-events-auto so the buttons are clickable */}
        <motion.div
          key={`tip-${stepIdx}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl border p-5 w-80"
          style={{
            left: tooltip.left,
            top: tooltip.top,
            borderColor: "var(--color-line)",
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          <div className="flex items-start justify-between">
            <div
              className="size-9 rounded-lg inline-flex items-center justify-center"
              style={{ background: "rgba(27, 48, 38, 0.08)", color: "var(--color-cta)" }}
            >
              <Icon className="size-4" />
            </div>
            <button
              onClick={finish}
              aria-label="close"
              className="p-1 rounded-md hover:bg-accent/40 transition-colors"
            >
              <X className="size-3.5" style={{ color: "var(--color-ink-mute)" }} />
            </button>
          </div>

          <h3
            className="mt-3 text-lg tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {title}
          </h3>
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {body}
          </p>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className="block rounded-full transition-all"
                  style={{
                    width: i === stepIdx ? 16 : 6,
                    height: 6,
                    background:
                      i === stepIdx ? "var(--color-cta)" : "var(--color-cream-2)",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={finish}
                className="text-[11px] uppercase tracking-[0.1em] font-semibold"
                style={{ color: "var(--color-ink-mute)" }}
              >
                {locale === "sv" ? "Hoppa över" : "Skip"}
              </button>
              <button
                onClick={() => (isLast ? finish() : setStepIdx(stepIdx + 1))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-[11px] uppercase tracking-[0.1em] font-semibold"
                style={{ background: "var(--color-cta)" }}
              >
                {isLast ? (locale === "sv" ? "Klart" : "Done") : locale === "sv" ? "Nästa" : "Next"}
                {!isLast && <ArrowRight className="size-3" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
