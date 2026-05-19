import type { OrderStatus } from "@prisma/client";

export const CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ["in_production"],
  in_production: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  paid: [],
  cancelled: [],
};

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function isWithinCancelWindow(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < CANCEL_WINDOW_MS;
}
