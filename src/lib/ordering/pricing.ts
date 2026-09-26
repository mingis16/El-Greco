// Pure pricing shared by the browser (to show totals) and the server (the only
// totals that count). Money is summed in whole cents to avoid float drift.

import type { MenuCategory, MenuItem } from "@/lib/menu-types";
import { ORDER_RULES } from "@/lib/ordering/config";
import type { CartLineInput, OrderLine, OrderTotals } from "@/lib/ordering/types";

export type MenuIndex = Map<string, { item: MenuItem; category: string }>;

export function buildMenuIndex(categories: MenuCategory[]): MenuIndex {
  const index: MenuIndex = new Map();
  for (const c of categories) for (const item of c.items) index.set(item.id, { item, category: c.name });
  return index;
}

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

export type PriceResult = { ok: true; line: OrderLine } | { ok: false; reason: string };

export function priceLine(index: MenuIndex, input: CartLineInput): PriceResult {
  const entry = index.get(input.itemId);
  if (!entry) return { ok: false, reason: "This item is no longer on the menu." };
  const { item, category } = entry;
  if (!item.available) return { ok: false, reason: `${item.name} is currently unavailable.` };

  const quantity = Math.trunc(input.quantity);
  if (!(quantity >= 1 && quantity <= ORDER_RULES.maxQuantityPerLine)) {
    return { ok: false, reason: `Choose between 1 and ${ORDER_RULES.maxQuantityPerLine} of ${item.name}.` };
  }

  let baseCents = toCents(item.price);
  let variantId: string | null = null;
  let variantName: string | null = null;
  if (item.variants.length > 0) {
    const variant = item.variants.find((v) => v.id === input.variantId);
    if (!variant) return { ok: false, reason: `Choose an option for ${item.name}.` };
    baseCents = toCents(variant.price);
    variantId = variant.id;
    variantName = variant.name;
  } else if (input.variantId) {
    return { ok: false, reason: `${item.name} has no options.` };
  }
  if (baseCents <= 0) return { ok: false, reason: `${item.name} can't be ordered online.` };

  const selected = new Set(input.addonOptionIds);
  const addons: OrderLine["addons"] = [];
  let addonCents = 0;
  for (const group of item.addons) {
    const chosen = group.options.filter((o) => selected.has(o.id));
    if (group.selectType === "single" && chosen.length > 1) {
      return { ok: false, reason: `Choose only one ${group.name.toLowerCase()} for ${item.name}.` };
    }
    for (const option of chosen) {
      selected.delete(option.id);
      addonCents += toCents(option.price);
      addons.push({ groupName: group.name, optionId: option.id, name: option.name, price: option.price });
    }
  }
  if (selected.size > 0) return { ok: false, reason: `An extra for ${item.name} is no longer available.` };

  const unitCents = baseCents + addonCents;
  const note = input.note?.trim() ? input.note.trim() : null;
  return {
    ok: true,
    line: {
      itemId: item.id,
      name: item.name,
      category,
      variantId,
      variantName,
      addons,
      quantity,
      unitPrice: fromCents(unitCents),
      lineTotal: fromCents(unitCents * quantity),
      note,
    },
  };
}

export function orderTotals(lines: Pick<OrderLine, "lineTotal">[]): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + toCents(l.lineTotal), 0);
  const serviceCharge = Math.round(subtotal * ORDER_RULES.serviceChargeRate);
  const tax = Math.round((subtotal + serviceCharge) * ORDER_RULES.taxRate);
  return {
    subtotal: fromCents(subtotal),
    serviceCharge: fromCents(serviceCharge),
    tax: fromCents(tax),
    total: fromCents(subtotal + serviceCharge + tax),
  };
}

/** Stable key so identical choices merge into one cart line. */
export function cartLineKey(line: Pick<CartLineInput, "itemId" | "variantId" | "addonOptionIds" | "note">) {
  return [line.itemId, line.variantId ?? "", [...line.addonOptionIds].sort().join("+"), line.note?.trim() ?? ""].join("|");
}
