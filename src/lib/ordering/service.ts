import { z } from "zod";
import { venueNow } from "@/lib/booking/time";
import { bookingToken, generateRef, hashIdentifier } from "@/lib/booking/security";
import { getMenu } from "@/lib/menu";
import { PAYMENT_METHODS, type OrderStatus, type PaymentMethodId, type PaymentStatus, type SettlementMethod } from "@/lib/ordering/config";
import { isOrderingOpen, pickupTimes } from "@/lib/ordering/hours";
import { buildMenuIndex, cartLineKey, orderTotals, priceLine } from "@/lib/ordering/pricing";
import { orderRequestSchema, transactionIdSchema } from "@/lib/ordering/schema";
import { getOrderStore } from "@/lib/ordering/store";
import type { NewOrder, Order, OrderEvent, OrderLine } from "@/lib/ordering/types";
import { rateLimit } from "@/lib/rate-limit";

export type OrderErrorCode = "validation" | "closed" | "price_changed" | "unavailable_items" | "rate_limited" | "rejected";

export type CreateOrderResult =
  | { ok: true; order: Order; receiptPath: string; created: boolean }
  | {
      ok: false;
      code: OrderErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
      /** Indexes of cart lines that can't be ordered (removed from menu, unavailable, bad options). */
      invalidLines?: { index: number; reason: string }[];
      total?: number;
    };

const MIN_FILL_MS = 2500;

/** Mobile money numbers customers pay into. A method is offered only when its number is set. */
export function mobileMoneyAccounts(): Partial<Record<PaymentMethodId, string>> {
  return {
    ...(process.env.ORANGE_MONEY_NUMBER && { orange_money: process.env.ORANGE_MONEY_NUMBER }),
    ...(process.env.AFRIMONEY_NUMBER && { afrimoney: process.env.AFRIMONEY_NUMBER }),
  };
}

export function availablePaymentMethods() {
  const accounts = mobileMoneyAccounts();
  return PAYMENT_METHODS.filter((m) => !m.mobileMoney || accounts[m.id]).map((m) => ({
    ...m,
    account: accounts[m.id] ?? null,
  }));
}

export function receiptPath(ref: string) {
  return `/orders/${ref}?t=${bookingToken("manage", ref)}`;
}

export function orderVerifyPath(ref: string) {
  return `/verify/${ref}?v=${bookingToken("verify", ref)}`;
}

export async function createOrder(raw: unknown, ctx: { ip: string }): Promise<CreateOrderResult> {
  const parsed = orderRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  const input = parsed.data;

  if (input.website || Date.now() - input.startedAt < MIN_FILL_MS) {
    return { ok: false, code: "rejected", message: "We couldn't process that order. Please try again." };
  }

  const ipLimit = await rateLimit(`order:ip:${hashIdentifier(ctx.ip)}`, 8, 600);
  const phoneLimit = await rateLimit(`order:phone:${hashIdentifier(input.phone)}`, 6, 3600);
  if (!ipLimit.ok || !phoneLimit.ok) {
    return { ok: false, code: "rate_limited", message: "Too many orders in a short time. Please wait a few minutes or call us." };
  }

  const store = await getOrderStore();
  const existing = await store.findByIdempotencyKey(input.idempotencyKey);
  if (existing) return { ok: true, order: existing, receiptPath: receiptPath(existing.ref), created: false };

  if (!isOrderingOpen()) {
    return { ok: false, code: "closed", message: "The kitchen isn't taking online orders right now (8:00 am to 9:30 pm)." };
  }
  if (input.fulfilment === "pickup" && !pickupTimes().includes(input.pickupTime!)) {
    return {
      ok: false,
      code: "validation",
      message: "That pickup time is no longer available. Please choose another.",
      fieldErrors: { pickupTime: ["Choose a later pickup time."] },
    };
  }

  const method = availablePaymentMethods().find((m) => m.id === input.paymentMethod);
  if (!method) {
    return { ok: false, code: "validation", message: "That payment method isn't available.", fieldErrors: { paymentMethod: ["Choose another way to pay."] } };
  }

  // Price every line from the live menu. The browser's prices are ignored.
  const index = buildMenuIndex((await getMenu()).categories);
  const merged = new Map<string, (typeof input.lines)[number] & { index: number }>();
  const invalidLines: { index: number; reason: string }[] = [];
  const lines: OrderLine[] = [];
  input.lines.forEach((line, i) => {
    const key = cartLineKey({ ...line, addonOptionIds: line.addonOptionIds });
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + line.quantity } : { ...line, index: i });
  });
  for (const line of merged.values()) {
    const priced = priceLine(index, line);
    if (priced.ok) lines.push(priced.line);
    else invalidLines.push({ index: line.index, reason: priced.reason });
  }
  if (invalidLines.length) {
    return {
      ok: false,
      code: "unavailable_items",
      message: "Some items in your order have changed. Please review them.",
      invalidLines,
    };
  }

  const totals = orderTotals(lines);
  if (Math.abs(totals.total - input.expectedTotal) > 0.004) {
    return {
      ok: false,
      code: "price_changed",
      message: "Prices have been updated since you started. Please check the new total before ordering.",
      total: totals.total,
    };
  }

  const now = new Date().toISOString();
  const history: OrderEvent[] = [{ at: now, actor: "guest", action: "Order placed online" }];
  let paymentStatus: PaymentStatus = "unpaid";
  let paymentReference: string | null = null;
  if (method.mobileMoney && input.transactionId) {
    paymentReference = transactionIdSchema.parse(input.transactionId);
    paymentStatus = "pending_verification";
    history.push({ at: now, actor: "guest", action: `${method.label} payment reported`, note: `Transaction ID ${paymentReference}` });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const order: NewOrder = {
      ref: generateRef("OR"),
      orderDate: venueNow().date,
      status: "received",
      paymentStatus,
      paymentMethod: input.paymentMethod,
      paymentReference,
      settledWith: null,
      amountPaid: 0,
      paidAt: null,
      fulfilment: input.fulfilment,
      tableLabel: input.fulfilment === "dine_in" ? input.tableLabel : null,
      bookingRef: input.bookingRef,
      pickupTime: input.fulfilment === "pickup" ? input.pickupTime! : null,
      customerName: input.name,
      customerPhone: input.phone,
      customerEmail: input.email,
      notes: input.notes,
      lines,
      ...totals,
      currency: "SLE",
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      history,
    };
    const result = await store.insert(order);
    if (result.ok) return { ok: true, order: result.order, receiptPath: receiptPath(result.order.ref), created: true };
    if (result.reason === "duplicate_request") {
      const saved = await store.findByIdempotencyKey(input.idempotencyKey);
      if (saved) return { ok: true, order: saved, receiptPath: receiptPath(saved.ref), created: false };
    }
  }
  throw new Error("Could not allocate a unique order reference");
}

