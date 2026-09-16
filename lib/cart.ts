import type { Product } from "@/lib/types";

export interface CartSelection {
  optionId: string;
  groupName: string;
  name: string;
  priceDelta: number;
}

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selections: CartSelection[];
}

export function unitPriceFor(product: Product, selections: CartSelection[]): number {
  const base = product.discount_percent > 0 ? product.price * (1 - product.discount_percent / 100) : product.price;
  const optionsTotal = selections.reduce((sum, s) => sum + s.priceDelta, 0);
  return Math.max(0, base + optionsTotal);
}

export function lineKey(productId: string, selections: CartSelection[]): string {
  const ids = selections
    .map((s) => s.optionId)
    .sort()
    .join(",");
  return `${productId}::${ids}`;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

const STORAGE_PREFIX = "buyur-cart-";

export function loadCart(slug: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + slug);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(slug: string, lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(lines));
}
