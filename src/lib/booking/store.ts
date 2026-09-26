import type { BookingStatus } from "@/lib/booking/config";
import type { Booking, BookingEvent, NewBooking } from "@/lib/booking/types";

export interface CapacityRule {
  seatCapacity: number;
  diningMinutes: number;
}

export type InsertResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "full" | "duplicate_ref" | "duplicate_request" };

export interface BookingStore {
  listForDate(date: string): Promise<Booking[]>;
  /** Pending requests from `fromDate` onwards, soonest first. */
  listPending(fromDate: string): Promise<Booking[]>;
  findByRef(ref: string): Promise<Booking | null>;
  findByIdempotencyKey(key: string): Promise<Booking | null>;
  /** Active bookings for this phone number on this date. */
  findActiveByPhone(phone: string, date: string): Promise<Booking[]>;
  /**
   * Inserts atomically. With a capacity rule, the insert only happens if the
   * overlapping table bookings plus this party still fit.
   */
  insert(booking: NewBooking, capacity: CapacityRule | null): Promise<InsertResult>;
  /**
   * Moves a booking to `to` only if it is currently in one of `from`
   * (so two staff members can't act on stale state). Returns null otherwise.
   */
  transition(ref: string, from: readonly BookingStatus[], to: BookingStatus, event: BookingEvent): Promise<Booking | null>;
}

let store: Promise<BookingStore> | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Supabase in any environment where it's configured. Without it, a JSON file
 * store for local development only; production refuses to run without a
 * real database.
 */
export function getBookingStore(): Promise<BookingStore> {
  store ??= (async () => {
    if (isSupabaseConfigured()) {
      const { SupabaseBookingStore } = await import("@/lib/booking/store-supabase");
      return new SupabaseBookingStore(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    }
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_FILE_BOOKING_STORE) {
      throw new BookingStoreUnavailableError();
    }
    const { FileBookingStore } = await import("@/lib/booking/store-file");
    return new FileBookingStore();
  })();
  return store.catch((error) => {
    store = null;
    throw error;
  });
}

export class BookingStoreUnavailableError extends Error {
  constructor() {
    super("Online booking needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in production.");
  }
}
