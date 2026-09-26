import type { Fulfilment, OrderStatus, PaymentMethodId, PaymentStatus, SettlementMethod } from "@/lib/ordering/config";

/** What the browser sends for each cart line. Prices are never trusted from it. */
export interface CartLineInput {
  itemId: string;
  variantId?: string | null;
  addonOptionIds: string[];
  quantity: number;
  note?: string;
}

export interface OrderLineAddon {
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

/** A priced line, computed on the server from the live menu. All amounts in SLE. */
export interface OrderLine {
  itemId: string;
  name: string;
  category: string;
  variantId: string | null;
  variantName: string | null;
  addons: OrderLineAddon[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string | null;
}

export interface OrderTotals {
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
}

export interface OrderEvent {
  at: string;
  action: string;
  actor: "guest" | "staff" | "system";
  note?: string;
}

export interface Order extends OrderTotals {
  id: string;
  /** Public reference, e.g. OR-7KQ4-M2XP. */
  ref: string;
  /** Short daily number the kitchen calls out, e.g. 12 -> "#012". */
  orderNumber: number;
  /** Venue-local date the order number belongs to. */
  orderDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodId;
  /** Mobile money transaction ID from the guest, or staff's reference when marking paid. */
  paymentReference: string | null;
  settledWith: SettlementMethod | null;
  amountPaid: number;
  paidAt: string | null;
  fulfilment: Fulfilment;
  tableLabel: string | null;
  bookingRef: string | null;
  pickupTime: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  lines: OrderLine[];
  currency: "SLE";
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  history: OrderEvent[];
}

export type NewOrder = Omit<Order, "id" | "orderNumber" | "updatedAt">;
