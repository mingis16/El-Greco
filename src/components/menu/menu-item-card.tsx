import { Timer } from "lucide-react";
import type { MenuItem } from "@/lib/menu-types";
import { formatPrice, priceLabel } from "@/lib/menu-utils";

export function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <article
      className={`flex h-full flex-col rounded-card bg-surface p-4 shadow-card ring-1 ring-line sm:p-5 ${
        item.available ? "" : "opacity-65"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[0.95rem] leading-snug font-semibold">{item.name}</h3>
        <p className="shrink-0 font-display text-[0.95rem] font-semibold whitespace-nowrap tabular-nums">
          {priceLabel(item)}
        </p>
      </div>

      {item.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.description}</p>
      )}

      {item.variants.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${item.name} options`}>
          {item.variants.map((v) => (
            <li
              key={v.id}
              className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-medium text-mint-800 ring-1 ring-mint-100"
            >
              {v.name} · {formatPrice(v.price)}
            </li>
          ))}
        </ul>
      )}

      {item.addons.map((addon) => (
        <p key={addon.id} className="mt-2 text-xs leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink">
            {addon.name} ({addon.selectType === "multi" ? "choose any" : "choose one"}):
          </span>{" "}
          {addon.options.map((o) => `${o.name} +${formatPrice(o.price)}`).join(", ")}
        </p>
      ))}

      {(item.weight || item.prepMinutes || !item.available) && (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-ink-muted">
          {!item.available && (
            <span className="rounded-full bg-charcoal-900 px-2.5 py-1 font-semibold text-cream">
              Currently unavailable
            </span>
          )}
          {item.weight && (
            <span className="rounded-full bg-wood-50 px-2.5 py-1 font-medium text-wood-700 ring-1 ring-wood-100">
              {item.weight}
            </span>
          )}
          {item.prepMinutes && (
            <span className="inline-flex items-center gap-1">
              <Timer aria-hidden className="size-3.5" />
              ~{item.prepMinutes} min
            </span>
          )}
        </div>
      )}
    </article>
  );
}
