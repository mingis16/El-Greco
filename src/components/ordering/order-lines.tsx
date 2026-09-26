import { formatPrice } from "@/lib/menu-utils";
import type { Order } from "@/lib/ordering/types";

/** Itemized lines and totals, shared by the guest receipt and the staff ticket. */
export function OrderLines({ order, showPrices = true }: { order: Order; showPrices?: boolean }) {
  return (
    <div>
      <table className="w-full text-sm">
        <caption className="sr-only">Items ordered</caption>
        <thead>
          <tr className="text-left text-xs text-ink-muted uppercase">
            <th scope="col" className="pb-2 font-semibold">Item</th>
            {showPrices && <th scope="col" className="pb-2 text-right font-semibold">Amount</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {order.lines.map((line, i) => (
            <tr key={`${line.itemId}-${i}`} className="align-top">
              <td className="py-2.5 pr-3">
                <p className="font-semibold">
                  <span className="tabular-nums">{line.quantity} ×</span> {line.name}
                  {line.variantName && <span className="font-normal"> ({line.variantName})</span>}
                </p>
                {line.addons.map((a) => (
                  <p key={a.optionId} className="text-ink-muted">
                    + {a.name}
                    {showPrices && a.price > 0 && ` (${formatPrice(a.price)})`}
                  </p>
                ))}
                {line.note && <p className="text-ink-muted italic">&ldquo;{line.note}&rdquo;</p>}
                {showPrices && (line.quantity > 1 || line.addons.length > 0) && (
                  <p className="text-xs text-ink-muted tabular-nums">@ {formatPrice(line.unitPrice)} each</p>
                )}
              </td>
              {showPrices && <td className="py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">{formatPrice(line.lineTotal)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {showPrices && (
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.serviceCharge > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Service charge</dt>
              <dd className="tabular-nums">{formatPrice(order.serviceCharge)}</dd>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Tax</dt>
              <dd className="tabular-nums">{formatPrice(order.tax)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
