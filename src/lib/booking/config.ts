// Booking rules and options shared by the form, the API and the staff tools.
//
// Hours, capacity and the event threshold were confirmed by the restaurant on
// 2026-09-26. Change them here and every page and check picks them up.

export const BOOKING_RULES = {
  /** Sierra Leone is on GMT all year (no daylight saving). */
  timeZone: "Africa/Freetown",
  /** First and last table times offered online, 24h "HH:MM". */
  firstSeating: "08:00",
  lastSeating: "21:30",
  slotMinutes: 30,
  /** How long a table is assumed to be occupied. */
  diningMinutes: 120,
  /** Seats that can be booked online at the same time. */
  seatCapacity: 80,
  /** Tables up to this size are confirmed instantly when seats are free. */
  autoConfirmMaxParty: 6,
  /** Above this, the request becomes an event enquiry handled by staff. */
  maxTablePartySize: 12,
  maxEventPartySize: 300,
  /** Bookings must be at least this far ahead. */
  minLeadMinutes: 60,
  maxAdvanceDays: 90,
  /** Minutes a table is held after the booking time. */
  arrivalGraceMinutes: 15,
  /** A slot shows as "filling up" at or below this many free seats. */
  limitedSeatsThreshold: 12,
} as const;

export const OCCASIONS = [
  { id: "dining", label: "Just dining", kind: "table" },
  { id: "birthday", label: "Birthday", kind: "table" },
  { id: "anniversary", label: "Anniversary", kind: "table" },
  { id: "date-night", label: "Date night", kind: "table" },
  { id: "business", label: "Business meeting", kind: "table" },
  { id: "family", label: "Family & friends", kind: "table" },
  { id: "corporate", label: "Conference / corporate event", kind: "event" },
  { id: "private-party", label: "Private party", kind: "event" },
] as const;

export type OccasionId = (typeof OCCASIONS)[number]["id"];

export const SPACES = [
  { id: "any", label: "No preference", eventsOnly: false },
  { id: "dining-room", label: "Main dining room", eventsOnly: false },
  { id: "terrace", label: "Sea-view terrace", eventsOnly: false },
  { id: "conference-room", label: "Conference room", eventsOnly: true },
  { id: "event-hall", label: "Event hall", eventsOnly: true },
] as const;

export type SpaceId = (typeof SPACES)[number]["id"];

/** Optional extras guests can tick, per occasion. Staff see them on the slip. */
export const OCCASION_EXTRAS: Record<OccasionId, readonly { id: string; label: string }[]> = {
  dining: [],
  birthday: [
    { id: "own-cake", label: "We're bringing our own cake" },
    { id: "cake-order", label: "We'd like to order a cake" },
    { id: "decorations", label: "Decorations (balloons, table styling)" },
  ],
  anniversary: [
    { id: "flowers", label: "Flowers on the table" },
    { id: "dessert-message", label: "Message on the dessert plate" },
    { id: "quiet-table", label: "A quiet table" },
  ],
  "date-night": [
    { id: "flowers", label: "Flowers on the table" },
    { id: "sea-view", label: "A table with a sea view if possible" },
    { id: "quiet-table", label: "A quiet table" },
  ],
  business: [
    { id: "quiet-table", label: "A quiet table" },
    { id: "wifi", label: "Wi-Fi access" },
    { id: "power", label: "Table near a power socket" },
  ],
  family: [
    { id: "high-chair", label: "High chair for a child" },
    { id: "accessible", label: "Step-free access" },
  ],
  corporate: [
    { id: "projector", label: "Projector & large screen" },
    { id: "sound", label: "Sound system & microphones" },
    { id: "breakfast-buffet", label: "Breakfast buffet" },
    { id: "lunch-buffet", label: "Lunch buffet" },
    { id: "dinner-buffet", label: "Dinner buffet" },
    { id: "coffee-break", label: "Coffee breaks" },
  ],
  "private-party": [
    { id: "decorations", label: "Decorations & styling" },
    { id: "cake-order", label: "Cake" },
    { id: "buffet", label: "Buffet" },
    { id: "set-menu", label: "Set menu" },
    { id: "music", label: "Music / DJ / live band" },
  ],
};

/** Occasions where we ask who is being celebrated, for the cake or card. */
export const CELEBRANT_OCCASIONS: readonly OccasionId[] = ["birthday", "anniversary", "private-party"];

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "checked_in",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that still hold seats. */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ["pending", "confirmed", "checked_in"];

export const STATUS_COPY: Record<BookingStatus, { label: string; guest: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: {
    label: "Awaiting confirmation",
    guest: "We've received your request. Our team will confirm it by phone or WhatsApp. It is not confirmed yet.",
    tone: "warning",
  },
  confirmed: {
    label: "Confirmed",
    guest: "Your table is confirmed. Show this pass when you arrive.",
    tone: "success",
  },
  declined: {
    label: "Declined",
    guest: "Sorry, we couldn't accommodate this booking. Please contact us for other times.",
    tone: "danger",
  },
  cancelled: { label: "Cancelled", guest: "This booking was cancelled.", tone: "neutral" },
  checked_in: { label: "Checked in", guest: "You've been checked in. Enjoy your visit!", tone: "success" },
  no_show: { label: "No-show", guest: "This booking was marked as a no-show.", tone: "danger" },
};

/** Big parties, event occasions and event rooms go to staff as event requests. */
export function resolveKind(occasion: OccasionId, space: SpaceId, partySize: number): "table" | "event" {
  const occasionKind = OCCASIONS.find((o) => o.id === occasion)?.kind;
  const eventSpace = SPACES.find((s) => s.id === space)?.eventsOnly;
  if (occasionKind === "event" || eventSpace || partySize > BOOKING_RULES.maxTablePartySize) {
    return "event";
  }
  return "table";
}

export function occasionLabel(id: string) {
  return OCCASIONS.find((o) => o.id === id)?.label ?? id;
}

export function spaceLabel(id: string) {
  return SPACES.find((s) => s.id === id)?.label ?? id;
}

export function extraLabel(occasion: string, id: string) {
  return OCCASION_EXTRAS[occasion as OccasionId]?.find((e) => e.id === id)?.label ?? id;
}
