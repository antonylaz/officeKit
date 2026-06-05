"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { RfqRow } from "./RfqRow";
import type { Rfq, Project, Company, Quote, ProjectItem } from "@prisma/client";

type RfqWithProject = Rfq & {
  project: Project & { company: Company; items: ProjectItem[] };
  quote: Quote | null;
};

const STATUSES = ["all", "sent", "viewed", "quoted", "won", "lost", "expired"] as const;

export function RfqInbox({ rfqs, activeStatus }: { rfqs: RfqWithProject[]; activeStatus: string }) {
  const t = useTranslations("supplier.inbox");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setStatus(s: string) {
    const params = new URLSearchParams(sp.toString());
    if (s === "all") params.delete("status");
    else params.set("status", s);
    router.push(`${pathname}?${params}`);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-6 flex gap-2 flex-wrap"
      >
        {STATUSES.map((s) => {
          const isActive = activeStatus === s;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="relative isolate inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.1em] font-semibold border transition-colors"
              style={{
                borderColor: isActive ? "transparent" : "var(--color-line)",
                color: isActive ? "white" : "var(--color-ink)",
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="activeRfqStatus"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--color-ink)", zIndex: -1 }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                />
              )}
              <span className="relative">{t(`filter_${s}`)}</span>
            </button>
          );
        })}
      </motion.div>

      <div className="mt-6">
        {rfqs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink-mute)" }}
          >
            <Inbox className="size-8 mb-3" />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rfqs.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <RfqRow rfq={r} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