/** Guest reports a mobile money payment from their receipt page. */
export async function reportMobileMoneyPayment(order: Order, transactionId: string) {
  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  if (!method?.mobileMoney) return null;
  const store = await getOrderStore();
  return store.updatePayment(
    order.ref,
    ["unpaid"],
    { paymentStatus: "pending_verification", paymentReference: transactionId },
    { at: new Date().toISOString(), actor: "guest", action: `${method.label} payment reported`, note: `Transaction ID ${transactionId}` },
  );
}

// Staff actions ---------------------------------------------------------------

export const ORDER_ACTIONS = {
  start: { from: ["received"], to: "preparing", label: "Start preparing", log: "Kitchen started preparing" },
  ready: { from: ["received", "preparing"], to: "ready", label: "Mark ready", log: "Marked ready" },
  complete: { from: ["ready"], to: "completed", label: "Served / collected", log: "Served or collected" },
  cancel: { from: ["received", "preparing", "ready"], to: "cancelled", label: "Cancel order", log: "Cancelled by staff" },
} as const satisfies Record<string, { from: readonly OrderStatus[]; to: OrderStatus; label: string; log: string }>;

export type OrderAction = keyof typeof ORDER_ACTIONS;

export function orderActionsFor(status: OrderStatus): OrderAction[] {
  return (Object.keys(ORDER_ACTIONS) as OrderAction[]).filter((a) =>
    (ORDER_ACTIONS[a].from as readonly OrderStatus[]).includes(status),
  );
}

export async function applyOrderAction(ref: string, action: OrderAction, note?: string) {
  const rule = ORDER_ACTIONS[action];
  return (await getOrderStore()).transition(ref, rule.from, rule.to, {
    at: new Date().toISOString(),
    actor: "staff",
    action: rule.log,
    ...(note ? { note } : {}),
  });
}

/** Staff confirm money was received (cash at the counter, card, or a verified mobile money transfer). */
export async function markOrderPaid(order: Order, settledWith: SettlementMethod, reference: string | null) {
  const at = new Date().toISOString();
  return (await getOrderStore()).updatePayment(
    order.ref,
    ["unpaid", "pending_verification"],
    {
      paymentStatus: "paid",
      settledWith,
      amountPaid: order.total,
      paidAt: at,
      ...(reference ? { paymentReference: reference } : {}),
    },
    { at, actor: "staff", action: `Payment received (${settledWith.replace("_", " ")})`, ...(reference ? { note: reference } : {}) },
  );
}

/** Staff couldn't find the reported mobile money transfer. */
export async function rejectReportedPayment(order: Order, note?: string) {
  return (await getOrderStore()).updatePayment(
    order.ref,
    ["pending_verification"],
    { paymentStatus: "unpaid" },
    { at: new Date().toISOString(), actor: "staff", action: "Reported payment not found", ...(note ? { note } : {}) },
  );
}

export async function refundOrder(order: Order, note?: string) {
  return (await getOrderStore()).updatePayment(
    order.ref,
    ["paid"],
    { paymentStatus: "refunded" },
    { at: new Date().toISOString(), actor: "staff", action: "Refunded", ...(note ? { note } : {}) },
  );
}

/** Default "received by" choice when staff mark an order paid. */
export function suggestedSettlement(order: Order): SettlementMethod {
  return order.paymentMethod === "orange_money" || order.paymentMethod === "afrimoney" ? order.paymentMethod : "cash";
}
