import { STATUS_COPY, type BookingStatus } from "@/lib/booking/config";

const TONES = {
  success: "bg-success-50 text-success-700 ring-success-700/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-700/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-700/20",
  neutral: "bg-charcoal-100 text-charcoal-700 ring-charcoal-300",
};

export function StatusBadge({ status, className = "" }: { status: BookingStatus; className?: string }) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${TONES[copy.tone]} ${className}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {copy.label}
    </span>
  );
}

export function statusPanelClass(status: BookingStatus) {
  return TONES[STATUS_COPY[status].tone];
}
