"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShoppingBag } from "lucide-react";
import type { MenuCategory } from "@/lib/menu-types";
import { formatPrice } from "@/lib/menu-utils";
import { useCart } from "@/lib/ordering/cart";
import { buildMenuIndex, orderTotals, priceLine } from "@/lib/ordering/pricing";

/** Floating "View order" bar shown on the menu once something is in the cart. */
export function CartBar({ categories }: { categories: MenuCategory[] }) {
  const cart = useCart();
  const index = useMemo(() => buildMenuIndex(categories), [categories]);
  if (!cart.length) return null;

  const priced = cart.map((l) => priceLine(index, l)).flatMap((r) => (r.ok ? [r.line] : []));
  const count = priced.reduce((n, l) => n + l.quantity, 0);
  const { total } = orderTotals(priced);

  return (
    <Link
      href="/order"
      className="fixed right-20 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 flex items-center justify-between gap-3 rounded-full bg-charcoal-900 py-3 pr-5 pl-3 text-cream shadow-float ring-1 ring-mint-400/40 transition hover:bg-charcoal-800 sm:right-auto sm:bottom-6 sm:left-1/2 sm:min-w-80 sm:-translate-x-1/2 print:hidden"
    >
      <span className="flex items-center gap-3">
        <span className="relative grid size-10 place-items-center rounded-full bg-mint-400 text-charcoal-900">
          <ShoppingBag aria-hidden className="size-5" />
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-cream text-[0.65rem] font-bold text-charcoal-900">
            {count}
          </span>
        </span>
        <span className="text-sm font-semibold">View order</span>
      </span>
      <span className="font-display font-semibold tabular-nums">{formatPrice(total)}</span>
    </Link>
  );
}
