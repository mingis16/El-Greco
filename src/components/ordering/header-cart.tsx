"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/ordering/cart";

export function HeaderCart() {
  const count = useCart().reduce((n, l) => n + l.quantity, 0);
  return (
    <Link
      href="/order"
      aria-label={count ? `Your order, ${count} ${count === 1 ? "item" : "items"}` : "Your order"}
      className="relative grid size-11 place-items-center rounded-full text-cream transition hover:bg-charcoal-800"
    >
      <ShoppingBag aria-hidden className="size-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-mint-400 px-1 text-[0.65rem] font-bold text-charcoal-900 tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
