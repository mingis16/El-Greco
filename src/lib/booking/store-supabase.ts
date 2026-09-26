import type { BookingStatus } from "@/lib/booking/config";
import type { BookingStore, CapacityRule, InsertResult } from "@/lib/booking/store";
import type { Booking, BookingEvent, NewBooking } from "@/lib/booking/types";

// Talks to Supabase's REST API (PostgREST) with the service-role key. The
// schema, row-level security and the atomic create/transition functions are
// in supabase/migrations/0001_bookings.sql.

interface BookingRow {
  id: string;
  ref: string;
  status: BookingStatus;
  kind: Booking["kind"];
  occasion: Booking["occasion"];
  space: Booking["space"];
  booking_date: string;
  booking_time: string;
  party_size: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  celebrant: string | null;
  extras: string[];
  notes: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  checked_in_at: string | null;
  history: BookingEvent[];
}

const fromRow = (r: BookingRow): Booking => ({
  id: r.id,
  ref: r.ref,
  status: r.status,
  kind: r.kind,
  occasion: r.occasion,
  space: r.space,
  date: r.booking_date,
  time: r.booking_time.slice(0, 5),
  partySize: r.party_size,
  guestName: r.guest_name,
  guestPhone: r.guest_phone,
  guestEmail: r.guest_email,
  celebrant: r.celebrant,
  extras: r.extras ?? [],
  notes: r.notes,
  idempotencyKey: r.idempotency_key,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  checkedInAt: r.checked_in_at,
  history: r.history ?? [],
});

const toRow = (b: NewBooking) => ({
  ref: b.ref,
  status: b.status,
  kind: b.kind,
  occasion: b.occasion,
  space: b.space,
  booking_date: b.date,
  booking_time: b.time,
  party_size: b.partySize,
  guest_name: b.guestName,
  guest_phone: b.guestPhone,
  guest_email: b.guestEmail,
  celebrant: b.celebrant,
  extras: b.extras,
  notes: b.notes,
  idempotency_key: b.idempotencyKey,
  created_at: b.createdAt,
  history: b.history,
});

export class SupabaseBookingStore implements BookingStore {
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
    return this.request<BookingRow[]>(`bookings?${query}`).then((rows) => rows.map(fromRow));
  }

  listForDate(date: string) {
    return this.select(`booking_date=eq.${date}&order=booking_time.asc`);
  }

  listPending(fromDate: string) {
    return this.select(`status=eq.pending&booking_date=gte.${fromDate}&order=booking_date.asc,booking_time.asc`);
  }

  async findByRef(ref: string) {
    return (await this.select(`ref=eq.${encodeURIComponent(ref)}&limit=1`))[0] ?? null;
  }

  async findByIdempotencyKey(key: string) {
    return (await this.select(`idempotency_key=eq.${encodeURIComponent(key)}&limit=1`))[0] ?? null;
  }

  findActiveByPhone(phone: string, date: string) {
    return this.select(
      `guest_phone=eq.${encodeURIComponent(phone)}&booking_date=eq.${date}&status=in.(pending,confirmed,checked_in)`,
    );
  }

  async insert(booking: NewBooking, capacity: CapacityRule | null): Promise<InsertResult> {
    try {
      const row = await this.request<BookingRow>("rpc/create_booking", {
        method: "POST",
        body: JSON.stringify({
          p_booking: toRow(booking),
          p_seat_capacity: capacity?.seatCapacity ?? null,
          p_dining_minutes: capacity?.diningMinutes ?? null,
        }),
      });
      return { ok: true, booking: fromRow(row) };
    } catch (error) {
      const details = (error as { details?: string }).details ?? "";
      if (details.includes("CAPACITY_FULL")) return { ok: false, reason: "full" };
      if (details.includes("bookings_ref_key")) return { ok: false, reason: "duplicate_ref" };
      if (details.includes("bookings_idempotency_key_key")) return { ok: false, reason: "duplicate_request" };
      throw error;
    }
  }

  async transition(ref: string, from: readonly BookingStatus[], to: BookingStatus, event: BookingEvent) {
    const row = await this.request<BookingRow | null>("rpc/transition_booking", {
      method: "POST",
      body: JSON.stringify({ p_ref: ref, p_from: from, p_to: to, p_event: event }),
    });
    return row && row.id ? fromRow(row) : null;
  }
}
