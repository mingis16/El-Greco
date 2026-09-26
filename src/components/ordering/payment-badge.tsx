import { ORDER_STATUS_COPY, PAYMENT_STATUS_COPY, type OrderStatus, type PaymentStatus } from "@/lib/ordering/config";

const TONES = {
  success: "bg-success-50 text-success-700 ring-success-700/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-700/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-700/20",
  neutral: "bg-charcoal-100 text-charcoal-700 ring-charcoal-300",
  info: "bg-mint-50 text-mint-800 ring-mint-200",
};

const badge = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1";

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const copy = PAYMENT_STATUS_COPY[status];
  return (
    <span className={`${badge} ${TONES[copy.tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {copy.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const copy = ORDER_STATUS_COPY[status];
  return (
    <span className={`${badge} ${TONES[copy.tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {copy.label}
    </span>
  );
}
