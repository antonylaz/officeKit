import type { Industry } from "@prisma/client";

export interface RoomOutline {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const LAW: RoomOutline[] = [
  { id: "reception", label: "Reception", x: 0, y: 0, w: 7, h: 5 },
  { id: "boardroom", label: "Boardroom", x: 7, y: 0, w: 8, h: 6 },
  { id: "offices", label: "Private offices", x: 0, y: 5, w: 7, h: 6 },
  { id: "archive", label: "Archive", x: 15, y: 0, w: 7, h: 4 },
  { id: "kitchen", label: "Kitchen", x: 15, y: 4, w: 7, h: 4 },
  { id: "phone-booths", label: "Phone booths", x: 7, y: 6, w: 4, h: 5 },
];

const IT: RoomOutline[] = [
  { id: "open-work", label: "Open work", x: 0, y: 0, w: 14, h: 8 },
  { id: "phone-booths", label: "Phone booths", x: 14, y: 0, w: 4, h: 6 },
  { id: "meeting", label: "Meeting room", x: 18, y: 0, w: 4, h: 4 },
  { id: "kitchen", label: "Kitchen", x: 14, y: 6, w: 4, h: 5 },
  { id: "lounge", label: "Lounge", x: 18, y: 4, w: 4, h: 5 },
];

const FINANCE: RoomOutline[] = [
  { id: "reception", label: "Reception", x: 0, y: 0, w: 6, h: 4 },
  { id: "boardroom", label: "Boardroom", x: 6, y: 0, w: 8, h: 5 },
  { id: "open-work", label: "Open work", x: 0, y: 4, w: 14, h: 7 },
  { id: "secure-storage", label: "Secure storage", x: 14, y: 0, w: 4, h: 5 },
  { id: "kitchen", label: "Kitchen", x: 14, y: 5, w: 4, h: 5 },
];

const SALES: RoomOutline[] = [
  { id: "open-work", label: "Open work", x: 0, y: 0, w: 16, h: 8 },
  { id: "phone-booths", label: "Phone booths", x: 16, y: 0, w: 4, h: 6 },
  { id: "meeting", label: "Meeting", x: 0, y: 8, w: 8, h: 3 },
  { id: "kitchen", label: "Kitchen", x: 8, y: 8, w: 8, h: 3 },
  { id: "lounge", label: "Lounge", x: 16, y: 6, w: 4, h: 5 },
];

const MAP: Record<Industry, RoomOutline[]> = { law: LAW, it: IT, finance: FINANCE, sales: SALES };

export function getRoomsForIndustry(industry: Industry): RoomOutline[] {
  return MAP[industry];
}
