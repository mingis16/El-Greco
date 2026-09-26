import { ACTIVE_STATUSES, BOOKING_RULES } from "@/lib/booking/config";
import { bookingWindow, seatingTimes, toMinutes, venueNow } from "@/lib/booking/time";
import type { Booking, BookingKind, Slot } from "@/lib/booking/types";

type SeatHolder = Pick<Booking, "time" | "partySize" | "status" | "kind">;

/** Seats taken by table bookings whose dining window overlaps `time`. */
export function seatsTakenAt(time: string, bookings: SeatHolder[]) {
  const t = toMinutes(time);
  return bookings
    .filter(
      (b) =>
        b.kind === "table" &&
        ACTIVE_STATUSES.includes(b.status) &&
        Math.abs(toMinutes(b.time) - t) < BOOKING_RULES.diningMinutes,
    )
    .reduce((sum, b) => sum + b.partySize, 0);
}

export function isBookableDate(date: string, now = new Date()) {
  const { min, max } = bookingWindow(now);
  return date >= min && date <= max;
}

/** True when the time is on the grid and far enough in the future. */
export function isBookableTime(date: string, time: string, now = new Date()) {
  if (!seatingTimes().includes(time)) return false;
  const venue = venueNow(now);
  if (date > venue.date) return true;
  if (date < venue.date) return false;
  return toMinutes(time) >= venue.minutes + BOOKING_RULES.minLeadMinutes;
}

export function computeSlots(opts: {
  date: string;
  partySize: number;
  kind: BookingKind;
  bookings: SeatHolder[];
  now?: Date;
}): Slot[] {
  const now = opts.now ?? new Date();
  if (!isBookableDate(opts.date, now)) return [];

  return seatingTimes().map((time) => {
    if (!isBookableTime(opts.date, time, now)) return { time, status: "past", seatsLeft: null };
    // Events use separate rooms and are confirmed by staff, so they aren't
    // limited by dining-room seats.
    if (opts.kind === "event") return { time, status: "request", seatsLeft: null };

    const seatsLeft = Math.max(0, BOOKING_RULES.seatCapacity - seatsTakenAt(time, opts.bookings));
    if (seatsLeft < opts.partySize) return { time, status: "full", seatsLeft };
    const status = seatsLeft - opts.partySize <= BOOKING_RULES.limitedSeatsThreshold ? "limited" : "available";
    return { time, status, seatsLeft };
  });
}

/** Up to `count` bookable times closest to `time`, for "that time is full" messages. */
export function nearestAlternatives(slots: Slot[], time: string, count = 3) {
  const t = toMinutes(time);
  return slots
    .filter((s) => s.status === "available" || s.status === "limited")
    .sort((a, b) => Math.abs(toMinutes(a.time) - t) - Math.abs(toMinutes(b.time) - t))
    .slice(0, count)
    .map((s) => s.time)
    .sort();
}
