import Link from "next/link";
import { AlertTriangle, BadgeCheck, ShieldX } from "lucide-react";
import { OrderLines } from "@/components/ordering/order-lines";
import { OrderStatusBadge, PaymentBadge } from "@/components/ordering/payment-badge";
import { StaffOrderActions } from "@/components/ordering/staff-order-actions";
import { formatPhone } from "@/lib/booking/phone";
import { checkBookingToken, normalizeRef } from "@/lib/booking/security";
import { formatDateLong, formatTime, formatTimestamp, venueNow } from "@/lib/booking/time";
import { formatPrice } from "@/lib/menu-utils";
import { formatOrderNumber } from "@/lib/ordering/config";
import { ORDER_ACTIONS, orderActionsFor, suggestedSettlement } from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";

/** What staff (or anyone) see after scanning the QR stamp on an order receipt. */
export async function OrderVerification({ rawRef, token, staff }: { rawRef: string; token: string | null; staff: boolean }) {
  const ref = normalizeRef(rawRef, "OR");
  const genuine = Boolean(ref && checkBookingToken("verify", ref, token));
  const order = ref && (genuine || staff) ? await (await getOrderStore()).findByRef(ref) : null;

  if (!order || (!genuine && !staff)) {
    return (
      <div className="mx-auto max-w-xl rounded-card bg-danger-50 p-8 text-center text-danger-700 ring-1 ring-danger-700/20">
        <ShieldX aria-hidden className="mx-auto size-12" />
        <h1 className="mt-3 text-2xl font-bold">Not a valid El Greco receipt</h1>
        <p className="mt-2 text-sm">This code doesn&apos;t match any order on our system. Don&apos;t hand over food or accept it as proof of payment.</p>
      </div>
    );
  }

  const warnings: string[] = [];
  if (order.orderDate !== venueNow().date) warnings.push(`This order is from ${formatDateLong(order.orderDate)}, not today.`);
  if (order.status === "completed") warnings.push("Already served or collected. Don't hand it over again.");
  if (order.status === "cancelled") warnings.push("This order was cancelled.");
  if (order.paymentStatus === "pending_verification") warnings.push("Mobile money payment reported but not yet verified.");
  if (order.paymentStatus === "unpaid" && order.status !== "cancelled") warnings.push(`Not paid yet: collect ${formatPrice(order.total)}.`);

  const ok = order.status !== "cancelled";
  const where = order.fulfilment === "dine_in" ? `Table ${order.tableLabel ?? order.bookingRef ?? "-"}` : `Pickup at ${formatTime(order.pickupTime!)}`;
  const firstName = order.customerName.split(" ")[0];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className={`rounded-card p-6 text-center ring-1 ${ok ? "bg-success-50 text-success-700 ring-success-700/20" : "bg-danger-50 text-danger-700 ring-danger-700/20"}`}>
        {ok ? <BadgeCheck aria-hidden className="mx-auto size-12" /> : <ShieldX aria-hidden className="mx-auto size-12" />}
        <h1 className="mt-3 text-2xl font-bold">{genuine ? "Genuine El Greco receipt" : "Order found (reference lookup)"}</h1>
        <p className="mt-1 font-display text-4xl font-bold text-ink tabular-nums">{formatOrderNumber(order.orderNumber)}</p>
        <p className="font-mono text-sm font-semibold text-ink">{order.ref}</p>
        <div className="mt-3 flex justify-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 rounded-xl bg-warning-50 p-3 text-sm font-medium text-warning-700 ring-1 ring-warning-700/20">
              <AlertTriangle aria-hidden className="size-5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-card bg-surface p-6 text-sm shadow-card ring-1 ring-line">
        <dl className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-ink-muted">Customer</dt>
            <dd className="font-semibold">{staff ? `${order.customerName} · ${formatPhone(order.customerPhone)}` : firstName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Service</dt>
            <dd className="font-semibold">{where}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Placed</dt>
            <dd className="font-semibold">{formatTimestamp(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Total</dt>
            <dd className="font-semibold tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <OrderLines order={order} showPrices={staff} />
      </div>

      {staff ? (
        <div className="rounded-card bg-surface p-5 ring-1 ring-line">
          <p className="mb-3 text-sm font-semibold">Staff actions</p>
          <StaffOrderActions
            orderRef={order.ref}
            actions={orderActionsFor(order.status).map((id) => ({ id, label: ORDER_ACTIONS[id].label }))}
            paymentStatus={order.paymentStatus}
            suggestedMethod={suggestedSettlement(order)}
            reportedReference={order.paymentReference}
          />
          <Link href={`/staff/orders/${order.ref}`} className="mt-4 inline-block text-sm font-semibold text-primary-text hover:underline">
            Open full order and history
          </Link>
        </div>
      ) : (
        <p className="text-center text-sm text-ink-muted">
          Staff:{" "}
          <Link href={`/staff?next=${encodeURIComponent(`/verify/${order.ref}?v=${token}`)}`} className="font-semibold text-primary-text underline">
            sign in
          </Link>{" "}
          to see payment details and update this order.
        </p>
      )}
    </div>
  );
}
