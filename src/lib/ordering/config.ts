// Online ordering rules, shared by the menu, checkout, API and staff tools.

export const ORDER_RULES = {
  timeZone: "Africa/Freetown",
  /** Kitchen hours for online orders (same window as table bookings). */
  firstOrder: "08:00",
  lastOrder: "21:30",
  /** Earliest pickup is this many minutes after ordering. */
  pickupLeadMinutes: 20,
  pickupSlotMinutes: 15,
  maxLines: 30,
  maxQuantityPerLine: 20,
  /**
   * Charges added on receipts, as fractions (0.1 = 10%). 0 hides the line.
   * Menu prices are treated as final until the restaurant confirms otherwise.
   */
  serviceChargeRate: 0,
  taxRate: 0,
  /** Poll interval for the live order tracker on the receipt page. */
  trackerRefreshSeconds: 20,
} as const;

export const FULFILMENT_OPTIONS = [
  { id: "dine_in", label: "Dine in", description: "We'll bring it to your table." },
  { id: "pickup", label: "Pickup", description: "Collect it from the counter." },
] as const;

export type Fulfilment = (typeof FULFILMENT_OPTIONS)[number]["id"];

export const ORDER_STATUSES = ["received", "preparing", "ready", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "pending_verification", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  { id: "pay_at_restaurant", label: "Pay at the restaurant", mobileMoney: false },
  { id: "orange_money", label: "Orange Money", mobileMoney: true },
  { id: "afrimoney", label: "Afrimoney", mobileMoney: true },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

/** How staff recorded the money actually received. */
export const SETTLEMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "orange_money", label: "Orange Money" },
  { id: "afrimoney", label: "Afrimoney" },
] as const;

export type SettlementMethod = (typeof SETTLEMENT_METHODS)[number]["id"];

export const ORDER_STATUS_COPY: Record<OrderStatus, { label: string; guest: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  received: { label: "Received", guest: "The kitchen has your order.", tone: "info" },
  preparing: { label: "Preparing", guest: "Your order is being prepared.", tone: "warning" },
  ready: { label: "Ready", guest: "Your order is ready.", tone: "success" },
  completed: { label: "Completed", guest: "Served or collected. Enjoy!", tone: "success" },
  cancelled: { label: "Cancelled", guest: "This order was cancelled.", tone: "danger" },
};

export const PAYMENT_STATUS_COPY: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  unpaid: { label: "Unpaid", tone: "warning" },
  pending_verification: { label: "Payment being verified", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export function paymentMethodLabel(id: string) {
  return (
    PAYMENT_METHODS.find((m) => m.id === id)?.label ?? SETTLEMENT_METHODS.find((m) => m.id === id)?.label ?? id
  );
}

export function fulfilmentLabel(id: string) {
  return FULFILMENT_OPTIONS.find((f) => f.id === id)?.label ?? id;
}

export function formatOrderNumber(n: number) {
  return `#${String(n).padStart(3, "0")}`;
}
