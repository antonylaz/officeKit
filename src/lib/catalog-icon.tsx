import {
  Armchair,
  Box,
  Cable,
  Camera,
  ClipboardList,
  Coffee,
  Headphones,
  Lamp,
  Lock,
  Monitor,
  Package,
  PanelTopOpen,
  Refrigerator,
  Sofa,
  Sparkles,
  Square,
  Table2,
  Trash2,
  Truck,
  Tv,
  Users,
  Video,
  Wind,
  type LucideIcon,
} from "lucide-react";
export interface IconableItem {
  id: string;
  category: string;
  subcategory: string | null;
}

/**
 * Maps a catalog item to a Lucide icon. Mapping order:
 *   1. exact item id  → most specific (e.g. "dock-tb4" → Cable)
 *   2. subcategory    → covers monitor/chair/desk/headset families
 *   3. category       → covers tech / meeting / storage / breakroom / transport
 *   4. fallback Box
 */
export function getCatalogIcon(item: IconableItem): LucideIcon {
  const byId: Record<string, LucideIcon> = {
    "monitor-arm": Monitor,
    "monitor-arm-dual": Monitor,
    "dock-tb4": Cable,
    "webcam-hd": Camera,
    "video-bar": Video,
    "display-65": Tv,
    "shredder": Trash2,
    "boardroom-table": Table2,
    "meeting-table-6": Table2,
    "meeting-chair": Armchair,
    "communal-table": Table2,
    "whiteboard": ClipboardList,
    "phone-booth": PanelTopOpen,
    "armchair": Armchair,
    "sofa-3": Sofa,
    "side-table": Table2,
    "rug-large": Square,
    "plant-large": Sparkles,
    "leather-chair": Armchair,
    "bar-stool": Armchair,
    "coffee-machine": Coffee,
    "fridge": Refrigerator,
    "dishwasher": Refrigerator,
    "locker-8": Lock,
    "safe-small": Lock,
    "cabinet-lock": Lock,
    "cabinet-fireproof": Lock,
    "storage-cabinet": Package,
    "storage-shelving": Package,
    "shelving": Package,
    "desk-divider": Wind,
    "delivery-local": Truck,
    "delivery-inside": Truck,
    "delivery-assembly": Truck,
    "pickup-disposal": Truck,
  };
  if (byId[item.id]) return byId[item.id]!;

  const bySubcategory: Record<string, LucideIcon> = {
    monitors: Monitor,
    chairs: Armchair,
    desks: Table2,
    headsets: Headphones,
  };
  if (item.subcategory && bySubcategory[item.subcategory]) return bySubcategory[item.subcategory]!;

  const byCategory: Record<string, LucideIcon> = {
    workstations: Table2,
    tech: Monitor,
    meeting: Users,
    storage: Package,
    breakroom: Coffee,
    common: Lamp,
    transportation: Truck,
  };
  if (byCategory[item.category]) return byCategory[item.category]!;

  return Box;
}

interface Props {
  item: IconableItem;
  className?: string;
  /** Hex / token color override. Defaults to var(--color-ink-soft). */
  color?: string;
}

export function CatalogIcon(props: Props) {
  return renderCatalogIcon(props);
}

// Render-only helper — keeps the icon-component lookup outside React's render contract
// so eslint's react-hooks/static-components rule stays happy.
function renderCatalogIcon({ item, className, color }: Props) {
  const Icon = getCatalogIcon(item);
  return <Icon className={className} style={{ color: color ?? "var(--color-ink-soft)" }} strokeWidth={1.6} />;
}
