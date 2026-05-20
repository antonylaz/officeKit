// Reconstruction note: the source spec (Appendix A) references the CATALOG constant
// in officekit-poc-v2.html. That file is not available; this is a reconstruction
// from PDFs + Appendix A + sensible Swedish-office defaults.
// Replace wholesale if the canonical HTML is recovered.

import type { ItemCategory, Industry } from "@prisma/client";

type Preset = Partial<Record<Industry, number>>;

export interface SeedItem {
  id: string;
  category: ItemCategory;
  subcategory?: string;            // Phase 9: groups items under an expandable header
  subcategoryRank?: number;        // sort order within the group; lowest first
  name: string;
  description: string;
  icon: string;
  widthCells: number;
  heightCells: number;
  tags: string[];
  priceNewDefaultSek: number;
  priceUsedDefaultSek: number | null;
  presets: Preset;
}

export const CATALOG: SeedItem[] = [
  // workstations
  // Phase 9 subcategory: desks (rank 1 = "standard", flanked by desk-small / desk-large / desk-l-shape)
  { id: "desk-electric", category: "workstations", subcategory: "desks", subcategoryRank: 1, name: "Standard sit-stand desk", description: "160×80 cm electric, programmable height memory", icon: "🪑", widthCells: 4, heightCells: 2, tags: ["ergo"], priceNewDefaultSek: 5400, priceUsedDefaultSek: 2700, presets: { it: 1, finance: 1, sales: 0, law: 1 } },
  { id: "desk-small", category: "workstations", subcategory: "desks", subcategoryRank: 0, name: "Compact sit-stand desk", description: "120×70 cm electric, ideal for small offices", icon: "🪑", widthCells: 3, heightCells: 2, tags: ["ergo", "compact"], priceNewDefaultSek: 4200, priceUsedDefaultSek: 1900, presets: { it: 0.3, finance: 0.2, sales: 0.4, law: 0 } },
  { id: "desk-large", category: "workstations", subcategory: "desks", subcategoryRank: 2, name: "Large sit-stand desk", description: "180×90 cm electric, dual-monitor friendly", icon: "🪑", widthCells: 5, heightCells: 2, tags: ["ergo", "premium"], priceNewDefaultSek: 7200, priceUsedDefaultSek: 3500, presets: { it: 0.4, finance: 0.5, sales: 0.1, law: 0.5 } },
  { id: "desk-l-shape", category: "workstations", subcategory: "desks", subcategoryRank: 3, name: "L-shape sit-stand desk", description: "180×160 cm corner electric, corner-office layouts", icon: "🪑", widthCells: 5, heightCells: 5, tags: ["ergo", "premium"], priceNewDefaultSek: 9800, priceUsedDefaultSek: 4500, presets: { it: 0.1, finance: 0.2, sales: 0, law: 0.3 } },
  { id: "desk-fixed", category: "workstations", name: "Fixed desk", description: "140×70 cm, oak veneer", icon: "🟫", widthCells: 4, heightCells: 2, tags: ["essential"], priceNewDefaultSek: 2800, priceUsedDefaultSek: 1200, presets: { it: 0, finance: 0, sales: 1, law: 0 } },
  { id: "desk-solid", category: "workstations", name: "Solid wood desk", description: "180×90 cm, premium oak", icon: "🟫", widthCells: 5, heightCells: 2, tags: ["premium"], priceNewDefaultSek: 12000, priceUsedDefaultSek: 5500, presets: { law: 1 } },
  // Phase 9 subcategory: chairs (rank 1 = mid-tier)
  { id: "task-chair-budget", category: "workstations", subcategory: "chairs", subcategoryRank: 0, name: "Entry-level task chair", description: "IKEA Markus class — fixed armrests, mesh back", icon: "💺", widthCells: 2, heightCells: 2, tags: ["essential", "budget"], priceNewDefaultSek: 2400, priceUsedDefaultSek: 950, presets: { it: 0.3, finance: 0.2, sales: 0.5, law: 0 } },
  { id: "task-chair", category: "workstations", subcategory: "chairs", subcategoryRank: 1, name: "Mid-tier ergonomic task chair", description: "RH Logic / Kinnarps Plus 8 class", icon: "💺", widthCells: 2, heightCells: 2, tags: ["ergo", "essential"], priceNewDefaultSek: 4900, priceUsedDefaultSek: 2200, presets: { it: 1, finance: 1, sales: 1, law: 0 } },
  { id: "task-chair-premium", category: "workstations", subcategory: "chairs", subcategoryRank: 2, name: "Premium ergonomic task chair", description: "Herman Miller Aeron / Steelcase Leap class", icon: "💺", widthCells: 2, heightCells: 2, tags: ["ergo", "premium"], priceNewDefaultSek: 14500, priceUsedDefaultSek: 6800, presets: { it: 0.1, finance: 0.3, sales: 0, law: 0.5 } },
  { id: "leather-chair", category: "workstations", name: "Leather executive chair", description: "High-back, brown leather", icon: "🪑", widthCells: 2, heightCells: 2, tags: ["premium", "client-facing"], priceNewDefaultSek: 9800, priceUsedDefaultSek: 4500, presets: { law: 1 } },
  { id: "monitor-arm", category: "workstations", name: "Single monitor arm", description: "Gas-spring, VESA 100", icon: "🦾", widthCells: 1, heightCells: 1, tags: ["ergo"], priceNewDefaultSek: 1200, priceUsedDefaultSek: 600, presets: { it: 1, finance: 1, sales: 0.5, law: 0.5 } },
  { id: "monitor-arm-dual", category: "workstations", name: "Dual monitor arm", description: "Gas-spring, dual VESA 100", icon: "🦾", widthCells: 1, heightCells: 1, tags: ["ergo"], priceNewDefaultSek: 1900, priceUsedDefaultSek: 950, presets: { it: 1, finance: 0.5 } },
  { id: "desk-divider", category: "workstations", name: "Acoustic desk divider", description: "Felt, 160×40 cm", icon: "🟧", widthCells: 4, heightCells: 1, tags: ["acoustic"], priceNewDefaultSek: 1400, priceUsedDefaultSek: 600, presets: { sales: 1 } },

  // tech
  // Phase 9 subcategory: monitors (rank 1 = "27\" 4K", flanked by 24, 32, ultrawide, curved-32)
  { id: "monitor-24", category: "tech", subcategory: "monitors", subcategoryRank: 0, name: "24-inch FHD monitor", description: "1920×1080, IPS, ideal for shared workstations", icon: "🖥️", widthCells: 2, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 2200, priceUsedDefaultSek: 950, presets: { it: 0.3, finance: 0.2, sales: 1, law: 0.5 } },
  { id: "monitor-27", category: "tech", subcategory: "monitors", subcategoryRank: 1, name: "27-inch 4K monitor", description: "Dell UltraSharp class, 3840×2160 IPS", icon: "🖥️", widthCells: 2, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 4500, priceUsedDefaultSek: 2200, presets: { it: 2, finance: 2, sales: 1, law: 1 } },
  { id: "monitor-32", category: "tech", subcategory: "monitors", subcategoryRank: 2, name: "32-inch 4K monitor", description: "Large 4K for design/finance workflows", icon: "🖥️", widthCells: 3, heightCells: 1, tags: ["tech", "premium"], priceNewDefaultSek: 6800, priceUsedDefaultSek: 3200, presets: { it: 0.3, finance: 0.5, sales: 0.1, law: 0.3 } },
  { id: "monitor-ultrawide", category: "tech", subcategory: "monitors", subcategoryRank: 3, name: "34-inch ultrawide monitor", description: "3440×1440, 21:9 — multi-window productivity", icon: "🖥️", widthCells: 3, heightCells: 1, tags: ["tech", "premium"], priceNewDefaultSek: 7500, priceUsedDefaultSek: 3500, presets: { it: 0.4, finance: 0.6, sales: 0.2, law: 0.1 } },
  { id: "monitor-curved-32", category: "tech", subcategory: "monitors", subcategoryRank: 4, name: "32-inch curved 4K monitor", description: "1500R curvature, reduced eye strain", icon: "🖥️", widthCells: 3, heightCells: 1, tags: ["tech", "premium"], priceNewDefaultSek: 8200, priceUsedDefaultSek: 4000, presets: { it: 0.1, finance: 0.2, sales: 0.1, law: 0.05 } },
  { id: "dock-tb4", category: "tech", name: "Thunderbolt 4 dock", description: "90W charging, dual 4K out", icon: "🔌", widthCells: 1, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 3200, priceUsedDefaultSek: null, presets: { it: 1, finance: 1, sales: 1, law: 1 } },
  // Phase 9 subcategory: headsets
  { id: "headset-wired", category: "tech", subcategory: "headsets", subcategoryRank: 0, name: "Wired USB headset", description: "Plantronics Blackwire class — basic noise reduction", icon: "🎧", widthCells: 1, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 950, priceUsedDefaultSek: null, presets: { sales: 0.3, it: 0.2 } },
  { id: "headset", category: "tech", subcategory: "headsets", subcategoryRank: 1, name: "Wireless USB headset, noise-cancelling", description: "Jabra Evolve2 65 class", icon: "🎧", widthCells: 1, heightCells: 1, tags: ["tech", "acoustic"], priceNewDefaultSek: 2400, priceUsedDefaultSek: null, presets: { sales: 1, it: 0.3 } },
  { id: "headset-noise-cancel", category: "tech", subcategory: "headsets", subcategoryRank: 2, name: "Premium ANC headset", description: "Poly Voyager Focus 2 / Bose 700 class", icon: "🎧", widthCells: 1, heightCells: 1, tags: ["tech", "acoustic", "premium"], priceNewDefaultSek: 4800, priceUsedDefaultSek: null, presets: { sales: 0.2, it: 0.1, finance: 0.2, law: 0.1 } },
  { id: "webcam-hd", category: "tech", name: "HD webcam", description: "1080p, autofocus", icon: "📷", widthCells: 1, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 900, priceUsedDefaultSek: null, presets: { it: 0.5, finance: 0.5, sales: 0.5, law: 0.5 } },
  { id: "video-bar", category: "tech", name: "Conference video bar", description: "Logitech Rally Bar class", icon: "📹", widthCells: 2, heightCells: 1, tags: ["tech", "av"], priceNewDefaultSek: 28000, priceUsedDefaultSek: 14000, presets: { it: 0.05, finance: 0.08, sales: 0.06, law: 0.05 } },
  { id: "display-65", category: "tech", name: "65\" boardroom display", description: "4K, with mount", icon: "📺", widthCells: 3, heightCells: 1, tags: ["tech", "av"], priceNewDefaultSek: 18000, priceUsedDefaultSek: 9000, presets: { it: 0.05, finance: 0.08, sales: 0.06, law: 0.05 } },
  { id: "shredder", category: "tech", name: "Cross-cut shredder", description: "Security level P-4", icon: "🗑️", widthCells: 1, heightCells: 1, tags: ["gdpr", "security"], priceNewDefaultSek: 4200, priceUsedDefaultSek: 1800, presets: { finance: 0.1, law: 0.2 } },

  // meeting
  { id: "meeting-table-6", category: "meeting", name: "Meeting table, 6-person", description: "200×100 cm, oak", icon: "🪟", widthCells: 5, heightCells: 3, tags: ["meeting"], priceNewDefaultSek: 8500, priceUsedDefaultSek: 4000, presets: { it: 0.1, finance: 0.15, sales: 0.1, law: 0.15 } },
  { id: "boardroom-table", category: "meeting", name: "Boardroom table", description: "320×120 cm, seats 12", icon: "🟫", widthCells: 8, heightCells: 3, tags: ["meeting", "client-facing"], priceNewDefaultSek: 24000, priceUsedDefaultSek: 11000, presets: { it: 0.04, finance: 0.06, sales: 0.04, law: 0.08 } },
  { id: "meeting-chair", category: "meeting", name: "Meeting chair, fabric", description: "Stackable, mid-back", icon: "🪑", widthCells: 1, heightCells: 1, tags: ["meeting"], priceNewDefaultSek: 1800, priceUsedDefaultSek: 800, presets: { it: 0.6, finance: 0.8, sales: 0.6, law: 0.8 } },
  { id: "whiteboard", category: "meeting", name: "Magnetic whiteboard, 200×100 cm", description: "Wall-mounted", icon: "📋", widthCells: 5, heightCells: 1, tags: ["meeting"], priceNewDefaultSek: 2400, priceUsedDefaultSek: 1100, presets: { it: 0.15, finance: 0.1, sales: 0.15, law: 0.05 } },
  { id: "phone-booth", category: "meeting", name: "Phone booth, single-person", description: "Soundproof, ventilated", icon: "📞", widthCells: 2, heightCells: 2, tags: ["meeting", "acoustic"], priceNewDefaultSek: 48000, priceUsedDefaultSek: 22000, presets: { it: 0.06, finance: 0.1, sales: 0.15, law: 0.08 } },

  // storage
  // Phase 9 subcategory: storage-units (lockers + cabinets + shelving as one group; cabinet-lock/fireproof and shelving stay separate as specialty items)
  { id: "locker-8", category: "storage", subcategory: "storage-units", subcategoryRank: 0, name: "Personal locker (8-compartment)", description: "Steel, key locks — one per 1.5 desks", icon: "🗄️", widthCells: 2, heightCells: 2, tags: ["storage"], priceNewDefaultSek: 6400, priceUsedDefaultSek: 2800, presets: { it: 0.13, finance: 0.13, sales: 0.13, law: 0.13 } },
  { id: "storage-cabinet", category: "storage", subcategory: "storage-units", subcategoryRank: 1, name: "Office cabinet (general)", description: "1500×800 mm, 4 shelves, no lock", icon: "🗃️", widthCells: 2, heightCells: 1, tags: ["storage"], priceNewDefaultSek: 3200, priceUsedDefaultSek: 1400, presets: { it: 0.15, finance: 0.2, sales: 0.15, law: 0.2 } },
  { id: "storage-shelving", category: "storage", subcategory: "storage-units", subcategoryRank: 2, name: "Bookcase shelving", description: "5-tier, 1800×800 mm — books, files, decoration", icon: "📚", widthCells: 2, heightCells: 1, tags: ["storage", "client-facing"], priceNewDefaultSek: 2400, priceUsedDefaultSek: 1000, presets: { it: 0.1, finance: 0.15, sales: 0.1, law: 0.25 } },
  { id: "cabinet-lock", category: "storage", name: "Lockable cabinet", description: "1800×800 mm, key lock", icon: "🗃️", widthCells: 2, heightCells: 1, tags: ["storage"], priceNewDefaultSek: 4800, priceUsedDefaultSek: 2100, presets: { finance: 0.25, law: 0.4 } },
  { id: "cabinet-fireproof", category: "storage", name: "Fireproof cabinet", description: "60 min fire rating", icon: "🔥", widthCells: 2, heightCells: 1, tags: ["storage", "security"], priceNewDefaultSek: 18000, priceUsedDefaultSek: 8500, presets: { finance: 0.05, law: 0.1 } },
  { id: "safe-small", category: "storage", name: "Office safe, small", description: "Electronic lock", icon: "🔒", widthCells: 1, heightCells: 1, tags: ["storage", "security"], priceNewDefaultSek: 8200, priceUsedDefaultSek: 3500, presets: { finance: 0.04, law: 0.08 } },
  { id: "shelving", category: "storage", name: "Open shelving, 5-tier", description: "1800×800 mm", icon: "📚", widthCells: 2, heightCells: 1, tags: ["storage"], priceNewDefaultSek: 1900, priceUsedDefaultSek: 800, presets: { it: 0.2, finance: 0.3, sales: 0.2, law: 0.3 } },

  // lounge
  { id: "sofa-3", category: "lounge", name: "3-seat sofa", description: "Fabric, mid-century", icon: "🛋️", widthCells: 5, heightCells: 2, tags: ["lounge", "client-facing"], priceNewDefaultSek: 14000, priceUsedDefaultSek: 6500, presets: { it: 0.04, finance: 0.05, sales: 0.04, law: 0.06 } },
  { id: "armchair", category: "lounge", name: "Armchair", description: "Leather, lounge style", icon: "🪑", widthCells: 2, heightCells: 2, tags: ["lounge", "client-facing"], priceNewDefaultSek: 8500, priceUsedDefaultSek: 3800, presets: { it: 0.05, finance: 0.08, sales: 0.05, law: 0.12 } },
  { id: "side-table", category: "lounge", name: "Side table", description: "Round, 50 cm, oak", icon: "🟫", widthCells: 1, heightCells: 1, tags: ["lounge"], priceNewDefaultSek: 1800, priceUsedDefaultSek: 800, presets: { it: 0.05, finance: 0.08, sales: 0.05, law: 0.12 } },
  { id: "rug-large", category: "lounge", name: "Large rug, 200×300 cm", description: "Wool, neutral", icon: "🟪", widthCells: 5, heightCells: 3, tags: ["lounge"], priceNewDefaultSek: 4200, priceUsedDefaultSek: 1900, presets: { law: 0.08, finance: 0.05 } },
  { id: "plant-large", category: "lounge", name: "Large plant, floor-standing", description: "Ficus or similar, 180 cm", icon: "🪴", widthCells: 1, heightCells: 1, tags: ["lounge"], priceNewDefaultSek: 1400, priceUsedDefaultSek: null, presets: { it: 0.15, finance: 0.1, sales: 0.15, law: 0.1 } },

  // kitchen
  { id: "coffee-machine", category: "kitchen", name: "Bean-to-cup coffee machine", description: "Commercial grade, ~30 cups/day", icon: "☕", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 28000, priceUsedDefaultSek: 14000, presets: { it: 0.04, finance: 0.04, sales: 0.04, law: 0.04 } },
  { id: "fridge", category: "kitchen", name: "Office fridge, 280L", description: "Energy class A++", icon: "🧊", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 6800, priceUsedDefaultSek: 3000, presets: { it: 0.05, finance: 0.04, sales: 0.05, law: 0.04 } },
  { id: "dishwasher", category: "kitchen", name: "Dishwasher", description: "Integrated, 14 settings", icon: "🍽️", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 5400, priceUsedDefaultSek: 2200, presets: { it: 0.04, finance: 0.04, sales: 0.04, law: 0.04 } },
  { id: "communal-table", category: "kitchen", name: "Communal kitchen table", description: "240×90 cm, seats 10", icon: "🟫", widthCells: 6, heightCells: 2, tags: ["kitchen"], priceNewDefaultSek: 8800, priceUsedDefaultSek: 3800, presets: { it: 0.06, finance: 0.06, sales: 0.06, law: 0.06 } },
  { id: "bar-stool", category: "kitchen", name: "Bar stool", description: "Steel + oak", icon: "🪑", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 1400, priceUsedDefaultSek: 600, presets: { it: 0.2, finance: 0.2, sales: 0.25, law: 0.2 } },

  // transportation (Phase 8)
  { id: "delivery-local", category: "transportation", name: "Local delivery (Stockholm ≤10 km)", description: "Curbside drop-off, 1-3 business days", icon: "🚚", widthCells: 1, heightCells: 1, tags: ["transport"], priceNewDefaultSek: 1500, priceUsedDefaultSek: null, presets: { it: 0, finance: 0, sales: 0, law: 0 } },
  { id: "delivery-inside", category: "transportation", name: "Inside delivery + carry up", description: "Up to 2 flights of stairs, no assembly", icon: "📦", widthCells: 1, heightCells: 1, tags: ["transport"], priceNewDefaultSek: 2800, priceUsedDefaultSek: null, presets: { it: 0, finance: 0, sales: 0, law: 0 } },
  { id: "delivery-assembly", category: "transportation", name: "Inside delivery + assembly", description: "Full white-glove: delivery, carry, assemble", icon: "🔧", widthCells: 1, heightCells: 1, tags: ["transport"], priceNewDefaultSek: 4500, priceUsedDefaultSek: null, presets: { it: 0, finance: 0, sales: 0, law: 0 } },
  { id: "pickup-disposal", category: "transportation", name: "Old furniture pickup & disposal", description: "We collect and responsibly dispose of your old furniture", icon: "♻️", widthCells: 1, heightCells: 1, tags: ["transport", "sustainability"], priceNewDefaultSek: 3200, priceUsedDefaultSek: null, presets: { it: 0, finance: 0, sales: 0, law: 0 } },
];
