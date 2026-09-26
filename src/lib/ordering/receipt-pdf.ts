import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { INK, LINE, MINT, MUTED, TONE, drawQr, safe, wrap } from "@/lib/booking/documents";
import { maskPhone } from "@/lib/booking/phone";
import { formatTime, formatTimestamp } from "@/lib/booking/time";
import { formatPrice } from "@/lib/menu-utils";
import {
  ORDER_STATUS_COPY,
  PAYMENT_STATUS_COPY,
  formatOrderNumber,
  paymentMethodLabel,
} from "@/lib/ordering/config";
import type { Order } from "@/lib/ordering/types";
import { site } from "@/lib/site";

type Row = { kind: "item" | "addon" | "note" | "gap"; left: string; right?: string; lines?: string[] };

/**
 * Itemized receipt: order number, lines with options and add-ons, totals,
 * payment breakdown and a QR stamp staff can scan to verify it. The page
 * height grows with the number of lines.
 */
export async function renderReceiptPdf(order: Order, opts: { verifyUrl: string; logoPng: Uint8Array | null }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`El Greco receipt ${formatOrderNumber(order.orderNumber)} ${order.ref}`);
  pdf.setAuthor(site.name);
  pdf.setCreationDate(new Date(order.createdAt));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const width = 380;
  const M = 24;
  const textWidth = width - M * 2 - 80;

  // Lay out item rows first so the page can be sized to fit them.
  const rows: Row[] = [];
  for (const line of order.lines) {
    const title = `${line.quantity} × ${line.name}${line.variantName ? ` (${line.variantName})` : ""}`;
    rows.push({ kind: "item", left: title, right: formatPrice(line.lineTotal), lines: wrap(bold, safe(bold, title), 10, textWidth) });
    if (line.quantity > 1 || line.addons.length) {
      rows.push({ kind: "addon", left: `@ ${formatPrice(line.unitPrice)} each`, lines: [`@ ${formatPrice(line.unitPrice)} each`] });
    }
    for (const a of line.addons) {
      const label = `+ ${a.name}${a.price ? ` (${formatPrice(a.price)})` : ""}`;
      rows.push({ kind: "addon", left: label, lines: wrap(regular, safe(regular, label), 9, textWidth) });
    }
    if (line.note) rows.push({ kind: "note", left: line.note, lines: wrap(italic, safe(italic, `“${line.note}”`), 9, textWidth) });
    rows.push({ kind: "gap", left: "" });
  }
  const rowHeight = (r: Row) => (r.kind === "gap" ? 6 : (r.lines?.length ?? 1) * (r.kind === "item" ? 13 : 11));
  const itemsHeight = rows.reduce((h, r) => h + rowHeight(r), 0);

  const totals: [string, number, boolean?][] = [["Subtotal", order.subtotal]];
  if (order.serviceCharge) totals.push(["Service charge", order.serviceCharge]);
  if (order.tax) totals.push(["Tax", order.tax]);
  totals.push(["Total", order.total, true]);

  const balance = Math.max(0, order.total - order.amountPaid);
  const payment: [string, string][] = [
    ["Method", paymentMethodLabel(order.settledWith ?? order.paymentMethod)],
    ["Status", PAYMENT_STATUS_COPY[order.paymentStatus].label],
    ["Paid", formatPrice(order.amountPaid)],
    ["Balance due", formatPrice(order.paymentStatus === "refunded" ? 0 : balance)],
  ];
  if (order.paymentReference) payment.push(["Reference", order.paymentReference]);
  if (order.paidAt) payment.push(["Paid at", formatTimestamp(order.paidAt)]);

  const HEADER = 96;
  const META = 118;
  const height = HEADER + META + 24 + itemsHeight + 18 + totals.length * 16 + 22 + payment.length * 14 + 150;
  const page = pdf.addPage([width, height]);
  const text = (value: string, x: number, y: number, size: number, font = regular, color = INK) =>
    page.drawText(safe(font, value), { x, y, size, font, color });
  const right = (value: string, y: number, size: number, font = regular, color = INK) =>
    text(value, width - M - font.widthOfTextAtSize(safe(font, value), size), y, size, font, color);
  const rule = (y: number, color = LINE) => page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color });

  // Header
  page.drawRectangle({ x: 0, y: height - HEADER, width, height: HEADER, color: INK });
  page.drawRectangle({ x: 0, y: height - HEADER - 4, width, height: 4, color: MINT });
  if (opts.logoPng) {
    const logo = await pdf.embedPng(opts.logoPng);
    const h = 60;
    page.drawImage(logo, { x: M, y: height - 78, width: (logo.width / logo.height) * h, height: h });
  } else {
    text("EL GRECO", M, height - 54, 20, bold, rgb(1, 1, 1));
  }
  right("RECEIPT", height - 40, 9, bold, MINT);
  right(`Order ${formatOrderNumber(order.orderNumber)}`, height - 64, 18, bold, rgb(1, 1, 1));

  // Order details
  let y = height - HEADER - 26;
  text(order.ref, M, y, 13, bold);
  right(formatTimestamp(order.createdAt), y, 9, regular, MUTED);
  y -= 18;
  const where =
    order.fulfilment === "dine_in"
      ? `Dine in${order.tableLabel ? ` · Table ${order.tableLabel}` : ""}${order.bookingRef ? ` · Booking ${order.bookingRef}` : ""}`
      : `Pickup at ${formatTime(order.pickupTime!)}`;
  text(where, M, y, 10, bold);
  y -= 15;
  text(`${order.customerName} · ${maskPhone(order.customerPhone)}`, M, y, 9, regular, MUTED);
  y -= 15;
  const status = ORDER_STATUS_COPY[order.status];
  text(`Order status: ${status.label}`, M, y, 9, bold, TONE[status.tone === "info" ? "neutral" : status.tone]);
  y -= 15;
  if (order.notes) {
    for (const l of wrap(italic, safe(italic, `Note: ${order.notes}`), 9, width - M * 2).slice(0, 2)) {
      text(l, M, y, 9, italic, MUTED);
      y -= 11;
    }
  }
  y = height - HEADER - META;
  rule(y + 8);

  // Items
  y -= 10;
  text("ITEM", M, y, 8, bold, MUTED);
  right("AMOUNT", y, 8, bold, MUTED);
  y -= 16;
  for (const r of rows) {
    if (r.kind === "gap") {
      y -= 6;
      continue;
    }
    const font = r.kind === "item" ? bold : r.kind === "note" ? italic : regular;
    const size = r.kind === "item" ? 10 : 9;
    const step = r.kind === "item" ? 13 : 11;
    const indent = r.kind === "item" ? 0 : 14;
    r.lines!.forEach((l, i) => text(l, M + indent, y - i * step, size, font, r.kind === "item" ? INK : MUTED));
    if (r.right) right(r.right, y, 10, bold);
    y -= step * r.lines!.length;
  }

  // Totals
  rule(y + 4);
  y -= 12;
  for (const [label, amount, strong] of totals) {
    text(label, M, y, strong ? 12 : 10, strong ? bold : regular);
    right(formatPrice(amount), y, strong ? 12 : 10, strong ? bold : regular);
    y -= 16;
  }

  // Payment
  rule(y + 8, INK);
  y -= 8;
  text("PAYMENT", M, y, 8, bold, MUTED);
  y -= 14;
  for (const [label, value] of payment) {
    const color = label === "Status" ? TONE[PAYMENT_STATUS_COPY[order.paymentStatus].tone] : INK;
    text(label, M, y, 9, regular, MUTED);
    right(value, y, 9, label === "Status" || label === "Balance due" ? bold : regular, color);
    y -= 14;
  }

  // Verification stamp
  const qr = 86;
  drawQr(page, opts.verifyUrl, M, 40, qr);
  const stampX = M + qr + 12;
  text("Scan to verify this receipt", stampX, 104, 9, bold);
  for (const [i, l] of wrap(regular, "Staff check the order and payment status live on our system. Screenshots or edited receipts won't verify.", 8, width - stampX - M).entries()) {
    text(l, stampX, 90 - i * 10, 8, regular, MUTED);
  }
  text(`${site.name} · ${site.address.street}, ${site.address.area}`, M, 24, 7, regular, MUTED);
  text(`${site.phoneDisplay} · ${site.email}`, M, 14, 7, regular, MUTED);

  return pdf.save();
}
