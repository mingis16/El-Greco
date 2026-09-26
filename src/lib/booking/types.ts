import type { BookingStatus, OccasionId, SpaceId } from "@/lib/booking/config";

export type BookingKind = "table" | "event";

export interface BookingEvent {
  at: string;
  action: string;
  actor: "guest" | "staff" | "system";
  note?: string;
}

export interface Booking {
  id: string;
  /** Public reference, e.g. EG-7KQ4-M2XP. */
  ref: string;
  status: BookingStatus;
  kind: BookingKind;
  occasion: OccasionId;
  space: SpaceId;
  /** Venue-local date, YYYY-MM-DD. */
  date: string;
  /** Venue-local time, HH:MM. */
  time: string;
  partySize: number;
  guestName: string;
  /** E.164, e.g. +23299423234. */
  guestPhone: string;
  guestEmail: string | null;
  celebrant: string | null;
  extras: string[];
  notes: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt: string | null;
  history: BookingEvent[];
}

export type NewBooking = Omit<Booking, "id" | "updatedAt" | "checkedInAt">;

export type SlotStatus = "available" | "limited" | "full" | "past" | "request";

export interface Slot {
  time: string;
  status: SlotStatus;
  seatsLeft: number | null;
}
