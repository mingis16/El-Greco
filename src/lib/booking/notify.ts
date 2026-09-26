import { extraLabel, occasionLabel, spaceLabel, STATUS_COPY } from "@/lib/booking/config";
import { formatPhone } from "@/lib/booking/phone";
import { formatDateLong, formatTime } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";
import { formatOrderNumber, fulfilmentLabel, paymentMethodLabel, PAYMENT_STATUS_COPY } from "@/lib/ordering/config";
import type { Order } from "@/lib/ordering/types";
import { formatPrice } from "@/lib/menu-utils";

// Server-only: staff alerts for new bookings and orders. Sends email through
// Resend when RESEND_API_KEY is set; otherwise logs, so nothing breaks before
// email is set up.

const ADMIN_EMAIL = process.env.BOOKING_ADMIN_EMAIL ?? "elgrecorestaurant@gmail.com";
const FROM = process.env.BOOKING_FROM_EMAIL ?? "El Greco Bookings <onboarding@resend.dev>";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendStaffEmail(subject: string, heading: string, rows: [string, string][], link: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[staff alert] ${subject} -> ${ADMIN_EMAIL} (set RESEND_API_KEY to email staff)`);
    return;
  }
  const html = `<h2 style="font-family:sans-serif">${escape(heading)}</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5c5248;vertical-align:top">${escape(k)}</td><td style="padding:4px 0"><strong>${escape(v)}</strong></td></tr>`)
    .join("")}</table>
<p style="font-family:sans-serif"><a href="${escape(link)}">Open in the staff area</a></p>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [ADMIN_EMAIL], subject, html }),
    });
    if (!res.ok) console.error(`[staff alert] email failed: ${res.status} ${await res.text()}`);
  } catch (error) {
    console.error("[staff alert] email failed", error);
  }
}

export async function notifyStaffOfBooking(booking: Booking, staffUrl: string) {
  const heading = booking.kind === "event" ? "New event request" : `New booking (${STATUS_COPY[booking.status].label})`;
  const subject = `${heading}: ${booking.ref}, ${formatDateLong(booking.date)} ${formatTime(booking.time)}, ${booking.partySize} guests`;
  await sendStaffEmail(subject, heading, [
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
  ], staffUrl);
}

export async function notifyStaffOfOrder(order: Order, staffUrl: string) {
  const where = order.fulfilment === "dine_in" ? `table ${order.tableLabel ?? order.bookingRef ?? "?"}` : `pickup ${order.pickupTime}`;
  const heading = `New order ${formatOrderNumber(order.orderNumber)} (${fulfilmentLabel(order.fulfilment)})`;
  await sendStaffEmail(`${heading}: ${formatPrice(order.total)}, ${where}`, heading, [
    ["Order", `${formatOrderNumber(order.orderNumber)} · ${order.ref}`],
    ["Where", where],
    ["Customer", `${order.customerName}, ${formatPhone(order.customerPhone)}`],
    ...order.lines.map((l): [string, string] => [
      `${l.quantity} ×`,
      [l.name, l.variantName, ...l.addons.map((a) => `+ ${a.name}`), l.note && `“${l.note}”`].filter(Boolean).join(" · "),
    ]),
    ["Total", formatPrice(order.total)],
    ["Payment", `${paymentMethodLabel(order.paymentMethod)}, ${PAYMENT_STATUS_COPY[order.paymentStatus].label}${order.paymentReference ? ` (${order.paymentReference})` : ""}`],
    ["Notes", order.notes ?? "-"],
  ], staffUrl);
}
