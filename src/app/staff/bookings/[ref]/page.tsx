import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PrintButton } from "@/components/booking/print-button";
import { QrCode } from "@/components/booking/qr-code";
import { StaffActions } from "@/components/booking/staff-actions";
import { StatusBadge } from "@/components/booking/status-badge";
import { extraLabel, occasionLabel, spaceLabel } from "@/lib/booking/config";
import { formatPhone } from "@/lib/booking/phone";
import { normalizeRef } from "@/lib/booking/security";
import { STAFF_ACTIONS, staffActionsFor, verifyPath } from "@/lib/booking/service";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { getBookingStore } from "@/lib/booking/store";
import { formatDateLong, formatTime, formatTimestamp } from "@/lib/booking/time";
import { requestOrigin } from "@/lib/origin";

export const metadata: Metadata = {
  title: "Booking details",
  robots: { index: false, follow: false },
};

export default function StaffBookingPage(props: PageProps<"/staff/bookings/[ref]">) {
  return (
    <section className="container-page py-10 sm:py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <StaffBooking {...props} />
      </Suspense>
    </section>
  );
}

async function StaffBooking({ params }: PageProps<"/staff/bookings/[ref]">) {
  const { ref: rawRef } = await params;
  if (!(await isStaffRequest())) redirect(`/staff?next=${encodeURIComponent(`/staff/bookings/${rawRef}`)}`);

  const ref = normalizeRef(rawRef);
  const booking = ref ? await (await getBookingStore()).findByRef(ref) : null;
  if (!booking) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center ring-1 ring-line">
        <h1 className="text-2xl font-bold">No booking with reference {rawRef.toUpperCase()}</h1>
        <p className="mt-2 text-ink-muted">Check the characters (references never contain 0, O, 1, I or L).</p>
        <Link href="/staff" className="mt-5 inline-block rounded-full bg-charcoal-900 px-5 py-2.5 font-semibold text-cream">
          Back to bookings
        </Link>
      </div>
    );
  }

  const verifyUrl = `${await requestOrigin()}${verifyPath(booking.ref)}`;
  const rows: [string, string][] = [
    ["Guest", booking.guestName],
    ["Phone", formatPhone(booking.guestPhone)],
    ["Email", booking.guestEmail ?? "-"],
    ["Date", formatDateLong(booking.date)],
    ["Time", formatTime(booking.time)],
    ["Guests", String(booking.partySize)],
    ["Type", booking.kind === "event" ? "Event request" : "Table"],
    ["Occasion", occasionLabel(booking.occasion)],
    ["Seating", spaceLabel(booking.space)],
    ["Celebrating", booking.celebrant ?? "-"],
    ["Requests", booking.extras.map((e) => extraLabel(booking.occasion, e)).join(", ") || "-"],
    ["Notes", booking.notes ?? "-"],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/staff?date=${booking.date}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> {formatDateLong(booking.date)}
        </Link>
        <PrintButton label="Print booking slip" />
      </div>

      {/* Booking slip: prints as a kitchen/host copy. */}
      <article className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line print:shadow-none print:ring-charcoal-900">
        <header className="flex items-center justify-between gap-4 bg-charcoal-900 px-6 py-4 text-cream print:bg-white print:text-ink">
          <Logo plain tone="light" className="h-12 w-auto print:hidden" />
          <Logo plain tone="dark" className="hidden h-12 w-auto print:block" />
          <p className="eyebrow text-mint-400 print:text-ink">Staff booking slip</p>
        </header>
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-mono text-3xl font-bold tracking-wider">{booking.ref}</p>
            <StatusBadge status={booking.status} className="mt-2" />
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className={label === "Notes" || label === "Requests" ? "sm:col-span-2" : undefined}>
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="w-36">
            <QrCode value={verifyUrl} label={`Verification QR for ${booking.ref}`} className="w-full rounded-lg ring-1 ring-line" />
            <figcaption className="mt-1 text-center text-xs text-ink-muted">Scan to verify</figcaption>
          </figure>
        </div>
        <div className="border-t border-line p-6 print:hidden">
          <p className="mb-3 text-sm font-semibold">Actions</p>
          <StaffActions
            bookingRef={booking.ref}
            actions={staffActionsFor(booking.status).map((id) => ({ id, label: STAFF_ACTIONS[id].label }))}
          />
        </div>
      </article>

      <section aria-labelledby="history-heading" className="rounded-card bg-surface p-6 ring-1 ring-line">
        <h2 id="history-heading" className="font-semibold">
          History
        </h2>
        <ol className="mt-4 space-y-3 border-l-2 border-line pl-4 text-sm">
          {[...booking.history].reverse().map((event, i) => (
            <li key={`${event.at}-${i}`}>
              <p className="font-semibold">{event.action}</p>
              <p className="text-xs text-ink-muted">
                {formatTimestamp(event.at)} · {event.actor}
                {event.note ? ` · “${event.note}”` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
