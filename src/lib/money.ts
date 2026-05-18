export const VAT_RATE = 0.25;

export function fromSek(sek: number): number {
  return Math.round(sek * 100);
}

export function toSek(ore: number): number {
  return ore / 100;
}

export function addVat(oreExVat: number): number {
  return Math.round(oreExVat * (1 + VAT_RATE));
}

export function removeVat(oreIncVat: number): number {
  return Math.round(oreIncVat / (1 + VAT_RATE));
}

export function formatSek(ore: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(toSek(ore));
}
