import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StaffTabs } from "@/components/booking/staff-tabs";
import { OrderLines } from "@/components/ordering/order-lines";
import { PaymentBadge } from "@/components/ordering/payment-badge";
import { StaffOrderActions } from "@/components/ordering/staff-order-actions";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { addDays, formatDateLong, formatTime, venueNow } from "@/lib/booking/time";
import { formatPrice } from "@/lib/menu-utils";
import { formatOrderNumber, type OrderStatus } from "@/lib/ordering/config";
import { ORDER_ACTIONS, orderActionsFor, suggestedSettlement } from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";
import type { Order } from "@/lib/ordering/types";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

const COLUMNS: { status: OrderStatus[]; title: string }[] = [
  { status: ["received"], title: "New" },
  { status: ["preparing"], title: "Preparing" },
  { status: ["ready"], title: "Ready" },
  { status: ["completed", "cancelled"], title: "Done" },
];

export default function StaffOrdersPage(props: PageProps<"/staff/orders">) {
  return (
    <section className="container-page py-10 sm:py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <Board {...props} />
      </Suspense>
    </section>
  );
}

async function Board({ searchParams }: PageProps<"/staff/orders">) {
  const [query, staff] = await Promise.all([searchParams, isStaffRequest()]);
  if (!staff) redirect("/staff?next=/staff/orders");

  const today = venueNow().date;
  const date = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : today;
  const orders = await (await getOrderStore()).listForDate(date);
  const live = orders.filter((o) => o.status !== "cancelled");
  const takings = live.filter((o) => o.paymentStatus === "paid").reduce((n, o) => n + o.total, 0);
  const outstanding = live.filter((o) => o.paymentStatus !== "paid" && o.paymentStatus !== "refunded").reduce((n, o) => n + o.total, 0);

  return (
    <div className="space-y-8">
      <StaffTabs current="orders" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary-text">Kitchen board</p>
          <h1 className="mt-1 text-3xl font-bold">
            {date === today ? "Today, " : ""}
            {formatDateLong(date)}
          </h1>
        </div>
        <nav aria-label="Change date" className="flex items-center gap-1">
          <Link href={`/staff/orders?date=${addDays(date, -1)}`} aria-label="Previous day" className="grid size-10 place-items-center rounded-full ring-1 ring-line hover:ring-charcoal-400">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href="/staff/orders" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-charcoal-400">
            Today
          </Link>
          <Link href={`/staff/orders?date=${addDays(date, 1)}`} aria-label="Next day" className="grid size-10 place-items-center rounded-full ring-1 ring-line hover:ring-charcoal-400">
            <ChevronRight className="size-5" />
          </Link>
        </nav>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Orders", value: String(live.length) },
          { label: "Awaiting payment check", value: String(orders.filter((o) => o.paymentStatus === "pending_verification").length) },
          { label: "Paid", value: formatPrice(takings) },
          { label: "Outstanding", value: formatPrice(outstanding) },
        ].map((s) => (
          <div key={s.label} className="rounded-card bg-surface p-4 ring-1 ring-line">
            <dt className="text-xs text-ink-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {orders.length === 0 ? (
        <p className="rounded-card bg-surface p-8 text-center text-ink-muted ring-1 ring-line">No orders for this day yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const inColumn = orders.filter((o) => col.status.includes(o.status));
            return (
              <section key={col.title} aria-label={col.title} className="rounded-card bg-charcoal-50 p-3 ring-1 ring-line">
                <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-semibold">
                  {col.title}
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs tabular-nums ring-1 ring-line">{inColumn.length}</span>
                </h2>
                <ul className="space-y-3">
                  {inColumn.map((o) => (
                    <li key={o.id}>
                      <OrderCard order={o} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const where = order.fulfilment === "dine_in" ? `Table ${order.tableLabel ?? order.bookingRef ?? "?"}` : `Pickup ${formatTime(order.pickupTime!)}`;
  return (
    <article className={`rounded-xl bg-surface p-3 text-sm ring-1 ring-line ${order.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/staff/orders/${order.ref}`} className="font-display text-xl font-bold hover:underline">
            {formatOrderNumber(order.orderNumber)}
          </Link>
          <p className="font-semibold">{where}</p>
          <p className="text-xs text-ink-muted">
            {order.customerName} · placed {formatTime(order.createdAt.slice(11, 16))}
          </p>
        </div>
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <div className="mt-2 border-t border-line pt-2">
        <OrderLines order={order} showPrices={false} />
      </div>
      {order.notes && <p className="mt-2 rounded-lg bg-wood-50 p-2 text-xs text-wood-800">Note: {order.notes}</p>}
      <p className="mt-2 text-right font-semibold tabular-nums">{formatPrice(order.total)}</p>
      <div className="mt-2">
        <StaffOrderActions
          compact
          orderRef={order.ref}
          actions={orderActionsFor(order.status).filter((a) => a !== "cancel").map((id) => ({ id, label: ORDER_ACTIONS[id].label }))}
          paymentStatus={order.paymentStatus}
          suggestedMethod={suggestedSettlement(order)}
          reportedReference={order.paymentReference}
        />
      </div>
    </article>
  );
}
