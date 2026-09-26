import type { MenuCategory, MenuGroupId, MenuItem } from "@/lib/menu-types";

export const MENU_GROUPS: readonly { id: MenuGroupId; label: string }[] = [
  { id: "brunch", label: "Brunch" },
  { id: "appetizers", label: "Appetizers" },
  { id: "mains", label: "Mains" },
  { id: "specialities", label: "Specialities" },
  { id: "desserts", label: "Desserts" },
  { id: "drinks", label: "Drinks" },
];

export function isMenuGroupId(value: string): value is MenuGroupId {
  return MENU_GROUPS.some((g) => g.id === value);
}

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Prices are in new Sierra Leonean leones (SLE), written "Le" locally. */
export function formatPrice(amount: number) {
  return `Le ${priceFormat.format(amount)}`;
}

/** Lowest price a guest can pay for the item, accounting for variants. */
export function startingPrice(item: MenuItem) {
  if (item.variants.length === 0) return item.price;
  return Math.min(...item.variants.map((v) => v.price));
}

export function priceLabel(item: MenuItem) {
  const prices = new Set(item.variants.map((v) => v.price));
  const from = prices.size > 1 ? "from " : "";
  return `${from}${formatPrice(startingPrice(item))}`;
}

export function groupStartingPrice(categories: MenuCategory[]) {
  const prices = categories.flatMap((c) =>
    c.items.filter((i) => i.available).map(startingPrice),
  );
  return prices.length ? Math.min(...prices) : undefined;
}

/** Lower-cases and strips accents so "frappe" matches "Frappés". */
export function normalizeSearch(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}
