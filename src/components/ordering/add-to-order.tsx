"use client";

import { useId, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import type { MenuItem } from "@/lib/menu-types";
import { formatPrice } from "@/lib/menu-utils";
import { addToCart } from "@/lib/ordering/cart";
import { ORDER_RULES } from "@/lib/ordering/config";

/** "Add" button on a menu card. Opens a dialog for options, add-ons, quantity and a note. */
export function AddToOrder({ item }: { item: MenuItem }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  if (!item.available) {
    return <span className="text-xs font-semibold text-ink-muted">Unavailable</span>;
  }

  const open = () => {
    setVariantId(item.variants.length === 1 ? item.variants[0].id : null);
    setAddonIds([]);
    setQuantity(1);
    setNote("");
    setError(null);
    dialogRef.current?.showModal();
  };

  const variantPrice = item.variants.find((v) => v.id === variantId)?.price;
  const base = item.variants.length ? variantPrice ?? 0 : item.price;
  const addonTotal = item.addons
    .flatMap((g) => g.options)
    .filter((o) => addonIds.includes(o.id))
    .reduce((sum, o) => sum + o.price, 0);
  const lineTotal = Math.round((base + addonTotal) * quantity * 100) / 100;

  const toggleAddon = (groupId: string, optionId: string, single: boolean) => {
    const group = item.addons.find((g) => g.id === groupId)!;
    setAddonIds((prev) => {
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);
      const others = single ? prev.filter((id) => !group.options.some((o) => o.id === id)) : prev;
      return [...others, optionId];
    });
  };

  const confirm = () => {
    if (item.variants.length && !variantId) {
      setError("Please choose an option.");
      return;
    }
    addToCart({ itemId: item.id, variantId, addonOptionIds: addonIds, quantity, note: note.trim() || undefined });
    dialogRef.current?.close();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Add ${item.name} to your order`}
        className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-900 px-3.5 py-1.5 text-xs font-semibold text-cream transition hover:bg-charcoal-700"
      >
        {justAdded ? <Check aria-hidden className="size-3.5 text-mint-300" /> : <Plus aria-hidden className="size-3.5" />}
        {justAdded ? "Added" : "Add"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card bg-surface p-0 text-ink shadow-float backdrop:bg-charcoal-950/60"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {item.name}
              </h2>
              {item.description && <p className="mt-1 text-sm text-ink-muted">{item.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-charcoal-100"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {item.variants.length > 0 && (
              <fieldset>
                <legend className="text-sm font-semibold">
                  Choose one <span className="font-normal text-danger-700">*</span>
                </legend>
                <div className="mt-2 grid gap-2">
                  {item.variants.map((v) => (
                    <label key={v.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-line has-[:checked]:bg-mint-50 has-[:checked]:ring-mint-400">
                      <span className="flex items-center gap-3 text-sm">
                        <input
                          type="radio"
                          name="variant"
                          checked={variantId === v.id}
                          onChange={() => {
                            setVariantId(v.id);
                            setError(null);
                          }}
                          className="size-4 accent-mint-600"
                        />
                        {v.name}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(v.price)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {item.addons.map((group) => (
              <fieldset key={group.id}>
                <legend className="text-sm font-semibold">
                  {group.name}{" "}
                  <span className="font-normal text-ink-muted">({group.selectType === "multi" ? "optional, choose any" : "optional, choose one"})</span>
                </legend>
                <div className="mt-2 grid gap-2">
                  {group.options.map((o) => (
                    <label key={o.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-line has-[:checked]:bg-mint-50 has-[:checked]:ring-mint-400">
                      <span className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={addonIds.includes(o.id)}
                          onChange={() => toggleAddon(group.id, o.id, group.selectType === "single")}
                          className="size-4 accent-mint-600"
                        />
                        {o.name}
                      </span>
                      <span className="text-sm text-ink-muted tabular-nums">+{formatPrice(o.price)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div>
              <label htmlFor={`${titleId}-note`} className="text-sm font-semibold">
                Note for the kitchen <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id={`${titleId}-note`}
                value={note}
                maxLength={140}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. no onions, extra spicy"
                className="mt-2 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-danger-700">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-line p-5">
            <div className="flex items-center gap-1 rounded-full ring-1 ring-line">
              <button
                type="button"
                aria-label="One fewer"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="grid size-10 place-items-center rounded-full disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="One more"
                disabled={quantity >= ORDER_RULES.maxQuantityPerLine}
                onClick={() => setQuantity((q) => Math.min(ORDER_RULES.maxQuantityPerLine, q + 1))}
                className="grid size-10 place-items-center rounded-full disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-ink transition hover:bg-mint-300"
            >
              <ShoppingBag aria-hidden className="size-4" />
              Add to order{base > 0 ? ` · ${formatPrice(lineTotal)}` : ""}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
