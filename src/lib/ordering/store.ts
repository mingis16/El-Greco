import { isSupabaseConfigured, supabaseUrl, BookingStoreUnavailableError } from "@/lib/booking/store";
import type { OrderStatus, PaymentStatus } from "@/lib/ordering/config";
import type { NewOrder, Order, OrderEvent } from "@/lib/ordering/types";

export type OrderInsertResult = { ok: true; order: Order } | { ok: false; reason: "duplicate_ref" | "duplicate_request" };

export interface PaymentUpdate {
  paymentStatus: PaymentStatus;
  paymentReference?: string | null;
  settledWith?: Order["settledWith"];
  amountPaid?: number;
  paidAt?: string | null;
}

export interface OrderStore {
  listForDate(date: string): Promise<Order[]>;
  findByRef(ref: string): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  /** Inserts and assigns the next daily order number atomically. */
  insert(order: NewOrder): Promise<OrderInsertResult>;
  /** Changes status only if it is currently one of `from`; null otherwise. */
  transition(ref: string, from: readonly OrderStatus[], to: OrderStatus, event: OrderEvent): Promise<Order | null>;
  /** Changes payment only if payment status is currently one of `from`; null otherwise. */
  updatePayment(ref: string, from: readonly PaymentStatus[], update: PaymentUpdate, event: OrderEvent): Promise<Order | null>;
}

let store: Promise<OrderStore> | null = null;

/** Same rules as bookings: Supabase when configured, a local JSON file in development. */
export function getOrderStore(): Promise<OrderStore> {
  store ??= (async () => {
    if (isSupabaseConfigured()) {
      const { SupabaseOrderStore } = await import("@/lib/ordering/store-supabase");
      return new SupabaseOrderStore(supabaseUrl()!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    }
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_FILE_BOOKING_STORE) {
      throw new BookingStoreUnavailableError();
    }
    const { FileOrderStore } = await import("@/lib/ordering/store-file");
    return new FileOrderStore();
  })();
  return store.catch((error) => {
    store = null;
    throw error;
  });
}
