import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/booking/print-button";
import { QrCode } from "@/components/booking/qr-code";
import { StaffTabs } from "@/components/booking/staff-tabs";
import { OrderLines } from "@/components/ordering/order-lines";
import { OrderStatusBadge, PaymentBadge } from "@/components/ordering/payment-badge";
import { StaffOrderActions } from "@/components/ordering/staff-order-actions";
import { formatPhone } from "@/lib/booking/phone";
import { normalizeRef } from "@/lib/booking/security";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { formatDateLong, formatTime, formatTimestamp } from "@/lib/booking/time";
import { formatPrice } from "@/lib/menu-utils";
import { formatOrderNumber, fulfilmentLabel, paymentMethodLabel } from "@/lib/ordering/config";
import { ORDER_ACTIONS, orderActionsFor, orderVerifyPath, suggestedSettlement } from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";
import { requestOrigin } from "@/lib/origin";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default function StaffOrderPage(props: PageProps<"/staff/orders/[ref]">) {
  return (
    <section className="container-page py-10 sm:py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <StaffOrder {...props} />
      </Suspense>
    </section>
  );
}

async function StaffOrder({ params }: PageProps<"/staff/orders/[ref]">) {
  const { ref: rawRef } = await params;
  if (!(await isStaffRequest())) redirect(`/staff?next=${encodeURIComponent(`/staff/orders/${rawRef}`)}`);

  const ref = normalizeRef(rawRef, "OR");
  const order = ref ? await (await getOrderStore()).findByRef(ref) : null;
  if (!order) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center ring-1 ring-line">
        <h1 className="text-2xl font-bold">No order with reference {rawRef.toUpperCase()}</h1>
        <Link href="/staff/orders" className="mt-5 inline-block rounded-full bg-charcoal-900 px-5 py-2.5 font-semibold text-cream">
          Back to orders
        </Link>
      </div>
    );
  }

  const verifyUrl = `${await requestOrigin()}${orderVerifyPath(order.ref)}`;
  const where =
    order.fulfilment === "dine_in"
      ? `Table ${order.tableLabel ?? "-"}${order.bookingRef ? ` (booking ${order.bookingRef})` : ""}`
      : `Pickup at ${formatTime(order.pickupTime!)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StaffTabs current="orders" />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/staff/orders?date=${order.orderDate}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> {formatDateLong(order.orderDate)}
        </Link>
        <PrintButton label="Print kitchen ticket" />
      </div>

      {/* Kitchen ticket: prints without prices so the pass can plate from it. */}
      <article className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line print:shadow-none print:ring-charcoal-900">
        <header className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <p className="eyebrow text-primary-text">{fulfilmentLabel(order.fulfilment)}</p>
            <p className="mt-1 font-display text-5xl font-bold tabular-nums">{formatOrderNumber(order.orderNumber)}</p>
            <p className="mt-1 text-lg font-semibold">{where}</p>
            <p className="text-sm text-ink-muted">
              {order.ref} · placed {formatTimestamp(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            <QrCode value={verifyUrl} label={`Verification QR for ${order.ref}`} className="mt-2 w-24 rounded-lg ring-1 ring-line" />
          </div>
        </header>
        <div className="p-6">
          <OrderLines order={order} />
          {order.notes && <p className="mt-4 rounded-lg bg-wood-50 p-3 text-sm font-semibold text-wood-800">Order note: {order.notes}</p>}
        </div>
        <dl className="grid gap-3 border-t border-line p-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-muted">Customer</dt>
            <dd className="font-semibold">
              {order.customerName} · <a href={`tel:${order.customerPhone}`} className="underline">{formatPhone(order.customerPhone)}</a>
            </dd>
            {order.customerEmail && <dd className="text-ink-muted">{order.customerEmail}</dd>}
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Payment</dt>
            <dd className="font-semibold">
              {paymentMethodLabel(order.settledWith ?? order.paymentMethod)} · {formatPrice(order.amountPaid)} of {formatPrice(order.total)}
            </dd>
            {order.paymentReference && <dd className="font-mono text-xs">{order.paymentReference}</dd>}
          </div>
        </dl>
        <div className="border-t border-line p-6 print:hidden">
          <p className="mb-3 text-sm font-semibold">Actions</p>
          <StaffOrderActions
            orderRef={order.ref}
            actions={orderActionsFor(order.status).map((id) => ({ id, label: ORDER_ACTIONS[id].label }))}
            paymentStatus={order.paymentStatus}
            suggestedMethod={suggestedSettlement(order)}
            reportedReference={order.paymentReference}
          />
        </div>
      </article>

      <section aria-labelledby="history-heading" className="rounded-card bg-surface p-6 ring-1 ring-line print:hidden">
        <h2 id="history-heading" className="font-semibold">
          History
        </h2>
        <ol className="mt-4 space-y-3 border-l-2 border-line pl-4 text-sm">
          {[...order.history].reverse().map((event, i) => (
            <li key={`${event.at}-${i}`}>
              <p className="font-semibold">{event.action}</p>
              <p className="text-xs text-ink-muted">
                {formatTimestamp(event.at)} · {event.actor}
                {event.note ? ` · “${event.note}”` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
