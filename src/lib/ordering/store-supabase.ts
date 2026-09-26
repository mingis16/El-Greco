import type { OrderStatus, PaymentStatus } from "@/lib/ordering/config";
import type { OrderInsertResult, OrderStore, PaymentUpdate } from "@/lib/ordering/store";
import type { NewOrder, Order, OrderEvent } from "@/lib/ordering/types";

// Supabase REST (PostgREST) with the service-role key. Schema and the atomic
// create/transition/payment functions: supabase/migrations/0002_orders.sql.

interface OrderRow {
  id: string;
  ref: string;
  order_number: number;
  order_date: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: Order["paymentMethod"];
  payment_reference: string | null;
  settled_with: Order["settledWith"];
  amount_paid: number | string;
  paid_at: string | null;
  fulfilment: Order["fulfilment"];
  table_label: string | null;
  booking_ref: string | null;
  pickup_time: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  lines: Order["lines"];
  subtotal: number | string;
  service_charge: number | string;
  tax: number | string;
  total: number | string;
  currency: "SLE";
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  history: OrderEvent[];
}

const fromRow = (r: OrderRow): Order => ({
  id: r.id,
  ref: r.ref,
  orderNumber: r.order_number,
  orderDate: r.order_date,
  status: r.status,
  paymentStatus: r.payment_status,
  paymentMethod: r.payment_method,
  paymentReference: r.payment_reference,
  settledWith: r.settled_with,
  amountPaid: Number(r.amount_paid),
  paidAt: r.paid_at,
  fulfilment: r.fulfilment,
  tableLabel: r.table_label,
  bookingRef: r.booking_ref,
  pickupTime: r.pickup_time ? r.pickup_time.slice(0, 5) : null,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  customerEmail: r.customer_email,
  notes: r.notes,
  lines: r.lines,
  subtotal: Number(r.subtotal),
  serviceCharge: Number(r.service_charge),
  tax: Number(r.tax),
  total: Number(r.total),
  currency: r.currency,
  idempotencyKey: r.idempotency_key,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  history: r.history ?? [],
});

const toRow = (o: NewOrder) => ({
  ref: o.ref,
  order_date: o.orderDate,
  status: o.status,
  payment_status: o.paymentStatus,
  payment_method: o.paymentMethod,
  payment_reference: o.paymentReference,
  settled_with: o.settledWith,
  amount_paid: o.amountPaid,
  paid_at: o.paidAt,
  fulfilment: o.fulfilment,
  table_label: o.tableLabel,
  booking_ref: o.bookingRef,
  pickup_time: o.pickupTime,
  customer_name: o.customerName,
  customer_phone: o.customerPhone,
  customer_email: o.customerEmail,
  notes: o.notes,
  lines: o.lines,
  subtotal: o.subtotal,
  service_charge: o.serviceCharge,
  tax: o.tax,
  total: o.total,
  currency: o.currency,
  idempotency_key: o.idempotencyKey,
  created_at: o.createdAt,
  history: o.history,
});

export class SupabaseOrderStore implements OrderStore {
  constructor(
    private readonly url: string,
    private readonly key: string,
  ) {}

  private async request<T>(pathAndQuery: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/${pathAndQuery}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      const error = new Error(`Supabase ${res.status}: ${text}`) as Error & { details?: string };
      error.details = text;
      throw error;
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  private select(query: string) {
    return this.request<OrderRow[]>(`orders?${query}`).then((rows) => rows.map(fromRow));
  }

  listForDate(date: string) {
    return this.select(`order_date=eq.${date}&order=order_number.asc`);
  }

  async findByRef(ref: string) {
    return (await this.select(`ref=eq.${encodeURIComponent(ref)}&limit=1`))[0] ?? null;
  }

  async findByIdempotencyKey(key: string) {
    return (await this.select(`idempotency_key=eq.${encodeURIComponent(key)}&limit=1`))[0] ?? null;
  }

  async insert(order: NewOrder): Promise<OrderInsertResult> {
    try {
      const row = await this.request<OrderRow>("rpc/create_order", {
        method: "POST",
        body: JSON.stringify({ p_order: toRow(order) }),
      });
      return { ok: true, order: fromRow(row) };
    } catch (error) {
      const details = (error as { details?: string }).details ?? "";
      if (details.includes("orders_ref_key")) return { ok: false, reason: "duplicate_ref" };
      if (details.includes("orders_idempotency_key_key")) return { ok: false, reason: "duplicate_request" };
      throw error;
    }
  }

  async transition(ref: string, from: readonly OrderStatus[], to: OrderStatus, event: OrderEvent) {
    const row = await this.request<OrderRow | null>("rpc/transition_order", {
      method: "POST",
      body: JSON.stringify({ p_ref: ref, p_from: from, p_to: to, p_event: event }),
    });
    return row && row.id ? fromRow(row) : null;
  }

  async updatePayment(ref: string, from: readonly PaymentStatus[], update: PaymentUpdate, event: OrderEvent) {
    const row = await this.request<OrderRow | null>("rpc/update_order_payment", {
      method: "POST",
      body: JSON.stringify({
        p_ref: ref,
        p_from: from,
        p_payment_status: update.paymentStatus,
        p_payment_reference: update.paymentReference ?? null,
        p_set_reference: update.paymentReference !== undefined,
        p_settled_with: update.settledWith ?? null,
        p_amount_paid: update.amountPaid ?? null,
        p_paid_at: update.paidAt ?? null,
        p_event: event,
      }),
    });
    return row && row.id ? fromRow(row) : null;
  }
}
