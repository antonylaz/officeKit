import { describe, expect, it, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { transitionOrderStatus, cancelOrder } from "@/server/supplier-orders";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

let projectId: string;
let quoteId: string;
let supplierId: string;
let orderId: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-32-chars-minimum-padding-1234";

  const supplier = await db.supplier.findFirstOrThrow({ where: { orgNumber: "559000-0001" } });
  supplierId = supplier.id;

  const company = await db.company.create({ data: { name: "Phase4 Test Co " + Date.now() } });
  const project = await db.project.create({
    data: { companyId: company.id, name: "Phase4 Project", industry: "it", headcount: 5, city: "Stockholm", status: "quotes_received" },
  });
  projectId = project.id;
  const item = await db.itemCatalog.findFirstOrThrow();
  await db.projectItem.create({ data: { projectId, itemId: item.id, quantity: 3, mode: "new" } });

  const rfq = await db.rfq.create({
    data: { projectId, supplierId, status: "quoted", deadlineAt: new Date(Date.now() + 86400_000), quotedAt: new Date() },
  });
  const quote = await db.quote.create({
    data: {
      rfqId: rfq.id, totalAmount: 100_000_00, totalAmountExVat: 80_000_00,
      validUntil: new Date(Date.now() + 14 * 86400_000), notes: "test", perks: [],
      submittedAt: new Date(),
      lines: { create: [{ itemId: item.id, quantity: 3, mode: "new", unitPrice: 26_666_67, lineTotal: 80_000_00 }] },
    },
  });
  quoteId = quote.id;

  // Place order via direct DB (bypass auth requirement)
  const commissionRate = Number(supplier.commissionRate);
  const commissionAmount = Math.round(quote.totalAmount * commissionRate);
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        projectId, quoteId: quote.id, supplierId, companyId: company.id, status: "confirmed",
        totalAmount: quote.totalAmount, commissionAmount, payoutAmount: quote.totalAmount - commissionAmount,
        deliveryAddress: { street: "Test 1", postal: "11122", city: "Stockholm", country: "SE" } as never,
        deliveryWindowStart: new Date(), deliveryWindowEnd: new Date(Date.now() + 7 * 86400_000),
        paymentMethod: "card",
      },
    });
    await tx.rfq.update({ where: { id: quote.rfqId }, data: { status: "won", decidedAt: new Date() } });
    await tx.project.update({ where: { id: projectId }, data: { status: "ordered" } });
    return o;
  });
  orderId = order.id;
});

describe("order lifecycle", () => {
  it("order created in confirmed status", async () => {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("confirmed");
    expect(order.commissionAmount).toBe(600_000); // 6% of 10M öre
  });

  it("RFQ won and project ordered after creation", async () => {
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(project.status).toBe("ordered");
    const rfq = await db.rfq.findFirstOrThrow({ where: { projectId, supplierId } });
    expect(rfq.status).toBe("won");
  });

  it("transitionOrderStatus moves confirmed → in_production", async () => {
    const updated = await transitionOrderStatus(orderId, supplierId, "in_production");
    expect(updated.status).toBe("in_production");
  });

  it("transitionOrderStatus moves in_production → shipped with tracking", async () => {
    const updated = await transitionOrderStatus(orderId, supplierId, "shipped", "TRACK123");
    expect(updated.status).toBe("shipped");
    expect(updated.trackingNumber).toBe("TRACK123");
  });

  it("transitionOrderStatus rejects skipping a step", async () => {
    const item = await db.itemCatalog.findFirstOrThrow();
    const company = await db.company.create({ data: { name: "Skip " + Date.now() } });
    const proj = await db.project.create({ data: { companyId: company.id, name: "x", industry: "it", headcount: 1, city: "S", status: "quotes_received" } });
    const rfq2 = await db.rfq.create({ data: { projectId: proj.id, supplierId, status: "quoted", deadlineAt: new Date(Date.now() + 86400_000) } });
    const quote2 = await db.quote.create({
      data: {
        rfqId: rfq2.id, totalAmount: 1000, totalAmountExVat: 800, validUntil: new Date(Date.now() + 14 * 86400_000),
        notes: "", perks: [], submittedAt: new Date(),
        lines: { create: [{ itemId: item.id, quantity: 1, mode: "new", unitPrice: 800, lineTotal: 800 }] },
      },
    });
    const newOrder = await db.order.create({
      data: {
        projectId: proj.id, quoteId: quote2.id, supplierId, companyId: company.id, status: "confirmed",
        totalAmount: 1000, commissionAmount: 60, payoutAmount: 940,
        deliveryAddress: {} as never, deliveryWindowStart: new Date(), deliveryWindowEnd: new Date(),
        paymentMethod: "card",
      },
    });
    await expect(transitionOrderStatus(newOrder.id, supplierId, "shipped")).rejects.toThrow("invalid_transition");
  });

  it("cancelOrder within 48h reverts RFQs and project", async () => {
    const item = await db.itemCatalog.findFirstOrThrow();
    const company = await db.company.create({ data: { name: "Cancel " + Date.now() } });
    const proj = await db.project.create({ data: { companyId: company.id, name: "x", industry: "it", headcount: 1, city: "S", status: "ordered" } });
    const rfq3 = await db.rfq.create({ data: { projectId: proj.id, supplierId, status: "won", deadlineAt: new Date(Date.now() + 86400_000), decidedAt: new Date() } });
    const quote3 = await db.quote.create({
      data: {
        rfqId: rfq3.id, totalAmount: 5000, totalAmountExVat: 4000, validUntil: new Date(Date.now() + 14 * 86400_000),
        notes: "", perks: [], submittedAt: new Date(),
        lines: { create: [{ itemId: item.id, quantity: 1, mode: "new", unitPrice: 4000, lineTotal: 4000 }] },
      },
    });
    const o = await db.order.create({
      data: {
        projectId: proj.id, quoteId: quote3.id, supplierId, companyId: company.id, status: "confirmed",
        totalAmount: 5000, commissionAmount: 300, payoutAmount: 4700,
        deliveryAddress: {} as never, deliveryWindowStart: new Date(), deliveryWindowEnd: new Date(),
        paymentMethod: "card",
      },
    });
    const cancelled = await cancelOrder(o.id, supplierId, "test reason");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("test reason");
    const rfqAfter = await db.rfq.findUniqueOrThrow({ where: { id: rfq3.id } });
    expect(rfqAfter.status).toBe("quoted");
    const projAfter = await db.project.findUniqueOrThrow({ where: { id: proj.id } });
    expect(projAfter.status).toBe("quotes_received");
  });
});
