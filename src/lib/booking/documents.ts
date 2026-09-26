import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BOOKING_RULES, STATUS_COPY, extraLabel, occasionLabel, spaceLabel } from "@/lib/booking/config";
import { maskPhone } from "@/lib/booking/phone";
import { formatDateLong, formatTime, formatTimestamp, holdUntil, toMinutes, fromMinutes } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";
import { qrModules, QR_MARGIN } from "@/lib/qr";
import { site } from "@/lib/site";

export const INK = rgb(29 / 255, 25 / 255, 21 / 255);
export const MUTED = rgb(92 / 255, 82 / 255, 72 / 255);
export const MINT = rgb(77 / 255, 219 / 255, 195 / 255);
export const LINE = rgb(231 / 255, 226 / 255, 217 / 255);
export const TONE = {
  success: rgb(21 / 255, 128 / 255, 61 / 255),
  warning: rgb(161 / 255, 92 / 255, 7 / 255),
  danger: rgb(180 / 255, 35 / 255, 24 / 255),
  neutral: MUTED,
};

/** Standard PDF fonts only cover Latin-1; replace anything else so names never crash the PDF. */
export function safe(font: PDFFont, text: string) {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return "?";
      }
    })
    .join("");
}

export function wrap(font: PDFFont, text: string, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const { size: n, isDark } = qrModules(text);
  const total = n + QR_MARGIN * 2;
  const cell = size / total;
  page.drawRectangle({ x, y, width: size, height: size, color: rgb(1, 1, 1) });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isDark(r, c)) continue;
      page.drawRectangle({
        x: x + (c + QR_MARGIN) * cell,
        y: y + size - (r + QR_MARGIN + 1) * cell,
        width: cell + 0.05,
        height: cell + 0.05,
        color: INK,
      });
    }
  }
}

/**
 * Booking pass PDF: reference, status, QR for staff verification and the full
 * booking details. A5 width; the page grows taller when a booking has long
 * requests or notes so nothing is ever cut off.
 */
