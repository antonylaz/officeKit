import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually BEFORE importing PrismaClient.
// tsx doesn't auto-load .env.local like Next.js does, and static `import`
// statements are hoisted past top-of-file code, so we use dynamic import()
// inside run() which is called after env is populated here.
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  // .env.local not present (CI), assume DATABASE_URL is set elsewhere
}

async function run() {
  // Dynamic imports run AFTER env vars are populated above
  // Prisma 7 requires a driver adapter; use @prisma/adapter-pg
  const { Pool } = await import("pg");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const { CATALOG } = await import("./catalog-data");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  try {
    console.log("Seeding catalog...");
    for (const item of CATALOG) {
      await db.itemCatalog.upsert({
        where: { id: item.id },
        update: {},
        create: {
          id: item.id,
          category: item.category,
          name: item.name,
          description: item.description,
          icon: item.icon,
          widthCells: item.widthCells,
          heightCells: item.heightCells,
          tags: item.tags,
          priceNewDefault: item.priceNewDefaultSek * 100,
          priceUsedDefault:
            item.priceUsedDefaultSek === null
              ? null
              : item.priceUsedDefaultSek * 100,
          presets: item.presets,
        },
      });
    }
    console.log(`  → ${CATALOG.length} catalog items`);

    console.log("Seeding mock suppliers...");
    const suppliers = [
      {
        name: "Nordkontor Demo AB",
        legalName: "Nordkontor Demo Aktiebolag",
        orgNumber: "559000-0001",
        coverageAreas: ["Stockholm", "Uppsala", "Västerås"],
        verticals: ["it", "sales"],
        shortDescription:
          "Tech-forward office supplier, strong in monitors and AV.",
        perks: ["Free white-glove delivery", "10 yr structural warranty"],
        usedShare: 0.55,
      },
      {
        name: "Återbruk Möbler Demo",
        legalName: "Återbruk Möbler Demo AB",
        orgNumber: "559000-0002",
        coverageAreas: ["Stockholm", "Göteborg", "Malmö"],
        verticals: ["finance", "law"],
        shortDescription: "Refurbished premium furniture specialist.",
        perks: ["100% refurbished options", "Carbon-neutral delivery"],
        usedShare: 0.95,
      },
      {
        name: "Stockholm Office Demo",
        legalName: "Stockholm Office Demo AB",
        orgNumber: "559000-0003",
        coverageAreas: ["Stockholm"],
        verticals: ["it", "finance", "sales", "law"],
        shortDescription:
          "Generalist office supplier serving the Stockholm region.",
        perks: ["48h delivery within Stockholm", "On-site assembly"],
        usedShare: 0.4,
      },
    ];
    for (const s of suppliers) {
      await db.supplier.upsert({
        where: { orgNumber: s.orgNumber },
        update: {},
        create: s,
      });
    }
    console.log(`  → ${suppliers.length} suppliers`);

    console.log("Seeding admin user...");
    await db.user.upsert({
      where: { email: "admin@officekit.se" },
      update: {},
      create: {
        email: "admin@officekit.se",
        name: "OfficeKit Admin",
        role: "admin",
      },
    });
    console.log("  → 1 admin");
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
