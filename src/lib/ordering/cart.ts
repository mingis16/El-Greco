"use client";

// The guest's cart, kept in localStorage so it survives refreshes and is
// shared by the menu and checkout pages. Falls back to memory when storage is
// blocked. Prices are never stored here; they're computed from the menu.

import { useSyncExternalStore } from "react";
import { ORDER_RULES } from "@/lib/ordering/config";
import { cartLineKey } from "@/lib/ordering/pricing";
import type { CartLineInput } from "@/lib/ordering/types";

export interface CartLine extends CartLineInput {
  key: string;
}

const STORAGE_KEY = "egk.cart.v1";
const CHANGE_EVENT = "egk:cart-change";
const EMPTY: CartLine[] = [];

let memoryRaw: string | null = null;
let cachedRaw: string | null | undefined;
let cachedLines: CartLine[] = EMPTY;

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(value)) return EMPTY;
    return value.filter(
      (l) => typeof l?.itemId === "string" && Array.isArray(l.addonOptionIds) && Number.isInteger(l.quantity) && l.quantity > 0,
    );
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parse(raw);
  }
  return cachedLines;
}

function write(lines: CartLine[]) {
  const raw = lines.length ? JSON.stringify(lines) : null;
  try {
    if (raw) window.localStorage.setItem(STORAGE_KEY, raw);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    memoryRaw = raw;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function addToCart(input: CartLineInput) {
  const key = cartLineKey(input);
  const lines = getSnapshot();
  const existing = lines.find((l) => l.key === key);
  if (existing) {
    write(
      lines.map((l) =>
        l.key === key ? { ...l, quantity: Math.min(ORDER_RULES.maxQuantityPerLine, l.quantity + input.quantity) } : l,
      ),
    );
  } else {
    write([...lines, { ...input, key }].slice(-ORDER_RULES.maxLines));
  }
}

export function setCartQuantity(key: string, quantity: number) {
  const q = Math.max(0, Math.min(ORDER_RULES.maxQuantityPerLine, Math.trunc(quantity)));
  write(getSnapshot().flatMap((l) => (l.key !== key ? [l] : q > 0 ? [{ ...l, quantity: q }] : [])));
}

export function removeFromCart(key: string) {
  write(getSnapshot().filter((l) => l.key !== key));
}

export function clearCart() {
  write([]);
}