export async function renderPassPdf(booking: Booking, opts: { verifyUrl: string; logoPng: Uint8Array | null }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`El Greco booking pass ${booking.ref}`);
  pdf.setAuthor(site.name);
  pdf.setCreationDate(new Date(booking.createdAt));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const width = 420;
  const status = STATUS_COPY[booking.status];
  const end = fromMinutes(toMinutes(booking.time) + BOOKING_RULES.diningMinutes);

  const rows: [string, string][] = [
    ["Guest", booking.guestName],
    ["Phone", maskPhone(booking.guestPhone)],
    ["Date", formatDateLong(booking.date)],
    booking.kind === "event"
      ? ["Time", `${formatTime(booking.time)} (start)`]
      : ["Time", `${formatTime(booking.time)} (table held until ${holdUntil(booking.time)})`],
    ["Guests", String(booking.partySize)],
    ["Occasion", occasionLabel(booking.occasion)],
    ["Seating", spaceLabel(booking.space)],
  ];
  if (booking.kind === "table") rows.push(["Until", `about ${formatTime(end)}`]);
  if (booking.celebrant) rows.push(["Celebrating", booking.celebrant]);
  if (booking.extras.length) rows.push(["Requests", booking.extras.map((e) => extraLabel(booking.occasion, e)).join(", ")]);
  if (booking.notes) rows.push(["Notes", booking.notes]);
  const wrappedRows = rows.map(([label, value]) => ({
    label,
    lines: wrap(regular, safe(regular, value), 11, width - 56 - 96).slice(0, 6),
  }));

  const policies = [
    status.guest,
    booking.kind === "table"
      ? `Tables are held for ${BOOKING_RULES.arrivalGraceMinutes} minutes after the booking time.`
      : "Our events team will confirm set-up and arrival times with you before the day.",
    "This pass is only valid if its QR code verifies on our system at the door. Edited or copied passes are refused.",
    `Changes or cancellations: WhatsApp ${site.phoneDisplay} and quote your reference.`,
  ].map((p) => wrap(regular, safe(regular, p), 9, width - 56));

  // Layout, measured from the top: header + reference block, detail rows, policies, footer.
  const DETAILS_TOP = 290;
  const rowsHeight = wrappedRows.reduce((h, r) => h + 14 * r.lines.length + 8, 0);
  const policiesHeight = policies.reduce((h, lines) => h + 12 * lines.length + 4, 0);
  const height = Math.max(595, DETAILS_TOP + rowsHeight + 16 + policiesHeight + 64);

  const page = pdf.addPage([width, height]);
  const text = (value: string, x: number, y: number, size: number, font = regular, color = INK) =>
    page.drawText(safe(font, value), { x, y, size, font, color });

  // Header band
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: INK });
  page.drawRectangle({ x: 0, y: height - 100, width, height: 4, color: MINT });
  if (opts.logoPng) {
    const logo = await pdf.embedPng(opts.logoPng);
    const h = 64;
    page.drawImage(logo, { x: 28, y: height - 82, width: (logo.width / logo.height) * h, height: h });
  } else {
    text("EL GRECO", 28, height - 56, 22, bold, rgb(1, 1, 1));
  }
  const kindLabel = booking.kind === "event" ? "EVENT BOOKING" : "TABLE BOOKING";
  text(kindLabel, width - 28 - bold.widthOfTextAtSize(kindLabel, 9), height - 44, 9, bold, MINT);
  const passLabel = "Booking pass";
  text(passLabel, width - 28 - regular.widthOfTextAtSize(passLabel, 14), height - 64, 14, regular, rgb(1, 1, 1));

  // Reference + status, QR on the right
  let y = height - 140;
  text("BOOKING REFERENCE", 28, y, 8, bold, MUTED);
  text(booking.ref, 28, y - 30, 26, bold);
  text(status.label.toUpperCase(), 28, y - 50, 10, bold, TONE[status.tone]);
  const qrSize = 124;
  drawQr(page, opts.verifyUrl, width - 28 - qrSize, y - qrSize + 12, qrSize);
  text("Staff scan to verify", width - 28 - qrSize + 18, y - qrSize, 8, regular, MUTED);

  // Details
  y = height - DETAILS_TOP;
  page.drawLine({ start: { x: 28, y: y + 14 }, end: { x: width - 28, y: y + 14 }, thickness: 1, color: LINE });
  for (const row of wrappedRows) {
    text(row.label, 28, y, 9, bold, MUTED);
    row.lines.forEach((line, i) => text(line, 124, y - i * 14, 11));
    y -= 14 * row.lines.length + 8;
  }

  // Policies
  page.drawLine({ start: { x: 28, y: y + 4 }, end: { x: width - 28, y: y + 4 }, thickness: 1, color: LINE });
  y -= 8;
  for (const lines of policies) {
    for (const line of lines) {
      text(line, 28, y, 9, regular, MUTED);
      y -= 12;
    }
    y -= 4;
  }

  // Footer
  text(`Issued ${formatTimestamp(booking.createdAt)}`, 28, 40, 8, regular, MUTED);
  text(`${site.name} · ${site.address.street}, ${site.address.area}, ${site.address.city}`, 28, 28, 8, regular, MUTED);

  return pdf.save();
}

const icsEscape = (value: string) => value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const icsStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Calendar entry for the booking (venue time is UTC+0, so times are written as UTC). */
export function renderIcs(booking: Booking, manageUrl: string) {
  const start = new Date(`${booking.date}T${booking.time}:00Z`);
  const minutes = booking.kind === "event" ? 180 : BOOKING_RULES.diningMinutes;
  const end = new Date(start.getTime() + minutes * 60_000);
  const location = `${site.name}, ${site.address.street}, ${site.address.area}, ${site.address.city}, ${site.address.country}`;
  const description = [
    `Booking reference: ${booking.ref}`,
    `Guests: ${booking.partySize}`,
    `Status when added: ${STATUS_COPY[booking.status].label}`,
    `Manage your booking: ${manageUrl}`,
  ].join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//El Greco Kafe - Resto//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.ref}@elgreco-kafe`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(`El Greco: ${occasionLabel(booking.occasion)} for ${booking.partySize}`)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `URL:${manageUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Your El Greco booking ${booking.ref} is in 2 hours`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
