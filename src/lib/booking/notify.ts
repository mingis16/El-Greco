import { extraLabel, occasionLabel, spaceLabel, STATUS_COPY } from "@/lib/booking/config";
import { formatPhone } from "@/lib/booking/phone";
import { formatDateLong, formatTime } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";

// Server-only: staff alerts for new bookings. Sends email through Resend when
// RESEND_API_KEY is set; otherwise logs, so nothing breaks before email is set up.

const ADMIN_EMAIL = process.env.BOOKING_ADMIN_EMAIL ?? "elgrecoresturant@gmail.com";
const FROM = process.env.BOOKING_FROM_EMAIL ?? "El Greco Bookings <onboarding@resend.dev>";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function notifyStaffOfBooking(booking: Booking, staffUrl: string) {
  const heading = booking.kind === "event" ? "New event request" : `New booking (${STATUS_COPY[booking.status].label})`;
  const subject = `${heading}: ${booking.ref}, ${formatDateLong(booking.date)} ${formatTime(booking.time)}, ${booking.partySize} guests`;
  const rows: [string, string][] = [
    ["Reference", booking.ref],
    ["Status", STATUS_COPY[booking.status].label],
    ["Guest", booking.guestName],
    ["Phone", formatPhone(booking.guestPhone)],
    ["Email", booking.guestEmail ?? "-"],
    ["Date", formatDateLong(booking.date)],
    ["Time", formatTime(booking.time)],
    ["Guests", String(booking.partySize)],
    ["Occasion", occasionLabel(booking.occasion)],
    ["Seating", spaceLabel(booking.space)],
    ["Celebrating", booking.celebrant ?? "-"],
    ["Requests", booking.extras.map((e) => extraLabel(booking.occasion, e)).join(", ") || "-"],
    ["Notes", booking.notes ?? "-"],
  ];

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[booking] ${subject} -> ${ADMIN_EMAIL} (set RESEND_API_KEY to email staff)`);
    return;
  }

  const html = `<h2 style="font-family:sans-serif">${escape(heading)}</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5c5248">${escape(k)}</td><td style="padding:4px 0"><strong>${escape(v)}</strong></td></tr>`)
    .join("")}</table>
<p style="font-family:sans-serif"><a href="${escape(staffUrl)}">Open in the staff area</a></p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [ADMIN_EMAIL], subject, html }),
    });
    if (!res.ok) console.error(`[booking] staff email failed: ${res.status} ${await res.text()}`);
  } catch (error) {
    console.error("[booking] staff email failed", error);
  }
}
