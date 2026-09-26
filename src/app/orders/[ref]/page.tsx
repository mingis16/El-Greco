import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, FileDown, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { PrintButton } from "@/components/booking/print-button";
import { QrCode } from "@/components/booking/qr-code";
import { OrderLines } from "@/components/ordering/order-lines";
import { OrderProgress } from "@/components/ordering/order-progress";
import { PaymentBadge } from "@/components/ordering/payment-badge";
import { PaymentReport } from "@/components/ordering/payment-report";
import { maskPhone } from "@/lib/booking/phone";
import { checkBookingToken, normalizeRef } from "@/lib/booking/security";
import { formatTime, formatTimestamp } from "@/lib/booking/time";
import { formatPrice } from "@/lib/menu-utils";
import { PAYMENT_METHODS, formatOrderNumber, paymentMethodLabel } from "@/lib/ordering/config";
import { mobileMoneyAccounts, orderVerifyPath } from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";
import { requestOrigin } from "@/lib/origin";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your receipt",
  robots: { index: false, follow: false },
};

export default function ReceiptPage(props: PageProps<"/orders/[ref]">) {
  return (
    <section className="container-page py-10 sm:py-14">
      <Suspense fallback={<div className="mx-auto h-[40rem] max-w-xl animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <Receipt {...props} />
      </Suspense>
    </section>
  );
}

async function Receipt({ params, searchParams }: PageProps<"/orders/[ref]">) {
  const [{ ref: rawRef }, query] = await Promise.all([params, searchParams]);
  const ref = normalizeRef(rawRef, "OR");
  const token = typeof query.t === "string" ? query.t : null;
  const order = ref && checkBookingToken("manage", ref, token) ? await (await getOrderStore()).findByRef(ref) : null;

  if (!ref || !token || !order) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center shadow-card ring-1 ring-line">
        <h1 className="text-2xl font-bold">We can&apos;t open this receipt</h1>
        <p className="mt-3 text-ink-muted">The link may be incomplete. Open it again from your order confirmation, or ask a member of staff.</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-ink">
          Back to the menu
        </Link>
      </div>
    );
  }

  const verifyUrl = `${await requestOrigin()}${orderVerifyPath(order.ref)}`;
  const tokenQuery = `?t=${encodeURIComponent(token)}`;
  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  const balance = order.paymentStatus === "refunded" ? 0 : Math.max(0, order.total - order.amountPaid);
  const where =
    order.fulfilment === "dine_in"
      ? `Dine in${order.tableLabel ? ` · Table ${order.tableLabel}` : ""}`
      : `Pickup at ${formatTime(order.pickupTime!)}`;

  return (
    <div className="mx-auto max-w-xl">
      {query.new === "1" && (
        <div role="status" className="mb-6 flex gap-3 rounded-card bg-success-50 p-4 text-sm text-success-700 ring-1 ring-success-700/20 print:hidden">
          <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Order sent to the kitchen. Your number is {formatOrderNumber(order.orderNumber)}.</p>
            <p className="mt-1">Keep this page open to follow your order. It&apos;s also your receipt.</p>
          </div>
        </div>
      )}

      <article className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line print:shadow-none">
        <header className="flex items-center justify-between gap-4 bg-charcoal-900 px-6 py-5 text-cream">
          <Logo plain className="h-14 w-auto" />
          <div className="text-right">
            <p className="eyebrow text-mint-400">Receipt</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatOrderNumber(order.orderNumber)}</p>
          </div>
        </header>
        <div aria-hidden className="h-1 bg-mint-400" />

        <div className="p-6">
          <OrderProgress status={order.status} />
        </div>

        <div className="grid gap-4 border-t border-dashed border-line p-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-muted">Order reference</p>
            <p className="font-mono text-lg font-bold tracking-wider">{order.ref}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Placed</p>
            <p className="font-semibold">{formatTimestamp(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Service</p>
            <p className="font-semibold">{where}</p>
            {order.bookingRef && <p className="text-xs text-ink-muted">Booking {order.bookingRef}</p>}
          </div>
          <div>
            <p className="text-xs text-ink-muted">Customer</p>
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-xs text-ink-muted">{maskPhone(order.customerPhone)}</p>
          </div>
          {order.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs text-ink-muted">Order notes</p>
              <p className="font-semibold">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="border-t border-line p-6">
          <OrderLines order={order} />
        </div>

        <div className="border-t border-line bg-background/60 p-6">
          {order.paymentStatus === "paid" ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-success-700 px-4 py-3 text-success-700">
              <CheckCircle2 aria-hidden className="size-6 shrink-0" />
              <div>
                <p className="font-display text-lg font-bold tracking-widest">PAID IN FULL</p>
                <p className="text-xs font-semibold">
                  {formatPrice(order.amountPaid)} by {paymentMethodLabel(order.settledWith ?? order.paymentMethod)}
                  {order.paidAt ? ` · ${formatTimestamp(order.paidAt)}` : ""}
                </p>
              </div>
            </div>
          ) : order.paymentStatus === "refunded" ? (
            <p className="mb-4 rounded-xl bg-charcoal-100 px-4 py-3 text-sm font-semibold">This order was refunded.</p>
          ) : order.status !== "cancelled" ? (
            <p className="mb-4 rounded-xl bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-700 ring-1 ring-warning-700/20">
              Balance due {formatPrice(balance)}: pay {order.fulfilment === "dine_in" ? "your server" : "at the counter when you collect"}. This
              receipt updates to Paid as soon as it&apos;s recorded.
            </p>
          ) : null}
          <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">Payment</p>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-muted">Status</dt>
            <dd className="text-right"><PaymentBadge status={order.paymentStatus} /></dd>
            <dt className="text-ink-muted">Method</dt>
            <dd className="text-right font-semibold">{paymentMethodLabel(order.settledWith ?? order.paymentMethod)}</dd>
            <dt className="text-ink-muted">Amount paid</dt>
            <dd className="text-right font-semibold tabular-nums">{formatPrice(order.amountPaid)}</dd>
            <dt className="text-ink-muted">Balance due</dt>
            <dd className="text-right font-bold tabular-nums">{formatPrice(balance)}</dd>
            {order.paymentReference && (
              <>
                <dt className="text-ink-muted">Reference</dt>
                <dd className="text-right font-mono text-xs font-semibold">{order.paymentReference}</dd>
              </>
            )}
            {order.paidAt && (
              <>
                <dt className="text-ink-muted">Paid at</dt>
                <dd className="text-right font-semibold">{formatTimestamp(order.paidAt)}</dd>
              </>
            )}
          </dl>
          {method?.mobileMoney && order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
            <div className="mt-4">
              <PaymentReport
                orderRef={order.ref}
                token={token}
                methodLabel={method.label}
                account={mobileMoneyAccounts()[method.id] ?? null}
                amount={formatPrice(order.total)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line p-6">
          <QrCode value={verifyUrl} label={`QR code to verify order ${order.ref}`} className="w-28 shrink-0 rounded-lg ring-1 ring-line" />
          <p className="flex gap-2 text-xs text-ink-muted">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-primary-text" />
            Staff scan this code to check your order and payment on our system. Screenshots or edited receipts won&apos;t verify.
          </p>
        </div>
      </article>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 print:hidden">
        <a
          href={`/orders/${order.ref}/receipt.pdf${tokenQuery}`}
          target="_blank"
          rel="noopener"
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink hover:bg-mint-300 sm:col-span-1"
        >
          <FileDown aria-hidden className="size-4" /> Download receipt
        </a>
        <PrintButton label="Print" />
        <a
          href={whatsappLink(`Hello El Greco, about my order ${formatOrderNumber(order.orderNumber)} (${order.ref}).`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-semibold ring-1 ring-line hover:ring-charcoal-400"
        >
          <WhatsAppIcon className="size-4 text-[#128c7e]" /> Message us
        </a>
      </div>
      <p className="mt-6 rounded-xl bg-wood-50 p-4 text-sm text-wood-800 ring-1 ring-wood-100 print:hidden">
        Keep this link private: it shows your order and lets you report a mobile money payment.
      </p>
    </div>
  );
}
