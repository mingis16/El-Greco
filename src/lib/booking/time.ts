import { BOOKING_RULES } from "@/lib/booking/config";

// Freetown is on GMT all year, so venue-local wall time equals UTC. The
// helpers still go through Intl with the venue time zone so a server in any
// region computes "today" correctly.

export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Current date (YYYY-MM-DD) and minutes past midnight at the venue. */
export function venueNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_RULES.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every bookable time of day, e.g. ["08:00", "08:30", …, "21:30"]. */
export function seatingTimes() {
  const times: string[] = [];
  for (
    let t = toMinutes(BOOKING_RULES.firstSeating);
    t <= toMinutes(BOOKING_RULES.lastSeating);
    t += BOOKING_RULES.slotMinutes
  ) {
    times.push(fromMinutes(t));
  }
  return times;
}

export function bookingWindow(now = new Date()) {
  const today = venueNow(now).date;
  return { min: today, max: addDays(today, BOOKING_RULES.maxAdvanceDays) };
}

/** The booking's start as a real instant (venue is UTC+0). */
export function bookingInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00Z`);
}

const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});
const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BOOKING_RULES.timeZone,
  timeZoneName: "short",
});

export const formatDateLong = (date: string) => longDate.format(new Date(`${date}T00:00:00Z`));
export const formatDateShort = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));
export const formatTime = (time: string) => clock.format(new Date(`1970-01-01T${time}:00Z`));
export const formatTimestamp = (iso: string) => stamp.format(new Date(iso));

/** Time the table is held until, e.g. "7:45 pm". */
export function holdUntil(time: string) {
  return formatTime(fromMinutes(toMinutes(time) + BOOKING_RULES.arrivalGraceMinutes));
}
