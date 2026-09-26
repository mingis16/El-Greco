import { z } from "zod";
import { computeSlots, isBookableDate, isBookableTime, nearestAlternatives } from "@/lib/booking/availability";
import { BOOKING_RULES, CELEBRANT_OCCASIONS, resolveKind, type BookingStatus } from "@/lib/booking/config";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { bookingToken, generateRef, hashIdentifier } from "@/lib/booking/security";
import { getBookingStore } from "@/lib/booking/store";
import { bookingInstant, formatTime, toMinutes, venueNow } from "@/lib/booking/time";
import type { Booking, BookingEvent, BookingKind, NewBooking } from "@/lib/booking/types";
import { rateLimit } from "@/lib/rate-limit";

export type BookingErrorCode =
  | "validation"
  | "rate_limited"
  | "full"
  | "duplicate"
  | "unavailable_time"
  | "rejected";

export type CreateBookingResult =
  | { ok: true; booking: Booking; managePath: string; created: boolean }
  | {
      ok: false;
      code: BookingErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
      alternatives?: string[];
    };

/** Forms filled faster than this are almost certainly automated. */
const MIN_FILL_MS = 3000;

export function managePath(ref: string) {
  return `/reservations/${ref}?t=${bookingToken("manage", ref)}`;
}

export function verifyPath(ref: string) {
  return `/verify/${ref}?v=${bookingToken("verify", ref)}`;
}

export async function getAvailability(date: string, partySize: number, kind: BookingKind) {
  if (!isBookableDate(date)) return [];
  const bookings = await (await getBookingStore()).listForDate(date);
  return computeSlots({ date, partySize, kind, bookings });
}

export async function createBooking(raw: unknown, ctx: { ip: string }): Promise<CreateBookingResult> {
  const parsed = bookingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  const input = parsed.data;

  // Bots fill the hidden honeypot or submit instantly. Give them nothing useful.
  if (input.website || Date.now() - input.startedAt < MIN_FILL_MS) {
    return { ok: false, code: "rejected", message: "We couldn't process that request. Please try again." };
  }

  const ipLimit = await rateLimit(`book:ip:${hashIdentifier(ctx.ip)}`, 6, 600);
  const phoneLimit = await rateLimit(`book:phone:${hashIdentifier(input.phone)}`, 4, 3600);
  if (!ipLimit.ok || !phoneLimit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Too many booking attempts. Please wait a few minutes, or message us on WhatsApp.",
    };
  }

  if (!isBookableDate(input.date) || !isBookableTime(input.date, input.time)) {
    return {
      ok: false,
      code: "unavailable_time",
      message: `Please choose a time at least ${BOOKING_RULES.minLeadMinutes} minutes from now, within the next ${BOOKING_RULES.maxAdvanceDays} days.`,
      fieldErrors: { time: ["This time can no longer be booked."] },
    };
  }

  const store = await getBookingStore();

  // A double-tap or network retry returns the booking already made.
  const existing = await store.findByIdempotencyKey(input.idempotencyKey);
  if (existing) return { ok: true, booking: existing, managePath: managePath(existing.ref), created: false };

  const clash = (await store.findActiveByPhone(input.phone, input.date)).find(
    (b) => Math.abs(toMinutes(b.time) - toMinutes(input.time)) < BOOKING_RULES.diningMinutes,
  );
  if (clash) {
    return {
      ok: false,
      code: "duplicate",
      message: `This phone number already has a booking at ${formatTime(clash.time)} that day (${clash.ref}). Use your existing pass, or cancel it first to rebook.`,
    };
  }

  const kind = resolveKind(input.occasion, input.space, input.partySize);
  const autoConfirm = kind === "table" && input.partySize <= BOOKING_RULES.autoConfirmMaxParty;
  const status: BookingStatus = autoConfirm ? "confirmed" : "pending";
  const now = new Date().toISOString();

  const history: BookingEvent[] = [
    { at: now, actor: "guest", action: kind === "event" ? "Event request submitted online" : "Booked online" },
  ];
  if (autoConfirm) history.push({ at: now, actor: "system", action: "Confirmed automatically (seats available)" });

  const capacity =
    kind === "table"
      ? { seatCapacity: BOOKING_RULES.seatCapacity, diningMinutes: BOOKING_RULES.diningMinutes }
      : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const booking: NewBooking = {
      ref: generateRef(),
      status,
      kind,
      occasion: input.occasion,
      space: input.space,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      guestName: input.name,
      guestPhone: input.phone,
      guestEmail: input.email,
      celebrant: CELEBRANT_OCCASIONS.includes(input.occasion) ? input.celebrant : null,
      extras: [...new Set(input.extras)],
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      history,
    };
    const result = await store.insert(booking, capacity);
    if (result.ok) {
      return { ok: true, booking: result.booking, managePath: managePath(result.booking.ref), created: true };
    }
    if (result.reason === "duplicate_request") {
      const saved = await store.findByIdempotencyKey(input.idempotencyKey);
      if (saved) return { ok: true, booking: saved, managePath: managePath(saved.ref), created: false };
    }
    if (result.reason === "full") {
      const slots = await getAvailability(input.date, input.partySize, kind);
      const alternatives = nearestAlternatives(slots, input.time);
      return {
        ok: false,
        code: "full",
        message: alternatives.length
          ? `Sorry, ${formatTime(input.time)} just filled up. These times still have space: ${alternatives.map(formatTime).join(", ")}.`
          : "Sorry, that day is fully booked online. Message us on WhatsApp and we'll do our best.",
        alternatives,
        fieldErrors: { time: ["This time is now full."] },
      };
    }
    // duplicate_ref: astronomically unlikely; loop generates a new one.
  }
  throw new Error("Could not allocate a unique booking reference");
}

