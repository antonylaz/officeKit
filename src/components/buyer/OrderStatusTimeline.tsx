import { Check, CheckCircle2, Circle, X } from "lucide-react";

const STEPS = ["confirmed", "in_production", "shipped", "delivered"] as const;

const STEP_LABEL: Record<(typeof STEPS)[number], string> = {
  confirmed: "Confirmed",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
};

export function OrderStatusTimeline({ status }: { status: string }) {
  const currentIdx = STEPS.indexOf(status as (typeof STEPS)[number]);
  const cancelled = status === "cancelled";

  if (cancelled) {
    return (
      <div
        className="my-8 flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ borderColor: "var(--color-terracotta)", background: "rgba(197, 85, 45, 0.06)" }}
      >
        <X className="size-5 shrink-0" style={{ color: "var(--color-terracotta)" }} />
        <p className="font-semibold text-[14px]" style={{ color: "var(--color-terracotta)" }}>
          Order cancelled
        </p>
      </div>
    );
  }

  return (
    <ol className="m-0 my-8 p-0 list-none">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        const isLast = idx === STEPS.length - 1;

        return (
          <li key={step} className="flex gap-3.5 relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className="absolute left-3 top-7 w-0.5 h-full -mt-1"
                style={{
                  background: done ? "var(--color-forest)" : "var(--color-line)",
                }}
              />
            )}

            {/* Step indicator */}
            <div className="relative shrink-0 z-10">
              {done ? (
                <div
                  className="size-6 rounded-full flex items-center justify-center"
                  style={{ background: "var(--color-forest)" }}
                >
                  <Check className="size-3.5 text-white" />
                </div>
              ) : current ? (
                <div
                  className="size-6 rounded-full flex items-center justify-center ring-4"
                  style={{
                    background: "var(--color-terracotta)",
                    boxShadow: "0 0 0 4px rgba(197, 85, 45, 0.15)",
                  }}
                >
                  <CheckCircle2 className="size-3.5 text-white" />
                </div>
              ) : (
                <div
                  className="size-6 rounded-full flex items-center justify-center border-2"
                  style={{
                    background: "white",
                    borderColor: "var(--color-line)",
                  }}
                >
                  <Circle className="size-2" style={{ color: "var(--color-line)" }} />
                </div>
              )}
            </div>

            {/* Label */}
            <div className="pb-7">
              <p
                className="text-[13px] uppercase tracking-[0.1em] font-semibold"
                style={{
                  color: done || current ? "var(--color-ink)" : "var(--color-ink-mute)",
                }}
              >
                {STEP_LABEL[step]}
              </p>
              {current && (
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--color-terracotta)" }}
                >
                  Current
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
