"use client";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { ItemCatalog } from "@prisma/client";
import { Briefcase, Cpu, Users, Archive, Sofa, Coffee, Truck } from "lucide-react";

const CATEGORIES: ItemCatalog["category"][] = [
  "workstations",
  "tech",
  "meeting",
  "storage",
  "lounge",
  "kitchen",
  "transportation",
];

const ICONS: Record<ItemCatalog["category"], typeof Briefcase> = {
  workstations: Briefcase,
  tech: Cpu,
  meeting: Users,
  storage: Archive,
  lounge: Sofa,
  kitchen: Coffee,
  transportation: Truck,
};

export function CategoryTabs({
  active,
  onChange,
}: {
  active: ItemCatalog["category"];
  onChange: (c: ItemCatalog["category"]) => void;
}) {
  const t = useTranslations("checklist.tabs");
  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map((c) => {
        const isActive = active === c;
        const Icon = ICONS[c];
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors"
            style={{
              borderColor: isActive ? "transparent" : "var(--color-line)",
              color: isActive ? "white" : "var(--color-ink)",
            }}
          >
            {isActive && (
              <motion.span
                layoutId="activeTab"
                className="absolute inset-0 rounded-full -z-10"
                style={{ background: "var(--color-ink)" }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              />
            )}
            <Icon className="size-3.5" />
            {t(c)}
          </button>
        );
      })}
    </div>
  );
}