// Guest actions ---------------------------------------------------------------

/** Guests can cancel until the booking time. */
export function guestCanCancel(booking: Booking, now = new Date()) {
  return (
    (booking.status === "pending" || booking.status === "confirmed") &&
    bookingInstant(booking.date, booking.time) > now
  );
}

export async function cancelByGuest(booking: Booking) {
  if (!guestCanCancel(booking)) return null;
  const store = await getBookingStore();
  return store.transition(booking.ref, ["pending", "confirmed"], "cancelled", {
    at: new Date().toISOString(),
    actor: "guest",
    action: "Cancelled by guest",
  });
}

// Staff actions ---------------------------------------------------------------

export const STAFF_ACTIONS = {
  confirm: { from: ["pending"], to: "confirmed", label: "Confirm", log: "Confirmed by staff" },
  decline: { from: ["pending"], to: "declined", label: "Decline", log: "Declined by staff" },
  check_in: { from: ["confirmed", "pending"], to: "checked_in", label: "Check in", log: "Checked in at the door" },
  undo_check_in: { from: ["checked_in"], to: "confirmed", label: "Undo check-in", log: "Check-in undone" },
  no_show: { from: ["confirmed"], to: "no_show", label: "No-show", log: "Marked as no-show" },
  cancel: { from: ["pending", "confirmed"], to: "cancelled", label: "Cancel", log: "Cancelled by staff" },
  reopen: { from: ["declined", "cancelled", "no_show"], to: "pending", label: "Reopen", log: "Reopened by staff" },
} as const satisfies Record<string, { from: readonly BookingStatus[]; to: BookingStatus; label: string; log: string }>;

export type StaffAction = keyof typeof STAFF_ACTIONS;

export function staffActionsFor(status: BookingStatus): StaffAction[] {
  return (Object.keys(STAFF_ACTIONS) as StaffAction[]).filter((a) =>
    (STAFF_ACTIONS[a].from as readonly BookingStatus[]).includes(status),
  );
}

export async function applyStaffAction(ref: string, action: StaffAction, note?: string) {
  const rule = STAFF_ACTIONS[action];
  const store = await getBookingStore();
  return store.transition(ref, rule.from, rule.to, {
    at: new Date().toISOString(),
    actor: "staff",
    action: rule.log,
    ...(note ? { note } : {}),
  });
}

/** Is the booking for today at the venue? Used to warn staff about wrong-day passes. */
export function isForToday(booking: Booking, now = new Date()) {
  return booking.date === venueNow(now).date;
}
